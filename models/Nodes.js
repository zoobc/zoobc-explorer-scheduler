const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    NodeID: { type: String },
    NodePublicKey: { type: String },
    OwnerAddress: { type: String } /** AccountAddress */,
    RegisteredBlockHeight: { type: Number } /** RegistrationHeight */,
    LockedFunds: { type: String } /** LockedBalance */,
    RegistrationStatus: { type: Number },
    Latest: { type: Boolean },
    Height: { type: Number },
    ParticipationScore: { type: String },
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
