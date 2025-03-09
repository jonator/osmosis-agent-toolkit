# Osmosis AI SDK

Provides an Osmosis implementation of [Vercel's AI SDK](https://sdk.vercel.ai/).

## Usage Example

This example demonstrates how to use the Osmosis AI SDK to create an API endpoint that streams chat responses while incorporating OsmosisAgentToolkit tools.

```typescript
import { OsmosisAgentToolkit } from '@osmosis-agent-toolkit/ai-sdk'
import { xai } from '@ai-sdk/xai'
import { streamText } from 'ai'

// Initialize the Osmosis toolkit
const osmosisToolkit = new OsmosisAgentToolkit(/* ... */)

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: xai('grok-beta'),
    system: `You are a knowledgeable DeFi assistant...`,
    messages,
    tools: {
      // ... existing tools ...
      
      // Add Osmosis toolkit tools
      ...osmosisToolkit.tools,
      
      // Or if you want to add specific tools:
      getOsmosisAccount: osmosisToolkit.tools.accountTool,
      getSwapQuote: osmosisToolkit.tools.swapQuoteInGivenOutTool,
      executeSwap: osmosisToolkit.tools.sendSwapInGivenOutQuoteTxTool,
    },
  })

  return result.toDataStreamResponse()
}
```
