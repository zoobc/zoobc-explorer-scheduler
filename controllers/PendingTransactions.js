const BaseController = require('./BaseController')
const config = require('../config')
const { MultiSignature } = require('../protos')
const { queue, util, response } = require('../utils')
const { MultiSignatureService, TransactionsService, GeneralsService } = require('../services')

module.exports = class PendingTransaction extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.transactionsService = new TransactionsService()
    this.generalsService = new GeneralsService()

    /** queue */
    this.queue = queue.create('Queue Pending-Transactions')
    this.processing()
    this.queue.on('completed', (job, result) => {
      if (result && !util.isObjEmpty(result)) util.log(result)
    })
  }

  processing() {
    this.queue.process(async job => {
      const params = job.data
      /** send message telegram bot if avaiable */
      if (!params) return response.sendBotMessage('Pending Transaction', '[Pending Transaction] Processing - Invalid params')

      return new Promise(resolve => {
        job.progress(25)

        MultiSignature.GetPendingTransactions(params, (err, res) => {
          if (err)
            return resolve(
              /** send message telegram bot if avaiable */
              response.sendBotMessage(
                'Pending Transaction',
                `[Pending Transaction] Proto Get Pending Transaction Detail by Tx Hash - ${err}`,
                `- Params : <pre>${JSON.stringify(params)}</pre>`
              )
            )

          if (res && util.isObjEmpty(res.PendingTransaction))
            return resolve(response.setResult(false, `[Pending Transaction] No additional data`))

          job.progress(50)

          const payloads = [
            {
              TransactionHash: res.PendingTransaction.TransactionHash,
              Status: res.PendingTransaction.Status,
            },
          ]

          this.transactionsService.upserts(payloads, ['TransactionHash'], (err, res) => {
            if (err) return resolve(response.sendBotMessage('Pending Transaction', `[Pending Transaction] Upsert - ${err}`))
            if (res && res.result.ok !== 1) return resolve(response.setError(`[Pending Transaction] Upsert data failed`))

            job.progress(100)
            return resolve(response.setResult(true, `[Pending Transaction] Upsert ${payloads.length} data successfully`))
          })
        })
      })
    })
  }

  update(callback) {
    this.transactionsService.getTransactionSenderhByMultiSigChild((err, res) => {
      if (err)
        return callback(
          response.sendBotMessage(
            'Pending Transaction',
            `[Pending Transaction] Pending Transaction Service - Get Pending Transaction Hash ${err}`
          )
        )
      if (!res) return callback(response.setResult(false, '[Pending Transaction] No additional data'))

      let count = 0
      res.forEach(senderAddress => {
        count++
        const params = { SenderAddress: senderAddress.Sender }
        this.queue.add(params, config.queue.optJob)
      })

      return callback(response.setResult(true, `[Queue] ${count} Pending Transaction on processing`))
    })
  }
}
