#!/usr/bin/env node
/**
 * pipeline-broadcast.mjs
 * =======================
 *
 * Standardized chat-bus broadcast for session-lifecycle events across the
 * 6-chat fleet. Surfaces which chats are currently in which lifecycle phase so
 * peer chats know not to expect responses from a chat mid-compact (or that a
 * chat is fresh-starting and may be claiming peer-visible state).
 *
 * Lifecycle event types:
 *   - startup_begin       — chat is initializing (just hit /startup)
 *   - startup_complete    — chat is ready for work (RESUME directive loaded)
 *   - checkin_complete    — chat re-claimed slot heartbeat (post-compact, etc.)
 *   - compacting          — chat about to /compact (silent for ~30s; don't @ me)
 *   - handoff_started     — chat writing its per-chat HANDOFF (about to pause)
 *
 * Output: append-only JSONL row to `state/shared/AGENT_CHAT.jsonl` via the
 * existing `agent-coordination.mjs post` API — leverages its already-safe
 * append-only concurrency model.
 *
 * **6-chat-safe:** uses the existing `agent-coordination.mjs` infrastructure
 * which uses atomic appends to AGENT_CHAT.jsonl (race-safe on append-only
 * JSONL via `fs.appendFileSync` which is single-syscall-atomic on POSIX +
 * Windows for entries <PIPE_BUF).
 *
 * Usage:
 *   node pipeline-broadcast.mjs <event-type> [--slot <name>] [--chatId <id>] [--note "<txt>"]
 *
 * Example:
 *   node pipeline-broadcast.mjs compacting --slot bravo --chatId claude-06b8753f
 *   node pipeline-broadcast.mjs startup_complete --slot alpha --chatId claude-abc12345 --note "resumed MS1-U2"
 *
 * @module helpers/pipeline-broadcast
 * @milestone PIPELINE-LIFECYCLE-2026-05-12
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_EVENTS = new Set([
  "startup_begin",
  "startup_complete",
  "checkin_complete",
  "compacting",
  "handoff_started",
]);

function parseArgs(argv) {
  const args = { event: null, slot: null, chatId: null, note: null };
  args.event = argv[2] ?? null;
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slot") args.slot = argv[++i];
    else if (a === "--chatId" || a === "--chat-id") args.chatId = argv[++i];
    else if (a === "--note") args.note = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.event) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "missing_event",
        valid_events: [...VALID_EVENTS],
        usage:
          "pipeline-broadcast.mjs <event> [--slot <name>] [--chatId <id>] [--note <text>]",
      })
    );
    process.exit(2);
  }

  if (!VALID_EVENTS.has(args.event)) {
    console.error(
      JSON.stringify({
        ok: false,
        error: "unknown_event",
        got: args.event,
        valid_events: [...VALID_EVENTS],
      })
    );
    process.exit(2);
  }

  // Construct broadcast message — operator-readable + machine-parseable
  const slot = args.slot ?? "unknown";
  const chatId = args.chatId ?? "unknown";
  const noteSuffix = args.note ? ` — ${args.note}` : "";
  const message = `[lifecycle:${args.event}] slot=${slot} chatId=${chatId}${noteSuffix}`;

  // Delegate to agent-coordination.mjs (its append-only JSONL is race-safe)
  const coordHelper = path.join(__dirname, "agent-coordination.mjs");
  const result = spawnSync(
    process.execPath,
    [coordHelper, "post", "--message", message, "--status", `lifecycle:${args.event}`],
    { windowsHide: true, encoding: "utf8", timeout: 5000 }
  );

  if (result.status !== 0) {
    // Don't fail the pipeline if broadcast fails — it's best-effort surface only.
    console.log(
      JSON.stringify({
        ok: false,
        error: "broadcast_failed",
        event: args.event,
        slot,
        chatId,
        stderr: (result.stderr ?? "").slice(0, 200),
        note: "non-fatal — pipeline continues",
      })
    );
    process.exit(0);
  }

  console.log(
    JSON.stringify({
      ok: true,
      event: args.event,
      slot,
      chatId,
      broadcast_to: "AGENT_CHAT.jsonl",
    })
  );
  process.exit(0);
}

main();
