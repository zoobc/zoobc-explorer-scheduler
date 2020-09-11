const moment = require('moment')
const BaseService = require('./BaseService')
const { store } = require('../utils')
const { Generals, Blocks } = require('../models')

module.exports = class GeneralsService extends BaseService {
  constructor() {
    super(Generals)
    this.name = 'GeneralsService'
  }

  getSetLastCheck() {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: store.keyLastCheck })
        .select('Value HeightBefore')
        .exec((err, res) => {
          if (err) return reject(err)
          if (res) return resolve(JSON.parse(res.Value))

          Blocks.findOne()
            .select('Height Timestamp')
            .sort('Timestamp')
            .limit(1)
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
        .exec((err, res) => {
          if (err) return reject(err)
          if (res) return resolve(parseInt(res.Value))

          Blocks.findOne()
            .select('Timestamp')
            .sort('Timestamp')
            .limit(1)
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
        .select('Value HeightBefore')
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

  destroies() {
    return new Promise((resolve, reject) => {
      Generals.deleteMany({}, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}
