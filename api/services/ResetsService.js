const BaseService = require('./BaseService');
const { Accounts, Blocks, Transactions, Nodes, AccountTransactions } = require('../../models');

module.exports = class ResetsService extends BaseService {
  resetAll(callback) {
    try {
      Blocks.deleteMany(err => {
        if (err) return callback(err.message, null);

        Transactions.deleteMany(err => {
          if (err) return callback(err.message, null);

          Nodes.deleteMany(err => {
            if (err) return callback(err.message, null);

            Accounts.deleteMany(err => {
              if (err) return callback(err.message, null);

              AccountTransactions.deleteMany(err => {
                if (err) return callback(err.message, null);

                return callback(null, 'Success reset all docs');
              });
            });
          });
        });
      });
    } catch (error) {
      return callback(error.message, null);
    }
  }
};
