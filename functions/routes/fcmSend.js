const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

const db = admin.firestore();

// firebase cloud messaging service
const fcmSend = functions.firestore
  .document('admin/liquidate/id/{dataId}')
  .onCreate((change, context) => {
    const docData = change.data();
    const userId = docData.userId;
    const apnTtl = moment().add(24, 'hours').valueOf();
    const adminMessage = `liquidate ${docData.amount}${docData.cryptoType} at ${docData.liquidationPrice}`;
    const userMessage = `${docData.amount}${docData.cryptoType} has just been liquidated`;

    const adminTruePayload = {
      notification: {
        title: `liquidate ${docData.cryptoType}`,
        body: `${docData.amount}${docData.cryptoType} liquidated at ${docData.liquidationPrice}`,
        icon: 'https://app.kobolet.com/assets/demo/demo6/media/img/logo/logo.png',
        click_action: 'https://app.kobolet.com',
      },
    };

    const adminFalsePayload = {
      notification: {
        title: `liquidate ${docData.cryptoType}`,
        body: adminMessage,
        icon: 'https://app.kobolet.com/assets/demo/demo6/media/img/logo/logo.png',
        click_action: 'https://app.kobolet.com',
      },
    };

    const userPayload = {
      notification: {
        title: `loan liquidated`,
        body: userMessage,
        icon: 'https://app.kobolet.com/assets/demo/demo6/media/img/logo/logo.png',
        click_action: 'https://app.kobolet.com',
      },
    };

    const msgLiquidated = {
      to: `Kobolet <michael@crypxel.com>`,
      from: `Kobolet Liquidation <no-reply@kobolet.com>`,
      subject: `Kobolet Loan liquidated`,
      html: `${docData.amount}${docData.cryptoType} was liquidated successfully and loan closed`,
    };

    const msgNotLiquidated = {
      to: `Kobolet <michael@crypxel.com>`,
      from: `Kobolet Liquidation <no-reply@kobolet.com>`,
      subject: `Kobolet Loan liquidated`,
      html: adminMessage,
    };

    const adminKey = db.doc(`fcmTokens/iCgkEWagpye7TnjaBMZiw2Mz03c2`);
    adminKey.get().then((adminData) => {
      const adminValue = adminData.data();
      const token = adminValue.token;
      if (docData.status) {
        return admin
          .messaging()
          .sendToDevice(token, adminTruePayload)
          .then(() => {
            console.log('admin notification sent successfully');
            sgMail.send(msgLiquidated).then(() => {
              console.log('loan liquidation mail sent successfully');
            });
          })
          .catch((err) => console.log(err));
      } else {
        return admin
          .messaging()
          .sendToDevice(token, adminFalsePayload)
          .then(() => {
            console.log('admin notification sent successfully');
            sgMail.send(msgNotLiquidated).then(() => {
              console.log('loan liquidation mail sent successfully');
            });
          })
          .catch((err) => console.log(err));
      }
    });

    const userKey = db.doc(`fcmTokens/${userId}`);
    userKey.get().then((userData) => {
      const userValue = userData.data();
      const token = userValue.token;
      return admin
        .messaging()
        .sendToDevice(token, userPayload)
        .then(() => {
          console.log('user notification sent successfully');
          const userRef = db.doc(`users/${userId}`);
          userRef.get().then((userData) => {
            const userValue = userData.data();
            const userMsgLiquidated = {
              to: `Kobolet <${userValue.email}>`,
              from: `Kobolet Liquidation <no-reply@kobolet.com>`,
              subject: `Kobolet Loan liquidated`,
              html: `${docData.amount}${docData.cryptoType} was liquidated successfully and loan closed`,
            };
            sgMail.send(userMsgLiquidated).then(() => {
              console.log('user loan liquidation mail sent successfully');
            });
          });
        })
        .catch((err) => console.log(err));
    });
    // res.sendStatus(200);
  });

module.exports = fcmSend;
