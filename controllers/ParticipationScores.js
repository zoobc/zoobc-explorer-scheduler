const BaseController = require('./BaseController')
const { response } = require('../utils')
const { ParticipationScore } = require('../protos')
const { BlocksService, NodesService, ParticipationScoresService } = require('../services')

const billion = 10000000000000000

module.exports = class ParticipationScores extends BaseController {
  constructor() {
    super(new ParticipationScoresService())
    this.nodesService = new NodesService()
    this.blocksService = new BlocksService()
  }

  async update(callback) {
    /** getting last height node */
    this.service.getLastHeight((err, res) => {
      if (err)
        return callback(
          response.sendBotMessage('ParticipationScores', `[Participation Score] Participation Score Service - Get Last Height ${err}`)
        )

      /** make default variable from height */
      const FromHeight = res ? res.Height : 0

      /** getting last height block */
      this.blocksService.getLastHeight((err, res) => {
        if (err)
          return callback(response.sendBotMessage('ParticipationScores', `[Participation Score] Block Service - Get Last Height ${err}`))

        /** request participation score using params range height */
        const ToHeight = res ? res.Height : 0
        const params = { FromHeight, ToHeight: ToHeight - FromHeight > 400 ? 400 : ToHeight }
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

          const participationScores = res.ParticipationScores
          const payloads = participationScores.map(i => {
            /** calculate different score base on node id and prev height */
            const prevParticipations = participationScores.filter(f => f.NodeID === i.NodeID && f.Height === i.Height - 1)
            const prevScore = prevParticipations.length > 0 ? parseInt(prevParticipations[0].Score) : null
            const currScore = parseInt(i.Score)
            const diffScore = prevScore ? prevScore - currScore : currScore

            return {
              NodeID: i.NodeID,
              Score: i.Score,
              Latest: i.Latest,
              Height: i.Height,
              DifferenceScores: diffScore,
              DifferenceScorePercentage: diffScore / billion,
              Flag: prevScore ? (prevScore > currScore ? 'Down' : 'Up') : 'Flat',
            }
          })

          /** update node score */
          const promises = payloads.map(i => {
            return new Promise(resolve => {
              const key = { NodeID: i.NodeID }
              const payload = { ParticipationScore: i.Score, PercentageScore: parseInt(i.Score) / billion }

              this.nodesService.update(key, payload, (err, res) => {
                if (err) return resolve({ err: `[Participation Score] Node Service - Update ${err}`, res: null })
                return resolve({ err: null, res })
              })
            })
          })

          const results = await Promise.all(promises)
          const errors = results.filter(f => f.err !== null).map(i => i.err)
          const updates = results.filter(f => f.res !== null).map(i => i.res)

          if (updates && updates.length < 1 && errors.length < 1)
            return callback(response.setResult(false, `[Participation Score] No additional data`))

          if (errors && errors.length > 0) return callback(response.sendBotMessage('ParticipationScores', errors[0]))

          /** update or insert participation score */
          this.service.upserts(payloads, ['NodeID', 'Height'], (err, res) => {
            /** send message telegram bot if avaiable */
            if (err) return callback(response.sendBotMessage('ParticipationScores', `[Participation Score] Upsert - ${err}`))
            if (res && res.result.ok !== 1) return callback(response.setError('[Participation Score] Upsert data failed'))

            return callback(response.setResult(true, `[Participation Score] Upsert ${payloads.length} data successfully`))
          })
        })
      })
    })
  }
}
