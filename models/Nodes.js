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

const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    NodeID: { type: String, index: true },
    NodePublicKey: { type: Buffer },
    NodePublicKeyFormatted: { type: String },
    OwnerAddress: { type: Buffer } /** AccountAddress */,
    OwnerAddressFormatted: { type: String } /** update */,
    RegisteredBlockHeight: { type: Number } /** RegistrationHeight */,
    LockedFunds: { type: String } /** LockedBalance */,
    RegistrationStatus: { type: Number },
    Latest: { type: Boolean },
    Height: { type: Number },
    ParticipationScore: { type: String },
    PercentageScore: { type: Number },
    BlocksFunds: { type: Number } /** not implemented in core */,
    RewardsPaid: { type: Number } /** not implemented in core */,
    RewardsPaidConversion: { type: String } /** not implemented in core */,
    NodeAddressInfo: {
      NodeID: { type: String },
      Address: { type: String },
      Port: { type: Number },
      BlockHeight: { type: Number },
      BlockHash: { type: Buffer },
      Status: { type: String },
      Signature: { type: Buffer },
    },
    /** additional detail node address */
    RegistrationTime: { type: Date },
    IpAddress: { type: String },
    CountryCode: { type: String },
    CountryName: { type: String },
    RegionCode: { type: String },
    RegionName: { type: String },
    City: { type: String },
    Latitude: { type: Number },
    Longitude: { type: Number },
    CountryFlagUrl: { type: String },
    CountryFlagEmoji: { type: Buffer },
    Blocks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blocks' }],
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Nodes', schema)
