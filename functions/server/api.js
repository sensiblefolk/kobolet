// server/api.js
/*
 |--------------------------------------
 | Dependencies
 |--------------------------------------
 */

const admin = require("firebase-admin");
const functions = require('firebase-functions');
const moment = require('moment');
const unirest = require('unirest');
const sgMail = require('@sendgrid/mail');
const Ravepay = require('flutterwave-node');
const rave = new Ravepay(functions.config().raveprod.key, functions.config().raveprod.secret, true);
const axios = require('axios')

const coinbase = require('coinbase-commerce-node');
const Client = coinbase.Client;
const Charge = coinbase.resources.Charge;
const Event = coinbase.resources.Event;
const Webhook = require('coinbase-commerce-node').Webhook;

Client.init(functions.config().coinbase.api_key);

/* Beginning sendgrid api config*/
sgMail.setApiKey(functions.config().sendgrid_api.key);
sgMail.setSubstitutionWrappers('{{', '}}');
/* End sendgrid api config */

// Config
const config = require('../server/config');
const utilityFunction = require('../server/functions');
const db = admin.firestore();

const cryptoCurrency = [{
    name: 'bitcoin',
    symbol: 'BTC-USD',
    bfxSymbol: 'tBTCUSD'
  },
  {
    name: 'ethereum',
    symbol: 'ETH-USD',
    bfxSymbol: 'tETHUSD'
  }
];

/*
 |--------------------------------------
 | CMiddleware
 |--------------------------------------
 */
