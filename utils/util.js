const CryptoJS = require('crypto-js')
const { SHA3 } = require('sha3')
const B32Enc = require('base32-encode')
const B32Dec = require('base32-decode')

const { Int64LE } = require('int64-buffer')

const msg = require('./msg')
const config = require('../config')

var AccountType = {
  ZbcAccountType: 0,
  BTCAccountType: 1,
  EmptyAccountType: 2,
}

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

function hash(str, format) {
  format = format || 'buffer'

  const h = new SHA3(256)
  h.update(str)
  const b = h.digest()
  if (format === 'buffer') return b
  return b.toString(format)
}

function writeInt32(number) {
  let byte = Buffer.alloc(4)
  byte.writeUInt32LE(number, 0)
  return byte
}

function getZBCAdress(publicKey, prefix) {
  if (!publicKey) return null

  prefix = prefix || 'ZBC'

  const prefixDefault = ['ZBC', 'ZNK', 'ZBL', 'ZTX']
  const valid = prefixDefault.indexOf(prefix) > -1
  if (valid) {
    const bytes = Buffer.alloc(35)
    for (let i = 0; i < 32; i++) bytes[i] = publicKey[i]
    for (let i = 0; i < 3; i++) bytes[i + 32] = prefix.charCodeAt(i)
    const checksum = hash(bytes)
    for (let i = 0; i < 3; i++) bytes[i + 32] = Number(checksum[i])
    const segs = [prefix]
    const b32 = B32Enc(bytes, 'RFC4648')
    for (let i = 0; i < 7; i++) segs.push(b32.substr(i * 8, 8))

    return segs.join('_')
  } else {
    throw new Error('The Prefix not available!')
  }
}

function ZBCAddressToBytes(address) {
  const segs = address.split('_')
  segs.shift()
  const b32 = segs.join('')
  const buffer = Buffer.from(B32Dec(b32, 'RFC4648'))
  return buffer.slice(0, 32)
}

function isZBCAddressValid(address) {
  if (address.length != 66) return false
  const segs = address.split('_')
  const prefix = segs[0]
  segs.shift()
  if (segs.length != 7) return false
  for (let i = 0; i < segs.length; i++) if (!/[A-Z2-7]{8}/.test(segs[i])) return false
  const b32 = segs.join('')
  const buffer = Buffer.from(B32Dec(b32, 'RFC4648'))
  const inputChecksum = []
  for (let i = 0; i < 3; i++) inputChecksum.push(buffer[i + 32])
  for (let i = 0; i < 3; i++) buffer[i + 32] = prefix.charCodeAt(i)
  const checksum = hash(buffer)
  for (let i = 0; i < 3; i++) if (checksum[i] != inputChecksum[i]) return false
  return true
}

function parseAccountAddress(accountBytes) {
  let address = null

  const bufferLength = Buffer.byteLength(accountBytes)

  if (accountBytes != null && Buffer.isBuffer(accountBytes) && bufferLength > 0) {
    const type = accountBytes.readInt32LE(0)
    switch (type) {
      case AccountType.ZbcAccountType:
        address = getZBCAdress(accountBytes.slice(4, 36))
        return address
      case AccountType.BTCAccountType:
        return address
      default:
        return address
    }
  }

  return address
}

function accountToBytes(account) {
  const { address, type } = account

  let bytes
  let typeBytes

  switch (type) {
    case AccountType.ZbcAccountType:
      bytes = ZBCAddressToBytes(address)
      typeBytes = writeInt32(type)
      return Buffer.from([...typeBytes, ...bytes])
    case AccountType.BTCACCOUNTTYPE:
      return Buffer.from([])
    default:
      return Buffer.from([])
  }
}

module.exports = util = {
  encrypt,
  decrypt,
  bufferStr,
  zoobitConversion,
  log,
  isObjEmpty,
  isNotNullAccountAddress,
  logMutation,
  queryfy,
  hmacEncrypt,
  hashToInt64,
  getZBCAdress,
  ZBCAddressToBytes,
  isZBCAddressValid,
  parseAccountAddress,
  accountToBytes,
}
