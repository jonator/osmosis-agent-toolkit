import ky from 'ky'

import { type PriceMap, getPrice } from './prices'
import type {
  SidecarInGivenOutQuoteResponse,
  SidecarOutGivenInQuoteResponse,
} from './router'

export class OsmosisSqsQueryClient {
  constructor(private readonly sqsUrl = 'https://sqsprod.osmosis.zone') {}

  async getOutGivenInQuote(
    tokenIn: { amount: string; denom: string },
    tokenOutDenom: string,
  ) {
    return ky
      .get(this.url('/router/quote'), {
        searchParams: {
          tokenIn: `${tokenIn.amount}${tokenIn.denom}`,
          tokenOutDenom,
        },
      })
      .json<SidecarOutGivenInQuoteResponse>()
  }

  async getInGivenOutQuote(tokenOut: { amount: string; denom: string }) {
    return ky
      .get(this.url('/router/quote'), {
        searchParams: {
          token_out_denom: tokenOut.denom,
          token_out_amount: tokenOut.amount,
        },
      })
      .json<SidecarInGivenOutQuoteResponse>()
  }

  async getPrices(denoms: string[]) {
    const priceMap = await ky
      .get(this.url('/tokens/prices'), {
        searchParams: {
          base: denoms.join(','),
        },
      })
      .json<PriceMap>()

    return denoms.reduce(
      (acc, denom) => {
        acc[denom] = getPrice(priceMap, denom) ?? '0'
        return acc
      },
      {} as Record<string, string>,
    )
  }

  protected url(path: string) {
    return new URL(path, this.sqsUrl)
  }
}
