#!/usr/bin/env node
// tier: T3 (advisory) — WORKING-PATH-CAPTURE-MS0 / U-WPC-REPLAY-WIRE (alpha logic, golf-placed).
// Thin stdin shim over scripts/lib/path-replay-advise-core.mjs (tested). Surfaces proven working-paths
// for the chat's domain so it replays instead of re-deriving. Advisory, fail-soft, throttled, never blocks.
// Knobs: PRISM_PATH_REPLAY_ADVISE_DISABLE=1 · _TOPK (default 3) · _THROTTLE_MS (default 600000).
import { pathToFileURL } from "node:url";
import { resolveSlot, adviseReplay, formatAdvisory, throttled } from "../../scripts/lib/path-replay-advise-core.mjs";

function emit(p) { process.stdout.write(JSON.stringify(p ?? { continue: true })); process.exit(0); }

async function main() {
  if (process.env.PRISM_PATH_REPLAY_ADVISE_DISABLE === "1") return emit({ continue: true });
  let s = "";
  try { for await (const c of process.stdin) s += c; } catch { /* none */ }
  let env = {};
  try { env = s ? JSON.parse(s) : {}; } catch { env = {}; }
  const sid = env.session_id || env.sessionId || "";
  const slot = resolveSlot(sid);
  if (!slot) return emit({ continue: true });
  const topK = Number(process.env.PRISM_PATH_REPLAY_ADVISE_TOPK) || 3;
  const win = Number(process.env.PRISM_PATH_REPLAY_ADVISE_THROTTLE_MS) || 600000;
  if (throttled(slot, { windowMs: win })) return emit({ continue: true });
  const a = adviseReplay({ slot, topK });
  if (!a) return emit({ continue: true });
  return emit({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: formatAdvisory(a) } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
