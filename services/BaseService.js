module.exports = class BaseService {
  constructor(model) {
    this.model = model
  }

  insert(payload, callback) {
    this.model.insertOne(payload).exec((err, res) => {
      if (err) return callback(err, null)
      if (res && res.length < 1) return callback(null, null)
      return callback(null, res)
    })
  }

  update(key, payload, callback) {
    this.model.findOneAndUpdate(key, payload, { new: false, upsert: false }).exec((err, res) => {
      if (err) return callback(err, null)
      if (res && res.length < 1) return callback(null, null)
      return callback(null, res)
    })
  }

  upserts(items, matchs, callback) {
    this.model.upserts(items, matchs, callback)
  }

  destroies(payload, callback) {
    this.model.deleteMany(payload, callback)
  }
}
