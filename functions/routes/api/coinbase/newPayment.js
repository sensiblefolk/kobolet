const functions = require('firebase-functions');
const unirest = require('unirest');
const firebaseMiddleware = require('../../../utility/firebaseMiddleware');


// handles routing for new cryptocurrency deposit call to coinbase api
const newPayment = (app) => {
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
      .headers({
        'Accept': 'application/json',
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
}

module.exports = newPayment;
