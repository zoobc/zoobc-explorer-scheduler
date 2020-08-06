const cron = require('cron')
const redis = require('redis')
const moment = require('moment')
const express = require('express')
const fetch = require('node-fetch')
const saslprep = require('saslprep')
const mongoose = require('mongoose')
const { UI } = require('bull-board')

const config = require('./config')
const { msg, util, response } = require('./utils')
const { Nodes, Blocks, Accounts, AccountLedgers, ResetData, Transactions, PendingTransaction } = require('./controllers')

const nodes = new Nodes()
const blocks = new Blocks()
const reset = new ResetData()
const accounts = new Accounts()
const transactions = new Transactions()
const pendingTx = new PendingTransaction()
const accountLedger = new AccountLedgers()

/** cron job */
const event = config.app.scheduleEvent
const cronApp = new cron.CronJob(`*/${event} * * * * *`, async () => {
  try {
    /** reset all data */
    const logResets = config.app.resetData === 'true' ? await reset.resetAllByHeight(0) : null
    if (logResets && logResets.length > 0) {
      logResets.forEach(log => util.log(log))
    }

    blocks.update(async res => {
      util.log(res)

      if (res && res.subscribes) {
        const result = await graphqlMutation('blocks', res.subscribes)
        util.logMutation(`[GraphQL Mutation] ${result}`)
      }

      transactions.update(async res => {
        util.log(res)

        if (res && res.subscribes) {
          const result = await graphqlMutation('transactions', res.subscribes)
          util.logMutation(`[GraphQL Mutation] ${result}`)
        }

        nodes.update(res => {
          util.log(res)

          accounts.update(res => {
            util.log(res)

            pendingTx.update(res => {
              util.log(res)

              accountLedger.update(res => {
                util.log(res)
              })
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

const graphqlMutation = async (type, input) => {
  const timestamp = moment.utc().unix() - moment.utc('1970-01-01 00:00:00').unix()
  const consumerId = config.graphql.consumerId
  const consumerSecret = config.graphql.consumerSecret
  const signature = util.hmacEncrypt(`${consumerId}&${timestamp}`, consumerSecret)
  const headers = {
    'x-timestamp': timestamp,
    'x-cons-id': consumerId,
    'x-signature': signature,
    'content-type': 'application/json',
  }

  const queryfyInput = util.queryfy(input)
  const query = JSON.stringify({
    query: type === 'blocks' ? `mutation { blocks(blocks: ${queryfyInput}) }` : `mutation {transactions(transactions: ${queryfyInput})}`,
  })

  try {
    const response = await fetch(config.graphql.host, {
      headers,
      method: 'POST',
      body: query,
    })
    const responseJson = await response.json()

    return type === 'blocks' ? responseJson.data.blocks : responseJson.data.transactions
  } catch (error) {
    return `An error occurred while post to graphql endpoint, please try again or report it!\n${error}`
  }
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
