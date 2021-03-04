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

const CryptoJS = require('crypto-js')
const { SHA3 } = require('sha3')
const { Int64LE } = require('int64-buffer')

const msg = require('./msg')
const base32 = require('./base32')
const config = require('../config')

const keySize = 256
const iterations = 100
const secretKey = config.app.tokenSecret

function hmacEncrypt(message, key) {
  const encrypted = CryptoJS.HmacSHA256(message, key)
  return encrypted.toString(CryptoJS.enc.Base64)
}

function encrypt(payload) {
  const salt = CryptoJS.lib.WordArray.random(128 / 8)
  const iv = CryptoJS.lib.WordArray.random(128 / 8)
  const key = CryptoJS.PBKDF2(secretKey, salt, {
    keySize: keySize / 32,
    iterations: iterations,
  })
  const encrypted = CryptoJS.AES.encrypt(payload, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  })

  return salt.toString() + iv.toString() + encrypted.toString()
}

function decrypt(payload) {
  const salt = CryptoJS.enc.Hex.parse(payload.substr(0, 32))
  const iv = CryptoJS.enc.Hex.parse(payload.substr(32, 32))
  const encrypted = payload.substring(64)
  const key = CryptoJS.PBKDF2(secretKey, salt, {
    keySize: keySize / 32,
    iterations: iterations,
  })

  return CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC,
  }).toString(CryptoJS.enc.Utf8)
}

const bufferStr = buff => {
  const result = Buffer.from(buff).toString('base64')
  if (result === 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=') return null
  return result
}

const buffStr = buff => {
  if (!buff) return null
  return Buffer.from(buff.toString()).toString()
}

const hashToInt64 = buff => {
  const SlashBuffer = buff.slice(0, 8)
  const bigInt = new Int64LE(SlashBuffer) + ''
  return bigInt
}

const zoobitConversion = curr => {
  if (!curr || curr === 0) return 0
  const result = curr / Math.pow(10, 8)

  if (result.toString().indexOf('e') > 0) {
    const e = parseInt(result.toString().slice(-1))
    return parseFloat(result).toFixed(e)
  }

  return parseFloat(result)
}

const log = obj => {
  if (obj && !obj.error && !obj.result.message) return null
  if (obj.error) return msg.red(obj.error)
  return obj.result && obj.result.success ? msg.green(obj.result.message) : msg.yellow(obj.result.message)
}

const logMutation = message => {
  return msg.green(message)
}

const isObjEmpty = obj => {
  for (var key in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(key)) return false
  }
  return true
}

const isNotNullAccountAddress = val => {
  if (!val || val === '') return false
  return (
    val !==
    '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'
  )
}

const queryfy = obj => {
  if (typeof obj === 'number') {
    return obj
  }

  if (Object.prototype.toString.call(obj) === '[object Date]') {
    return JSON.stringify(obj)
  }

  if (Array.isArray(obj)) {
    const props = obj.map(value => `${queryfy(value)}`).join(',')
    return `[${props}]`
  }

  if (typeof obj === 'object') {
    const props = Object.keys(obj)
      .map(key => `${key}: ${queryfy(obj[key])}`)
      .join(',')
    return `{${props}}`
  }

  return JSON.stringify(obj)
}

function getZBCAddress(publicKey, prefix) {
  const bytes = Buffer.alloc(35)
  for (let i = 0; i < 32; i++) bytes[i] = publicKey[i]
  for (let i = 0; i < 3; i++) bytes[i + 32] = prefix.charCodeAt(i)
  const checksum = hash(bytes, 'buffer')
  for (let i = 0; i < 3; i++) bytes[i + 32] = Number(checksum[i])
  const segs = [prefix]
  const b32 = base32.encode(bytes, 'RFC4648')
  for (let i = 0; i < 7; i++) segs.push(b32.substr(i * 8, 8))

  return segs.join('_')
}

function parseAddress(account) {
  if (account === '' || account === undefined || !account) return null

  let accountBytes
  if (typeof account === 'string') accountBytes = Buffer.from(account.toString(), 'base64')
  else accountBytes = Buffer.from(account)

  if (accountBytes.slice(0).toString() === '') return null

  const type = accountBytes.readInt32LE(0)

  switch (type) {
    case 0 /** ZBCACCOUNTTYPE */:
      return getZBCAddress(accountBytes.slice(4, 36), 'ZBC')
    case 1 /** BTCACCOUNTTYPE */:
      return null
    default:
      return null
  }
}

function hash(str, format) {
  const h = new SHA3(256)
  h.update(str)
  const b = h.digest()
  if (format === 'buffer') return b
  return b.toString(format)
}

module.exports = util = {
  encrypt,
  decrypt,
  buffStr,
  bufferStr,
  zoobitConversion,
  log,
  isObjEmpty,
  isNotNullAccountAddress,
  logMutation,
  queryfy,
  hmacEncrypt,
  getZBCAddress,
  hashToInt64,
  parseAddress,
}
