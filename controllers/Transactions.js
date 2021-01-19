/** 
 * ZooBC Copyright (C) 2020 Quasisoft Limited - Hong Kong
 * This file is part of ZooBC <https://github.com/zoobc/zoobc-explorer-scheduler>

 * ZooBC is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * ZooBC is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with ZooBC.  If not, see <http://www.gnu.org/licenses/>.

 * Additional Permission Under GNU GPL Version 3 section 7.
 * As the special exception permitted under Section 7b, c and e, 
 * in respect with the Author’s copyright, please refer to this section:

 * 1. You are free to convey this Program according to GNU GPL Version 3,
 *     as long as you respect and comply with the Author’s copyright by 
 *     showing in its user interface an Appropriate Notice that the derivate 
 *     program and its source code are “powered by ZooBC”. 
 *     This is an acknowledgement for the copyright holder, ZooBC, 
 *     as the implementation of appreciation of the exclusive right of the
 *     creator and to avoid any circumvention on the rights under trademark
 *     law for use of some trade names, trademarks, or service marks.

 * 2. Complying to the GNU GPL Version 3, you may distribute 
 *     the program without any permission from the Author. 
 *     However a prior notification to the authors will be appreciated.

 * ZooBC is architected by Roberto Capodieci & Barton Johnston
 * contact us at roberto.capodieci[at]blockchainzoo.com
 * and barton.johnston[at]blockchainzoo.com

 * IMPORTANT: The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of the Software.
**/

