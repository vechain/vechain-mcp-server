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

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### MCP Inspector (Development)

```bash
npm run inspect
```

## API Endpoint

The server runs on `http://localhost:4000/mcp` by default.

## Available Tools

### Documentation Search Tools

* `searchDocsVechain` - Search VeChain documentation
* `searchDocsVechainKit` - Search VeChain Kit documentation
* `searchDocsVebetterDao` - Search VeBetterDao documentation
* `searchDocsVevote` - Search VeVote documentation
* `searchDocsStargate` - Search Stargate documentation

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
