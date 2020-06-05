const BaseController = require('./BaseController')
const { store, util } = require('../utils')
const { MultiSignatureService } = require('../services')

module.exports = class MultiSignature extends BaseController {
    constructor() {
        super(new MultiSignatureService())
    }

    update(callback) {
        if (store.multiSig.length < 1) return callback(null, { success: false, message: '[Multi-Signature] No additional data' })

        this.service.insertMany(store.MultiSignature, (err, results) => {
            if (err) return callback(`[Multi-Signature] Upsert ${err}`, { success: false, message: null })
            if (result && result.result.ok !== 1) return callback('[Multi-Signature] Upsert data failed', { success: false, message: null })
            return callback(null, { success: true, message: `[Multi-Signature] Upsert ${store.MultiSignature.length} data successfully` })
        })
    }
}