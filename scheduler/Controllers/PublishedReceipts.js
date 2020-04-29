const store = require('./Store');
const BaseController = require('./BaseController');
const { PublishedReceiptsService } = require('../../api/services');

module.exports = class PublishedReceipts extends BaseController {
  constructor() {
    super(new PublishedReceiptsService());
  }

  update(callback) {
    if (store.publishedReceipts.length < 1) return callback(null, null);

    // this.service.insertMany(store.publishedReceipts, (err, results) => {
    //   if (err) return callback(`[Account Transactions] Upsert ${err}`, null);
    //   if (results && results.length < 1) return callback(null, null);
    //   return callback(null, `[Account Transactions] Upsert ${results.length} data successfully`);
    // });
  }
};
