const saslprep = require('saslprep');
const mongoose = require('mongoose');

const config = require('../config/config');
const { msg } = require('../utils');

function connectMongoose() {
  const uris = `mongodb://${config.db.host}:${config.db.port}/${config.db.database}`;
  const options = {
    user: config.db.username,
    pass: saslprep(config.db.password),
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  };
  return mongoose.connect(uris, options, error => {
    if (error) {
      msg.red('❌', `MongoDB connection error - retrying in 5 sec\n${error}`);
      setTimeout(connectMongoose, 5000);
    } else {
      msg.green('🚀', 'MongoDB connection success');
    }
  });
}

module.exports = () => {
  connectMongoose();
};
