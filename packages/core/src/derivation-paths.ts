import { chains } from "chain-registry/mainnet";

export interface HDPathOptions {
  path: string;
  prefix: string;
}

export type DerivationPaths = { [chainId: string]: HDPathOptions };

/** WARNING: prefer service function on client, this imports chains from chain-registry into your bundle. */
export function getCosmosDerivationPathsFromRegistry(): DerivationPaths {
  return chains
    .filter(
      (chain) =>
        chain.chain_id !== undefined && chain.bech32_prefix !== undefined
    )
    .reduce((acc: DerivationPaths, chain) => {
      acc[chain.chain_id] = {
        path: `m/44'/${chain.slip44}'/0'/0/0`,
        prefix: chain.bech32_prefix!,
      };
      return acc;
    }, {});
}
