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

export function makeSwapExactAmountOutMsg({
  pools,
  tokenInMaxAmount,
  tokenOut,
  userOsmoAddress,
}: {
  pools: {
    id: string
    tokenInDenom: string
  }[]
  tokenInMaxAmount: string
  tokenOut: { denom: string; amount: string }
  userOsmoAddress: string
}) {
  return osmosis.poolmanager.v1beta1.MessageComposer.withTypeUrl.swapExactAmountOut(
    {
      sender: userOsmoAddress,
      routes: pools.map(({ id, tokenInDenom }) => {
        return {
          poolId: BigInt(id),
          tokenInDenom: tokenInDenom,
        }
      }),
      tokenOut: {
        denom: tokenOut.denom,
        amount: tokenOut.amount,
      },
      tokenInMaxAmount,
    },
  )
}

export function makeSwapExactAmountInMsg({
  pools,
  tokenIn,
  tokenOutMinAmount,
  userOsmoAddress,
}: {
  pools: {
    id: string
    tokenOutDenom: string
  }[]
  tokenIn: { denom: string; amount: string }
  tokenOutMinAmount: string
  userOsmoAddress: string
}) {
  return osmosis.poolmanager.v1beta1.MessageComposer.withTypeUrl.swapExactAmountIn(
    {
      sender: userOsmoAddress,
      routes: pools.map(({ id, tokenOutDenom }) => {
        return {
          poolId: BigInt(id),
          tokenOutDenom: tokenOutDenom,
        }
      }),
      tokenIn: {
        denom: tokenIn.denom,
        amount: tokenIn.amount,
      },
      tokenOutMinAmount,
    },
  )
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
    tokenOutAmount: string
  }[]
  tokenOutDenom: string
  tokenInMaxAmount: string
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
        tokenOutAmount,
      })),
      tokenOutDenom,
      tokenInMaxAmount,
    },
  )
}

export function makeSplitRoutesSwapExactAmountInMsg({
  routes,
  tokenInDenom,
  tokenOutMinAmount,
  userOsmoAddress,
}: {
  routes: {
    pools: {
      id: string
      tokenOutDenom: string
    }[]
    tokenInAmount: string
  }[]
  tokenInDenom: string
  tokenOutMinAmount: string
  userOsmoAddress: string
}) {
  return osmosis.poolmanager.v1beta1.MessageComposer.withTypeUrl.splitRouteSwapExactAmountIn(
    {
      sender: userOsmoAddress,
      routes: routes.map(({ pools, tokenInAmount }) => ({
        pools: pools.map(({ id, tokenOutDenom }) => ({
          poolId: BigInt(id),
          tokenOutDenom,
        })),
        tokenInAmount,
      })),
      tokenInDenom,
      tokenOutMinAmount,
    },
  )
}
