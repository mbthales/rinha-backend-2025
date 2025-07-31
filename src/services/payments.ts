import axios from 'axios'
import {
  processorDefaultUrl,
  processorFallbackUrl,
} from '../utils/environments'
import { storePaymentRecord } from '../redis/payments'

export const processPayments = async (
  correlationId: string,
  amount: number,
  requestedAt: string,
  processor: 'default' | 'fallback'
) => {
  const processorUrl =
    processor === 'default' ? processorDefaultUrl : processorFallbackUrl

  await axios.post(
    `${processorUrl}/payments`,
    { correlationId, amount, requestedAt },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )

  await storePaymentRecord(requestedAt, { correlationId, amount }, processor)
}
