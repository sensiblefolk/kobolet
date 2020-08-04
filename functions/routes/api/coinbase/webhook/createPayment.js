const CoinbaseHMACValidator = require('../../../../utility/coinbaseHMACValidator');

// new crypto deposit webhook api handler
const createPayment = (app) => {
  app.post('/crypto/payment/create', CoinbaseHMACValidator, (req, res) => {
    console.info('new', req.body.event);
    return res.sendStatus(200);
  })
}

module.exports = createPayment;
