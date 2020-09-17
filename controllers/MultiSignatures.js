const moment = require('moment')
const BaseController = require('./BaseController')
const { store, util, response } = require('../utils')
const { MultiSignature, Transaction } = require('../protos')
const { BlocksService, MultiSignatureService, TransactionsService, GeneralsService, PendingTransactionService } = require('../services')

module.exports = class MultiSignatures extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
    this.blocksService = new BlocksService()
    this.pendingTransactionService = new PendingTransactionService()
  }

  async update(callback) {
    this.blocksService.getLastHeight(async (error, result) => {
      if (error) return callback(response.sendBotMessage('MultiSignatures', `[Multi Signatures] Block Service - Get Last Height ${error}`))

      const storeValue = await this.generalsService.getValueByKey(store.keyLastCheck)
      const parsedLastCheck = storeValue ? JSON.parse(storeValue.res.Value) : null
      const fromHeight = parsedLastCheck
        ? parsedLastCheck.HeightBefore === 0
          ? parsedLastCheck.HeightBefore
          : parsedLastCheck.HeightBefore - 1
        : 0
      const toHeight = result.Height ? result.Height : 1

      if (fromHeight === toHeight) return callback(response.setResult(false, `[Multi Signature] No additional data`))

      const param = { FromHeight: fromHeight, ToHeight: toHeight }
      MultiSignature.GetPendingTransactionsByHeight(param, async (error, result) => {
        if (error)
          return callback(response.sendBotMessage('MultiSignatures', `[Multi Signatures] Proto Get Pending Transaction By Height ${error}`))

        if (result.PendingTransactions.length < 1) return callback(response.setResult(false, `[Multi Signature] No additional data`))

        this.pendingTransactionService.upserts(result.PendingTransactions, ['Transaction Hash', 'BlockHeight'], (err, res) => {
          if (error)
            return callback(response.sendBotMessage('MultiSignatures', `[Multi Signatures] Insert Pending Transactions error - ${error}`))
        })

        console.log('Pending Tx = ', result.PendingTransactions)

        const promises = result.PendingTransactions.filter(f => f.Latest === true).map(i => {
          return new Promise(resolve => {
            // if (i.BlockHeight === 29586) console.log(util.bufferStr(i.TransactionHash))
            console.log(util.bufferStr(i.TransactionHash))

            /** update header transaction */
            const ID = util.hashToInt64(i.TransactionHash)
            Transaction.GetTransaction({ ID }, (err, res) => {
              // console.log('parent = ', res)
              if (err)
                return resolve({
                  err: `[Multi Signatures] Proto Get Transaction ${err}`,
                  res: null,
                })

              if (res) {
                const payload = {
                  ...res,
                  TransactionID: res.ID,
                  TransactionTypeName: 'ZBC Transfer',
                  Status: 'Pending',
                  FeeConversion: res ? util.zoobitConversion(res.Fee) : 0,
                  Timestamp: new Date(moment.unix(res.Timestamp).valueOf()),
                  TransactionHashFormatted: util.getZBCAdress(res.TransactionHash, 'ZTX'),
                  SendMoney: res.sendMoneyTransactionBody.Amount
                    ? {
                        Amount: res.sendMoneyTransactionBody.Amount,
                        AmountConversion: res.sendMoneyTransactionBody ? util.zoobitConversion(res.sendMoneyTransactionBody.Amount) : null,
                      }
                    : null,
                }

                this.transactionsService.findAndUpdate(payload, async (err, res) => {
                  if (err)
                    return resolve({
                      err: `[MultiSignature] Transactions Service - Find And Update ${err}, res: null`,
                    })
                  return resolve({ err: null, res })
                })
              }
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Multi Signature] No additional data`))

        // if (errors && errors.length > 0) return callback(response.sendBotMessage('MultiSignature', errors[0]))

        return callback(response.setResult(true, `[Multi Signature] Upsert ${updates.length} data successfully, errors ${errors.length}`))
      })
    })
  }
}
