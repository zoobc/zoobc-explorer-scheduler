const BaseService = require('./BaseService');
const { Accounts } = require('../../models');

module.exports = class AccountsService extends BaseService {
  constructor() {
    super(Accounts);
  }

  createdOnlyNew(params, payload, callback) {
    Accounts.findOne(params, (err, res) => {
      if (err) return callback(err, null);
      if (res) return callback(null, null);
      Accounts.create(payload, callback);
    });
  }

  checkIsNewAccounts(accounts, callback) {
    Accounts.find()
      .lean()
      .select()
      .where('AccountAddress')
      .in(accounts)
      .exec((err, results) => {
        if (err) {
          callback(err, null);
          return;
        }

        if (results && results.length > 0) {
          const dataAccounts = results.map(item => item.AccountAddress);
          const newAccounts = accounts.filter(item => !dataAccounts.includes(item));

          if (newAccounts && newAccounts.length > 0) {
            callback(null, newAccounts);
            return;
          }
          callback(null, null);
          return;
        }

        callback(null, null);
      });
  }
};
