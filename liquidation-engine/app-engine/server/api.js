// server/api.js
/*
 |--------------------------------------
 | Dependencies
 |--------------------------------------
 */

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const admin = require('firebase-admin');
const firebase = require('firebase');
var cors = require('cors');
const moment = require('moment');
const utilityFunction = require('../server/functions');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.sendgrid_api_key);
sgMail.setSubstitutionWrappers('{{', '}}');

const BFX = require('bitfinex-api-node');
const { Order } = require('bfx-api-node-models');

/* Begin Bitfinex Kobolet Oracle */
const api_key = process.env.BFX_API_KEY_DEV || process.env.BFX_API_KEY;
const api_secret = process.env.BFX_API_SECRET_DEV || process.env.BFX_API_SECRET;

const bfx = new BFX({
    apiKey: api_key,
    apiSecret: api_secret,

    ws: {
        autoReconnect: true,
        // seqAudit: true,
        packetWDDelay: 10 * 60000,
        transform: true,
    },
});
let authStatus = false;
const ws = bfx.ws(2);
ws.on('error', (err) => console.log(err));
ws.on('open', ws.auth.bind(ws));

ws.once('auth', () => {
    console.log('authenticated');
    authStatus = true;
});
/* End Bitfinex Kobolet Oracle */

// Configure cors
const whitelist = [
    'https://tutorial-9192c.firebaseapp.com',
    'https://investment.crypxel.com',
    'localhost:4200',
    'localhost:8083',
];
const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};

const db = admin.firestore();

let firebaseMiddleware = (req, res, next) => {
    admin
        .auth()
        .getUser(req.query.id)
        .then(function (userRecord) {
            if (userRecord) {
                return next();
            }
        })
        .catch(function (error) {
            return res.status(500).send({
                message:
                    "You don't have the necessary credentials to complete this request",
            });
        });
};

// cryptocurrency symbol Object
const cryptoCurrency = [
    {
        name: 'bitcoin',
        symbol: 'BTC-USD',
        bfxSymbol: 'tBTCUSD',
        shortName: 'BTC',
    },
    {
        name: 'ethereum',
        symbol: 'ETH-USD',
        bfxSymbol: 'tETHUSD',
        shortName: 'ETH',
    },
];

/*
 |--------------------------------------
 | API Routes
 |--------------------------------------
 */

/* app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});  */

