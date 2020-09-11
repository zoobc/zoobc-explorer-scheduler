const moment = require('moment')
const BaseController = require('./BaseController')
const { store, util, response } = require('../utils')
const { MultiSignature, Transaction } = require('../protos')
const { BlocksService, MultiSignatureService, TransactionsService, GeneralsService } = require('../services')

module.exports = class MultiSignatures extends BaseController {
  constructor() {
    super(new MultiSignatureService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
    this.blocksService = new BlocksService()
  }

  async update(callback) {
    //Get The Last Height for the ToHeight Value

    let toBeUpdated = []

    this.blocksService.getLastHeight(async (error, results) => {
      const storeValue = await this.generalsService.getValueByKey(store.keyLastCheck)
      const fromHeight = storeValue ? storeValue.res.HeightBefore - 1 : 0
      const toHeight = results.Height
      const param = { FromHeight: fromHeight, ToHeight: toHeight }
      MultiSignature.GetPendingTransactionsByHeight(param, (errors, result) => {
        if (errors)
          return callback(
            response.sendBotMessage('Multi Signatures', `[Multi Signatures] Transaction Service - Get Pending Transaction By Height ${err}`)
          )
        const onlyLatestTrue = result.PendingTransactions.filter(i => i.Latest === true)
        onlyLatestTrue.map(i => {
          const sliceTx = util.hashToInt64(i.TransactionHash)
          Transaction.GetTransaction({ ID: sliceTx }, (err, res) => {
            if (err)
              return callback(
                response.sendBotMessage('Multi Signatures', `[Multi Signatures] Transaction Service - Get Transaction Parents ${err}`)
              )

            let status = 'Pending'
            const childStatus = onlyLatestTrue.filter(i => i.TransactionHash === res.TransactionHash)
            switch (childStatus.Status) {
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

            let sendMoney = null

            sendMoney = {
              Amount: res.sendMoneyTransactionBody.Amount,
              AmountConversion: res.sendMoneyTransactionBody ? util.zoobitConversion(res.sendMoneyTransactionBody.Amount) : null,
            }

            toBeUpdated.push({
              ...res,
              TransactionID: res.ID,
              TransactionTypeName: 'ZBC Transfer',
              Status: status,
              FeeConversion: res ? util.zoobitConversion(res.Fee) : 0,
              Timestamp: new Date(moment.unix(res.Timestamp).valueOf()),
              TransactionHashFormatted: util.getZBCAdress(res.TransactionHash, 'ZTX'),
              SendMoney: sendMoney,
            })
          })
        })
      })
    })

    const promises = toBeUpdated.map(i => {
      this.transactionsService.findAndUpdate(i, async (err, res) => {
        return new Promise(resolve => {
          if (err)
            return resolve({
              err: `[Multi Signature] Transaction Service - Update/Insert ${err}`,
              res: null,
            })
          return resolve({ err: null, res })
        })
      })
    })

    /** update node score */

    const results = await Promise.all(promises)
    const errors = results.filter(f => f.err !== null).map(i => i.err)
    const updates = results.filter(f => f.res !== null).map(i => i.res)

    if (updates && updates.length < 1 && errors.length < 1)
      return callback(response.setResult(false, `[Multi Signature] No additional data`))

    if (errors && errors.length > 0) return callback(response.sendBotMessage('MultiSignature', errors[0]))
  }
}
