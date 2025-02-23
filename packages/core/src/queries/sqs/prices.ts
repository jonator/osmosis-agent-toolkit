/** Current quote denom for prices returned by sidecar. Currently Noble USDC. */
const QUOTE_COIN_MINIMAL_DENOM =
  'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4'

export type PriceMap = {
  [baseCoinMinimalDenom: string]: {
    [QUOTE_COIN_MINIMAL_DENOM]: string
  }
}

export function getPrice(priceMap: PriceMap, denom: string) {
  return priceMap[denom]?.[QUOTE_COIN_MINIMAL_DENOM]
}
