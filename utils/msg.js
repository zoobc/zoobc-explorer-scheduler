const chalk = require('chalk')
const moment = require('moment')

const clog = console.log
const cerror = console.error
const formatDate = 'DD MMM YYYY hh:mm:ss'

function message(emoji, log) {
  return emoji ? `${emoji} ${moment().format(formatDate)} - ${log}` : `${moment().format(formatDate)} - ${log}`
}

function green(log, emoji = '✅') {
  return clog(chalk.green(message(emoji, log)))
}

function red(log, emoji = '⛔️') {
  return cerror(chalk.red(message(emoji, log)))
}

function yellow(log, emoji = '🔆') {
  return clog(chalk.yellow(message(emoji, log)))
}

function blue(log, emoji = 'ℹ️ ') {
  return clog(chalk.blueBright(message(emoji, log)))
}

module.exports = msg = { red, green, yellow, blue }
