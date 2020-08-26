const BaseController = require('./BaseController')
const { response } = require('../utils')
const { BlocksService, NodesService, ParticipationScoresService } = require('../services')
const { ParticipationScore } = require('../protos')
const config = require('../config')

module.exports = class ParticipationScores extends BaseController {
  constructor() {
    super(new NodesService())
    this.participationScoresService = new ParticipationScoresService()
    this.BlocksService = new BlocksService()
  }

  async update(callback) {
    this.BlocksService.getLastHeight((err, res) => {
      /** send message telegram bot if avaiable */
      if (err)
        return callback(response.sendBotMessage('ParticipationScores', `[Participation Score] Nodes Service - Get Range Height ${err}`))
      if (!res) return callback(response.setResult(false, '[Participation Score] No additional data'))

      const params = {
        FromHeight: res.Height > config.app.limitData ? res.Height - config.app.limitData : 0,
        ToHeight: res.Height,
      }

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
            /** calculate the Difference Scores between current height and height before based on nodeID */
            const payloads = {
              NodeID: item.NodeID,
              Score: item.Score,
              Latest: item.Latest,
              Height: item.Height,
              DifferenceScores: 0,
              DifferenceScorePercentage: 0,
              Flag: '',
            }

            this.participationScoresService.findnearestScorebyHeight(item.NodeID, item.Height, (eror, result) => {
              if (eror) return resolve({ eror, res: null })

              if (result) {
                const differenceScore = parseInt(item.Score) - parseInt(result.Score)
                payloads.DifferenceScores = differenceScore
                payloads.DifferenceScorePercentage = (differenceScore / parseInt(result.Score)) * 100

                if (differenceScore > 0) {
                  payloads.Flag = 'Up'
                } else if (differenceScore < 0) {
                  payloads.Flag = 'Down'
                }
              }

              this.participationScoresService.updateOneScores(payloads, err => {
                if (err) return resolve({ err, res: null })

                /** update scored to nodes */
                const PercentageScore = item.NodeID / (10 ^ 16)
                this.service.update({ NodeID: item.NodeID }, { ParticipationScore: item.Score.toString(), PercentageScore }, (err, res) => {
                  if (err) return resolve({ err, res: null })
                  return resolve({ err: null, res })
                })
              })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Participation Score] No additional data`))

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
