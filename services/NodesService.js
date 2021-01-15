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

const BaseService = require('./BaseService')
const { Nodes } = require('../models')

module.exports = class NodesService extends BaseService {
  constructor() {
    super(Nodes)
    this.name = 'NodesService'
  }

  getLastRegisteredHeight(callback) {
    Nodes.findOne().select('RegisteredBlockHeight').sort('-RegisteredBlockHeight').lean().exec(callback)
  }

  getLastHeight(callback) {
    Nodes.findOne().select('Height').sort('-Height').lean().exec(callback)
  }

  getNodeIds(callback) {
    Nodes.find({ IpAddress: { $eq: null } })
      .select('NodeID')
      .lean()
      .exec(callback)
  }

  getRangeHeight(callback) {
    Nodes.find()
      .select('Height')
      .sort('Height')
      .lean()
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
      .lean()
      .exec((err, res) => {
        if (err) return callback(err, null)
        if (res.length < 1) return callback(null, null)

        return callback(null, res)
      })
  }

  getNodePKs(callback) {
    Nodes.find().select('NodePublicKey').lean().exec(callback)
  }
}
