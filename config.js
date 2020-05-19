require('dotenv').config()
const path = require('path')

module.exports = {
  app: {
    limitData: 200,
    scheduleEvent: 30 /** seconds */,
    resetData: process.env.RESET_DATA || false,
    tokenSecret: process.env.TOKEN_SECRET || '884d31c5d4766dc624e1225888babeb7',
  },
  mongodb: {
    port: process.env.DB_PORT || 27017,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  proto: {
    path: path.resolve(__dirname, './schema'),
    host: `${process.env.PROTO_HOST}:${process.env.PROTO_PORT}`,
  },
}
