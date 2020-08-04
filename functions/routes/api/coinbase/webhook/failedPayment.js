const admin = require('firebase-admin');
const CoinbaseHMACValidator = require('../../../../utility/coinbaseHMACValidator');

const db = admin.firestore();

const failedPayment = (app) => {
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
}

module.exports = failedPayment;