// floating point value precision rounder
function round(value, precision) {
  let multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

module.exports = function (app, config) {

  let firebaseMiddleware = (req, res, next) => {
    admin.auth().getUser(req.query.id)
      .then(function (userRecord) {
        if (userRecord) {
          return next();
        }
      })
      .catch(function (error) {
        return res.status(500).send({
          message: "You don't have the necessary credentials to complete this request"
        });
      });
  };

  let CoinbaseHMACValidator = (req, res, next) => {
    const hmac = req.get('X-CC-Webhook-Signature');
    const secret = functions.config().coinbase.secret;
    // console.log('hmac', hmac);
    return next();
  }

  /*
   |--------------------------------------
   | API Routes
   |--------------------------------------
   */

  // GET API root
  app.get('/api/', (req, res) => {
    res.send('API WORKS');
  });



  /*  COINBASE payment API
   * Begin
   */

  app.post('/crypto/payment/new', firebaseMiddleware, (req, res) => {
    data = req.body;
    const payload = {
      name: data.name,
      description: 'Fund Kobolet Wallet',
      local_price: {
        amount: data.amount,
        currency: 'USD'
      },
      pricing_type: 'fixed_price',
      metadata: {
        customer_id: req.query.id,
        name: data.name,
        type: data.type,
        email: data.email
      }
    };

    unirest.post('https://api.commerce.coinbase.com/charges')
      .headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CC-Api-Key': functions.config().coinbase.api_key,
        'X-CC-Version': '2018-03-22'
      })
      .send(payload)
      .end(response => {
        const result = response.body;
        // console.log(result);
        res.send(result);
      });
  })

  // new crypto deposit event api handler
  app.post('/crypto/payment/create', CoinbaseHMACValidator, (req, res) => {
    console.info('new', req.body.event);
    return res.sendStatus(200);
  })

  // crypto deposit pending transaction api handler
  app.post('/crypto/payment/pending', CoinbaseHMACValidator, (req, res) => {
    // res.sendStatus(200);
    let batch = db.batch();
    const refId = `koboletTr${moment().valueOf()}`;
    console.info('pending', req.body.event.data);
    const result = req.body.event;
    if ((result && result.type != 'charge:pending') || !result.data.metadata.type) {
      return res.sendStatus(200);
    }

    const uid = result.data.metadata.customer_id;
    const type = result.data.metadata.type
    const code = result.data.code;
    const amount = parseFloat(result.data.pricing[type].amount);
    const payments = result.data.payments;
    const hash = payments[0];
    const transactionHash = type === 'bitcoin' ? `https://live.blockcypher.com/btc/tx/${hash.transaction_id}` : `https://etherscan.io/tx/${hash.transaction_id}`;

    const statusRef = db.doc(`/deposit/${uid}/${type}/${code}`);
    batch.update(statusRef, {
      pending: true,
      transactionHash: transactionHash,
      amount: amount
    });
    const depositTransRef = db.doc(`transactions/${uid}/deposit/${code}`);
    const notificationMessage = `new cryptocurrency deposit of ${amount} ${type} pending`;
    utilityFunction.newNotification(notificationMessage, uid);
    batch.set(depositTransRef, {
      amount: amount,
      address: result.data.addresses[type],
      hash: hash,
      transactionHash: transactionHash,
      timestamp: moment().valueOf(),
      confirmDeposit: false,
      crypto: type,
      code: code
    });
    depositTransRef.get().then(depositData => {
      const depositValue = depositData.data();
      if (depositValue && depositValue.address) {
        return res.sendStatus(200);
      } else {
        return batch.commit().then(() => {
          console.log(`new pending crypto deposit of %d ${type} added`, amount);
          const msgQuery = {
            email: result.data.metadata.email,
            name: result.data.metadata.name,
            cryptoType: type,
            amount: amount,
            transUrl: transactionHash
          }
          utilityFunction.sendCryptoPendingDepositMail(msgQuery);
          res.sendStatus(200);
        }).catch(err => {
          console.log('failed adding new pending deposit transaction', err);
          res.sendStatus(200);
        })
      }
    })
  })

  // crypto deposit delayed dued to over payment or under payment or token expiry
  app.post('/crypto/payment/delayed', CoinbaseHMACValidator, async (req, res) => {
    const result = req.body.event
    console.info('payment delayed', JSON.stringify(result.data.timeline));
    const paymentData = result.data;
    let batch = db.batch();
    const refId = `koboletTr${moment().valueOf()}`;

    const uid = paymentData.metadata.customer_id;
    const type = paymentData.metadata.type
    const code = paymentData.code;
    const cryptoAmount = parseFloat(result.data.pricing[type].amount);


    if ((result && result.type != 'charge:delayed') || !result.data.metadata.type) {
      return res.sendStatus(200);
    };

    const isUnresolved = paymentData.timeline.find((message) => message.status === 'UNRESOLVED' || message.context === ('OVERPAID' || 'UNDERPAID' || 'DELAYED' || 'MULTIPLE'));

    if (isUnresolved) {
      await cryptoDepositToWallet(uid, type, cryptoAmount, code, paymentData.email, paymentData.name);
      return res.sendStatus(200)
    } else {
      return res.sendStatus(200)
    }
  })

  // crypto deposit resolved
  app.post('/crypto/payment/resolved', CoinbaseHMACValidator, (req, res) => {
    const result = req.body.event
    console.info('payment resolved', result);
  })

  // crypto deposit confirmation transaction api handler
  app.post('/crypto/payment/confirmation', CoinbaseHMACValidator, (req, res) => {
    // res.sendStatus(200);
    const result = req.body.event;
    if ((result && result.type != 'charge:confirmed') || !result.data.metadata.type) {
      return res.sendStatus(200);
    };

    let batch = db.batch();
    const refId = `koboletTr${moment().valueOf()}`;

    const uid = result.data.metadata.customer_id;
    const type = result.data.metadata.type
    const code = result.data.code;
    const cryptoAmount = parseFloat(result.data.pricing[type].amount);

    const statusRef = db.doc(`/deposit/${uid}/${type}/${code}`);
    const transRef = db.doc(`transactions/${uid}/${type}/${refId}`);
    const depositTransRef = db.doc(`transactions/${uid}/deposit/${code}`);


    statusRef.get().then(async statusData => {
      const statusValue = statusData.data();
      if (statusValue.verified || statusValue.code !== code) {
        return res.sendStatus(200);
      }
      // store status deposit document in firestore
      batch.update(statusRef, {
        verified: true,
        pending: false
      });

      // update crypto deposit transaction status
      batch.update(depositTransRef, {
        confirmDeposit: true
      });

      // create new success transaction log
      batch.set(transRef, {
        amount: parseFloat(cryptoAmount),
        timestamp: moment().valueOf(),
        reference: result.data.id,
        type: 'deposit',
        crypto: true,
        address: result.data.address[type],
        hashUrl: statusValue.transactionHash
      });

      await cryptoDepositToWallet(uid, type, cryptoAmount, code, result.data.metadata.email, result.data.metadata.name);

      batch.commit().then(() => {
        console.log('successfully updated wallet, status and transaction');
      }).catch(err => {
        console.log('failed updating wallet, status and transaction', JSON.stringify(err));
      });;

      transferFund({
        uid,
        type,
        cryptoAmount,
        currency: statusValue.currency,
        fiatAmount: statusValue.fiatAmount,
        bankCode: statusValue.bankCode,
        accountNumber: statusValue.accountNumber,
        refId
      }).then(() => {
        addNewLoan({
          uid,
          type,
          refId: statusValue.ref,
          duration: statusValue.duration,
          cryptoAmount,
          amount: statusValue.fiatAmount,
          fiatInterestAmount: statusValue.fiatInterestAmount,
          exchangeRate: statusValue.exchangeRate,
          cryptoPrice: statusValue.cryptoPrice,
          currency: statusValue.currency,
          name: statusValue.name,
          email: statusValue.email,
          bankName: statusValue.bankName
        }).then(() => {
          return res.status(200).send({
            message: 'success'
          })
        }).catch(err => {
          console.error('failed adding loans', JSON.stringify(err));
          return res.status(500).send({
            message: 'failed'
          })
        })
      }).catch(err => {
        console.error('failed transferring funds', JSON.stringify(err));
        return res.status(500).send({
          message: 'failed'
        })
      })
    })
  });

  app.post('/crypto/payment/failed', CoinbaseHMACValidator, (req, res) => {
    console.log('failed', req.body);
    const result = req.body.event;
    const code = result.data.code;
    if ((result && result.type != 'charge:failed') || !result.data.metadata.type) {
      return res.sendStatus(200);
    }

    const uid = result.data.metadata.customer_id;
    const type = result.data.metadata.type;
    const statusRef = db.doc(`/deposit/${uid}/${type}/${code}`);
    const walletRef = db.doc(`wallet/${uid}/${type}/holding`);

    walletRef.get().then(walletData => {
      const walletValue = walletData.data();
      if (walletValue && walletValue.temp_held > 0 && walletValue.code === code) {
        const newBalance = walletValue.balance + walletValue.temp_held;
        const newHeldBalance = walletValue.heldBalance - walletValue.temp_held;
        walletRef.update({
          balance: newBalance,
          heldBalance: newHeldBalance,
          temp_held: 0,
          code: ''
        })
      }
    });

    statusRef.update({
      verified: false,
      expired: true,
    }).then(() => {
      console.log('deposit status updated successfully');
      return res.sendStatus(200);
    }).catch(err => {
      console.log(err);
      return res.sendStatus(200);
    });
  });

  /*  COINBASE PAYMENT API
   * END
   */

  /*  Rave transfet payment API
   * Begin
   */
  app.post('/fiat/transfer', (req, res) => {
    const data = req.body;
    // console.log('data', data);
    const id = req.query.id;

    transferFund({
      uid: id,
      type: data.cryptoType,
      cryptoAmount: data.cryptoAmount,
      currency: data.currency,
      fiatAmount: data.amount,
      bankCode: (data.bankCode).trim(),
      accountNumber: (data.accountNumber).trim(),
      refId: data.ref
    }).then(() => {
      addNewLoan({
        uid: id,
        type: data.cryptoType,
        refId: data.ref,
        duration: data.duration,
        cryptoAmount: data.cryptoAmount,
        amount: data.amount,
        fiatInterestAmount: data.interestAmount,
        exchangeRate: data.exchangeRate,
        cryptoPrice: data.cryptoPrice,
        currency: data.currency,
        name: data.name,
        email: data.email,
        bankName: data.bankName
      }).then(() => {
        console.log('load added successfully')
        return res.status(200).send({
          message: 'success'
        })
      }).catch(err => {
        console.error('failed adding loans', JSON.stringify(err));
        return res.status(500).send({
          message: 'failed'
        })
      })
    }).catch((err) => {
      console.error('failed transferring funds', JSON.stringify(err))
      return res.status(500).send({
        message: 'failed'
      })
    })
  });


  // Rave deposit webhook
  app.post('rave/deposit', (req, res) => {
    const hash = req.headers["verif-hash"];
    if (!hash) {
      return res.sendStatus(200);
    }

    const secret_hash = functions.config().raveprod.webhooksecret;
    if (hash !== secret_hash) {
      return res.sendStatus(200);
    }
    const data = JSON.parse(res.body);
    const meta = data.meta[0];
    console.log('metadata', meta);
    console.log('data', data);

    if (meta.type === 'loan') {
      /* begin send email query */
      const query = {
        name: data.customer.fullName,
        email: data.customer.email,
        currency: data.currency
      }
      // utilityFunction.sendFiatLoanDepositMail(query);
      res.sendStatus(200);
      /* end send email query */
    } else {
      res.sendStatus(200);
    }
  });

  /*  Rave transfet payment API
   * End
   */

  /* Manual withdraw processing */
  // POST new payment details to coinbase
  app.post('/withdrawal', firebaseMiddleware, (req, res) => {
    const data = req.body;
    const query = {
      amount: data.amount,
      currency: data.currency,
      address: data.address
    };

    const id = req.query.id;
    const amount = req.body.amount;
    console.log(req.body);
    const userUrl = `users/${id}`;
    const userRef = db.doc(userUrl);
    userRef.get().then(data => {
      const userValue = data.data();
      if (userValue) {
        const currentTime = moment().format("YYYY-MM-DD");
        const msg = {
          to: `Kobolet <michael@crypxel.com>`,
          from: `Kobolet Withdraw <no-reply@kobolet.com>`,
          subject: 'New withdrawal request',
          text: `${userValue.name} with ${id} just requested for a withdrawal of ${query.amount} ${query.currency} to address: ${query.address} on ${currentTime}`
        };
        return sgMail.send(msg).then(() => {
          console.log("capital withdrawal request of %d sent successfully", amount);
          const result = "capital withdrawal request processed successfully";
          // res.status(200).send(result);
        });
      }
    })
    res.end();
  });
  /* End of Manual withdraw processing */
};

