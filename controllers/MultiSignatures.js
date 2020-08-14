const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { MultiSignature } = require('../protos')
const { MultiSignatureService, TransactionsService, GeneralsService } = require('../services')

module.exports = class MultiSignatures extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.transactionsService = new TransactionsService()
    this.generalsService = new GeneralsService()
  }

  update(callback) {
    this.transactionsService.getTransactionMultisigChild(async (err, res) => {
      if (err)
        return callback(
          response.sendBotMessage('Multi Signatures', `[Multi Signatures] Transaction Service - Get Transaction Sender ${err}`)
        )
      if (!res) return callback(response.setResult(false, '[Multi Signatures] No additional data'))

      const promises = res.map(item => {
        return new Promise(resolve => {
          const params = { TransactionHashHex: Buffer.from(item.TransactionHash.toString('binary'), 'ascii').toString('hex') }
          MultiSignature.GetPendingTransactionDetailByTransactionHash(params, (err, res) => {
            if (err) return resolve({ err, res: null })
            if (res && util.isObjEmpty(res)) return resolve({ err: null, res: null })

            let status = 'Pending'
            switch (res.PendingTransaction.Status) {
              case 'PendingTransactionPending':
                status = 'Pending'
                break
              case 'PendingTransactionExecuted':
                status = 'Executed'
                break
              case 'PendingTransactionNoOp':
                status = 'Rejected'
                break
              case 'PendingTransactionExpired':
                status = 'Expired'
                break
            }

            this.transactionsService.update({ BlockID: item.BlockID }, { Status: status }, (err, res) => {
              if (err) return resolve({ err, res: null })
              return resolve({ err: null, res })
            })
          })
        })
      })

      const results = await Promise.all(promises)
      const updates = results.filter(f => f.res !== null)
      const errors = results.filter(f => f.err !== null)

      if (updates && updates.length < 1 && errors.length < 1)
        return callback(response.setResult(false, `[Multi Signatures] No additional data`))

      if (errors && errors.length > 0) {
        errors.forEach(err => {
          /** send message telegram bot if avaiable */
          return callback(response.sendBotMessage('MultiSignatures', `[Multi Signatures] Update - ${JSON.stringify(err)}`))
        })
      }

      return callback(response.setResult(true, `[Multi Signatures] Update ${updates.length} data successfully`))
    })
  }
}
