const BaseController = require('./BaseController')
const { store, queue } = require('../utils')
const { TransactionsService, MultiSignatureService, GeneralsService } = require('../services')

module.exports = class MultiSignature extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.transactionService = new TransactionsService()
    this.generalsService = new GeneralsService()
  }

  static asyncMultiSigByHeight(service, heightStart, heightEnd) {
    return new Promise(resolve => {
      this.transactionService.getMultiSigByHeight(heightStart, lastCheckTransactionHeight, (err, res) => {
        if (err) return resolve({ error: err, data: [] })
        if (!res) return resolve({ error: null, data: [] })
        return resolve({ error: null, data: res })
      })
    })
  }

  update(callback) {
    this.service.getLatestHeight(async (err, res) => {
      if (err) return resolve(response.setError(`[Multi-Signature] Multi-Signature Service - Get Last Height ${err}`))

      const lastMultiSigHeight = res ? parseInt(res.TransactionHeight + 1) : 0

      if (lastMultiSigHeight > 0 && lastMultiSigHeight >= lastCheckTransactionHeight)
        return callback(response.setResult(false, '[Multi-Signature] No additional data'))

      const lastCheckTransactionHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

      const multiSigdata = await MultiSignature.asyncMultiSigByHeight(this.service, lastMultiSigHeight, lastCheckTransactionHeight)

      let count = 0
      console.log(multiSigdata)
      multiSigdata.data.forEach(item => {
        console.log(item)
        // const payloads = {
        //     params: item.
        // }
      })

      /** return message if last height account greather than last check height transaction  */

      // this.service.insertMany(InsertMultiSig, (err, result) => {
      //     if (err) return callback(`[Multi-Signature] Upsert ${err}`, { success: false, message: null })
      //     if (result && result.result.ok !== 1) return callback('[Multi-Signature] Upsert data failed', { success: false, message: null })
      //     return callback(null, { success: true, message: `[Multi-Signature] Upsert ${store.MultiSignature.length} data successfully` })
      // })

      // /** initiating the queue */
      // queue.init('Queue Nodes')

      // /** adding  multi jobs to the queue with with params nodes public key */
      // let count = 0
      // res.forEach(nodePublicKey => {
      //     count++
      //     const params = { NodePublicKey: nodePublicKey }
      //     queue.addJob(params)
      // })

      // /** processing job the queue */
      // queue.processJob(Nodes.synchronize, this.service)

      // return callback(response.setResult(true, `[Queue] ${count} Nodes on processing`))
    })
  }
}
