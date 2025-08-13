import { Worker } from 'bullmq'

import type { paymentPayload, processorsStatus } from '@app-types/payments'

import connection from '@redis/connection'
import { getProcessorsStatus } from '@redis/payments'
import { processPayments } from '@services/payments'
import { redisPaymentsQueueName } from '@utils/environments'

let processorsHealth: {
  status: processorsStatus | null
  lastUpdate: number
} = {
  status: null,
  lastUpdate: 0,
}
const processorsHealthTTL = 5000

export const paymentWorker = () => {
  new Worker(
    redisPaymentsQueueName,
    async (job) => {
      const { correlationId, amount } = job.data as paymentPayload

      const requestedAt = new Date().toISOString()

      if (
        !processorsHealth.status ||
        Date.now() - processorsHealth.lastUpdate > processorsHealthTTL
      ) {
        processorsHealth.status = await getProcessorsStatus()
        processorsHealth.lastUpdate = Date.now()
      }

      const defaultIsHealthy = !processorsHealth.status?.default?.failing
      const fallbackIsHealthy = !processorsHealth.status?.fallback?.failing

      if (defaultIsHealthy && !fallbackIsHealthy) {
        await processPayments(correlationId, amount, requestedAt, 'default')
        return
      }

      if (!defaultIsHealthy && fallbackIsHealthy) {
        await processPayments(correlationId, amount, requestedAt, 'default')
      }

      if (defaultIsHealthy && fallbackIsHealthy) {
        if (
          processorsHealth.status?.default?.minResponseTime <
          processorsHealth.status?.fallback?.minResponseTime
        ) {
          await processPayments(correlationId, amount, requestedAt, 'default')
        } else {
          await processPayments(correlationId, amount, requestedAt, 'fallback')
        }
      }

      throw new Error('No processors available')
    },
    {
      connection,
      concurrency: 30,
    }
  )
}
