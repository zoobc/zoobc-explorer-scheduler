const BaseService = require('./BaseService')
const { Blocks } = require('../models')

module.exports = class BlocksService extends BaseService {
  constructor() {
    super(Blocks)
    this.name = 'BlocksService'
  }

  getLastHeight(callback) {
    Blocks.findOne().select('Height Timestamp').sort('-Height').exec(callback)
  }

  getFromHeight({ Limit, Height }, callback) {
    Blocks.find().select('BlockID Height').where('Height').gte(Height).limit(Limit).sort('Height').exec(callback)
  }

  getLastTimestamp(callback) {
    Blocks.findOne().select('Timestamp Height').sort('-Timestamp').exec(callback)
  }

  getTimestampByHeight({ Height }, callback) {
    Blocks.findOne().select('Timestamp').where('Height').equals(Height).exec(callback)
  }

  asyncTimeStampByHeight(Height) {
    return new Promise(resolve => {
      this.getTimestampByHeight({ Height }, (err, res) => {
        if (err) return resolve({ err, res: null })
        return resolve({ err: null, res: res.Timestamp })
      })

      // Blocks.findOne()
      //   .select('Timestamp')
      //   .where('Height')
      //   .equals(Height)
      //   .exec((err, res) => {
      //     if (err) return resolve({ err, res: null })
      //     return resolve({ err: null, res: res.Timestamp })
      //   })
    })
  }
}
