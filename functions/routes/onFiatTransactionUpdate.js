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
      const response = snapValue.response.tx;
      /* beging send email query */
      const query = {
        name: response.customer.fullName,
        email: response.customer.email,
        currency: response.currency,
        amount: response.charged_amount,
      };
      return utilityFunction.sendFiatLoanDepositMail(query);
      /* End send email query */
    } else if (snapContext.type == ('bitcoin' || 'ethereum')) {}
  });

module.exports = onFiatTransactionUpdate;
