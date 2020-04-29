const HandleError = require('./HandleError');
const BaseController = require('./BaseController');
const { TransactionsService } = require('../services');
const { ResponseBuilder, Converter, RedisCache } = require('../../utils');

const cache = {
  transactions: 'transactions',
  amount: 'transaction:amount',
  type: 'transaction:type',
};

module.exports = class TransactionController extends BaseController {
  constructor() {
    super(new TransactionsService());
  }

  async getAll(req, res) {
    const responseBuilder = new ResponseBuilder();
    const handleError = new HandleError();
    const { page, limit, fields, order, where } = req.query;
    try {
      const cacheTransactions = Converter.formatCache(cache.transactions, req.query);

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
              .setPaginate(resRedis.paginate)
              .setMessage('Transactions fetched successfully')
              .build()
          );
          return;
        }

        this.service.paginate({ page, limit, fields, where, order }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          RedisCache.set(cacheTransactions, result, errRedis => {
            if (errRedis) {
              handleError.sendCatchError(res, errRedis);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result.data)
                .setPaginate(result.paginate)
                .setMessage('Transactions fetched successfully')
                .build()
            );
          });
        });
      });
    } catch (error) {
      handleError.sendCatchError(res, error);
    }
  }

  async getOne(req, res) {
    const responseBuilder = new ResponseBuilder();
    const handleError = new HandleError();
    const id = req.params.id;
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
      const cacheTransaction = Converter.formatCache(cache.transaction, id);
      RedisCache.get(cacheTransaction, (errRedis, resRedis) => {
        if (errRedis) {
          handleError.sendCatchError(res, errRedis);
          return;
        }
        if (resRedis) {
          this.sendSuccessResponse(
            res,
            responseBuilder
              .setData(resRedis)
              .setMessage('Transaction fetched successfully')
              .build()
          );
        }
        this.service.findOne({ TransactionID: id }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }
          if (!result) {
            this.sendNotFoundResponse(
              res,
              responseBuilder
                .setData({})
                .setMessage('Transaction not found')
                .build()
            );
            return;
          }
          RedisCache.set(cacheTransaction, result, errRedis => {
            if (errRedis) {
              handleError.sendCatchError(res, errRedis);
              return;
            }
            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result)
                .setMessage('Transaction fetched successfully')
                .build()
            );
          });
        });
      });
    } catch (error) {
      handleError.sendCatchError(res, error);
    }
  }
};
