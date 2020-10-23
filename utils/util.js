const CryptoJS = require('crypto-js')
const { SHA3 } = require('sha3')
const base32Encode = require('base32-encode')

const { Int64LE } = require('int64-buffer')

const msg = require('./msg')
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

function getZBCAdress(publicKey, prefix) {
  if (!publicKey) return null

  const bytes = Buffer.alloc(35)
  for (let i = 0; i < 32; i++) bytes[i] = publicKey[i]
  for (let i = 0; i < 3; i++) bytes[i + 32] = prefix.charCodeAt(i)
  const checksum = hash(bytes, 'buffer')
  for (let i = 0; i < 3; i++) bytes[i + 32] = Number(checksum[i])
  const segs = [prefix]
  const b32 = base32Encode(bytes, 'RFC4648')
  for (let i = 0; i < 7; i++) segs.push(b32.substr(i * 8, 8))

  return segs.join('_')
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
  bufferStr,
  zoobitConversion,
  log,
  isObjEmpty,
  isNotNullAccountAddress,
  logMutation,
  queryfy,
  hmacEncrypt,
  getZBCAdress,
  hashToInt64,
}
