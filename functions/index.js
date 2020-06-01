const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const express = require('express');
const moment = require('moment');
// const cors = require('cors')({ origin: true });
const cors = require('cors');
const unirest = require('unirest');
const config = require('./server/config');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const axios = require('axios')

const BFX = require('bitfinex-api-node');
const { Order } = require('bfx-api-node-models');

/* Begin Bitfinex Kobolet Oracle */
const bfx = new BFX({
  apiKey: functions.config().bitfinex.key,
  apiSecret: functions.config().bitfinex.secret,

  ws: {
    autoReconnect: true,
    // seqAudit: true,
    // packetWDDelay: 10 * 1000,
    manageOrderBooks: true,
    transform: true
  }
});

const ws = bfx.ws(2);
ws.on('error', (err) => console.log(err))
ws.on('open', ws.auth.bind(ws))
/* End Bitfinex Kobolet Oracle */

/* Begin Firebase Admin functions Initialisation */
admin.initializeApp();
sgMail.setApiKey(functions.config().sendgrid_api.key);
sgMail.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally

const db = admin.firestore();
/* End Firebase Admin functions Initialisation */

/* Begin Express config */
const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(methodOverride('X-HTTP-Method-Override'));

require('./server/api')(app, config);
const utilityFunction = require('./server/functions');
/* End Express config */

// cryptocurrency symbol Object
const cryptoCurrency = [
    {name: 'bitcoin', symbol: 'BTC-USD', bfxSymbol: 'tBTCUSD', shortName: 'BTC'},
    {name: 'ethereum', symbol: 'ETH-USD', bfxSymbol: 'tETHUSD', shortName: 'ETH'}
];

exports.api = functions.https.onRequest(app);

// Automatically stores supported country exchange rates every four hours.
exports.countryExchangeRate = functions.https.onRequest((req, res) => {
    unirest.get(`http://data.fixer.io/api/latest?access_key=3f860c4bce55e5bf2f9bc945cf90da8b&symbols=USD,NGN,KES,ZAR,GHS&format=1`)
    .end(response => {
        const data = response.body.rates;
        const docRef = db.collection('rates').doc('usd');
        const query = {
            USD: 1,
            NGN: data.NGN / data.USD,
            KES: data.KES / data.USD,
            ZAR: data.ZAR / data.USD,
            GHS: data.GHS / data.USD
        }
        docRef.update(query);
        res.sendStatus(200);
    });
});

// Automaticall update crypto price every 2 minutes
exports.getCryptoPrice = functions.pubsub.schedule('every 2 minutes').onRun(async context => {
  const docRef = db.doc(`rates/usd`);

  await axios.get(`https://api-pub.bitfinex.com/v2/tickers/?symbols=tBTCUSD,tLTCUSD,tETHUSD`).then(resp => {
    const respData = resp.data;
    let priceQuery = {}
    let countTracker = 0;
    for (const data of respData) {
      priceQuery[data[0]] = data[7];
      countTracker++;
    }
    if (countTracker == respData.length) {
      return docRef.update(priceQuery);
    }
  }).catch(err => {
    return console.log('error storing crypto price', err);
  })
})

// Check for bank list every 24 hours and update current selection
exports.updateBankListScheduler = functions.pubsub.schedule('every day 00:00').onRun(async context => {
  const bankRef = db.doc('bank/NGN')
  const country = ['NGN', 'KES', 'GHS'];

  for (const data of country) {
    const strCurrency = data.substring(0, 2);
    await axios.post(`https://live.moneywaveapi.co/v1/banks/?country=${strCurrency}`, {}).then(response => {
      const result = response.data.data;
      const bankData = Object.keys(result).map(k => {
        return {code: k, name: result[k]};
      })
      const bankRef = db.doc(`bank/${data}`);
      return bankRef.set({data: bankData})
    }).catch(err => console.log('bank update failed', err))
  }
})

