#!/usr/bin/env node

/**
 * KEEP Claude Desktop MCP Stdio Gateway Bridge
 * Connects Claude Desktop (stdio JSON-RPC) directly to KEEP Remote MCP Engine
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const readline = require('readline');

const REMOTE_ENDPOINT = process.env.KEEP_MCP_URL || 'https://api.skeepit.co/mcp';
const LOCAL_ENDPOINT = process.env.KEEP_LOCAL_URL || 'http://localhost:8000/mcp';

let useLocal = null;

async function checkLocalEngine() {
  if (useLocal !== null) return useLocal;
  return new Promise((resolve) => {
    const req = http.request(LOCAL_ENDPOINT, { method: 'GET', timeout: 300 }, (res) => {
      useLocal = res.statusCode === 200;
      resolve(useLocal);
    });
    req.on('error', () => {
      useLocal = false;
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      useLocal = false;
      resolve(false);
    });
    req.end();
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const payload = JSON.parse(trimmed);

    // If Claude passed a local file path on the user's computer, read its first chunks
    if (payload.method === "tools/call" && payload.params && payload.params.arguments) {
      const args = payload.params.arguments;
      if (args.file_path && !args.file_base64 && !args.media_url) {
        try {
          const resolvedPath = path.resolve(args.file_path);
          if (fs.existsSync(resolvedPath)) {
            const stat = fs.statSync(resolvedPath);
            // Read up to 5MB sample from local file
            const fd = fs.openSync(resolvedPath, 'r');
            const sampleSize = Math.min(stat.size, 5 * 1024 * 1024);
            const buf = Buffer.alloc(sampleSize);
            fs.readSync(fd, buf, 0, sampleSize, 0);
            fs.closeSync(fd);

            args.file_base64 = buf.toString('base64');
            args.file_name = path.basename(resolvedPath);
          }
        } catch (e) {
          // Pass through, handler will report descriptive error
        }
      }
    }

    const dataString = JSON.stringify(payload);

    const isLocalActive = await checkLocalEngine();
    const endpointUrl = isLocalActive ? LOCAL_ENDPOINT : REMOTE_ENDPOINT;
    const url = new URL(endpointUrl);
    const client = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
        'User-Agent': `KEEP-Claude-MCP-Bridge/2.0 (${isLocalActive ? 'LocalMachine' : 'RemoteCloud'})`
      }
    };

    const req = client.request(options, (res) => {
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
