import type {
  SidecarInGivenOutQuoteResponse,
  SidecarOutGivenInQuoteResponse,
} from '../queries/index.js'
import {
  makeSplitRoutesSwapExactAmountInMsg,
  makeSplitRoutesSwapExactAmountOutMsg,
  makeSwapExactAmountInMsg,
  makeSwapExactAmountOutMsg,
} from './msg.js'

export function makeSwapExactAmountOutEncodeObject(
  address: string,
  quote: SidecarInGivenOutQuoteResponse,
  slippagePercent: number,
) {
  const tokenInMaxAmount = Math.ceil(
    parseFloat(quote.amount_in) * (1 + slippagePercent / 100),
  ).toString()

  if (quote.route.length === 1) {
    return makeSwapExactAmountOutMsg({
      userOsmoAddress: address,
      pools: quote.route[0]!.pools.map((route) => ({
        id: route.id.toString(),
        tokenInDenom: route.token_in_denom,
      })),
      tokenOut: quote.amount_out,
      tokenInMaxAmount,
    })
  }

  return makeSplitRoutesSwapExactAmountOutMsg({
    userOsmoAddress: address,
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

export function makeSwapExactAmountInEncodeObject(
  address: string,
  quote: SidecarOutGivenInQuoteResponse,
  slippagePercent: number,
) {
  const tokenOutMinAmount = Math.floor(
    parseFloat(quote.amount_out) * (1 - slippagePercent / 100),
  ).toString()

  if (quote.route.length === 1) {
    return makeSwapExactAmountInMsg({
      userOsmoAddress: address,
      pools: quote.route[0]!.pools.map((route) => ({
        id: route.id.toString(),
        tokenOutDenom: route.token_out_denom,
      })),
      tokenIn: quote.amount_in,
      tokenOutMinAmount,
    })
  }

  return makeSplitRoutesSwapExactAmountInMsg({
    userOsmoAddress: address,
    routes: quote.route.map((route) => ({
      pools: route.pools.map((pool) => ({
        id: pool.id.toString(),
        tokenOutDenom: pool.token_out_denom,
      })),
      tokenInAmount: route.in_amount,
    })),
    tokenInDenom: quote.amount_in.denom,
    tokenOutMinAmount,
  })
}
