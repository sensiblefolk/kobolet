const admin = require('firebase-admin');
const utilityFunction = require('../utility/functions');
const slackNotify = require('../routes/notification/slack');

const db = admin.firestore();

const cryptoDepositToWallet = async (uid, type, amount, code, email, name) => {
  // update wallet amount
  const walletDoc = db.doc(`wallet/${uid}/${type}/holding`);
  walletDoc.get().then(async walletInfo => {
    const walletValue = walletInfo.data();
    console.info(walletValue);
    if (walletValue && walletValue.temp_held === 0) {
      const newBalance = walletValue.balance + amount;
      walletDoc.update({
        balance: newBalance
      });
    } else if (walletValue && walletValue.temp_held > 0 && walletValue.code === code) {
      const newBalance = walletValue.balance + amount + walletValue.temp_held;
      const newHeldBalance = walletValue.heldBalance - walletValue.temp_held;
      walletDoc.update({
        balance: newBalance,
        heldBalance: newHeldBalance,
        temp_held: 0,
        code: ''
      });
    } else {
      walletDoc.set({
        balance: amount,
        heldBalance: 0
      });
    }
    /* Begin send deposit confirmation email */
    const msgQuery = {
      email: email,
      name: name,
      cryptoType: type,
      amount: amount,
    }
    utilityFunction.sendCryptoDepositMail(msgQuery);
    await slackNotify(`${amount} ${type} was just deposited into coin wallet by ${name}`);
    /* End deposit confirmation email */
  }).catch(err => console.log('failed updating wallet', err));
}

exports.cryptoDepositToWallet = cryptoDepositToWallet;
