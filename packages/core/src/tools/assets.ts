import { assets } from 'chain-registry'
import { z } from 'zod'
import type { OsmosisSqsQueryClient } from '../queries/sqs/client.js'
import type { Tool } from './tool.js'

const GetAssetsParams = z.object({
  ticker: z
    .string()
    .optional()
    .describe('Optional ticker symbol to filter assets (e.g., BTC, ETH, OSMO)'),
})

type Asset = {
  ticker: string
  name: string
  priceUsd: number
}

type Assets = {
  assets: Asset[]
}

export class AssetsTool
  implements Tool<z.infer<typeof GetAssetsParams>, Assets>
{
  readonly name = 'getAssets'
  readonly description =
    'Get information about assets available on Osmosis, including their current prices in USD.'
  readonly parameters = GetAssetsParams

  protected readonly osmosisAssets =
    assets.find((chain) => chain.chain_name === 'osmosis')?.assets ?? []

  constructor(private readonly sqsClient: OsmosisSqsQueryClient) {}

  async call(params: z.infer<typeof GetAssetsParams>): Promise<Assets> {
    // Filter assets by ticker if provided
    let filteredAssets = this.osmosisAssets
    if (params.ticker) {
      filteredAssets = this.osmosisAssets.filter(
        (asset) => asset.symbol.toLowerCase() === params.ticker?.toLowerCase(),
      )
    }

    // Fetch prices for all assets
    const assetsWithPrices = await Promise.all(
      filteredAssets.map((asset) =>
        this.sqsClient.getPrice(asset.base).then((price) => ({
          ticker: asset.symbol,
          name: asset.name,
          priceUsd: price,
        })),
      ),
    )

    return {
      assets: assetsWithPrices.filter((asset) => asset.priceUsd > 0),
    }
  }
}
