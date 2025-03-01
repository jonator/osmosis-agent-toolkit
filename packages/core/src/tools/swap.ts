import type { EncodeObject } from '@cosmjs/proto-signing'
import { assets } from 'chain-registry'
import { z } from 'zod'
import type { Account } from '../account.js'
import type { OsmosisSqsQueryClient } from '../queries/sqs/client.js'
import type { SidecarInGivenOutQuoteResponse } from '../queries/sqs/router.js'
import {
  makeSplitRoutesSwapExactAmountOutMsg,
  makeSwapExactAmountOutMsg,
} from '../tx/msg.js'
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

const SendSwapInGivenOutTxParams = z.object({
  quoteId: z.string().describe('The id of the quote to send'),
  slippageTolerancePercent: z
    .number()
    .describe(
      'The percentage of slippage tolerance for the amount in of the quote. Default is 0.5%',
    )
    .optional(),
})

type SendSwapInGivenOutQuoteTx = {
  txHash: string
}

export class SendSwapInGivenOutQuoteTxTool
  implements
    Tool<z.infer<typeof SendSwapInGivenOutTxParams>, SendSwapInGivenOutQuoteTx>
{
  readonly name = 'sendSwapInGivenOutQuote'
  readonly description =
    'Execute a token in given out amount swap quote transaction by ID. Use getSwapQuoteInGivenOut tool to get quotes.'
  readonly parameters = SendSwapInGivenOutTxParams

  constructor(
    protected readonly account: Account,
    readonly memory: ToolMemory<string, SidecarInGivenOutQuoteResponse>,
  ) {}

  async call(
    params: z.infer<typeof SendSwapInGivenOutTxParams>,
  ): Promise<SendSwapInGivenOutQuoteTx> {
    const quote = this.memory.get(params.quoteId)
    if (!quote) throw new Error(`Quote not found: ${params.quoteId}`)

    const slippageTolerancePercent = params.slippageTolerancePercent ?? 0.5

    const tokenInMaxAmount = Math.ceil(
      parseFloat(quote.amount_in) * (1 + slippageTolerancePercent / 100),
    ).toString()

    let msg: EncodeObject
    if (quote.route.length === 1) {
      msg = makeSwapExactAmountOutMsg({
        userOsmoAddress: this.account.address,
        pools: quote.route[0]!.pools.map((route) => ({
          id: route.id.toString(),
          tokenInDenom: route.token_in_denom,
        })),
        tokenOut: quote.amount_out,
        tokenInMaxAmount,
      })
    } else {
      msg = makeSplitRoutesSwapExactAmountOutMsg({
        userOsmoAddress: this.account.address,
        routes: quote.route.map((route) => ({
          pools: route.pools.map((pool) => ({
            id: pool.id.toString(),
            tokenInDenom: pool.token_in_denom,
          })),
          tokenOutAmount: route.out_amount,
        })),
        tokenOutDenom: quote.amount_out.denom,
        tokenInMaxAmount,
      })
    }

    const txHash = await this.account.signAndBroadcast({
      msgs: [msg],
    })

    return {
      txHash,
    }
  }
}
