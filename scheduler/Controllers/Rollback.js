const BaseController = require('./BaseController');
const { Block } = require('../Protos');
const { BlocksService, TransactionsService, NodesService, AccountsService, AccountTransactionsService } = require('../../api/services');

module.exports = class Rollback extends BaseController {
  constructor() {
    super();

    this.nodesService = new NodesService();
    this.blocksService = new BlocksService();
    this.accountsService = new AccountsService();
    this.transactionsService = new TransactionsService();
    this.accountTransactionsService = new AccountTransactionsService();
  }

  checking(callback) {
    this.blocksService.getLastHeight(async (err, result) => {
      if (err) return callback(`[Rollback] Blocks Service - Get Last Height ${err}`, { success: false, info: null });
      if (!result || !result.Height) return callback(null, { success: false, info: null });

      const Limit = 800;
      const Height = parseInt(result.Height) - Limit < 1 ? 1 : parseInt(result.Height) - Limit;
      this.recursiveBlockHeight(Limit, Height, (err, result) => {
        if (err) return callback(err, { success: false, info: null });
        if (!result) return callback(null, { success: false, info: null });

        this.blocksService.destroyMany({ Height: { $gte: result.Height } }, (err, result) => {
          if (err) return callback(`[Rollback] Blocks Service - Destroy Many ${err}`, { success: false, info: null });
          if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, info: 'Blocks' });
          return callback(null, { success: true, info: `[Rollback - Blocks] Delete ${result.deletedCount} data successfully` });
        });

        this.transactionsService.destroyMany({ Height: { $gte: result.Height } }, (err, result) => {
          if (err) return callback(`[Rollback] Transactions Service - Destroy Many ${err}`, { success: false, info: null });
          if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, info: 'Transactions' });
          return callback(null, { success: true, info: `[Rollback - Transactions] Delete ${result.deletedCount} data successfully` });
        });

        this.nodesService.destroyMany({ Height: { $gte: result.Height } }, (err, result) => {
          if (err) return callback(`[Rollback] Nodes Service - Destroy Many ${err}`, { success: false, info: null });
          if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, info: 'Nodes' });
          return callback(null, { success: true, info: `[Rollback - Nodes] Delete ${result.deletedCount} data successfully` });
        });

        this.accountsService.destroyMany({ BlockHeight: { $gte: result.Height } }, (err, result) => {
          if (err) return callback(`[Rollback] Accounts Service - Destroy Many ${err}`, { success: false, info: null });
          if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, info: 'Accounts' });
          return callback(null, { success: true, info: `[Rollback - Accounts] Delete ${result.deletedCount} data successfully` });
        });

        this.accountTransactionsService.destroyMany({ BlockHeight: { $gte: result.Height } }, (err, result) => {
          if (err) return callback(`[Rollback] Accounts Service - Destroy Many ${err}`, { success: false, info: null });
          if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, info: 'Account Transactions' });
          return callback(null, {
            success: true,
            info: `[Rollback - Account Transactions] Delete ${result.deletedCount} data successfully`,
          });
        });
      });
    });
  }

  recursiveBlockHeight(limit, height, callback) {
    if (height < 1) return callback(null, null);

    Block.GetBlocks({ Limit: limit, Height: height }, (err, result) => {
      if (err) return callback(`[Rollback] Block - Get Blocks ${err}`);
      if (result && result.Blocks && result.Blocks.length < 1) {
        const prevHeight = height - limit;
        return this.recursiveBlockHeight(limit, prevHeight, callback);
      }

      this.blocksService.getFromHeight({ Limit: limit, Height: height }, (err, results) => {
        if (err) return callback(`[Rollback] Blocks Service - Get From Height ${err}`, null);
        if (results && results.length < 1) {
          const prevHeight = height - limit;
          return this.recursiveBlockHeight(limit, prevHeight, callback);
        }

        const resultsCore = result.Blocks.map(item => ({
          BlockID: item.Block.ID,
          Height: item.Block.Height,
        })).sort((a, b) => (a.Height > b.Height ? 1 : -1));

        const resultsExplorer = results
          .map(item => ({ BlockID: item.BlockID, Height: item.Height }))
          .sort((a, b) => (a.Height > b.Height ? 1 : -1));

        const diffs = resultsCore.filter(({ BlockID: val1 }) => !resultsExplorer.some(({ BlockID: val2 }) => val2 === val1));
        if (diffs && diffs.length < 1) {
          const prevHeight = height - limit;
          return this.recursiveBlockHeight(limit, prevHeight, callback);
        }

        const diff = Array.isArray(diffs) ? diffs[0] : diffs;
        return callback(null, diff);
      });
    });
  }
};
