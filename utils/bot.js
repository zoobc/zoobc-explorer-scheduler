const TelegramBot = require('node-telegram-bot-api')
const config = require('../config')
const token = config.app.tokenTelegram

const teleBot = token ? new TelegramBot(token, { polling: true }) : null
teleBot &&
  teleBot.on('message', msg => {
    teleBot.sendMessage(msg.chat.id, '✨ Thank you for starting ZooBC Explorer Alert')
  })

/** parseMode : HTML, Markdown, MarkdownV2 */
const sendMessage = async (msg, parseMode = null) => {
  const options = parseMode ? { parse_mode: parseMode } : {}
  const chatId = config.app.chatId

  teleBot && chatId && teleBot.sendMessage(chatId, msg, options)
}

module.exports = bot = { sendMessage }
