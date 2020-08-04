const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment');
const slackOracleNotify = require('../notification/slackOracle');

const {
  cryptoCurrency,
  newBfxOrder
} = require('../../utility/helper');
const {
  addOracleLog
} = require('../../utility/store')

const db = admin.firestore();

// Create new Hedge Transaction on bitfinex once wallet has been updated
const onBfxWalletUpdate = functions.firestore.document('admin/wallet/exchange/bitfinex').onUpdate(async (snap, context) => {
  const snapValue = snap.after.data();
  // const snapContext = context.params;
  let hedgeArray = []
  console.log('jumped into hedge transaction creation');

  // firestore reference definition
  const logRef = db.collection('log/oracle/bfx');
  const hedgeRef = db
    .collection('hedge/bitfinex/new')
    .where('hedged', '==', false);

  hedgeRef.get().then(async snapShot => {
    const hedgeSize = snapShot.size;

    snapShot.forEach(snapShotData => {
      const snapShotValue = snapShotData.data();
      const hedgeId = snapShotData.id;
      hedgeArray.push({
        hedgeId,
        ...snapShotValue
      })
    })
    await Promise.all(hedgeArray.map(async hedgeValue => {
      const cryptoType = cryptoCurrency.find(
        (data) => data.name === hedgeValue.type
      );

      if (
        snapValue[cryptoType.shortName].availableBalance >=
        hedgeValue.cryptoAmount &&
        !hedgeValue.hedged &&
        hedgeSize > 0
      ) {
        const hedgeId = hedgeValue.hedgeId
        const order = await newBfxOrder(hedgeValue.created_at, cryptoType.bfxSymbol, hedgeValue.liquidationPrice, 'EXCHANGE_STOP', -hedgeValue.cryptoAmount, `${moment(hedgeValue.expires_at).format()}`)

        if (order) {
          let hedgeRef = db.doc(`hedge/bitfinex/new/${hedgeId}`);
          // update hedge store
          hedgeRef.update({
            orderId: order.orderId,
            hedged: true,
            pending: 'completed',
          });
          await slackOracleNotify(`${hedgeValue.cryptoAmount}${cryptoType.bfxSymbol} hedge transaction created with id:${order} for liquidation at ${hedgeValue.liquidationPrice}`);

          // update log store
          await addOracleLog(order.orderId, hedgeValue.userId, hedgeValue.type, hedgeValue.loanId, true, 'bitfinex', 'hedge creation successful', hedgeValue.cryptoAmount);
        } else {
          await addOracleLog(hedgeValue.userId, hedgeValue.type, hedgeValue.loanId, false, 'bitfinex', 'hedge creation failed', hedgeValue.cryptoAmount);
          await slackOracleNotify(`failed adding ${hedgeValue.cryptoAmount}${cryptoType.bfxSymbol} for liquidation at ${hedgeValue.liquidationPrice}. user id is: ${hedgeValue.userId}`);
        }
      }
    }))
  })
})



module.exports = onBfxWalletUpdate;
