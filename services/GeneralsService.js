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

const moment = require('moment')
const BaseService = require('./BaseService')
const { store } = require('../utils')
const { Generals, Blocks } = require('../models')

module.exports = class GeneralsService extends BaseService {
  constructor() {
    super(Generals)
    this.name = 'GeneralsService'
  }

  getLastCheck() {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: store.keyLastCheck })
        .select('Value')
        .lean()
        .exec((err, res) => {
          if (err) return reject(err)
          if (res) return resolve(JSON.parse(res.Value))

          return resolve({
            Height: 0,
            Timestamp: moment(1318781876406).unix(),
            HeightBefore: 0,
          })
        })
    })
  }

  getSetLastCheck() {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: store.keyLastCheck })
        .select('Value')
        .lean()
        .exec((err, res) => {
          if (err) return reject(err)
          if (res) return resolve(JSON.parse(res.Value))

          Blocks.findOne()
            .select('Height Timestamp')
            .sort('Timestamp')
            .limit(1)
            .lean()
            .exec(async (err, res) => {
              if (err) return reject(err)
              if (!res) return resolve(null)
              const result = await this.setValueByKey(
                store.keyLastCheck,
                JSON.stringify({ Height: res.Height, Timestamp: moment(res.Timestamp).unix(), HeightBefore: 0 })
              )
              return resolve(JSON.parse(result.Value))
            })
        })
    })
  }

  getSetLastCheckTimestamp() {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: store.keyLastCheckTimestamp })
        .select('Value')
        .lean()
        .exec((err, res) => {
          if (err) return reject(err)
          if (res) return resolve(parseInt(res.Value))

          Blocks.findOne()
            .select('Timestamp')
            .sort('Timestamp')
            .limit(1)
            .lean()
            .exec(async (err, res) => {
              if (err) return reject(err)
              if (!res) return resolve(null)
              const result = await this.setValueByKey(store.keyLastCheckTimestamp, moment(res.Timestamp).unix())
              return resolve(parseInt(parseInt(result.Value)))
            })
        })
    })
  }

  getValueByKey(key) {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: key })
        .select('Value')
        .lean()
        .exec((err, result) => {
          if (err) return reject({ err: err, res: null })
          return resolve({ err: null, res: result })
        })
    })
  }

  setValueByKey(key, value) {
    return new Promise((resolve, reject) => {
      Generals.findOneAndUpdate({ Key: key }, { Value: value }, { upsert: true, new: true, setDefaultsOnInsert: true }, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }

  setHeightBeforeByKey(key, value) {
    return new Promise((resolve, reject) => {
      Generals.findOneAndUpdate(
        { Key: key },
        { HeightBefore: value },
        { upsert: false, new: false, setDefaultsOnInsert: true },
        (err, res) => {
          if (err) return reject(err)
          return resolve(res)
        }
      )
    })
  }

  getValueRollback() {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: store.keyRollback })
        .select('Value')
        .lean()
        .exec((err, result) => {
          if (err) return reject({ err: err, res: null })
          return resolve({ err: null, res: result })
        })
    })
  }

  setOnRollback(isRunning) {
    return new Promise((resolve, reject) => {
      Generals.findOneAndUpdate(
        { Key: store.keyRollback },
        { Value: isRunning },
        { upsert: true, new: true, setDefaultsOnInsert: true },
        (err, res) => {
          if (err) return reject(err)
          return resolve(res)
        }
      )
    })
  }

  destroies() {
    return new Promise((resolve, reject) => {
      Generals.deleteMany({}, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}
