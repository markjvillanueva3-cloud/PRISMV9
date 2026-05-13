#!/usr/bin/env node
// tier: T4
/**
 * stop_on_orphan_children.mjs — Tier 6 Stop Hook
 * Prevents exit when background agents are still running.
 */
import fs from "node:fs";
import path from "node:path";

const AGENT_STATE_DIR = "H:/prism/state/shared";
const AGENT_PATTERN = /^AGENT_.*_RUNNING\.json$/;

async function main() {
  const input = JSON.parse(await new Promise(r => {
    let d = ""; process.stdin.on("data", c => d += c); process.stdin.on("end", () => r(d));
  }));

  try {
    if (!fs.existsSync(AGENT_STATE_DIR)) {
      console.log(JSON.stringify({ result: "pass" }));
      return;
    }

    const runningAgents = fs.readdirSync(AGENT_STATE_DIR)
      .filter(f => AGENT_PATTERN.test(f))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(AGENT_STATE_DIR, f), "utf-8"));
          const age = Date.now() - (data.startedAt || 0);
          if (age < 3600000) return data.agentId || f; // <1h old
        } catch {}
        return null;
      })
      .filter(Boolean);

    if (runningAgents.length > 0) {
      console.log(JSON.stringify({
        result: "warn",
        message: `${runningAgents.length} background agents still running: ${runningAgents.slice(0, 3).join(", ")}`
      }));
    } else {
      console.log(JSON.stringify({ result: "pass" }));
    }
  } catch {
    console.log(JSON.stringify({ result: "pass" }));
  }
}

main().catch(() => console.log(JSON.stringify({ result: "pass" })));
