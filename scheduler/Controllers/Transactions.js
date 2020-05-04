/* eslint-disable indent */
const moment = require('moment');
const store = require('./Store');
const BaseController = require('./BaseController');
const { Transaction } = require('../Protos');
const { Converter } = require('../../utils');
const { BlocksService, TransactionsService } = require('../../api/services');

module.exports = class Transactions extends BaseController {
  constructor() {
    super(new TransactionsService());
    this.blocksService = new BlocksService();
  }

  update(callback) {
    if (!store.blocksAddition) return callback(null, null);
    store.nodePublicKeys = [];
    store.accountTransactions = [];

    this.service.getLastHeight((err, result) => {
      if (err) return callback(`[Transactions] Transactions Service - Get Last Height ${err}`, null);

      if (!result) {
        const height = 0;
        this.recursiveUpsertTransactions(height, height, (err, result) => {
          if (err) return callback(err, null);
          if (!result) return callback(null, null);
          return callback(null, result);
        });
      } else {
        const lastHeightTransaction = result.Height;

        this.blocksService.getLastHeight((err, result) => {
          if (err) return callback(err, null);
          if (!result) return callback(null, null);

          const lastHeightBlock = result.Height;
          this.recursiveUpsertTransactions(lastHeightTransaction + 1, lastHeightBlock, (err, result) => {
            if (err) return callback(err, null);
            if (!result) return callback(null, null);
            return callback(null, result);
          });
        });
      }
    });
  }

  recursiveUpsertTransactions(heightStart, heightEnd, callback) {
    if (heightStart > heightEnd) return callback(null, null);
    if (heightStart === heightEnd) {
      this.upsertTransactions(heightStart, (err, result) => {
        if (err) return callback(err, null);
        if (result < 1) return callback(null, null);
        return callback(null, `[Transactions] Upsert ${result} data successfully`);
      });
      return;
    }

    let transactions = [];
    for (let height = heightStart; height < heightEnd; height++) {
      const transaction = new Promise((resolve, reject) => {
        this.upsertTransactions(height, (err, result) => {
          if (err) return reject(err);
          if (result < 1) return resolve(0);
          return resolve(result);
        });
      });
      transactions.push(transaction);
    }

    Promise.all(transactions)
      .then(results => {
        const count = results.reduce((prev, curr) => {
          return parseInt(prev) + parseInt(curr);
        }, 0);

        if (count < 1) return callback(null, null);
        return callback(null, `[Transactions] Upsert ${count} data successfully`);
      })
      .catch(error => callback(error, null));
  }

  upsertTransactions(height, callback) {
    const params = { Height: height, Pagination: { OrderField: 'block_height', OrderBy: 'ASC' } };
    Transaction.GetTransactions(params, (err, result) => {
      if (err) return callback(`[Transactions] Get Transactions ${err}`, null);
      if (result && result.Transactions && result.Transactions.length < 1) return callback(null, null);

      let nodePublicKeys = [];

      const results = result.Transactions.filter(item => item.Height === height);
      const items = results.map(item => {
        store.accountTransactions.push({
          SenderAccountAddress: item.SenderAccountAddress,
          RecipientAccountAddress: item.RecipientAccountAddress,
          Fee: parseInt(item.Fee),
          FeeConversion: Converter.zoobitConversion(parseInt(item.Fee)),
          Amount: item.TransactionType === 1 ? parseInt(item.sendMoneyTransactionBody.Amount) : 0,
          AmountConversion: item.TransactionType === 1 ? Converter.zoobitConversion(parseInt(item.sendMoneyTransactionBody.Amount)) : 0,
          BlockHeight: item.Height,
          Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
          // Transaction: item,
        });

        let sendMoney = null;
        let claimNodeRegistration = null;
        let nodeRegistration = null;
        let removeNodeRegistration = null;
        let updateNodeRegistration = null;
        let setupAccount = null;
        let removeAccount = null;
        let transactionTypeName = '';
        switch (item.TransactionType) {
          case 1:
            sendMoney = {
              Amount: item.sendMoneyTransactionBody.Amount,
              AmountConversion: Converter.zoobitConversion(item.sendMoneyTransactionBody.Amount),
            };
            transactionTypeName = 'Send Money';
            break;
          case 2:
            nodeRegistration = {
              NodePublicKey: Converter.bufferStr(item.nodeRegistrationTransactionBody.NodePublicKey),
              AccountAddress: item.nodeRegistrationTransactionBody.AccountAddress,
              NodeAddress: item.nodeRegistrationTransactionBody.NodeAddress,
              LockedBalance: item.nodeRegistrationTransactionBody.LockedBalance,
              LockedBalanceConversion: Converter.zoobitConversion(item.nodeRegistrationTransactionBody.LockedBalance),
              ProofOfOwnership: item.nodeRegistrationTransactionBody.ProofOfOwnership,
            };
            transactionTypeName = 'Node Registration';
            nodePublicKeys.push({
              NodePublicKey: Converter.bufferStr(item.nodeRegistrationTransactionBody.NodePublicKey),
              TransactionType: 'Upsert',
            });
            break;
          case 3:
            setupAccount = item.setupAccountDatasetTransactionBody;
            transactionTypeName = 'Setup Account';
            break;
          case 258:
            updateNodeRegistration = {
              NodePublicKey: Converter.bufferStr(item.updateNodeRegistrationTransactionBody.NodePublicKey),
              NodeAddress: item.updateNodeRegistrationTransactionBody.NodeAddress,
              LockedBalance: item.updateNodeRegistrationTransactionBody.LockedBalance,
              LockedBalanceConversion: Converter.zoobitConversion(item.updateNodeRegistrationTransactionBody.LockedBalance),
              ProofOfOwnership: item.updateNodeRegistrationTransactionBody.ProofOfOwnership,
            };
            transactionTypeName = 'Update Node Registration';
            nodePublicKeys.push({
              NodePublicKey: Converter.bufferStr(item.updateNodeRegistrationTransactionBody.NodePublicKey),
              TransactionType: 'Upsert',
            });
            break;
          case 259:
            removeAccount = item.removeAccountDatasetTransactionBody;
            transactionTypeName = 'Remove Account';
            break;
          case 514:
            removeNodeRegistration = {
              NodePublicKey: Converter.bufferStr(item.removeNodeRegistrationTransactionBody.NodePublicKey),
            };
            transactionTypeName = 'Remove Node Registration';
            nodePublicKeys.push({
              NodePublicKey: Converter.bufferStr(item.removeNodeRegistrationTransactionBody.NodePublicKey),
              TransactionType: 'Remove',
            });
            break;
          case 770:
            claimNodeRegistration = {
              NodePublicKey: Converter.bufferStr(item.claimNodeRegistrationTransactionBody.NodePublicKey),
              AccountAddress: item.claimNodeRegistrationTransactionBody.AccountAddress,
              ProofOfOwnership: item.claimNodeRegistrationTransactionBody.ProofOfOwnership,
            };
            transactionTypeName = 'Claim Node Registration';
            nodePublicKeys.push({
              NodePublicKey: Converter.bufferStr(item.claimNodeRegistrationTransactionBody.NodePublicKey),
              TransactionType: 'Remove',
            });
            break;
          default:
            transactionTypeName = 'Empty';
            break;
        }

        return {
          TransactionID: item.ID,
          Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
          TransactionType: item.TransactionType,
          BlockID: item.BlockID,
          Height: item.Height,
          Sender: item.SenderAccountAddress,
          Recipient: item.RecipientAccountAddress,
          Confirmations: null,
          Fee: item.Fee,
          FeeConversion: Converter.zoobitConversion(item.Fee),
          Version: item.Version,
          TransactionHash: item.TransactionHash,
          TransactionBodyLength: item.TransactionBodyLength,
          TransactionBodyBytes: item.TransactionBodyBytes,
          TransactionIndex: item.TransactionIndex,
          Signature: item.Signature,
          TransactionBody: item.TransactionBody,
          TransactionTypeName: transactionTypeName,
          SendMoney: sendMoney,
          ClaimNodeRegistration: claimNodeRegistration,
          NodeRegistration: nodeRegistration,
          RemoveNodeRegistration: removeNodeRegistration,
          UpdateNodeRegistration: updateNodeRegistration,
          SetupAccount: setupAccount,
          RemoveAccount: removeAccount,
        };
      });

      store.nodePublicKeys = nodePublicKeys.filter((v, i) => nodePublicKeys.indexOf(v) === i);

      const matchs = ['TransactionID', 'Height'];
      this.service.upsert(items, matchs, (err, result) => {
        if (err) return callback(`[Transactions - Height ${height}] Upsert ${err}`, null);
        if (result && result.result.ok !== 1) return callback(`[Transactions - Height ${height}] Upsert data failed`, null);

        const publishTransactions = items
          .slice(0, 5)
          .sort((a, b) => (a.Height > b.Height ? -1 : 1))
          .map(m => {
            return {
              TransactionID: m.TransactionID,
              Timestamp: m.Timestamp,
              FeeConversion: m.FeeConversion,
            };
          });

        return callback(null, { data: publishTransactions, message: `[Transactions] Upsert ${items.length} data successfully` });
      });
    });
  }
};
