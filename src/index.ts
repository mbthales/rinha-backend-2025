import { Elysia, t } from 'elysia'

import { getPaymentsStats, queuePayment } from '@redis/payments'
import { processorsHealthMonitor } from '@services/processorsHealth'
import { paymentWorker } from '@workers/payments'

paymentWorker()
processorsHealthMonitor()

new Elysia()
  .post(
    '/payments',
    async ({ body }) => {
      const { correlationId, amount } = body

      await queuePayment(correlationId, amount)

      return 'added to the queue'
    },
    {
      body: t.Object({
        correlationId: t.String({ format: 'uuid' }),
        amount: t.Number(),
      }),
    }
  )
  .get('/payments-summary', async ({ query }) => {
    const { from, to } = query

    return await getPaymentsStats(from!, to!)
  })
  .listen(3000)
