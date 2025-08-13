export type paymentPayload = {
  correlationId: string
  amount: number
}

export type processor = 'default' | 'fallback'

export type processorStatusPayload = {
  failing: boolean
  minResponseTime: number
}

export type processorsStatus = {
  default: processorStatusPayload
  fallback: processorStatusPayload
}
