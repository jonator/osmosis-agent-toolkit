import { type PriceMap, getPrice } from './prices.js'
import type {
  SidecarInGivenOutQuoteResponse,
  SidecarOutGivenInQuoteResponse,
} from './router.js'

export class OsmosisSqsQueryClient {
  constructor(private readonly sqsUrl = 'https://sqsprod.osmosis.zone') {}

  async getOutGivenInQuote(
    tokenIn: { amount: string; denom: string },
    tokenOutDenom: string,
  ) {
    const url = this.url('/router/quote')
    url.searchParams.set('tokenIn', `${tokenIn.amount}${tokenIn.denom}`)
    url.searchParams.set('tokenOutDenom', tokenOutDenom)

    const response = await fetch(url)
    return (await response.json()) as SidecarOutGivenInQuoteResponse
  }

  async getInGivenOutQuote(tokenOut: { amount: string; denom: string }) {
    const url = this.url('/router/quote')
    url.searchParams.set('token_out_denom', tokenOut.denom)
    url.searchParams.set('token_out_amount', tokenOut.amount)

    const response = await fetch(url)
    return (await response.json()) as SidecarInGivenOutQuoteResponse
  }

  async getPrices(denoms: string[]) {
    const url = this.url('/tokens/prices')
    url.searchParams.set('base', denoms.join(','))

    const response = await fetch(url)
    const priceMap = (await response.json()) as PriceMap

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
