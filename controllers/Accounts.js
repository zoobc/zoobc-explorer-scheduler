const BaseController = require('./BaseController')
const { store, util } = require('../utils')
const { AccountsService } = require('../services')

module.exports = class Accounts extends BaseController {
    constructor() {
        super(new AccountsService())
    }

    update(callback) {
        if (store.accountTransactions.length < 1) return callback(null, null)

        const senders = this.getUniqueAccounts(store.accountTransactions, store.transactionFees, store.accBalances, 'SenderAccountAddress')
        const recipients = this.getUniqueAccounts(store.accountTransactions, store.transactionFees, store.accBalances, 'RecipientAccountAddress')
        const match = ['AccountAddress']

        const insertSenders =
            senders.length > 0 &&
            senders.map(i => {
                const aa = util.bufferStr(i.AccountAddress)
                if (typeof aa == 'string' && aa !== 'null') {
                    return new Promise((resolve, reject) => {
                        console.log('i ======>', i)
                            // const params = { AccountAddress: i.AccountAddress }
                        this.service.upserts(i, match, (err, result) => {
                            if (err) return reject(`[Accounts] Accounts Service - Created Only New ${err}`)
                            if (!result) return resolve(0)
                            return resolve(1)
                        })
                    })
                }
            })

        const insertRecipients =
            recipients.length > 0 &&
            recipients.map(i => {
                const aa = util.bufferStr(i.AccountAddress)
                if (typeof aa == 'string' && aa !== 'null') {
                    return new Promise((resolve, reject) => {
                        console.log('i ======>', i)
                            // const params = { AccountAddress: i.AccountAddress }
                        this.service.upserts(i, match, (err, result) => {
                            if (err) return reject(`[Accounts] Accounts Service - Created Only New ${err}`)
                            if (!result) return resolve(0)
                            return resolve(1)
                        })
                    })
                }
            })


        let accounts = insertSenders || []
        if (insertRecipients && insertRecipients.length > 0) {
            insertRecipients.forEach(i => accounts.push(i))
        }

        Promise.all(accounts)
            .then(results => {
                const count = results.reduce((prev, curr) => parseInt(prev) + parseInt(curr), 0)
                if (count < 1) return callback(null, null)
                return callback(null, `[Accounts] Insert ${count} data successfully`)
            })
            .catch(error => callback(error, null))
    }

    getUniqueAccounts(arr, arr1, arr2, uniqueBy) {

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
                    Balance: 0,
                    BalanceConversion: null,
                    SpendableBalance: 0,
                    SpendableBalanceConversion: null,
                    FirstActive: i.Timestamp,
                    LastActive: null,
                    TotalRewards: null,
                    TotalRewardsConversion: null,
                    TotalFeesPaid: 0,
                    TotalFeesPaidConversion: 0,
                    BlockHeight: i.BlockHeight,
                };
            });

        //SetBalance
        // console.log('accounts = ', accounts)
        if (arr2 !== null) {
            arr2.forEach(item => {
                    const index = accounts.findIndex(x => x.AccountAddress === item.AccountAddress)

                    // console.log('index', index)
                    // console.log('item = ', item)
                    // console.log('accoutFounded = ', accounts[index])

                    if (index !== -1) {
                        accounts[index].Balance = item.Balance
                        accounts[index].SpendableBalance = item.SpendableBalance
                    }
                })
                //    console.log("account after adding balance = ", accounts)
        }

        if (uniqueBy === 'SenderAccountAddress' && arr1 !== null) {
            arr1.forEach(item => {
                const index = accounts.findIndex(x => x.AccountAddress === item.AccountAddress)

                if (index !== -1) {
                    accounts[index].TotalFeesPaid = item.Fee
                    accounts[index].TotalFeesPaidConversion = util.zoobitConversion(item.Fee)
                }
            })
        }
        return accounts;
    }
}