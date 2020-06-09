const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();

// Automaticall update crypto price every 2 minutes
const getCryptoPrice = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (context) => {
    const docRef = db.doc(`rates/usd`);

    await axios.default
      .get(
        `https://api-pub.bitfinex.com/v2/tickers/?symbols=tBTCUSD,tLTCUSD,tETHUSD`
      )
      .then((resp) => {
        const respData = resp.data;
        let priceQuery = {};
        let countTracker = 0;
        for (const data of respData) {
          priceQuery[data[0]] = data[7];
          countTracker++;
        }
        if (countTracker == respData.length) {
          return docRef.set(priceQuery);
        }
      })
      .catch((err) => {
        return console.log('error storing crypto price', err);
      });
  });

module.exports = getCryptoPrice
