import { assets } from 'chain-registry'
import type { z } from 'zod'
import { queryBalances } from '../queries/cosmos/bank.js'
import type { OsmosisSqsQueryClient } from '../queries/sqs/client.js'
import type { Tool } from './tool.js'

type Balances = {
  valueUsd: number
  balances: Balance[]
}

// Response type for a single balance
type Balance = {
  amount: string // Amount with proper decimals
  ticker: string // Asset ticker (e.g. OSMO, ATOM)
  valueUsd: number // Total value in USD
  priceUsd: number // Price per unit in USD
}

export class BalancesTool implements Tool<z.ZodNever, Balances> {
  public readonly name = 'getBalances'
  public readonly description = 'Get the accounts balances'

  protected readonly osmosisAssets =
    assets.find((chain) => chain.chain_name === 'osmosis')?.assets ?? []

  constructor(
    private readonly bech32Address: string,
    private readonly sqsClient: OsmosisSqsQueryClient,
  ) {}

  async call(): Promise<Balances> {
    // Get raw balances using the account client
    const rawBalances = (await queryBalances(this.bech32Address))?.balances
    const denoms = rawBalances.map((balance) => balance.denom)

    // Fetch prices for all denoms
    const priceMap = await this.sqsClient.getPrices(denoms)

    // Transform balances with prices and asset info
    const balances = rawBalances
      .map(({ denom, amount }) => {
        // Find asset info from chain registry
        const asset = this.osmosisAssets.find((asset) => asset.base === denom)

        if (!asset) return

        const decimals =
          asset.denom_units.find((unit) => unit.denom === asset.display)
            ?.exponent || 6

        // Calculate amount with proper decimals
        const amountWithDecimals = (
          parseInt(amount) /
          10 ** decimals
        ).toString()

        // Get price and calculate value
        const priceUsd = Number(priceMap[denom])
        const valueUsd = Number(amountWithDecimals) * priceUsd

        return {
          amount: amountWithDecimals,
          ticker: asset.symbol,
          valueUsd,
          priceUsd,
        }
      })
      .filter(Boolean) as Balance[]

    return {
      valueUsd: balances.reduce((acc, balance) => acc + balance.valueUsd, 0),
      balances,
    }
  }
}
