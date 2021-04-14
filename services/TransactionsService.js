/** 
 * ZooBC Copyright (C) 2020 Quasisoft Limited - Hong Kong
 * This file is part of ZooBC <https://github.com/zoobc/zoobc-explorer-scheduler>

 * ZooBC is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * ZooBC is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with ZooBC.  If not, see <http://www.gnu.org/licenses/>.

 * Additional Permission Under GNU GPL Version 3 section 7.
 * As the special exception permitted under Section 7b, c and e, 
 * in respect with the Author’s copyright, please refer to this section:

 * 1. You are free to convey this Program according to GNU GPL Version 3,
 *     as long as you respect and comply with the Author’s copyright by 
 *     showing in its user interface an Appropriate Notice that the derivate 
 *     program and its source code are “powered by ZooBC”. 
 *     This is an acknowledgement for the copyright holder, ZooBC, 
 *     as the implementation of appreciation of the exclusive right of the
 *     creator and to avoid any circumvention on the rights under trademark
 *     law for use of some trade names, trademarks, or service marks.

 * 2. Complying to the GNU GPL Version 3, you may distribute 
 *     the program without any permission from the Author. 
 *     However a prior notification to the authors will be appreciated.

 * ZooBC is architected by Roberto Capodieci & Barton Johnston
 * contact us at roberto.capodieci[at]blockchainzoo.com
 * and barton.johnston[at]blockchainzoo.com

 * IMPORTANT: The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of the Software.
**/

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
    Transactions.findOne().select('Height').sort('-Height').lean().exec(callback)
  }

  getLastTimestamp(callback) {
    Transactions.findOne().select('Timestamp Height').sort('-Timestamp').lean().exec(callback)
  }

  getNodePublicKeysByHeights(heightStart, heightEnd, callback) {
    Transactions.find({
      Height: { $gte: heightStart, $lte: heightEnd },
      NodeRegistration: { $ne: null },
    })
      .select('NodeRegistration')
      .sort('-Height')
      .lean()
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
      return {
        SendMoney: i.SendMoney,
        Timestamp: i.Timestamp,
        Height: i.Height,
        Account: i.Sender,
        AccountFormatted: i.SenderFormatted,
        Fee: i.Fee,
        Type: 'Sender',
      }
    }, [])

    const recipient = await this.asyncRecipientsByHeights(heightStart, heightEnd)
    if (recipient.error) return { error: recipient.error, data: [] }
    const recipients = recipient.data.map(i => {
      return {
        SendMoney: i.SendMoney,
        Timestamp: i.Timestamp,
        Height: i.Height,
        Account: i.Recipient,
        AccountFormatted: i.RecipientFormatted,
        Fee: i.Fee,
        Type: 'Recipient',
      }
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

  findAndUpdate(payload, callback) {
    Transactions.findOneAndUpdate({ TransactionID: payload.TransactionID }, payload, { new: true, upsert: true })
      .lean()
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res && res.length < 1) return callback(null, null)
        return callback(null, res)
      })
  }

  findAndUpdateStatus(conditions, callback) {
    Transactions.updateMany(conditions, { $set: { Status: 'Approved' } }, { created: false })
      .lean()
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res && res.length < 1) return callback(null, null)
        return callback(null, res)
      })
  }

  getSendersByHeights(heightStart, heightEnd, callback) {
    Transactions.find({
      Height: { $gte: heightStart, $lte: heightEnd },
      // TransactionType: 1,
      $or: [{ TransactionType: 1 }, { TransactionType: 2 }],
      Sender: { $ne: null },
    })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Sender: { $ne: null } }, { Sender: { $ne: '' } }] })
      .select('Sender SenderFormatted Height Fee Timestamp SendMoney')
      .sort('Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, [])

        const results = _.uniqBy(res, 'SenderFormatted').filter(f => util.isNotNullAccountAddress(f.Sender))
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
    Transactions.find({
      Height: { $gte: heightStart, $lte: heightEnd },
      // TransactionType: 1,
      $or: [{ TransactionType: 1 }, { TransactionType: 2 }],
      Recipient: { $ne: null },
    })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Recipient: { $ne: null } }, { Recipient: { $ne: '' } }] })
      .select('Recipient RecipientFormatted Height Fee Timestamp SendMoney')
      .sort('Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, [])

        const results = _.uniqBy(res, 'RecipientFormatted').filter(f => util.isNotNullAccountAddress(f.Recipient))
        return callback(null, results)
      })
  }

  getAccountAddressFromTransactions(callback) {
    Transactions.find({ Sender: { $ne: null } })
      // Transactions.find({ Height: { $gte: heightStart, $lte: heightEnd }, $or: [{ Sender: { $ne: null } }, { Sender: { $ne: '' } }] })
      .select('Sender SenderFormatted Height Fee Timestamp SendMoney')
      .sort('Height')
      .lean()
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, [])

        const accountSenders = _.uniqBy(res, 'SenderFormatted')
          .filter(f => util.isNotNullAccountAddress(f.Sender))
          .map(i => {
            return { ...i, Account: i.Sender, AccountFormatted: i.SenderFormatted, Type: 'Sender' }
          })

        Transactions.find({ Recipient: { $ne: null } })
          .select('Recipient RecipientFormatted Height Fee Timestamp SendMoney')
          .sort('Height')
          .lean()
          .exec((err, res) => {
            if (err) return callback(err, null)
            if (res.length < 1) return callback(null, [])

            const accountRecipients = _.uniqBy(res, 'RecipientFormatted')
              .filter(f => util.isNotNullAccountAddress(f.Recipient))
              .map(i => {
                return { ...i, Account: i.Recipient, AccountFormatted: i.RecipientFormatted, Type: 'Recipient' }
              })

            return callback(null, [...accountSenders, ...accountRecipients])
          })
      })
  }

  getAccountAddresses() {
    return new Promise(resolve => {
      Transactions.find({ Sender: { $ne: null } })
        .select('Sender SenderFormatted Height')
        .sort('Height')
        .exec((err, res) => {
          if (err) return resolve(null)
          if (res.length < 1) return resolve(null)

          const accountSenders = _.uniqBy(res, 'SenderFormatted')
            .filter(f => util.isNotNullAccountAddress(f.Sender))
            .map(i => {
              return { ...i, Account: i.Sender }
            })

          Transactions.find({ Recipient: { $ne: null } })
            .select('Recipient RecipientFormatted Height')
            .sort('Height')
            .exec((err, res) => {
              if (err) return resolve(null)
              if (res.length < 1) return resolve(null)

              const accountRecipients = _.uniqBy(res, 'RecipientFormatted')
                .filter(f => util.isNotNullAccountAddress(f.Recipient))
                .map(i => {
                  return { ...i, Account: i.Recipient }
                })

              return resolve([...accountSenders, ...accountRecipients])
            })
        })
    })
  }
}
