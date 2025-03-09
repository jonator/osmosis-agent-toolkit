import {
  OsmosisAgentToolkit as CoreOsmosisAgentToolkit,
  type Tool as CoreTool,
} from '@osmosis-agent-toolkit/core'
import { tool, type Tool } from 'ai'
import { z } from 'zod'

/** Re-exports core Osmosis toolkit wrapped with ai-sdk tools. */
export class OsmosisAgentToolkit extends CoreOsmosisAgentToolkit {
  get tools() {
    return {
      accountTool: makeAiSdkTool(this.accountTool),
      swapQuoteInGivenOutTool: makeAiSdkTool(this.swapQuoteInGivenOutTool),
      sendSwapInGivenOutQuoteTxTool: makeAiSdkTool(
        this.sendSwapInGivenOutQuoteTxTool,
      ),
      swapQuoteOutGivenInTool: makeAiSdkTool(this.swapQuoteOutGivenInTool),
      sendSwapOutGivenInQuoteTxTool: makeAiSdkTool(
        this.sendSwapOutGivenInQuoteTxTool,
      ),
    }
  }

  get allTools(): Tool[] {
    return Object.values(this.tools)
  }
}

export function makeAiSdkTool<I, O>(coreTool: CoreTool<I, O>) {
  return tool({
    description: coreTool.description,
    parameters: coreTool.parameters ?? z.never(),
    execute: coreTool.call,
  })
}
