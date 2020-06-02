const BaseController = require('./BaseController')
const { store, util } = require('../utils')
const { AccountsService } = require('../services')

module.exports = class Accounts extends BaseController {
    constructor() {
        super(new AccountsService())
    }

    update(callback) {
        if (store.accountBalances.length < 1) return callback(null, { success: false, message: '[Accounts] No additional data' })

        const matchs = ['AccountAddress']
        const acc = new Promise((resolve, reject) => {
            this.getUniqueAccounts(store.accountBalances,
                store.transactionFees, (err, result) => {
                    if (err) return reject(err)
                    return resolve(result)
                })
        })
        acc.then(results => {
            this.service.upserts(results, matchs, (err, result) => {
                if (err) return callback(`[Accounts] Upsert ${err}`, { success: false, message: null })
                if (result && result.result.ok !== 1) return callback('[Accounts] Upsert data failed', { success: false, message: null })
                return callback(null, { success: true, message: `[Accounts] Upsert ${store.accountBalances.length} data successfully` })
            })
        })
    }

    getUniqueAccounts(arr, arr1, callback) {
        if (arr1 !== null) {
            arr1.forEach(item => {
                const index = arr.findIndex(x => x.AccountAddress === item.AccountAddress)

                if (index !== -1) {
                    arr[index].TotalFeesPaid = item.Fee
                    arr[index].TotalFeesPaidConversion = util.zoobitConversion(item.Fee)
                }
            })
        }
        return callback(null, arr)
    }
}