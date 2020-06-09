const TelegramBot = require('node-telegram-bot-api')

const store = require('./store')
const config = require('../config')
const token = config.app.tokenTelegram

const getChatId = () => {
  return store.chatId ? store.chatId : config.app.chatId
}

const teleBot = token ? new TelegramBot(token, { polling: true }) : null
teleBot &&
  teleBot.on('message', msg => {
    store.chatId = msg.chat.id
    teleBot.sendMessage(getChatId(), '✨ Thank you for starting ZooBC Explorer Alert')
  })

/** parseMode : HTML, Markdown, MarkdownV2 */
const sendMessage = async (msg, parseMode = null) => {
  const options = parseMode ? { parse_mode: parseMode } : {}
  const chatId = getChatId()
  teleBot && chatId && teleBot.sendMessage(chatId, msg, options)
}

module.exports = bot = { sendMessage }
