import { Elysia, t } from 'elysia'
import { Queue } from 'bullmq'
import { doesPaymentExists, getGroupedPayments } from '../db/query/payments'

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
    async ({ body, set }) => {
      const { correlationId, amount, processor } = body

      if (await doesPaymentExists(correlationId)) {
        set.status = 'Conflict'

        return { message: 'Payment already exists' }
      }

      await payments_queue.add('payments', {
        correlationId,
        amount,
        processor,
      })

      return { message: 'Payment added to the queue' }
    },
    {
      body: t.Object({
        correlationId: t.String({ format: 'uuid' }),
        amount: t.Number(),
        processor: t.Enum({ default: 'default', fallback: 'fallback' }),
      }),
    }
  )
  .get('/payments-summary', async () => {
    const groupedPayments = await getGroupedPayments()
    const formattedGroupedPayments = groupedPayments.reduce((prev, curr) => {
      prev[curr.processor] = {
        totalRequests: Number(curr.totalRequest),
        totalAmount: Number(curr.totalAmount),
      }
      return prev
    }, {} as Record<string, { totalRequests: number; totalAmount: number }>)

    return formattedGroupedPayments
  })

app.listen(3000)
