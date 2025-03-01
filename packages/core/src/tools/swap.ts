import { assets } from 'chain-registry'
import { z } from 'zod'
import type { Account } from '../account.js'
import type { OsmosisSqsQueryClient } from '../queries/sqs/client.js'
import type {
  SidecarInGivenOutQuoteResponse,
  SidecarOutGivenInQuoteResponse,
} from '../queries/sqs/router.js'
import {
  makeSwapExactAmountInEncodeObject,
  makeSwapExactAmountOutEncodeObject,
} from '../tx/swap.js'
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
          ?.exponent ?? 0)

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

const SwapQuoteOutGivenInParams = z.object({
  tickerIn: z
    .string()
    .describe(
      'The ticker symbol of the token you want to swap from (e.g., BTC, ETH, OSMO)',
    ),
  amountIn: z
    .string()
    .describe('The amount of the input token you want to swap'),
  tickerOut: z
    .string()
    .describe(
      'The ticker symbol of the token you want to receive (e.g., BTC, ETH, OSMO)',
    ),
})

type SwapQuoteOutGivenIn = {
  id: string
  expectedTokenOut: string
  rate: string
  priceImpact: string
}

export class SwapQuoteOutGivenInTool
  implements
    Tool<z.infer<typeof SwapQuoteOutGivenInParams>, SwapQuoteOutGivenIn>
{
  readonly name = 'getSwapQuoteOutGivenIn'
  readonly description =
    'Get a swap quote for a specified amount in with decimals identified with tickers like BTC, ETH, OSMO, etc.'
  readonly parameters = SwapQuoteOutGivenInParams

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
      SidecarOutGivenInQuoteResponse
    >,
  ) {}

  async call(
    params: z.infer<typeof SwapQuoteOutGivenInParams>,
  ): Promise<SwapQuoteOutGivenIn> {
    const assetIn = this.osmosisAssets.find(
      (asset) => asset.symbol === params.tickerIn,
    )
    const assetOut = this.osmosisAssets.find(
      (asset) => asset.symbol === params.tickerOut,
    )
    const amountInInt = mulPrecision(
      parseFloat(params.amountIn),
      assetIn?.denom_units.find((unit) => unit.denom === assetIn.display)
        ?.exponent ?? 0,
    )

    if (!assetIn) throw new Error(`Asset in not found: ${params.tickerIn}`)
    if (!assetOut) throw new Error(`Asset out not found: ${params.tickerOut}`)

    const quote = await this.sqsClient.getOutGivenInQuote(
      {
        amount: amountInInt.toString(),
        denom: assetIn.base,
      },
      assetOut.base,
    )

    const amountOutWithDecimals =
      parseInt(quote.amount_out) /
      10 **
        (assetOut.denom_units.find((unit) => unit.denom === assetOut.display)
          ?.exponent ?? 0)

    const id = `${params.tickerIn}-${params.tickerOut}-${params.amountIn}`

    this.memory?.set(id, quote)

    const result = {
      id,
      expectedTokenOut: `${amountOutWithDecimals} ${assetOut.symbol}`,
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

type SendSwapInGivenOutTxOutput = {
  txHash: string
}

export class SendSwapInGivenOutQuoteTxTool
  implements
    Tool<z.infer<typeof SendSwapInGivenOutTxParams>, SendSwapInGivenOutTxOutput>
{
  readonly name = 'sendSwapInGivenOutTx'
  readonly description =
    'Execute a token in given out amount swap quote transaction by ID. Use getSwapQuoteInGivenOut tool to get quotes.'
  readonly parameters = SendSwapInGivenOutTxParams

  constructor(
    protected readonly account: Account,
    readonly memory: ToolMemory<string, SidecarInGivenOutQuoteResponse>,
  ) {}

  async call(
    params: z.infer<typeof SendSwapInGivenOutTxParams>,
  ): Promise<SendSwapInGivenOutTxOutput> {
    const quote = this.memory.get(params.quoteId)
    if (!quote) throw new Error(`Quote not found: ${params.quoteId}`)

    const msg = makeSwapExactAmountOutEncodeObject(
      this.account.address,
      quote,
      params.slippageTolerancePercent ?? 0.5,
    )

    const txHash = await this.account.signAndBroadcast({
      msgs: [msg],
    })

    // Done to avoid old quotes from being re-used.
    this.memory.delete(params.quoteId)

    return {
      txHash,
    }
  }
}

const SendSwapOutGivenInTxParams = z.object({
  quoteId: z.string().describe('The id of the quote to send'),
  slippageTolerancePercent: z
    .number()
    .describe(
      'The percentage of slippage tolerance for the amount out of the quote. Default is 0.5%',
    )
    .optional(),
})

type SendSwapOutGivenInTxOutput = {
  txHash: string
}

export class SendSwapOutGivenInQuoteTxTool
  implements
    Tool<z.infer<typeof SendSwapOutGivenInTxParams>, SendSwapOutGivenInTxOutput>
{
  readonly name = 'sendSwapOutGivenInTx'
  readonly description =
    'Execute a token out given in amount swap quote transaction by ID. Use getSwapQuoteOutGivenIn tool to get quotes.'
  readonly parameters = SendSwapOutGivenInTxParams

  constructor(
    protected readonly account: Account,
    readonly memory: ToolMemory<string, SidecarOutGivenInQuoteResponse>,
  ) {}

  async call(
    params: z.infer<typeof SendSwapOutGivenInTxParams>,
  ): Promise<SendSwapOutGivenInTxOutput> {
    const quote = this.memory.get(params.quoteId)
    if (!quote) throw new Error(`Quote not found: ${params.quoteId}`)

    const msg = makeSwapExactAmountInEncodeObject(
      this.account.address,
      quote,
      params.slippageTolerancePercent ?? 0.5,
    )

    const txHash = await this.account.signAndBroadcast({
      msgs: [msg],
    })

    // Done to avoid old quotes from being re-used.
    this.memory.delete(params.quoteId)

    return {
      txHash,
    }
  }
}
