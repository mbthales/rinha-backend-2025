import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import {
  redisHost,
  redisPort,
  processorDefaultUrl,
  processorFallbackUrl,
} from './utils/environments'
import { createPayment } from './db/queries/payments'

export const startWorker = () => {
  const connection = new IORedis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
  })

  const processorsStatus = {
    default: false,
    fallback: false,
  }

  new Worker(
    'payments_queue',
    async (job) => {
      const { correlationId, amount } = job.data as {
        correlationId: string
        amount: number
      }

      const requestedAt = new Date().toISOString()

      if (processorsStatus.default) {
        const req = await fetch(`${processorDefaultUrl}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correlationId, amount, requestedAt }),
        })

        if (req.ok) {
          await createPayment(correlationId, amount, 'default', requestedAt)
          return
        }
      }

      if (processorsStatus.fallback) {
        const req = await fetch(`${processorFallbackUrl}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correlationId, amount, requestedAt }),
        })

        if (req.ok) {
          await createPayment(correlationId, amount, 'fallback', requestedAt)
          return
        }
      }

      throw new Error('Nenhum processador disponível ou ambos falharam')
    },
    {
      connection,
      concurrency: 3,
    }
  )

  const processorsHealthChecker = async () => {
    let defaultOk = false
    let fallbackOk = false

    try {
      const reqDefault = await fetch(
        `${processorDefaultUrl}/payments/service-health`
      )
      defaultOk = reqDefault.ok
    } catch (error) {
      console.error(error)
    }

    if (!defaultOk) {
      try {
        const reqFallback = await fetch(
          `${processorFallbackUrl}/payments/service-health`
        )
        fallbackOk = reqFallback.ok
      } catch (error) {
        console.error(error)
      }
    }

    if (defaultOk) {
      processorsStatus.default = true
      processorsStatus.fallback = false
    } else if (fallbackOk) {
      processorsStatus.default = false
      processorsStatus.fallback = true
    } else {
      processorsStatus.default = false
      processorsStatus.fallback = false
    }
  }

  setInterval(processorsHealthChecker, 5000)
}
