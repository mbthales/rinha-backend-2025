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
  const fromScore = new Date(from).getTime()
  const toScore = new Date(to).getTime()

  const keys = {
    default: redisPaymentsDefaultKey,
    fallback: redisPaymentsFallbackKey,
  }

  const [defaultValues, fallbackValues] = await Promise.all([
    connection.zrangebyscore(keys.default, fromScore, toScore),
    connection.zrangebyscore(keys.fallback, fromScore, toScore),
  ])

  const parseValues = (values: string[]) =>
    values
      .map((val) => {
        try {
          return JSON.parse(val)
        } catch {
          return null
        }
      })
      .filter(Boolean) as paymentPayload[]

  const defaultParsed = parseValues(defaultValues)
  const fallbackParsed = parseValues(fallbackValues)

  return {
    default: {
      totalRequests: defaultParsed.length,
      totalAmount: defaultParsed.reduce((acc, curr) => acc + curr.amount, 0),
    },
    fallback: {
      totalRequests: fallbackParsed.length,
      totalAmount: fallbackParsed.reduce((acc, curr) => acc + curr.amount, 0),
    },
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
