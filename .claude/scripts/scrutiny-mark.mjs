#!/usr/bin/env node
/**
 * scrutiny-mark — CLI to record completion of self/agent scrutiny for the
 * current session. Used by Claude after running /scrutinize and the parallel
 * reviewer agent, so the next Stop attempt is allowed through.
 *
 * Usage:
 *   node .claude/scripts/scrutiny-mark.mjs --self --agent --notes "passed"
 *   node .claude/scripts/scrutiny-mark.mjs --self --notes "self only — agent run skipped"
 *   node .claude/scripts/scrutiny-mark.mjs --status                 # show ledger entry
 *   node .claude/scripts/scrutiny-mark.mjs --clear                  # clear current session
 *   node .claude/scripts/scrutiny-mark.mjs --session-id abc --self --agent
 *
 * Session id resolution order:
 *   1. --session-id <id> argument
 *   2. CLAUDE_SESSION_ID env var (Claude Code injects this)
 *   3. stable-session-id helper output
 *   4. "unknown-session" fallback
 */

import { recordScrutiny, getEntry, clearSession } from "../helpers/scrutiny-ledger.mjs";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const STABLE_SESSION_HELPER_TIMEOUT_MS = 2000;

function findStableSessionId(explicitId) {
  if (explicitId) return explicitId;
  if (process.env.CLAUDE_SESSION_ID) return process.env.CLAUDE_SESSION_ID;
  const helper = path.resolve(".claude/helpers/stable-session-id.mjs");
  if (fs.existsSync(helper)) {
    try {
      const out = execSync(`node "${helper}"`, {
        stdio: ["ignore", "pipe", "ignore"],
        timeout: STABLE_SESSION_HELPER_TIMEOUT_MS,
      })
        .toString()
        .trim();
      if (out) return out;
    } catch {
      // fall through
    }
  }
  return "unknown-session";
}

function parseArgs(argv) {
  const out = { self: false, agent: false, notes: "", status: false, clear: false, sessionId: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--self") out.self = true;
    else if (a === "--agent") out.agent = true;
    else if (a === "--status") out.status = true;
    else if (a === "--clear") out.clear = true;
    else if (a === "--notes") out.notes = argv[++i] || "";
    else if (a.startsWith("--notes=")) out.notes = a.slice("--notes=".length);
    else if (a === "--session-id") out.sessionId = argv[++i] || "";
    else if (a.startsWith("--session-id=")) out.sessionId = a.slice("--session-id=".length);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sessionId = findStableSessionId(args.sessionId);

  if (args.status) {
    const entry = getEntry(sessionId);
    console.log(JSON.stringify(entry ? { sessionId, ...entry } : { sessionId, status: "no-entry" }, null, 2));
    return;
  }

  if (args.clear) {
    const cleared = clearSession(sessionId);
    console.log(JSON.stringify({ sessionId, cleared }, null, 2));
    return;
  }

  if (!args.self && !args.agent && !args.notes) {
    console.error("Nothing to record. Pass --self and/or --agent (and optionally --notes \"...\")");
    process.exit(2);
  }

  const entry = recordScrutiny(sessionId, {
    selfReviewed: args.self,
    agentReviewed: args.agent,
    notes: args.notes,
  });
  console.log(JSON.stringify({ sessionId, ...entry }, null, 2));
}

main();
