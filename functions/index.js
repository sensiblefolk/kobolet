const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const express = require('express');
// const cors = require('cors')({ origin: true });
const cors = require('cors');
const config = require('./server/config');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

require('./utility/firebaseSetup');

// api routes
const countryExchangeRate = require('./routes/countryExchangeRate');
const getCryptoPrice = require('./routes/schedulers/getCryptoPrice');
const updateBankListScheduler = require('./routes/schedulers/updateBankListScheduler');
const scheduledFirestoreExport = require('./routes/schedulers/scheduledFirestoreExport');
const fcmSend = require('./routes/fcmSend');
const onFiatTransactionUpdate = require('./routes/onFiatTransactionUpdate');
const onBfxWalletUpdate = require('./routes/liquidationEngine/onBfxWalletUpdate');
const onNewLoanCreate = require('./routes/liquidationEngine/onNewLoanCreate')
const onHedgeLoanExpired = require('./routes/liquidationEngine/onHedgeLoanExpired');
const onLoanUpdate = require('./routes/liquidationEngine/onLoanUpdate');

/* Begin Express config */
const app = express();

app.use(
  cors({
    origin: true,
  })
);
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(methodOverride('X-HTTP-Method-Override'));

require('./routes/api')(app);
/* End Express config */

const db = admin.firestore();

exports.api = functions.https.onRequest(app);
exports.countryExchangeRate = countryExchangeRate;
exports.getCryptoPrice = getCryptoPrice;
exports.scheduledFirestoreExport = scheduledFirestoreExport;
exports.updateBankListScheduler = updateBankListScheduler;
exports.fcmSend = fcmSend;
/* Begin Kobolet Oracle Functions */
exports.onFiatTransactionUpdate = onFiatTransactionUpdate;
exports.onBfxWalletUpdate = onBfxWalletUpdate;
exports.onNewLoanCreate = onNewLoanCreate;
exports.onHedgeLoanExpired = onHedgeLoanExpired;
exports.onLoanUpdate = onLoanUpdate;
/* End Kobolet Oracle functions */


// send welcome mail for every new user
exports.onNewUser = functions.auth.user().onCreate((snap, context) => {
  const uid = snap.uid;
  const batch = db.batch();
  console.log('snap', snap);
  console.log('context', context);

  const bitcoinRef = db.doc(`wallet/${uid}/bitcoin/holding`);
  const ethereumRef = db.doc(`wallet/${uid}/ethereum/holding`);
  const countRef = db.doc(`count/${uid}`);
  const countQuery = {
    max: 8,
    loanCount: 0,
    loanPaid: 0,
    paidCount: 0,
    total: 0,
    amount: 0,
    currency: 'NGN',
  };
  const query = {
    balance: 0,
    heldBalance: 0,
    can_withdraw: true,
    temp_held: 0
  };
  batch.set(bitcoinRef, query);
  batch.set(ethereumRef, query);
  batch.set(countRef, countQuery);

  batch
    .commit()
    .then(() => {
      console.log('new user account set up');
      sendWelcomeEmail(snap, context);
    })
    .catch((err) => {
      console.log('account creation error', err);
    });
  // res.sendStatus(200);
});


// Send welcome email to new user
function sendWelcomeEmail(snap, context) {
  const user = snap;
  // console.log(snap);
  const email = user.email;
  const displayName = user.displayName ? user.displayName : email;
  const photoUrl = user.photoURL;
  const uid = user.uid;

  var docRef = db.collection('users').doc(uid);

  const setUser = docRef.set({
    name: displayName || '',
    photoUrl: photoUrl || '',
    email: email,
    kyc: {
      pending: false,
      verified: false,
    },
  });

  const msg = {
    to: `${displayName} <${email}>`,
    from: `Kobolet <no-reply@kobolet.com>`,
    subject: `Welcome to Kobolet`,
    templateId: 'd-a474ddc80376464a8a7175cf9c9da354',
    dynamic_template_data: {
      name: displayName,
    },
  };

  setUser
    .then((success) => {
      return sgMail.send(msg).then(() => {
        console.log('New user mail sent successfully', email);
      });
    })
    .catch((err) => {
      console.log('Failed adding new user');
    });
  // res.sendStatus(200);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
