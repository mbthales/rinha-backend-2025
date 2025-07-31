import { Queue } from 'bullmq'
import connection from './connection'
import {
  redisPaymentsQueueName,
  redisPaymentsQueueJob,
  redisProcessorsStatusKey,
  redisPaymentsDefaultKey,
  redisPaymentsFallbackKey,
} from '../utils/environments'

const payments_queue = new Queue(redisPaymentsQueueName, {
  connection,
})

export const storePaymentRecord = async (
  timestamp: string,
  data: { correlationId: string; amount: number },
  processor: 'default' | 'fallback'
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

  const processors = ['default', 'fallback']

  const result = {
    default: { totalRequests: 0, totalAmount: 0 },
    fallback: { totalRequests: 0, totalAmount: 0 },
  }

  for (const processor of processors) {
    const isDefault = processor === 'default'
    const key = isDefault ? redisPaymentsDefaultKey : redisPaymentsFallbackKey
    const values = await connection.zrangebyscore(key, fromScore, toScore)

    const parsed = values
      .map((val) => {
        try {
          return JSON.parse(val)
        } catch {
          return null
        }
      })
      .filter(Boolean) as { id: string; amount: number }[]

    result[processor as 'default' | 'fallback'].totalRequests = parsed.length
    result[processor as 'default' | 'fallback'].totalAmount = parsed.reduce(
      (acc, curr) => acc + curr.amount,
      0
    )
  }

  return result
}

export const getProcessorsStatus = async () => {
  const healthStatus = await connection.get(redisProcessorsStatusKey)
  const processorsStatus: { default: boolean; fallback: boolean } = healthStatus
    ? JSON.parse(healthStatus)
    : {
        default: true,
        fallback: true,
      }
  return processorsStatus
}