// firebase cloud messaging service
exports.fcmSend = functions.firestore.document('admin/liquidate/id/{dataId}').onCreate((change, context) => {
    const docData = change.data();
    const userId = docData.userId;
    const apnTtl = moment().add(24, 'hours').valueOf();
    const adminMessage = `liquidate ${docData.amount}${docData.cryptoType} at ${docData.liquidationPrice}`;
    const userMessage = `${docData.amount}${docData.cryptoType} has just been liquidated`;

    const adminTruePayload = {
        notification: {
          title: `liquidate ${docData.cryptoType}`,
          body: `${docData.amount}${docData.cryptoType} liquidated at ${docData.liquidationPrice}`,
          icon: "https://app.kobolet.com/assets/demo/demo6/media/img/logo/logo.png",
          "click_action" : "https://app.kobolet.com"
        }
    };

    const adminFalsePayload = {
        notification: {
          title: `liquidate ${docData.cryptoType}`,
          body: adminMessage,
          icon: "https://app.kobolet.com/assets/demo/demo6/media/img/logo/logo.png",
          "click_action" : "https://app.kobolet.com"
        }
    };

    const userPayload = {
        notification: {
          title: `loan liquidated`,
          body: userMessage,
          icon: "https://app.kobolet.com/assets/demo/demo6/media/img/logo/logo.png",
          "click_action" : "https://app.kobolet.com"
        }
    };

    const msgLiquidated = {
        to: `Kobolet <michael@crypxel.com>`,
        from: `Kobolet Liquidation <no-reply@kobolet.com>`,
        subject: `Kobolet Loan liquidated`,
        html: `${docData.amount}${docData.cryptoType} was liquidated successfully and loan closed`
      };

      const msgNotLiquidated = {
        to: `Kobolet <michael@crypxel.com>`,
        from: `Kobolet Liquidation <no-reply@kobolet.com>`,
        subject: `Kobolet Loan liquidated`,
        html: adminMessage
      };

    const adminKey = db.doc(`fcmTokens/iCgkEWagpye7TnjaBMZiw2Mz03c2`)
        adminKey.get().then(adminData => {
            const adminValue = adminData.data();
            const token = adminValue.token;
            if (docData.status) {
                return admin.messaging().sendToDevice(token, adminTruePayload)
                    .then(() => {
                        console.log('admin notification sent successfully');
                        sgMail.send(msgLiquidated).then(() => {
                            console.log("loan liquidation mail sent successfully");
                          });
                    })
                        .catch(err => console.log(err));
            } else {
                return admin.messaging().sendToDevice(token, adminFalsePayload)
                .then(() => {
                    console.log('admin notification sent successfully');
                    sgMail.send(msgNotLiquidated).then(() => {
                        console.log("loan liquidation mail sent successfully");
                        })
                    })
                        .catch(err => console.log(err));
            }
    });

    const userKey = db.doc(`fcmTokens/${userId}`)
        userKey.get().then(userData => {
            const userValue = userData.data();
            const token = userValue.token;
            return admin.messaging().sendToDevice(token, userPayload)
                    .then(() => {
                        console.log('user notification sent successfully')
                        const userRef = db.doc(`users/${userId}`)
                        userRef.get().then(userData => {
                            const userValue = userData.data()
                            const userMsgLiquidated = {
                                to: `Kobolet <${userValue.email}>`,
                                from: `Kobolet Liquidation <no-reply@kobolet.com>`,
                                subject: `Kobolet Loan liquidated`,
                                html: `${docData.amount}${docData.cryptoType} was liquidated successfully and loan closed`
                              };
                              sgMail.send(userMsgLiquidated).then(() => {
                                  console.log('user loan liquidation mail sent successfully');
                              })
                        })
                    })
                        .catch(err => console.log(err));
    })
    // res.sendStatus(200);
});

