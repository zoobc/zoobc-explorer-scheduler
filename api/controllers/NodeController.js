const BaseController = require('./BaseController');
const HandleError = require('./HandleError');
const { NodesService } = require('../services');
const { ResponseBuilder, Converter, RedisCache } = require('../../utils');

const cache = {
  nodes: 'nodes',
  node: 'node',
};

module.exports = class NodeController extends BaseController {
  constructor() {
    super(new NodesService());
  }

  async getAll(req, res) {
    const responseBuilder = new ResponseBuilder();
    const handleError = new HandleError();
    const { page, limit, fields, where, order } = req.query;

    try {
      const cacheNodes = Converter.formatCache(cache.nodes, req.query);
      RedisCache.get(cacheNodes, (errRedis, resRedis) => {
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
              .setMessage('Nodes fetched successfully')
              .build()
          );
          return;
        }

        this.service.paginate({ page, limit, fields, where, order }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          RedisCache.set(cacheNodes, result.data, err => {
            if (err) {
              handleError.sendCatchError(res, err);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result.data)
                .setPaginate(result.paginate)
                .setMessage('Nodes fetched successfully')
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
    const nodeID = req.params.nodeID;

    try {
      if (!nodeID) {
        this.sendInvalidPayloadResponse(
          res,
          responseBuilder
            .setData({})
            .setMessage('Invalid Payload Parameter')
            .build()
        );
        return;
      }

      const cacheNode = Converter.formatCache(cache.node, nodeID);
      RedisCache.get(cacheNode, (errRedis, resRedis) => {
        if (errRedis) {
          handleError.sendCatchError(res, errRedis);
          return;
        }

        if (resRedis) {
          this.sendSuccessResponse(
            res,
            responseBuilder
              .setData(resRedis)
              .setMessage('Node fetched successfully')
              .build()
          );
          return;
        }

        this.service.findOne({ NodeID: nodeID }, (err, result) => {
          if (err) {
            handleError.sendCatchError(res, err);
            return;
          }

          if (!result) {
            this.sendNotFoundResponse(
              res,
              responseBuilder
                .setData({})
                .setMessage('Node not found')
                .build()
            );
            return;
          }

          RedisCache.set(cacheNode, result, err => {
            if (err) {
              handleError.sendCatchError(res, err);
              return;
            }

            this.sendSuccessResponse(
              res,
              responseBuilder
                .setData(result)
                .setMessage('Node fetched successfully')
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
