function modelToObject(item, Model) {
  if (!(item instanceof Model)) {
    item = new Model(item);
  }

  item = item.toObject({
    depopulate: true,
    versionKey: false,
  });

  return item;
}

function matchCriteria(item, fields) {
  const match = {};
  for (const field of fields) {
    match[field] = lookupPath(item, field);
  }

  return match;
}

function lookupPath(obj, path) {
  const keys = path.split('.');
  for (let i = 0; i < keys.length && obj !== undefined; i++) {
    const key = keys[i];
    obj = obj !== null ? obj[key] : undefined;
  }

  return obj;
}

module.exports = function upsertMany(schema) {
  schema.statics.upsertMany = function(items, matchFields, callback) {
    matchFields = matchFields || schema.options.upsertMatchFields;
    if (!Array.isArray(matchFields) || matchFields.length === 0) {
      matchFields = ['_id'];
    }

    if (items && items.length > 0) {
      const bulk = this.collection.initializeUnorderedBulkOp();
      items
        .map(item => modelToObject(item, this))
        .forEach(item => {
          const match = matchCriteria(item, matchFields);
          if (item && item._id) {
            delete item._id;
          }

          bulk
            .find(match)
            .upsert()
            .replaceOne(item);
        });

      bulk.execute(callback);
    } else {
      callback(null, null);
    }
  };
};
