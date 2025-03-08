import { LRUCache } from 'lru-cache'
import { Account } from './account.js'
import { OsmosisSqsQueryClient } from './queries/sqs/client.js'
import type {
  SidecarInGivenOutQuoteResponse,
  SidecarOutGivenInQuoteResponse,
} from './queries/sqs/router.js'
import { AccountTool } from './tools/account.js'
import { AssetsTool } from './tools/assets.js'
import {
  SendSwapInGivenOutQuoteTxTool,
  SendSwapOutGivenInQuoteTxTool,
  SwapQuoteInGivenOutTool,
  SwapQuoteOutGivenInTool,
} from './tools/swap.js'

export class OsmosisAgentToolkit {
  protected readonly _account: Account
  protected readonly _sqsClient = new OsmosisSqsQueryClient()
  protected readonly _accountTool: AccountTool
  protected readonly _assetsTool: AssetsTool
  protected readonly _swapQuoteInGivenOutTool: SwapQuoteInGivenOutTool
  protected readonly _swapQuoteOutGivenInTool: SwapQuoteOutGivenInTool
  protected readonly _sendSwapInGivenOutQuoteTxTool: SendSwapInGivenOutQuoteTxTool
  protected readonly _sendSwapOutGivenInQuoteTxTool: SendSwapOutGivenInQuoteTxTool

  // Use LRU cache to avoid memory leaks in case the LRU server is very long-running.
  protected readonly _quoteAmountOutMemory = new LRUCache<
    string,
    SidecarInGivenOutQuoteResponse
  >({ max: 100 })
  protected readonly _quoteAmountInMemory = new LRUCache<
    string,
    SidecarOutGivenInQuoteResponse
  >({ max: 100 })

  constructor(mnemonic: string) {
    this._account = new Account(mnemonic)

    this._accountTool = new AccountTool(this._account, this._sqsClient)

    this._assetsTool = new AssetsTool(this._sqsClient)

    this._swapQuoteInGivenOutTool = new SwapQuoteInGivenOutTool(
      this._sqsClient,
      this._quoteAmountOutMemory,
    )
    this._swapQuoteOutGivenInTool = new SwapQuoteOutGivenInTool(
      this._sqsClient,
      this._quoteAmountInMemory,
    )
    this._sendSwapInGivenOutQuoteTxTool = new SendSwapInGivenOutQuoteTxTool(
      this._account,
      this._quoteAmountOutMemory,
    )
    this._sendSwapOutGivenInQuoteTxTool = new SendSwapOutGivenInQuoteTxTool(
      this._account,
      this._quoteAmountInMemory,
    )
  }

  get account() {
    return this._account
  }

  get sqsClient() {
    return this._sqsClient
  }

  get accountTool() {
    return this._accountTool
  }

  get assetsTool() {
    return this._assetsTool
  }

  get swapQuoteInGivenOutTool() {
    return this._swapQuoteInGivenOutTool
  }

  get sendSwapInGivenOutQuoteTxTool() {
    return this._sendSwapInGivenOutQuoteTxTool
  }

  get swapQuoteOutGivenInTool() {
    return this._swapQuoteOutGivenInTool
  }

  get sendSwapOutGivenInQuoteTxTool() {
    return this._sendSwapOutGivenInQuoteTxTool
  }
}
