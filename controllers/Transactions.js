const moment = require('moment')
const BaseController = require('./BaseController')
const { Transaction, Escrow, MultiSignature } = require('../protos')
const { store, util, response } = require('../utils')
const { BlocksService, TransactionsService, GeneralsService } = require('../services')

module.exports = class Transactions extends BaseController {
  constructor() {
    super(new TransactionsService())
    this.blocksService = new BlocksService()
    this.generalsService = new GeneralsService()
  }

  async mappingTransactions(transactions) {
    const getEscrow = async ID => {
      return new Promise(resolve => {
        Escrow.GetEscrowTransaction({ ID }, (err, res) => {
          if (err) resolve(null)
          const escrow = res && {
            ...res,
            AmountConversion: res ? util.zoobitConversion(res.Amount) : 0,
            CommissionConversion: res ? util.zoobitConversion(res.Commission) : 0,
          }
          resolve(escrow)
        })
      })
    }

    const getMultiSignature = height => {
      return new Promise(resolve => {
        MultiSignature.GetPendingTransactionsByHeight({ FromHeight: height, ToHeight: height + 1 }, (err, res) => {
          if (err) return resolve(null)
          if (res) return resolve(res.PendingTransactions.find(f => f.BlockHeight === height))
        })
      })
    }

    const promises = transactions.map(async item => {
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
      let escrow = null
      let status = item.TransactionType === 4 || item.TransactionType === 5 ? 'Pending' : 'Approved'

      switch (item.TransactionType) {
        case 1:
          transactionTypeName = 'ZBC Transfer'
          sendMoney = {
            Amount: item.sendMoneyTransactionBody.Amount,
            AmountConversion: item.sendMoneyTransactionBody ? util.zoobitConversion(item.sendMoneyTransactionBody.Amount) : null,
          }
          escrow = await getEscrow(item.ID)
          status = item.MultisigChild ? 'Pending' : escrow && escrow.Status ? escrow.Status : 'Approved'
          break
        case 2:
          transactionTypeName = 'Node Registration'
          nodeRegistration = {
            NodePublicKey: item.nodeRegistrationTransactionBody ? item.nodeRegistrationTransactionBody.NodePublicKey : null,
            NodePublicKeyFormatted: item.nodeRegistrationTransactionBody
              ? util.getZBCAdress(item.nodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
            AccountAddress: item.nodeRegistrationTransactionBody.AccountAddress,
            NodeAddress: item.nodeRegistrationTransactionBody.NodeAddress,
            LockedBalance: item.nodeRegistrationTransactionBody.LockedBalance,
            LockedBalanceConversion: item.nodeRegistrationTransactionBody
              ? util.zoobitConversion(item.nodeRegistrationTransactionBody.LockedBalance)
              : 0,
            ProofOfOwnership: item.nodeRegistrationTransactionBody.Poown,
          }
          break
        case 3:
          transactionTypeName = 'Setup Account'
          setupAccount = item.setupAccountDatasetTransactionBody
          break
        case 4:
          transactionTypeName = 'Escrow'
          approvalEscrow = {
            Approval: item.approvalEscrowTransactionBody.Approval,
            TransactionID: item.approvalEscrowTransactionBody.TransactionID,
          }
          escrow = await getEscrow(item.approvalEscrowTransactionBody.TransactionID)
          status = escrow && escrow.Status ? escrow.Status : 'Pending'
          break
        case 5:
          transactionTypeName = 'Multisignature'
          multiSignature = {
            ...item.multiSignatureTransactionBody,
            MultiSignatureInfo: {
              ...item.multiSignatureTransactionBody.MultiSignatureInfo,
            },
            SignatureInfo: {
              TransactionHash: null,
              ...item.multiSignatureTransactionBody.SignatureInfo,
              TransactionHashFormatted:
                item.multiSignatureTransactionBody.SignatureInfo &&
                item.multiSignatureTransactionBody.SignatureInfo.TransactionHash &&
                util.getZBCAdress(item.multiSignatureTransactionBody.SignatureInfo.TransactionHash, 'ZTX'),
            },
          }

          /** get parent if minimun signatures already full field */
          if (
            item.multiSignatureTransactionBody &&
            item.multiSignatureTransactionBody.SignatureInfo &&
            item.multiSignatureTransactionBody.SignatureInfo.TransactionHash
          ) {
            Transaction.GetTransaction(
              {
                ID: util.hashToInt64(item.multiSignatureTransactionBody.SignatureInfo.TransactionHash),
              },
              (err, res) => {
                if (err)
                  util.log({
                    error: null,
                    result: {
                      success: false,
                      message: '[Multi Signature Parent] No additional data',
                    },
                  })
                if (res) {
                  const payload = {
                    TransactionID: res.ID,
                    Timestamp: new Date(moment.unix(res.Timestamp).valueOf()),
                    TransactionType: res.TransactionType,
                    BlockID: res.BlockID,
                    Height: res.Height,
                    Sender: res.SenderAccountAddress,
                    Recipient: res.RecipientAccountAddress,
                    Fee: res.Fee,
                    FeeConversion: res ? util.zoobitConversion(res.Fee) : 0,
                    Status: 'Approved',
                    Version: res.Version,
                    TransactionHash: res.TransactionHash,
                    TransactionHashFormatted: util.getZBCAdress(res.TransactionHash, 'ZTX'),
                    TransactionBodyLength: res.TransactionBodyLength,
                    TransactionBodyBytes: res.TransactionBodyBytes,
                    TransactionIndex: res.TransactionIndex,
                    Signature: res.Signature,
                    TransactionBody: res.TransactionBody,
                    TransactionTypeName: 'ZBC Transfer',
                    MultisigChild: res.MultisigChild,
                    SendMoney: {
                      Amount: res.sendMoneyTransactionBody.Amount,
                      AmountConversion: res.sendMoneyTransactionBody ? util.zoobitConversion(res.sendMoneyTransactionBody.Amount) : null,
                    },
                  }

                  this.service.findAndUpdate(payload, (err, res) => {
                    util.log({
                      error: err,
                      result: !err
                        ? {
                            success: res ? true : false,
                            message: res
                              ? '[Multi Signature Parent] Upsert 1 data successfully'
                              : '[Multi Signature Parent] No additional data',
                          }
                        : null,
                    })
                  })
                }
              }
            )

            /** update all child status after get parents approved by TxHash */
            this.service.findAndUpdateStatus(
              {
                'MultiSignature.SignatureInfo.TransactionHash': item.multiSignatureTransactionBody.SignatureInfo.TransactionHash,
              },
              (err, res) => {
                util.log({
                  error: err,
                  result: !err
                    ? {
                        success: res ? true : false,
                        message: res
                          ? `[Multi Signature Status] Upsert ${res.nModified} data successfully`
                          : '[Multi Signature Status] No additional data',
                      }
                    : null,
                })
              }
            )
          }

          /** if signature is null so that get pending transaction by height to height + 1 and then update signature info */
          if (!item.multiSignatureTransactionBody.SignatureInfo) {
            const pendingTransaction = await getMultiSignature(item.Height)
            if (pendingTransaction) {
              multiSignature.SignatureInfo.TransactionHash = pendingTransaction.TransactionHash
              multiSignature.SignatureInfo.TransactionHashFormatted = util.getZBCAdress(pendingTransaction.TransactionHash, 'ZTX')
            }
          } else {
            const pendingTransaction = await getMultiSignature(item.Height)
            if (pendingTransaction) {
              switch (pendingTransaction.Status) {
                case 'PendingTransactionExecuted':
                  status = 'Approved'
                  break
                case 'PendingTransactionExpired':
                  status = 'Expired'
                  break
                default:
                  status = 'Pending'
                  break
              }
            }
          }
          break
        case 258:
          transactionTypeName = 'Update Node Registration'
          updateNodeRegistration = {
            NodePublicKey: item.updateNodeRegistrationTransactionBody ? item.updateNodeRegistrationTransactionBody.NodePublicKey : null,
            NodePublicKeyFormatted: item.updateNodeRegistrationTransactionBody
              ? util.getZBCAdress(item.updateNodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
            NodeAddress: item.updateNodeRegistrationTransactionBody.NodeAddress,
            LockedBalance: item.updateNodeRegistrationTransactionBody.LockedBalance,
            LockedBalanceConversion: item.updateNodeRegistrationTransactionBody
              ? util.zoobitConversion(item.updateNodeRegistrationTransactionBody.LockedBalance)
              : 0,
            ProofOfOwnership: item.updateNodeRegistrationTransactionBody.Poown,
          }
          break
        case 259:
          transactionTypeName = 'Remove Account'
          removeAccount = item.removeAccountDatasetTransactionBody
          break
        case 514:
          transactionTypeName = 'Remove Node Registration'
          removeNodeRegistration = {
            NodePublicKey: item.removeNodeRegistrationTransactionBody ? item.removeNodeRegistrationTransactionBody.NodePublicKey : null,
            NodePublicKeyFormatted: item.removeNodeRegistrationTransactionBody
              ? util.getZBCAdress(item.removeNodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
          }
          break
        case 770:
          transactionTypeName = 'Claim Node Registration'
          claimNodeRegistration = {
            NodePublicKey: item.claimNodeRegistrationTransactionBody ? item.claimNodeRegistrationTransactionBody.NodePublicKey : null,
            NodePublicKeyFormatted: item.claimNodeRegistrationTransactionBody
              ? util.getZBCAdress(item.claimNodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
            ProofOfOwnership: item.claimNodeRegistrationTransactionBody.Poown,
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
        Fee: item.Fee,
        Status: status,
        FeeConversion: item ? util.zoobitConversion(item.Fee) : 0,
        Version: item.Version,
        TransactionHash: item.TransactionHash,
        TransactionHashFormatted: util.getZBCAdress(item.TransactionHash, 'ZTX'),
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
        MultisigChild: item.MultisigChild,
        Escrow: escrow,
      }
    })
    return await Promise.all(promises)
  }

  update(callback) {
    this.blocksService.getLastTimestamp(async (err, res) => {
      /** send message telegram bot if avaiable */
      if (err) return callback(response.sendBotMessage('Transactions', `[Transactions] Blocks Service - Get Last Timestamp ${err}`))
      if (!res) return callback(response.setResult(false, '[Transactions] No additional data'))

      const TimestampEnd = moment(res.Timestamp).unix()

      const lastCheck = await this.generalsService.getSetLastCheck()
      const payloadLastCheck = JSON.stringify({
        ...lastCheck,
        Height: res.Height,
        Timestamp: TimestampEnd,
      })
      /** return message if nothing */
      if (!lastCheck) return callback(response.setResult(false, '[Accounts] No additional data'))

      const params = { TimestampStart: lastCheck.Timestamp, TimestampEnd }
      Transaction.GetTransactions(params, async (err, res) => {
        if (err)
          return callback(
            /** send message telegram bot if avaiable */
            response.sendBotMessage(
              'Transactions',
              `[Transactions] Proto Get Transactions - ${err},- Params : <pre>${JSON.stringify(params)}</pre>`
            )
          )

        /** update general last check timestamp transaction */
        this.generalsService.setValueByKey(store.keyLastCheck, payloadLastCheck)

        if (res && res.Transactions && res.Transactions.length < 1)
          return callback(response.setResult(false, '[Transactions] No additional data'))

        /** update or insert data */
        const payloads = await this.mappingTransactions(res.Transactions)

        this.service.upserts(payloads, ['TransactionID', 'Height'], (err, res) => {
          /** send message telegram bot if available */
          if (err) return callback(response.sendBotMessage('Transactions', `[Transactions] Upsert - ${err}`))
          if (res && res.result.ok !== 1) return callback(response.setError(`[Transactions] Upsert data failed`))

          return callback(response.setResult(true, `[Transactions] Upsert ${payloads.length} data successfully`))
        })
      })
    })
  }
}
