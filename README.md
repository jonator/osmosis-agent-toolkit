# Osmosis Agent Toolkit

## Overview

This repository contains a collection of packages that are used to build the Osmosis Agent Toolkit.
Large Language Models (LLMs) can use these tools to interact with the Osmosis protocol.

## Packages

### `@osmosis-agent-toolkit/core`

The core package contains the core functionality that is used by the other packages.
This is where registry data, query clients, and sign and broadcast logic is defined.

### `@osmosis-agent-toolkit/mcp`

Model Context Protocol (MCP) implementation of the Osmosis Agent Toolkit.

#### Usage with Claude Desktop or Cursor

Add the following to your `claude_desktop_config.json` or `.cursor/mcp.json`. See [here](https://modelcontextprotocol.io/quickstart/user) for more details.

```json
{
    "mcpServers": {
        "Osmosis": {
            "command": "npx",
            "args": [
                "-y",
                "@osmosis-agent-toolkit/mcp"
            ],
            "env": {
                "OSMOSIS_MNEMONIC": "<your mnemonic here>"
            }
        }
    }
}
```

## Development

Install dependencies using yarn or bun:
```bash
bun i
```

Start watch mode for local development:
```bash
bun run dev
```

To build:
```bash
bun run build
```
