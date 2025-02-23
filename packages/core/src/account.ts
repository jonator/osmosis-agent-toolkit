import type { Chain } from '@chain-registry/types'
import type { FeeToken } from '@chain-registry/types/chain.schema.js'
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
  memo?: string
  feeMultiplier?: number
  fee?: StdFee
}

type CosmosFee = {
  fee: StdFee
  gasPrice: GasPrice | undefined
}

export class Account {
  protected chain: Chain
  protected derivationPath: {
    path: string
    prefix: string
  }

  constructor(
    protected readonly mnemonic: string,
    protected readonly chainId = 'osmosis-1',
  ) {
    this.chain = chains.find((chain) => chain.chain_id === this.chainId)!
    this.derivationPath = {
      path: `m/44'/${this.chain.slip44}'/0'/0/0`,
      prefix: this.chain.bech32_prefix!,
    }
  }

  get address() {
    const seed = mnemonicToSeedSync(this.mnemonic)
    const hdkey = HDKey.fromMasterSeed(seed)
    const child = hdkey.derive(this.derivationPath.path)

    if (!child.publicKey) {
      throw new Error('Failed to derive public key')
    }

    const hash = ripemd160(sha256(child.publicKey))

    return bech32.encode(this.derivationPath.prefix, bech32.toWords(hash))
  }

  async estimateFees({
    msgs,
    memo,
    feeMultiplier = 2,
  }: CosmosSignData): Promise<CosmosFee> {
    const wallet = await this.getWallet()
    const stargateClient = await getConsensusSigningStargateClient({
      chain: this.chain,
      signer: wallet,
    })
    const gasPrice = getGasPrice(this.chain)

    const fee = await estimateFee(
      stargateClient,
      this.address,
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

  async signAndBroadcast({ msgs, fee, memo }: CosmosSignData) {
    const wallet = await this.getWallet()
    const stargateClient = await getConsensusSigningStargateClient({
      chain: this.chain,
      signer: wallet,
    })
    const gasPrice = getGasPrice(this.chain)

    return await stargateClient.signAndBroadcastSync(
      this.address,
      msgs,
      fee ??
        (await estimateFee(
          stargateClient,
          this.address,
          msgs,
          gasPrice!,
          memo,
        )),
      memo,
    )
  }

  async signMessage(message: string) {
    const wallet = await this.getWallet()
    const messageHash = utf8.decode(message)

    const signDoc = {
      chainId: '',
      accountNumber: BigInt('0'),
      authInfoBytes: new Uint8Array(),
      sequence: '0',
      bodyBytes: messageHash,
    }

    return (await wallet.signDirect(this.address, signDoc)).signature.signature
  }

  protected getWallet() {
    return DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      hdPaths: [stringToPath(this.derivationPath.path)],
      prefix: this.derivationPath.prefix,
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
function getGasPrice(chain: Chain, feeDenom?: string) {
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
  signer,
  options,
}: {
  chain: Chain
  signer: OfflineSigner
  options?: SigningStargateClientOptions
}) {
  const version = chain.codebase?.consensus?.version
  const type = chain.codebase?.consensus?.type

  const endpoint = chain.apis?.rpc?.[0]?.address
  if (!endpoint) {
    throw new Error('[Cosmos Signer]: No RPC endpoint found')
  }

  const cometClient = await getCometBftClient({ version, type, endpoint })

  return SigningStargateClient.createWithSigner(cometClient, signer, {
    registry,
    aminoTypes,
    ...options,
  })
}

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

async function getCometBftClient({
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
