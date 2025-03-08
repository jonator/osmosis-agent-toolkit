import DataLoader from 'dataloader'
import { type PriceMap, getPrice } from './prices.js'
import type {
  SidecarInGivenOutQuoteResponse,
  SidecarOutGivenInQuoteResponse,
} from './router.js'

export class OsmosisSqsQueryClient {
  protected pricesDataLoader = new DataLoader(
    (denoms: readonly string[]) => {
      const url = this.url('/tokens/prices')
      url.searchParams.set('base', denoms.join(','))

      return fetch(url)
        .then((response) => response.json())
        .then((priceMap: PriceMap) => {
          return denoms.map((denom) => {
            try {
              const price = getPrice(priceMap, denom)

              if (!price) {
                return new Error(`No SQS price result for ${denom}`)
              }

              if (price === '0') {
                return new Error(`Zero price result for ${denom}`)
              }

              return price
            } catch (e) {
              return new Error(`Error getting price for ${denom}: ${e}`)
            }
          })
        })
    },
    {
      maxBatchSize: 100, // Limit batch size to avoid hitting URL length limits
    },
  )

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

  async getInGivenOutQuote(
    tokenOut: { amount: string; denom: string },
    tokenInDenom: string,
  ) {
    const url = this.url('/router/quote')
    url.searchParams.set('tokenOut', `${tokenOut.amount}${tokenOut.denom}`)
    url.searchParams.set('tokenInDenom', tokenInDenom)

    const response = await fetch(url)
    return (await response.json()) as SidecarInGivenOutQuoteResponse
  }

  /** Prices are fetched in batches. */
  getPrice(denom: string) {
    return this.pricesDataLoader.load(denom).then(Number)
  }

  protected url(path: string) {
    const url = new URL(path, this.sqsUrl)
    // We deal with denoms via asset lists
    // because we need to deal with amounts with decimals regardless.
    url.searchParams.set('humanDenoms', 'false')
    return url
  }
}
