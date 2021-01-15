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
    /** Block */
    BlockID: { type: String, index: true } /** ID */,
    BlockHash: { type: Buffer },
    BlockHashFormatted: { type: String } /** update */,
    PreviousBlockID: { type: Buffer } /** PreviousBlockHash */,
    PreviousBlockIDFormatted: { type: String } /** update */,
    Height: { type: Number },
    Timestamp: { type: Date },
    BlockSeed: { type: Buffer },
    BlockSignature: { type: Buffer },
    CumulativeDifficulty: { type: String },
    SmithScale: { type: Number },
    BlocksmithID: { type: Buffer } /** BlocksmithPublicKey */,
    BlocksmithIDFormatted: { type: String } /** update */,
    TotalAmount: { type: Number },
    TotalAmountConversion: { type: String },
    TotalFee: { type: Number },
    TotalFeeConversion: { type: String },
    TotalCoinBase: { type: Number },
    TotalCoinBaseConversion: { type: String },
    Version: { type: Number },
    PayloadLength: { type: Number },
    PayloadHash: { type: Buffer },
    MerkleRoot: { type: Buffer },
    MerkleTree: { type: Buffer },
    ReferenceBlockHeight: { type: Number },

    /** BlockExtendedInfo */
    TotalReceipts: { type: Number },
    ReceiptValue: { type: Number },
    PopChange: { type: String },
    BlocksmithAddress: { type: Buffer } /** BlocksmithAccountAddress */,
    BlocksmithAddressFormatted: { type: String } /** update */,
    SkippedBlocksmiths: [
      {
        BlocksmithPublicKey: { type: Buffer },
        BlocksmithPublicKeyFormatted: { type: String } /** update */,
        POPChange: { type: String },
        BlockHeight: { type: Number },
        BlocksmithIndex: { type: Number },
      },
    ],

    PublishedReceipts: [
      {
        IntermediateHashes: { type: Buffer },
        IntermediateHashesFormatted: { type: String } /** update */,
        BlockHeight: { type: Number },
        ReceiptIndex: { type: Number },
        PublishedIndex: { type: Number },
        Receipt: {
          SenderPublicKey: { type: Buffer },
          SenderPublicKeyFormatted: { type: String } /** update */,
          RecipientPublicKey: { type: Buffer },
          RecipientPublicKeyFormatted: { type: String } /** update */,
          DatumType: { type: Number },
          DatumHash: { type: Buffer },
          ReferenceBlockHeight: { type: Number },
          ReferenceBlockHash: { type: Buffer },
          RMRLinked: { type: Buffer },
          RecipientSignature: { type: Buffer },
        },
      },
    ],

    /** Aggregate */
    TotalRewards: { type: Number },
    TotalRewardsConversion: { type: String },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Blocks', schema)
