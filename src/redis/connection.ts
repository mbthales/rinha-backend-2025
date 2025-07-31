import IORedis from 'ioredis'

import { redisHost, redisPort } from '@utils/environments'

const connection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
})

export default connection
