const BaseController = require('./BaseController');
const { ResetsService } = require('../../api/services');

module.exports = class Resets extends BaseController {
  constructor() {
    super(new ResetsService());
  }

  all(callback) {
    this.service.resetAll(err => {
      if (err) return callback(`[Reset] Reset All ${err}`, null);
      return callback(null, '[Resets] Clean all data successfully');
    });
  }
};
