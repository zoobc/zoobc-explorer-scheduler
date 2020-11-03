const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    TransactionID: { type: String } /** ID */,
    Timestamp: { type: Date },
    TransactionType: { type: Number },
    BlockID: { type: String },
    Height: { type: Number },
    Sender: { type: Buffer } /** SenderAccountAddress */,
    SenderFormatted: { type: String },
    Recipient: { type: Buffer } /** RecipientAccountAddress */,
    RecipientFormatted: { type: String },
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
    Message: { type: Buffer } /** additional */,
    TransactionBody: { type: String },
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
      AccountAddress: { type: String },
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
      SetterAccountAddress: { type: String },
      RecipientAccountAddress: { type: String },
      Property: { type: String },
      Value: { type: String },
    },
    RemoveAccount: {
      SetterAccountAddress: { type: String },
      RecipientAccountAddress: { type: String },
      Property: { type: String },
      Value: { type: String },
    },
    MultiSignature: {
      MultiSignatureInfo: {
        MultisigAddress: { type: String },
        BlockHeight: { type: Number },
        Nonce: { type: String },
        MinimumSignatures: { type: Number },
        Latest: { type: Boolean },
        Addresses: {
          type: [String],
          default: undefined,
        },
      },
      UnsignedTransactionBytes: { type: Buffer },
      SignatureInfo: {
        TransactionHash: { type: Buffer },
        TransactionHashFormatted: { type: String },
        Signatures: {
          type: Map,
          of: Buffer,
        },
      },
    },
    ApprovalEscrow: {
      Approval: { type: String },
      TransactionID: { type: String },
    },
    Escrow: {
      ID: { type: String },
      SenderAddress: { type: String },
      RecipientAddress: { type: String },
      ApproverAddress: { type: String },
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
    FeeVoteRevealTransactionBody: {
      FeeVoteInfo: {
        RecentBlockHash: { type: Buffer },
        RecentBlockHeight: { type: Buffer },
        FeeVote: { type: Number },
      },
      VoterSignature: { type: Buffer },
    },
    LiquidPaymentTransactionBody: {
      Amount: { type: Number },
      CompleteMinutes: { type: Number },
    },
    LiquidPaymentStopTransactionBody: {
      TransactionID: { type: String } /** ID */,
    },
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Transactions', schema)
