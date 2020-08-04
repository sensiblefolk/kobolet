// server/api.js
/*
 |--------------------------------------
 | Dependencies
 |--------------------------------------
 */

const admin = require("firebase-admin");
const functions = require('firebase-functions');
const moment = require('moment');
const sgMail = require('@sendgrid/mail');

const newPayment = require('./coinbase/newPayment');
const createPaymentWebhook = require('./coinbase/webhook/createPayment');
const pendingPaymentWebhook = require('./coinbase/webhook/pendingPayment');
const delayedPaymentWebhook = require('./coinbase/webhook/delayedPayment');
const resolvedPaymentWebhook = require('./coinbase/webhook/resolvedPayment');
const confirmPaymentWebhook = require('./coinbase/webhook/confirmPayment');
const failedPaymentWebhook = require('./coinbase/webhook/failedPayment');
const transferRoute = require('./flutterwave/transferRoute');
const depositRoute = require('./flutterwave/depositRoute');

/* Beginning sendgrid api config*/
sgMail.setApiKey(functions.config().sendgrid_api.key);
sgMail.setSubstitutionWrappers('{{', '}}');
/* End sendgrid api config */

const db = admin.firestore();

module.exports = function (app) {

  let firebaseMiddleware = (req, res, next) => {
    admin.auth().getUser(req.query.id)
      .then(function (userRecord) {
        if (userRecord) {
          return next();
        }
      })
      .catch(function (error) {
        return res.status(500).send({
          message: "You don't have the necessary credentials to complete this request"
        });
      });
  };
  /*
   |--------------------------------------
   | API Routes
   |--------------------------------------
   */

  app.get('/test', (req, res) => {
    res.send('API WORKS');
  })

  /*  COINBASE payment API
   * Begin
   */
  newPayment(app);
  createPaymentWebhook(app);
  pendingPaymentWebhook(app);
  delayedPaymentWebhook(app);
  resolvedPaymentWebhook(app);
  confirmPaymentWebhook(app);
  failedPaymentWebhook(app)
  /*  COINBASE PAYMENT API
   * END
   */

  /*  Rave transfet payment API
   * Begin
   */
  transferRoute(app);
  depositRoute(app);

  /*  Rave transfet payment API
   * End
   */

  /* Manual withdraw processing */
  // POST new payment details to coinbase
  app.post('/withdrawal', firebaseMiddleware, (req, res) => {
    const data = req.body;
    const query = {
      amount: data.amount,
      currency: data.currency,
      address: data.address
    };

    const id = req.query.id;
    const amount = req.body.amount;
    console.log(req.body);
    const userUrl = `users/${id}`;
    const userRef = db.doc(userUrl);
    userRef.get().then(data => {
      const userValue = data.data();
      if (userValue) {
        const currentTime = moment().format("YYYY-MM-DD");
        const msg = {
          to: `Kobolet <michael@crypxel.com>`,
          from: `Kobolet Withdraw <no-reply@kobolet.com>`,
          subject: 'New withdrawal request',
          text: `${userValue.name} with ${id} just requested for a withdrawal of ${query.amount} ${query.currency} to address: ${query.address} on ${currentTime}`
        };
        return sgMail.send(msg).then(() => {
          console.log("capital withdrawal request of %d sent successfully", amount);
          const result = "capital withdrawal request processed successfully";
          // res.status(200).send(result);
        });
      }
    })
    res.end();
  });
  /* End of Manual withdraw processing */
};
