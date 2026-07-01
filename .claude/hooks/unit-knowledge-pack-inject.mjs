#!/usr/bin/env node
// tier: T2
/**
 * unit-knowledge-pack-inject.mjs — UserPromptSubmit hook
 *
 * BACKEND-DEV-LOOP / U-UKP02 — live injection of the per-unit knowledge pack.
 *
 * When a chat slot has an active unit claim, surface a COMPACT summary of
 * the per-unit knowledge pack (composed via scripts/unit-knowledge-pack.mjs)
 * into the prompt context, so the slot gets knowledge dedicated to ITS
 * current unit — not the generic master-index slice every other hook gives.
 *
 * Composition (in-process import — no subprocess):
 *   1. Resolve sid → derived chatId (`claude-<first-8-hex>`).
 *   2. Look up slot in chat-slots.json (state.chatId match).
 *   3. Read slot-task-claims.json for the active unit.
 *   4. Throttle: 1 inject per (slot, unitId) per PRISM_UNIT_PACK_INJECT_TTL_MS
 *      (default 4h). Stamp file under state/shared/.unit-pack-inject-stamps/.
 *   5. composePack(unitId) — same code-path the CLI uses.
 *   6. Render a ≤800-char summary (NOT the full markdown; the pack file
 *      already lives at state/shared/unit-knowledge-packs/<id>.md for drill).
 *
 * Fail-soft at every step. Never blocks. Empty body → emit no
 * additionalContext (silent no-op).
 *
 * Knobs:
 *   PRISM_UNIT_PACK_INJECT_DISABLE=1      → skip entirely
 *   PRISM_UNIT_PACK_INJECT_TTL_MS=<ms>    → throttle window (default 14400000 = 4h)
 *   PRISM_UNIT_PACK_INJECT_MAX_CHARS=<N>  → cap summary at N chars (default 800)
 *   PRISM_UNIT_PACK_STAMPS_DIR=<path>     → stamp dir override (tests)
 *   PRISM_CHAT_SLOTS_PATH=<path>          → chat-slots.json override
 *   PRISM_SLOT_TASK_CLAIMS_PATH=<path>    → slot-task-claims.json override
 */
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(SELF), "..", "..");
const DEFAULT_CHAT_SLOTS = join(REPO_ROOT, "state", "shared", "chat-slots.json");
const DEFAULT_CLAIMS = join(REPO_ROOT, "state", "shared", "slot-task-claims.json");
const DEFAULT_STAMP_DIR = join(REPO_ROOT, "state", "shared", ".unit-pack-inject-stamps");
const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_MAX_CHARS = 800;
const CHAT_ID_HEX_LEN = 8;
const CLAIM_FRESH_MS = 30 * 60 * 1000; // claim is considered fresh if lastHeartbeat < 30 min

