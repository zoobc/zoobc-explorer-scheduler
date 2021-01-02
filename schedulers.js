const cron = require('cron')
const redis = require('redis')
const moment = require('moment')
const express = require('express')
const fetch = require('node-fetch')
const saslprep = require('saslprep')
const mongoose = require('mongoose')

const config = require('./config')
const { msg, util, response } = require('./utils')
const {
  Nodes,
  Blocks,
  Accounts,
  ResetData,
  NodeAddress,
  Transactions,
  NodeStatuses,
  AccountLedgers,
  ParticipationScores,
} = require('./controllers')

const nodes = new Nodes()
const blocks = new Blocks()
const reset = new ResetData()
const accounts = new Accounts()
const nodeAddress = new NodeAddress()
const transactions = new Transactions()
const nodeStatuses = new NodeStatuses()
const accountLedger = new AccountLedgers()
const participationScores = new ParticipationScores()

/** cron job */
const event = config.app.scheduleEvent
const cronApp = new cron.CronJob(`*/${event} * * * * *`, async () => {
  try {
    blocks.update(async res => {
      util.log(res)

      if (res && res.result && res.result.success && res.result.success === true) {
        const result = await graphqlMutation('blocks')
        util.logMutation(`[GraphQL Mutation] ${result}`)
      }

      transactions.update(async res => {
        util.log(res)

        if (res && res.result && res.result.success && res.result.success === true) {
          const result = await graphqlMutation('transactions')
          util.logMutation(`[GraphQL Mutation] ${result}`)
        }

        nodes.update(res => {
          util.log(res)

          accounts.update(res => {
            util.log(res)

            accountLedger.update(res => {
              util.log(res)

              nodeAddress.update(res => {
                util.log(res)

                participationScores.update(res => {
                  util.log(res)

                  nodeStatuses.update(async res => {
                    util.log(res)
                  })
                })
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

/** reset all data */
async function resetData(height = 0) {
  const logResets = config.app.resetData === 'true' ? await reset.resetAllByHeight(height) : null
  if (logResets && logResets.length > 0) {
    logResets.forEach(log => util.log(log))
  }
}

/** init app */
function initApp() {
  msg.green(`GRPC host connection ${config.proto.host}`)

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
      msg.red(`MongoDB connection error - retrying in 5 sec\n${error}`, '❌')
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
        //last check height 16500
        resetData()
        cronApp.start()
        msg.green(`Scheduler run every ${event} seconds`)
      }
    })
    .on('error', error => {
      msg.red(response.sendBotMessage('Schedulers', `Redis connection error - retrying in 5 sec\n${error}`), '❌')
      setTimeout(connectRedis, 5000)
    })
}

const graphqlMutation = async type => {
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

  const query = JSON.stringify({
    query: type === 'blocks' ? `mutation { blocks }` : `mutation { transactions }`,
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
    return error
  }
}

/** starting server */
const port = config.app.port
const app = express().set('port', port)
const http = require('http').Server(app)
http.listen(port, () => msg.green(`Scheduler listening on port ${port}`))

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
