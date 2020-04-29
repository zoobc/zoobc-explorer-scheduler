const BaseService = require('./BaseService');
const { Transactions } = require('../../models');

module.exports = class TransactionsService extends BaseService {
  constructor() {
    super(Transactions);
  }

  getLastHeight(callback) {
    Transactions.findOne()
      .select('Height')
      .sort('-Height')
      .exec(callback);
  }

  getAccountsByLastHeight(callback) {
    Transactions.findOne()
      .select('SenderAccountAddress RecipientAccountAddress')
      .sort('-Height')
      .exec((err, result) => {
        if (err) {
          callback(err, null);
          return;
        }

        if (result) {
          let accounts = [];
          if (result.SenderAccountAddress) {
            accounts.push(result.SenderAccountAddress);
          }
          if (result.RecipientAccountAddress) {
            accounts.push(result.RecipientAccountAddress);
          }
          callback(null, accounts);
          return;
        }

        callback(null, null);
      });
  }

  getAccountsFromTransactions(callback) {
    Transactions.aggregate(
      [
        {
          $group: {
            _id: null,
            SenderAccountAddress: { $addToSet: '$SenderAccountAddress' },
            RecipientAccountAddress: { $addToSet: '$RecipientAccountAddress' },
          },
        },
      ],
      (err, results) => {
        if (err) {
          callback(err, null);
          return;
        }

        if (results && results.length > 0) {
          const accounts = results[0].SenderAccountAddress.concat(
            results[0].RecipientAccountAddress.filter(item => {
              return results[0].SenderAccountAddress.indexOf(item) < 0;
            })
          );
          callback(null, accounts);
        } else {
          callback(null, null);
          return;
        }
      }
    );
  }
};
