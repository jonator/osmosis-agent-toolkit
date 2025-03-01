import { assets } from 'chain-registry'
import { z } from 'zod'
import type { OsmosisSqsQueryClient } from '../queries/sqs/client.js'
import type { SidecarInGivenOutQuoteResponse } from '../queries/sqs/router.js'
import { mulPrecision } from '../utils/number.js'
import type { Tool, ToolMemory } from './tool.js'

const SwapQuoteInGivenOutParams = z.object({
  tickerIn: z
    .string()
    .describe(
      'The ticker symbol of the token you want to swap from (e.g., BTC, ETH, OSMO)',
    ),
  amountOut: z
    .string()
    .describe('The amount of the output token you want to receive'),
  tickerOut: z
    .string()
    .describe(
      'The ticker symbol of the token you want to receive (e.g., BTC, ETH, OSMO)',
    ),
})

type SwapQuoteInGivenOut = {
  id: string
  requiredTokenIn: string
  rate: string
  priceImpact: string
}

export class SwapQuoteInGivenOutTool
  implements
    Tool<z.infer<typeof SwapQuoteInGivenOutParams>, SwapQuoteInGivenOut>
{
  readonly name = 'getSwapQuoteInGivenOut'
  readonly description =
    'Get a swap quote for a desired amount out with decimals identified with tickers like BTC, ETH, OSMO, etc.'
  readonly parameters = SwapQuoteInGivenOutParams

  protected readonly osmosisAssets =
    assets.find((chain) => chain.chain_name === 'osmosis')?.assets ?? []

  constructor(
    private readonly sqsClient: OsmosisSqsQueryClient,
    /**
     * Useful to provide memory if you want to allow user to swap with
     * these quotes downstream.
     */
    private readonly memory?: ToolMemory<
      string,
      SidecarInGivenOutQuoteResponse
    >,
  ) {}

  async call(
    params: z.infer<typeof SwapQuoteInGivenOutParams>,
  ): Promise<SwapQuoteInGivenOut> {
    const assetIn = this.osmosisAssets.find(
      (asset) => asset.symbol === params.tickerIn,
    )
    const assetOut = this.osmosisAssets.find(
      (asset) => asset.symbol === params.tickerOut,
    )
    const amountOutInt = mulPrecision(
      parseFloat(params.amountOut),
      assetOut?.denom_units.find((unit) => unit.denom === assetOut.display)
        ?.exponent ?? 0,
    )

    if (!assetIn) throw new Error(`Asset in not found: ${params.tickerIn}`)
    if (!assetOut) throw new Error(`Asset out not found: ${params.tickerOut}`)

    const quote = await this.sqsClient.getInGivenOutQuote(
      {
        amount: amountOutInt.toString(),
        denom: assetOut.base,
      },
      assetIn.base,
    )

    const amountInWithDecimals =
      parseInt(quote.amount_in) /
      10 **
        (assetIn.denom_units.find((unit) => unit.denom === assetIn.display)
          ?.exponent ?? 6)

    const id = `${params.tickerIn}-${params.tickerOut}-${params.amountOut}`

    this.memory?.set(id, quote)

    const result = {
      id,
      requiredTokenIn: `${amountInWithDecimals} ${assetIn.symbol}`,
      rate: quote.in_base_out_quote_spot_price,
      priceImpact: quote.price_impact,
    }

    return result
  }
}
