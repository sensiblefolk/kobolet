const {
  addOracleLog,
  updateWallet
} = require('../../utility/store')

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const utilityFunction = require('../../server/functions');
const {
  cryptoCurrency,
  cancelBfxOrder,
  updateBfxOrder,
  getExchangeRate,
  sendWalletDepositMail
} = require('../../utility/helper');

const db = admin.firestore();

const onLoanUpdate = functions.firestore
  .document('loan/{userId}/asset/{ref}')
  .onUpdate(async (snap, context) => {
    const newValue = snap.after.data();
    const previousValue = snap.before.data();
    const snapContext = context.params;
    const cryptoType = cryptoCurrency.find(
      (data) => data.name === newValue.type
    );

    if (newValue.paidBack <= previousValue.paidBack) return;
    console.info('loan update found');
    const hedgeRef = db.doc(`hedge/bitfinex/new/${newValue.created_at}`);
    const loanRef = db.doc(
      `loan/${snapContext.userId}/asset/${snapContext.ref}`
    );

    hedgeRef.get().then(async (hedgeData) => {
      if (!hedgeData.exists) return;

      const hedgeValue = hedgeData.data();
      if (!hedgeValue.hedged) return;

      const currentDate = moment(Date.now());
      const expiryDate = moment(newValue.expires_at);
      const currentLoanDuration = expiryDate.diff(currentDate, 'months', true);
      // loan amount to update and return
      const amountLeftToPay =
        newValue.amount + newValue.monthlyInterest * currentLoanDuration;
      const usdAmountToPay = amountLeftToPay - newValue.paidBack;
      const cryptoAmountToUpdate = usdAmountToPay / newValue.liquidationPrice;
      const cryptoToReturn = hedgeValue.cryptoAmount - cryptoAmountToUpdate;

      if (newValue.paid) {
        const cancelled = await cancelBfxOrder(hedgeValue.orderId)
        if (cancelled) {
          await updateWallet(
            hedgeValue.cryptoAmount,
            snapContext.userId,
            newValue.type
          ).then(async () => {
            hedgeRef.update({
              completed: true,
              completed_at: Date.now(),
            });
            sendWalletDepositMail({
              amount: hedgeValue.cryptoAmount,
              type: newValue.type,
              userId: snapContext.userId,
            });
            await addOracleLog(hedgeValue.orderId, snapContext.userId, newValue.type, snapContext.ref, true, 'bitfinex', 'order cancelled successfully', hedgeValue.cryptoAmount)
            return;
          });
        } else {
          console.error(
            'failed cancelling order %',
            hedgeValue.orderId,
            err
          );
          await addOracleLog(hedgeValue.orderId, snapContext.userId, newValue.type, snapContext.ref, false, 'bitfinex', 'failed to cancel order', hedgeValue.cryptoAmount)
          return;
        }
      }

      if (!newValue.paid) {
        console.log('updating crypto amount on exchange');

        const updated = await updateBfxOrder(hedgeValue.orderId, cryptoToReturn.toString());

        if (updated) {
          await updateWallet(
            cryptoToReturn,
            snapContext.userId,
            newValue.type
          ).then(() => {
            loanRef.update({
              heldCrypto: cryptoAmountToUpdate,
            });
            hedgeRef.update({
              cryptoAmount: cryptoAmountToUpdate,
              updateCount: hedgeValue.updateCount + 1,
            });
            sendWalletDepositMail({
              amount: cryptoToReturn,
              type: newValue.type,
              userId: snapContext.userId,
            });
          });
          await addOracleLog(hedgeValue.orderId, snapContext.userId, newValue.type, snapContext.ref, true, 'bitfinex', 'order updated successfully', hedgeValue.cryptoAmount)
        } else {
          console.error(
            'failed updating %d order',
            hedgeValue.orderId,
            err
          );
          await addOracleLog(hedgeValue.orderId, snapContext.userId, newValue.type, snapContext.ref, false, 'bitfinex', 'failed updating order', hedgeValue.cryptoAmount)
        }
      }
    })
  })

module.exports = onLoanUpdate;
