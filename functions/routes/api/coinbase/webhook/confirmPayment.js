const admin = require("firebase-admin");
const CoinbaseHMACValidator = require('../../../../utility/coinbaseHMACValidator');
const {
  cryptoDepositToWallet
} = require('../../../../models/wallet');
const transferFund = require('../../flutterwave/transferFund');
const {
  addNewLoan
} = require('../../../../models/loans');

const db = admin.firestore();

const confirmPayment = (app) => {
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
}

module.exports = confirmPayment;
