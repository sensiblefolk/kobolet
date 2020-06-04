const BFX = require('bitfinex-api-node');
const functions = require('firebase-functions');

/* Begin Bitfinex Kobolet Oracle */
const bfx = new BFX({
  apiKey: functions.config().bitfinex.key,
  apiSecret: functions.config().bitfinex.secret,

  ws: {
    autoReconnect: true,
    // seqAudit: true,
    // packetWDDelay: 10 * 1000,
    manageOrderBooks: true,
    transform: true,
  },
});

const ws = bfx.ws(2);
ws.on('error', (err) => console.log(err));
ws.on('open', ws.auth.bind(ws));



module.exports = ws;
