const BaseService = require('./BaseService');
const { Blocks } = require('../../models');

module.exports = class BlocksService extends BaseService {
  constructor() {
    super(Blocks);
  }

  getLastHeight(callback) {
    Blocks.findOne()
      .select('Height')
      .sort('-Height')
      .exec(callback);
  }

  getFromHeight({ Limit, Height }, callback) {
    Blocks.find()
      .select('BlockID Height')
      .where('Height')
      .gte(Height)
      .limit(Limit)
      .sort('Height')
      .exec(callback);
  }

  destoryRedudance(callback) {
    Blocks.aggregate([
      { $group: { _id: '$Height', uids: { $addToSet: '$_id' }, counter: { $sum: 1 } } },
      { $match: { counter: { $gte: 2 } } },
      { $sort: { counter: -1 } },
    ]).exec((err, results) => {
      if (err) return callback(err, null);
      if (results && results.length < 1) return callback(null, null);

      const promiseDeletes = results.map(item => {
        return new Promise(resolve => {
          Blocks.deleteOne({ Height: item._id }, (err, result) => {
            if (err) return resolve(0);
            if (result.deletedCount < 1) return resolve(0);
            return resolve(result.deletedCount);
          });
        });
      });

      Promise.all(promiseDeletes)
        .then(values => {
          const count = values.reduce((a, b) => parseInt(a) + parseInt(b), 0);
          return callback(null, count);
        })
        .catch(error => callback(error, null));
    });
  }
};
