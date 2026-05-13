#!/usr/bin/env node
// tier: T4
/**
 * stop_on_unregistered_asset.mjs — Tier 6 Stop Hook
 * Warns when new assets created but not registered in cross-session registry.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const REGISTRY = "H:/prism/mcp-server/data/state/cross-session-asset-registry.json";
const ENGINES_DIR = "H:/prism/mcp-server/src/engines";
const STDIN_TIMEOUT_MS = 1500;

function readStdinJson(timeoutMs = STDIN_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let buf = "", settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    };
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", finish);
    setTimeout(finish, timeoutMs);
  });
}

async function main() {
  const input = await readStdinJson();

  try {
    // Get recently created engine files (last 24h)
    const cutoff = Date.now() - 86400000;
    const engineFiles = fs.readdirSync(ENGINES_DIR)
      .filter(f => f.endsWith("Engine.ts"))
      .filter(f => {
        try {
          return fs.statSync(path.join(ENGINES_DIR, f)).mtimeMs > cutoff;
        } catch { return false; }
      });

    if (engineFiles.length === 0) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    // Check registry
    let registry = { assets: [] };
    if (fs.existsSync(REGISTRY)) {
      registry = JSON.parse(fs.readFileSync(REGISTRY, "utf-8"));
    }

    const registeredNames = new Set((registry.assets || []).map(a => a.name));
    const unregistered = engineFiles
      .map(f => f.replace(".ts", ""))
      .filter(name => !registeredNames.has(name));

    if (unregistered.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${unregistered.length} engines not in registry: ${unregistered.slice(0, 3).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
