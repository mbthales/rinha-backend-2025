import { Worker } from 'bullmq'
import axios from 'axios'
import IORedis from 'ioredis'
import {
  redisHost,
  redisPort,
  processorDefaultUrl,
  processorFallbackUrl,
} from './utils/environments'
import { createPayment } from './db/queries/payments'

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
})

const healthStatusKey = 'payments:health_status'

export const paymentWorker = () => {
  new Worker(
    'payments_queue',
    async (job) => {
      const { correlationId, amount } = job.data as {
        correlationId: string
        amount: number
      }

      const requestedAt = new Date().toISOString()

      const healthStatus = await connection.get(healthStatusKey)
      const processorsStatus: { default: boolean; fallback: boolean } =
        healthStatus
          ? JSON.parse(healthStatus)
          : {
              default: true,
              fallback: true,
            }

      if (processorsStatus.default) {
        try {
          await axios.post(
            `${processorDefaultUrl}/payments`,
            { correlationId, amount, requestedAt },
            {
              headers: { 'Content-Type': 'application/json' },
            }
          )

          await createPayment(correlationId, amount, 'default', requestedAt)
          return
        } catch (_err) {
          console.error('Error processing payment')
        }
      }

      if (processorsStatus.fallback) {
        try {
          await axios.post(
            `${processorFallbackUrl}/payments`,
            { correlationId, amount, requestedAt },
            {
              headers: { 'Content-Type': 'application/json' },
            }
          )

          await createPayment(correlationId, amount, 'fallback', requestedAt)
          return
        } catch (_err) {
          console.error('Error processing payment')
        }
      }

      throw new Error('No processors available')
    },
    {
      connection,
      concurrency: 5,
    }
  )
}
