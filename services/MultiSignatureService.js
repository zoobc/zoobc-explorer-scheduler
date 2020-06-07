const BaseService = require('./BaseService')
const { MultiSig } = require('../models')

module.exports = class MultiSignatureService extends BaseService {
  constructor() {
    super(MultiSig)
  }

  insertMany(payloads, callback) {
    MultiSig.insertMany(payloads, callback)
  }
}
