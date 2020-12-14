const moment = require('moment')
const BaseController = require('./BaseController')
const { AccountLedger } = require('../protos')
const { util, response } = require('../utils')
const { AccountLedgerService, AccountsService, BlocksService, GeneralsService } = require('../services')

module.exports = class AccountLedgers extends BaseController {
  constructor() {
    super(new AccountLedgerService())
    this.blocksService = new BlocksService()
    this.accountService = new AccountsService()
    this.generalsService = new GeneralsService()
  }

  async update(callback) {
    this.blocksService.getLastTimestamp(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('AccountLedger', `[Account Ledgers] Blocks Service - Get Last Timestamp ${err}`))
      if (!res) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

      const lastCheck = await this.generalsService.getSetLastCheck()
      if (!lastCheck) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

      const params = { EventType: 'EventReward', TimestampStart: lastCheck.Timestamp, TimestampEnd: moment(res.Timestamp).unix() }
      AccountLedger.GetAccountLedgers(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'AccountLedger',
              `[Account Ledger] Proto Get Account Ledger - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.AccountLedgers.length < 1) return callback(response.setResult(false, `[Account Ledgers] No additional data`))

        /** update or insert account base on account address */
        const promises = res.AccountLedgers.map(item => {
          return new Promise(resolve => {
            this.accountService.getCurrentTotalRewardByAccountAddress(item.AccountAddress, async (err, res) => {
              if (err)
                return resolve({
                  err: `[Account Ledger] Account Service - Get Current Total Reward By AccountAddress ${err}`,
                  res: null,
                })

              const TotalRewards =
                res && res.TotalRewards ? parseInt(res.TotalRewards) + parseInt(item.BalanceChange) : parseInt(item.BalanceChange)
              const Balance = res && res.TotalRewards ? parseInt(res.Balance) : parseInt(item.BalanceChange)

              const payloadAccount = {
                Balance,
                TotalRewards,
                FirstActive: res ? res.FirstActive : new Date(moment.unix(item.Timestamp).valueOf()),
                LastActive: new Date(moment.unix(item.Timestamp).valueOf()),
                TransactionHeight: res ? res.TransactionHeight : null,
                TotalFeesPaid: res ? res.TotalFeesPaid : 0,
                TotalFeesPaidConversion: res ? res.TotalFeesPaidConversion : 0,
                AccountAddress: util.parseAddress(item.AccountAddress),
                BalanceConversion: util.zoobitConversion(Balance),
                SpendableBalance: res ? res.SpendableBalance : 0,
                SpendableBalanceConversion: res ? res.SpendableBalanceConversion : 0,
                BlockHeight: res ? res.BlockHeight : item.BlockHeight,
                PopRevenue: res ? res.PopRevenue : 0,
                TotalRewardsConversion: util.zoobitConversion(TotalRewards),
              }

              this.accountService.findAndUpdate(payloadAccount, (err, res) => {
                if (err) return resolve({ err: `[Account Ledger] Account Service - Find And Update ${err}`, res: null })
                return resolve({ err: null, res })
              })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Account Ledger] No additional data`))

        if (errors && errors.length > 0) return callback(response.sendBotMessage('AccountLedger', errors[0]))

        /** update or insert account ledger */
        const payloads = res.AccountLedgers.map(i => {
          return {
            ...i,
            AccountAddress: util.parseAddress(i.AccountAddress),
            Timestamp: new Date(moment.unix(i.Timestamp).valueOf()),
            BalanceChange: parseInt(i.BalanceChange),
            BalanceChangeConversion: util.zoobitConversion(parseInt(i.BalanceChange)),
          }
        })

        this.service.upserts(payloads, ['AccountAddress', 'BlockHeight', 'TransactionID'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return callback(response.sendBotMessage('AccountLedger', `[Account Ledger] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError('[Account Ledger] Upsert data failed'))

          return callback(response.setResult(true, `[Account Ledger] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
