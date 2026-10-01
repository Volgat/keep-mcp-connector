# KEEP Highlights — Claude & OpenAI MCP Connector

Official open-source Model Context Protocol (MCP) connector for **KEEP Highlights** — the intelligent multimodal media time compression and highlight engine.

## 🚀 Quickstart for Claude Desktop

### 1-Click Install with Smithery:
```bash
npx -y @smithery/cli install @skeepit/keep-mcp --client claude
```

### Or Manual Install in Claude Desktop:
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "keep-highlights": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.skeepit.co/mcp"]
    }
  }
}
```

## 🛠️ Tools Included
- **`discover_highlights`**: Multimodal acoustic & visual surprise analysis with timestamp intervals.
- **`condense_media`**: Lossless stream temporal squeezing and media assembly (`-c copy`).

## 🌐 Links
- Website: [https://skeepit.co](https://skeepit.co)
- Developer Gateway: [https://api.skeepit.co](https://api.skeepit.co)
- Privacy Policy: [https://skeepit.co/privacy.html](https://skeepit.co/privacy.html)
