/** 
 * ZooBC Copyright (C) 2020 Quasisoft Limited - Hong Kong
 * This file is part of ZooBC <https://github.com/zoobc/zoobc-explorer-scheduler>

 * ZooBC is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * ZooBC is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with ZooBC.  If not, see <http://www.gnu.org/licenses/>.

 * Additional Permission Under GNU GPL Version 3 section 7.
 * As the special exception permitted under Section 7b, c and e, 
 * in respect with the Author’s copyright, please refer to this section:

 * 1. You are free to convey this Program according to GNU GPL Version 3,
 *     as long as you respect and comply with the Author’s copyright by 
 *     showing in its user interface an Appropriate Notice that the derivate 
 *     program and its source code are “powered by ZooBC”. 
 *     This is an acknowledgement for the copyright holder, ZooBC, 
 *     as the implementation of appreciation of the exclusive right of the
 *     creator and to avoid any circumvention on the rights under trademark
 *     law for use of some trade names, trademarks, or service marks.

 * 2. Complying to the GNU GPL Version 3, you may distribute 
 *     the program without any permission from the Author. 
 *     However a prior notification to the authors will be appreciated.

 * ZooBC is architected by Roberto Capodieci & Barton Johnston
 * contact us at roberto.capodieci[at]blockchainzoo.com
 * and barton.johnston[at]blockchainzoo.com

 * IMPORTANT: The above copyright notice and this permission notice
 * shall be included in all copies or substantial portions of the Software.
**/

function modelToObject(item, Model) {
  if (!(item instanceof Model)) {
    item = new Model(item)
  }

  item = item.toObject({
    depopulate: true,
    versionKey: false,
  })

  return item
}

function matchCriteria(item, fields) {
  const match = {}
  for (const field of fields) {
    match[field] = lookupPath(item, field)
  }

  return match
}

function lookupPath(obj, path) {
  const keys = path.split('.')
  for (let i = 0; i < keys.length && obj !== undefined; i++) {
    const key = keys[i]
    obj = obj !== null ? obj[key] : undefined
  }

  return obj
}

module.exports = function upserts(schema) {
  schema.statics.upserts = function (items, matchFields, callback) {
    matchFields = matchFields || schema.options.upsertMatchFields
    if (!Array.isArray(matchFields) || matchFields.length === 0) {
      matchFields = ['_id']
    }

    if (items && items.length > 0) {
      const bulk = this.collection.initializeUnorderedBulkOp()
      items
        .map(item => modelToObject(item, this))
        .forEach(item => {
          const match = matchCriteria(item, matchFields)
          if (item && item._id) {
            delete item._id
          }

          bulk.find(match).upsert().replaceOne(item)
        })

      bulk.execute(callback)
    } else {
      callback(null, null)
    }
  }
}
