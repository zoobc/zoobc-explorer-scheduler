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
    TransactionID: { type: String, index: true } /** ID */,
    Timestamp: { type: Date },
    TransactionType: { type: Number },
    BlockID: { type: String },
    Height: { type: Number },
    Sender: { type: Buffer } /** SenderAccountAddress */,
    SenderFormatted: { type: String } /** update */,
    Recipient: { type: Buffer } /** RecipientAccountAddress */,
    RecipientFormatted: { type: String } /** update */,
    Fee: { type: Number },
    Status: { type: String },
    FeeConversion: { type: String },
    Version: { type: Number } /** additional */,
    TransactionHash: { type: Buffer } /** additional */,
    TransactionHashFormatted: { type: String } /** additional */,
    TransactionBodyLength: { type: Number } /** additional */,
    TransactionBodyBytes: { type: Buffer } /** additional */,
    TransactionIndex: { type: Number } /** additional */,
    MultisigChild: { type: Boolean } /** additional */,
    Signature: { type: Buffer } /** additional */,
    TransactionBody: { type: String },
    Message: { type: Buffer },
    MessageFormatted: { type: String } /** update */,
    /** convertion by transaction body */
    TransactionTypeName: { type: String },
    SendMoney: {
      Amount: { type: Number },
      AmountConversion: { type: String },
    },
    ClaimNodeRegistration: {
      NodePublicKey: { type: Buffer },
      NodePublicKeyFormatted: { type: String },
      ProofOfOwnership: {
        MessageBytes: { type: Buffer },
        Signature: { type: Buffer },
      },
    },
    NodeRegistration: {
      NodePublicKey: { type: Buffer },
      NodePublicKeyFormatted: { type: String },
      AccountAddress: { type: Buffer },
      AccountAddressFormatted: { type: String } /** update */,
      NodeAddress: {
        Address: { type: String },
        Port: { type: Number },
      },
      LockedBalance: { type: Number },
      LockedBalanceConversion: { type: String },
      ProofOfOwnership: {
        MessageBytes: { type: Buffer },
        Signature: { type: Buffer },
      },
    },
    RemoveNodeRegistration: {
      NodePublicKey: { type: Buffer },
      NodePublicKeyFormatted: { type: String },
    },
    UpdateNodeRegistration: {
      NodePublicKey: { type: Buffer },
      NodePublicKeyFormatted: { type: String },
      NodeAddress: {
        Address: { type: String },
        Port: { type: Number },
      },
      LockedBalance: { type: Number },
      LockedBalanceConversion: { type: String },
      ProofOfOwnership: {
        MessageBytes: { type: Buffer },
        Signature: { type: Buffer },
      },
    },
    SetupAccount: {
      SetterAccountAddress: { type: Buffer },
      SetterAccountAddressFormatted: { type: String } /** update */,
      RecipientAccountAddress: { type: Buffer },
      RecipientAccountAddressFormatted: { type: String } /** update */,
      Property: { type: String },
      Value: { type: String },
    },
    RemoveAccount: {
      SetterAccountAddress: { type: Buffer },
      SetterAccountAddressFormatted: { type: String } /** update */,
      RecipientAccountAddress: { type: Buffer },
      RecipientAccountAddressFormatted: { type: String } /** update */,
      Property: { type: String },
      Value: { type: String },
    },
    MultiSignature: {
      UnsignedTransactionBytes: { type: Buffer },
      MultiSignatureInfo: {
        MultisigAddress: { type: Buffer },
        MultisigAddressFormatted: { type: String } /** update */,
        BlockHeight: { type: Number },
        Nonce: { type: String },
        MinimumSignatures: { type: Number },
        Latest: { type: Boolean },
        // Addresses: { type: [String], default: undefined },
        Addresses: { type: [Buffer], default: undefined },
        AddressesFormatted: { type: [String], default: undefined } /** update */,
      },
      SignatureInfo: {
        TransactionHash: { type: Buffer },
        TransactionHashFormatted: { type: String },
        Signatures: { type: Map, of: Buffer },
      },
    },
    ApprovalEscrow: {
      Approval: { type: String },
      TransactionID: { type: String },
    },
    Escrow: {
      ID: { type: String },
      SenderAddress: { type: Buffer },
      SenderAddressFormatted: { type: String } /** update */,
      RecipientAddress: { type: Buffer },
      RecipientAddressFormatted: { type: String } /** update */,
      ApproverAddress: { type: Buffer },
      ApproverAddressFormatted: { type: String } /** update */,
      Amount: { type: Number },
      AmountConversion: { type: String },
      Commission: { type: Number },
      CommissionConversion: { type: String },
      Timeout: { type: String },
      Status: { type: String },
      BlockHeight: { type: Number },
      Latest: { type: Boolean },
      Instruction: { type: String },
    },
    FeeVoteCommit: {
      VoteHash: { type: Buffer },
    },
    FeeVoteReveal: {
      FeeVoteInfo: {
        RecentBlockHash: { type: Buffer },
        RecentBlockHeight: { type: Number } /** update */,
        FeeVote: { type: Number },
      },
      VoterSignature: { type: Buffer },
    },
    LiquidPayment: {
      Amount: { type: Number },
      AmountConversion: { type: String } /** update */,
      CompleteMinutes: { type: Number },
    },
    LiquidPaymentStop: {
      TransactionID: { type: String } /** ID */,
    },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Transactions', schema)
