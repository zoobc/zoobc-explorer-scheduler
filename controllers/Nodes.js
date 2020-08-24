const moment = require('moment')
const BaseController = require('./BaseController')
const { util, response } = require('../utils')
const { NodeRegistration } = require('../protos')
const { NodesService, GeneralsService, BlocksService } = require('../services')

const formatDate = 'DD MMM YYYY hh:mm:ss'

module.exports = class Nodes extends BaseController {
  constructor() {
    super(new NodesService())
    this.blocksService = new BlocksService()
    this.generalsService = new GeneralsService()
  }

  update(callback) {
    const getTotalNode = params => {
      return new Promise(resolve => {
        NodeRegistration.GetNodeRegistrations(params, async (err, res) => {
          if (err) return resolve(0)
          return resolve(parseInt(res.Total))
        })
      })
    }

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

      /** checking total node to adding params limit request data */
      let params = { MinRegistrationHeight: lastNodeHeight, MaxRegistrationHeight: lastCheck.Height, Pagination: { Limit: 100 } }
      const totalNode = await getTotalNode(params)
      if (totalNode > params.Pagination.Limit) params.Pagination.Limit = totalNode

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
        const promises = res.NodeRegistrations.map(item => {
          return new Promise(resolve => {
            this.blocksService.getTimestampByHeight({ Height: item.RegistrationHeight }, (err, res) => {
              if (err) return resolve({ err, res: null })
              return resolve({
                err: null,
                res: {
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
                  RegistrationTime: moment(res.Timestamp).valueOf(),
                },
              })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const payloads = results.filter(f => f.res !== null).map(i => i.res)

        if (payloads && payloads.length < 1 && errors.length < 1) return callback(response.setResult(false, `[Nodes] No additional data`))

        if (errors && errors.length > 0) {
          errors.forEach(i => {
            /** send message telegram bot if avaiable */
            return callback(response.sendBotMessage('Nodes', `[Nodes] Upsert - ${JSON.stringify(i.err)}`))
          })
        }

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
