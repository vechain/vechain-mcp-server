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
      "args": ["-y", "@vechain/mcp-server@latest"],
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

#### For Claude Code

1. Locate your Claude Code configuration file:
   - Create or edit `~/.claude/mcp.json`

2. Add the VeChain server configuration (same JSON as above)

3. Restart Claude Code

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
* MCP endpoint: `POST /mcp` (Content-Type: application/json, Accept: application/json, text/event-stream).
-

## Local Development Setup

If you want to contribute to the VeChain MCP server or test local changes, follow these instructions.

### Prerequisites for Development

* Node.js 18.x or higher
* npm or yarn package manager
* Git

### Setup Steps

1. **Clone the repository**:

```bash
git clone https://github.com/vechain/vechain-mcp-server.git
cd vechain-mcp-server
```

2. **Install dependencies**:

```bash
npm install
```

3. **Build the project**:

```bash
npm run build
```

### Development Modes

#### Option 1: STDIO Mode (Production-like)

Use this mode to test the server as it would run in production (via stdin/stdout).

1. Build the project (if not already done):

```bash
npm run build
```

2. Configure your MCP client to use the local build:

```json
{
  "mcpServers": {
    "vechain-local": {
      "command": "node",
      "args": ["/absolute/path/to/vechain-mcp-server/dist/stdio.js"],
      "env": {
        "VECHAIN_NETWORK": "testnet"
      }
    }
  }
}
```

Replace `/absolute/path/to/vechain-mcp-server` with the actual path to your cloned repository.

3. Restart your MCP client

> **Note**: For Claude Code and Cursor, the local configuration is already set up in `.claude/mcp.json` and `.cursor/mcp.json` respectively.

#### Option 2: HTTP Mode with Hot Reload (Active Development)

Use this mode when actively developing - it automatically reloads on file changes.

1. Start the development server:

```bash
npm run dev
```

This starts an HTTP server on `http://localhost:4000/mcp` with file watching enabled.

2. Configure your MCP client to connect via HTTP:

```json
{
  "mcpServers": {
    "vechain-local-dev": {
      "url": "http://localhost:4000/mcp"
    }
  }
}
```

3. Restart your MCP client

Now any changes you make to the source code will automatically reload the server.

> **Note**: This HTTP mode currently works with Cursor and other clients that support HTTP transport. Claude Desktop may have limited support for HTTP-based MCP servers.

### Testing Your Changes

#### Using MCP Inspector

The MCP Inspector provides a web UI to test your MCP tools interactively:

```bash
npm run inspect
```

This opens a browser interface where you can test individual tools and see their responses.

#### Running Automated Tests

1. Build and start the server:

```bash
npm run build
npm run start
```

2. In a separate terminal, run the test suite:

```bash
npm run test
```

### Code Quality

Format and lint your code before committing:

```bash
npm run format  # Format code with Biome
npm run lint    # Lint and fix issues with Biome
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
