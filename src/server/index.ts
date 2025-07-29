import { Elysia, t } from 'elysia'
import { Queue } from 'bullmq'
import { getGroupedPayments } from '../db/queries/payments'

const redisHost = process.env.REDIS_HOST!
const redisPort = Number(process.env.REDIS_PORT!)

const payments_queue = new Queue('payments_queue', {
  connection: {
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
  },
})

const app = new Elysia()

app
  .post(
    '/payments',
    async ({ body }) => {
      const { correlationId, amount } = body

      await payments_queue.add('payments', {
        correlationId,
        amount,
      })

      return { message: 'Payment added to the queue' }
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

    return await getGroupedPayments(from!, to!)
  })

app.listen(9999)
