 const CoinbaseHMACValidator = require('../../../../utility/coinbaseHMACValidator');

 // crypto deposit resolved webhook route handler
 const resolvedPayment = (app) => {
   app.post('/crypto/payment/resolved', CoinbaseHMACValidator, (req, res) => {
     const result = req.body.event
     console.info('payment resolved', JSON.stringify(result));
     return res.sendStatus(200);
   })

 }

 module.exports = resolvedPayment;
