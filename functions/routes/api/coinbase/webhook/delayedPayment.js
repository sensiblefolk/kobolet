const CoinbaseHMACValidator = require('../../../../utility/coinbaseHMACValidator');
const { cryptoDepositToWallet } = require('../../../../models/wallet');

/* crypto deposit delayed webhook route handler
 * Payment delayed due to over payment or under payment or token expiry
 */
const delayedPayment = (app) => {

  app.post('/crypto/payment/delayed', CoinbaseHMACValidator, async (req, res) => {
    const result = req.body.event
    console.info('payment delayed', JSON.stringify(result.data.timeline));
    const paymentData = result.data;

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
}

module.exports = delayedPayment;
