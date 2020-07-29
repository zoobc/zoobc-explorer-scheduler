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

  async asyncAccountAddressByHeights(heightStart, heightEnd) {
    const sender = await this.asyncSendersByHeights(heightStart, heightEnd)
    if (sender.error) return { error: sender.error, data: [] }
    const senders = sender.data.map(i => {
      return { SendMoney: i.SendMoney, Timestamp: i.Timestamp, Height: i.Height, Account: i.Sender, Fee: i.Fee, Type: 'Sender' }
    }, [])

    const recipient = await this.asyncRecipientsByHeights(heightStart, heightEnd)
    if (recipient.error) return { error: recipient.error, data: [] }
    const recipients = recipient.data.map(i => {
      return { SendMoney: i.SendMoney, Timestamp: i.Timestamp, Height: i.Height, Account: i.Recipient, Fee: i.Fee, Type: 'Recipient' }
    }, [])

    return { error: null, data: [...senders, ...recipients] }
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
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, TransactionType: 1, Sender: { $ne: null } })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Sender: { $ne: null } }, { Sender: { $ne: '' } }] })
      .select('Sender Height Fee Timestamp SendMoney')
      .sort('Height')
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
    Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, TransactionType: 1, Recipient: { $ne: null } })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Recipient: { $ne: null } }, { Recipient: { $ne: '' } }] })
      .select('Recipient Height Fee Timestamp SendMoney')
      .sort('Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, [])

        const results = _.uniqBy(res, 'Recipient').filter(f => util.isNotNullAccountAddress(f.Recipient))
        return callback(null, results)
      })
  }

  getTransactionSenderByParticipant(callback) {
    Transactions.find({ MultisigChild: true, Status: 'Pending' })
      .select('TransactionHash')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        return callback(null, res)
      })
  }

  getTestFindAndUpdate(payloads, callback) {
    Transactions.findOneAndUpdate(
      { TransactionHash: payloads.TransactionHash },
      { Status: payloads.Status },
      {
        new: true,
        upsert: true,
      }
    ).exec((err, res) => {
      if (err) return callback(err, null)
      if (res.length < 1) return callback(null, null)

      return callback(null, res)
    })
  }
}
