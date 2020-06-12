const Queue = require('bull')
const { setQueues } = require('bull-board')
const config = require('../config')

/** creating the queue */
const create = (queueName = 'Queue ZooBC Request Core') => {
  const queues = Queue(queueName, { redis: config.redis, ...config.queue.optQueue })
  setQueues([queues])
  return queues
}

module.exports = queue = { create }
