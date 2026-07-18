#!/usr/bin/env node
// tier: T2
// U-CAG-01-SOUL-TO-SESSIONSTART — emit the static slot-soul as a SessionStart
// additionalContext block ONCE per session (instead of UserPromptSubmit per prompt).
//
// Article-2 (akshay_pachaar) cold/hot split: slot-soul is purely cold (frozen per
// slot, only changes when the soul .md file is edited). Moving it to SessionStart
// lets Anthropic prompt-caching anchor it in the KV cache for the whole session
// instead of re-injecting it on every UserPromptSubmit.
//
// PSN synergy: emits a sidecar at state/shared/cag-route/slot-soul-cached-<sid>.json
// that the CAG-route telemetry chain (existing) reads to confirm the cold block
// was injected — closes the loop with U-CAG-02-TELEMETRY-CHANNEL.
//
// Coordination with existing slot-soul-inject.mjs (UserPromptSubmit):
//   - This hook does NOT disable the per-prompt inject automatically. The
//     operator-side knob PRISM_SLOT_SOUL_INJECT_DISABLE=1 is still the canonical
//     suppressor of the per-prompt path. Once F1+F6 telemetry shows the cold
//     block is honored by the harness/SDK cache, set that knob to flip over.
//   - Until then, BOTH inject — the per-prompt redundancy is acceptable while we
//     measure (article-2 says: "Be selective about what you cache").
//
// Karpathy R3 surgical: pure-read hook, no engine touch, no settings.json edit
// from inside the hook. R12 fail-loud: throws nothing — SessionStart MUST NOT
// block; on any error, emits empty additionalContext.
//
// Disable: PRISM_CAG_SOUL_DISABLE=1
// Verbose: PRISM_CAG_SOUL_VERBOSE=1
// Override slot resolution: PRISM_CAG_SOUL_SLOT=<name>

import fs from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SOULS_DIR = path.join(PRISM_ROOT, "state/shared/slot-souls");
const SLOTS_FILE = path.join(PRISM_ROOT, "state/shared/chat-slots.json");
const SIDECAR_DIR = path.join(PRISM_ROOT, "state/shared/cag-route");
const MAX_BLOCK_BYTES = 4096; // higher than per-prompt cap because this is a one-shot session anchor
const SCHEMA_VERSION = 1;

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
function emitEmpty() {
  emit({ continue: true });
}
function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}
function readText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function resolveSlot(slotsDoc, sid) {
  if (!slotsDoc || !slotsDoc.slots || !sid) return null;
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data || !data.chatId) continue;
    if (
      data.chatId === sid ||
      sid.includes(data.chatId.replace(/^claude-/, ""))
    ) {
      return name;
    }
  }
  return null;
}

export function buildCachedBlock(soulBody, slot, bytesCap = MAX_BLOCK_BYTES) {
  if (!soulBody || typeof soulBody !== "string") return null;
  if (!slot || typeof slot !== "string") return null;
  let payload = soulBody;
  if (payload.length > bytesCap) {
    payload =
      payload.slice(0, bytesCap) +
      "\n…(cold-cache slot-soul truncated at " +
      bytesCap +
      " bytes)";
  }
  const header = `## 🧊 Slot soul (CAG cold-cache, SessionStart anchor) — ${slot}\n\n`;
  const footer = `\n\n_Anchor at session start; static across the session per article-2 (akshay_pachaar) cold/hot split. PSN leg #1 (Obsidian brain) → leg #2 (PRISM OS) → cached block. Suppress per-prompt re-inject via PRISM_SLOT_SOUL_INJECT_DISABLE=1 once cache-hit telemetry confirms honor._`;
  return header + payload + footer;
}

export function writeSidecar({ sid, slot, soulBytes, blockBytes, ts }) {
  try {
    if (!fs.existsSync(SIDECAR_DIR)) fs.mkdirSync(SIDECAR_DIR, { recursive: true });
    const out = {
      schemaVersion: SCHEMA_VERSION,
      ts,
      sid,
      slot,
      soulBytes,
      blockBytes,
      kind: "slot-soul-cache-block",
      psn_legs: [1, 2], // Obsidian brain + PRISM OS
    };
    const p = path.join(SIDECAR_DIR, `slot-soul-cached-${sid}.json`);
    fs.writeFileSync(p, JSON.stringify(out, null, 2));
    return p;
  } catch {
    return null;
  }
}

async function main() {
  if (process.env.PRISM_CAG_SOUL_DISABLE === "1") return emitEmpty();

  let raw = "";
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    raw = Buffer.concat(chunks).toString("utf8");
  } catch {
    return emitEmpty();
  }
  let env = {};
  try {
    env = raw ? JSON.parse(raw) : {};
  } catch {
    /* ignore */
  }
  const sid = env.session_id || "";
  if (!sid) return emitEmpty();

  let slot = process.env.PRISM_CAG_SOUL_SLOT || null;
  if (!slot) {
    const slotsDoc = readJson(SLOTS_FILE);
    slot = resolveSlot(slotsDoc, sid);
  }
  if (!slot) return emitEmpty();

  const soulPath = path.join(SOULS_DIR, `${slot.toLowerCase()}.md`);
  const body = readText(soulPath);
  if (!body) return emitEmpty();

  const block = buildCachedBlock(body, slot);
  if (!block) return emitEmpty();

  const ts = new Date().toISOString();
  writeSidecar({
    sid,
    slot,
    soulBytes: body.length,
    blockBytes: block.length,
    ts,
  });

  return emit({
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: block },
  });
}

// Run only when invoked as the main entry — keeps the module importable for tests.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
