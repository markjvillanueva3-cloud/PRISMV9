#!/usr/bin/env node
// ZEBRA-ORCHESTRATOR-MS1 / U-ZM1-02 — persistent per-slot opt-in store.
//
// Why a SEPARATE file (not a field on chat-slots.json's per-chat SlotState):
// the opt-in policy "zebra may auto-compact this slot" is a SLOT-LEVEL policy
// that must survive chat churn. chat-slots.mjs:freshState() builds a brand-new
// SlotState on every fresh claim and does NOT carry a zebraOptIn field — so a
// slot re-claimed by a new chat (the exact full-terminal-restart case zebra
// exists to serve) would silently lose its opt-in. A slot-keyed sidecar file
// is immune to that: the policy is keyed by the durable slot NAME.
//
// The sweep (zebra-orchestrator-sweep.mjs) calls applyOptInToSlotsDoc() to
// project this store onto the in-memory chat-slots doc BEFORE
// pickActionableSlots() runs — so pickActionableSlots stays unchanged and the
// store is the single source of truth for opt-in.
//
// CLI:
//   node scripts/lib/zebra-opt-in.mjs opt-in <slot>
//   node scripts/lib/zebra-opt-in.mjs opt-in --all       (every work slot)
//   node scripts/lib/zebra-opt-in.mjs opt-out <slot>
//   node scripts/lib/zebra-opt-in.mjs status
//
// Knobs:
//   PRISM_ZEBRA_OPTIN_FILE=<path>  override store path (tests).
//
// R12 fail-loud: every error path returns a named {ok:false,error} envelope;
// the CLI exits non-zero on failure. Atomic tmp+rename writes; a short
// OS-level lock file guards the rare concurrent-CLI read-modify-write.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SLOT_NAMES } from "../../.claude/helpers/chat-slots.mjs";
import { SELF_EXEMPT_SLOTS, DEFAULT_DRY_RUN_GRACE_HOURS } from "./zulu-orchestrator-lib.mjs";

const PRISM = "H:/prism";
// ZULU-OPTIN-PATH-FIX (slot:zulu, 2026-06-20, operator-approved): repoint to the
// canonical zulu-opt-in.json. The orchestrator was renamed zebra->zulu
// (U-OPTIN-RENAME-FINISH) but this default still resolved to the orphaned
// zebra-opt-in.json (0 opt-ins) while the real 25-slot opt-in store, this module's
// file name, and the sweep's own "single source of truth" comment all say
// zulu-opt-in.json -- so the dry-run sweep saw zero opted-in slots for 8 days
// (surfaced by U-ZULU-SWEEP-HEARTBEAT). New PRISM_ZULU_OPTIN_FILE override wins;
// legacy PRISM_ZEBRA_OPTIN_FILE kept for back-compat.
/**
 * Resolve the opt-in store path with env precedence (pure -> unit-testable
 * without import-time env games): PRISM_ZULU_OPTIN_FILE (canonical) ->
 * PRISM_ZEBRA_OPTIN_FILE (legacy back-compat) -> the canonical default
 * zulu-opt-in.json. NEVER resolves to the orphaned zebra-opt-in.json default.
 * @param {Record<string,string|undefined>} [env]
 * @returns {string}
 */
export function resolveOptInFile(env = process.env) {
  return (
    (env && env.PRISM_ZULU_OPTIN_FILE) ||
    (env && env.PRISM_ZEBRA_OPTIN_FILE) ||
    `${PRISM}/state/shared/zulu-opt-in.json`
  );
}
export const DEFAULT_OPTIN_FILE = resolveOptInFile(process.env);
export const OPTIN_SCHEMA_VERSION = 1;
const LOCK_TIMEOUT_MS = 3000;

// Canonical NATO slot set + the self-exempt set (zulu orchestrates work
// slots only — never itself, never the golf hygiene slot). Both derived from
// canonical sources so a fleet expansion never needs an edit here.
const CANONICAL_SLOTS = new Set(SLOT_NAMES);
const EXEMPT = new Set(SELF_EXEMPT_SLOTS);

/** The work slots zulu MAY manage: every canonical slot minus the exempt set. */
export function manageableSlots() {
  return SLOT_NAMES.filter((s) => !EXEMPT.has(s));
}

