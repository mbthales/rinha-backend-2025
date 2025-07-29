import { Client } from 'pg'
import {
  databaseHost,
  databasePort,
  databaseUser,
  databasePassword,
  databaseName,
} from '../../utils/environment'

const client = new Client({
  user: databaseUser,
  password: databasePassword,
  host: databaseHost,
  port: databasePort,
  database: databaseName,
})

client.connect()

export const createPayment = async (
  id: string,
  amount: number,
  processor: 'default' | 'fallback'
) => {
  try {
    const timestamp = new Date().toISOString()

    await client.query(
      'INSERT INTO payments (id, amount, request_time, processor) VALUES ($1, $2, $3, $4)',
      [id, amount, timestamp, processor]
    )
  } catch (err) {
    console.error(err)
    throw new Error('Payment error')
  }
}

export const doesPaymentExists = async (id: string) => {
  try {
    const result = await client.query('SELECT * FROM payments WHERE id = $1', [
      id,
    ])

    return result.rows.length > 0
  } catch (err) {
    console.error(err)
    throw new Error('Error checking payment')
  }
}

export const getGroupedPayments = async () => {
  try {
    const result = await client.query(
      `SELECT processor, COUNT(*) AS "totalRequest", SUM(amount) AS "totalAmount"
       FROM payments
       GROUP BY processor`
    )

    return result.rows as [
      {
        processor: 'string'
        totalRequest: 'string'
        totalAmount: 'string'
      }
    ]
  } catch (err) {
    console.error(err)
    throw new Error('Error fetching grouped payments')
  }
}
