# VeChain MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to VeChain ecosystem documentation and blockchain data. This server enables seamless integration of VeChain capabilities into AI workflows through the MCP standard.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io) is an open standard that enables AI assistants to securely access external data and tools. This server implements MCP to provide VeChain-specific capabilities to any MCP-compatible client.

## Features

* **Unified Documentation Search**: Search across multiple VeChain ecosystem documentation resources
* **Blockchain Data Access**: Query VeChain Thor blockchain data (blocks, transactions, accounts)
* **Event Decoding**: Decode raw blockchain events into human-readable format
* **Multi-Network Support**: Connect to mainnet, testnet, or solo networks

## Supported Documentation Sources

1. **VeChain Documentation** - Core VeChain blockchain documentation
2. **VeChain Kit** - VeChain development toolkit documentation
3. **VeBetterDao** - Decentralized governance platform documentation
4. **VeVote** - Voting platform documentation
5. **Stargate** - VeChain infrastructure documentation

## Prerequisites

* **Node.js** 18.x or higher (required for running the server)
* An **MCP-compatible client** such as:
  + [Claude Desktop](https://claude.ai/download) (macOS/Windows)
  + [Cursor](https://cursor.sh) (code editor with MCP support)
  + [Claude Code](https://docs.anthropic.com/claude/docs/claude-code) (CLI tool)

## Available Tools

### Documentation Search Tools

* `searchDocsVechain` - Search VeChain documentation
* `searchDocsVechainKit` - Search VeChain Kit documentation
* `searchDocsVebetterDao` - Search VeBetterDao documentation
* `searchDocsVevote` - Search VeVote documentation
* `searchDocsStargate` - Search Stargate documentation

### Thor Read Tools

* `thorGetBlock` - Get compressed block information
* `thorGetTransaction` - Get transaction information
* `thorGetAccount` - Get account information
* `thorDecodeEvent` - Decode a raw event emitted on the thor network

## Quick Start

### 1. Install in Your MCP Client

The easiest way to use the VeChain MCP server is to install it directly from npm using npx. This method automatically downloads and runs the latest version without requiring local setup.

#### For Claude Desktop

1. Locate your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the VeChain server configuration:

```json
{
  "mcpServers": {
    "vechain": {
      "command": "npx",
      "args": ["-y", "@vechain/mcp-server"],
      "env": {
        "VECHAIN_NETWORK": "mainnet"
      }
    }
  }
}
```

3. Restart Claude Desktop

#### For Cursor

1. Open Cursor Settings:
   - Press `Cmd/Ctrl + Shift + P`
   - Type "Open MCP Settings" and select it

2. Add the VeChain server configuration (same JSON as above)

3. Restart Cursor

### 2. Verify Installation

Once your MCP client restarts, you should see the VeChain MCP tools available. You can test by asking your AI assistant:

* "Search VeChain documentation for VTHO"
* "Get the latest block on VeChain"
* "What is my VeChain account balance for address 0x..."

## Configuration

### Network Selection

Set the `VECHAIN_NETWORK` environment variable to connect to different VeChain networks:

* `mainnet` - VeChain MainNet (default, production network)
* `testnet` - VeChain TestNet (for testing and development)
* `solo` - Local solo network (for local development)

Example configuration for testnet:

```json
{
  "mcpServers": {
    "vechain": {
      "command": "npx",
      "args": ["-y", "@vechain/mcp-server"],
      "env": {
        "VECHAIN_NETWORK": "testnet"
      }
    }
  }
}
```

## Run with Docker

Prerequisite: Docker 20+.

1) Pull the multi‑arch image (amd64/arm64):

```bash
docker pull ghcr.io/vechain/vechain-mcp-server:latest
```

2) Run the HTTP server:

```bash
docker run -d --rm \
  -p 4000:4000 \
  -e VECHAIN_NETWORK=mainnet \ # mainnet | testnet | solo
  --name vechain-mcp \
  ghcr.io/vechain/vechain-mcp-server:latest
```

3) Verify:

```bash
curl -fsS http://localhost:4000/health
```

4) List MCP tools (optional check):

```bash
curl -sS -m 10 -X POST http://localhost:4000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}'
```

Notes:
- MCP endpoint: `POST /mcp` (Content-Type: application/json, Accept: application/json, text/event-stream).

## Setup locally

```bash
# Install dependencies
npm install
```

1. Build the project:

```bash
npm run build
```

2. Add the following to your config file:

```json
{
  "mcpServers": {
    "vechain-local": {
      "command": "node",
      "args": [
        "/absolute/path/to/vechain-mcp-server/dist/stdio.js"
      ]
    }
  }
}
```

> 💡 Configured automatically for Cursor and Claude code

## Development (works with Cursor)

In development mode, just run

```bash
npm run dev
```

and use the `vechain-local-dev` server below. It will watch file changes

```json
{
  "mcpServers": {
    "vechain-local-dev": {
      "url": "http://localhost:4000/mcp"
    }
  }
}
```

### MCP Inspector (Development)

```bash
npm run inspect
```

### Run Tests

```bash
npm run build
npm run start
```

then in a second terminal:

```bash
npm run test
```
