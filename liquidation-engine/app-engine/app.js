'use strict';

// [START Kobolet_Oracle]
const app = require('express')();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cors = require('cors');
// Config
const config = require('./server/config');
const admin = require("firebase-admin");
const firebase = require('firebase');
// app.set('view engine', 'pug');

const server = require('http').Server(app);
const serviceAccount = require('./server/kobo-let-firebase-adminsdk-svub3-19c0134e19.json')

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://kobo-let.firebaseio.com"
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(cors());

// Set port
const port = process.env.PORT || '8083';
app.set('port', port);


/*
 |--------------------------------------
 | Routes
 |--------------------------------------
 */
 


require('./server/api')(app, config);



/*
 |--------------------------------------
 | Server
 |--------------------------------------
 */
 
 

app.listen(port, () => console.log(`Server running on localhost:${port}`));
// [END Kobolet_Oracle]