// send new mail on new fiat transaction deposit depended on object struction of flutterwave ravepay response object
exports.onFiatTransactionUpdate = functions.firestore.document('transactions/{userId}/{type}/{ref}').onCreate((snap, context) => {
  const snapValue = snap.data();
  const snapContext = context.params;
  const userId = snapContext.userId;

  if (snapContext.type == 'fiat') {
    const response = snapValue.response.tx;
    /* beging send email query */
    const query = {
      name: response.customer.fullName,
      email: response.customer.email,
      currency: response.currency,
      amount: response.charged_amount
    }
    return utilityFunction.sendFiatLoanDepositMail(query);
  /* End send email query */
  } else if (snapContext.type == ('bitcoin' || 'ethereum')) {

  }
});


/* Begin Kobolet Oracle Functions */

// Kobolet Oracle new crypto amount hedge on exchange
exports.onNewLoanCreate = functions.firestore
    .document('loan/{userId}/asset/{ref}')
    .onCreate((snap, context) => {
      const snapValue = snap.data();
      const snapContext = context.params;

      /* Begin Store Loan data in Unhedge datastore */
      hedgeRef = db.doc(`hedge/bitfinex/new/${snapValue.created_at}`);
      return hedgeRef.set({
        userId: snapContext.userId,
        type: snapValue.type,
        loanId: snapContext.ref,
        liquidationPrice: snapValue.liquidationPrice,
        status: 'pending',
        hedged: false,
        completed: false,
        updateCount: 0,
        cryptoAmount: snapValue.heldCrypto,
        created_at: snapValue.created_at,
        expires_at: snapValue.expires_at
      }).then(() => console.info('new hedge transaction added'))
        .catch(err => {
          console.error(err)
          return;
      })
      /* End Store Loan data in Unhedge datastore */
});

// Create new Hedge Transaction on bitfinex once wallet has been updated
exports.onNewLoanHedgeBFX = functions.firestore.document('admin/wallet/exchange/bitfinex').onUpdate(async (snap, context) => {
  const snapValue = snap.after.data();
  const snapBefore = snap.before.data();
  const snapContext = context.params;
  let count = 0;
  let submitTracker = 0;
  let hedgeSize = 0;
  let orderId = 0;
  // console.log('wallet data', snapValue);

  const hedgeRef = db.collection('hedge/bitfinex/new').where('hedged', '==', false);
  return hedgeRef.get().then(snapShot => {
    hedgeSize = snapShot.size;
    let hedgeObjectTracker = {};
    snapShot.forEach(async (snapShotData) => {
      // await sleep(2500);
      console.log('hedge creator triggered')
      count = count + 1;
      let hedgeValue = snapShotData.data();
      let hedgeId = snapShotData.id;
      // console.log('top hedgeId', hedgeObjectTracker[hedgeId]);
      //firestore refrence
      const logRef = db.collection('log/oracle/bfx');
      const cryptoType = cryptoCurrency.find(data => data.name === hedgeValue.type);
      if ((snapValue[cryptoType.shortName].availableBalance >= hedgeValue.cryptoAmount) && !hedgeValue.hedged &&  hedgeSize > 0) {
        /* Begin Oracle create new crypto hedge transaction */
        let oracleCreator = new Promise((resolve, reject) => {
          ws.once('auth', () => {
            const o = new Order({
              cid: hedgeValue.created_at,
              symbol: cryptoType.bfxSymbol,
              price: hedgeValue.liquidationPrice,
              amount: -hedgeValue.cryptoAmount,
              type: Order.type.EXCHANGE_STOP,
              tif: `${moment(hedgeValue.expires_at).format()}`
            }, ws)

            // Enable automatic updates
            o.registerListeners();
            if (submitTracker < snapShot.size && !hedgeObjectTracker[hedgeId]) {
               o.submit().then(() => {
                hedgeObjectTracker[hedgeId] = hedgeId;
                // console.log('tracker', submitTracker)
                // console.log('hedge id', hedgeObjectTracker[hedgeId])
                orderId = o.id;
                submitTracker = submitTracker + 1;
                console.log(`submitted order ${orderId}`)

                // console.log('hedgeId', hedgeId)
                let hedgeRef = db.doc(`hedge/bitfinex/new/${hedgeId}`);
                resolve(o.id);
                return hedgeRef.update({
                  orderId: orderId,
                  hedged: true,
                  pending: 'completed'
                })
                // console.log('submitted details', o);
              }).catch((err) => {
                console.error('error creating new hedge request', err);
                reject(err)
                ws.close();
                return;
              });
            } else {
              return;
            }
          });

          if (count === 1 && !ws.isOpen()) {
            ws.open();
          } else if(count === hedgeSize && ws.isOpen()) {
            ws.close();
          }

        })
        /* End Oracle create new crypto hedge transaction */

       return oracleCreator.then(id => {
          logRef.add({
            orderId: orderId,
            userId: hedgeValue.userId,
            type: hedgeValue.type,
            loanId: hedgeValue.loanId,
            apiSuccess: true,
            exchange: 'bitfinex',
            status: 'hedge creation successful',
            cryptoAmount: hedgeValue.cryptoAmount,
            created_at: Date.now()
          });
          // ws.close();
        }).catch(err => {
          logRef.add({
            orderId: orderId,
            userId: hedgeValue.userId,
            type: hedgeValue.type,
            loanId: hedgeValue.loanId,
            apiSuccess: false,
            exchange: 'bitfinex',
            status: `hedge creation failed`,
            cryptoAmount: hedgeValue.cryptoAmount,
            created_at: Date.now()
          });
          return console.error('new loan creation failed');
        })
      } else {
        return;
      }
    })
  })
})

