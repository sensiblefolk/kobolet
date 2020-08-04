const admin = require('firebase-admin');
const utilityFunction = require('../utility/functions');
const moment = require('moment');
const slackOracleNotify = require('../routes/notification/slackOracle');

const db = admin.firestore();

// add new loan to the database
const addNewLoan = async ({
  uid,
  type,
  refId,
  duration,
  cryptoAmount,
  amount,
  fiatInterestAmount,
  exchangeRate,
  cryptoPrice,
  currency,
  name,
  email,
  bankName
}) => {
  // add new loan reference for batch write
  console.log('loan query', JSON.stringify(loanQuery));
  const loanRef = db.doc(`loan/${uid}/asset/${refId}`);
  const expiryDuration = duration * 30;
  const currentTime = moment().valueOf();
  const expiryDate = moment(currentTime).add(expiryDuration, 'days').valueOf();
  fiatAmount = utilityFunction.round((amount / exchangeRate), 0);
  const interestAmount = utilityFunction.round((fiatInterestAmount / exchangeRate), 0);
  const liquidationPrice = (cryptoPrice * 0.505) + (fiatAmount * 0.03); // first month interest plus capital

  loanRef.set({
    amount: fiatAmount,
    interestAmount: interestAmount,
    paidBack: 0,
    price: cryptoPrice,
    liquidationPrice: liquidationPrice,
    liquidationDateTracker: currentTime,
    heldCrypto: cryptoAmount,
    OriginalHeldCrypto: cryptoAmount,
    monthlyInterest: fiatAmount * 0.03,
    currency: currency,
    duration: duration,
    totalDuration: duration,
    created_at: currentTime,
    expires_at: expiryDate,
    paid: false,
    type: type
  }).then(async () => {
    const msgQuery = {
      name: name,
      email: email,
      bankName: bankName,
      loanInterest: (interestAmount - fiatAmount) * exchangeRate,
      loanAmount: fiatAmount * exchangeRate,
      heldCrypto: cryptoAmount,
      duration: duration,
      currency: currency,
      cryptoType: type
    }
    utilityFunction.sendNewLoanMail(msgQuery);
    utilityFunction.userCountUpdate(fiatAmount, uid);
    await slackOracleNotify(`new loan created, move ${cryptoAmount} ${type} into exchange wallet to create new hedge transaction`);
    return Promise.resolve('loan added successfully');
  }).catch(err => {
    return Promise.reject(`faile adding new loan for user: ${uid}, ${JSON.stringify(err)}`);
  })
}

exports.addNewLoan = addNewLoan;
