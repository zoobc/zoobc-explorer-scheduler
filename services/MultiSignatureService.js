const BaseService = require('./BaseService')
const { MultiSignature } = require('../models')

module.exports = class MultiSignatureService extends BaseService {
  constructor() {
    super(MultiSignature)
  }

  insertMany(payloads, callback) {
    MultiSignature.insertMany(payloads, callback)
  }

  getLatestHeight(callback) {
    MultiSignature.findOne().sort('-TransactionHeight').exec(callback)
  }
}
