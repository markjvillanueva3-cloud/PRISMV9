#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LOG = "H:/prism-tribal-binder/.claude/spike-logs/tribal-spike.log";

try {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
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
