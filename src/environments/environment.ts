// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyCH4Aplc07pwmc8PosaeZnhCP9Z1_qTCV8',
    authDomain: 'kobolet-dev.firebaseapp.com',
    databaseURL: 'https://kobolet-dev.firebaseio.com',
    projectId: 'kobolet-dev',
    storageBucket: 'kobolet-dev.appspot.com',
    messagingSenderId: '152957475724',
    appId: '1:152957475724:web:a1c8ff51349ad93805d4a9',
    measurementId: 'G-ZEMF06D27G',
  },
  functionsUrl: 'https://us-central1-kobolet-dev.cloudfunctions.net',
  // rave: 'FLWPUBK-9eaa94ffd5ab74c506554b99386c87c6-X',
  rave: {
    key: 'FLWPUBK_TEST-8b163a4b375a47e6f34d3ac8398b5d26-X',
    secret: 'FLWSECK_TEST-2a12700449b7a55929bc96b71a3d76a6-X',
    encrypt: 'FLWSECK_TESTb3d5a3e0d7b1',
    bvnUrl: 'https://ravesandboxapi.flutterwave.com/v2/kyc/bvn',
    url:
      'https://ravesandboxapi.flutterwave.com/flwv3-pug/getpaidx/api/flwpbf-inline.js',
  },
  moneyWave: {
    key: 'lv_2KHRK8R27LT2IW41EYJB',
    secret: 'lv_A0AOSGBA27RIEHLOJ7VZIJML98H265',
  },
  fileStackApi: 'ABqpa1X3SvCTk1KQRyQlwz',
  coinbase: {
    priceUrl: 'https://api.coinbase.com/v2',
    commerce: 'https://api.commerce.coinbase.com'
  },
  qrserverUrl: 'https://api.qrserver.com/v1/create-qr-code',
};
