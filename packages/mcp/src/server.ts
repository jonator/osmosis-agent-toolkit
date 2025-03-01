import {
  McpServer,
  type ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js'
import { OsmosisAgentToolkit } from '@osmosis-agent-toolkit/core'

/** An agent that can perform actions on a given account. */
export default class OsmosisAgentServer extends McpServer {
  protected readonly _toolkit: OsmosisAgentToolkit

  constructor(mnemonic: string) {
    super({
      name: 'Osmosis',
      version: '0.1.0',
    })

    this._toolkit = new OsmosisAgentToolkit(mnemonic)

    const balancesTool = this._toolkit.balancesTool
    this.tool(balancesTool.name, balancesTool.description, () =>
      balancesTool.call().then(createTextOutput),
    )

    const swapQuoteInGivenOutTool = this._toolkit.swapQuoteInGivenOutTool
    this.tool(
      swapQuoteInGivenOutTool.name,
      swapQuoteInGivenOutTool.description,
      swapQuoteInGivenOutTool.parameters.shape,
      (params) => swapQuoteInGivenOutTool.call(params).then(createTextOutput),
    )

    const sendSwapInGivenOutQuoteTxTool =
      this._toolkit.sendSwapInGivenOutQuoteTxTool
    this.tool(
      sendSwapInGivenOutQuoteTxTool.name,
      sendSwapInGivenOutQuoteTxTool.description,
      sendSwapInGivenOutQuoteTxTool.parameters.shape,
      (params) =>
        sendSwapInGivenOutQuoteTxTool.call(params).then(createTextOutput),
    )
  }
}

function createTextOutput<T>(result: T): ReturnType<ToolCallback> {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
  }
}
