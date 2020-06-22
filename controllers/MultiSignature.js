const BaseController = require('./BaseController')
const { store, queue } = require('../utils')
const { TransactionsService, MultiSignatureService, GeneralsService } = require('../services')

module.exports = class MultiSignature extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.transactionService = new TransactionsService()
    this.generalsService = new GeneralsService()
  }

  // static asyncMultiSigByHeight(service, heightStart, heightEnd) {
  //     return new Promise(resolve => {
  //         service.getMultiSigByHeight(heightStart, lastCheckTransactionHeight, (err, res) => {
  //             if (err) return resolve({ error: err, data: [] })
  //             if (!res) return resolve({ error: null, data: [] })
  //             return resolve({ error: null, data: res })
  //         })
  //     })
  // }

  update(callback) {
    this.service.getLatestHeight(async (err, res) => {
      if (err) return resolve(response.setError(`[Multi-Signature] Multi-Signature Service - Get Last Height ${err}`))

      /** get the height of the last multi-signature Height */
      const lastMultiSigHeight = res ? parseInt(res.TransactionHeight + 1) : 0

      if (lastMultiSigHeight > 0 && lastMultiSigHeight >= lastCheckTransactionHeight)
        return callback(response.setResult(false, '[Multi-Signature] No additional data'))

      const lastCheckTransactionHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

      // const multiSigdata = await MultiSignature.asyncMultiSigByHeight(this.TransactionsService, lastMultiSigHeight, lastCheckTransactionHeight)
      const multiSigdata = await this.transactionService.getMultiSigByHeight(
        this.TransactionsService,
        lastMultiSigHeight,
        lastCheckTransactionHeight
      )

      let count = 0
      console.log(multiSigdata)
    })
  }
}
