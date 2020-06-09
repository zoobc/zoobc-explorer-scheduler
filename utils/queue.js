const Queue = require('bull')
const { setQueues } = require('bull-board')

const util = require('./util')
const config = require('../config')

/** initiating the queue */
let queues = null
const init = (queueName = 'Queue ZooBC Request Core') => {
  queues = new Queue(queueName, { redis: config.redis, limiter: config.queue.optQueue.limiter })
  setQueues([queues])

  /** completing job the queues */
  queues.on('completed', ({ returnvalue }) => {
    if (!util.isObjEmpty(returnvalue)) util.log(returnvalue)
  })
}

/** adding a job to the queues */
const addJob = data => {
  queues && data && queues.add(data, config.queue.optJob)
}

/** processing job the queues */
const processJob = (processing, service) => {
  queues &&
    processing &&
    queues.process(async job => {
      job.progress(25)
      const res = await processing(service, job.data)
      job.progress(100)
      return res
    })
}

module.exports = queue = { init, addJob, processJob }
