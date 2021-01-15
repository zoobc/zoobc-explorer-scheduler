/** 
 * ZooBC Copyright (C) 2020 Quasisoft Limited - Hong Kong
 * This file is part of ZooBC <https://github.com/zoobc/zoobc-explorer-scheduler>

 * ZooBC is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * ZooBC is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with ZooBC.  If not, see <http://www.gnu.org/licenses/>.

 * Additional Permission Under GNU GPL Version 3 section 7.
 * As the special exception permitted under Section 7b, c and e, 
 * in respect with the Author’s copyright, please refer to this section:

 * 1. You are free to convey this Program according to GNU GPL Version 3,
 *     as long as you respect and comply with the Author’s copyright by 
 *     showing in its user interface an Appropriate Notice that the derivate 
 *     program and its source code are “powered by ZooBC”. 
 *     This is an acknowledgement for the copyright holder, ZooBC, 
 *     as the implementation of appreciation of the exclusive right of the
 *     creator and to avoid any circumvention on the rights under trademark
 *     law for use of some trade names, trademarks, or service marks.

 * 2. Complying to the GNU GPL Version 3, you may distribute 
 *     the program without any permission from the Author. 
 *     However a prior notification to the authors will be appreciated.

 * ZooBC is architected by Roberto Capodieci & Barton Johnston
 * contact us at roberto.capodieci[at]blockchainzoo.com
 * and barton.johnston[at]blockchainzoo.com

 * IMPORTANT: The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of the Software.
**/

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
    this.service.getLastHeight((err, result) => {
      if (err)
        return callback(
          response.sendBotMessage('ParticipationScores', `[Participation Score] Participation Score Service - Get Last Height ${err}`)
        )

      /** make default variable from height */
      const FromHeight = result ? result.Height : 0

      /** getting last height block */
      this.blocksService.getLastHeight((err, res) => {
        if (err)
          return callback(response.sendBotMessage('ParticipationScores', `[Participation Score] Block Service - Get Last Height ${err}`))

        /** request participation score using params range height */
        const ToHeight = res ? res.Height : 0
        const Limit = 400

        const params = {
          FromHeight,
          ToHeight: ToHeight - FromHeight > Limit ? FromHeight + Limit : ToHeight,
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

          const participationScores = res.ParticipationScores

          this.service.getLatestScore((error, result) => {
            if (error)
              return callback(
                /** send message telegram bot if avaiable */
                response.sendBotMessage(
                  'ParticipationScores',
                  `[Participation Score] Participation Score Service - Get Last Score - ${error}`,
                  `- Params : <pre>${JSON.stringify(params)}</pre>`
                )
              )

            let toBeUpdated = []

            const payloads = participationScores.map(i => {
              let stat = 'False'
              //Looking if theres available NodeID in DB and set the status to False
              const matchedObj = result ? result.filter(f => f.NodeID === i.NodeID) : null

              //CHECK IF THE PREVIOUS TRUE IS ALREADY USED OR NOT
              //ex: LATEST 99, THE RANGE THAT GETS IS FROM 99-199 AND THERE'S NO NEW DATA
              //SO THE 99 IS LATEST AND THE VALUE MUST NOT BE UPDATED
              const found = matchedObj.some(el => el.NodeID === i.NodeID && el.Height === i.Height)

              if (!found && matchedObj[0]) {
                toBeUpdated.push({
                  NodeID: matchedObj[0].NodeID,
                  Height: matchedObj[0].Height,
                  Score: matchedObj[0].Score,
                  Latest: matchedObj[0].Latest,
                  DifferenceScores: matchedObj[0].DifferenceScores,
                  DifferenceScorePercentage: matchedObj[0].DifferenceScorePercentage,
                  Flag: matchedObj[0].Flag,
                  Status: 'False',
                })
              }

              /**
               * calculate different score base on node id and prev height
               * Calculate the nearest Height from selected NodeID(i)
               * */
              const prevParticipations = participationScores.filter(f => f.NodeID === i.NodeID && f.Height < i.Height)
              const nearHeight =
                prevParticipations.length !== 0
                  ? prevParticipations.reduce((prev, current) => {
                      return prev.Height > current.Height ? prev : current
                    }, 0)
                  : null

              const usedObj = matchedObj[0]
                ? nearHeight && matchedObj[0].Height < nearHeight.Height
                  ? nearHeight
                  : matchedObj[0]
                : nearHeight

              const prevScore = usedObj ? parseInt(usedObj.Score) : null
              const currScore = parseInt(i.Score)
              let diffScore = prevScore ? currScore - prevScore : 0

              //check if the
              if (matchedObj[0] && matchedObj[0].Height === i.Height) {
                diffScore = matchedObj[0].DifferenceScores
              }

              //Calculate the max Height of a certain NodeID From ProtoArray
              const maxHeightFromProto = participationScores.filter(f => f.NodeID === i.NodeID)
              const maxHeight = maxHeightFromProto
                ? maxHeightFromProto.reduce((prev, current) => {
                    return prev.Height > current.Height ? prev : current
                  }, 0)
                : {}

              if (i.Height === maxHeight.Height) {
                stat = 'True'
              }

              const flag = diffScore ? (diffScore < 0 ? 'Down' : diffScore > 0 ? 'Up' : 'Flat') : 'Flat'

              return {
                NodeID: i.NodeID,
                Score: i.Score,
                Latest: i.Latest,
                Height: i.Height,
                DifferenceScores: diffScore,
                DifferenceScorePercentage: diffScore / billion,
                Flag: flag,
                Status: stat,
              }
            })

            this.service.upserts(toBeUpdated, ['NodeID', 'Height'], async (err, res) => {
              if (err)
                return callback(
                  /** send message telegram bot if avaiable */
                  response.sendBotMessage(
                    'Participation Scores',
                    `[Participation Scores] Participation Score Service - Upserts - ${err}`,
                    `- Params : <pre>${JSON.stringify(params)}</pre>`
                  )
                )

              if (!res) return callback(response.setResult(false, `[Participation Scores] No additional data`))

              const promises = payloads.map(i => {
                return new Promise(resolve => {
                  const key = { NodeID: i.NodeID }
                  const payload = {
                    ParticipationScore: i.Score,
                    PercentageScore: parseInt(i.Score) / billion,
                  }

                  this.nodesService.update(key, payload, (err, res) => {
                    if (err)
                      return resolve({
                        err: `[Participation Score] Node Service - Update ${err}`,
                        res: null,
                      })
                    return resolve({ err: null, res })
                  })
                })
              })

              /** update node score */
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
      })
    })
  }
}
