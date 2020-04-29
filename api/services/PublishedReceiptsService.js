const BaseService = require('./BaseService');
const { PublishedReceipts } = require('../../models');

module.exports = class PublishedReceiptsService extends BaseService {
  constructor() {
    super(PublishedReceipts);
  }

  getLastHeight(callback) {
    PublishedReceipts.findOne()
      .select('BlockHeight')
      .sort('-BlockHeight')
      .exec(callback);
  }

  getFromHeight({ Limit, BlockHeight }, callback) {
    PublishedReceipts.find()
      .select('BlockHeight')
      .where('BlockHeight')
      .gte(BlockHeight)
      .limit(Limit)
      .sort('BlockHeight')
      .exec(callback);
  }
};
