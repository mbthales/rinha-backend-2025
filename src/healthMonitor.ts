import axios from 'axios'
import IORedis from 'ioredis'
import {
  redisHost,
  redisPort,
  processorDefaultUrl,
  processorFallbackUrl,
} from './utils/environments'

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
})

const healthStatusKey = 'payments:health_status'

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

      await connection.set(healthStatusKey, JSON.stringify(newStatus))
    } catch (_err) {
      console.error('Error checking processors health')
    }
  }

  checkHealth()
  setInterval(checkHealth, 5000)
}
