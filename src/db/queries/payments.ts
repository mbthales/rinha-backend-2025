import { Pool } from 'pg'
import {
  databaseHost,
  databasePort,
  databaseUser,
  databasePassword,
  databaseName,
} from '../../utils/environments'

const pool = new Pool({
  user: databaseUser,
  password: databasePassword,
  host: databaseHost,
  port: databasePort,
  database: databaseName,
  max: 5,
  idleTimeoutMillis: 30000,
})

export const createPayment = async (
  id: string,
  amount: number,
  processor: 'default' | 'fallback',
  timestamp: string
) => {
  try {
    await pool.query(
      'INSERT INTO payments (id, amount, processor, requestedAt) VALUES ($1, $2, $3, $4)',
      [id, amount, processor, timestamp]
    )
  } catch (_err) {
    console.error('Error adding payment')
  }
}

export const getGroupedPayments = async (from: string, to: string) => {
  try {
    const result = await pool.query(
      `
      SELECT jsonb_build_object(
        'default',
          jsonb_build_object(
            'totalRequests', COALESCE(SUM(CASE WHEN processor = 'default' THEN 1 ELSE 0 END), 0),
            'totalAmount',   COALESCE(SUM(CASE WHEN processor = 'default' THEN amount ELSE 0 END), 0)
          ),
        'fallback',
          jsonb_build_object(
            'totalRequests', COALESCE(SUM(CASE WHEN processor = 'fallback' THEN 1 ELSE 0 END), 0),
            'totalAmount',   COALESCE(SUM(CASE WHEN processor = 'fallback' THEN amount ELSE 0 END), 0)
          )
      ) AS payment_summary
      FROM payments
      WHERE requestedAt BETWEEN $1 AND $2;
      `,
      [from, to]
    )

    return result.rows[0].payment_summary
  } catch (_err) {
    console.error('Error getting payment')
  }
}
