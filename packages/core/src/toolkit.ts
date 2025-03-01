import { Account } from './account.js'
import { OsmosisSqsQueryClient } from './queries/sqs/client.js'
import type { SidecarInGivenOutQuoteResponse } from './queries/sqs/router.js'
import { BalancesTool } from './tools/balances.js'
import { SwapQuoteInGivenOutTool } from './tools/swap.js'

export class OsmosisAgentToolkit {
  protected readonly _account: Account
  protected readonly _sqsClient: OsmosisSqsQueryClient
  protected readonly _balancesTool: BalancesTool
  protected readonly _swapQuoteInGivenOutTool: SwapQuoteInGivenOutTool
  protected readonly _quoteAmountOutMemory: Map<
    string,
    SidecarInGivenOutQuoteResponse
  >

  constructor(mnemonic: string) {
    this._account = new Account(mnemonic)
    this._sqsClient = new OsmosisSqsQueryClient()
    this._quoteAmountOutMemory = new Map<
      string,
      SidecarInGivenOutQuoteResponse
    >()

    this._balancesTool = new BalancesTool(
      this._account.address,
      this._sqsClient,
    )

    this._swapQuoteInGivenOutTool = new SwapQuoteInGivenOutTool(
      this._sqsClient,
      this._quoteAmountOutMemory,
    )
  }

  get account() {
    return this._account
  }

  get sqsClient() {
    return this._sqsClient
  }

  get balancesTool() {
    return this._balancesTool
  }

  get swapQuoteInGivenOutTool() {
    return this._swapQuoteInGivenOutTool
  }
}
