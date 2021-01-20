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
const { NodeAddressInfo } = require('../protos')
const { response, ipstack } = require('../utils')
const { NodesService, GeneralsService } = require('../services')

module.exports = class NodeAddress extends BaseController {
  constructor() {
    super(new NodesService())
    this.generalsService = new GeneralsService()
  }

  async update(callback) {
    const rollback = await this.generalsService.getValueRollback()
    if (rollback && rollback.res && rollback.res.Value === 'true') return callback(response.setResult(false, null))

    this.service.getNodeIds((err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('NodeAddress', `[Node Address] Nodes Service - Get Node IDs ${err}`))
      if (res && res.length < 1) return callback(response.setResult(false, '[Node Address] No additional data'))

      const params = { NodeIDs: res.map(i => i.NodeID) }
      NodeAddressInfo.GetNodeAddressInfo(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'NodeAddress',
              `[Node Address] API Core Get Node Address Info - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeAddressesInfo.length < 1) return callback(response.setResult(false, '[Node Address] No additional data'))

        const promises = res.NodeAddressesInfo.map(async item => {
          const resIpStack = item.Address ? await ipstack.get(item.Address) : null

          return new Promise(resolve => {
            const payload = {
              NodeAddressInfo: item,
              NodeID: item.NodeID,
              IpAddress: item.Address,
              Port: item.Port,
              /** additional detail node address */
              CountryCode: (resIpStack && resIpStack.country_code) || null,
              CountryName: (resIpStack && resIpStack.country_name) || null,
              RegionCode: (resIpStack && resIpStack.region_code) || null,
              RegionName: (resIpStack && resIpStack.region_name) || null,
              City: (resIpStack && resIpStack.city) || null,
              Latitude: (resIpStack && resIpStack.latitude) || null,
              Longitude: (resIpStack && resIpStack.longitude) || null,
              CountryFlagUrl: (resIpStack && resIpStack.location && resIpStack.location.country_flag) || null,
              CountryFlagEmoji: (resIpStack && resIpStack.location && resIpStack.location.country_flag_emoji) || null,
            }

            this.service.findAndUpdate(payload, (err, res) => {
              if (err) return resolve({ err: `[Node Address] Node - Find And Update ${err}`, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Node Address] No additional data`))

        if (errors && errors.length > 0) return callback(response.sendBotMessage('NodeAddress', errors[0]))

        return callback(response.setResult(true, `[Node Address] Upsert ${updates.length} data successfully`))
      })
    })
  }
}
