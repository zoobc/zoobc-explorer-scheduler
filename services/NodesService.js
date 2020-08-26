const BaseService = require('./BaseService')
const { Nodes } = require('../models')

module.exports = class NodesService extends BaseService {
  constructor() {
    super(Nodes)
    this.name = 'NodesService'
  }

  getLastRegisteredHeight(callback) {
    Nodes.findOne().select('RegisteredBlockHeight').sort('-RegisteredBlockHeight').exec(callback)
  }

  getLastHeight(callback) {
    Nodes.findOne().select('Height').sort('-Height').exec(callback)
  }

  getNodeIds(callback) {
    Nodes.find({ IpAddress: { $eq: null } })
      .select('NodeID')
      .exec(callback)
  }

  getRangeHeight(callback) {
    Nodes.find()
      .select('Height')
      .sort('Height')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        const result = { fromHeight: res[0].Height, toHeight: res[res.length - 1].Height }
        return callback(null, result)
      })
  }

  findAndUpdate(payload, callback) {
    Nodes.findOneAndUpdate(
      { NodeID: payload.NodeID },
      {
        NodeAddressInfo: payload.NodeAddressInfo,
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

  getLastScores(NodeId, callback) {
    Nodes.find({ NodeID: NodeId })
      .select('ParticipationScore')
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        return callback(null, res)
      })
  }
}
