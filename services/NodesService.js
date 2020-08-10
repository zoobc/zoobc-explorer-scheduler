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

  getNodeIds(callback) {
    Nodes.find({ IpAddress: { $eq: null } })
      .select('NodeID')
      .exec(callback)
  }

  findAndUpdate(payload, callback) {
    Nodes.findOneAndUpdate(
      { NodeID: payload.NodeID },
      {
        IpAddress: payload.IpAddress,
        Port: payload.Port,
        CountryCode: payload.CountryCode,
        CountryName: payload.CountryName,
        RegionCode: payload.RegionCode,
        RegionName: payload.RegionName,
        City: payload.City,
        Latitude: payload.Latitude,
        Longitude: payload.Longitude,
        CountryFlagUrl: payload.CountryFlagUrl,
        CountryFlagEmoji: payload.CountryFlagEmoji,
      },
      { new: false, upsert: false }
    ).exec((err, res) => {
      if (err) return callback(err, null)
      if (res && res.length < 1) return callback(null, null)
      return callback(null, res)
    })
  }
}
