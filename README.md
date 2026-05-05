# Reletter MCP Server

Give AI agents and LLMs access to newsletter data from [Reletter](https://reletter.com). Search 6M+ email newsletters across **Substack**, **LinkedIn**, **Ghost**, and more. Fetch metadata, contacts, issues, and chart rankings.

This is a remote Model Context Protocol (MCP) server that connects AI assistants like Claude, ChatGPT, and Cursor to the [Reletter API](https://reletter.com/developers).

## Use cases

- **Read and analyze newsletter issues** — pull the full body text of any indexed issue into your AI workflow
- **Search and discover newsletters** — find newsletters by topic, platform, or audience size
- **Find newsletters to pitch** — get your product, tool, or book featured. Filter by audience size, topic, or platform, then pull verified contact emails in one pass
- **Build sponsorship, cross-promotion, and PR target lists** — pull verified contacts and export them to your CRM
- **Monitor brand or keyword mentions** — track when your brand, competitors, or clients are mentioned across newsletters
- **Track chart rankings** — daily Substack / LinkedIn / Reletter chart data

## Tools

- **search_publications** — Search for newsletters by topic, title, or author with filters
- **search_issues** — Full-text search across newsletter issue bodies
- **autocomplete** — Suggested keywords and matching newsletters for a partial query
- **get_publication** — Full metadata for a newsletter (subscribers, engagement, social, rankings)
- **list_issues** — Recent issues for a publication
- **get_issue** — A single issue with body text
- **contacts** — Email contacts, contact pages, social accounts for a newsletter
- **chart_categories** — Available chart platforms and categories
- **chart_rankings** — Latest chart rankings for a platform / category
- **list_languages** — Reference list of languages
- **index_stats** — Global Reletter index stats
- **api_quota** — Your API request quota and usage for the month

## Setup

You need a Reletter API key. [Get one here](https://reletter.com/developers).

For autonomous agents that want to provision a key without a human in the loop, Reletter implements the [Machine Payments Protocol](https://mpp.dev). Hit `POST https://api.reletter.com/api/payments/buy/` to get a 402 challenge, pay with a Stripe Shared Payment Token or with USDC on Tempo, and the response carries an API key tied to a freshly-provisioned account. Current bundle tiers: `GET https://api.reletter.com/api/payments/bundles/`. See https://reletter.com/llms-full.txt for the full flow.

### ChatGPT

1. Go to **Settings** → **Apps** → **Advanced settings** and enable **Developer mode**
2. Click **Create app**
3. Enter Name: `Reletter`
4. Enter MCP Server URL: `https://mcp.reletter.com`
5. Click **Create** and enter your Reletter API key when prompted

### Claude.ai

1. Go to **Settings** → **Connectors**
2. Click **Add custom connector** and enter name `Reletter` and MCP server URL `https://mcp.reletter.com`
3. Click **Add** and enter your Reletter API key when prompted

### Claude Desktop

Add to your config file and restart Claude Desktop:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reletter": {
      "url": "https://mcp.reletter.com"
    }
  }
}
```

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "reletter": {
      "type": "http",
      "url": "https://mcp.reletter.com"
    }
  }
}
```

### Cursor

Go to **Settings** → **MCP** → **Add new MCP server**. Set type to **URL** and enter `https://mcp.reletter.com`.

---
<details>
<summary><h3>Development</h3></summary>

If you want to fork or customize this MCP server for your own needs, here is how you can run or deploy it.

### Prerequisites

- Node.js
- A [Cloudflare account](https://dash.cloudflare.com) (for deployment)

### Local dev

```bash
npm install
npm start
```

The server runs at `http://localhost:8789`. Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

### Type-check

```bash
npm run type-check
```

### Regenerate Cloudflare types

After changing `wrangler.jsonc`:

```bash
npm run cf-typegen
```

</details>
