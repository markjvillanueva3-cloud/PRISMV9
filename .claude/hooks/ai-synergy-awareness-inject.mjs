#!/usr/bin/env node
// tier: T2
// AI-SYNERGY-AUDIT-MS0/U-AISYN-AWARENESS (slot:charlie) -- per-galaxy AI-synergy
// awareness injector + the audit generator's auto-invoker (closes U-AISYN-CORE's
// R15 WIRE obligation).
//
// UserPromptSubmit hook. For the galaxy bound to THIS chat's slot, injects a
// COMPACT AI-synergy posture from state/shared/specs/AI-SYNERGY-AUDIT.json:
// score + band + fleet rank + sub-dimension scores + the top remediation. This is
// the fleet-wide fix for the audit's worst dimension (awarenessSurface = 1/34 --
// only quoting had a dedicated awareness surface). ONE generic hook serves EVERY
// slot-mapped galaxy (R15 APPLY-TO-ALL-GALAXIES) instead of 33 cloned generators.
//
// It is ALSO the generator's auto-invoker: when the audit artifact is missing or
// stale (> AI_SYNERGY_STALE_MS), it spawns a DETACHED, THROTTLED background regen
// (never blocks the prompt) so the score stays fresh without a cron.
//
// Fail-soft contract (matches slot-context-bundle-inject.mjs):
//   - NEVER throws (every error path -> {continue:true}, exit 0)
//   - NEVER blocks the prompt
//   - Silent skip when slot unbound / galaxy unmapped / artifact absent
//
// Knobs:
//   PRISM_AI_SYNERGY_AWARENESS_DISABLE=1   -- disable entirely (silent skip)
//   PRISM_AI_SYNERGY_AWARENESS_NO_REGEN=1  -- inject only, never spawn a regen
//   PRISM_AI_SYNERGY_STALE_HRS=N           -- staleness horizon for regen (default 24)

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const AUDIT_JSON = `${PRISM}/state/shared/specs/AI-SYNERGY-AUDIT.json`;
const GENERATOR = `${PRISM}/scripts/audit-ai-synergy.mjs`;
const REGEN_LOCK = `${PRISM}/state/shared/.cron-locks/ai-synergy-regen.lock`;

const STALE_HRS = Number(process.env.PRISM_AI_SYNERGY_STALE_HRS) || 24;
const STALE_MS = STALE_HRS * 3600 * 1000;
const REGEN_THROTTLE_MS = 60 * 60 * 1000; // at most one detached regen per hour

function safeJsonRead(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function ok(extra) {
  process.stdout.write(JSON.stringify({ continue: true, ...extra }));
}

export function resolveSlot(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return null;
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    const short = data.chatId?.replace(/^claude-/, "");
    if (short && sessionId.startsWith(short)) return name;
  }
  return null;
}

/**
 * Spawn a DETACHED, THROTTLED regen of the audit. Throttle via the lock file mtime
 * so a busy chat does not regen every prompt. Best-effort + fully swallowed -- a
 * failed spawn must never affect the prompt.
 */
