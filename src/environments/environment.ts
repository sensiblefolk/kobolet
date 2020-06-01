// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyBfLwN_YGhwbZ7h0JOeHfJVsSNIxhER8ig',
    authDomain: 'kobo-let.firebaseapp.com',
    databaseURL: 'https://kobo-let.firebaseio.com',
    projectId: 'kobo-let',
    storageBucket: 'kobo-let.appspot.com',
    messagingSenderId: '737101680808'
  },
  // rave: 'FLWPUBK-9eaa94ffd5ab74c506554b99386c87c6-X',
  rave: {
    key: 'FLWPUBK_TEST-8b163a4b375a47e6f34d3ac8398b5d26-X',
    secret: 'FLWSECK_TEST-2a12700449b7a55929bc96b71a3d76a6-X',
    encrypt: 'FLWSECK_TESTb3d5a3e0d7b1',
    bvnUrl: 'https://ravesandboxapi.flutterwave.com/v2/kyc/bvn',
    url: 'https://ravesandboxapi.flutterwave.com/flwv3-pug/getpaidx/api/flwpbf-inline.js'
  },
  moneyWave: {
    key: 'lv_2KHRK8R27LT2IW41EYJB',
    secret: 'lv_A0AOSGBA27RIEHLOJ7VZIJML98H265'
  }
};