const moment = require('moment')
const BaseController = require('./BaseController')
const { store, util, response } = require('../utils')
const { Transaction, Escrow, MultiSignature } = require('../protos')
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
            SenderAddress: res.SenderAddress,
            SenderAddressFormatted: util.parseAddress(res.SenderAddress),
            RecipientAddress: res.RecipientAddress,
            RecipientAddressFormatted: util.parseAddress(res.RecipientAddress),
            ApproverAddress: res.ApproverAddress,
            ApproverAddressFormatted: util.parseAddress(res.ApproverAddress),
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
      let transactionTypeName = ''
      let sendMoney = null
      let claimNodeRegistration = null
      let nodeRegistration = null
      let removeNodeRegistration = null
      let updateNodeRegistration = null
      let setupAccount = null
      let removeAccount = null
      let approvalEscrow = null
      let multiSignature = null
      let escrow = null
      let feeVoteCommit = null
      let feeVoteReveal = null
      let liquidPayment = null
      let liquidPaymentStop = null
      let status = item.TransactionType === 4 || item.TransactionType === 5 ? 'Pending' : 'Approved'

      switch (item.TransactionType) {
        case 1:
          transactionTypeName = 'ZBC Transfer'
          sendMoney = {
            Amount: item.sendMoneyTransactionBody.Amount,
            AmountConversion: item.sendMoneyTransactionBody ? util.zoobitConversion(item.sendMoneyTransactionBody.Amount) : null,
          }
          escrow = await getEscrow(item.ID)
          status = escrow && escrow.Status ? escrow.Status : 'Approved'
          break
        case 2:
          transactionTypeName = 'Node Registration'
          nodeRegistration = {
            NodePublicKey: item.nodeRegistrationTransactionBody ? item.nodeRegistrationTransactionBody.NodePublicKey : null,
            NodePublicKeyFormatted: item.nodeRegistrationTransactionBody
              ? util.getZBCAddress(item.nodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
            AccountAddress: item.nodeRegistrationTransactionBody.AccountAddress,
            AccountAddressFormatted: util.parseAddress(item.nodeRegistrationTransactionBody.AccountAddress),
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
              MultisigAddress: null,
              ...item.multiSignatureTransactionBody.MultiSignatureInfo,
              // MultisigAddress: item.multiSignatureTransactionBody.MultiSignatureInfo.MultisigAddress
              //   ? item.multiSignatureTransactionBody.MultiSignatureInfo.MultisigAddress
              //   : null,
              // MultisigAddressFormatted: item.multiSignatureTransactionBody.MultiSignatureInfo.MultisigAddress
              //   ? util.parseAddress(item.multiSignatureTransactionBody.MultiSignatureInfo.MultisigAddress)
              //   : null,
              MultisigAddressFormatted: null,
              AddressesFormatted:
                item.multiSignatureTransactionBody.MultiSignatureInfo &&
                item.multiSignatureTransactionBody.MultiSignatureInfo.Addresses &&
                item.multiSignatureTransactionBody.MultiSignatureInfo.Addresses.length > 0
                  ? item.multiSignatureTransactionBody.MultiSignatureInfo.Addresses.map(item => {
                      return util.parseAddress(item)
                    })
                  : [],
            },
            SignatureInfo: {
              TransactionHash: null,
              ...item.multiSignatureTransactionBody.SignatureInfo,
              TransactionHashFormatted:
                item.multiSignatureTransactionBody.SignatureInfo &&
                item.multiSignatureTransactionBody.SignatureInfo.TransactionHash &&
                util.getZBCAddress(item.multiSignatureTransactionBody.SignatureInfo.TransactionHash, 'ZTX'),
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
                    SenderFormatted: util.parseAddress(res.SenderAccountAddress),
                    Recipient: res.RecipientAccountAddress,
                    RecipientFormatted: util.parseAddress(res.RecipientAccountAddress),
                    Fee: res.Fee,
                    FeeConversion: res ? util.zoobitConversion(res.Fee) : 0,
                    Status: 'Approved',
                    Version: res.Version,
                    TransactionHash: res.TransactionHash,
                    TransactionHashFormatted: util.getZBCAddress(res.TransactionHash, 'ZTX'),
                    TransactionBodyLength: res.TransactionBodyLength,
                    TransactionBodyBytes: res.TransactionBodyBytes,
                    TransactionIndex: res.TransactionIndex,
                    Signature: res.Signature,
                    TransactionBody: res.TransactionBody,
                    TransactionTypeName: 'ZBC Transfer',
                    MultisigChild: res.MultisigChild,
                    SendMoney: {
                      Amount:
                        res.sendMoneyTransactionBody && res.sendMoneyTransactionBody.Amount ? res.sendMoneyTransactionBody.Amount : null,
                      AmountConversion:
                        res.sendMoneyTransactionBody && res.sendMoneyTransactionBody.Amount
                          ? util.zoobitConversion(res.sendMoneyTransactionBody.Amount)
                          : null,
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
                  })
                }
              }
            )
          }

          /** if signature is null so that get pending transaction by height to height + 1 and then update signature info */
          if (!item.multiSignatureTransactionBody.SignatureInfo) {
            const pendingTransaction = await getMultiSignature(item.Height)

            if (pendingTransaction) {
              multiSignature.SignatureInfo.TransactionHash = pendingTransaction.TransactionHash
              multiSignature.SignatureInfo.TransactionHashFormatted = util.getZBCAddress(pendingTransaction.TransactionHash, 'ZTX')
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
              ? util.getZBCAddress(item.updateNodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
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
              ? util.getZBCAddress(item.removeNodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
          }
          break
        case 770:
          transactionTypeName = 'Claim Node Registration'
          claimNodeRegistration = {
            NodePublicKey: item.claimNodeRegistrationTransactionBody ? item.claimNodeRegistrationTransactionBody.NodePublicKey : null,
            NodePublicKeyFormatted: item.claimNodeRegistrationTransactionBody
              ? util.getZBCAddress(item.claimNodeRegistrationTransactionBody.NodePublicKey, 'ZNK')
              : null,
            ProofOfOwnership: item.claimNodeRegistrationTransactionBody.Poown,
          }
          break
        case 6:
          transactionTypeName = 'Liquid'
          liquidPayment = { ...item.liquidPaymentTransactionBody }
          break
        case 262:
          transactionTypeName = 'Liquid Payment Stop'
          liquidPaymentStop = { ...item.liquidPaymentStopTransactionBody }
          break
        case 7:
          transactionTypeName = 'Fee Vote Commitment'
          feeVoteCommit = { VoteHash: item.feeVoteCommitTransactionBody.VoteHash }
          break
        case 263:
          transactionTypeName = 'Fee Vote Reveal'
          feeVoteReveal = { ...item.feeVoteRevealTransactionBody }
          break
        default:
          transactionTypeName = 'Empty Transaction'
          break
      }

      return {
        Version: item.Version,
        TransactionID: item.ID,
        BlockID: item.BlockID,
        Height: item.Height,
        Sender: item.SenderAccountAddress,
        SenderFormatted: util.parseAddress(item.SenderAccountAddress),
        Recipient: item.RecipientAccountAddress,
        RecipientFormatted: util.parseAddress(item.RecipientAccountAddress),
        TransactionType: item.TransactionType,
        Fee: item.Fee,
        FeeConversion: item && item.Fee ? util.zoobitConversion(item.Fee) : 0,
        Timestamp: new Date(moment.unix(item.Timestamp).valueOf()),
        TransactionHash: item.TransactionHash,
        TransactionHashFormatted: util.getZBCAddress(item.TransactionHash, 'ZTX'),
        TransactionBodyLength: item.TransactionBodyLength,
        TransactionBodyBytes: item.TransactionBodyBytes,
        TransactionIndex: item.TransactionIndex,
        MultisigChild: item.MultisigChild,
        Signature: item.Signature,
        Message: item.Message,
        MessageFormatted: util.bufferStr(item.Message),
        TransactionBody: item.TransactionBody,
        Escrow: escrow,
        Status: status,
        /** convertion by transaction body */
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
        FeeVoteCommit: feeVoteCommit,
        FeeVoteReveal: feeVoteReveal,
        LiquidPayment: liquidPayment,
        LiquidPaymentStop: liquidPaymentStop,
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
              `[Transactions] API Core Get Transactions - ${err},- Params : <pre>${JSON.stringify(params)}</pre>`
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
