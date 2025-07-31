export type paymentPayload = {
  correlationId: string
  amount: number
}

export type processor = 'default' | 'fallback'

export type processorsStatus = {
  default: boolean
  fallback: boolean
}
