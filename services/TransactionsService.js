const _ = require('lodash')
const BaseService = require('./BaseService')
const { util } = require('../utils')
const { Transactions } = require('../models')

module.exports = class TransactionsService extends BaseService {
  constructor() {
    super(Transactions)
    this.name = 'TransactionsService'
  }

  getLastHeight(callback) {
    Transactions.findOne().select('Height').sort('-Height').exec(callback)
  }

  getLastTimestamp(callback) {
    Transactions.findOne().select('Timestamp Height').sort('-Timestamp').exec(callback)
  }

  getNodePublicKeysByHeights(heightStart, heightEnd, callback) {
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, NodeRegistration: { $ne: null } })
      .select('NodeRegistration')
      .sort('-Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        const results = res.map(item => {
          return item.NodeRegistration.NodePublicKey
        })
        return callback(null, results)
      })
  }

  asyncSendersByHeights(heightStart, heightEnd) {
    return new Promise(resolve => {
      this.getSendersByHeights(heightStart, heightEnd, (err, res) => {
        if (err) return resolve({ error: err, data: [] })
        return resolve({ error: null, data: res })
      })
    })
  }

  getSendersByHeights(heightStart, heightEnd, callback) {
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, Sender: { $ne: null } })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Sender: { $ne: null } }, { Sender: { $ne: '' } }] })
      .select('Sender Height Fee SendMoney Timestamp')
      .sort('-Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, [])

        const results = _.uniqBy(res, 'Sender').filter(f => util.isNotNullAccountAddress(f.Sender))
        return callback(null, results)
      })
  }

  asyncRecipientsByHeights(heightStart, heightEnd) {
    return new Promise(resolve => {
      this.getRecipientsByHeights(heightStart, heightEnd, (err, res) => {
        if (err) return resolve({ error: err, data: [] })
        return resolve({ error: null, data: res })
      })
    })
  }

  getRecipientsByHeights(heightStart, heightEnd, callback) {
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, Recipient: { $ne: null } })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Recipient: { $ne: null } }, { Recipient: { $ne: '' } }] })
      .select('Recipient Height Fee Timestamp')
      .sort('-Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, [])

        const results = _.uniqBy(res, 'Recipient').filter(f => util.isNotNullAccountAddress(f.Recipient))
        return callback(null, results)
      })
  }

  getTransactionSenderhByMultiSigChild(callback) {
    Transactions.find({ MultisigChild: true, TransactionType: 'MultiSig' })
      .select('TransactionHash')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        return callback(null, res)
      })
  }
}
