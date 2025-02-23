import type { AssetList, Chain } from '@chain-registry/types'
import type { FeeToken } from '@chain-registry/types/chain.schema'
import type { StdFee } from '@cosmjs/amino'
import {
  type SigningCosmWasmClient,
  createWasmAminoConverters,
  wasmTypes,
} from '@cosmjs/cosmwasm-stargate'
import { stringToPath } from '@cosmjs/crypto'
import type { EncodeObject, OfflineSigner } from '@cosmjs/proto-signing'
import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing'
import {
  AminoTypes,
  GasPrice,
  type HttpEndpoint,
  SigningStargateClient,
  type SigningStargateClientOptions,
  calculateFee,
  createDefaultAminoConverters,
  defaultRegistryTypes,
} from '@cosmjs/stargate'
import type { CometClient } from '@cosmjs/tendermint-rpc'
import {
  Comet38Client,
  Tendermint34Client,
  Tendermint37Client,
} from '@cosmjs/tendermint-rpc'
import { ripemd160 } from '@noble/hashes/ripemd160'
import { sha256 } from '@noble/hashes/sha256'
import { bech32, utf8 } from '@scure/base'
import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
import { chains } from 'chain-registry/mainnet'
import { osmosisAminoConverters, osmosisProtoRegistry } from 'osmojs'

export interface CosmosSignData {
  msgs: EncodeObject[]
  chain: Chain
  assetsList?: AssetList
  sender: string
  memo?: string
  feeMultiplier?: number
  fee?: StdFee
}

export interface CosmosSignMessageOptions {
  message: string
  /** Default: `cosmos` */
  chainId?: string
}

type CosmosFee = {
  fee: StdFee
  gasPrice: GasPrice | undefined
}

export interface ICosmosSigner {
  signAndBroadcast: (options: CosmosSignData) => Promise<string>
  signMessage: (options: CosmosSignMessageOptions) => Promise<string>
  estimateFees: (options: CosmosSignData) => Promise<CosmosFee>
  /** If chain ID provided, returns address as represented on that chain. Otherwise, returns address as represented on the defaulted cosmos chain. */
  deriveAddress: (chainId?: string) => string | undefined
}

export class CosmosSigner implements ICosmosSigner {
  constructor(protected readonly mnemonic: string) {}

  async estimateFees({
    msgs,
    chain,
    sender,
    memo,
    feeMultiplier = 2,
  }: CosmosSignData): Promise<CosmosFee> {
    const wallet = await this.getWallet(chain.chain_id)

    const endpoint = chain.apis?.rpc?.[0]
    if (!endpoint) {
      throw new Error('[Cosmos Signer]: No RPC endpoint found')
    }

    const [stargateClient, gasPrice] = await Promise.all([
      getConsensusSigningStargateClient({
        chain,
        endpoint: endpoint.address,
        signer: wallet,
      }),
      getGasPrice(chain),
    ])

    const fee = await estimateFee(
      stargateClient,
      sender,
      msgs,
      gasPrice!,
      memo,
      feeMultiplier,
    )

    return {
      fee,
      gasPrice,
    }
  }

  async signAndBroadcast({ msgs, fee, chain, sender, memo }: CosmosSignData) {
    const wallet = await this.getWallet(chain.chain_id)

    const endpoint = chain.apis?.rpc?.[0]

    if (!endpoint) {
      throw new Error('[Cosmos Signer]: No RPC endpoint found')
    }

    const [stargateClient, gasPrice] = await Promise.all([
      getConsensusSigningStargateClient({
        chain,
        endpoint: endpoint.address,
        signer: wallet,
      }),
      getGasPrice(chain),
    ])

    const transactionHash = await stargateClient.signAndBroadcastSync(
      sender,
      msgs,
      fee ?? (await estimateFee(stargateClient, sender, msgs, gasPrice!, memo)),
      memo,
    )

    return transactionHash
  }

  async signMessage({ message, chainId }: CosmosSignMessageOptions) {
    const wallet = await this.getWallet(chainId)
    const messageHash = utf8.decode(message)

    const signDoc = {
      chainId: '',
      accountNumber: BigInt('0'),
      authInfoBytes: new Uint8Array(),
      sequence: '0',
      bodyBytes: messageHash,
    }

    const { signature } = await wallet.signDirect(this.deriveAddress(), signDoc)

    return signature.signature
  }

