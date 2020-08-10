const BaseController = require('./BaseController')
const { NodesService } = require('../services')
const { NodeAddressInfo } = require('../protos')
const { response, ipstack } = require('../utils')

module.exports = class NodeAddress extends BaseController {
  constructor() {
    super(new NodesService())
  }

  async update(callback) {
    this.service.getNodeIds((err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('NodeAddress', `[Node Address] Nodes Service - Get Node IDs ${err}`))
      if (res && res.length < 1) return callback(response.setResult(false, '[Node Address] No additional data'))

      const params = { NodeIDs: res.map(i => i.NodeID) }
      NodeAddressInfo.GetNodeAddressInfo(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'NodeAddress',
              `[Node Address] Proto Get Node Address Info - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeAddressesInfo.length < 1) return callback(response.setResult(false, '[Node Address] No additional data'))

        const promises = res.NodeAddressesInfo.map(async item => {
          const resIpStack = item.Address ? await ipstack.get(item.Address) : null

          return new Promise(resolve => {
            const payload = {
              NodeID: item.NodeID,
              IpAddress: item.Address,
              Port: item.Port,
              /** additional detail node address */
              CountryCode: resIpStack.country_code || null,
              CountryName: resIpStack.country_name || null,
              RegionCode: resIpStack.region_code || null,
              RegionName: resIpStack.region_name || null,
              City: resIpStack.city || null,
              Latitude: resIpStack.latitude || null,
              Longitude: resIpStack.longitude || null,
              CountryFlagUrl: resIpStack.location.country_flag || null,
              CountryFlagEmoji: resIpStack.location.country_flag_emoji || null,
            }

            this.service.findAndUpdate(payload, (err, res) => {
              if (err) return resolve({ err, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null)
        const updates = results.filter(f => f.res !== null)

        if (updates && updates.length < 1) return callback(response.setResult(false, `[Node Address] No additional data`))

        if (errors && errors.length > 0) {
          errors.forEach(err => {
            /** send message telegram bot if avaiable */
            return callback(response.sendBotMessage('NodeAddress', `[Node Address] Upsert - ${JSON.stringify(err)}`))
          })
        }

        return callback(response.setResult(true, `[Node Address] Upsert ${updates.length} data successfully`))
      })
    })
  }
}
