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
const Ravepay = require('ravepay');
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

const cryptoCurrency = [
  {name: 'bitcoin', symbol: 'BTC-USD', bfxSymbol: 'tBTCUSD'},
  {name: 'ethereum', symbol: 'ETH-USD', bfxSymbol: 'tETHUSD'}
];

/* Begin Moneywave api config */
const Moneywave = require('moneywave');

const options = {
  apiKey: functions.config().moneywavecrypxeldev.api_key,
  apiSecret: functions.config().moneywavecrypxeldev.api_secret,
  env: 'dev',
  cache: true
}
const moneywave = Moneywave.MakeWave(options);
/* End Moneywave api config */

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

module.exports = function(app, config) {

  let firebaseMiddleware = (req, res, next) => {
    admin.auth().getUser(req.query.id)
    .then(function(userRecord) {
      if (userRecord) {
        return next();
      }
    })
    .catch(function(error) {
        return res.status(500).send({message: "You don't have the necessary credentials to complete this request"});
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
      .headers({'Accept': 'application/json',
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
     console.log('new', req.body.event);
     return res.sendStatus(200);
  })

  // crypto deposit pending transaction api handler
  app.post('/crypto/payment/pending', CoinbaseHMACValidator, (req, res) => {
    // res.sendStatus(200);
    let batch = db.batch();
    const refId = `koboletTr${moment().valueOf()}`;
    console.log('pending', req.body.event.data);
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
      batch.update(statusRef, {pending: true, transactionHash: transactionHash});
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

  // crypto deposit confirmation transaction api handler
  app.post('/crypto/payment/confirmation',CoinbaseHMACValidator, (req, res) => {
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
      const amount = parseFloat(result.data.pricing[type].amount);

      const statusRef = db.doc(`/deposit/${uid}/${type}/${code}`);
      const transRef = db.doc(`transactions/${uid}/${type}/${refId}`);
      const depositTransRef = db.doc(`transactions/${uid}/deposit/${code}`);
      const fiatTransRef = db.doc(`transactions/${uid}/fiat/${refId}`);


      statusRef.get().then(statusData => {
         const statusValue = statusData.data();
         if (statusValue.verified) {
           return res.sendStatus(200);
         }
         // store status deposit document in firestore
        batch.update(statusRef, {
          verified: true,
          pending: false
        });
       // update wallet amount
       const walletDoc = db.doc(`wallet/${uid}/${type}/holding`);
       walletDoc.get().then(walletInfo => {
         const walletValue = walletInfo.data();
         console.log(walletValue);
         if (walletValue && walletValue.temp_held === 0) {
           const newBalance = walletValue.balance + amount;
           walletDoc.update({balance: newBalance});
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
           walletDoc.set({balance: amount, heldBalance: 0});
         }
         /* Begin send deposit confirmation email */
          const msgQuery = {
            email: result.data.metadata.email,
            name: result.data.metadata.name,
            cryptoType: type,
            amount: amount,
          }
          utilityFunction.sendCryptoDepositMail(msgQuery);
         /* End deposit confirmation email */
       }).catch(err => console.log('failed updating wallet', err));

       // create new success transaction log
       batch.set(transRef, {
         amount: parseFloat(amount),
         timestamp: moment().valueOf(),
         type: 'deposit',
         crypto: true,
         address: 'internal'
       });
       // update crypto deposit transaction status
       batch.update(depositTransRef, {confirmDeposit: true});

         // Check that available currency balance in ravepay wallet is sufficient
         rave.Transfer.getBalance({currency: statusValue.currency})
          .then(respData => {
            const balResp = respData.body;
            if (balResp.status != 'success') {
              console.log('call to check rave wallet balance failed');
              return batch.commit().then(() => {
                console.log('successfully updated status and transaction');
                res.sendStatus(200);
              }).catch(err => {
                console.log('failed updating status and transaction', err);
                res.sendStatus(200);
              });
            }
            const currentBalance = balResp.data.AvailableBalance;
            if (currentBalance < statusValue.fiatAmount) {
              console.log(`Insufficient balance in ${statusValue.currency} wallet`)
              return batch.commit().then(() => {
                console.log('successfully updated wallet, status and transaction');
                res.sendStatus(200);
              }).catch(err => {
                console.log('failed updating wallet, status and transaction', err);
                res.sendStatus(200);
              });;
            } const transferQuery = {
              account_bank: statusValue.bankCode,
              account_number: statusValue.accountNumber,
              currency: statusValue.currency,
              amount: statusValue.fiatAmount,
              secKey: functions.config().raveprod.secret,
              narration: `Kobolet loan`,
              reference: refId
            };
            rave.Transfer.initiate(transferQuery).then(resp => {
              console.log('Transfer details', resp.body);
              let respData = resp.body.data;
              const momentconvert = moment(respData.date_created).valueOf();

              let respQuery = respData;
              respQuery['time'] = momentconvert;
              respQuery['type'] = 'withdrawal';
              respQuery['provider'] = 'rave';

              // add fiat transaction reference for batch write
              batch.set(fiatTransRef, respQuery);
              // check wallet and add for batch write
              walletDoc.get().then(walletInfo => {
                const walletValue = walletInfo.data();
                // console.log(walletValue);
                if (walletValue && walletValue.balance >= 0 && walletValue.balance >= amount) {
                  const currentBalance = walletValue.balance;
                  const heldBalance = walletValue.heldBalance;
                  const newHeldBalance = heldBalance + amount;
                  const newBalance = currentBalance - amount;
                  walletDoc.update({balance: newBalance, heldBalance: newHeldBalance});
                }
              }).catch(err => console.log('failed upating wallet', err));
              // add new loan reference for batch write
              const loanRef = db.doc(`loan/${uid}/asset/${statusValue.ref}`);
              const expiryDuration = statusValue.duration * 30;
              const currentTime = moment().valueOf();
              const expiryDate = moment(currentTime).add(expiryDuration, 'days').valueOf();
              const fiatAmount = round((statusValue.fiatAmount / statusValue.exchangeRate), 0);
              const interestAmount = round((statusValue.fiatInterestAmount / statusValue.exchangeRate), 0);
              const liquidationPrice = (statusValue.cryptoPrice * 0.505) + (fiatAmount * 0.03); // first month interest plus capital

              batch.set(loanRef, {
                amount: fiatAmount,
                interestAmount: interestAmount,
                paidBack: 0,
                price: statusValue.cryptoPrice,
                liquidationPrice: liquidationPrice,
                liquidationDateTracker: currentTime,
                heldCrypto: amount,
                OriginalHeldCrypto: amount,
                monthlyInterest: fiatAmount * 0.03,
                currency: statusValue.currency,
                duration: statusValue.duration,
                totalDuration: statusValue.duration,
                created_at: currentTime,
                expires_at: expiryDate,
                paid: false,
                type: type
              });
              console.log('got to final stage');
              return batch.commit().then(() => {
                const msgQuery = {
                  name: statusData.name,
                  email: result.data.metadata.email,
                  bankName: statusData.bankName,
                  loanInterest: (interestAmount - fiatAmount) * statusData.exchangeRate,
                  loanAmount: fiatAmount * statusData.exchangeRate,
                  heldCrypto: amount,
                  duration: statusValue.duration,
                  currency: statusValue.currency,
                  cryptoType: type
                }
                utilityFunction.sendNewLoanMail(msgQuery);
                utilityFunction.userCountUpdate(fiatAmount, uid);
                console.log('successfully updated wallet, status, loan and transaction');
                res.sendStatus(200);
              }).catch(err => {
                console.log('failed updating wallet, status and transaction', err);
                res.sendStatus(200);
              });
            }).catch(err => {
              console.log(`Transfer of ${statusValue.fiatAmount} to account ${uid} failed`, err)
              res.sendStatus(200);
            })
          }).catch(err => {
            console.log(`failed checking transfer balance`, err)
            res.sendStatus(200);
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

  /*  MoneyWave transfet payment API
    * Begin
  */
  app.post('/fiat/transfer', (req, res) => {
    const data = req.body;
    // console.log('data', data);
    const id = req.query.id;
    let batch = db.batch();
    const refId = `koboletTr${moment().valueOf()}`;
    const tranDoc = db.doc(`transactions/${id}/fiat/${refId}`);
    const walletDoc = db.doc(`wallet/${id}/${data.cryptoType}/holding`);

    const query = {
      account_bank: (data.bankCode).trim(),
      account_number: (data.accountNumber).trim(),
      currency: data.currency,
      amount: data.amount,
      secKey: functions.config().raveprod.secret,
      narration: `Kobolet loan`,
      reference: refId
    };

    rave.Transfer.initiate(query).then(resp => {
      console.log(resp.body);
      let respData = resp.body.data;
      const momentconvert = moment(respData.date_created).valueOf();

      let respQuery = respData;
      respQuery['timestamp'] = momentconvert;
      respQuery['type'] = 'withdrawal';
      respQuery['provider'] = 'rave';
      respQuery['loanId'] = data.ref;

      /* Begin send new loan email */
      const msgQuery = {
        name: data.name,
        email: data.email,
        bankName: data.bankName,
        loanInterest: round(data.loanInterest, 0),
        loanAmount: round(data.amount, 0),
        heldCrypto: data.cryptoAmount,
        currency: data.currency,
        duration: data.duration,
        cryptoType: data.cryptoType
      }
      utilityFunction.sendNewLoanMail(msgQuery);
      /* End send new loan email */

      walletDoc.get().then(walletInfo => {
        const walletValue = walletInfo.data();
        // console.log(walletValue);
        if (walletValue && walletValue.balance >= 0 && walletValue.balance >= data.cryptoAmount) {
          const currentBalance = walletValue.balance;
          const heldBalance = walletValue.heldBalance;
          const newHeldBalance = heldBalance + data.cryptoAmount;
          const newBalance = currentBalance - data.cryptoAmount;
          walletDoc.update({
              balance: newBalance,
              heldBalance: newHeldBalance
          }).then(() => {
            batch.set(tranDoc, respQuery);
            /* Begin add new loan transaction */
            const loanRef = db.doc(`loan/${id}/asset/${data.ref}`)
            const expiryDuration = data.duration * 30;
            const currentTime = moment().valueOf();
            const expiryDate = moment(currentTime).add(expiryDuration, 'days').valueOf();
            const fiatAmount = round((data.amount / data.exchangeRate), 0);
            const price = data.cryptoPrice;
            const interestAmount = round((data.interestAmount / data.exchangeRate), 0);
            const liquidationPrice = (data.cryptoPrice * 0.505) + (fiatAmount * 0.03); // first month interest plus capital

            batch.set(loanRef, {
              amount: fiatAmount,
              interestAmount: interestAmount,
              paidBack: 0,
              liquidationPrice: liquidationPrice,
              price: price,
              liquidationDateTracker: currentTime,
              heldCrypto: data.cryptoAmount,
              OriginalHeldCrypto: data.cryptoAmount,
              monthlyInterest: fiatAmount * 0.03,
              currency: data.currency,
              duration: data.duration,
              totalDuration: data.duration,
              created_at: currentTime,
              expires_at: expiryDate,
              paid: false,
              type: data.cryptoType
            });
            /* End add new loan transaction */
            batch.commit().then(() => {
              console.log('new loan and transaction added');
              res.send({status: 'success'});
            }).catch(err => {
              console.log('err', err)
              res.send(err);
            });
          });
        }
      });
    });
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

  /*  MoneyWave transfet payment API
    * End
  */

  /* Manual withdraw processing */
  // POST new payment details to coinbase
  app.post('/withdrawal', firebaseMiddleware, (req, res) => {
    const data = req.body;
    const query = {
      amount:  data.amount,
      currency:  data.currency,
      address:     data.address
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

  /* Manual withdraw processing */
  // POST new payment details to email
  app.post('/withdrawal/fiat', firebaseMiddleware, (req, res) => {
    const data = req.body;
    const query = {
      amount: data.amount,
      currency: data.currency,
      accountNumber: data.accountNumber,
      accountName: data.accountName,
      bankName: data.bankName,
      cryptoType: data.cryptoType,
      cryptoPrice: data.cryptoPrice,
      cryptoAmount: data.cryptoAmount,
      timestamp: moment().valueOf()
    };

    const id = req.query.id;
    const amount = req.body.amount;
    const currentTime = moment().format("YYYY-MM-DD");
    const msg = {
      to: `Kobolet <michael@crypxel.com>`,
      from: `Kobolet Withdraw <no-reply@crypxel.com>`,
      subject: 'New Loan Withdrawal Request',
      text: `${data.name} with ${id} just requested for a withdrawal of ${query.currency}${query.amount} to the following bank: ${query.bankName}, ${query.accountName}, ${query.accountNumber} on ${currentTime}`
    };
    return sgMail.send(msg).then(() => {
      console.log("capital withdrawal request of %d sent successfully", amount);
      const tranDoc = db.collection(`transactions/${req.query.id}/fiat`);
      tranDoc.add({
        amount: data.amount,
        ref: 'manual transfer',
        type: 'withdrawal',
        crypto: true,
        currency: data.currency,
        provider: 'moneywave',
        timestamp: moment().valueOf()
      }).then(() => console.log('fiat withdrawal addedd'))
        .catch(err => console.log(err))
     // update wallet amount
     const walletDoc = db.doc(`wallet/${req.query.id}/${data.cryptoType}/holding`);
     walletDoc.get().then(walletInfo => {
       const walletValue = walletInfo.data();
       // console.log(walletValue);
       if (walletValue && walletValue.balance >= 0 && walletValue.balance >= data.cryptoAmount) {
         const currentBalance = walletValue.balance;
         const heldBalance = walletValue.heldBalance;
         const newHeldBalance = heldBalance + data.cryptoAmount;
         const newBalance = currentBalance - data.cryptoAmount;
         walletDoc.update({balance: newBalance, heldBalance: newHeldBalance})
          .then(() => {
            res.send({message: 'completed'});
          })
       }
     });
    }).catch(error => {
      console.log(error);
      res.end();
    });
    // res.end();
  });

  /* End of Manual withdraw processing */
};
