const moment = require('moment')

const config = require('../config')
const BaseController = require('./BaseController')
const { Transaction } = require('../protos')
const { store, queue, util, response } = require('../utils')
const { BlocksService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Transactions extends BaseController {
    constructor() {
        super(new TransactionsService())
        this.blocksService = new BlocksService()
        this.generalsService = new GeneralsService()
    }

    static synchronize(service, params) {
        if (!params) return response.sendBotMessage('Transactions', '[Transactions] Synchronize - Invalid params')

        return new Promise(resolve => {
            const height = params.Height

            /** get transactions (core) by hight */
            Transaction.GetTransactions(params, (err, res) => {
                if (err)
                    return resolve(
                        /** send message telegram bot if avaiable */
                        response.sendBotMessage(
                            'Transactions',
                            `[Transactions - Height ${height}] Proto Get Transactions - ${err}`,
                            `- Params : <pre>${JSON.stringify(params)}</pre>`
                        )
                    )
                if (res && res.Transactions && res.Transactions.length < 1) return resolve(null)
                if (res && res.Transactions && res.Transactions.length < 1)
                    return resolve(response.setResult(false, `[Transactions - Height ${height}] No additional data`))

                /**
                 * mapping result and filter data by height
                 * note: result from proto transactions still showing data out of params
                 */
                const payloads = res.Transactions.filter(item => item.Height === params.Height).map(item => {
                    if (item.TransactionType === 5) console.log('Item MultiSignature', item)

                    let sendMoney = null
                    let claimNodeRegistration = null
                    let nodeRegistration = null
                    let removeNodeRegistration = null
                    let updateNodeRegistration = null

                    let setupAccount = null
                    let removeAccount = null
                    let approvalEscrow = null
                    let multiSignature = null
                    let transactionTypeName = ''
                    switch (item.TransactionType) {
                        case 1:
                            transactionTypeName = 'Send Money'
                            sendMoney = {
                                Amount: item.sendMoneyTransactionBody.Amount,
                                AmountConversion: util.zoobitConversion(item.sendMoneyTransactionBody.Amount),
                            }
                            break
                        case 2:
                            transactionTypeName = 'Node Registration'
                            nodeRegistration = {
                                NodePublicKey: util.bufferStr(item.nodeRegistrationTransactionBody.NodePublicKey),
                                AccountAddress: item.nodeRegistrationTransactionBody.AccountAddress,
                                NodeAddress: item.nodeRegistrationTransactionBody.NodeAddress,
                                LockedBalance: item.nodeRegistrationTransactionBody.LockedBalance,
                                LockedBalanceConversion: util.zoobitConversion(item.nodeRegistrationTransactionBody.LockedBalance),
                                ProofOfOwnership: item.nodeRegistrationTransactionBody.ProofOfOwnership,
                            }
                            break
                        case 3:
                            transactionTypeName = 'Setup Account Dataset'
                            setupAccount = item.setupAccountDatasetTransactionBody
                            break
                        case 4:
                            transactionTypeName = 'Approval Escrow Transaction'
                                // TODO: completing value
                            break
                        case 5:
                            transactionTypeName = 'Multi Signature Transaction'
                            multiSignature = {
                                MultiSignatureInfo: item.MultiSignatureTransactionBody.MultiSignatureInfo,
                                UnsignedTransactionBytes: item.MultiSignatureTransactionBody.UnsignedTransactionBytes,
                                SignatureInfo: item.MultiSignatureTransactionBody.SignatureInfo
                            }
                            store.multiSig.push(multiSignature)
                            break
                        case 258:
                            transactionTypeName = 'Update Node Registration'
                            updateNodeRegistration = {
                                NodePublicKey: util.bufferStr(item.updateNodeRegistrationTransactionBody.NodePublicKey),
                                NodeAddress: item.updateNodeRegistrationTransactionBody.NodeAddress,
                                LockedBalance: item.updateNodeRegistrationTransactionBody.LockedBalance,
                                LockedBalanceConversion: util.zoobitConversion(item.updateNodeRegistrationTransactionBody.LockedBalance),
                                ProofOfOwnership: item.updateNodeRegistrationTransactionBody.ProofOfOwnership,
                            }
                            break
                        case 259:
                            transactionTypeName = 'Remove Account Dataset'
                            removeAccount = item.removeAccountDatasetTransactionBody
                            break
                        case 514:
                            transactionTypeName = 'Remove Node Registration'
                            removeNodeRegistration = {
                                NodePublicKey: util.bufferStr(item.removeNodeRegistrationTransactionBody.NodePublicKey),
                            }
                            break
                        case 770:
                            transactionTypeName = 'Claim Node Registration'
                            claimNodeRegistration = {
                                NodePublicKey: util.bufferStr(item.claimNodeRegistrationTransactionBody.NodePublicKey),
                                AccountAddress: item.claimNodeRegistrationTransactionBody.AccountAddress,
                                ProofOfOwnership: item.claimNodeRegistrationTransactionBody.ProofOfOwnership,
                            }
                            break
                        default:
                            transactionTypeName = 'Empty Transaction'
                            break
                    }

                    return {
                        TransactionID: item.ID,
                        Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
                        TransactionType: item.TransactionType,
                        BlockID: item.BlockID,
                        Height: item.Height,
                        Sender: item.SenderAccountAddress,
                        Recipient: item.RecipientAccountAddress,
                        Confirmations: null,
                        Fee: item.Fee,
                        FeeConversion: util.zoobitConversion(item.Fee),
                        Version: item.Version,
                        TransactionHash: item.TransactionHash,
                        TransactionBodyLength: item.TransactionBodyLength,
                        TransactionBodyBytes: item.TransactionBodyBytes,
                        TransactionIndex: item.TransactionIndex,
                        Signature: item.Signature,
                        TransactionBody: item.TransactionBody,
                        TransactionTypeName: transactionTypeName,
                        SendMoney: sendMoney,
                        ClaimNodeRegistration: claimNodeRegistration,
                        NodeRegistration: nodeRegistration,
                        RemoveNodeRegistration: removeNodeRegistration,
                        UpdateNodeRegistration: updateNodeRegistration,
                        SetupAccount: setupAccount,
                        RemoveAccount: removeAccount,
                        MultiSignature: multiSignature,
                        ApprovalEscrow: approvalEscrow,
                    }
                })

                /** update or insert data */
                service.upserts(payloads, ['TransactionID', 'Height'], (err, res) => {
                    /** send message telegram bot if avaiable */
                    if (err) return resolve(response.sendBotMessage('Transactions', `[Transactions - Height ${height}] Upsert - ${err}`))
                    if (res && res.result.ok !== 1) return resolve(response.setError(`[Transactions - Height ${height}] Upsert data failed`))

                    /** subscribe graphql */
                    const subscribeTransactions = payloads
                        .slice(0, 5)
                        .sort((a, b) => (a.Height > b.Height ? -1 : 1))
                        .map(m => {
                            return {
                                TransactionID: m.TransactionID,
                                Timestamp: m.Timestamp,
                                FeeConversion: m.FeeConversion,
                            }
                        })
                    return resolve(
                        response.setResult(true, `[Transactions - Height ${height}] Upsert ${payloads.length} data successfully`, subscribeTransactions)
                    )
                })
            })
        })
    }

    update(callback) {
        /** get last height block (local) */
        this.blocksService.getLastHeight((err, res) => {
            /** send message telegram bot if avaiable */
            if (err) return callback(response.sendBotMessage('Transactions', `[Transactions] Blocks Service - Get Last Height ${err}`))
            if (!res) return callback(response.setResult(false, '[Transactions] No additional data'))

            /** set variable last block height */
            const lastBlockHight = parseInt(res.Height)

            /** get last height transaction (local) */
            this.service.getLastHeight(async(err, res) => {
                if (err) return resolve(response.setError(`[Transactions] Transactions Service - Get Last Height ${err}`))

                /** set variable transaction height */
                const transactionHeight = res ? parseInt(res.Height + 1) : 0

                /** getting value last check height transaction */
                const generalLastCheckTransactionHeight =
                    parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

                /**  set variable last transaction height with condition */
                const lastCheckTransactionHeight =
                    parseInt(generalLastCheckTransactionHeight) > parseInt(transactionHeight) ?
                    parseInt(generalLastCheckTransactionHeight) :
                    parseInt(transactionHeight)

                /** return message if last height transactions greather than equal last height block  */
                if (lastCheckTransactionHeight > 0 && lastCheckTransactionHeight >= lastBlockHight)
                    return callback(response.setResult(false, '[Transactions] No additional data'))

                /**
                 * if value between last check height transaction and last height block over 200,
                 * so that set value last height block is same with variable reqLimit
                 * because request api core having limit request (100 requests per seconds)
                 */
                const reqLimit = config.queue.optQueue.limiter.max
                let maxBlockHeight = lastBlockHight
                if (parseInt(lastBlockHight) - parseInt(lastCheckTransactionHeight) > reqLimit)
                    maxBlockHeight = parseInt(lastCheckTransactionHeight) + parseInt(reqLimit)

                /** initiating the queue */
                queue.init('Queue Transactions')

                /** adding a or multi jobs to the queue with condition last transaction height */
                let count = 0
                if (lastCheckTransactionHeight === 0) {
                    const params = { Height: lastCheckTransactionHeight, Pagination: { OrderField: 'block_height', OrderBy: 'ASC' } }
                    queue.addJob(params)

                    /** update general last check height transaction with value 1 */
                    count = 1
                    this.generalsService.setValueByKey(store.keyLastCheckTransactionHeight, 1)
                } else if (lastCheckTransactionHeight > 0 && maxBlockHeight > lastCheckTransactionHeight) {
                    /** looping to add job with params hight */
                    for (let height = lastCheckTransactionHeight; height <= maxBlockHeight; height++) {
                        count++
                        const params = { Height: height, Pagination: { OrderField: 'block_height', OrderBy: 'ASC' } }
                        queue.addJob(params)
                    }

                    /** update general last check height transaction with value last height block */
                    this.generalsService.setValueByKey(store.keyLastCheckTransactionHeight, maxBlockHeight)
                }

                /** processing job the queue */
                queue.processJob(Transactions.synchronize, this.service)

                return callback(response.setResult(true, `[Queue] ${count} Transactions on processing`))
            })
        })
    }
}