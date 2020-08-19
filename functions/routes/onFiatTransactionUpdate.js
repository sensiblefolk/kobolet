const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const utilityFunction = require('../server/functions');

const db = admin.firestore();

// send new mail on new fiat transaction deposit depended on object struction of flutterwave ravepay response object
const onFiatTransactionUpdate = functions.firestore
  .document('transactions/{userId}/{type}/{ref}')
  .onCreate((snap, context) => {
    const snapValue = snap.data();
    const snapContext = context.params;
    const userId = snapContext.userId;

    if (snapContext.type == 'fiat') {
      const userRef = db.doc(`users/${userId}`)
      userRef.get().then(user => {
        const userData = user.data();
        /* beging send email query */
        const query = {
          name: userData.name,
          email: userData.email,
          currency: snapValue.currency,
          amount: snapValue.amount,
        };
        return utilityFunction.sendFiatLoanDepositMail(query);
      })
      /* End send email query */
    } else if (snapContext.type == ('bitcoin' || 'ethereum')) {}
  });

module.exports = onFiatTransactionUpdate;
