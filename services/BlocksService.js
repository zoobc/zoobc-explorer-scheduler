const BaseService = require('./BaseService')
const { Blocks } = require('../models')

module.exports = class BlocksService extends BaseService {
  constructor() {
    super(Blocks)
    this.name = 'BlocksService'
  }

  getLastHeight(callback) {
    Blocks.findOne().select('Height').sort('-Height').exec(callback)
  }

  getFromHeight({ Limit, Height }, callback) {
    Blocks.find().select('BlockID Height').where('Height').gte(Height).limit(Limit).sort('Height').exec(callback)
  }
}
