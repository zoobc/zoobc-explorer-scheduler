const CryptoJS = require('crypto-js')
const config = require('../config')

const keySize = 256
const iterations = 100
const secretKey = config.app.tokenSecret

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

const zoobitConversion = curr => {
  if (!curr || curr === 0) return 0
  const result = curr / Math.pow(10, 8)

  if (result.toString().indexOf('e') > 0) {
    const e = parseInt(result.toString().slice(-1))
    return parseFloat(result).toFixed(e)
  }

  return parseFloat(result)
}

module.exports = util = { encrypt, decrypt, bufferStr, zoobitConversion }
