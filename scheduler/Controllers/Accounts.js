/* eslint-disable indent */
const store = require('./Store');
const BaseController = require('./BaseController');
const { Converter } = require('../../utils');
const { AccountsService } = require('../../api/services');

module.exports = class Accounts extends BaseController {
  constructor() {
    super(new AccountsService());
  }

  update(callback) {
    if (store.accountTransactions.length < 1) return callback(null, null);
    const senders = getUniqueAccounts(store.accountTransactions, 'SenderAccountAddress');
    const recipients = getUniqueAccounts(store.accountTransactions, 'RecipientAccountAddress');

    const insertSenders =
      senders.length > 0 &&
      senders.map(i => {
        const aa = Converter.bufferStr(i.AccountAddress);
        if (typeof aa == 'string' && aa !== 'null') {
          return new Promise((resolve, reject) => {
            const params = { AccountAddress: i.AccountAddress };
            this.service.createdOnlyNew(params, i, (err, result) => {
              if (err) return reject(`[Accounts] Accounts Service - Created Only New ${err}`);
              if (!result) return resolve(0);
              return resolve(1);
            });
          });
        }
      });

    const insertRecipients =
      recipients.length > 0 &&
      recipients.map(i => {
        const aa = Converter.bufferStr(i.AccountAddress);
        if (typeof aa == 'string' && aa !== 'null') {
          return new Promise((resolve, reject) => {
            const params = { AccountAddress: i.AccountAddress };
            this.service.createdOnlyNew(params, i, (err, result) => {
              if (err) return reject(`[Accounts] Accounts Service - Created Only New ${err}`);
              if (!result) return resolve(0);
              return resolve(1);
            });
          });
        }
      });

    let accounts = insertSenders || [];
    if (insertRecipients && insertRecipients.length > 0) {
      insertRecipients.forEach(i => accounts.push(i));
    }

    Promise.all(accounts)
      .then(results => {
        const count = results.reduce((prev, curr) => parseInt(prev) + parseInt(curr), 0);
        if (count < 1) return callback(null, null);
        return callback(null, `[Accounts] Insert ${count} data successfully`);
      })
      .catch(error => callback(error, null));

    function getUniqueAccounts(arr, uniqueBy) {
      const results = arr
        .sort((a, b) => a.Timestamp > b.Timestamp)
        .map(s => s[uniqueBy])
        .map((e, i, f) => f.indexOf(e) === i && i)
        .filter(e => arr[e])
        .map(e => arr[e])
        .filter(f => f.RecipientAccountAddress);

      const accounts = results
        .filter(f => f[uniqueBy])
        .map(i => {
          return {
            AccountAddress: i[uniqueBy],
            Balance: null,
            BalanceConversion: null,
            SpendableBalance: null,
            SpendableBalanceConversion: null,
            FirstActive: i.Timestamp,
            LastActive: null,
            TotalRewards: null,
            TotalRewardsConversion: null,
            TotalFeesPaid: null,
            TotalFeesPaidConversion: null,
            BlockHeight: i.BlockHeight,
          };
        });

      return accounts;
    }
  }
};
