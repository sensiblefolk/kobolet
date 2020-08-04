const axios = require('axios').default;

const slackNotify = async (message) => {
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

module.exports = slackNotify;
