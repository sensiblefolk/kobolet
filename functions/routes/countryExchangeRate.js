const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();

// Automatically stores supported country exchange rates every four hours.
const countryExchangeRate = functions.https.onRequest(async (req, res) => {
  try {
    const result = await axios.default.get(
      `http://data.fixer.io/api/latest?access_key=3f860c4bce55e5bf2f9bc945cf90da8b&symbols=USD,NGN,KES,ZAR,GHS&format=1`
    );
    const { rates } = result.data;
    const docRef = db.collection('rates').doc('usd');
    const query = {
      USD: 1,
      NGN: rates.NGN / rates.USD,
      KES: rates.KES / rates.USD,
      ZAR: rates.ZAR / rates.USD,
      GHS: rates.GHS / rates.USD,
    };
    docRef.update(query);
    res.sendStatus(200);
  } catch (error) {
    console.error('failed calling country exchange rate api', error);
    res.sendStatus(401);
  }
});

module.exports = countryExchangeRate;
