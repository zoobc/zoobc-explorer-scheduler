const fetch = require('node-fetch')
const config = require('../config')

async function get(ip) {
  const key = config.app.ipStackKey

  if (!key) return null

  return fetch(`http://api.ipstack.com/${ip}?access_key=${key}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(data => data)
    .catch(error => error)
}

module.exports = ipstack = { get }
