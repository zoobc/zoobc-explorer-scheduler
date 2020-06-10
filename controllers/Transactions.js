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
              // TODO: completing value
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

<<<<<<< HEAD
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
            // console.log(`raw transaction data ==> `, result)
            if (err) return callback(`[Transactions] Proto Transaction - Get Transactions ${err}`, { success: false, count: 0, message: null })
            if (result && result.Transactions && result.Transactions.length < 1)
                return callback(null, { success: false, count: 0, message: '[Transactions] No additional data' })

            let nodePublicKeys = []

            /** filter data by height because result from proto transactions still showing data out of params */
            const results = result.Transactions.filter(item => item.Height === height)

            results.map(async item => {
                /** Get Address & Fees from Sender only and Address from Sender & Recipient for Account Balances */
                await this.calculateSenderFees(item)
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
                let multiSignature = null
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
                    case 5:
                        multiSignature = {
                            MultiSignatureInfo: item.MultiSignatureTransactionBody.MultiSignatureInfo,
                            UnsignedTransactionBytes: item.MultiSignatureTransactionBody.UnsignedTransactionBytes,
                            SignatureInfo: item.MultiSignatureTransactionBody.SignatureInfo
                        }
                        store.multiSig.push(multiSignature)
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
                    MultisigChild: item.MultisigChild,
                    Signature: item.Signature,
                    TransactionBody: item.TransactionBody,
                    TransactionTypeName: transactionTypeName,
                    SendMoney: sendMoney,
                    ClaimNodeRegistration: claimNodeRegistration,
                    MultiSignature: multiSignature,
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
=======
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
>>>>>>> 2b63952f27a368b89885ec8979e5668a4424ae69
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
      this.service.getLastHeight(async (err, res) => {
        if (err) return resolve(response.setError(`[Transactions] Transactions Service - Get Last Height ${err}`))

        /** set variable transaction height */
        const transactionHeight = res ? parseInt(res.Height + 1) : 0

        /** getting value last check height transaction */
        const generalLastCheckTransactionHeight =
          parseInt(await this.generalsService.getValueByKey(store.keyLastCheckTransactionHeight)) || 0

        /**  set variable last transaction height with condition */
        const lastCheckTransactionHeight =
          parseInt(generalLastCheckTransactionHeight) > parseInt(transactionHeight)
            ? parseInt(generalLastCheckTransactionHeight)
            : parseInt(transactionHeight)

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
