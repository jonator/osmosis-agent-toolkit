import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  Account,
  BalancesTool,
  OsmosisSqsQueryClient,
} from '@osmosis-agent-toolkit/core'

/** An agent that can perform actions on a given account. */
export default class OsmosisAgentServer extends McpServer {
  protected readonly _account: Account
  protected readonly _sqsClient: OsmosisSqsQueryClient

  constructor(mnemonic: string) {
    super({
      name: 'Osmosis',
      version: '0.1.0',
    })

    this._account = new Account(mnemonic)
    this._sqsClient = new OsmosisSqsQueryClient()

    const balancesTool = new BalancesTool(
      this._account.address,
      this._sqsClient,
    )

    this.tool(balancesTool.name, balancesTool.description, () =>
      balancesTool.call().then((result) => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      })),
    )
  }
}
