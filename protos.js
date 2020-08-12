const { createClient } = require('grpc-pack')

const config = require('./config')

const Block = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'block.proto',
    servicePath: 'service',
    serviceName: 'BlockService',
  },
  config.proto.host
)

const Transaction = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'transaction.proto',
    servicePath: 'service',
    serviceName: 'TransactionService',
  },
  config.proto.host
)

const AccountBalance = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'accountBalance.proto',
    servicePath: 'service',
    serviceName: 'AccountBalanceService',
  },
  config.proto.host
)

const NodeRegistration = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'nodeRegistration.proto',
    servicePath: 'service',
    serviceName: 'NodeRegistrationService',
  },
  config.proto.host
)

const Escrow = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'escrow.proto',
    servicePath: 'service',
    serviceName: 'EscrowTransactionService',
  },
  config.proto.host
)

const MultiSignature = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'multiSignature.proto',
    servicePath: 'service',
    serviceName: 'MultisigService',
  },
  config.proto.host
)

const AccountLedger = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'accountLedger.proto',
    servicePath: 'service',
    serviceName: 'AccountLedgerService',
  },
  config.proto.host
)

const NodeAddressInfo = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'nodeAddressInfo.proto',
    servicePath: 'service',
    serviceName: 'NodeAddressInfoService',
  },
  config.proto.host
)

const PublishedReceipt = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'publishedReceipt.proto',
    servicePath: 'service',
    serviceName: 'PublishedReceiptService',
  },
  config.proto.host
)
const ParticipationScore = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'participationScore.proto',
    servicePath: 'service',
    serviceName: 'ParticipationScoreService',
  },
  config.proto.host
)

module.exports = {
  Block,
  Escrow,
  Transaction,
  AccountLedger,
  MultiSignature,
  AccountBalance,
  NodeAddressInfo,
  NodeRegistration,
  PublishedReceipt,
  ParticipationScore,
}
