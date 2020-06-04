const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const functions = require('firebase-functions');

/* Begin Firebase Admin functions Initialisation */
admin.initializeApp();

// sendgrid global configuration
sgMail.setApiKey(functions.config().sendgrid_api.key);
sgMail.setSubstitutionWrappers('{{', '}}'); // Configure the substitution tag wrappers globally
