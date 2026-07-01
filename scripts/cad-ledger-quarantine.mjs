#!/usr/bin/env node
/*
 * cad-ledger-quarantine.mjs -- quarantine the pre-fix FALSE-fail records from the CAD closed-loop
 * learning ledger (slot:delta, 2026-06-26).
 *
 * WHY: scripts/cad-analyze-step.mjs did not exist until commit ee9cbb03de (2026-06-26), so the
 * text->CAD gen lane recorded learningSignal:"fail" for EVERY generation before that -- 118 of 123
 * ledger records are CERTAIN false-fails (the analyzer that sets the signal was missing -> uniform exit
 * 1). The gen lane's reverse-arrow (loadLearnedRisk) READS this ledger to steer generation, so the
 * corrupt history poisons the steering. This tool moves those certain false-fails out of the live
 * steering ledger into a quarantine sidecar (REVERSIBLE -- nothing is deleted; a backup + the
 * quarantined records are both preserved on disk).
 *
 * Discriminator is CERTAIN, not heuristic: a `fail` record with timestamp < cutoff (the analyzer-fix
 * commit time) could only have been produced when the analyzer was absent. `error` records (real gen
 * failures -- no STEP produced) and any post-cutoff record are KEPT. Records with a missing/unparseable
 * timestamp are KEPT (never quarantine what we cannot date -- err toward preserving data).
 *
 * Safety (per the 2026-06-08/10 brain-clobber regressions): fail-LOUD read (never fail-open-empty);
 * backup-then-rewrite; atomic temp+rename; clobber guard refuses to write if keep-count is 0 or if
 * parse failures exceed a threshold (a torn read must not nuke the ledger).
 *
 * Usage:
 *   node scripts/cad-ledger-quarantine.mjs --cutoff 2026-06-26T07:48:31Z            # DRY-RUN report
 *   node scripts/cad-ledger-quarantine.mjs --cutoff 2026-06-26T07:48:31Z --apply    # backup + rewrite
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const DEFAULT_LEDGER = path.join(ROOT, "mcp-server", "data", "state", "cad-failure-ledger.jsonl");

/**
 * Pure: classify one ledger record line against the cutoff. Returns "quarantine" (a certain pre-fix
 * false-fail), "keep", or "unparseable". cutoffMs is the analyzer-fix time in epoch ms.
 */
export function classifyLine(line, cutoffMs) {
  const t = String(line || "").trim();
  if (!t) return "skip";
  let rec;
  try { rec = JSON.parse(t); } catch { return "unparseable"; }
  if (rec.status !== "fail") return "keep";                 // pass / error / anything non-fail = trustworthy
  const ts = Date.parse(rec.timestamp);
  if (!Number.isFinite(ts)) return "keep";                  // undateable fail -> keep (never over-quarantine)
  return ts < cutoffMs ? "quarantine" : "keep";             // pre-cutoff fail = certain false-fail
}

/** Pure: partition a ledger's lines into {keep, quarantine, unparseable} arrays (raw line strings). */
export function partitionLedger(lines, cutoffMs) {
  const out = { keep: [], quarantine: [], unparseable: [] };
  for (const line of lines) {
    const v = classifyLine(line, cutoffMs);
    if (v === "keep") out.keep.push(line);
    else if (v === "quarantine") out.quarantine.push(line);
    else if (v === "unparseable") out.unparseable.push(line);
    // "skip" (blank) dropped silently -- blanks carry no record
  }
  return out;
}

/* Read the ledger fail-LOUD: throw on read error (never return empty -> the caller must not clobber). */
function readLedgerLines(ledgerPath, readImpl = fs.readFileSync) {
  const raw = readImpl(ledgerPath, "utf8");               // throws if missing/unreadable -- intentional
  return raw.split(/\r?\n/).filter((l) => l.length > 0);
}

/* Atomic write: temp + rename. */
function atomicWrite(targetPath, content) {
  const tmp = `${targetPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, targetPath);
}

function isMain() {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
}

if (isMain()) {
  const argv = process.argv.slice(2);
  const ci = argv.indexOf("--cutoff");
  const cutoffISO = ci >= 0 ? argv[ci + 1] : null;
  const apply = argv.includes("--apply");
  const li = argv.indexOf("--ledger");
  const ledgerPath = li >= 0 && argv[li + 1] ? argv[li + 1] : DEFAULT_LEDGER;

  const cutoffMs = Date.parse(cutoffISO || "");
  if (!Number.isFinite(cutoffMs)) { console.error("ERROR: --cutoff <ISO8601> required (e.g. 2026-06-26T07:48:31Z)"); process.exit(2); }

  let lines;
  try { lines = readLedgerLines(ledgerPath); }
  catch (e) { console.error(`ERROR: cannot read ledger ${ledgerPath}: ${e.message}`); process.exit(2); }

  const { keep, quarantine, unparseable } = partitionLedger(lines, cutoffMs);
  const report = { ledger: ledgerPath, cutoff: cutoffISO, total: lines.length, keep: keep.length, quarantine: quarantine.length, unparseable: unparseable.length };

  // CLOBBER GUARD: refuse a destructive rewrite on a suspicious read.
  if (apply) {
    if (keep.length === 0) { console.error("REFUSE: keep-count is 0 -- would empty the ledger (torn read?). Aborting."); process.exit(3); }
    if (unparseable.length > Math.max(2, lines.length * 0.1)) { console.error(`REFUSE: ${unparseable.length} unparseable lines (>10%) -- torn read suspected. Aborting.`); process.exit(3); }
    if (quarantine.length === 0) { console.log(JSON.stringify({ ...report, applied: false, reason: "nothing to quarantine" })); process.exit(0); }
    // Backup the full ledger (reversible) + the quarantined records sidecar, BEFORE rewriting.
    const stamp = cutoffISO.replace(/[:.]/g, "-");
    const backup = `${ledgerPath}.prefix-falsefail-backup-${stamp}`;
    const quarantineSidecar = `${ledgerPath}.prefix-falsefail-quarantined-${stamp}.jsonl`;
    fs.copyFileSync(ledgerPath, backup);
    if (fs.readFileSync(backup, "utf8").length !== fs.readFileSync(ledgerPath, "utf8").length) {
      console.error("REFUSE: backup verify failed (size mismatch). Aborting before rewrite."); process.exit(3);
    }
    fs.writeFileSync(quarantineSidecar, quarantine.join("\n") + "\n");
    atomicWrite(ledgerPath, keep.join("\n") + "\n");
    const after = readLedgerLines(ledgerPath).length;
    if (after !== keep.length) { console.error(`REFUSE-POST: rewrite line count ${after} != keep ${keep.length}. Backup at ${backup}.`); process.exit(3); }
    console.log(JSON.stringify({ ...report, applied: true, backup, quarantineSidecar, ledgerAfter: after }));
  } else {
    console.log(JSON.stringify({ ...report, applied: false, mode: "dry-run", hint: "re-run with --apply to quarantine" }));
  }
}
