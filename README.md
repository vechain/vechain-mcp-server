# VeChain MCP Server

A Model Context Protocol (MCP) server that provides access to VeChain ecosystem documentation through a unified interface. This server aggregates documentation from multiple VeChain-related projects and makes them searchable through MCP tools.

## Features

* **Unified Documentation Search**: Search across multiple VeChain ecosystem documentation resources

## Supported Documentation Sources

1. **VeChain Documentation** - Core VeChain blockchain documentation
2. **VeChain Kit** - VeChain development toolkit documentation
3. **VeBetterDao** - Decentralized governance platform documentation
4. **VeVote** - Voting platform documentation
5. **Stargate** - VeChain infrastructure documentation

## Installation

```bash
# Install dependencies
npm install
```

## Setup with MCP clients (local)

1. Build the project:

```bash
npm run build
```

3. Add the following to your config file:

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

In Cursor:

> 💡 It should be configured automatically

   - Open Cursor Settings (Cmd/Ctrl + Shift + P → "Open MCP Settings")

In Claude Desktop:

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

4. Restart app

## Development (works with Cursor)

In development mode, just run

```bash
npm run dev
```

and use the `vechain-local-dev` server below. It will watch file changes

```json
{
  "mcpServers": {
    "vechain": {
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

## API Endpoint

The server runs on `http://localhost:4000/mcp` by default when using remote setup.

## Available Tools

### Documentation Search Tools

* `searchDocsVechain` - Search VeChain documentation
* `searchDocsVechainKit` - Search VeChain Kit documentation
* `searchDocsVebetterDao` - Search VeBetterDao documentation
* `searchDocsVevote` - Search VeVote documentation
* `searchDocsStargate` - Search Stargate documentation

### Thor Read Tools

* `get_block` - Get compressed block information
* `get_transaction` - Get transaction information
* `get_account` - Get account information

### Example Usage

Each search tool accepts a `query` parameter and returns relevant documentation content.

```json
{
  "name": "searchDocsVechain",
  "arguments": {
    "query": "what is VTHO ?"
  }
}
```

