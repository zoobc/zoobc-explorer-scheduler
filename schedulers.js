const cron = require('cron')
const redis = require('redis')
const express = require('express')
const saslprep = require('saslprep')
const mongoose = require('mongoose')
const { UI } = require('bull-board')

const config = require('./config')
const { msg, util, response } = require('./utils')
const { Nodes, Blocks, Accounts, Rollback, ResetData, Transactions, MultiSignature } = require('./controllers')

const nodes = new Nodes()
const blocks = new Blocks()
const reset = new ResetData()
const accounts = new Accounts()
// const rollback = new Rollback()
const transactions = new Transactions()
const multiSig = new MultiSignature()

/** cron job */
const event = config.app.scheduleEvent
const cronApp = new cron.CronJob(`*/${event} * * * * *`, async () => {
  try {
    /** reset all data */
    const logResets = config.app.resetData === 'true' ? await reset.resetAllByHeight(0) : null
    if (logResets && logResets.length > 0) {
      logResets.forEach(log => util.log(log))
    }

    blocks.update(res => {
      util.log(res)

      transactions.update(res => {
        util.log(res)

        nodes.update(res => {
          util.log(res)

          accounts.update(res => {
            util.log(res)

            multiSig.update(res => {
              util.log(res)
            })
          })
        })
      })
    })
  } catch (error) {
    msg.red(`Scheduler error:\n${error}`, '❌')
  }
})

/** init app */
function initApp() {
  /** connecting mongo db */
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
      msg.red(response.sendBotMessage('Schedulers', `MongoDB connection error - retrying in 5 sec\n${error}`), '❌')
      setTimeout(initApp, 5000)
    } else {
      msg.green('MongoDB connection success')
      connectRedis()
    }
  })
}

/** connecting redis for dashboard queue */
function connectRedis() {
  let options = { port: config.redis.port, host: config.redis.host }
  if (config.redis.password) {
    options.password = config.redis.password
  }
  const redisClient = redis.createClient([options])
  redisClient
    .once('ready', () => {
      msg.green('Redis connection success')

      /** running scheduler */
      if (event > 0) {
        cronApp.start()
        msg.green(`Scheduler run every ${event} seconds`)
      }
    })
    .on('error', error => {
      msg.red(response.sendBotMessage('Schedulers', `Redis connection error - retrying in 5 sec\n${error}`), '❌')
      setTimeout(connectRedis, 5000)
    })
}

/** dashboard queue */
const port = config.app.port
const app = express().set('port', port)
const http = require('http').Server(app)
app.use('/admin/queues', UI)
http.listen(port, () => msg.green(`Dashboard queue is listening on port ${port}`))

/** starting app */
initApp()

/** stoping app */
process.on('SIGINT', () => {
  cronApp.stop()
  msg.green('Scheduler stop')
  mongoose.connection.close(() => {
    msg.green('MongoDB closing connection')
    process.exit(0)
  })
})
