import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { redisHost, redisPort } from '../utils/environment'
import { createPayment } from '../db/query/payments'

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
})

new Worker(
  'payments_queue',
  async (job) => {
    const { correlationId, amount, processor } = job.data as {
      correlationId: string
      amount: number
      processor: 'default' | 'fallback'
    }

    await createPayment(correlationId, amount, processor)
  },
  { connection }
)
