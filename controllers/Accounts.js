const config = require('../config')
const BaseController = require('./BaseController')
const { AccountBalance } = require('../protos')
const { store, queue, util, response } = require('../utils')
const { AccountsService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Accounts extends BaseController {
  constructor() {
    super(new AccountsService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()

    /** queue */
    this.queue = queue.create('Queue Accounts')
    this.processing()
    this.queue.on('completed', (job, result) => {
      if (result && !util.isObjEmpty(result)) util.log(result)
    })
  }

  processing() {
    this.queue.process(async job => {
      const payloads = job.data
      /** send message telegram bot if avaiable */
      if (!payloads) return response.sendBotMessage('Accounts', '[Accounts] Synchronize - Invalid payloads')
      if (payloads && !payloads.params)
        return response.sendBotMessage(
          'Accounts',
          '[Accounts] Synchronize - Invalid params',
          `- Payloads : <pre>${JSON.stringify(payloads)}</pre>`
        )
      if (payloads && !payloads.accounts)
        return response.sendBotMessage(
          'Accounts',
          '[Accounts] Synchronize - Invalid account transactions',
          `- Payloads : <pre>${JSON.stringify(payloads)}</pre>`
        )

      /** separated variables payloads */
      const { params, accounts } = payloads

      return new Promise(resolve => {
        job.progress(25)
        AccountBalance.GetAccountBalance(params, (err, res) => {
          if (err)
            return resolve(
              /** send message telegram bot if avaiable */
              response.sendBotMessage(
                'Accounts',
                `[Accounts] Proto Get Account Balance - ${err}`,
                `- Params : <pre>${JSON.stringify(params)}</pre>`
              )
            )

          if (res && util.isObjEmpty(res.AccountBalance)) return resolve(response.setResult(false, `[Accounts] No additional data`))

          job.progress(50)
          const datas = [
            {
              AccountAddress: res.AccountBalance.AccountAddress,
              Balance: parseInt(res.AccountBalance.Balance),
              BalanceConversion: util.zoobitConversion(res.AccountBalance.Balance),
              SpendableBalance: parseInt(res.AccountBalance.SpendableBalance),
              SpendableBalanceConversion: util.zoobitConversion(res.AccountBalance.SpendableBalance),
              FirstActive: accounts.FirstActive,
              LastActive: accounts.Timestamp,
              TotalRewards: null, // TODO: onprogress
              TotalRewardsConversion: null, // TODO: onprogress
              TotalFeesPaid: parseInt(accounts.TotalFee),
              TotalFeesPaidConversion: util.zoobitConversion(accounts.TotalFee),
              BlockHeight: res.AccountBalance.BlockHeight,
              TransactionHeight: accounts.Height,
              PopRevenue: parseInt(res.AccountBalance.PopRevenue),
            },
          ]

          this.service.upserts(datas, ['AccountAddress'], (err, res) => {
            /** send message telegram bot if avaiable */
            if (err) return resolve(response.sendBotMessage('Accounts', `[Accounts] Upsert - ${err}`))
            if (res && res.result.ok !== 1) return resolve(response.setError(`[Accounts] Upsert data failed`))

            job.progress(100)
            return resolve(response.setResult(true, `[Accounts] Upsert ${datas.length} data successfully`))
          })
        })
      })
    })
  }

  update(callback) {
    /** get last height account (local) */
    this.service.getLastHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Accounts', `[Accounts] Accounts Service - Get Last Height ${err}`))

      /** set variable last height account */
      const lastAccountHeight = res ? parseInt(res.TransactionHeight + 1) : 0

      /** getting value last check height transaction */
      const lastCheckTransactionHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

      /** return message if last height account greather than last check height transaction  */
      if (lastAccountHeight > 0 && lastAccountHeight >= lastCheckTransactionHeight)
        return callback(response.setResult(false, '[Accounts] No additional data'))

      /** getting data account sender transactions */
      const senders = await this.transactionsService.asyncSendersByHeights(lastAccountHeight, lastCheckTransactionHeight)
      console.log('==senders', senders)

      if (senders.error && senders.data.length < 1)
        return callback(response.sendBotMessage('Accounts', `[Accounts] Transactions Service - Get Senders ${senders.error}`))

      /** getting data account recipient transactions */
      const recipients = await this.transactionsService.asyncRecipientsByHeights(lastAccountHeight, lastCheckTransactionHeight)
      console.log('==recipients', recipients)

      if (recipients.error && recipients.data.length < 1)
        return callback(response.sendBotMessage('Accounts', `[Accounts] Transactions Service - Get Recipients ${recipients.error}`))

      /** return message if havingn't senders or receipts  */
      if (senders.data.length < 1 && recipients.data.length < 1) return callback(response.setResult(false, '[Accounts] No additional data'))

      /** adding multi jobs to the queue by account sender transactions */
      senders.data &&
        senders.data.length > 0 &&
        senders.data.forEach(async item => {
          /** set first active base on data account (local), if data empty so that set by timestamp */
          const firstActive = await this.service.asyncFirstActiveAccount(item.Sender)

          /** set total fee base on data account (local) for calculate total fee paid */
          const totalFee = await this.service.asyncTotalFeeAccount(item.Sender)

          const payloads = {
            params: { AccountAddress: item.Sender },
            accounts: {
              AccountAddress: item.Sender,
              Height: item.Height,
              TotalFee: parseInt(totalFee) + parseInt(item.Fee),
              Timestamp: item.Timestamp,
              FirstActive: firstActive ? firstActive : item.Timestamp,
              SendMoney: item.SendMoney || null,
            },
          }
          this.queue.add(payloads, config.queue.optJob)
        })

      /** adding multi jobs to the queue by account receipt transactions */
      recipients.data &&
        recipients.data.length > 0 &&
        recipients.data.forEach(async item => {
          /** set first active base on data account (local), if data empty so that set by timestamp */
          const firstActive = await this.service.asyncFirstActiveAccount(item.Recipient)

          /** set total fee base on data account (local), its not for calculating. just for update using data before */
          const totalFee = await this.service.asyncTotalFeeAccount(item.Recipient)

          const payloads = {
            params: { AccountAddress: item.Recipient },
            accounts: {
              AccountAddress: item.Recipient,
              Height: item.Height,
              TotalFee: totalFee,
              Timestamp: item.Timestamp,
              FirstActive: firstActive ? firstActive : item.Timestamp,
              SendMoney: null,
            },
          }
          this.queue.add(payloads, config.queue.optJob)
        })

      const count = parseInt(senders.data.length) + parseInt(recipients.data.length)
      return callback(response.setResult(true, `[Queue] ${count} Accounts on processing`))
    })
  }
}
