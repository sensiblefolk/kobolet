const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

const db = admin.firestore();

// Kobolet Oracle new crypto amount hedge on exchange
const onNewLoanCreate = functions.firestore
  .document('loan/{userId}/asset/{ref}')
  .onCreate((snap, context) => {
    const snapValue = snap.data();
    const snapContext = context.params;

    /* Begin Store Loan data in Unhedge datastore */
    const hedgeRef = db.doc(`hedge/bitfinex/new/${snapValue.created_at}`);
    return hedgeRef
      .set({
        userId: snapContext.userId,
        type: snapValue.type,
        loanId: snapContext.ref,
        liquidationPrice: snapValue.liquidationPrice,
        status: 'pending',
        hedged: false,
        completed: false,
        updateCount: 0,
        cryptoAmount: snapValue.heldCrypto,
        created_at: snapValue.created_at,
        expires_at: snapValue.expires_at,
      })
      .then(() => console.info('new hedge transaction added'))
      .catch((err) => {
        console.error(err);
        return;
      });
    /* End Store Loan data in Unhedge datastore */
  });

module.exports = onNewLoanCreate;
