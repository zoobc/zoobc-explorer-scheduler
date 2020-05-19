const BaseController = require('./BaseController')
const { store, util } = require('../utils')
const { AccountsService } = require('../services')

module.exports = class Accounts extends BaseController {
    constructor() {
        super(new AccountsService())
    }

    update(callback) {
        if (store.accountBalances.length < 1) return callback(null, { success: false, message: '[Accounts] No additional data' })

        const matchs = ['AccountAddress', 'BlockHeight']
        this.service.upserts(store.accountBalances, matchs, (err, result) => {
            if (err) return callback(`[Accounts] Upsert ${err}`, { success: false, message: null })
            if (result && result.result.ok !== 1) return callback('[Accounts] Upsert data failed', { success: false, message: null })
            return callback(null, { success: true, message: `[Accounts] Upsert ${store.accountBalances.length} data successfully` })
        })
    }

    getUniqueAccounts(arr, uniqueBy) {
        const results = arr
            .sort((a, b) => a.Timestamp > b.Timestamp)
            .map(s => s[uniqueBy])
            .map((e, i, f) => f.indexOf(e) === i && i)
            .filter(e => arr[e])
            .map(e => arr[e])
            .filter(f => f.RecipientAccountAddress)

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
                }
            })
        return accounts
    }
}