/** Parse stdin JSON. Returns null on any failure (no I/O exception escapes). */
export function readStdinJson(readImpl = () => readFileSync(0, "utf-8")) {
  try {
    if (process.stdin && process.stdin.isTTY) return null;
    const raw = readImpl();
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Derive chatId from a harness session_id. Pure. */
export function deriveChatId(sid) {
  if (typeof sid !== "string" || sid.length < CHAT_ID_HEX_LEN) return null;
  return "claude-" + sid.slice(0, CHAT_ID_HEX_LEN).toLowerCase();
}

/** Resolve a chatId → slotName by walking chat-slots.json. Fail-soft. */
export function resolveSlotForChat(chatId, slotsPath, readImpl = readFileSync) {
  if (!chatId) return null;
  let slotsRoot;
  try {
    const txt = readImpl(slotsPath, "utf-8");
    slotsRoot = JSON.parse(txt);
  } catch { return null; }
  const slots = slotsRoot?.slots;
  if (!slots || typeof slots !== "object") return null;
  for (const [slotName, slotState] of Object.entries(slots)) {
    if (slotState && typeof slotState === "object" && slotState.chatId === chatId) {
      return slotName;
    }
  }
  return null;
}

/** Read the slot's active unit claim. Returns null if absent / stale. */
export function readActiveClaim(slot, claimsPath, readImpl = readFileSync, now = Date.now()) {
  if (!slot) return null;
  let root;
  try { root = JSON.parse(readImpl(claimsPath, "utf-8")); } catch { return null; }
  const claims = root?.claims;
  if (!claims || typeof claims !== "object") return null;
  // slot-task-claim.mjs keys claims by UNIT ID (store.claims[unitId]); each row carries
  // its owning `slot`. The prior code looked up claims[slot] (the NATO name) which never
  // matched a unitId key, so readActiveClaim ALWAYS returned null and this injector
  // silently no-op'd in production. Resolve by the row's `slot` field; if a slot holds
  // more than one claim (forward-only phases), the freshest by lastHeartbeat wins.
  const claim = Object.values(claims)
    .filter((c) => c && typeof c === "object" && c.slot === slot && typeof c.unitId === "string")
    .sort((a, b) => {
      const ta = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
      const tb = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
      return tb - ta;
    })[0];
  if (!claim) return null;
  const hb = claim.lastHeartbeat ? new Date(claim.lastHeartbeat).getTime() : NaN;
  if (Number.isFinite(hb) && (now - hb) > CLAIM_FRESH_MS) return null;
  return claim;
}

/** Stamp throttle check. Pure decision: should we inject? */
export function shouldInject({ slot, unitId, stampDir, ttlMs, now = Date.now(), statImpl = statSync, existsImpl = existsSync }) {
  if (!slot || !unitId) return false;
  const stampFile = stampPath(slot, unitId, stampDir);
  if (!existsImpl(stampFile)) return true;
  try {
    const age = now - statImpl(stampFile).mtimeMs;
    return age >= ttlMs;
  } catch {
    return true;
  }
}

/** Stamp file path for (slot, unitId). Pure. */
export function stampPath(slot, unitId, stampDir) {
  const safe = `${slot}__${unitId}`.replace(/[^A-Za-z0-9_\-]/g, "_");
  return join(stampDir, `${safe}.stamp`);
}

/** Record an inject (write the stamp). Fail-soft. */
export function recordInject(slot, unitId, stampDir) {
  try {
    if (!existsSync(stampDir)) mkdirSync(stampDir, { recursive: true });
    writeFileSync(stampPath(slot, unitId, stampDir), String(Date.now()), "utf-8");
  } catch { /* fail-soft */ }
}

/** Render a compact pack summary suitable for prompt-context injection. Pure. */
export function renderCompact(pack, maxChars = DEFAULT_MAX_CHARS) {
  if (!pack || !pack.unitId) return "";
  const lines = [];
  lines.push(`## 🧰 Unit knowledge pack — ${pack.unitId}${pack.unit?.milestone ? ` (${pack.unit.milestone})` : ""}`);
  if (pack.unit?.title) lines.push(`Title: ${pack.unit.title}`);
  if (Array.isArray(pack.masterHits) && pack.masterHits.length > 0) {
    const names = pack.masterHits.slice(0, 5).map((h) => h.name || h.id).filter(Boolean).join(" · ");
    if (names) lines.push(`Top wiki/graph: ${names}`);
  }
  if (Array.isArray(pack.tribalHits) && pack.tribalHits.length > 0) {
    const titles = pack.tribalHits.slice(0, 3).map((t) => t.title || t.id).filter(Boolean).join(" · ");
    if (titles) lines.push(`Tribal (${pack.domain || "n/a"}): ${titles}`);
  }
  if (Array.isArray(pack.commits) && pack.commits.length > 0) {
    lines.push(`Prior commits in milestone: ${pack.commits.length}`);
  }
  if (Array.isArray(pack.warnings) && pack.warnings.length > 0) {
    lines.push(`⚠ ${pack.warnings.length} pack warning(s) — see file for detail`);
  }
  lines.push(`Drill: node scripts/unit-knowledge-pack.mjs ${pack.unitId} --k 12  (full pack also at state/shared/unit-knowledge-packs/)`);
  const out = lines.join("\n");
  return out.length > maxChars ? out.slice(0, maxChars - 12) + " … [TRUNC]" : out;
}

/** Main entrypoint. Returns the JSON object to print to stdout. */
export async function runHook(opts = {}) {
  if (process.env.PRISM_UNIT_PACK_INJECT_DISABLE === "1") return { continue: true };
  const stdin = (opts.stdinImpl || readStdinJson)();
  const sid = stdin?.session_id;
  const chatId = deriveChatId(sid);
  if (!chatId) return { continue: true };

  const slotsPath = opts.slotsPath || process.env.PRISM_CHAT_SLOTS_PATH || DEFAULT_CHAT_SLOTS;
  const claimsPath = opts.claimsPath || process.env.PRISM_SLOT_TASK_CLAIMS_PATH || DEFAULT_CLAIMS;
  const stampDir = opts.stampDir || process.env.PRISM_UNIT_PACK_STAMPS_DIR || DEFAULT_STAMP_DIR;
  const ttlMs = opts.ttlMs ?? (parseInt(process.env.PRISM_UNIT_PACK_INJECT_TTL_MS ?? "", 10) || DEFAULT_TTL_MS);
  const maxChars = opts.maxChars ?? (parseInt(process.env.PRISM_UNIT_PACK_INJECT_MAX_CHARS ?? "", 10) || DEFAULT_MAX_CHARS);

  const slot = resolveSlotForChat(chatId, slotsPath, opts.readImpl);
  if (!slot) return { continue: true };

  const claim = readActiveClaim(slot, claimsPath, opts.readImpl);
  if (!claim) return { continue: true };

  if (!shouldInject({ slot, unitId: claim.unitId, stampDir, ttlMs })) return { continue: true };

  let pack;
  try {
    const mod = await (opts.composeImpl
      ? Promise.resolve({ composePack: opts.composeImpl })
      : import("../../scripts/unit-knowledge-pack.mjs"));
    pack = mod.composePack(claim.unitId, { slot, k: 6, tribalK: 3, gitN: 5 });
  } catch {
    return { continue: true };
  }
  const body = renderCompact(pack, maxChars);
  if (!body) return { continue: true };

  recordInject(slot, claim.unitId, stampDir);

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: body,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runHook().then((out) => process.stdout.write(JSON.stringify(out)));
}
