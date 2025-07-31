import axios from 'axios'

import connection from '@redis/connection'
import {
  processorDefaultUrl,
  processorFallbackUrl,
  redisProcessorsStatusKey,
} from '@utils/environments'

export const processorsHealthMonitor = () => {
  const checkHealth = async () => {
    try {
      const [defaultReq, fallbackReq] = await Promise.allSettled([
        axios.get(`${processorDefaultUrl}/payments/service-health`),
        axios.get(`${processorFallbackUrl}/payments/service-health`),
      ])

      const defaultOk =
        defaultReq.status === 'fulfilled' && !defaultReq.value.data.failing
      const fallbackOk =
        fallbackReq.status === 'fulfilled' && !fallbackReq.value.data.failing

      const newStatus = {
        default: defaultOk,
        fallback: fallbackOk,
      }

      await connection.set(redisProcessorsStatusKey, JSON.stringify(newStatus))
    } catch (_err) {
      console.error('Error checking processors health')
    }
  }

  checkHealth()
  setInterval(checkHealth, 5000)
}
