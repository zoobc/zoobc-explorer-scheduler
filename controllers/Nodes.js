const BaseController = require('./BaseController')
const { store, util } = require('../utils')
const { NodesService } = require('../services')
const { NodeRegistration } = require('../protos')

module.exports = class Nodes extends BaseController {
  constructor() {
    super(new NodesService())
  }

  update(callback) {
    if (store.nodePublicKeys.length < 1) return callback(null, { success: false, message: '[Nodes] No additional data' })
    const addNodePublicKeys = store.nodePublicKeys.filter(f => f.TransactionType === 'Upsert').map(m => m.NodePublicKey)
    const delNodePublicKeys = store.nodePublicKeys.filter(f => f.TransactionType === 'Remove').map(m => m.NodePublicKey)

    const addNodes =
      addNodePublicKeys.length > 0
        ? addNodePublicKeys.map(nodePublicKey => {
            return new Promise((resolve, reject) => {
              NodeRegistration.GetNodeRegistration({ NodePublicKey: nodePublicKey }, (err, resp) => {
                if (err) return reject(`[Nodes] Proto Node Registration - Get Node Registration ${err}`, null)
                if (resp && resp.NodeRegistration && resp.NodeRegistration === {}) return resolve({ count: 0, type: 'upsert' })

                const items = [
                  {
                    NodeID: resp.NodeRegistration.NodeID,
                    NodePublicKey: util.bufferStr(resp.NodeRegistration.NodePublicKey),
                    OwnerAddress: resp.NodeRegistration.AccountAddress,
                    NodeAddress: resp.NodeRegistration.NodeAddress,
                    LockedFunds: resp.NodeRegistration.LockedBalance,
                    RegisteredBlockHeight: resp.NodeRegistration.RegistrationHeight,
                    ParticipationScore: null,
                    RegistryStatus: resp.NodeRegistration.RegistrationStatus,
                    BlocksFunds: null,
                    RewardsPaid: null,
                    RewardsPaidConversion: null,
                    Latest: resp.NodeRegistration.Latest,
                    Height: resp.NodeRegistration.Height,
                  },
                ]
                const matchs = ['NodeID', 'NodePublicKey']
                this.service.upserts(items, matchs, (err, result) => {
                  if (err) return reject(`[Nodes] Nodes Service - Upsert ${err}`)
                  if (result && result.ok !== 1) return resolve({ count: 0, type: 'upsert' })
                  return resolve({ count: items.length, type: 'upsert' })
                })
              })
            })
          })
        : { count: 0, type: 'upsert' }

    const delNodes =
      delNodePublicKeys.length > 0
        ? new Promise((resolve, reject) => {
            this.service.destroies({ NodePublicKey: { $in: delNodePublicKeys } }, (err, result) => {
              if (err) return reject(`[Nodes] Nodes Service - Destroy Many ${err}`, null)
              if (result.deletedCount < 1) return resolve({ count: 0, type: 'remove' })
              return resolve({ count: result.deletedCount, type: 'remove' })
            })
          })
        : { count: 0, type: 'remove' }

    let nodes = []
    nodes.push(delNodes)
    if (Array.isArray(addNodes)) {
      addNodes.forEach(addNode => {
        nodes.push(addNode)
      })
    } else {
      nodes.push(addNodes)
    }

    Promise.all(nodes)
      .then(results => {
        const countAdd = results
          .filter(f => f.type === 'upsert')
          .map(m => m.count)
          .reduce((prev, curr) => parseInt(prev) + parseInt(curr), 0)
        const countDel = results
          .filter(f => f.type === 'remove')
          .map(m => m.count)
          .reduce((prev, curr) => parseInt(prev) + parseInt(curr), 0)

        if (countAdd < 1 && countDel < 1) return callback(null, { success: false, message: '[Nodes] No additional data' })
        return callback(null, { success: true, message: `[Nodes] Upsert ${countAdd} and delete ${countDel} data successfully` })
      })
      .catch(error => callback(`[Nodes] Upsert ${error}`, { success: false, message: null }))
  }
}