function maybeRegen(artifactMtimeMs) {
  if (process.env.PRISM_AI_SYNERGY_AWARENESS_NO_REGEN === "1") return;
  const fresh = artifactMtimeMs != null && Date.now() - artifactMtimeMs < STALE_MS;
  if (fresh) return;
  try {
    // Throttle: skip if a regen was triggered within REGEN_THROTTLE_MS.
    if (fs.existsSync(REGEN_LOCK)) {
      const lockAge = Date.now() - fs.statSync(REGEN_LOCK).mtimeMs;
      if (lockAge < REGEN_THROTTLE_MS) return;
    } else {
      fs.mkdirSync(path.dirname(REGEN_LOCK), { recursive: true });
    }
    fs.writeFileSync(REGEN_LOCK, new Date().toISOString());
    const child = spawn(process.execPath, [GENERATOR], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    // An unref'd child with no 'error' listener can surface an async spawn error
    // (EMFILE/ENOENT) as an unhandled emitter error -- swallow it (best-effort regen).
    child.on("error", () => {});
    child.unref();
  } catch {
    /* regen is best-effort; never surface */
  }
}

export function renderBlock(slot, galaxy, report) {
  const galaxies = Array.isArray(report.galaxies) ? report.galaxies : [];
  const r = galaxies.find((g) => g.galaxy === galaxy);
  if (!r) return null;
  // Fleet rank: 1 = highest score. Stable tiebreak by name to match the artifact.
  const sorted = [...galaxies].sort((a, b) => b.score - a.score || a.galaxy.localeCompare(b.galaxy));
  const rank = sorted.findIndex((g) => g.galaxy === galaxy) + 1;
  const s = r.subScores || {};
  const lines = [];
  lines.push(`## 🤖 AI-synergy posture -- ${galaxy} (slot:${slot})`);
  lines.push(
    `- score **${r.score}** (${r.band}) | fleet rank ${rank}/${galaxies.length} | ` +
      `dims: disc ${s.discoverability} / owns ${s.ownsOrWiresAi} / vault ${s.vaultSynergy} / xsub ${s.crossSubstrate} / aware ${s.awarenessSurface}`
  );
  if (Array.isArray(r.gaps) && r.gaps.length) {
    lines.push(`- gaps: ${r.gaps.map((g) => g.dimension).join(", ")}`);
  }
  if (Array.isArray(r.recommendations) && r.recommendations.length) {
    lines.push(`- next: ${r.recommendations[0]}`);
  }
  // R15 WIRE: surface the generic reasoning bridge so this galaxy's chat can reason
  // over its own context (CLAUDE + synthesis + posture) via local Ollama on demand.
  lines.push(`- reason via AI: \`node scripts/lib/galaxy-reasoning-bridge.mjs ${galaxy} "<question>"\``);
  const ageHrs = report.generatedAt ? ((Date.now() - Date.parse(report.generatedAt)) / 3600000) : null;
  const ageStr = ageHrs != null && Number.isFinite(ageHrs) ? `${ageHrs.toFixed(1)}h old` : "age unknown";
  lines.push(
    `_audit ${ageStr} | full: state/shared/specs/AI-SYNERGY-AUDIT.md | ` +
      "disable: PRISM_AI_SYNERGY_AWARENESS_DISABLE=1_"
  );
  return lines.join("\n");
}

async function main() {
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let envelope;
  try {
    envelope = JSON.parse(stdin);
  } catch {
    envelope = {};
  }
  const sessionId = envelope.session_id || envelope.sessionId || null;

  if (process.env.PRISM_AI_SYNERGY_AWARENESS_DISABLE === "1") return ok();

  const slot = resolveSlot(sessionId, safeJsonRead(SLOTS_FILE));
  if (!slot) return ok(); // chat not bound to a slot -- silent skip

  // Slot -> galaxy via the single-source map (november/yankee intentionally unmapped).
  let galaxy = null;
  try {
    const mapUrl = pathToFileURL(`${PRISM}/scripts/lib/slot-galaxy-map.mjs`).href;
    const { galaxyForSlot } = await import(mapUrl);
    galaxy = galaxyForSlot(slot);
  } catch {
    return ok();
  }
  if (!galaxy) return ok(); // unmapped slot -- silent skip

  // Read the audit artifact; trigger a detached regen if missing/stale.
  let artifactMtimeMs = null;
  try {
    artifactMtimeMs = fs.statSync(AUDIT_JSON).mtimeMs;
  } catch {
    /* absent */
  }
  maybeRegen(artifactMtimeMs);

  const report = safeJsonRead(AUDIT_JSON);
  if (!report || !Array.isArray(report.galaxies)) return ok(); // no artifact yet -- regen spawned above

  const block = renderBlock(slot, galaxy, report);
  if (!block) return ok();

  // Per-session injection dedup (U-ALPHA-INJECT-DEDUP-FS): the synergy verdict is stable per session
  // (changes only when the audit artifact regenerates); re-emit full on change/TTL, else a 1-line
  // marker. Saves ~467B/turn fleet-wide.
  const additionalContext = dedupeOrMarker(block, {
    sessionId, hookName: "ai-synergy-awareness", root: PRISM,
  });

  return ok({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext },
  });
}

// Only run as a hook when invoked directly (not when imported by tests).
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch(() => {
    // Absolute backstop -- a hook must never throw into the prompt path.
    try {
      process.stdout.write(JSON.stringify({ continue: true }));
    } catch {
      /* nothing more we can do */
    }
  });
}
