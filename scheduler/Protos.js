const config = require('../config/config');
const { createClient } = require('grpc-pack');

const Block = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'block.proto',
    servicePath: 'service',
    serviceName: 'BlockService',
  },
  config.proto.host
);

const Transaction = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'transaction.proto',
    servicePath: 'service',
    serviceName: 'TransactionService',
  },
  config.proto.host
);

const AccountBalance = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'accountBalance.proto',
    servicePath: 'service',
    serviceName: 'AccountBalanceService',
  },
  config.proto.host
);

const NodeRegistration = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'nodeRegistration.proto',
    servicePath: 'service',
    serviceName: 'NodeRegistrationService',
  },
  config.proto.host
);

const HealthCheck = createClient(
  {
    protoPath: config.proto.path,
    protoName: 'healthCheck.proto',
    servicePath: 'service',
    serviceName: 'HealthCheckService',
  },
  config.proto.host
);

module.exports = { Block, Transaction, AccountBalance, NodeRegistration, HealthCheck };
