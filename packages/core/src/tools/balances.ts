import { assets } from 'chain-registry'
import type { z } from 'zod'
import { queryBalances } from '../queries/cosmos/bank.js'
import type { OsmosisSqsQueryClient } from '../queries/sqs/client.js'
import type { Tool } from './tool.js'

// Find Osmosis chain assets
const osmosisAssets =
  assets.find((chain) => chain.chain_name === 'osmosis')?.assets || []

// Response type for a single balance
interface Balance {
  amount: string // Amount with proper decimals
  ticker: string // Asset ticker (e.g. OSMO, ATOM)
  valueUsd: number // Total value in USD
  priceUsd: number // Price per unit in USD
}

export class BalancesTool implements Tool<z.ZodNever, Balance[]> {
  public readonly name = 'getBalances'
  public readonly description = 'Get the accounts balances'

  constructor(
    private readonly bech32Address: string,
    private readonly sqsClient: OsmosisSqsQueryClient,
  ) {}

  async call(): Promise<Balance[]> {
    // Get raw balances using the account client
    const balances = (await queryBalances(this.bech32Address))?.balances
    const denoms = balances.map((balance) => balance.denom)

    // Fetch prices for all denoms
    const priceMap = await this.sqsClient.getPrices(denoms)

    // Transform balances with prices and asset info
    return balances.map(({ denom, amount }) => {
      // Find asset info from chain registry
      const assetInfo = osmosisAssets.find((asset) => asset.base === denom)

      if (!assetInfo) {
        throw new Error(`Asset info not found for denom: ${denom}`)
      }

      const decimals =
        assetInfo.denom_units.find((unit) => unit.denom === assetInfo.display)
          ?.exponent || 6

      // Calculate amount with proper decimals
      const amountWithDecimals = (parseInt(amount) / 10 ** decimals).toString()

      // Get price and calculate value
      const priceUsd = Number(priceMap[denom])
      const valueUsd = Number(amountWithDecimals) * priceUsd

      return {
        amount: amountWithDecimals,
        ticker: assetInfo.symbol,
        valueUsd,
        priceUsd,
      }
    })
  }
}
