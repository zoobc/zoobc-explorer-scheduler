const BaseController = require('./BaseController')
const { response } = require('../utils')
const { NodesService } = require('../services')
const { ParticipationScore } = require('../protos')

module.exports = class ParticipationScores extends BaseController {
  constructor() {
    super(new NodesService())
  }

  async update(callback) {
    this.service.getRangeHeight((err, res) => {
      /** send message telegram bot if avaiable */
      if (err)
        return callback(response.sendBotMessage('ParticipationScores', `[Participation Score] Nodes Service - Get Range Height ${err}`))
      if (!res) return callback(response.setResult(false, '[Participation Score] No additional data'))

      const params = { FromHeight: res.fromHeight, ToHeight: res.toHeight }
      ParticipationScore.GetParticipationScores(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'ParticipationScores',
              `[Participation Score] Proto Get Participation Scores - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.ParticipationScores.length < 1)
          return callback(response.setResult(false, '[Participation Score] No additional data'))

        const promises = res.ParticipationScores.map(item => {
          return new Promise(resolve => {
            this.service.update({ NodeID: item.NodeID }, { ParticipationScore: item.Score }, (err, res) => {
              if (err) return resolve({ err, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null)
        const updates = results.filter(f => f.res !== null)

        if (updates && updates.length < 1) return callback(response.setResult(false, `[Participation Score] No additional data`))

        if (errors && errors.length > 0) {
          errors.forEach(err => {
            /** send message telegram bot if avaiable */
            return callback(response.sendBotMessage('ParticipationScores', `[Participation Score] Upsert - ${JSON.stringify(err)}`))
          })
        }

        return callback(response.setResult(true, `[Participation Score] Upsert ${updates.length} data successfully`))
      })
    })
  }
}
