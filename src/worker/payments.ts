import { Worker } from 'bullmq'
import { processPayments } from '../services/payments'
import { getProcessorsStatus } from '../redis/payments'
import connection from '../redis/connection'
import { redisPaymentsQueueName } from '../utils/environments'

export const paymentWorker = () => {
  new Worker(
    redisPaymentsQueueName,
    async (job) => {
      const { correlationId, amount } = job.data as {
        correlationId: string
        amount: number
      }

      const requestedAt = new Date().toISOString()
      const processorsStatus = await getProcessorsStatus()

      if (processorsStatus.default) {
        await processPayments(correlationId, amount, requestedAt, 'default')
        return
      }

      if (processorsStatus.fallback) {
        await processPayments(correlationId, amount, requestedAt, 'fallback')
        return
      }

      throw new Error('No processors available')
    },
    {
      connection,
      concurrency: 5,
    }
  )
}
