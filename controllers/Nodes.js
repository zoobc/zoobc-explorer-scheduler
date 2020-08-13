const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { NodeRegistration } = require('../protos')
const { NodesService, GeneralsService } = require('../services')

module.exports = class Nodes extends BaseController {
  constructor() {
    super(new NodesService())
    this.generalsService = new GeneralsService()
  }

  update(callback) {
    /** get last height node (local) */
    this.service.getLastRegisteredHeight(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Nodes Service - Get Last Height ${err}`))

      /** set variable last height node */
      const lastNodeHeight = res ? parseInt(res.RegisteredBlockHeight + 1) : 0

      /** getting value last check height transaction */
      const lastCheck = await this.generalsService.getSetLastCheck()

      /** return message if last check is null */
      if (!lastCheck) return callback(response.setResult(false, '[Nodes] No additional data'))

      /** return message if last height node greather than equal last check height transaction  */
      if (lastNodeHeight > 0 && lastNodeHeight >= lastCheck.Height) return callback(response.setResult(false, '[Nodes] No additional data'))

      const params = { MinRegistrationHeight: lastNodeHeight, MaxRegistrationHeight: lastCheck.Height }
      NodeRegistration.GetNodeRegistrations(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Nodes',
              `[Nodes] Proto Get Node Registrations - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeRegistrations && res.NodeRegistrations.length < 1)
          return callback(response.setResult(false, `[Nodes] No additional data`))

        /** mapping data and additional info */
        const payloads = res.NodeRegistrations.map(item => {
          return {
            NodeID: item.NodeID,
            NodePublicKey: util.bufferStr(item.NodePublicKey),
            OwnerAddress: item.AccountAddress,
            RegisteredBlockHeight: item.RegistrationHeight,
            LockedFunds: util.zoobitConversion(item.LockedBalance),
            RegistrationStatus: item.RegistrationStatus,
            Latest: item.Latest,
            Height: item.Height,
            NodeAddressInfo: item.NodeAddressInfo,
            ParticipationScore: null,
            /** waiting core */
            BlocksFunds: null,
            RewardsPaid: null,
            RewardsPaidConversion: null,
            /** additional detail node address */
            IpAddress: null,
            CountryCode: null,
            CountryName: null,
            RegionCode: null,
            RegionName: null,
            City: null,
            Latitude: null,
            Longitude: null,
            CountryFlagUrl: null,
            CountryFlagEmoji: null,
          }
        })

        this.service.upserts(payloads, ['NodeID', 'NodePublicKey'], (err, res) => {
          /** send message telegram bot if avaiable */
          if (err) return callback(response.sendBotMessage('Nodes', `[Nodes] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError(`[Nodes] Upsert data failed`))

          return callback(response.setResult(true, `[Nodes] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
