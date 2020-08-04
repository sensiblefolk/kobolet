const functions = require('firebase-functions');

const CoinbaseHMACValidator = (req, res, next) => {
  const hmac = req.get('X-CC-Webhook-Signature');
  const secret = functions.config().coinbase.secret;
  // console.log('hmac', hmac);
  return next();
}

module.exports = CoinbaseHMACValidator;
