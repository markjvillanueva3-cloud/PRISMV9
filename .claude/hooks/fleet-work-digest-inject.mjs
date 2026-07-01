#!/usr/bin/env node
// tier: T2
/**
 * fleet-work-digest-inject.mjs -- injects the compact cross-fleet work digest
 * (state/shared/FLEET-WORK-DIGEST.md, built by scripts/fleet-work-digest.mjs) so any chat
 * passively KNOWS what every other slot is working on + has shipped, from ~320 tokens
 * instead of reading 26 x ~215-line consolidated handoffs.
 *
 * Fires on:
 *   - SessionStart (all events): inject once so a new/compacted chat anchors to the fleet.
 *   - UserPromptSubmit: inject ONLY when the prompt asks about the fleet (keyword-gated) --
 *     so steady-state turns pay ZERO tokens for this.
 *
 * Drill-down stays opt-in: the digest footer points at `slot-query.mjs <slot>` for one slot's
 * full detail. ADVISORY -- always {continue:true}; never blocks. Fail-soft on missing digest.
 *
 * Knobs: PRISM_FLEET_WORK_DIGEST_INJECT_DISABLE=1 (off), PRISM_FLEET_WORK_DIGEST_STALE_MIN=N
 * (age past which the inject stamps a "regen" hint; default 30).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_STALE_MIN = 30;
const STDIN_TIMEOUT_MS = 250;

// ---- Keyword gate for UserPromptSubmit (token-leak guard) -----------------------------------
// Two arms, OR'd by isFleetQuery():
//  (1) EXPLICIT fleet queries -- unambiguous, always safe to inject on.
const FLEET_EXPLICIT_RE = /\b(?:fleet[ -]?(?:status|work|digest)|what(?:'s| is| are)? (?:everyone|the (?:other )?(?:chats|slots))|other chats|all (?:the )?(?:chats|slots)|who (?:built|is building|shipped)|cross[- ]?chat)\b/i;
//  (2) PER-SLOT query -- "what is/did <NATO> doing/building/shipped...". The slot name ALONE is
//      NOT enough: many NATO words are common coding terms (alpha-channel, uniform distribution,
//      victor.ts, mike=microphone, india, tango), so a bare "what is uniform" must NOT inject.
//      Requiring a fleet-WORK verb within 30 chars after the slot name keeps "what is oscar
//      doing" / "what did kilo build" while rejecting incidental slot-name mentions. (P1 fix,
//      golf 2026-06-15 -- the operator's "WITHOUT losing tokens" requirement.)
const FLEET_SLOT_RE = /\bwhat (?:did|is|has|are|'?s) (?:alpha|bravo|charlie|delta|echo|foxtrot|golf|hotel|india|juliett|kilo|lima|mike|november|oscar|papa|quebec|romeo|sierra|tango|uniform|victor|whiskey|xray|yankee|zulu)\b[^?!.\n]{0,30}\b(?:doing|working|build|building|built|ship|shipped|making|made|up to|status|progress|working on)\b/i;
export function isFleetQuery(prompt) {
  const p = String(prompt || "");
  return FLEET_EXPLICIT_RE.test(p) || FLEET_SLOT_RE.test(p);
}

function digestPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "state", "shared", "FLEET-WORK-DIGEST.md");
}

function readStdin() {
  return new Promise((res) => {
    let buf = ""; let done = false;
    const fin = () => { if (done) return; done = true; res(buf); };
    try {
      const t = setTimeout(fin, STDIN_TIMEOUT_MS);
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", () => { clearTimeout(t); fin(); });
      process.stdin.on("error", () => { clearTimeout(t); fin(); });
    } catch { fin(); }
  });
}

function emit(eventName, additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: eventName, additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

async function main() {
  const raw = await readStdin();
  if (process.env.PRISM_FLEET_WORK_DIGEST_INJECT_DISABLE === "1") { emit(); return; }
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }
  const event = payload.hook_event_name || payload.hookEventName || "SessionStart";
  const prompt = String(payload.prompt || payload.user_prompt || "");

  // UserPromptSubmit: only inject when the prompt is fleet-curious (token-leak guard).
  if (event === "UserPromptSubmit" && !isFleetQuery(prompt)) { emit(); return; }

  const path = digestPath();
  if (!existsSync(path)) {
    if (event === "UserPromptSubmit") {
      emit(event, "Fleet work digest not built yet -- run `node scripts/fleet-work-digest.mjs build` (or it auto-builds on the next fleet Stop).");
    } else { emit(); }
    return;
  }
  let body = "";
  try { body = readFileSync(path, "utf8"); } catch { emit(); return; }
  if (!body.trim()) { emit(); return; }

  // Stamp staleness so the reader knows whether to trust it as current.
  const staleMin = Number(process.env.PRISM_FLEET_WORK_DIGEST_STALE_MIN) || DEFAULT_STALE_MIN;
  let ageNote = "";
  try {
    const ageMin = Math.round((Date.now() - statSync(path).mtimeMs) / 60000);
    if (ageMin > staleMin) ageNote = `\n_(digest ${ageMin}m old -- refresh: node scripts/fleet-work-digest.mjs build)_`;
  } catch { /* stat miss -- skip age note */ }

  emit(event, body.trimEnd() + ageNote);
}

const invokedAsHook = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsHook) main().catch(() => emit());