module.exports = function (app, config) {
    app.options('*', cors());

    // Bitfinex websocket route
    /* app.get('/bitfinex/create', (req, res) => {
      let orderId;
      ws.once('auth', () => {
        const o = new Order({
          cid: Date.now(),
          symbol: 'tBTCUSD',
          price: 7200,
          amount: -0.0062,
          type: Order.type.EXCHANGE_STOP
        }, ws)
      
        // Enable automatic updates
        o.registerListeners()
      
        o.on('update', () => {
          console.log(`order updated: ${o.serialize()}`)
        })
      
        o.on('close', () => {
          console.log(`order closed: ${o.status}`)
          // console.log('cancel details', o);
          ws.close()
        })
      
        o.submit().then(() => {
          console.log(`submitted order ${o.id}`)
          console.log(`submitted order detail ${o}`)
          orderId = o.id;
          // ws.close();
          console.log(orderId);
          // console.log('submitted details', o);
        }).catch((err) => {
          console.error(err)
          // ws.close()
        })
      })
      
      // ws.open()
    })  */

    /* app.get('/', (req, res) => {
     console.log('trade')
     ws.onAccountTradeEntry({ symbol: 'tBTCUSD' }, (trade) => {
       console.log('account te: %j', trade)
     });
     ws.open();
   }); */

    /* ws.onOrderUpdate({}, (orders) => {
    const data = serializeData(closeOrder);
     console.log('orders', data);
   });
   ws.onOrderNew({}, (newOrder) => {
    const data = serializeData(newOrder);
     console.log('new order', data);
   })
   ws.onOrderClose({}, (closeOrder) => {
    const data = serializeData(closeOrder);
     console.log('closed order', data);
   }) */

    /* ws.onOrderSnapshot({}, (orders) => {
    // const data = serializeData(orders);
    if (orders.length === 0) {
      console.log('no open orders')
      return
    }
  
    console.log(`recv ${orders.length} open orders`)
    orders.forEach(element => {
      const data = serializeData(element);
      console.log('order list', data);
    })

    }) */

    console.log('Oracle running');

    // const query = {
    //   id: 31693827048,
    //   delta: "0.001"
    // }

    // setTimeout(() => {
    //   console.log('auth status', authStatus)
    //   if (authStatus) {
    //     ws.updateOrder(query).then(() => {
    //       console.log('auth', authStatus);
    //     }).catch(err => {
    //       console.log('failed update', err);
    //     })
    //   }
    // }, 2000)

    ws.onOrderNew({}, (newOrder) => {
        const data = serializeData(newOrder);
        console.log('new order', data);
    });

    ws.onWalletUpdate({}, (wallet) => {
        const data = serializeWalletData(wallet);
        // console.log('wallet1', data);
    });

    ws.onOrderSnapshot({}, (orders) => {
        // const data = serializeData(orders);
        if (orders.length === 0) {
            console.log('no open orders');
            return;
        }

        console.log(`recv ${orders.length} open orders`);
        orders.forEach((element) => {
            const data = serializeData(element);
            console.log('order list', data);
        });
    });

    /* Begin Oracle Trade expired Loan Update */
    ws.onOrderClose({}, async (closeOrder) => {
        const orderData = serializeData(closeOrder);
        // let rateData = await getExchangeRate();
        console.log('closed order', orderData);
        const hedgeRefNew = db.doc(`hedge/bitfinex/new/${orderData.cid}`);
        const hedgeRefExp = db.doc(`hedge/bitfinex/expired/${orderData.cid}`);
        const positiveAmount =
            Math.sign(orderData.amount) === '-1'
                ? -1 * orderData.execAmount
                : orderData.amount;
        const currentTime = Date.now();

        if (orderData.tif && currentTime >= orderData.tif) {
            hedgeRefNew.get().then((newData) => {
                const newValue = newData.data();
                if (newValue) {
                    hedgeRefExp
                        .set({
                            cryptoAmount: positiveAmount,
                            userId: newValue.userId,
                            loanId: newValue.loanId,
                            type: newValue.type,
                            completed: false,
                            created_at: Date.now(),
                            tif: orderData.tif,
                            oldOrderId: orderData.id,
                        })
                        .then(() =>
                            console.log('new expired hedge transaction created')
                        );
                } else {
                    return;
                }
            });
        }
    });
    /* End Oracle Trade expired Loan Liquidate
  
  /* Begin Oracle Trade filled in exchange liquidator */
    ws.onAccountTradeEntry(
        {
            symbol: 'tBTCUSD',
        },
        (trade) => {
            const tradeData = serializeTradeData(trade);
            console.log('account te: %j', tradeData);

            const hedgeRef = db.doc(`hedge/bitfinex/new/${tradeData.cid}`);
            const logRef = db.collection('log/oracle/bfx');
            hedgeRef
                .get()
                .then((hedgeData) => {
                    const hedgeValue = hedgeData.data();
                    if (!hedgeData.exists) {
                        return;
                    }
                    const userId = hedgeValue.userId;
                    const loanId = hedgeValue.loanId;
                    const cryptoType = hedgeValue.type;
                    const orderId = hedgeValue.orderId;

                    if (tradeData.id === orderId) {
                        // reference to loan data in fireStore
                        const loanRef = db.doc(
                            `loan/${userId}/asset/${loanId}`
                        );
                        loanRef
                            .update({
                                paid: true,
                                liquidated: true,
                            })
                            .then(() => {
                                const walletRef = db.doc(
                                    `wallet/${userId}/${cryptoType}/holding`
                                );
                                walletRef.get().then((walletData) => {
                                    walletValue = walletData.data();
                                    if (!walletData.exists) {
                                        return;
                                    }
                                    const tradeExecAmount =
                                        Math.sign(tradeData.execAmount) === '-1'
                                            ? -1 * tradeData.execAmount
                                            : tradeData.execAmount;
                                    // const newBalance = hedgeValue.cryptoAmount - tradeExecAmount // execAmount is a -ve integer returned by trade api;
                                    // const newWalletBalance = walletValue.balance + newBalance;
                                    const newHeldBalance =
                                        walletValue.heldBalance -
                                        tradeExecAmount;
                                    walletRef
                                        .update({
                                            heldBalance: newHeldBalance,
                                        })
                                        .then(() => {
                                            utilityFunction.newCryptoTransaction(
                                                tradeExecAmount,
                                                userId,
                                                'liquidation',
                                                cryptoType
                                            );
                                        });

                                    // hedged loan reference update
                                    hedgeRef.update({
                                        status: 'completed',
                                        completed: true,
                                    });
                                    logRef.add({
                                        orderId: tradeData.id,
                                        userId: userId,
                                        type: cryptoType,
                                        loanId: loanId,
                                        apisSuccess: true,
                                        status: 'hedge loan liquidated',
                                        cryptoAmount: tradeExecAmount,
                                        created_at: Date.now(),
                                    });
                                });
                            });
                    }
                })
                .catch((err) => {
                    console.error(err);
                    return;
                });
        }
    );

    ws.onAccountTradeEntry(
        {
            symbol: 'tETHUSD',
        },
        (trade) => {
            const tradeData = serializeTradeData(trade);
            console.log('account te: %j', tradeData);

            const hedgeRef = db.doc(`hedge/bitfinex/new/${tradeData.cid}`);
            const logRef = db.collection('log/oracle/bfx');
            hedgeRef
                .get()
                .then((hedgeData) => {
                    const hedgeValue = hedgeData.data();
                    if (!hedgeData.exists) {
                        return;
                    }
                    const userId = hedgeValue.userId;
                    const loanId = hedgeValue.loanId;
                    const cryptoType = hedgeValue.type;
                    const orderId = hedgeValue.orderId;

                    if (tradeData.id === orderId) {
                        // reference to loan data in fireStore
                        const loanRef = db.doc(
                            `loan/${userId}/asset/${loanId}`
                        );
                        loanRef
                            .update({
                                paid: true,
                                liquidated: true,
                            })
                            .then(() => {
                                const walletRef = db.doc(
                                    `wallet/${userId}/${cryptoType}/holding`
                                );
                                walletRef.get().then((walletData) => {
                                    walletValue = walletData.data();
                                    if (!walletData.exists) {
                                        return;
                                    }
                                    const tradeExecAmount =
                                        Math.sign(tradeData.execAmount) === '-1'
                                            ? -1 * tradeData.execAmount
                                            : tradeData.execAmount;
                                    // const newBalance = hedgeValue.cryptoAmount - tradeExecAmount // execAmount is a -ve integer returned by trade api;
                                    // const newWalletBalance = walletValue.balance + newBalance;
                                    const newHeldBalance =
                                        walletValue.heldBalance -
                                        tradeExecAmount;
                                    walletRef
                                        .update({
                                            heldBalance: newHeldBalance,
                                        })
                                        .then(() => {
                                            utilityFunction.newCryptoTransaction(
                                                tradeExecAmount,
                                                userId,
                                                'liquidation',
                                                cryptoType
                                            );
                                        });

                                    // hedged loan reference update
                                    hedgeRef.update({
                                        status: 'completed',
                                        completed: true,
                                    });
                                    logRef.add({
                                        orderId: tradeData.id,
                                        userId: userId,
                                        type: cryptoType,
                                        loanId: loanId,
                                        apisSuccess: true,
                                        status: 'hedge loan liquidated',
                                        cryptoAmount: tradeExecAmount,
                                        created_at: Date.now(),
                                    });
                                });
                            });
                    }
                })
                .catch((err) => {
                    console.error(err);
                    return;
                });
        }
    );
    /* End Oracle Trade filled in exchange liquidator */
    ws.open();

    function serializeData(data) {
        const orderQuery = {
            id: data.id,
            cid: data.cid,
            symbol: data.symbol,
            amount: data.amount,
            amountOrig: data.amountOrig,
            type: data.type,
            status: data.status,
            flags: data.flags,
            price: data.price,
            priceAvg: data.priceAvg,
            tif: data.mtsTIF,
        };
        return orderQuery;
    }

    function serializeTradeData(data) {
        const orderQuery = {
            id: data.orderID,
            symbol: data.symbol,
            created_at: data.mtsCreate,
            execAmount: data.execAmount,
            execPrice: data.execPrice,
            orderType: data.orderType,
            orderPrice: data.orderPrice,
        };
        return orderQuery;
    }

    function serializeWalletData(data) {
        const orderQuery = {
            type: data.type,
            currency: data.currency,
            balance: data.balance,
            unsettledInterest: data.unsettledInterest,
            balanceAvailable: data.balanceAvailable,
        };

        saveWalletData(orderQuery);
        return orderQuery;
    }

    function saveWalletData(data) {
        const adminRef = db.doc(`admin/wallet/exchange/bitfinex`);
        const cryptoArray = ['BTC', 'ETH', 'USD'];
        const supportedCrypto = cryptoArray.find(
            (arrData) => arrData === data.currency
        );
        if (supportedCrypto) {
            adminRef.get().then((walletData) => {
                if (!walletData.exists) return;

                const walletValue = walletData.data();
                if (
                    walletValue[data.currency].balance !=
                    parseFloat(Expo(data.balance))
                ) {
                    adminRef.update({
                        [data.currency]: {
                            balance: parseFloat(Expo(data.balance)),
                            availableBalance: parseFloat(
                                Expo(data.balanceAvailable)
                            ),
                        },
                    });
                }
                return;
            });
        } else {
            return;
        }
    }

    async function getExchangeRate() {
        const rateRef = db.doc(`rates/usd`);
        let data = '';
        await rateRef.get().then((rateData) => {
            const rateValue = rateData.data();
            data = rateValue;
        });
        return data;
    }

    // convert exponential fraction back to double
    function Expo(x) {
        return Number.parseFloat(x).toFixed(13);
    }

    function cancelOrder(order) {
        ws.cancelOrder(order)
            .then(() => {
                console.log('order cancelled successfully');
            })
            .catch((err) => {
                console.log('failed cancelling order', failed);
            });
    }
};
