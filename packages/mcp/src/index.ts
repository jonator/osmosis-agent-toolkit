#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { green, red, yellow } from 'colors'
import OsmosisAgentServer from './server.js'

const ACCEPTED_ARGS = ['mnemonic']

function parseArgs(args: string[]) {
  const options: { mnemonic?: string } = {}

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')

      if (key === 'mnemonic') {
        options.mnemonic = value
      } else {
        throw new Error(
          `Invalid argument: ${key}. Accepted arguments are: ${ACCEPTED_ARGS.join(
            ', ',
          )}`,
        )
      }
    }
  }

  // Check if mnemonic is provided in args or environment
  const mnemonic = options.mnemonic || process.env.OSMOSIS_MNEMONIC
  if (!mnemonic) {
    throw new Error(
      'Osmosis mnemonic not provided. Please either pass it as an argument --mnemonic=$MNEMONIC or set the OSMOSIS_MNEMONIC environment variable.',
    )
  }

  return { mnemonic }
}

function handleError(error: unknown) {
  console.error(red('\n🚨  Error initializing Osmosis MCP server:\n'))
  console.error(
    yellow(`   ${error instanceof Error ? error.message : String(error)}\n`),
  )
  process.exit(1)
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2))

    const server = new OsmosisAgentServer(options.mnemonic)
    const transport = new StdioServerTransport()

    await server.connect(transport)
    // Use console.error since console.log outputs to stdio
    console.error(green('✅ Osmosis MCP Server running on stdio'))
  } catch (error) {
    handleError(error)
  }
}

if (require.main === module) {
  main().catch(handleError)
}
