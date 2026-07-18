#!/usr/bin/env node
// mark-unit-built.mjs -- close the MASTER-UNIT-PLAN build loop (slot:zulu, HERMES-UNIT-PLAN).
//
// WHY (2026-07-04): the build-ready pipeline (draft -> verify -> surface -> requeue) surfaces
// VERIFIED execution packages for specialists to build, but its ONLY completion signal was
// `shippedIds` -- which suppresses a unit only when a commit SUBJECT carries the literal
// `UNIT-<id>` token. The fleet ships `[SCOPE]/U-<id>: title` (verified: 0/60 recent subjects
// carried a UNIT token), so a built unit would NEVER drain -> the queue re-surfaces it forever,
// a FALSE "no down time". This CLI writes the explicit built-ledger that
// `builtIdsFromLedger` unions into the driver's `shipped` set, draining the unit deterministically.
//
// Usage:
//   node scripts/mark-unit-built.mjs 0028 --by echo --sha e799cbcd2d --note "5axis dialects hardened"
//   node scripts/mark-unit-built.mjs 0028              (by/sha auto-derived; note optional)
//   node scripts/mark-unit-built.mjs --list            (show what's marked built)
//
// A specialist / build agent / post-build hook calls this the moment a unit's assets ship. The
// reader dedups, so marking the same id twice is harmless. Fail-soft, ASCII-only, atomic O_APPEND.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { builtIdsFromLedger } from "./lib/hermes-build-ready-queue.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
export const BUILT_LEDGER_PATH = process.env.PRISM_BUILT_LEDGER_PATH
  || path.join(ROOT, "state/shared/hermes-unit-plan-built-ledger.jsonl");

/** Normalize a raw id to the canonical 4-digit form. Returns null if not a <=4-digit number. */
export function normalizeId(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!/^\d{1,4}$/.test(s)) return null; // pure number, 1-4 digits (bare "28" is allowed, padded)
  return s.padStart(4, "0");
}

/** Pure: assemble the ledger record. The caller owns the clock (nowIso) + git (sha). */
export function buildRecord({ id, by = "unknown", sha = "", note = "", nowIso }) {
  const rec = { id, by: String(by || "unknown"), source: "mark-unit-built", ts: nowIso };
  if (sha) rec.sha = String(sha);
  if (note) rec.note = String(note);
  return rec;
}

/** Minimal flag parser: positional id + --by/--sha/--note/--list. */
export function parseArgs(argv) {
  const out = { id: null, by: undefined, sha: undefined, note: undefined, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") out.list = true;
    else if (a === "--by") out.by = argv[++i];
    else if (a === "--sha") out.sha = argv[++i];
    else if (a === "--note") out.note = argv[++i];
    else if (!a.startsWith("--") && out.id == null) out.id = a;
  }
  return out;
}

function currentSha() {
  try {
    return execFileSync("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"], {
      encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch { return ""; }
}

/** Best-effort current slot (for the `by` default) from chat-slots; fail-soft to "unknown". */
function currentSlot() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, "state/shared/chat-slots.json"), "utf8");
    const slots = JSON.parse(raw).slots || {};
    let best = null;
    for (const [name, s] of Object.entries(slots)) {
      if (s && s.lastHeartbeat && (!best || s.lastHeartbeat > best.hb)) best = { name, hb: s.lastHeartbeat };
    }
    return best ? best.name : "unknown";
  } catch { return "unknown"; }
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.list) {
    let text = "";
    try { text = fs.readFileSync(BUILT_LEDGER_PATH, "utf8"); } catch { /* absent */ }
    const ids = [...builtIdsFromLedger(text)].sort();
    process.stdout.write(JSON.stringify({ ok: true, builtCount: ids.length, builtIds: ids, ledger: path.relative(ROOT, BUILT_LEDGER_PATH) }, null, 2) + "\n");
    return 0;
  }

  const id = normalizeId(args.id);
  if (!id) {
    process.stderr.write(`mark-unit-built: invalid id ${JSON.stringify(args.id)} -- expected a 1-4 digit unit number (e.g. 28 or 0028)\n`);
    return 1;
  }

  const nowIso = new Date().toISOString();
  const by = args.by || currentSlot();
  const sha = args.sha !== undefined ? args.sha : currentSha();
  const rec = buildRecord({ id, by, sha, note: args.note, nowIso });

  try {
    fs.mkdirSync(path.dirname(BUILT_LEDGER_PATH), { recursive: true });
    fs.appendFileSync(BUILT_LEDGER_PATH, JSON.stringify(rec) + "\n", "utf8"); // O_APPEND, clobber-safe
  } catch (e) {
    process.stderr.write(`mark-unit-built: append failed: ${e.message}\n`);
    return 1;
  }

  process.stdout.write(JSON.stringify({ ok: true, marked: id, record: rec, note: `UNIT-${id} will drain from the build-ready queue on the next hermes-build-ready-loop tick.` }) + "\n");
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) process.exit(main());
