const BaseService = require('./BaseService');
const { BatchReceipt } = require('../../models');

module.exports = class BatchReceiptService extends BaseService {
  constructor() {
    super(BatchReceipt);
  }

  getLastHeight(callback) {
    BatchReceipt.findOne()
      .select('Height')
      .sort('-Height')
      .exec(callback);
  }

  getFromHeight({ Limit, Height }, callback) {
    BatchReceipt.find()
      .select('BlockID Height')
      .where('Height')
      .gte(Height)
      .limit(Limit)
      .sort('Height')
      .exec(callback);
  }
};