async function addNewLoan({
  uid,
  type,
  refId,
  duration,
  cryptoAmount,
  amount,
  fiatInterestAmount,
  exchangeRate,
  cryptoPrice,
  currency,
  name,
  email,
  bankName
}) {
  // add new loan reference for batch write
  console.log('loan query', JSON.stringify(loanQuery));
  const loanRef = db.doc(`loan/${uid}/asset/${refId}`);
  const expiryDuration = duration * 30;
  const currentTime = moment().valueOf();
  const expiryDate = moment(currentTime).add(expiryDuration, 'days').valueOf();
  fiatAmount = round((amount / exchangeRate), 0);
  const interestAmount = round((fiatInterestAmount / exchangeRate), 0);
  const liquidationPrice = (cryptoPrice * 0.505) + (fiatAmount * 0.03); // first month interest plus capital

  loanRef.set({
    amount: fiatAmount,
    interestAmount: interestAmount,
    paidBack: 0,
    price: cryptoPrice,
    liquidationPrice: liquidationPrice,
    liquidationDateTracker: currentTime,
    heldCrypto: cryptoAmount,
    OriginalHeldCrypto: cryptoAmount,
    monthlyInterest: fiatAmount * 0.03,
    currency: currency,
    duration: duration,
    totalDuration: duration,
    created_at: currentTime,
    expires_at: expiryDate,
    paid: false,
    type: type
  }).then(() => {
    const msgQuery = {
      name: name,
      email: email,
      bankName: bankName,
      loanInterest: (interestAmount - fiatAmount) * exchangeRate,
      loanAmount: fiatAmount * exchangeRate,
      heldCrypto: cryptoAmount,
      duration: duration,
      currency: currency,
      cryptoType: type
    }
    utilityFunction.sendNewLoanMail(msgQuery);
    utilityFunction.userCountUpdate(fiatAmount, uid);
    return Promise.resolve('loan added successfully');
  }).catch(err => {
    return Promise.reject(`faile adding new loan for user: ${uid}, ${JSON.stringify(err)}`);
  })
}