  deriveAddress(chainId?: string): string {
    const seed = mnemonicToSeedSync(this.mnemonic)
    const hdkey = HDKey.fromMasterSeed(seed)
    const derivationPath = this.getDerivationPath(chainId)
    const child = hdkey.derive(derivationPath.path)

    if (!child.publicKey) {
      throw new Error('Failed to derive public key')
    }

    const hash = ripemd160(sha256(child.publicKey))

    return bech32.encode(
      derivationPath.prefix ?? 'cosmos',
      bech32.toWords(hash),
    )
  }

  /** Returns configured static default of chain ID not provided or found. */
  protected getDerivationPath(chainId?: string): HDPathOptions {
    return getCosmosDerivationPathsFromRegistry()[chainId ?? 'cosmoshub-4']!
  }

  protected getWallet(chainId?: string) {
    return DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      hdPaths: [stringToPath(this.getDerivationPath(chainId).path)],
      prefix: this.getDerivationPath(chainId).prefix,
    })
  }
}

/**
 * Retrieve chain gas price so we can use fee auto.
 *
 * @param chain
 * @param feeDenom ex. uosmo
 * @returns
 */
async function getGasPrice(chain: Chain, feeDenom?: string) {
  let gasPrice: GasPrice | undefined = undefined

  if (chain.fees && chain.fees.fee_tokens.length > 0) {
    let feeToken: FeeToken | undefined = undefined

    if (feeToken) {
      feeToken = chain.fees.fee_tokens.find((token) => token.denom === feeDenom)
    } else {
      feeToken = chain.fees.fee_tokens[0]
    }

    const averageGasPrice = feeToken?.average_gas_price
    const denom = feeToken?.denom

    if (averageGasPrice && denom && !denom.startsWith('ibc/')) {
      gasPrice = GasPrice.fromString(`${averageGasPrice}${denom}`)
    } else {
      gasPrice = GasPrice.fromString(`1${denom}`)
    }
  }

  return gasPrice
}

/**
 * It allow us to get right client to use, based in chain metadata info and also setup it with registry ecc.
 */
async function getConsensusSigningStargateClient({
  chain,
  endpoint,
  signer,
  options,
}: {
  chain: Chain
  endpoint: string | HttpEndpoint
  signer: OfflineSigner
  options?: SigningStargateClientOptions
}) {
  const { registry, aminoTypes, SigningStargateClient } = getCosmosClient()

  const version = chain.codebase?.consensus?.version
  const type = chain.codebase?.consensus?.type

  const cometClient = await getCometClient({ version, type, endpoint })

  return SigningStargateClient.createWithSigner(cometClient, signer, {
    registry,
    aminoTypes,
    ...options,
  })
}

function getCosmosClient() {
  const registry = new Registry([
    ...defaultRegistryTypes,
    ...wasmTypes,
    ...osmosisProtoRegistry,
  ])

  const aminoTypes = new AminoTypes({
    ...createDefaultAminoConverters(),
    ...createWasmAminoConverters(),
    ...osmosisAminoConverters,
  })

  return {
    registry,
    aminoTypes,
    SigningStargateClient,
    DirectSecp256k1HdWallet,
  }
}

async function getCometClient({
  version,
  type,
  endpoint,
}: {
  type?: string
  version?: string
  endpoint: string | HttpEndpoint
}) {
  let out: CometClient
  const tm37Client = await Tendermint37Client.connect(endpoint)

  if (version) {
    if (type === 'cometbft') {
      tm37Client.disconnect()
      out = await Comet38Client.connect(endpoint)
    } else {
      if (version.startsWith('0.37.')) {
        out = tm37Client
      } else {
        tm37Client.disconnect()
        out = await Tendermint34Client.connect(endpoint)
      }
    }
  } else {
    tm37Client.disconnect()
    out = await Comet38Client.connect(endpoint)
  }

  return out
}

async function estimateFee(
  client: SigningStargateClient | SigningCosmWasmClient,
  sender: string,
  messages: EncodeObject[],
  gasPrice: string | GasPrice,
  memo?: string,
  multiplier = 1.4,
) {
  const gasEstimation = await client.simulate(sender, messages, memo)
  return calculateFee(Math.round(gasEstimation * multiplier), gasPrice)
}

interface HDPathOptions {
  path: string
  prefix: string
}

type DerivationPaths = { [chainId: string]: HDPathOptions }

function getCosmosDerivationPathsFromRegistry(): DerivationPaths {
  return chains
    .filter(
      (chain) =>
        chain.chain_id !== undefined && chain.bech32_prefix !== undefined,
    )
    .reduce((acc: DerivationPaths, chain) => {
      acc[chain.chain_id] = {
        path: `m/44'/${chain.slip44}'/0'/0/0`,
        prefix: chain.bech32_prefix!,
      }
      return acc
    }, {})
}