// sell expired crypto transaction amount
exports.onHedgeLoanExpired = functions.firestore.document('hedge/bitfinex/expired/{refId}').onCreate(async (snap, context) => {
  const snapValue = snap.data();
  const userId = snapValue.userId;
  const loanId = snapValue.loanId;
  const cryptoType = cryptoCurrency.find(data => data.name === snapValue.type);
  let orderId = 0;
  let rateData = await getExchangeRate();
  let rateValue = rateData[cryptoType.bfxSymbol];

  if (snapValue.completed) return;

  const loanRef = db.doc(`loan/${userId}/asset/${loanId}`);
  const hedgeREf = db.doc(`hedge/bitfinex/expired/${context.params.refId}`);
  const walletRef = db.doc(`wallet/${userId}/${snapValue.type}`)

  loanRef.get().then(loanData => {
    const loanValue = loanData.data();
    if (!loanData.exists) return;
    const amountLeftToPay = loanValue.amount + (loanValue.monthlyInterest * loanValue.duration);
    const usdAmountToLiquidate = amountLeftToPay - loanValue.paidBack ;
    const cryptoAmountToLiquidate = usdAmountToLiquidate / rateValue;
    const cryptoToReturn = snapValue.cryptoAmount - cryptoAmountToLiquidate;

    let newHedgeTransaction = new Promise((resolve, reject) => {
      ws.once('auth', () => {
        const o = new Order({
          cid: snapValue.created_at,
          symbol: cryptoType.bfxSymbol,
          amount: -cryptoAmountToLiquidate,
          type: Order.type.EXCHANGE_MARKET
        });

        o.registerListeners();
        o.submit().then(() => {
          orderId = o.id;
          console.log('new market transaction of %d successfull with orderId: &d', cryptoAmountToLiquidate, orderId)
          resolve(orderId);
          if (ws.isOpen()) ws.close();
        }).catch(err => {
          console.error('failed opening exchange market sell', err)
          reject(err);
          if (ws.isOpen()) ws.close();
        })
      });
      if (!ws.isOpen()) ws.open();
    });

    newHedgeTransaction.then(id => {
      loanRef.update({paid: true, liquidation: true}).then(() => console.log('loan updated'));
      hedgeREf.update({completed: true, orderId: id})
      utilityFunction.newCryptoTransaction(cryptoAmountToLiquidate, userId, 'liquidation', snapValue.type);
      walletRef.get().then(walletData => {
        const walletValue = walletData.data();
        const newAmount = walletValue.amount + cryptoToReturn;
        const newHeldBalance = walletValue.heldBalance - snapValue.cryptoAmount;
        walletRef.update({
          balance: newAmount,
          heldBalance: newHeldBalance
        })
      })
    });
  })
})


