require('dotenv').config();
const path = require('path');

module.exports = {
    app: {
      port: process.env.PORT,
    host: process.env.HOST || 'localhost',
    tokenSecret: process.env.TOKEN_SECRET || '884d31c5d4766dc624e1225888babeb7',
    tokenExpired: 12 /** hours */,
    scheduler: true,
    scheduleEvent: 30 /** seconds */,
    openSslKeyPath: process.env.SSL_KEYPATH || null,
    openSslCertPath: process.env.SSL_CERTPATH || null,
    pageLimit: 10,
    },
    db: {
        port: process.env.DB_PORT || 27017,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
    proto: {
        host: `${process.env.PROTO_HOST}:${process.env.PROTO_PORT}`,
        path: path.resolve(__dirname, '../schema'),
      },
}