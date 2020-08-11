const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();

// Check for bank list every 24 hours and update current selection
const updateBankListScheduler = functions.pubsub
  .schedule('every day 00:00')
  .onRun(async (context) => {
    const bankRef = db.doc('bank/NGN');
    const country = ['NGN', 'KES', 'GHS'];

    for (const data of country) {
      const strCurrency = data.substring(0, 2);
      await axios.default
        .post(
          `https://live.moneywaveapi.co/v1/banks/?country=${strCurrency}`, {}
        )
        .then((response) => {
          const result = response.data.data;
          const bankData = Object.keys(result).map((k) => {
            return {
              code: k,
              name: result[k],
            };
          });
          const bankRef = db.doc(`bank/${data}`);
          return bankRef.set({
            data: bankData,
          });
        })
        .catch((err) => console.log('bank update failed', err));
    }
  });

module.exports = updateBankListScheduler
