const bot = require('./bot')
const config = require('../config')

const setError = error => {
  return {
    error,
    subscribes: null,
    result: { success: false, message: null },
  }
}

const setResult = (success, message, subscribes = null) => {
  return {
    error: null,
    subscribes,
    result: { success, message },
  }
}

const setLog = log => {
  return log
}

const setBotMessage = (located, message, additionals = null) => {
  return `
🆘 <b><u>ZooBC Scheduler Alerting</u></b>
<b>Env :</b> ${config.app.env.toUpperCase()}
<b>Located :</b> ${located}
<b>Message :</b> ${message}
<b>Additionals :</b> ${additionals}
`
}

const sendBotMessage = (located, message, additionals = null) => {
  const msg = setBotMessage(located, message, additionals)
  bot.sendMessage(msg, 'HTML')
  return setError(message)
}

module.exports = response = { setError, setResult, setLog, setBotMessage, sendBotMessage }
