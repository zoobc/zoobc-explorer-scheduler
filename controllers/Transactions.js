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
        // store.accBalances = []
        store.nodePublicKeys = []
        store.accountBalances = []
            // store.accountAddList = []
        store.transactionFees = []
            // store.accountTransactions = []

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

            results.map(async item => {
                /** Get Address & Fees from Sender only and Address from Sender & Recipient for Account Balances */
                const res = await this.calculateSenderFees(item)
            })

            /** NEED TO CHECK FOR ANY DUPLICATE PUSH ON ARRAy */
            const items = results.map(item => {
                AccountBalance.GetAccountBalance({ AccountAddress: item.SenderAccountAddress }, (error, result) => {
                    if (error)
                        return callback(`[Transactions] Proto Account Balance - Get Sender Account Balance ${error}`, { success: false, message: null })

                    const index = store.accountBalances.findIndex(x => x.AccountAddress === item.SenderAccountAddress)

                    if (result && result.AccountBalance && index === -1) {
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

                AccountBalance.GetAccountBalance({ AccountAddress: item.RecipientAccountAddress }, (error, result) => {
                    if (error)
                        return callback(`[Transactions] Proto Account Balance - Get Recipient Account Balance ${error}`, {
                            success: false,
                            message: null,
                        })

                    const index = store.accountBalances.findIndex(x => x.AccountAddress === item.RecipientAccountAddress)

                    if (result && result.AccountBalance && index === -1) {
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
                            TotalFeesPaid: 0,
                            TotalFeesPaidConversion: 0,
                            BlockHeight: item.Height,
                            Nodes: null,
                            Transactions: item,
                        })
                    }
                })

                // store.accountTransactions.push({
                //   SenderAccountAddress: item.SenderAccountAddress,
                //   RecipientAccountAddress: item.RecipientAccountAddress,
                //   Fee: parseInt(item.Fee),
                //   FeeConversion: util.zoobitConversion(parseInt(item.Fee)),
                //   Amount: item.TransactionType === 1 ? parseInt(item.sendMoneyTransactionBody.Amount) : 0,
                //   AmountConversion: item.TransactionType === 1 ? util.zoobitConversion(parseInt(item.sendMoneyTransactionBody.Amount)) : 0,
                //   BlockHeight: item.Height,
                //   Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
                // })

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

    calculateSenderFees(item) {
        return new Promise(resolve => {
            this.accountService.findOneAddress(item.SenderAccountAddress, (err, result) => {
                if (err) return callback(`[Transactions] Account Service - Find One Address ${err}`, { success: false, count: 0, message: null })

                /** Summarying totalFees per Account if there's multiple transation on one address */
                const index = store.transactionFees.findIndex(x => x.AccountAddress === item.SenderAccountAddress)
                const latestFee = result ? result.TotalFeesPaid : parseInt('0')
                    // const latestTotalFee = result.TotalFeesPaidConversion ? result.TotalFeesPaidConversion : parseInt('0')
                if (index !== -1) {
                    store.transactionFees[index] = {
                        AccountAddress: item.SenderAccountAddress,
                        Fee: parseInt(store.transactionFees[index].Fee) + latestFee + parseInt(item.Fee) ? parseInt(item.Fee) : 0,
                    }
                } else {
                    store.transactionFees.push({
                        AccountAddress: item.SenderAccountAddress,
                        Fee: parseInt(item.Fee) ? parseInt(item.Fee) : 0,
                    })
                }

                resolve(store.transactionFees)
            })
        })
    }
}