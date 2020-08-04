const transferFund = require('./transferFund');
const {
  addNewLoan
} = require('../../../models/loans');

const transferRoute = (app) => {
  app.post('/fiat/transfer', (req, res) => {
    const data = req.body;
    // console.log('data', data);
    const id = req.query.id;

    transferFund({
      uid: id,
      type: data.cryptoType,
      cryptoAmount: data.cryptoAmount,
      currency: data.currency,
      fiatAmount: data.amount,
      bankCode: (data.bankCode).trim(),
      accountNumber: (data.accountNumber).trim(),
      refId: data.ref
    }).then(() => {
      addNewLoan({
        uid: id,
        type: data.cryptoType,
        refId: data.ref,
        duration: data.duration,
        cryptoAmount: data.cryptoAmount,
        amount: data.amount,
        fiatInterestAmount: data.interestAmount,
        exchangeRate: data.exchangeRate,
        cryptoPrice: data.cryptoPrice,
        currency: data.currency,
        name: data.name,
        email: data.email,
        bankName: data.bankName
      }).then(() => {
        console.log('load added successfully')
        return res.status(200).send({
          message: 'success'
        })
      }).catch(err => {
        console.error('failed adding loans', JSON.stringify(err));
        return res.status(500).send({
          message: 'failed'
        })
      })
    }).catch((err) => {
      console.error('failed transferring funds', JSON.stringify(err))
      return res.status(500).send({
        message: 'failed'
      })
    })
  });
}

module.exports = transferRoute;
