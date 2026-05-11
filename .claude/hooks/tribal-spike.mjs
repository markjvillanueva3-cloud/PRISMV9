#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { isatty } from "node:tty";

const LOG = "H:/prism-tribal-binder/.claude/spike-logs/tribal-spike.log";

try {
  // Synchronous read to EOF (Claude Code closes the hook's stdin after writing).
  // The old `for await (const chunk of process.stdin)` put stdin in flowing mode
  // and kept the event loop alive until end-of-stream — a per-tool-call tax (and
  // a stall if EOF was ever delayed) in a PreToolUse hot path. isatty(0) covers
  // manual invocation without blocking on operator EOF.
  let raw = "";
  try { if (!isatty(0)) raw = readFileSync(0, "utf-8") || ""; } catch { /* no stdin */ }
  const input = JSON.parse(raw || "{}");
  const entry = {
    ts: new Date().toISOString(),
    tool_name: input.tool_name ?? null,
    is_subagent: input.is_subagent ?? null,
    session_id: input.session_id ?? null,
  };
  mkdirSync(dirname(LOG), { recursive: true });
  appendFileSync(LOG, JSON.stringify(entry) + "\n");
  process.exit(0);
} catch (err) {
  // advisory-only — never block
  process.exit(0);
}
