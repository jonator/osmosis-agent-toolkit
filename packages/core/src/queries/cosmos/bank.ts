import { chains } from 'chain-registry/mainnet/index.js'

export type QueryBalancesResponse = {
  balances: {
    denom: string
    amount: string
  }[]
}

export const queryBalances = async (
  bech32Address: string,
  chainId: string = 'osmosis-1',
): Promise<QueryBalancesResponse> => {
  const chain = chains.find((chain) => chain.chain_id === chainId)
  if (!chain) throw new Error(`Chain ${chainId} not found`)

  const response = await fetch(
    `${
      chain.apis!.rest![0]!.address
    }/cosmos/bank/v1beta1/balances/${bech32Address}?pagination.limit=1000`,
  )
  return response.json()
}
