const admin = require("firebase-admin");
const functions = require('firebase-functions');
const db = admin.firestore();
const sgMail = require('@sendgrid/mail');
const express = require('express');
const moment = require('moment');
const rp = require('request-promise');
const promisePool = require('es6-promise-pool');
const PromisePool = promisePool.PromisePool;
const secureCompare = require('secure-compare');

sgMail.setApiKey(functions.config().sendgrid_api.key);
sgMail.setSubstitutionWrappers('{{', '}}');

// cryptocurrency symbol Object
const cryptoCurrency = [
    {name: 'bitcoin', symbol: 'BTC-USD', bfxSymbol: 'tBTCUSD', currency: 'BTC'},
    {name: 'ethereum', symbol: 'ETH-USD', bfxSymbol: 'tETHUSD', currency: 'ETH'}
];

module.exports = {
    /**
    * Returns an access token using the Google Cloud metadata server.
    */
    getAccessToken(accessToken) {
        // If we have an accessToken in cache to re-use we pass it directly.
        if (accessToken) {
            return Promise.resolve(accessToken);
        }

        const options = {
            uri: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
            headers: { 'Metadata-Flavor': 'Google' },
            json: true
        };

        return rp(options).then(resp => resp.access_token);
    },

    // Save new notification message
    newNotification(message, id) {
        const notificationRef = db.collection(`notifications/user/${id}`);
        return notificationRef.add({
            message: message,
            read: false,
            timestamp: moment().valueOf()
        }).then(() => {
          console.log('new notification added');
          return;
        });
    },

    // save new crypto (bitcoin/ethereum) transaction to firestore
    newCryptoTransaction(amount, id, type, planName, planSymbol) {
        const tranRef = db.collection(`transactions/${id}/${planSymbol}`);
        return tranRef.add({
            amount: round(amount, 5),
            type: type,
            crypto: true,
            timestamp: moment().valueOf()
        }).then(() => console.log('new transaction added'));
    },

    // save new transaction to firestore
    newFiatTransaction(amount, id, type, planName, planSymbol) {
        const tranRef = db.collection(`transactions/${id}/${planSymbol}`);
        return tranRef.add({
            amount: round(amount, 5),
            type: type,
            crypto: true,
            timestamp: moment().valueOf()
        }).then(() => console.log('new transaction added'));
    },

    // save new transaction to admin section of firestore
    newAdminTransaction(query, planName, planSymbol) {
        const tranRef = db.collection(`admin/${planName}/${planSymbol}/transactions/id`);
        return tranRef.add(query).then(() => console.log('new transaction added'));
    },

    // update referral bonus to user
    referralBonusUpdate(bonus, id, planName, planSymbol) {
        if (!id) {
            return;
        }
        const interest = bonus * 0.1
        const message = `${round(interest, 5)} deposited to ${planSymbol} wallet`
        const walletRef = db.doc(`wallet/${id}/${planSymbol}/holding`);
        newNotification(message, id);
        newTransaction(interest, id, 'deposit', planName, planSymbol);
        // create new transaction
        return db.runTransaction(function (transaction) {
            // This code may get re-run multiple times if there are conflicts.
            return transaction.get(walletRef).then(function (walletDoc) {
                const walletValue = walletDoc.data();
                if (!walletDoc.exists) {
                    transaction.set(walletRef, {
                        referralBonus: round(interest, 5),
                        balance: round(interest, 5)
                    });
                } else if (walletDoc.exists && walletValue.balance >= 0 && walletValue.referralBonus >= 0) {
                    const newBalance = walletValue.balance + interest;
                    const newReferralBonus = walletValue.referralBonus + interest;
                    transaction.update(walletRef, {
                        balance: round(newBalance, 5),
                        referralBonus: round(newReferralBonus, 5)
                    });
                }
            });
        }).then(function () {
            console.log("referral Transaction successfully committed!");
        }).catch(function (error) {
            console.log("referral Transaction failed: ", error);
        });
    },

    // floating point value precision rounder
    round(value, precision) {
        let multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    },

    // send message from the sendgrid api
    async sendEmailMessage(msg) {
        return await sgMail.send(msg).then(() => {
            console.log("payment update mail sent successfully");
        });
    },

    async userCountUpdate(amount, id) {
      const countRef = db.doc(`count/${id}`);
      await countRef.get().then(countData => {
        countValue = countData.data();
        if (countValue) {
          const newAmount = countValue.amount + amount;
          return countRef.update({
            loanCount: countValue.loanCount + 1,
            total: countValue.total + 1,
            amount: newAmount
          }).then(() => console.info('count updated successfully'));
        } else {
          return countRef.set({
            loanCount: 1,
            total: 1,
            amount: newAmount
          });
        }
      })
    },

    // send new mail on new deposit
    async sendCryptoDepositMail(snap) {
        // validate user name in
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let userName = re.test(snap.name) ? ' ' : snap.name.split(' ');
        // userName.push(' ');
        const cryptoCurr = cryptoCurrency.find(data => data.name === snap.cryptoType);

         const msg = {
                to: snap.email,
                from: `Kobolet <no-reply@kobolet.com>`,
                subject: `New ${snap.cryptoType} Deposit`,
                templateId: 'd-743fd673f8fe438ba1131c6c49c2952e',
                dynamic_template_data: {
                    name: userName[1],
                    amount: snap.amount,
                    currency: cryptoCurr.currency,
                    crypto: snap.cryptoType,
                    url: `https://app.kobolet.com/wallet/${snap.cryptoType}`
                }
            };

        return await sgMail.send(msg);
    },

    // Pending crypto deposit mail handler
    async sendCryptoPendingDepositMail(snap) {
         // validate user name in
         const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let userName = re.test(snap.name) ? ' ' : snap.name.split(' ');
        // userName.push(' ');
        const cryptoCurr = cryptoCurrency.find(data => data.name === snap.cryptoType);

         const msg = {
                to: snap.email,
                from: `Kobolet <no-reply@kobolet.com>`,
                subject: `Pending ${snap.cryptoType} Deposit`,
                templateId: 'd-3260b0ff03d74438b761ace8389895e6',
                dynamic_template_data: {
                    name: userName[1],
                    amount: snap.amount,
                    currency: cryptoCurr.currency,
                    crypto: snap.cryptoType,
                    transUrl: snap.transUrl,
                    url: `https://app.kobolet.com/wallet/${snap.cryptoType}`
                }
            };

       return await sgMail.send(msg);
    },

    async sendFiatLoanDepositMail(snap) {
      const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let userName = re.test(snap.name) ? ' ' : snap.name.split(' ');
        // userName.push(' ');

         const msg = {
                to: snap.email,
                from: `Kobolet <no-reply@kobolet.com>`,
                subject: `Loan Payment`,
                templateId: 'd-d35e7e2a2b2e4e838b40f24f7763c593',
                dynamic_template_data: {
                    name: userName[1],
                    amount: snap.amount,
                    currency: snap.currency,
                    url: `https://app.kobolet.com/loans`
                }
            };

        return await sgMail.send(msg);
    },

    async sendNewLoanMail(snap) {
      const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        let userName = re.test(snap.name) ? ' ' : snap.name.split(' ');
        // userName.push(' ');
         const cryptoCurr = cryptoCurrency.find(data => data.name === snap.cryptoType);

         const msg = {
                to: snap.email,
                from: `Kobolet <no-reply@kobolet.com>`,
                subject: `Loan Payment`,
                templateId: 'd-f87ed8b139ca4547b68128d84f97c929',
                dynamic_template_data: {
                    name: userName[1],
                    loanAmount: snap.loanAmount,
                    loanInterest: snap.loanInterest,
                    bankName: snap.bankName,
                    currency: snap.currency,
                    cryptoCurrency: cryptoCurr.currency,
                    heldCrypto: snap.heldCrypto,
                    duration: `${snap.duration} months`,
                    url: `https://app.kobolet.com/loans`
                }
            };

         return await sgMail.send(msg);
    }
}
