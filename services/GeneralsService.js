const BaseService = require('./BaseService')
const { Generals } = require('../models')

module.exports = class GeneralsService extends BaseService {
  constructor() {
    super(Generals)
    this.name = 'GeneralsService'
  }

  getValueByKey(key) {
    return new Promise((resolve, reject) => {
      Generals.findOne({ Key: key })
        .select('Value')
        .exec((err, res) => {
          if (err) return reject(err)
          return resolve(res ? res.Value : null)
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

  destroies() {
    return new Promise((resolve, reject) => {
      Generals.deleteMany({}, (err, res) => {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }
}
