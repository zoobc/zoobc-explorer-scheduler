const BaseService = require('./BaseService')
const { Nodes } = require('../models')

module.exports = class NodesService extends BaseService {
  constructor() {
    super(Nodes)
    this.name = 'NodesService'
  }

  getLastHeight(callback) {
    Nodes.findOne().select('RegisteredBlockHeight').sort('-RegisteredBlockHeight').exec(callback)
  }
}
