import type { AssetList } from '@chain-registry/types'
import Fuse from 'fuse.js'

/** Search asset by ticker. Returns results sorted by weight. */
export function getAsset(ticker: string, { assets }: AssetList) {
  const fuse = new Fuse(assets, {
    keys: ['symbol'],
    includeScore: true,
    threshold: 0.4,
  })

  const result = fuse.search(ticker)

  return result.map((result) => result.item)
}