// On new loan payment
exports.onLoanUpdate = functions.firestore
    .document('loan/{userId}/asset/{ref}')
    .onUpdate(async (snap, context) => {
      const newValue = snap.after.data();
      const previousValue = snap.before.data();
      const snapContext = context.params;
      const cryptoType = cryptoCurrency.find(data => data.name === newValue.type);

      if (newValue.paidBack <= previousValue.paidBack) return;
      console.info('loan update found')
      const hedgeRef = db.doc(`hedge/bitfinex/new/${newValue.created_at}`);
      const loanRef = db.doc(`loan/${snapContext.userId}/asset/${snapContext.ref}`);
      hedgeRef.get().then( async hedgeData => {
        if (!hedgeData.exists) return;

        const hedgeValue = hedgeData.data();
        if (!hedgeValue.hedged) return;

        const currentDate = moment(Date.now());
        const expiryDate = moment(newValue.expires_at);
        const currentLoanDuration = expiryDate.diff(currentDate, 'months', true);
        // loan amount to update and return
        const amountLeftToPay = newValue.amount + (newValue.monthlyInterest * currentLoanDuration);
        const usdAmountToPay = amountLeftToPay - newValue.paidBack;
        const cryptoAmountToUpdate = usdAmountToPay / newValue.liquidationPrice;
        const cryptoToReturn = hedgeValue.cryptoAmount - cryptoAmountToUpdate;

        ws.once('auth', async () => {
          console.log('websocket authenticated');
          // await sleep(1000);

          if (newValue.paid) {
            ws.cancelOrder(hedgeValue.orderId).then(async (cancelQuery) => {
              console.log('order %d cancelled', hedgeValue.orderId);
              await updateWallet(hedgeValue.cryptoAmount, snapContext.userId, newValue.type).then(() => {
                hedgeRef.update({
                  completed: true,
                  completed_at: Date.now()
                })
                if (ws.isOpen()) ws.close();
                sendWalletDepositMail({amount: hedgeValue.cryptoAmount, type: newValue.type, userId: snapContext.userId});
                return;
              });
            }).catch(err => {
              console.error('failed cancelling order %', hedgeValue.orderId, err);
              if (ws.isOpen()) ws.close();
              return;
            })
          }
          if (!newValue.paid) {
            console.log('updating crypto amount on exchange')
            const updateQuery = {
              id: hedgeValue.orderId,
              delta: cryptoToReturn.toString()
            }
            ws.updateOrder(updateQuery).then(async (orderQuery) => {
              console.log('order %d updated', hedgeValue.orderId);
              await updateWallet(cryptoToReturn, snapContext.userId, newValue.type)
              .then(() => {
                loanRef.update({heldCrypto: cryptoAmountToUpdate});
                hedgeRef.update({
                  cryptoAmount: cryptoAmountToUpdate,
                  updateCount: hedgeValue.updateCount + 1
                });
                sendWalletDepositMail({amount: cryptoToReturn, type: newValue.type, userId: snapContext.userId});
                if (ws.isOpen()) ws.close();
              })
            }).catch(err => {
              console.error('failed updating %d order', hedgeValue.orderId, err)
              if (ws.isOpen()) ws.close();
              return;
            })
          }
        });

        // open websocket authentication
        if (!ws.isOpen()) ws.open();
      })
});

