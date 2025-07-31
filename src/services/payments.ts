import axios from 'axios'

import type { processor } from '@app-types/payments'

import { storePaymentRecord } from '@redis/payments'
import { processorDefaultUrl, processorFallbackUrl } from '@utils/environments'

export const processPayments = async (
  correlationId: string,
  amount: number,
  requestedAt: string,
  processor: processor
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
