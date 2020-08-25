const moment = require('moment')
const BaseController = require('./BaseController')
const { AccountLedger } = require('../protos')
const { util, response } = require('../utils')
const { AccountLedgerService, AccountsService, BlocksService, GeneralsService } = require('../services')

module.exports = class AccountLedgers extends BaseController {
  constructor() {
    super(new AccountLedgerService())
    this.accountService = new AccountsService()
    this.blocksService = new BlocksService()
    this.generalsService = new GeneralsService()
  }

  async update(callback) {
    this.blocksService.getLastTimestamp(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('AccountLedger', `[Account Ledgers] Blocks Service - Get Last Timestamp ${err}`))
      if (!res) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

      const TimestampEnd = moment(res.Timestamp).unix()

      const lastCheck = await this.generalsService.getSetLastCheck()
      if (!lastCheck) return callback(response.setResult(false, '[Account Ledgers] No additional data'))

      const params = {
        EventType: 'EventReward',
        TimestampStart: lastCheck.Timestamp,
        TimestampEnd: TimestampEnd,
      }
      AccountLedger.GetAccountLedgers(params, async (err, result) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'AccountLedger',
              `[AccountLedger] Proto Get Account Ledger - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (result && result.AccountLedgers.length < 1) return callback(response.setResult(false, `[Account Ledgers] No additional data`))

        const promises = result.AccountLedgers.map(item => {
          const AccAdd = item.AccountAddress
          return new Promise(resolve => {
            this.accountService.getCurrentTotalRewardByAccountAddress(AccAdd, async (err, result) => {
              let RewardBefore = 0

              const payload = {
                FirstActive: item.Timestamp,
                LastActive: item.Timestamp,
                TransactionHeight: null,
                TotalFeesPaid: 0,
                TotalFeesPaidConversion: util.zoobitConversion(0),
                AccountAddress: item.AccountAddress,
                Balance: parseInt(item.BalanceChange),
                BalanceConversion: util.zoobitConversion(parseInt(item.Balance)),
                SpendableBalance: 0,
                SpendableBalanceConversion: util.zoobitConversion(0),
                BlockHeight: item.BlockHeight,
                PopRevenue: 0,
                TotalRewards: parseInt(item.BalanceChange),
                TotalRewardsConversion: util.zoobitConversion(parseInt(item.BalanceChange)),
              }

              if (result) {
                if (result.TotalRewards) {
                  payload.TransactionHeight = result.TransactionHeight
                  payload.TotalFeesPaid = result.TotalFeesPaid
                  payload.TotalFeesPaidConversion = result.TotalFeesPaidConversion
                  payload.Balance = result.Balance
                  payload.BalanceConversion = result.BalanceConversion
                  payload.SpendableBalance = result.SpendableBalance
                  payload.SpendableBalanceConversion = result.SpendableBalanceConversion
                  payload.PopRevenue = result.PopRevenue
                  payload.TotalRewards = parseInt(result.TotalRewards) + parseInt(item.BalanceChange)
                  payload.TotalRewardsConversion = util.zoobitConversion(result.TotalRewards + item.BalanceChange)
                }
              }

              this.accountService.findAndUpdate(payload, (err, res) => {
                if (err) return resolve({ err, res: null })
                return resolve({ err: null, res })
              })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null)
        const updates = results.filter(f => f.res !== null)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Account Ledgers] No additional data`))

        if (errors && errors.length > 0) {
          errors.forEach(err => {
            /** send message telegram bot if avaiable */
            return callback(response.sendBotMessage('AccountLedger', `[Account Ledgers] Upsert - ${JSON.stringify(err)}`))
          })
        }

        this.service.upserts(result.AccountLedgers, ['AccountAddress', 'BlockHeight', 'TransactionID'], (erro, results) => {
          if (erro) {
            return callback(response.sendBotMessage('AccountLedger', `[Account Ledgers] Upsert - ${JSON.stringify(erro)}`))
          }

          return callback(response.setResult(true, `[Account Ledgers] Upsert ${updates.length} data successfully`))
        })
      })
    })
  }
}
