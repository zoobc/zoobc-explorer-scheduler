const BaseController = require('./BaseController')
const { BlocksService, TransactionsService, NodesService, AccountsService } = require('../services')

module.exports = class ResetData extends BaseController {
  constructor() {
    super()

    this.nodesService = new NodesService()
    this.blocksService = new BlocksService()
    this.accountsService = new AccountsService()
    this.transactionsService = new TransactionsService()
  }

  resetByHeight(height, callback) {
    this.blocksService.destroies({ Height: { $gte: height } }, (err, result) => {
      if (err) return callback(`[Reset Blocks] Destroy Many ${err}`, { success: false, message: null })
      if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, message: '[Reset Blocks] No reseting data' })
      return callback(null, { success: true, message: `[Reset Blocks] Delete ${result.deletedCount} data successfully` })
    })

    this.transactionsService.destroies({ Height: { $gte: height } }, (err, result) => {
      if (err) return callback(`[Reset Transactions] Destroy Many ${err}`, { success: false, message: null })
      if (result.ok < 1 || result.deletedCount < 1)
        return callback(null, { success: false, message: '[Reset Transactions] No reseting data' })
      return callback(null, { success: true, message: `[Reset Transactions] Delete ${result.deletedCount} data successfully` })
    })

    this.nodesService.destroies({ Height: { $gte: height } }, (err, result) => {
      if (err) return callback(`[Reset Nodes] Destroy Many ${err}`, { success: false, message: null })
      if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, message: '[Reset Nodes] No reseting data' })
      return callback(null, { success: true, message: `[Reset Nodes] Delete ${result.deletedCount} data successfully` })
    })

    this.accountsService.destroies({ Height: { $gte: height } }, (err, result) => {
      if (err) return callback(`[Reset Accounts] Destroy Many ${err}`, { success: false, message: null })
      if (result.ok < 1 || result.deletedCount < 1) return callback(null, { success: false, message: '[Reset Accounts] No reseting data' })
      return callback(null, { success: true, message: `[Reset Accounts] Delete ${result.deletedCount} data successfully` })
    })
  }
}
