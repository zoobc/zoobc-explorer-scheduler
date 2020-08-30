const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { MultiSignature } = require('../protos')
const { MultiSignatureService, TransactionsService, GeneralsService } = require('../services')

module.exports = class MultiSignatures extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
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
            if (err)
              return resolve({ err: `[Multi Signatures] Proto Get Pending Transaction By TransactionHash - ${err.message}`, res: null })
            if (res && util.isObjEmpty(res)) return resolve({ err: null, res: null })

            let Status = 'Pending'
            switch (res.PendingTransaction.Status) {
              case 'PendingTransactionPending':
                Status = 'Pending'
                break
              case 'PendingTransactionExecuted':
                Status = 'Executed'
                break
              case 'PendingTransactionNoOp':
                Status = 'Rejected'
                break
              case 'PendingTransactionExpired':
                Status = 'Expired'
                break
            }

            this.transactionsService.update({ BlockID: item.BlockID }, { Status }, (err, res) => {
              if (err) return resolve({ err: `[Multi Signatures] Transaction Service - Update ${err}`, res: null })
              return resolve({ err: null, res })
            })
          })
        })
      })

      const results = await Promise.all(promises)
      const errors = results.filter(f => f.err !== null).map(i => i.err)
      const updates = results.filter(f => f.res !== null).map(i => i.res)

      if (updates && updates.length < 1 && errors.length < 1)
        return callback(response.setResult(false, `[Multi Signatures] No additional data`))

      if (errors && errors.length > 0) return callback(response.sendBotMessage('MultiSignatures', errors[0]))

      return callback(response.setResult(true, `[Multi Signatures] Update ${updates.length} data successfully`))
    })
  }
}
