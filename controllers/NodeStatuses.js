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
const { NodesService } = require('../services')
const { NodeRegistration } = require('../protos')
const { response } = require('../utils')

module.exports = class NodeStatuses extends BaseController {
  constructor() {
    super(new NodesService())
  }

  async update(callback) {
    this.service.getNodePKs((err, res) => {
      if (err)
        return callback(response.sendBotMessage('NodePendingStatus', `[Node Pending Status] Nodes Service - Get Pending Node PKs ${err}`))
      if (res && res.length < 1) return callback(response.setResult(false, '[Node Pending Status] No additional data'))

      const params = { NodePublicKeys: res && res.length > 0 && res.map(i => i.NodePublicKey) }

      NodeRegistration.GetNodeRegistrationsByNodePublicKeys(params, async (err, res) => {
        if (err)
          return callback(
            response.sendBotMessage(
              'NodePendingStatus',
              `[Node Pending Status] Proto Get Get Node Registrations By NodePublicKeys - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeRegistrations && res.NodeRegistrations.length < 1)
          return callback(response.setResult(false, '[Node Pending Status] No additional data'))

        const promises = res.NodeRegistrations.map(async item => {
          return new Promise(resolve => {
            this.service.update({ NodeID: item.NodeID }, { RegistrationStatus: item.RegistrationStatus }, (err, res) => {
              if (err) return resolve({ err: `[Node Pending Status] Node - Find And Update ${err}`, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Node Pending Status] No additional data`))

        if (errors && errors.length > 0) return callback(response.sendBotMessage('Node Pending Status', errors[0]))

        return callback(response.setResult(true, `[Node Pending Status] Upsert ${updates.length} data successfully`))
      })
    })
  }
}
