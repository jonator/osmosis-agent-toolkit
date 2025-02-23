import { cosmos, osmosis } from 'osmojs'

export function sendMsg(
  fromAddress: string,
  toAddress: string,
  denom: string,
  amount: bigint,
) {
  return cosmos.bank.v1beta1.MessageComposer.withTypeUrl.send({
    fromAddress,
    toAddress,
    amount: [
      {
        denom,
        amount: amount.toString(),
      },
    ],
  })
}

export function makeSplitRoutesSwapExactAmountOutMsg({
  routes,
  tokenOutDenom,
  tokenInMaxAmount,
  userOsmoAddress,
}: {
  routes: {
    pools: {
      id: string
      tokenInDenom: string
    }[]
    tokenOutAmount: bigint
  }[]
  tokenOutDenom: string
  tokenInMaxAmount: bigint
  userOsmoAddress: string
}) {
  return osmosis.poolmanager.v1beta1.MessageComposer.withTypeUrl.splitRouteSwapExactAmountOut(
    {
      sender: userOsmoAddress,
      routes: routes.map(({ pools, tokenOutAmount }) => ({
        pools: pools.map(({ id, tokenInDenom }) => ({
          poolId: BigInt(id),
          tokenInDenom,
        })),
        tokenOutAmount: tokenOutAmount.toString(),
      })),
      tokenOutDenom,
      tokenInMaxAmount: tokenInMaxAmount.toString(),
    },
  )
}
