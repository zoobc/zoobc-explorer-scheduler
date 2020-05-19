const moment = require('moment')

const BaseController = require('./BaseController')
const { store, util } = require('../utils')
const { AccountBalance, Transaction } = require('../protos')
const { AccountsService, BlocksService, TransactionsService } = require('../services')

module.exports = class Transactions extends BaseController {
    constructor() {
        super(new TransactionsService())
        this.blocksService = new BlocksService()
        this.accountService = new AccountsService()
    }

    update(callback) {
        store.nodePublicKeys = []
        store.accountBalances = []

        if (!store.blocksAddition) return callback(null, { success: false, message: null })

        this.service.getLastHeight((err, result) => {
            if (err) return callback(`[Transactions] Transactions Service - Get Last Height ${err}`, { success: false, message: null })

            if (!result) {
                const height = 0
                this.recursiveUpsertTransactions(height, height, (error, result) => {
                    return callback(error, result)
                })
            } else {
                const lastHeightTransaction = result.Height

                this.blocksService.getLastHeight((error, result) => {
                    if (error) return callback(`[Transactions] Blocks Service - Get Last Height ${error}`, { success: false, message: null })
                    if (!result) return callback(null, { success: false, message: '[Transactions] No additional data' })

                    const lastHeightBlock = result.Height
                    this.recursiveUpsertTransactions(lastHeightTransaction + 1, lastHeightBlock, (error, result) => {
                        return callback(error, result)
                    })
                })
            }
        })
    }

    recursiveUpsertTransactions(heightStart, heightEnd, callback) {
        if (heightStart > heightEnd) return callback(null, { success: false, message: null })

        if (heightStart === heightEnd) {
            this.upsertTransactions(heightStart, (error, result) => {
                return callback(error, result)
            })
        } else {
            let transactions = []
            for (let height = heightStart; height < heightEnd; height++) {
                const transaction = new Promise((resolve, reject) => {
                    this.upsertTransactions(height, (err, { count } = result) => {
                        if (err) return reject(err)
                        return resolve(count)
                    })
                })

                transactions.push(transaction)
            }

            Promise.all(transactions)
                .then(results => {
                    const count = results.reduce((prev, curr) => {
                        return parseInt(prev) + parseInt(curr)
                    }, 0)

                    if (count < 1) return callback(null, { success: false, message: '[Transactions] No additional data' })
                    return callback(null, { success: true, message: `[Transactions] Upsert ${count} data successfully` })
                })
                .catch(error => callback(`[Transactions] Upsert Transactions - Promise All ${error}`, { success: false, message: null }))
        }
    }

    upsertTransactions(height, callback) {
        const params = { Height: height, Pagination: { OrderField: 'block_height', OrderBy: 'ASC' } }
        Transaction.GetTransactions(params, (err, result) => {
            if (err) return callback(`[Transactions] Proto Transaction - Get Transactions ${err}`, { success: false, count: 0, message: null })
            if (result && result.Transactions && result.Transactions.length < 1)
                return callback(null, { success: false, count: 0, message: '[Transactions] No additional data' })

            let nodePublicKeys = []

            /** filter data by height because result from proto transactions still showing data out of params */
            const results = result.Transactions.filter(item => item.Height === height)

            const items = results.map(item => {

                AccountBalance.GetAccountBalance({ AccountAddress: item.SenderAccountAddress }, (error, result) => {
                    if (error)
                        return callback(`[Transactions] Proto Account Balance - Get Sender Account Balance ${error}`, { success: false, message: null })

                    this.accountService.findOneAddress(result.AccountBalance.AccountAddress, (err, findResult) => {
                        const index = store.accountBalances.findIndex(x => x.AccountAddress === result.AccountBalance.AccountAddress)
                        if (err) return callback(err, null)
                        const latestFee = findResult ? findResult.TotalFeesPaid : parseInt('0')
                        if (result && result.AccountBalance) {
                            if (index !== -1) {
                                store.accountBalances[index] = {
                                    AccountAddress: result.AccountBalance.AccountAddress,
                                    Balance: parseInt(result.AccountBalance.Balance),
                                    BalanceConversion: util.zoobitConversion(result.AccountBalance.Balance),
                                    SpendableBalance: parseInt(result.AccountBalance.SpendableBalance),
                                    SpendableBalanceConversion: util.zoobitConversion(result.AccountBalance.SpendableBalance),
                                    FirstActive: new Date(moment.unix(item.Timestamp).valueOf()),
                                    LastActive: null, // TODO: completed this field
                                    TotalRewards: null, // TODO: completed this field
                                    TotalRewardsConversion: null, // TODO: completed this field
                                    TotalFeesPaid: parseInt(store.accountBalances[index].Fee) + latestFee + parseInt(item.Fee),
                                    TotalFeesPaidConversion: util.zoobitConversion(parseInt(parseInt(store.accountBalances[index].Fee) + latestFee + parseInt(item.Fee))),
                                    BlockHeight: item.Height,
                                    Nodes: null,
                                    Transactions: item,
                                }
                            } else {
                                store.accountBalances.push({
                                    AccountAddress: result.AccountBalance.AccountAddress,
                                    Balance: parseInt(result.AccountBalance.Balance),
                                    BalanceConversion: util.zoobitConversion(result.AccountBalance.Balance),
                                    SpendableBalance: parseInt(result.AccountBalance.SpendableBalance),
                                    SpendableBalanceConversion: util.zoobitConversion(result.AccountBalance.SpendableBalance),
                                    FirstActive: new Date(moment.unix(item.Timestamp).valueOf()),
                                    LastActive: null, // TODO: completed this field
                                    TotalRewards: null, // TODO: completed this field
                                    TotalRewardsConversion: null, // TODO: completed this field
                                    TotalFeesPaid: parseInt(item.Fee),
                                    TotalFeesPaidConversion: util.zoobitConversion(parseInt(item.Fee)),
                                    BlockHeight: item.Height,
                                    Nodes: null,
                                    Transactions: item,
                                })
                            }
                        }
                    })
                })

                AccountBalance.GetAccountBalance({ AccountAddress: item.RecipientAccountAddress }, (error, result) => {
                    if (error)
                        return callback(`[Transactions] Proto Account Balance - Get Recipient Account Balance ${error}`, {
                            success: false,
                            message: null,
                        })

                    if (result && result.AccountBalance) {
                        store.accountBalances.push({
                            AccountAddress: result.AccountBalance.AccountAddress,
                            Balance: parseInt(result.AccountBalance.Balance),
                            BalanceConversion: util.zoobitConversion(result.AccountBalance.Balance),
                            SpendableBalance: parseInt(result.AccountBalance.SpendableBalance),
                            SpendableBalanceConversion: util.zoobitConversion(result.AccountBalance.SpendableBalance),
                            FirstActive: new Date(moment.unix(item.Timestamp).valueOf()),
                            LastActive: null, // TODO: completed this field
                            TotalRewards: null, // TODO: completed this field
                            TotalRewardsConversion: null, // TODO: completed this field
                            TotalFeesPaid: parseInt(item.Fee),
                            TotalFeesPaidConversion: util.zoobitConversion(parseInt(item.Fee)),
                            BlockHeight: item.Height,
                            Nodes: null,
                            Transactions: item,
                        })
                    }
                })

                let sendMoney = null
                let claimNodeRegistration = null
                let nodeRegistration = null
                let removeNodeRegistration = null
                let updateNodeRegistration = null
                let setupAccount = null
                let removeAccount = null
                let transactionTypeName = ''
                switch (item.TransactionType) {
                    case 1:
                        sendMoney = {
                            Amount: item.sendMoneyTransactionBody.Amount,
                            AmountConversion: util.zoobitConversion(item.sendMoneyTransactionBody.Amount),
                        }
                        transactionTypeName = 'Send Money'
                        break
                    case 2:
                        nodeRegistration = {
                            NodePublicKey: util.bufferStr(item.nodeRegistrationTransactionBody.NodePublicKey),
                            AccountAddress: item.nodeRegistrationTransactionBody.AccountAddress,
                            NodeAddress: item.nodeRegistrationTransactionBody.NodeAddress,
                            LockedBalance: item.nodeRegistrationTransactionBody.LockedBalance,
                            LockedBalanceConversion: util.zoobitConversion(item.nodeRegistrationTransactionBody.LockedBalance),
                            ProofOfOwnership: item.nodeRegistrationTransactionBody.ProofOfOwnership,
                        }
                        transactionTypeName = 'Node Registration'
                        nodePublicKeys.push({
                            NodePublicKey: util.bufferStr(item.nodeRegistrationTransactionBody.NodePublicKey),
                            TransactionType: 'Upsert',
                        })
                        break
                    case 3:
                        setupAccount = item.setupAccountDatasetTransactionBody
                        transactionTypeName = 'Setup Account'
                        break
                    case 258:
                        updateNodeRegistration = {
                            NodePublicKey: util.bufferStr(item.updateNodeRegistrationTransactionBody.NodePublicKey),
                            NodeAddress: item.updateNodeRegistrationTransactionBody.NodeAddress,
                            LockedBalance: item.updateNodeRegistrationTransactionBody.LockedBalance,
                            LockedBalanceConversion: util.zoobitConversion(item.updateNodeRegistrationTransactionBody.LockedBalance),
                            ProofOfOwnership: item.updateNodeRegistrationTransactionBody.ProofOfOwnership,
                        }
                        transactionTypeName = 'Update Node Registration'
                        nodePublicKeys.push({
                            NodePublicKey: util.bufferStr(item.updateNodeRegistrationTransactionBody.NodePublicKey),
                            TransactionType: 'Upsert',
                        })
                        break
                    case 259:
                        removeAccount = item.removeAccountDatasetTransactionBody
                        transactionTypeName = 'Remove Account'
                        break
                    case 514:
                        removeNodeRegistration = {
                            NodePublicKey: util.bufferStr(item.removeNodeRegistrationTransactionBody.NodePublicKey),
                        }
                        transactionTypeName = 'Remove Node Registration'
                        nodePublicKeys.push({
                            NodePublicKey: util.bufferStr(item.removeNodeRegistrationTransactionBody.NodePublicKey),
                            TransactionType: 'Remove',
                        })
                        break
                    case 770:
                        claimNodeRegistration = {
                            NodePublicKey: util.bufferStr(item.claimNodeRegistrationTransactionBody.NodePublicKey),
                            AccountAddress: item.claimNodeRegistrationTransactionBody.AccountAddress,
                            ProofOfOwnership: item.claimNodeRegistrationTransactionBody.ProofOfOwnership,
                        }
                        transactionTypeName = 'Claim Node Registration'
                        nodePublicKeys.push({
                            NodePublicKey: util.bufferStr(item.claimNodeRegistrationTransactionBody.NodePublicKey),
                            TransactionType: 'Remove',
                        })
                        break
                    default:
                        transactionTypeName = 'Empty'
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
                }
            })

            store.nodePublicKeys = nodePublicKeys.filter((v, i) => nodePublicKeys.indexOf(v) === i)

            const matchs = ['TransactionID', 'Height']
            this.service.upserts(items, matchs, (err, result) => {
                if (err) return callback(`[Transactions - Height ${height}] Upsert ${err}`, { success: false, count: 0, message: null })
                if (result && result.result.ok !== 1)
                    return callback(`[Transactions - Height ${height}] Upsert data failed`, { success: false, count: 0, message: null })

                const subscribeTransactions = items
                    .slice(0, 5)
                    .sort((a, b) => (a.Height > b.Height ? -1 : 1))
                    .map(m => {
                        return {
                            TransactionID: m.TransactionID,
                            Timestamp: m.Timestamp,
                            FeeConversion: m.FeeConversion,
                        }
                    })

                return callback(null, {
                    success: true,
                    count: items.length,
                    data: subscribeTransactions,
                    message: `[Transactions] Upsert ${items.length} data successfully`,
                })
            })
        })
    }
}