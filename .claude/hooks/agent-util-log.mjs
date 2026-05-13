#!/usr/bin/env node
// tier: T4
/**
 * PostToolUse hook — Task-tool invocation ledger.
 *
 * Phase 0.17 U-PLG9 from MASTER-AI-SYSTEM-ROADMAP. Appends one line to
 * AGENT_UTILIZATION_LEDGER.jsonl for every Task-tool call so we know
 * which subagents actually get used. Feeds the U-PLG7 `/commands-audit`
 * report and the U-PLG2 recommender's ranking.
 *
 * Safe to fail: exit 0 always (continueOnError contract). The ledger is
 * observability, not a gate.
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const LEDGER_CLI = resolve("H:/prism/.claude/helpers/agent-util-ledger.mjs");
const STABLE_ID = resolve("H:/prism/.claude/helpers/stable-session-id.mjs");

function readStdin() {
  return new Promise((res) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => res(buf));
    process.stdin.on("error", () => res(""));
  });
}

function terminalId() {
  try {
    const r = spawnSync(process.execPath, [STABLE_ID], { encoding: "utf8", timeout: 1500 });
    if (r.status === 0 && r.stdout) return r.stdout.trim();
  } catch { /* ignore */ }
  return "unknown";
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw) { process.exit(0); return; }

    let data;
    try { data = JSON.parse(raw); } catch { process.exit(0); return; }

    const toolName = data.tool_name || "";
    if (toolName !== "Task") { process.exit(0); return; }

    const input = data.tool_input || {};
    const response = data.tool_response || data.tool_result || {};
    const subagent = input.subagent_type || null;
    const description = input.description || input.prompt || null;

    // Derive exit code from hook-response signal (best-effort)
    const isError = response && typeof response === "object" && (
      response.is_error === true || response.isError === true || response.error != null
    );
    const exitCode = isError ? 1 : 0;

    // Duration: Claude Code may surface this as stop_hook_active or in metadata.
    // Absent, we leave it null — stats mode tolerates missing durations.
    const duration = Number.isFinite(data.durationMs) ? data.durationMs : null;

    const corr = terminalId();

    const args = [
      LEDGER_CLI, "append",
      "--agent", toolName,
      "--exit", String(exitCode),
      "--corr", corr,
      "--by", "claude",
    ];
    if (subagent) { args.push("--subagent", subagent); }
    if (description) { args.push("--desc", String(description)); }
    if (duration !== null) { args.push("--duration", String(duration)); }

    spawnSync(process.execPath, args, { stdio: "ignore", timeout: 2000 });
  } catch { /* swallow */ }
  process.exit(0);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
