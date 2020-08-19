const admin = require("firebase-admin");
const utilityFunction = require('../../../../utility/functions');
const CoinbaseHMACValidator = require('../../../../utility/coinbaseHMACValidator');
const moment = require('moment');

const db = admin.firestore();

// pending crypto deposit webhook event handler
const pendingPayment = (app) => {
  app.post('/crypto/payment/pending', CoinbaseHMACValidator, (req, res) => {
    // res.sendStatus(200);
    let batch = db.batch();
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
}

module.exports = pendingPayment;
