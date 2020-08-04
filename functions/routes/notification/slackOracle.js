const axios = require('axios').default;

const slackOracleNotify = async (message) => {
  try {
    const result = await axios.post('https://hooks.slack.com/services/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', {
      text: message
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const {
      data,
      status
    } = result

    if (status == 200) {
      console.log('slack notification sent successfully', JSON.stringify(data));
    }
  } catch (error) {
    console.error('failed sending slack notification', JSON.stringify(error));
  }
}

module.exports = slackOracleNotify;
