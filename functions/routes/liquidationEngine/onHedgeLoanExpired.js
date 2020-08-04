const {
  addOracleLog
} = require('../../utility/store')

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const utilityFunction = require('../../server/functions');
const {
  cryptoCurrency,
  newBfxOrder,
  getExchangeRate
} = require('../../utility/helper');
const slackOracleNotify = require('../notification/slackOracle');

const db = admin.firestore();

const onHedgeLoanExpired = functions.firestore.document('hedge/bitfinex/expired/{refId}')
  .onCreate(async (snap, context) => {
    const snapValue = snap.data();
    const userId = snapValue.userId;
    const loanId = snapValue.loanId;
    const cryptoType = cryptoCurrency.find(
      (data) => data.name === snapValue.type
    );

    let rateData = await getExchangeRate();
    let rateValue = rateData[cryptoType.bfxSymbol];

    if (snapValue.completed) return;

    const loanRef = db.doc(`loan/${userId}/asset/${loanId}`);
    const hedgeREf = db.doc(`hedge/bitfinex/expired/${context.params.refId}`);
    const walletRef = db.doc(`wallet/${userId}/${snapValue.type}`);

    loanRef.get().then(async loanData => {
      const amountLeftToPay =
        loanValue.amount + loanValue.monthlyInterest * loanValue.duration;
      const usdAmountToLiquidate = amountLeftToPay - loanValue.paidBack;
      const cryptoAmountToLiquidate = usdAmountToLiquidate / rateValue;
      const cryptoToReturn = snapValue.cryptoAmount - cryptoAmountToLiquidate;

      const order = await newBfxOrder(snapValue.created_at, cryptoType.bfxSymbol, 'EXCHANGE_MARKET', -cryptoAmountToLiquidate)

      if (order) {
        loanRef
          .update({
            paid: true,
            liquidation: true,
          })
          .then(() => console.log('loan updated'));
        hedgeREf.update({
          completed: true,
          orderId: order.orderId,
        });
        utilityFunction.newCryptoTransaction(
          cryptoAmountToLiquidate,
          userId,
          'liquidation',
          snapValue.type
        );
        walletRef.get().then((walletData) => {
          const walletValue = walletData.data();
          const newAmount = walletValue.amount + cryptoToReturn;
          const newHeldBalance =
            walletValue.heldBalance - snapValue.cryptoAmount;
          walletRef.update({
            balance: newAmount,
            heldBalance: newHeldBalance,
          });
        });
        await addOracleLog(order.orderId, userId, snapValue.type, loanId, true, 'bitfinex', 'expired loan closed successfully', cryptoAmountToLiquidate);
        await slackOracleNotify(`${cryptoAmountToLiquidate}${cryptoType.bfxSymbol} liquidated on exchange`);
      } else {
        console.error('failed updating expired loan balance')
        await addOracleLog(userId, snapValue.type, loanId, false, 'bitfinex', 'failed closing expired loan', cryptoAmountToLiquidate);
      }
    })
  });

module.exports = onHedgeLoanExpired;
