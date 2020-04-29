const BaseController = require('./BaseController');
const HandleError = require('./HandleError');
const { ResponseBuilder, Converter, RedisCache } = require('../../utils');
const { BlocksService, TransactionsService } = require('../services');

const cacheBlock = {
  block: 'block',
};

const cacheTransaction = {
  transaction: 'transaction',
};

module.exports = class SearchController extends BaseController {
  constructor() {
    super();
    this.blockService = new BlocksService();
    this.transactionService = new TransactionsService();
  }

  async SearchIdHash(req, res) {
    const responseBuilder = new ResponseBuilder();
    const handleError = new HandleError();
    const { id } = req.query;
    try {
      if (!id) {
        this.sendInvalidPayloadResponse(
          res,
          responseBuilder
            .setData({})
            .setMessage('Invalid Payload Parameter')
            .build()
        );
        return;
      }
      if (id === 0) {
        this.sendInvalidPayloadResponse(
          res,
          responseBuilder
            .setData({})
            .setMessage('Invalid data: unable to add value by zero.')
            .build()
        );
        return;
      }
      const cacheBlocks = Converter.formatCache(cacheBlock.block, id);
      RedisCache.get(cacheBlocks, (errRedis, resRedis) => {
        if (errRedis) {
          handleError.sendCatchError(res, errRedis);
          return;
        }

        if (resRedis) {
          this.sendSuccessResponse(
            res,
            responseBuilder
              .setData(resRedis.data)
              .setPaginate(resRedis.setPaginate)
              .setMessage('Block fetched successfully')
              .build()
          );
          return;
        }
        this.blockService.findOne({ BlockID: id }, (errBlock, resultBlock) => {
          if (errBlock) {
            handleError.sendCatchError(res, errBlock);
            return;
          }

          if (resultBlock) {
            RedisCache.set(
              cacheBlocks,
              resultBlock,
              err => {
                if (err) {
                  handleError.sendCatchError(res, err);
                  return;
                }
              },

              this.sendSuccessResponse(
                res,
                responseBuilder
                  .setData(resultBlock)
                  .setMessage('Block fetched successfully')
                  .build()
              )
            );
            return;
          } else {
            const cacheTransactions = Converter.formatCache(cacheTransaction.transaction, id);
            RedisCache.get(cacheTransactions, (errRedis, resRedis) => {
              if (errRedis) {
                handleError.sendCatchError(res, errRedis);
                return;
              }

              if (resRedis) {
                this.sendSuccessResponse(
                  res,
                  responseBuilder
                    .setData(resRedis.data)
                    .setPaginate(resRedis.setPaginate)
                    .setMessage('Transaction fetched successfully')
                    .build()
                );
                return;
              }
              this.transactionService.findOne({ TransactionID: id }, (errTrans, resultTrans) => {
                if (errTrans) {
                  handleError.sendCatchError(res, errTrans);
                  return;
                }

                if (resultTrans !== null) {
                  RedisCache.set(
                    cacheTransactions,
                    resultTrans,
                    err => {
                      if (err) {
                        handleError.sendCatchError(res, err);
                        return;
                      }
                    },

                    this.sendSuccessResponse(
                      res,
                      responseBuilder
                        .setData(resultTrans)
                        .setMessage('Transaction fetched successfully')
                        .build()
                    )
                  );
                  return;
                } else {
                  this.sendSuccessResponse(
                    res,
                    responseBuilder
                      .setData({})
                      .setMessage('No Data fetched')
                      .build()
                  );
                  return;
                }
              });
            });
          }
        });
      });
    } catch (error) {
      handleError.sendCatchError(res, error);
    }
  }
};
