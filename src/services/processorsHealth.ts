import axios from 'axios'

import type {
  processorStatusPayload,
} from '@app-types/payments'

import connection from '@redis/connection'
import {
  processorDefaultUrl,
  processorFallbackUrl,
  processorsHealthChecker,
  redisProcessorsStatusKey,
} from '@utils/environments'

export const processorsHealthMonitor = () => {
  if (processorsHealthChecker === 'true') {
    const checkHealth = async () => {
      try {
        const [defaultReq, fallbackReq] = await Promise.allSettled([
          axios.get(`${processorDefaultUrl}/payments/service-health`),
          axios.get(`${processorFallbackUrl}/payments/service-health`),
        ])

        const defaultValues: processorStatusPayload =
          defaultReq.status === 'fulfilled' && defaultReq.value.data
        const fallbackValues: processorStatusPayload =
          fallbackReq.status === 'fulfilled' && fallbackReq.value.data

        const newStatus = {
          default: defaultValues,
          fallback: fallbackValues,
        }

        await connection.set(
          redisProcessorsStatusKey,
          JSON.stringify(newStatus)
        )
      } catch (_err) {
        console.error('Error checking processors health')
      }
    }

    checkHealth()
    setInterval(checkHealth, 5000)
  }
}
