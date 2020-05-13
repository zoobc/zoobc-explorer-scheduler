const cron = require('cron')
const saslprep = require('saslprep')
const mongoose = require('mongoose')

const config = require('./config')
const { msg } = require('./utils')
const { Nodes, Blocks, Accounts, Rollback, Transactions, AccountTransactions } = require('./controllers')

const nodes = new Nodes()
const blocks = new Blocks()
const accounts = new Accounts()
const rollback = new Rollback()
const transactions = new Transactions()
const accountTransactions = new AccountTransactions()

/** cron job */
const event = config.app.scheduleEvent
const cronApp = new cron.CronJob(`*/${event} * * * * *`, async () => {
  try {
    blocks.update((error, result) => {
      if (error) msg.red(error)
      else result ? msg.green(result.message) : msg.yellow('[Blocks] Nothing additional data')

      transactions.update((error, result) => {
        if (error) msg.red(error)
        else result ? msg.green(result.message) : msg.yellow('[Transactions] Nothing additional data')

        nodes.update((error, result) => {
          if (error) msg.red(error)
          else result ? msg.green(result.message) : msg.yellow('[Nodes] Nothing additional data')

          accounts.update((error, result) => {
            if (error) msg.red(error)
            else result ? msg.green(result.message) : msg.yellow('[Accounts] Nothing additional data')

            accountTransactions.update((error, result) => {
              if (error) msg.red(error)
              else result ? msg.green(result.message) : msg.yellow('[Account Transactions] Nothing additional data')

              rollback.checking((error, { success, info } = result) => {
                if (error) msg.red(error)
                else success ? msg.green(info) : msg.yellow(`${info ? `[Rollback - ${info}]` : `[Rollback]`} No data rollback`)
              })
            })
          })
        })
      })
    })
  } catch (error) {
    msg.red(`Scheduler error\n${error.message}`, '❌')
  }
})

/** init db */
function initApp() {
  const uris = `mongodb://${config.mongodb.host}:${config.mongodb.port}/${config.mongodb.database}`
  const options = {
    useCreateIndex: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    user: config.mongodb.username,
    pass: config.mongodb.password ? saslprep(config.mongodb.password) : null,
  }
  return mongoose.connect(uris, options, error => {
    if (error) {
      msg.red(`MongoDB connection error - retrying in 5 sec\n${error}`, '❌')
      setTimeout(initApp, 5000)
    } else {
      msg.green('MongoDB connection success')
      if (event > 0) {
        cronApp.start()
        msg.green(`Scheduler run every ${event} seconds`)
      }
    }
  })
}

/** starting initApp */
initApp()

/** stoping initApp */
process.on('SIGINT', () => {
  cronApp.stop()
  msg.green('Scheduler stop')
  mongoose.connection.close(() => {
    msg.green('MongoDB closing connection')
    process.exit(0)
  })
})
