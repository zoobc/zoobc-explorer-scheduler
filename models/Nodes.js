const mongoose = require('mongoose')
const { upserts } = require('../utils')

const schema = new mongoose.Schema(
  {
    NodeID: { type: String },
    NodePublicKey: { type: String },
    OwnerAddress: { type: String } /** AccountAddress */,
    NodeAddress: { type: Object },
    LockedFunds: { type: String } /** LockedBalance */,
    RegisteredBlockHeight: { type: Number } /** RegistrationHeight */,
    ParticipationScore: { type: Number } /** ..waiting core */,
    RegistryStatus: { type: Number } /** Queued */,
    BlocksFunds: { type: Number } /** ..waiting core */,
    RewardsPaid: { type: Number } /** ..waiting core */,
    RewardsPaidConversion: { type: String },
    Latest: { type: Boolean },
    Height: { type: Number },
    Blocks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blocks' }],
    /** additional detail node address */
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
  },
  {
    toJSON: { virtuals: true },
  }
)

schema.plugin(upserts)

module.exports = mongoose.model('Nodes', schema)
