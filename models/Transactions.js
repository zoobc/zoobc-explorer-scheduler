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
