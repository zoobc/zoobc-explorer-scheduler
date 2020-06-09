const BaseController = require('./BaseController')
const { NodeRegistration } = require('../protos')
const { store, queue, util, response } = require('../utils')
const { NodesService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Nodes extends BaseController {
  constructor() {
    super(new NodesService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()
  }

  static synchronize(service, params) {
    /** send message telegram bot if avaiable */
    if (!params) return response.sendBotMessage('Nodes', '[Nodes] Synchronize - Invalid params')

    return new Promise(resolve => {
      NodeRegistration.GetNodeRegistration(params, (err, res) => {
        if (err)
          return resolve(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Nodes',
              `[Nodes] Proto Get Node Registration - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )
        if (res && util.isObjEmpty(res.NodeRegistration)) return resolve(null)
        if (res && util.isObjEmpty(res.NodeRegistration)) return resolve(response.setResult(false, `[Nodes] No additional data`))

        const payloads = [
          {
            NodeID: res.NodeRegistration.NodeID,
            NodePublicKey: util.bufferStr(res.NodeRegistration.NodePublicKey),
            OwnerAddress: res.NodeRegistration.AccountAddress,
            NodeAddress: res.NodeRegistration.NodeAddress,
            LockedFunds: util.zoobitConversion(res.NodeRegistration.LockedBalance),
            RegisteredBlockHeight: res.NodeRegistration.RegistrationHeight,
            RegistryStatus: res.NodeRegistration.RegistrationStatus,
            BlocksFunds: null, // TODO: on progress
            RewardsPaid: null, // TODO: on progress
            ParticipationScore: null, // TODO: on progress
            RewardsPaidConversion: null, // TODO: on progress
            Latest: res.NodeRegistration.Latest,
            Height: res.NodeRegistration.Height,
          },
        ]
        service.upserts(payloads, ['NodeID', 'NodePublicKey'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return resolve(response.sendBotMessage('Nodes', `[Nodes] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return resolve(response.setError(`[Nodes] Upsert data failed`))
          return resolve(response.setResult(true, `[Nodes] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }

  update(callback) {
    /** get last height node (local) */
    this.service.getLastHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Nodes Service - Get Last Height ${err}`))

      /** set variable last height node */
      const lastNodeHeight = res ? parseInt(res.RegisteredBlockHeight + 1) : 0

      /** getting value last check height transaction */
      const lastCheckTransactionHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

      /** return message if last height node greather than equal last check height transaction  */
      if (lastNodeHeight > 0 && lastNodeHeight >= lastCheckTransactionHeight)
        return callback(response.setResult(false, '[Nodes] No additional data'))

      /** get node registrations with range height */
      this.transactionsService.getNodePublicKeysByHeights(lastNodeHeight, lastCheckTransactionHeight, (err, res) => {
        /** send message telegram bot if avaiable */
        if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Transactions Service - Get Nodes ${err}`))
        if (!res) return callback(response.setResult(false, '[Nodes] No additional data'))
        if (res && res.length < 1) return callback(response.setResult(false, '[Nodes] No additional data'))

        /** initiating the queue */
        queue.init('Queue Nodes')

        /** adding  multi jobs to the queue with with params nodes public key */
        let count = 0
        res.forEach(nodePublicKey => {
          count++
          const params = { NodePublicKey: nodePublicKey }
          queue.addJob(params)
        })

        /** processing job the queue */
        queue.processJob(Nodes.synchronize, this.service)

        return callback(response.setResult(true, `[Queue] ${count} Nodes on processing`))
      })
    })
  }
}
