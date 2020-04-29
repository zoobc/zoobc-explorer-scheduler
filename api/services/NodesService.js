const _ = require('lodash');
const BaseService = require('./BaseService');
const { Nodes } = require('../../models');

module.exports = class NodesService extends BaseService {
  constructor() {
    super(Nodes);
  }

  getLastHeight(callback) {
    Nodes.findOne()
      .select('Height')
      .sort('-Height')
      .exec(callback);
  }

  checkIsNewNodes(nodes, callback) {
    if (nodes && nodes.length > 0) {
      const nodePublicKeys = nodes.map(item => item.NodePublicKey);

      Nodes.find()
        .lean()
        .select()
        .where('NodePublicKey')
        .in(nodePublicKeys)
        .exec((err, results) => {
          if (err) {
            return callback(err, null);
          }

          if (results && results.length > 0) {
            results = results.map(item => {
              // let res = { ...item };
              let res = item;
              res.NodePublicKey = JSON.stringify(item.NodePublicKey).replace(/"/g, '');
              delete res._id;
              return res;
            });

            const buffNodes = nodes;
            buffNodes.map(item => {
              item.NodePublicKeyOri = item.NodePublicKey;
              item.NodePublicKey = Buffer.from(item.NodePublicKey).toString('base64');
              return item;
            });

            const newNodes = _.differenceBy(buffNodes, results, 'NodePublicKey');
            if (newNodes && newNodes.length > 0) {
              newNodes.map(item => {
                item.NodePublicKey = item.NodePublicKeyOri;
                delete item.NodePublicKeyOri;
              });

              return callback(null, newNodes);
            } else {
              return callback(null, null);
            }
          } else {
            return callback(null, nodes);
          }
        });
    } else {
      return callback(null, null);
    }
  }
};
