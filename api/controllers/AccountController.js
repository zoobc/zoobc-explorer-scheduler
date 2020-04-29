const BaseController = require('./BaseController');
const HandleError = require('./HandleError');
const { AccountsService } = require('../services');
const { ResponseBuilder, Converter, RedisCache } = require('../../utils');

const cache = {
  accounts: 'accounts',
  account: 'account',
};

module.exports = class AccountController extends BaseController {
  constructor() {
    super(new AccountsService());
  }

  async getAll(req, res) {
    const responseBuilder = new ResponseBuilder();
    const handleError = new HandleError();
    const { page, limit, fields, where, order } = req.query;

    try {
      const cacheAccounts = Converter.formatCache(cache.accounts, req.query);
      RedisCache.get(cacheAccounts, (errRedis, resRedis) => {
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
              .setMessage('Accounts fetched successfully')
              .build()
          );
          return;
        }

        this.service.paginate({ page, limit, fields, where, order }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          RedisCache.set(cacheAccounts, result.data, err => {
            if (err) {
              handleError.sendCatchError(res, err);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result.data)
                .setPaginate(result.paginate)
                .setMessage('Accounts fetched successfully')
                .build()
            );
            return;
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
    const accountAddress = req.params.accountAddress;

    try {
      if (!accountAddress) {
        this.sendInvalidPayloadResponse(
          res,
          responseBuilder
            .setData({})
            .setMessage('Invalid Payload Parameter')
            .build()
        );
        return;
      }

      const cacheAccount = Converter.formatCache(cache.account, accountAddress);
      RedisCache.get(cacheAccount, (errRedis, resRedis) => {
        if (errRedis) {
          handleError.sendCatchError(res, errRedis);
          return;
        }

        if (resRedis) {
          this.sendSuccessResponse(
            res,
            responseBuilder
              .setData(resRedis)
              .setMessage('Account fetched successfully')
              .build()
          );
          return;
        }

        this.service.findOne({ AccountAddress: accountAddress }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          if (!result) {
            this.sendNotFoundResponse(
              res,
              responseBuilder
                .setData({})
                .setMessage('Account not found')
                .build()
            );
            return;
          }

          RedisCache.set(cacheAccount, result, err => {
            if (err) {
              handleError.sendCatchError(res, err);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result)
                .setMessage('Account fetched successfully')
                .build()
            );
            return;
          });
        });
      });
    } catch (error) {
      handleError.sendCatchError(res, error);
    }
  }
};
