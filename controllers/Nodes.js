const config = require('../config')
const BaseController = require('./BaseController')
const { NodeRegistration } = require('../protos')
const { queue, util, response, ipstack } = require('../utils')
const { NodesService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Nodes extends BaseController {
  constructor() {
    super(new NodesService())
    this.generalsService = new GeneralsService()
    this.transactionsService = new TransactionsService()

    /** queue */
    this.queue = queue.create('Queue Nodes')
    this.processing()
    this.queue.on('completed', (job, result) => {
      if (result && !util.isObjEmpty(result)) util.log(result)
    })
  }

  processing() {
    this.queue.process(async job => {
      const params = job.data
      /** send message telegram bot if avaiable */
      if (!params) return response.sendBotMessage('Nodes', '[Nodes] Processing - Invalid params')

      return new Promise(resolve => {
        job.progress(25)
        NodeRegistration.GetNodeRegistration(params, async (err, res) => {
          if (err)
            return resolve(
              /** send message telegram bot if avaiable */
              response.sendBotMessage(
                'Nodes',
                `[Nodes] Proto Get Node Registration - ${err}`,
                `- Params : <pre>${JSON.stringify(params)}</pre>`
              )
            )

          if (res && util.isObjEmpty(res.NodeRegistration)) return resolve(response.setResult(false, `[Nodes] No additional data`))

          /** additional detail node address */
          const resIpStack =
            res.NodeRegistration && res.NodeRegistration.NodeAddress && res.NodeRegistration.NodeAddress.Address
              ? await ipstack.get(res.NodeRegistration.NodeAddress.Address)
              : null
          const IpAddress = resIpStack ? resIpStack.ip : null
          const CountryCode = resIpStack ? resIpStack.country_code : null
          const CountryName = resIpStack ? resIpStack.country_name : null
          const RegionCode = resIpStack ? resIpStack.region_code : null
          const RegionName = resIpStack ? resIpStack.region_name : null
          const City = resIpStack ? resIpStack.city : null
          const Latitude = resIpStack ? resIpStack.latitude : null
          const Longitude = resIpStack ? resIpStack.longitude : null
          const CountryFlagUrl = resIpStack ? resIpStack.location.country_flag : null
          const CountryFlagEmoji = resIpStack ? resIpStack.location.country_flag_emoji : null

          job.progress(50)
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
              IpAddress,
              CountryCode,
              CountryName,
              RegionCode,
              RegionName,
              City,
              Latitude,
              Longitude,
              CountryFlagUrl,
              CountryFlagEmoji,
            },
          ]

          this.service.upserts(payloads, ['NodeID', 'NodePublicKey'], (err, res) => {
            /** send message telegram bot if avaiable */
            if (err) return resolve(response.sendBotMessage('Nodes', `[Nodes] Upsert - ${err}`))
            if (res && res.result.ok !== 1) return resolve(response.setError(`[Nodes] Upsert data failed`))

            job.progress(100)
            return resolve(response.setResult(true, `[Nodes] Upsert ${payloads.length} data successfully`))
          })
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
      // const lastCheckTransactionHeight = parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0
      const lastCheck = await this.generalsService.getSetLastCheck()

      /** return message if last height node greather than equal last check height transaction  */
      if (lastNodeHeight > 0 && lastNodeHeight >= lastCheck.Height) return callback(response.setResult(false, '[Nodes] No additional data'))

      /** get node registrations with range height */
      this.transactionsService.getNodePublicKeysByHeights(lastNodeHeight, lastCheck.Height, (err, res) => {
        /** send message telegram bot if avaiable */
        if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Transactions Service - Get Nodes ${err}`))
        if (!res) return callback(response.setResult(false, '[Nodes] No additional data'))
        if (res && res.length < 1) return callback(response.setResult(false, '[Nodes] No additional data'))

        /** adding  multi jobs to the queue with with params nodes public key */
        let count = 0
        res.forEach(nodePublicKey => {
          count++
          const params = { NodePublicKey: nodePublicKey }
          this.queue.add(params, config.queue.optJob)
        })

        return callback(response.setResult(true, `[Queue] ${count} Nodes on processing`))
      })
    })
  }
}
