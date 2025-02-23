import ky from 'ky'

export type SidecarOutGivenInQuoteResponse = {
  amount_in: {
    denom: string
    amount: string
  }
  amount_out: string
  effective_fee: string
  price_impact: string
  in_base_out_quote_spot_price: string
  route: {
    in_amount: string
    out_amount: string
    'has-cw-pool': boolean
    pools: {
      id: number
      type: number
      balances: {
        denom: string
        amount: string
      }
      spread_factor: string
      taker_fee: string
      token_out_denom: string

      /** Code ID, if a Cosmwasm pool. */
      code_id?: number
    }[]
  }[]
}

export type SidecarInGivenOutQuoteResponse = {
  amount_out: {
    denom: string
    amount: string
  }
  amount_in: string
  effective_fee: string
  price_impact: string
  in_base_out_quote_spot_price: string
  route: {
    in_amount: string
    out_amount: string
    'has-cw-pool': boolean
    pools: {
      id: number
      type: number
      balances: {
        denom: string
        amount: string
      }
      spread_factor: string
      taker_fee: string
      token_in_denom: string

      /** Code ID, if a Cosmwasm pool. */
      code_id?: number
    }[]
  }[]
}

export enum SidecarPoolType {
  Weighted = 0,
  Stable = 1,
  Concentrated = 2,
  CosmWasm = 3,
}

export class OsmosisSidecarClient {
  constructor(private readonly sqsUrl = 'https://sqsprod.osmosis.zone') {}

  async getOutGivenInQuote(
    tokenIn: { amount: string; denom: string },
    tokenOutDenom: string,
  ) {
    return ky
      .get(`${this.sqsUrl}/router/quote`, {
        searchParams: {
          tokenIn: `${tokenIn.amount}${tokenIn.denom}`,
          tokenOutDenom,
        },
      })
      .json<SidecarOutGivenInQuoteResponse>()
  }

  async getInGivenOutQuote(tokenOut: { amount: string; denom: string }) {
    return ky
      .get(`${this.sqsUrl}/router/quote`, {
        searchParams: {
          token_out_denom: tokenOut.denom,
          token_out_amount: tokenOut.amount,
        },
      })
      .json<SidecarInGivenOutQuoteResponse>()
  }
}
