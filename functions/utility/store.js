const admin = require('firebase-admin');
const moment = require('moment');

const db = admin.firestore();

// log state to store
async function addOracleLog(orderId = "", userId, type, loanId, apiSuccess, exchange, status, cryptoAmount) {
  // firestore reference definition
  const logRef = db.collection('log/oracle/bfx');
  logRef.add({
    orderId,
    userId,
    type,
    loanId,
    apiSuccess,
    exchange,
    status,
    cryptoAmount,
    created_at: Date.now()
  }).then(() => console.log('added log successfully')).catch(err => console.error('failed adding log', err))
}

async function updateWallet(amount, userId, assetType) {
  const walletRef = db.doc(`wallet/${userId}/${assetType}/holding`);
  await walletRef.get().then((walletData) => {
    if (!walletData.exists) return;
    const walletValue = walletData.data();
    if (walletValue && walletValue.balance >= 0) {
      const newHeldBalance = walletValue.heldBalance - amount;
      const newBalance = walletValue.balance + amount;
      walletRef
        .update({
          balance: newBalance,
          heldBalance: newHeldBalance,
        })
        .then(() => {
          console.log('collateral of %d released back to wallet', amount);
          return;
        });
    }
  });
}

exports.addOracleLog = addOracleLog;
exports.updateWallet = updateWallet;
