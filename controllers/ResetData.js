const BaseController = require('./BaseController')
const { store } = require('../utils')
const { BlocksService, TransactionsService, NodesService, AccountsService, GeneralsService } = require('../services')

module.exports = class ResetData extends BaseController {
  constructor() {
    super()
    this.nodesService = new NodesService()
    this.blocksService = new BlocksService()
    this.accountsService = new AccountsService()
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
  }

  static getServiceName(service) {
    switch (service.name) {
      case 'BlocksService':
        return 'Reset Blocks'
      case 'TransactionsService':
        return 'Reset Transactions'
      case 'NodesService':
        return 'Reset Nodes'
      case 'AccountsService':
        return 'Reset Accounts'
      default:
        return 'Reset Unknow Service'
    }
  }

  static resetter(service, params, callback) {
    const head = ResetData.getServiceName(service)
    service.destroies(params, (err, res) => {
      if (err) return callback(`[${head}] Destroy Many ${err}`, { success: false, message: null })
      if (res.ok < 1 || res.deletedCount < 1) return callback(null, { success: false, message: `[${head}] No reseting data` })
      return callback(null, { success: true, message: `[${head}] Delete ${res.deletedCount} data successfully` })
    })
  }

  async resetByServiceName(name, height) {
    const lastCheckHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0
    if (parseInt(lastCheckHeight) > parseInt(height)) this.generalsService.setValueByKey(store.keyLastCheckTransactionHeight, height)

    switch (name) {
      case 'BlocksService':
        return new Promise(resolve => {
          ResetData.resetter(this.blocksService, { Height: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'TransactionsService':
        return new Promise(resolve => {
          ResetData.resetter(this.transactionsService, { Height: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'NodesService':
        return new Promise(resolve => {
          ResetData.resetter(this.nodesService, { RegisteredBlockHeight: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      case 'AccountsService':
        return new Promise(resolve => {
          ResetData.resetter(this.accountsService, { TransactionHeight: { $gte: height } }, (error, result) => {
            return resolve({ error, result })
          })
        })
      default:
        return { error: '[Reset] Unknow service name', result: { success: false, message: null } }
    }
  }

  async resetAllByHeight(height = 0) {
    const lastCheckHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0
    if (parseInt(lastCheckHeight) > parseInt(height)) this.generalsService.setValueByKey(store.keyLastCheckTransactionHeight, height)

    const promiseBlocks = new Promise(resolve => {
      ResetData.resetter(this.blocksService, { Height: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseTransactions = new Promise(resolve => {
      ResetData.resetter(this.transactionsService, { Height: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseNodes = new Promise(resolve => {
      ResetData.resetter(this.nodesService, { RegisteredBlockHeight: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    const promiseAccounts = new Promise(resolve => {
      ResetData.resetter(this.accountsService, { TransactionHeight: { $gte: height } }, (error, result) => {
        return resolve({ error, result })
      })
    })

    return Promise.all([promiseBlocks, promiseTransactions, promiseNodes, promiseAccounts])
  }

  resetAll() {
    return this.resetAllByHeight(0)
  }
}
