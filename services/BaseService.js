module.exports = class BaseService {
  constructor(model) {
    this.model = model
  }

  upserts(items, matchs, callback) {
    this.model.upserts(items, matchs, callback)
  }

  destroies(payload, callback) {
    this.model.deleteMany(payload, callback)
  }
}
