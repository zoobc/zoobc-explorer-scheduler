const BaseService = require('./BaseService')
const { ParticipationScores } = require('../models')

module.exports = class ParticipationScoresService extends BaseService {
  constructor() {
    super(ParticipationScores)
    this.name = 'ParticipationScores'
  }

  findnearestScorebyHeight(NodeId, Height, callback) {
    ParticipationScores.findOne({ NodeID: NodeId }).select('Score').where('Height').lt(Height).sort('-Height').exec(callback)
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

  updateOneScores(payload, callback) {
    ParticipationScores.findOneAndUpdate(
      {
        NodeID: payload.NodeID,
        Height: payload.Height,
      },
      {
        DifferenceScores: payload.DifferenceScores,
        DifferenceScorePercentage: payload.DifferenceScorePercentage,
      },
      { new: false, upsert: false }
    ).exec((err, res) => {
      if (err) return callback(err, null)
      if (res && res.length < 1) return callback(null, null)
      return callback(null, res)
    })
  }
}
