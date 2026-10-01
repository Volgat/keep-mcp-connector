#!/usr/bin/env node

/**
 * KEEP Claude Desktop MCP Stdio Gateway Bridge
 * Connects Claude Desktop (stdio JSON-RPC) directly to KEEP Remote MCP Engine
 */

const https = require('https');
const readline = require('readline');

const MCP_ENDPOINT = process.env.KEEP_MCP_URL || 'https://api.skeepit.co/mcp';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const payload = JSON.parse(trimmed);
    const dataString = JSON.stringify(payload);

    const url = new URL(MCP_ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
        'User-Agent': 'KEEP-Claude-MCP-Bridge/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsedRes = JSON.parse(responseBody);
          process.stdout.write(JSON.stringify(parsedRes) + '\n');
        } catch (e) {
          process.stdout.write(responseBody + '\n');
        }
      });
    });

    req.on('error', (err) => {
      const errorResponse = {
        jsonrpc: '2.0',
        id: payload.id !== undefined ? payload.id : null,
        error: {
          code: -32603,
          message: `KEEP MCP Gateway error: ${err.message}`
        }
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    });

    req.write(dataString);
    req.end();

  } catch (err) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: `Invalid JSON-RPC request: ${err.message}`
      }
    };
    process.stdout.write(JSON.stringify(errorResponse) + '\n');
  }
});
