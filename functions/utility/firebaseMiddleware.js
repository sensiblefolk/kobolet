const admin = require('firebase-admin');

const firebaseMiddleware = (req, res, next) => {
  admin.auth().getUser(req.query.id)
    .then(function (userRecord) {
      if (userRecord) {
        return next();
      }
    })
    .catch(function (error) {
      return res.status(500).send({
        message: "You don't have the necessary credentials to complete this request"
      });
    });
};

module.exports = firebaseMiddleware;
