require('dotenv').config()
const path = require('path')

module.exports = {
  app: {
    limitData: 200,
    port: process.env.PORT || 3033,
    scheduleEvent: 20 /** seconds */,
    chatId: process.env.CHAT_ID || null,
    resetData: process.env.RESET_DATA || false,
    env: process.env.NODE_ENV || 'development',
    ipStackKey: process.env.IPSTACK_KEY || null,
    tokenTelegram: process.env.TOKEN_TELEGRAM || null,
    tokenSecret: process.env.TOKEN_SECRET || '884d31c5d4766dc624e1225888babeb7',
  },
  queue: {
    optQueue: {
      prefix: 'zoobc',
      limiter: {
        max: 200,
        duration: 1000 /** miliseconds */,
        bounceBack: false,
      },
    },
    optJob: {
      delay: 500 /** miliseconds */,
      attempts: 2,
      removeOnComplete: true,
    },
  },
  mongodb: {
    port: process.env.DB_PORT || 27017,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  redis: {
    port: process.env.RD_PORT || 6379,
    host: process.env.RD_HOST || 'localhost',
    password: process.env.RD_PASSWORD || null,
  },
  proto: {
    path: path.resolve(__dirname, './schema'),
    host: `${process.env.PROTO_HOST}:${process.env.PROTO_PORT}`,
  },
  graphql: {
    host: process.env.GRAPHQL_HOST || 'http://localhost:6969/zoobc/api/v1/graphql',
    consumerId: process.env.GRAPHQL_CLIENT_ID || '1234567890',
    consumerSecret: process.env.GRAPHQL_CLIENT_SECRET || 'client-secret-key',
  },
}
