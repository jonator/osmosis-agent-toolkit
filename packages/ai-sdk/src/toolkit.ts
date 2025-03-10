import {
  OsmosisAgentToolkit as CoreOsmosisAgentToolkit,
  type Tool as CoreTool,
} from '@osmosis-agent-toolkit/core'
import { type Tool, tool } from 'ai'
import { z } from 'zod'

/** Re-exports core Osmosis toolkit wrapped with ai-sdk tools. */
export class OsmosisAgentToolkit extends CoreOsmosisAgentToolkit {
  get tools() {
    return {
      accountTool: makeAiSdkTool(super.accountTool),
      swapQuoteInGivenOutTool: makeAiSdkTool(super.swapQuoteInGivenOutTool),
      sendSwapInGivenOutQuoteTxTool: makeAiSdkTool(
        super.sendSwapInGivenOutQuoteTxTool,
      ),
      swapQuoteOutGivenInTool: makeAiSdkTool(super.swapQuoteOutGivenInTool),
      sendSwapOutGivenInQuoteTxTool: makeAiSdkTool(
        super.sendSwapOutGivenInQuoteTxTool,
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
