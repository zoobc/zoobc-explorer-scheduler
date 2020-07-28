const BaseController = require('./BaseController')
const { AccountLedger, Block } = require('../protos')
const { util, response } = require('../utils')
const moment = require('moment')
const { AccountsService, BlocksService, GeneralsService } = require('../services')

module.exports = class AccountLedgers extends BaseController {
  constructor() {
    super(new AccountsService())
    this.blocksService = new BlocksService()
    this.generalsService = new GeneralsService()
  }

  async update(callback) {
    this.blocksService.getLastTimestamp(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Transactions', `[Transactions] Blocks Service - Get Last Timestamp ${err}`))
      if (!res) return callback(response.setResult(false, '[Transactions] No additional data'))

      const TimestampEnd = moment(res.Timestamp).unix()
      const lastCheck = await this.generalsService.getSetLastCheck()
      const params = { EventType: 'EventReward', TimestampStart: lastCheck.Timestamp, TimestampEnd: TimestampEnd }
      AccountLedger.GetAccountLedgers(params, (err, result) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Accounts',
              `[AccountLedger] Proto Get Account Ledger - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (result && result.AccountLedgers.length < 1) return resolve(response.setResult(false, `[AccountLedgers] No additional data`))

        result.AccountLedgers.forEach(item => {
          const payloads = {
            AccountAddress: item.AccountAddress,
            TotalRewards: item.BalanceChange,
            TotalRewardsConversion: util.zoobitConversion(item.BalanceChange),
          }

          this.service.getFindAndUpdate(payloads, (err, ress) => {
            if (err) return callback(response.sendBotMessage('AccountLedger', `[AccountLedgers] Upsert - ${err}`))

            return callback(response.setResult(true, `[AccountLedgers] Upsert ${payloads.length} data successfully`))
          })
        })
      })
    })
  }
}