async function transferFund({
  uid,
  type,
  cryptoAmount,
  currency,
  fiatAmount,
  bankCode,
  accountNumber,
  refId
}) {
  // Check that available currency balance in ravepay wallet is sufficient
  console.info('transfer api called')
  rave.Transfer.getBalance({
      currency: currency
    })
    .then(balance => {
      const balResp = balance.body;
      const currentBalance = balResp.data.AvailableBalance;
      console.log('balance', JSON.stringify(balResp))
      if (currentBalance < fiatAmount || balResp.status != 'success') {
        return Promise.reject(`Insufficient balance in ${currency}${currentBalance} wallet`);
      }

      const transferQuery = {
        account_bank: bankCode,
        account_number: accountNumber,
        currency: currency,
        amount: fiatAmount,
        secKey: functions.config().raveprod.secret,
        narration: `Kobolet loan`,
        reference: refId
      };
      rave.Transfer.initiate(transferQuery).then(resp => {
        console.log('Transfer details', JSON.stringify(resp.body));
        let respData = resp.body.data;
        const momentconvert = moment(respData.date_created).valueOf();

        let respQuery = respData;
        respQuery['time'] = momentconvert;
        respQuery['type'] = 'withdrawal';
        respQuery['provider'] = 'rave';

        // add fiat transaction to database
        const fiatTransRef = db.doc(`transactions/${uid}/fiat/${refId}`);
        const walletDoc = db.doc(`wallet/${uid}/${type}/holding`);
        fiatTransRef.set(respQuery);

        // check wallet and update wallet
        walletDoc.get().then(walletInfo => {
          const walletValue = walletInfo.data();
          // console.log(walletValue);
          if (walletValue && walletValue.balance >= 0 && walletValue.balance >= cryptoAmount) {
            const currentBalance = walletValue.balance;
            const heldBalance = walletValue.heldBalance;
            const newHeldBalance = heldBalance + cryptoAmount;
            const newBalance = currentBalance - cryptoAmount;
            walletDoc.update({
              balance: newBalance,
              heldBalance: newHeldBalance
            }).then(() => true)
          }
        }).catch(err => console.log('failed upating wallet', err));
        return Promise.resolve(`fund transfer of ${currency}${fiatAmount} successful`)
      }).catch(err => {
        return Promise.reject(`Transfer of ${fiatAmount} to account ${uid} failed, ${JSON.stringify(err)}`)
      })
    }).catch(err => {
      return Promise.reject(`failed checking transfer balance, ${JSON.stringify(err)}`)
    })
}

async function cryptoDepositToWallet(uid, type, amount, code, email, name) {
  // update wallet amount
  const walletDoc = db.doc(`wallet/${uid}/${type}/holding`);
  walletDoc.get().then(walletInfo => {
    const walletValue = walletInfo.data();
    console.info(walletValue);
    if (walletValue && walletValue.temp_held === 0) {
      const newBalance = walletValue.balance + amount;
      walletDoc.update({
        balance: newBalance
      });
    } else if (walletValue && walletValue.temp_held > 0 && walletValue.code === code) {
      const newBalance = walletValue.balance + amount + walletValue.temp_held;
      const newHeldBalance = walletValue.heldBalance - walletValue.temp_held;
      walletDoc.update({
        balance: newBalance,
        heldBalance: newHeldBalance,
        temp_held: 0,
        code: ''
      });
    } else {
      walletDoc.set({
        balance: amount,
        heldBalance: 0
      });
    }
    /* Begin send deposit confirmation email */
    const msgQuery = {
      email: email,
      name: name,
      cryptoType: type,
      amount: amount,
    }
    utilityFunction.sendCryptoDepositMail(msgQuery);
    /* End deposit confirmation email */
  }).catch(err => console.log('failed updating wallet', err));
}
