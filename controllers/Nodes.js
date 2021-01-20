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

const moment = require('moment')
const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { NodeRegistration } = require('../protos')
const { NodesService, GeneralsService, BlocksService } = require('../services')

module.exports = class Nodes extends BaseController {
  constructor() {
    super(new NodesService())
    this.blocksService = new BlocksService()
    this.generalsService = new GeneralsService()
  }

  async update(callback) {
    const rollback = await this.generalsService.getValueRollback()
    if (rollback && rollback.res && rollback.res.Value === 'true') return callback(response.setResult(false, null))

    const getTotalNode = params => {
      return new Promise(resolve => {
        NodeRegistration.GetNodeRegistrations(params, async (err, res) => {
          if (err) return resolve(0)
          return resolve(parseInt(res.Total))
        })
      })
    }

    /** get last height node (local) */
    this.service.getLastRegisteredHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Nodes Service - Get Last Height ${err}`))

      /** set variable last height node */
      const lastNodeHeight = res ? parseInt(res.RegisteredBlockHeight + 1) : 0

      /** getting value last check height transaction */
      const lastCheck = await this.generalsService.getSetLastCheck()

      /** return message if last check is null */
      if (!lastCheck) return callback(response.setResult(false, '[Nodes] No additional data'))

      /** return message if last height node greather than equal last check height transaction  */
      if (lastNodeHeight > 0 && lastNodeHeight >= lastCheck.Height) return callback(response.setResult(false, '[Nodes] No additional data'))

      /** checking total node to adding params limit request data */
      let params = {
        MinRegistrationHeight: lastNodeHeight,
        MaxRegistrationHeight: lastCheck.Height,
        RegistrationStatuses: [0, 1, 2],
        Pagination: { Limit: 100 },
      }
      const totalNode = await getTotalNode(params)
      if (totalNode > params.Pagination.Limit) params.Pagination.Limit = totalNode

      NodeRegistration.GetNodeRegistrations(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Nodes',
              `[Nodes] API Core Get Node Registrations - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeRegistrations && res.NodeRegistrations.length < 1)
          return callback(response.setResult(false, `[Nodes] No additional data`))

        /** mapping data and additional info */
        const promises = res.NodeRegistrations.map(item => {
          return new Promise(resolve => {
            this.blocksService.getTimestampByHeight({ Height: item.RegistrationHeight }, (err, res) => {
              if (err) return resolve({ err: `[Nodes] Block Service - Get Timestamp By Height ${err}`, res: null })
              if (!res) return resolve({ err: null, res: null })

              return resolve({
                err: null,
                res: {
                  NodeID: item.NodeID,
                  NodePublicKey: item.NodePublicKey,
                  NodePublicKeyFormatted: util.getZBCAddress(item.NodePublicKey, 'ZNK'),
                  OwnerAddress: item.AccountAddress,
                  OwnerAddressFormatted: util.parseAddress(item.AccountAddress),
                  RegisteredBlockHeight: item.RegistrationHeight,
                  LockedFunds: util.zoobitConversion(item.LockedBalance),
                  RegistrationStatus: item.RegistrationStatus,
                  Latest: item.Latest,
                  Height: item.Height,
                  NodeAddressInfo: item.NodeAddressInfo,
                  /** waiting core */
                  BlocksFunds: null,
                  RewardsPaid: null,
                  RewardsPaidConversion: null,
                  /** additional detail node address */
                  IpAddress: null,
                  CountryCode: null,
                  CountryName: null,
                  RegionCode: null,
                  RegionName: null,
                  City: null,
                  Latitude: null,
                  Longitude: null,
                  CountryFlagUrl: null,
                  CountryFlagEmoji: null,
                  PercentageScore: null,
                  ParticipationScore: null,
                  RegistrationTime: moment(res.Timestamp).valueOf(),
                },
              })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const payloads = results.filter(f => f.res !== null).map(i => i.res)

        if (payloads && payloads.length < 1 && errors.length < 1) return callback(response.setResult(false, `[Nodes] No additional data`))

        if (errors && errors.length > 0) return callback(response.sendBotMessage('Nodes', errors[0]))

        this.service.upserts(payloads, ['NodeID', 'NodePublicKey'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError(`[Nodes] Upsert data failed`))

          return callback(response.setResult(true, `[Nodes] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
