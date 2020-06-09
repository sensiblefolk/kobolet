const axios = require('axios');
const admin = require('firebase-admin');
const moment = require('moment');

const db = admin.firestore();

// cryptocurrency symbol Object
const cryptoCurrency = [{
    name: 'bitcoin',
    symbol: 'BTC-USD',
    bfxSymbol: 'tBTCUSD',
    shortName: 'BTC',
  },
  {
    name: 'ethereum',
    symbol: 'ETH-USD',
    bfxSymbol: 'tETHUSD',
    shortName: 'ETH',
  },
];

// update current order on bitfinex
async function updateBfxOrder(id, delta) {
  try {
    const result = await axios.default.post(`https://koboletoracle.azurewebsites.net/api/UpdateOrder?code=sbZfFnmKG0jUXTwhE2DH7QovF8R7nETynwC12nCxIRf23nXQWsITaw==`, {
      id,
      delta
    })

    const {
      data
    } = result;

    console.log('api call to update order data', data)

    if (data.status === 'success') {
      return true
    }
  } catch (error) {
    console.error('failed cancelling order', error)
    return false;
  }
}

// cancel current order on bitfinex
async function cancelBfxOrder(orderId) {
  try {
    const result = await axios.default.get(`https://koboletoracle.azurewebsites.net/api/cancelorder/${orderId}?code=EP41WkeQudhikIvZmfb4B3Vsyw2QsWXqKg7ZSG2tspvjxwVOJCDkuA==`)

    const {
      data
    } = result;

    console.log('api call to cancel order data', data)

    if (data.status === 'success') {
      return true
    }
  } catch (error) {
    console.error('failed cancelling order', error)
    return false;
  }
}

// create new order on bitfinex
async function newBfxOrder(cid, symbol, price = 0, type, amount, tif = moment().format()) {
  const body = {
    cid,
    symbol,
    price,
    type,
    amount,
    tif
  }
  try {
    const result = await axios.default.post('https://koboletoracle.azurewebsites.net/api/NewOrder?code=mdJWZqXyDtw66XXTKaVx2nAMY06Gvls23xsVfMaZJC4wD9aRj7JiOg==', body)

    const {
      data
    } = result
    console.log('api call data', data)

    if (data.status === 'success') {
      const {
        data: orderId
      } = data;
      console.log('order id', orderId)
      return orderId
    }
    return null
  } catch (error) {
    console.error('failed creating new bitfinex order', error)
    return null;
  }
}

// get current exchange rate from store
async function getExchangeRate() {
  const rateRef = db.doc(`rates/usd`);
  let data = '';
  await rateRef.get().then((rateData) => {
    const rateValue = rateData.data();
    data = rateValue;
  });
  return data;
}

async function sendWalletDepositMail(query) {
  const crypto = cryptoCurrency.find((data) => data.name == query.type);
  const userRef = db.doc(`users/${query.userId}`);
  userRef.get().then(async (userData) => {
    if (!userData.exists) return;
    const userValue = userData.data;
    const mailQuery = {
      email: userValue.email,
      name: userValue.name,
      amount: query.amount,
      cryptoType: query.type,
    };
    const notificationMessage = `${query.amount}${crypto.shortName} added to wallet`;
    await utilityFunction.sendCryptoDepositMail(mailQuery);
    await utilityFunction.newNotification(notificationMessage, query.userId);
    return;
  });
}

exports.cryptoCurrency = cryptoCurrency;
exports.newBfxOrder = newBfxOrder;
exports.cancelBfxOrder = cancelBfxOrder;
exports.updateBfxOrder = updateBfxOrder;
exports.sendWalletDepositMail = sendWalletDepositMail;
exports.getExchangeRate = getExchangeRate;
