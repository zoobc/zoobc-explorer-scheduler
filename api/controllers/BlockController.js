// const moment = require('moment');
const BaseController = require('./BaseController');
const HandleError = require('./HandleError');
const { BlocksService } = require('../services');
const { ResponseBuilder, Converter, RedisCache } = require('../../utils');

const cache = {
  blocks: 'blocks',
  block: 'block',
  period: 'block:period',
  summary: 'block:summary',
};

module.exports = class BlockController extends BaseController {
  constructor() {
    super(new BlocksService());
  }

  async getAll(req, res) {
    const responseBuilder = new ResponseBuilder();
    const handleError = new HandleError();
    const { page, limit, fields, order } = req.query;

    try {
      const cacheBlocks = Converter.formatCache(cache.blocks, req.query);
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
              .setMessage('Blocks fetched successfully')
              .build()
          );
          return;
        }

        this.service.paginate({ page, limit, fields, order }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          RedisCache.set(cacheBlocks, result, err => {
            if (err) {
              handleError.sendCatchError(res, err);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result.data)
                .setPaginate(result.paginate)
                .setMessage('Blocks fetched successfully')
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

      const cacheBlock = Converter.formatCache(cache.block, id);
      RedisCache.get(cacheBlock, (errRedis, resRedis) => {
        if (errRedis) {
          handleError.sendCatchError(res, errRedis);
          return;
        }

        if (resRedis) {
          this.sendSuccessResponse(
            res,
            responseBuilder
              .setData(resRedis)
              .setMessage('Block fetched successfully')
              .build()
          );
          return;
        }

        this.service.findOne({ BlockID: id }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          if (!result) {
            this.sendNotFoundResponse(
              res,
              responseBuilder
                .setData({})
                .setMessage('Block not found')
                .build()
            );
            return;
          }

          RedisCache.set(cacheBlock, result, err => {
            if (err) {
              handleError.sendCatchError(res, err);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result)
                .setMessage('Block fetched successfully')
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
