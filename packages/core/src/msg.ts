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
  tokenOut,
  tokenInMaxAmount,
  userOsmoAddress,
}: {
  routes: {
    pools: {
      id: string
      tokenInDenom: string
    }[]
    tokenOutAmount: string
  }[]
  tokenOut: { coinMinimalDenom: string }
  tokenInMaxAmount: string
  userOsmoAddress: string
}) {
  return osmosis.poolmanager.v1beta1.MessageComposer.withTypeUrl.splitRouteSwapExactAmountOut(
    {
      sender: userOsmoAddress,
      routes: routes.map(({ pools, tokenOutAmount }) => ({
        pools: pools.map(({ id, tokenInDenom }) => ({
          poolId: BigInt(id),
          tokenInDenom: tokenInDenom,
        })),
        tokenOutAmount: tokenOutAmount,
      })),
      tokenOutDenom: tokenOut.coinMinimalDenom,
      tokenInMaxAmount,
    },
  )
}
