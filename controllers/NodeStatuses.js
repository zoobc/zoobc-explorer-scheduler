const BaseController = require('./BaseController')
const { NodesService } = require('../services')
const { NodeRegistration } = require('../protos')
const { response } = require('../utils')

module.exports = class NodeStatuses extends BaseController {
  constructor() {
    super(new NodesService())
  }

  async update(callback) {
    this.service.getNodePKs((err, res) => {
      console.log('LOCAL LENGTH => ', res.length)

      if (err)
        return callback(response.sendBotMessage('NodePendingStatus', `[Node Pending Status] Nodes Service - Get Pending Node PKs ${err}`))
      if (res && res.length < 1) return callback(response.setResult(false, '[Node Pending Status] No additional data'))

      const params = { NodePublicKeys: res && res.length > 0 && res.map(i => i.NodePublicKey) }

      NodeRegistration.GetNodeRegistrationsByNodePublicKeys(params, async (err, res) => {
        if (err)
          return callback(
            response.sendBotMessage(
              'NodePendingStatus',
              `[Node Pending Status] Proto Get Get Node Registrations By NodePublicKeys - ${err}`,
              `- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        if (res && res.NodeRegistrations && res.NodeRegistrations.length < 1)
          return callback(response.setResult(false, '[Node Pending Status] No additional data'))

        const promises = res.NodeRegistrations.map(async item => {
          return new Promise(resolve => {
            this.service.update({ NodeID: item.NodeID }, { RegistrationStatus: item.RegistrationStatus }, (err, res) => {
              if (err) return resolve({ err: `[Node Pending Status] Node - Find And Update ${err}`, res: null })
              return resolve({ err: null, res })
            })
          })
        })

        const results = await Promise.all(promises)
        const errors = results.filter(f => f.err !== null).map(i => i.err)
        const updates = results.filter(f => f.res !== null).map(i => i.res)

        if (updates && updates.length < 1 && errors.length < 1)
          return callback(response.setResult(false, `[Node Pending Status] No additional data`))

        if (errors && errors.length > 0) return callback(response.sendBotMessage('Node Pending Status', errors[0]))

        return callback(response.setResult(true, `[Node Pending Status] Upsert ${updates.length} data successfully`))
      })
    })
  }
}