async function updateWallet(amount, userId, assetType) {
  const walletRef = db.doc(`wallet/${userId}/${assetType}/holding`);
  await walletRef.get().then(walletData => {
    if (!walletData.exists) return;
    const walletValue = walletData.data();
    if (walletValue && walletValue.balance >= 0) {
      const newHeldBalance = walletValue.heldBalance - amount;
      const newBalance = walletValue.balance + amount;
      walletRef.update({
        balance: newBalance,
        heldBalance: newHeldBalance
      }).then(() => {
        console.log('collateral of %d released back to wallet', amount);
        return;
      })
    }
  })
}

async function sendWalletDepositMail(query) {
  const crypto = cryptoCurrency.find(data => data.name == query.type)
  const userRef = db.doc(`users/${query.userId}`);
  userRef.get().then(async userData => {
    if (!userData.exists) return;
    const userValue = userData.data;
    const mailQuery = {
      email: userValue.email,
      name: userValue.name,
      amount: query.amount,
      cryptoType: query.type
    }
    const notificationMessage = `${query.amount}${crypto.shortName} added to wallet`;
    await utilityFunction.sendCryptoDepositMail(mailQuery);
    await utilityFunction.newNotification(notificationMessage, query.userId);
    return;
  })
}

/* End Kobolet Oracle functions */

// Function to create transfer fund and create new loan transaction

// send welcome mail for every new user
exports.onNewUser = functions.auth.user().onCreate((snap, context) => {
    const uid = snap.uid;
    const batch = db.batch();
    console.log('snap', snap);
    console.log('context', context);

    const bitcoinRef = db.doc(`wallet/${uid}/bitcoin/holding`);
    const ethereumRef = db.doc(`wallet/${uid}/ethereum/holding`);
    const countRef = db.doc(`count/${uid}`);
    const countQuery = {
        max: 8,
        loanCount: 0,
        loanPaid: 0,
        paidCount: 0,
        total: 0,
        amount: 0,
        currency: 'NGN'
    };
    const query = {
        balance: 0,
        heldBalance: 0,
        can_withdraw: false
    }
    // batch.set(bitcoinRef, query);
    // batch.set(ethereumRef, query);
    batch.set(countRef, countQuery);

    batch.commit().then(() => {
        console.log('new user account set up')
        sendWelcomeEmail(snap, context);
    }).catch(err => {
        console.log('account creation error', err);
    })
    // res.sendStatus(200);
});

// floating point value precision rounder
function round(value, precision) {
    let multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  };

// Send welcome email to new user
function sendWelcomeEmail(snap, context) {
  const user = snap;
    // console.log(snap);
    const email = user.email;
    const displayName = user.displayName ? user.displayName : email;
    const photoUrl = user.photoURL;
    const uid = user.uid;

    var docRef = db.collection('users').doc(uid);

    const setUser = docRef.set({
        name: displayName || '',
        photoUrl: photoUrl || '',
        email: email,
        kyc: {
            pending: false,
            verified: false
        }
    });


    const msg = {
        to: `${displayName} <${email}>`,
        from: `Kobolet <no-reply@kobolet.com>`,
        subject: `Welcome to Kobolet`,
        templateId: 'd-a474ddc80376464a8a7175cf9c9da354',
        dynamic_template_data: {
          name: displayName
        }
      };

      setUser.then(success => {
        return sgMail.send(msg).then(() => {
            console.log("New user mail sent successfully", email);
          });
      }).catch(err => {
          console.log('Failed adding new user');
      })
    // res.sendStatus(200);
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* Begin Kobolet Oracle Functions */
function oracleCancelOrder(order) {
  ws.cancelOrder(order).then(() => {
    console.log('order cancelled successfully')
  }).catch(err => {
    console.log('failed cancelling order', failed)
  })
}

async function getExchangeRate() {
  const rateRef = db.doc(`rates/usd`);
  let data = ''
  await rateRef.get().then(rateData => {
    const rateValue = rateData.data();
    data = rateValue;
  })
  return data;
}

async function authenticateBfx() {
  await ws.once('auth', () => {
    console.log('authenticated')
    return true;
  });
}
/* End Kobolet Oracle Functions */

