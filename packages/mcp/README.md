# Osmosis Model Context Protocol

Provides an Osmosis implementation of the [Model Context Protocol](https://modelcontextprotocol.io/) server given an account mnemonic.
This enables MCP clients to interact with a given Osmosis account.

## Setup

To run the Osmosis MCP server using npx, use the following command:

```bash
npx -y @osmosis-agent-toolkit/mcp --mnemonic='$MNEMONIC'
# Start with OSMOSIS_MNEMONIC environment variable
npx -y @osmosis-agent-toolkit/mcp
```

## Usage with Claude Desktop or Cursor

Add the following to your `claude_desktop_config.json` or `.cursor/settings.json`. See [here](https://modelcontextprotocol.io/quickstart/user) for more details.

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

## Debugging the Server

To debug your server, you can use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector).

First build the server

```
bun run build
```

Run the following command in your terminal:

```bash
# Start MCP Inspector and server
npx @modelcontextprotocol/inspector bun dist/index.js --mnemonic='$MNEMONIC'
# Start MCP Inspector and server with OSMOSIS_MNEMONIC environment variable
npx @modelcontextprotocol/inspector bun dist/index.js

```

### Instructions

1. Replace `MNEMONIC` with your actual Osmosis mnemonic. Or set the `OSMOSIS_MNEMONIC` environment variable.
2. Run the command to start the MCP Inspector.
3. Open the MCP Inspector UI in your browser and click Connect to start the MCP server.
4. You can see the list of tools you selected and test each tool individually.
