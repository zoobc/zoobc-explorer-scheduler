const chalk = require('chalk');
const clog = console.log;
const cerror = console.error;

var msg = {
  red,
  green,
  yellow,
};

function message(emoji, log) {
  return emoji ? `${emoji} ${log}` : log;
}

function green(emoji, log) {
  return clog(chalk.green(message(emoji, log)));
}

function red(emoji, log) {
  return cerror(chalk.red(message(emoji, log)));
}

function yellow(emoji, log) {
  return clog(chalk.yellow(message(emoji, log)));
}

module.exports = msg;
