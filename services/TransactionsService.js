const _ = require('lodash')
const BaseService = require('./BaseService')
const { Transactions } = require('../models')

module.exports = class TransactionsService extends BaseService {
  constructor() {
    super(Transactions)
    this.name = 'TransactionsService'
  }

  getMultiSigByHeight(heightStart, heightEnd, callback) {
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, TransactionType: 5 }).exec((err, res) => {
      if (err) return callback(err, null)
      if (res.length < 1) return callback(null, null)

      const results = res.map(item => {
        return item
      })
      return callback(null, results)
    })
  }

  getLastHeight(callback) {
    Transactions.findOne().select('Height').sort('-Height').exec(callback)
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
        if (!res) return resolve({ error: null, data: [] })
        return resolve({ error: null, data: res })
      })
    })
  }

  getSendersByHeights(heightStart, heightEnd, callback) {
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, Sender: { $ne: null } })
      .select('Sender Height Fee SendMoney Timestamp')
      .sort('-Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        const results = _.uniqBy(res, 'Sender')
        return callback(null, results)
      })
  }

  asyncRecipientsByHeights(heightStart, heightEnd) {
    return new Promise(resolve => {
      this.getRecipientsByHeights(heightStart, heightEnd, (err, res) => {
        if (err) return resolve({ error: err, data: [] })
        if (!res) return resolve({ error: null, data: [] })
        return resolve({ error: null, data: res })
      })
    })
  }

  getRecipientsByHeights(heightStart, heightEnd, callback) {
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, Recipient: { $ne: null } })
      .select('Recipient Height Fee Timestamp')
      .sort('-Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        const results = _.uniqBy(res, 'Recipient')
        return callback(null, results)
      })
  }
}
