const admin = require('firebase-admin');
const functions = require('firebase-functions');
const Ravepay = require('flutterwave-node');
const moment = require('moment');
const slackNotify = require('../../notification/slack');

const rave = new Ravepay(functions.config().raveprod.key, functions.config().raveprod.secret, true);

const db = admin.firestore();

const transferFund = async ({
  uid,
  type,
  cryptoAmount,
  currency,
  fiatAmount,
  bankCode,
  accountNumber,
  refId
}) => {
  // Check that available currency balance in ravepay wallet is sufficient
  console.info('transfer api called')
  rave.Transfer.getBalance({
      currency: currency
    })
    .then(async balance => {
      const balResp = balance.body;
      const currentBalance = balResp.data.AvailableBalance;
      console.log('balance', JSON.stringify(balResp))
      if (currentBalance < fiatAmount || balResp.status != 'success') {
        await slackNotify(`Transfer of ${currency}${fiatAmount} failed due to insufficient balance in wallet. Current wallet balance is ${currentBalance}, please fund wallet now`);
        return Promise.reject(`Insufficient balance in ${currency}${currentBalance} wallet`);
      }

      const transferQuery = {
        account_bank: bankCode,
        account_number: accountNumber,
        currency: currency,
        amount: fiatAmount,
        secKey: functions.config().raveprod.secret,
        narration: `Kobolet loan`,
        reference: refId
      };
      rave.Transfer.initiate(transferQuery).then(async resp => {
        console.log('Transfer details', JSON.stringify(resp.body));
        let respData = resp.body.data;
        const momentconvert = moment(respData.date_created).valueOf();

        let respQuery = respData;
        respQuery['time'] = momentconvert;
        respQuery['type'] = 'withdrawal';
        respQuery['provider'] = 'rave';

        // add fiat transaction to database
        const fiatTransRef = db.doc(`transactions/${uid}/fiat/${refId}`);
        const walletDoc = db.doc(`wallet/${uid}/${type}/holding`);
        fiatTransRef.set(respQuery);

        // check wallet and update wallet
        walletDoc.get().then(walletInfo => {
          const walletValue = walletInfo.data();
          // console.log(walletValue);
          if (walletValue && walletValue.balance >= 0 && walletValue.balance >= cryptoAmount) {
            const currentBalance = walletValue.balance;
            const heldBalance = walletValue.heldBalance;
            const newHeldBalance = heldBalance + cryptoAmount;
            const newBalance = currentBalance - cryptoAmount;
            walletDoc.update({
              balance: newBalance,
              heldBalance: newHeldBalance
            }).then(() => true)
          }
        }).catch(err => console.log('failed upating wallet', err));
        await slackNotify(`Transfer of ${currency}${fiatAmount} successful. Current wallet balance is: ${currentBalance - fiatAmount}`);
        return Promise.resolve(`fund transfer of ${currency}${fiatAmount} successful`)
      }).catch( async err => {
        return Promise.reject(`Transfer of ${fiatAmount} to account ${uid} failed, ${JSON.stringify(err)}`)
      })
    }).catch(err => {
      return Promise.reject(`failed checking transfer balance, ${JSON.stringify(err)}`)
    })
}

module.exports = transferFund;
