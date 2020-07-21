const _ = require('lodash')
const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { AccountBalance } = require('../protos')
const { AccountsService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Accounts extends BaseController {
  constructor() {
    super(new AccountsService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
  }

  update(callback) {
    /** get last height account (local) */
    this.service.getLastHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Accounts', `[Accounts] Accounts Service - Get Last Height ${err}`))

      /** set variable last height account */
      const lastAccountHeight = res && res.TransactionHeight ? parseInt(res.TransactionHeight + 1) : 0

      /** getting value last check */
      const lastCheck = await this.generalsService.getSetLastCheck()

      /** return message if last height account greather than last check height transaction  */
      if (lastAccountHeight > 0 && lastAccountHeight >= lastCheck.Height)
        return callback(response.setResult(false, '[Accounts] No additional data'))

      /** get all account address from transactions by heights */
      const account = await this.transactionsService.asyncAccountAddressByHeights(lastAccountHeight, lastCheck.Height)
      if (account.error)
        return callback(response.sendBotMessage('Accounts', `[Accounts] Transactions Service - Get Account Address ${account.error}`))

      /** return message if nothing */
      if (account.data.length < 1) return callback(response.setResult(false, '[Accounts] No additional data'))

      /** get account balances core */
      const params = { AccountAddresses: account.data.map(i => i.Account) }
      AccountBalance.GetAccountBalances(params, (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Accounts',
              `[Accounts] Proto Get Account Balances - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.AccountBalances.length < 1) return resolve(response.setResult(false, `[Accounts] No additional data`))

        /** mapping data transactions and account balances */
        const payloads = res.AccountBalances.map(i => {
          const accounts = account.data.filter(o => o.Account === i.AccountAddress)

          /** get first active */
          const FirstActive = _.sortBy(accounts, ['Height'])[0].Timestamp

          /** get last active */
          const LastActive = _.sortBy(accounts, ['Height'])[accounts.length - 1].Timestamp

          /** get last transaction height */
          const TransactionHeight = _.sortBy(accounts, ['Height'])[accounts.length - 1].Height

          /** get fee paid recipient */
          const feeRecipients = accounts.filter(o => o.Type === 'Recipient')
          let TotalFeesPaid = feeRecipients.length > 0 ? _.sortBy(feeRecipients, ['Height'])[feeRecipients.length - 1].Fee : 0

          /** summary fee if sender */
          const feeSenders = accounts.filter(o => o.Type === 'Sender')
          if (feeSenders.length > 0) {
            TotalFeesPaid = _.sumBy(feeSenders, 'Fee')
          }

          return {
            FirstActive,
            LastActive,
            TransactionHeight,
            TotalFeesPaid: parseInt(TotalFeesPaid),
            TotalFeesPaidConversion: util.zoobitConversion(parseInt(TotalFeesPaid)),
            AccountAddress: i.AccountAddress,
            Balance: parseInt(i.Balance),
            BalanceConversion: util.zoobitConversion(parseInt(i.Balance)),
            SpendableBalance: parseInt(i.SpendableBalance),
            SpendableBalanceConversion: util.zoobitConversion(parseInt(i.SpendableBalance)),
            BlockHeight: i.BlockHeight,
            PopRevenue: parseInt(i.PopRevenue),
            TotalRewards: null, // TODO: onprogress
            TotalRewardsConversion: null, // TODO: onprogress
          }
        })

        this.service.upserts(payloads, ['AccountAddress'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return callback(response.sendBotMessage('Accounts', `[Accounts] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError(`[Accounts] Upsert data failed`))

          return callback(response.setResult(true, `[Accounts] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