// ─── store I/O ───────────────────────────────────────────────────────────

function emptyStore() {
  return {
    schemaVersion: OPTIN_SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
    slots: {},
  };
}

/**
 * Read the opt-in store. Self-heals: missing file → empty store; corrupt
 * JSON → back up to `<file>.corrupt-<ts>` then return empty (never lose data
 * silently, R12); valid-but-wrong-shape → empty store.
 */
export function readOptIn(file = DEFAULT_OPTIN_FILE) {
  if (!fs.existsSync(file)) return emptyStore();
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); }
  catch { return emptyStore(); }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    try { fs.writeFileSync(`${file}.corrupt-${Date.now()}`, raw); } catch { /* best-effort */ }
    return emptyStore();
  }
  if (!parsed || typeof parsed !== "object" || !parsed.slots || typeof parsed.slots !== "object") {
    return emptyStore();
  }
  return parsed;
}

/** Atomic write: tmp + rename. Windows rename fails if target exists →
 *  unlink-then-rename fallback (matches chat-slots.mjs:writeSlotBranchBindings).
 *  On ANY failure the tmp file is removed before the error propagates — a
 *  failed write must never orphan a `.tmp` turd next to the store. */
function writeOptInAtomic(store, file = DEFAULT_OPTIN_FILE) {
  store.lastUpdated = new Date().toISOString();
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch { /* exists, or unmakeable — writeFileSync surfaces it */ }
  const rand = Math.random().toString(36).slice(2, 10);
  const tmp = `${file}.${process.pid}.${Date.now()}.${rand}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + "\n");
    try {
      fs.renameSync(tmp, file);
    } catch {
      try { fs.unlinkSync(file); } catch { /* already gone */ }
      fs.renameSync(tmp, file);
    }
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* never created, or already gone */ }
    throw e;
  }
}

// ─── lock for read-modify-write ──────────────────────────────────────────
//
// The store is written RARELY (operator opts slots in/out by hand), so
// contention is near-zero — but two `opt-in --all` runs racing would still
// last-writer-win and lose entries. A wx-flag lock file (same idiom as
// chat-slots.mjs:acquireLock) makes the RMW critical-section exclusive.

/** Bounded blocking sleep. Atomics.wait on a throwaway buffer is a TRUE sleep
 *  (no CPU spin), unlike a Date.now() busy-loop — material on a 25-chat fleet
 *  host already under CPU/memory pressure. Falls back to a bounded spin only
 *  if SharedArrayBuffer is unavailable. */
function sleepMs(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.max(0, ms));
  } catch {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) { /* SAB unavailable — bounded fallback */ }
  }
}

function withOptInLock(fn, file = DEFAULT_OPTIN_FILE) {
  const lockPath = `${file}.lock`;
  try { fs.mkdirSync(path.dirname(lockPath), { recursive: true }); } catch { /* dir exists */ }
  const start = Date.now();
  let held = false;
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    try {
      fs.writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`, { flag: "wx" });
      held = true;
      break;
    } catch {
      // Lock exists. If it is STALE (older than the timeout — the holder
      // crashed mid-section), steal it ATOMICALLY: unlink, then re-acquire
      // via the wx flag. The wx-create is the exclusive gate — if a peer
      // stealer wins the unlink+wx race ours throws and we keep waiting, so
      // only ONE process can ever hold the lock and enter fn().
      let stale = false;
      try {
        const st = fs.statSync(lockPath);
        stale = Date.now() - st.mtimeMs > LOCK_TIMEOUT_MS;
      } catch { /* lock vanished between writeFile and statSync — loop retries */ }
      if (stale) {
        try { fs.unlinkSync(lockPath); } catch { /* a peer already removed it */ }
        try {
          fs.writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`, { flag: "wx" });
          held = true;
          break;
        } catch { /* a peer won the steal race — keep waiting */ }
      }
      sleepMs(40 + Math.floor(Math.random() * 60));
    }
  }
  if (!held) return { ok: false, error: "lock_timeout" };
  try {
    return fn();
  } finally {
    try { fs.unlinkSync(lockPath); } catch { /* already released */ }
  }
}

// ─── mutators ────────────────────────────────────────────────────────────

/**
 * Set or clear one slot's opt-in.
 *   optIn === true  → opt in; stamps optInAt = now (the 24h dry-run grace
 *                     window is measured from this timestamp).
 *   optIn !== true  → opt out; the slot's entry is removed entirely.
 * Rejects non-canonical slots and the self-exempt slots (zebra, golf).
 */
export function setOptIn({ slot, optIn, now } = {}, file = DEFAULT_OPTIN_FILE) {
  // EXEMPT before CANONICAL: "zebra" (the orchestrator) is self-exempt but is
  // NOT a member of SLOT_NAMES (it is not a NATO letter), so a canonical-first
  // check would mislabel it `unknown-slot`. Reject the exempt slots for the
  // RIGHT reason. Set.has() is null-safe — a null/number slot matches neither
  // set and falls through to the canonical-slot rejection below.
  if (EXEMPT.has(slot)) {
    return { ok: false, error: `self-exempt-slot:${slot}` };
  }
  if (typeof slot !== "string" || !CANONICAL_SLOTS.has(slot)) {
    return { ok: false, error: `unknown-slot:${slot}` };
  }
  const nowIso = typeof now === "string" ? now : new Date().toISOString();
  return withOptInLock(() => {
    try {
      const store = readOptIn(file);
      if (optIn === true) {
        store.slots[slot] = { optIn: true, optInAt: nowIso };
      } else {
        delete store.slots[slot];
      }
      writeOptInAtomic(store, file);
      return {
        ok: true,
        slot,
        optIn: optIn === true,
        optInAt: optIn === true ? nowIso : null,
      };
    } catch (e) {
      // R12 — a failed write returns a named envelope, never a raw throw.
      return { ok: false, error: `write-failed:${e?.message || e}` };
    }
  }, file);
}

/**
 * Opt in EVERY manageable work slot (all canonical slots minus zebra+golf)
 * in ONE atomic write. Slots already opted-in keep their ORIGINAL optInAt —
 * a redundant `--all` must not reset the grace window of a slot that has
 * already been burning in.
 */
export function setOptInAll({ now } = {}, file = DEFAULT_OPTIN_FILE) {
  const nowIso = typeof now === "string" ? now : new Date().toISOString();
  return withOptInLock(() => {
    try {
      const store = readOptIn(file);
      const changed = [];
      const kept = [];
      for (const slot of manageableSlots()) {
        const existing = store.slots[slot];
        if (existing && existing.optIn === true && typeof existing.optInAt === "string") {
          kept.push(slot);
          continue;
        }
        store.slots[slot] = { optIn: true, optInAt: nowIso };
        changed.push(slot);
      }
      writeOptInAtomic(store, file);
      return { ok: true, changed, kept, total: manageableSlots().length };
    } catch (e) {
      // R12 — a failed write returns a named envelope, never a raw throw.
      return { ok: false, error: `write-failed:${e?.message || e}` };
    }
  }, file);
}

// ─── readers for the sweep ───────────────────────────────────────────────

/**
 * { [slot]: { optIn:true, optInAt:string } } for every VALID opted-in slot.
 * Malformed entries, non-canonical slot keys, and self-exempt slots are
 * dropped — a corrupt store can never make the sweep act on a bad slot.
 */
export function getOptInMap(file = DEFAULT_OPTIN_FILE) {
  const store = readOptIn(file);
  const map = {};
  for (const [slot, v] of Object.entries(store.slots || {})) {
    if (!CANONICAL_SLOTS.has(slot) || EXEMPT.has(slot)) continue;
    if (v && typeof v === "object" && v.optIn === true && typeof v.optInAt === "string") {
      map[slot] = { optIn: true, optInAt: v.optInAt };
    }
  }
  return map;
}

/**
 * Project the persistent opt-in policy onto an IN-MEMORY chat-slots doc.
 * AUTHORITATIVE: this store is the single source of truth — every non-null
 * slot entry's zuluOptIn/zuluOptInAt is set to exactly what the store says
 * (true + timestamp if opted in, false otherwise -- and migrates away any legacy
 * zebraOptIn from the pre-rename era so it can never shadow the canonical field).
 * pickActionableSlots() then reads entry.zuluOptIn unchanged. Null entries (no chat)
 * are skipped — you cannot set a field on null, and pickActionableSlots skips
 * null entries anyway. The sweep never writes chat-slots.json back, so this
 * mutation is purely per-sweep and re-derived fresh every run.
 */
export function applyOptInToSlotsDoc(slotsDoc, file = DEFAULT_OPTIN_FILE) {
  if (!slotsDoc || !slotsDoc.slots || typeof slotsDoc.slots !== "object") {
    return { ok: false, error: "bad-slots-doc", applied: 0 };
  }
  const map = getOptInMap(file);
  let applied = 0;
  for (const [slot, entry] of Object.entries(slotsDoc.slots)) {
    if (!entry || typeof entry !== "object") continue;
    const m = map[slot];
    if (m) {
      entry.zuluOptIn = true;
      entry.zuluOptInAt = m.optInAt;
    } else {
      entry.zuluOptIn = false;
    }
    // Migrate away any pre-rename legacy field so a stale zebraOptIn can never
    // shadow the canonical zuluOptIn that pickActionableSlots() actually reads.
    if ("zebraOptIn" in entry) delete entry.zebraOptIn;
    if ("zebraOptInAt" in entry) delete entry.zebraOptInAt;
    applied++;
  }
  return { ok: true, applied, optedIn: Object.keys(map) };
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function cliStatus(file) {
  const map = getOptInMap(file);
  const now = Date.now();
  const graceMs = DEFAULT_DRY_RUN_GRACE_HOURS * 60 * 60 * 1000;
  const lines = [`zulu-opt-in store: ${file}`];
  const optedIn = Object.keys(map).sort();
  const manageable = manageableSlots();
  lines.push(`opted-in: ${optedIn.length}/${manageable.length} manageable work slots`);
  for (const slot of optedIn) {
    const at = Date.parse(map[slot].optInAt);
    const ageMs = Number.isFinite(at) ? now - at : NaN;
    const inGrace = Number.isFinite(ageMs) && ageMs < graceMs;
    const phase = inGrace
      ? `dry-run grace (~${Math.max(0, Math.round((graceMs - ageMs) / 3600000))}h left)`
      : "LIVE (grace expired — sweeps will SendKeys)";
    lines.push(`  ${slot.padEnd(10)} optInAt=${map[slot].optInAt}  ${phase}`);
  }
  const notIn = manageable.filter((s) => !map[s]);
  if (notIn.length > 0) lines.push(`not opted-in (${notIn.length}): ${notIn.join(", ")}`);
  return lines.join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const file = DEFAULT_OPTIN_FILE;

  if (cmd === "opt-in") {
    if (argv.includes("--all")) {
      const r = setOptInAll({}, file);
      if (!r.ok) { process.stderr.write(`zebra-opt-in: ${r.error}\n`); process.exit(1); }
      process.stdout.write(
        `opted in ${r.changed.length} new slot(s), ${r.kept.length} already in ` +
        `(${r.total} manageable total): ${r.changed.join(", ") || "(none new)"}\n`,
      );
      process.exit(0);
    }
    const r = setOptIn({ slot: argv[1], optIn: true }, file);
    if (!r.ok) { process.stderr.write(`zebra-opt-in: ${r.error}\n`); process.exit(1); }
    process.stdout.write(`opted in: ${r.slot} (optInAt=${r.optInAt}, 24h dry-run grace begins now)\n`);
    process.exit(0);
  }

  if (cmd === "opt-out") {
    const r = setOptIn({ slot: argv[1], optIn: false }, file);
    if (!r.ok) { process.stderr.write(`zebra-opt-in: ${r.error}\n`); process.exit(1); }
    process.stdout.write(`opted out: ${r.slot}\n`);
    process.exit(0);
  }

  if (cmd === "status" || cmd === "list" || !cmd) {
    process.stdout.write(cliStatus(file) + "\n");
    process.exit(0);
  }

  process.stderr.write(
    `zebra-opt-in: unknown command '${cmd}'\n` +
    `usage: opt-in <slot> | opt-in --all | opt-out <slot> | status\n`,
  );
  process.exit(1);
}

// Only run the CLI when invoked directly (not when imported by the sweep/tests).
const __file = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__file)) {
  main();
}
