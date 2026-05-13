#!/usr/bin/env node
// tier: T4
/**
 * stop_on_hook_unregistered.mjs — Tier 6 Stop Hook
 * Warns when hook file not in registry.
 */
import fs from "node:fs";
import path from "node:path";

const HOOKS_DIR = "H:/prism/.claude/hooks";
const STOP_HOOK_REGISTRY = "H:/prism/state/shared/STOP_HOOK_REGISTRY.json";

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    // Get all stop hooks
    const stopHooks = fs.readdirSync(HOOKS_DIR)
      .filter(f => f.startsWith("stop_on_") && f.endsWith(".mjs"));

    if (stopHooks.length === 0) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    // Check registry
    let registered = [];
    if (fs.existsSync(STOP_HOOK_REGISTRY)) {
      const data = JSON.parse(fs.readFileSync(STOP_HOOK_REGISTRY, "utf-8"));
      registered = data.hooks?.map(h => h.file || h.name) || [];
    }

    const unregistered = stopHooks.filter(h => !registered.includes(h) && !registered.includes(h.replace(".mjs", "")));

    if (unregistered.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${unregistered.length} stop-hooks not in STOP_HOOK_REGISTRY.json: ${unregistered.slice(0, 3).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
