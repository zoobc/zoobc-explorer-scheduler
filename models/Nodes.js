const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    NodeID: { type: String },
    NodePublicKey: { type: String },
    OwnerAddress: { type: String } /** AccountAddress */,
    NodeAddress: { type: Object },
    LockedFunds: { type: String } /** LockedBalance */,
    ParticipationScore: { type: Number } /** ..waiting core */,
    RegistryStatus: { type: Number } /** Queued */,
    BlocksFunds: { type: Number } /** ..waiting core */,
    RewardsPaid: { type: Number } /** ..waiting core */,
    RewardsPaidConversion: { type: String },
    Latest: { type: Boolean },
    Height: { type: Number },
    /** additional detail node address */
    RegisteredBlockHeight: { type: Number } /** RegistrationHeight */,
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
