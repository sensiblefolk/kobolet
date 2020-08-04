// transfer webhook
const depositRoute = (app) => {
  app.post('rave/deposit', (req, res) => {
    const hash = req.headers["verif-hash"];
    if (!hash) {
      return res.sendStatus(200);
    }

    const secret_hash = functions.config().raveprod.webhooksecret;
    if (hash !== secret_hash) {
      return res.sendStatus(200);
    }
    const data = JSON.parse(res.body);
    const meta = data.meta[0];
    console.log('metadata', meta);
    console.log('data', data);

    if (meta.type === 'loan') {
      /* begin send email query */
      const query = {
        name: data.customer.fullName,
        email: data.customer.email,
        currency: data.currency
      }
      // utilityFunction.sendFiatLoanDepositMail(query);
      res.sendStatus(200);
      /* end send email query */
    } else {
      res.sendStatus(200);
    }
  });
}

module.exports = depositRoute;
