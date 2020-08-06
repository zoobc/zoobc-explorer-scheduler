const moment = require('moment')
const BaseController = require('./BaseController')
const { AccountLedger } = require('../protos')
const { util, response } = require('../utils')
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
      AccountLedger.GetAccountLedgers(params, async (err, result) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Accounts',
              `[AccountLedger] Proto Get Account Ledger - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (result && result.AccountLedgers.length < 1) return callback(response.setResult(false, `[AccountLedgers] No additional data`))

        const promises = result.AccountLedgers.map(item => {
          return new Promise(resolve => {
            const payload = {
              AccountAddress: item.AccountAddress,
              TotalRewards: item.BalanceChange,
              TotalRewardsConversion: util.zoobitConversion(item.BalanceChange),
            }

            this.service.findAndUpdate(payload, (err, res) => {
              if (err) return resolve({ err, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null)

        if (errors && errors.length > 0) {
          errors.forEach(err => {
            /** send message telegram bot if avaiable */
            return callback(response.sendBotMessage('AccountLedger', `[AccountLedgers] Upsert - ${JSON.stringify(err)}`))
          })
        }

        return callback(response.setResult(true, `[AccountLedgers] Upsert ${results.length} data successfully`))
      })
    })
  }
}
