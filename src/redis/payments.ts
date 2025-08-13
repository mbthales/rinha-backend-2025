import { Queue } from 'bullmq'

import type {
  paymentPayload,
  processor,
  processorsStatus,
} from '@app-types/payments'

import connection from '@redis/connection'
import {
  redisPaymentsDefaultKey,
  redisPaymentsFallbackKey,
  redisPaymentsQueueJob,
  redisPaymentsQueueName,
  redisProcessorsStatusKey,
} from '@utils/environments'

const payments_queue = new Queue(redisPaymentsQueueName, {
  connection,
})

export const storePaymentRecord = async (
  timestamp: string,
  data: paymentPayload,
  processor: processor
) => {
  const score = new Date(timestamp).getTime()
  const isDefault = processor === 'default'
  const key = isDefault ? redisPaymentsDefaultKey : redisPaymentsFallbackKey

  await connection.zadd(key, score, JSON.stringify(data))
}

export const queuePayment = async (correlationId: string, amount: number) => {
  await payments_queue.add(redisPaymentsQueueJob, {
    correlationId,
    amount,
  })
}

export const getPaymentsStats = async (from: string, to: string) => {
  const fromScore = Date.parse(from)
  const toScore = Date.parse(to)

  const pipeline = connection
    .pipeline()
    .zrangebyscore(redisPaymentsDefaultKey, fromScore, toScore)
    .zrangebyscore(redisPaymentsFallbackKey, fromScore, toScore)

  const results = await pipeline.exec()

  const defaultValues = results?.[0]?.[1] as string[]
  const fallbackValues = results?.[1]?.[1] as string[]

  const processValues = (values: string[]) => {
    let totalRequests = 0
    let totalAmount = 0

    for (const val of values) {
      const parsed = JSON.parse(val) as paymentPayload

      totalRequests++
      totalAmount += parsed.amount
    }

    return { totalRequests, totalAmount }
  }

  const defaultStats = processValues(defaultValues)
  const fallbackStats = processValues(fallbackValues)

  return {
    default: defaultStats,
    fallback: fallbackStats,
  }
}

export const getProcessorsStatus = async () => {
  const healthStatus = await connection.get(redisProcessorsStatusKey)
  const processorsStatus: processorsStatus = healthStatus
    ? JSON.parse(healthStatus)
    : {
        default: true,
        fallback: true,
      }
  return processorsStatus
}
