const cron = require('cron')
const saslprep = require('saslprep')
const mongoose = require('mongoose')

const config = require('./config')
const { msg } = require('./utils')
const { Nodes, Blocks, Accounts, Rollback, ResetData, Transactions } = require('./controllers')

const nodes = new Nodes()
const blocks = new Blocks()
const reset = new ResetData()
const accounts = new Accounts()
const rollback = new Rollback()
const transactions = new Transactions()

const resetter = false

/** cron job */
const event = config.app.scheduleEvent
const cronApp = new cron.CronJob(`*/${event} * * * * *`, async () => {
  try {
    /** WARNING: DON'T USING RESET DATA FOR PRODUCTIONS */
    if (resetter) {
      reset.resetByHeight(14146, (error, { success, message } = result) => {
        if (error) msg.red(error)
        else success ? msg.green(message) : msg.yellow(message)
      })
    }

    blocks.update((error, { success, message } = result) => {
      if (error) msg.red(error)
      else success ? msg.green(message) : msg.yellow(message)

      transactions.update((error, { success, message } = result) => {
        if (error) msg.red(error)
        else success ? msg.green(message) : msg.yellow(message)

        nodes.update((error, { success, message } = result) => {
          if (error) msg.red(error)
          else success ? msg.green(message) : msg.yellow(message)

          accounts.update((error, { success, message } = result) => {
            if (error) msg.red(error)
            else success ? msg.green(message) : msg.yellow(message)

            rollback.checking((error, { success, message } = result) => {
              if (error) msg.red(error)
              else success ? msg.green(message) : msg.yellow(message)
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
