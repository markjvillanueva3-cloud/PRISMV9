#!/usr/bin/env node
// scripts/tango-reconcile-queue.mjs
//
// TANGO QUEUE RECONCILER -- the de-pollution half of the tango-completion harness.
//
// PROBLEM: the priority-queue surfaces ~3100 "tango-eligible" units, but a
// verify-on-disk audit (FLEET-SEARCH-DAEMON-MS0 recon, 2026-06-14) found the top
// 20 are 20/20 ALREADY SHIPPED -- the queue is ~100% polluted with shipped-but-
// unflushed work. The four existing shipped-detection sources in
// shipped-units-source-of-truth.mjs miss them because a unit often ships under a
// commit subject that does NOT contain its U-ID (e.g. U-CK11 shipped as
// "[COMMAND-KERNEL-MS0]/...PHASE2BC-V2-1"), and its milestone envelope was never
// flipped to status:complete.
//
// WHAT THIS DOES (tango's domain = discovery + anti-duplication): for every
// tango-eligible unit, verify-on-disk whether it actually shipped, and write the
// confirmed-shipped ids to state/shared/verified-shipped-overrides.json -- the
// 5th picker source (readVerifiedShippedOverrides). The picker then stops
// surfacing them. SAFE BY DESIGN: this writes an explicit OVERRIDE list; it never
// flips operator-authoritative milestone envelopes (respecting the "close-out
// audit is advisory, never auto-flip" doctrine). Same benign failure direction as
// the bridge source: a false-positive only hides a unit from pickup (operator-
// recoverable via the roadmap), never the reverse.
//
// EVIDENCE TIERS (a unit is marked shipped on EITHER):
//   (1) exact-id token present in a real commit SUBJECT (git log --all). High
//       precision -- a commit literally naming the unit-id is strong ship evidence
//       (the same signal the bridge source trusts).
//   (2) RECON_SEED -- 20 units an LLM-agent verify-on-disk pass confirmed shipped
//       with explicit commit-SHA + on-disk-asset evidence (recorded below). These
//       are the units whose commit subjects do NOT contain their id, so tier (1)
//       cannot catch them -- they are seeded with their evidence.
//
// Deeper cases (commit subject != id AND not seeded) need an LLM-agent verify
// (ask-ollama / hermes); the durable cron can escalate those. Tier (1)+(2) are
// the deterministic, high-precision core.
//
// Usage:
//   node scripts/tango-reconcile-queue.mjs            # dry-run report (default, SAFE)
//   node scripts/tango-reconcile-queue.mjs --apply    # write the overrides file
//   node scripts/tango-reconcile-queue.mjs --top N     # limit eligible units scanned
//   node scripts/tango-reconcile-queue.mjs --json      # machine-readable summary

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OVERRIDES_PATH = path.join(REPO_ROOT, "state/shared/verified-shipped-overrides.json");
const REPORT_PATH = path.join(REPO_ROOT, "state/shared/specs/TANGO-QUEUE-RECONCILE.md");
const PRIORITY_QUEUE = path.join(REPO_ROOT, ".claude/helpers/priority-queue.mjs");

const COMMIT_SCAN_LIMIT = 30000;     // how many commit subjects to capture (--all)
const GIT_TIMEOUT_MS = 30000;
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

// Tier (2): LLM-agent verify-on-disk confirmed shipped (FLEET-SEARCH-DAEMON-MS0
// recon, 2026-06-14). Canonical U-* ids; the picker maps phase-letter ids (A1,
// B2, ...) to these via the title-embedded U-ID (extractUnitIdsFromUnit). Each
// carries the close-out / ship commit the recon cited as evidence.
const RECON_SEED = {
  "U-CK11": "18cc9e3f1a", "U-CK14": "8f814a25f6", "U-CK28": "2389e3365b", "U-CK29": "36645c59a1",
  "U-DOCKER-HOOK-BROKER": "b925b381df", "U-REREAD-SIGNAL-FINISH": "229d535240",
  "U-DAILY-CONTEXT-WORKFLOW": "4ad7d90d5a", "U-CONNECTION-FINDER": "947b724dbc",
  "U-QUEUE-PROCESSOR": "d69835b03c", "U-WEEKLY-SYNTHESIS": "6718a1cd62",
  "U-PROJECT-AUTO-UPDATER": "6e3c61d9fb", "U-KNOWLEDGE-DISTILLATION": "35c78a2b96",
  "U-HTML-OUTPUT-MODE": "1c17d2646d", "U-HTML-DASHBOARD": "78d26b1619", "U-HTML-DESIGN-SYSTEM": "3a88b92710",
  "U-PROVENANCE-LAYER": "36e6b5db39", "U-ONTOLOGY-LAYER": "892b667e24", "U-CONFLICT-RESOLUTION": "a6a1196637",
  "U-ACTION-TRACES": "f432ace730", "U-CONTEXT-EVAL-GATE": "0b52fee450",
};

const norm = (id) => String(id || "").trim().toUpperCase();
// Canonical U-* unit-id token (matches the picker's TITLE_UID_RE shape) -- used to
// pull the embedded U-ID out of a phase-letter unit's title (e.g. id "A1",
// title "U-REREAD-SIGNAL-FINISH -- ..." -> U-REREAD-SIGNAL-FINISH).
const UID_TOKEN_RE = /\bU-[A-Z][A-Z0-9-]*\b/gi;

function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

/** Capture every commit subject across all refs, once. Fail-soft to []. */
function captureCommitSubjects() {
  try {
    const out = execFileSync("git", ["-C", REPO_ROOT, "log", "--all", "--format=%s", "-n", String(COMMIT_SCAN_LIMIT)], {
      encoding: "utf8", timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"], maxBuffer: GIT_MAX_BUFFER,
    });
    return out.split("\n");
  } catch { return []; }
}

/**
 * For each candidate id, is it shipped per a commit subject? Returns Map(id ->
 * firstSubject). EXACT MAXIMAL-TOKEN match: extract each subject's maximal U-*
 * token(s) and require the candidate to EQUAL one. This is collision-safe where a
 * boundary regex is NOT -- "-" is a valid char WITHIN a unit-id, so a boundary
 * match would let the short id "U-A1" match the longer "U-A1-ARCHETYPE..." (a
 * DIFFERENT unit). Exact-token equality matches only when the subject's whole
 * U-token is the candidate (e.g. "[MS]/U-A1: title" -> token "U-A1").
 */
export function verifyIdsInSubjects(ids, subjects) {
  const hits = new Map();
  const want = new Set(ids.map(norm));
  for (const s of subjects) {
    const toks = String(s).match(UID_TOKEN_RE);
    if (!toks) continue;
    for (const t of toks) {
      const nt = norm(t);
      // note ALWAYS leads with the matched token (the token can sit past a 100-char
      // slice in a long subject, which made a naive slice hide the evidence).
      if (want.has(nt) && !hits.has(nt)) hits.set(nt, `${nt} | ${String(s).slice(0, 110)}`);
    }
  }
  return hits;
}

/** Tango-eligible units from the priority-queue picker. Fail-soft to []. */
function getTangoEligible(top) {
  try {
    const out = execFileSync(process.execPath, [PRIORITY_QUEUE, "--pick", "--slot", "tango", "--top", String(top), "--json"], {
      encoding: "utf8", timeout: GIT_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"], maxBuffer: GIT_MAX_BUFFER,
    });
    const j = JSON.parse(out);
    const arr = Array.isArray(j) ? j : (j.picks || j.units || j.results || []);
    return arr.map((u) => ({ id: norm(u.id || u.unit_id || u.unit), title: u.title || u.desc || u.milestone || "" })).filter((u) => u.id);
  } catch { return []; }
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const json = args.includes("--json");
  const topIdx = args.indexOf("--top");
  const top = topIdx >= 0 ? Number(args[topIdx + 1]) || 9999 : 9999;

  const eligible = getTangoEligible(top);
  const subjects = captureCommitSubjects();
  // The picker subtracts a unit when ANY of its U-* ids (the `id` if U-shaped +
  // any U-* token embedded in the title -- mirrors extractUnitIdsFromUnit) is in
  // the shipped union. Verify only those U-* ids: collision-safe (specific U-*
  // tokens, never generic A1/U2/P0-U06) and aligned with how the picker filters.
  const uidsOf = (u) => {
    const out = new Set();
    if (/^U-/i.test(u.id)) out.add(norm(u.id));
    const tm = String(u.title).match(UID_TOKEN_RE);
    if (tm) for (const t of tm) out.add(norm(t));
    return out;
  };
  const candidateUids = new Set();
  for (const u of eligible) for (const id of uidsOf(u)) candidateUids.add(id);

  // tier (1): exact-id-in-subject across the candidate U-* ids
  const subjectHits = verifyIdsInSubjects([...candidateUids], subjects);

  // assemble the verified-shipped set with evidence
  const evidence = {};
  for (const [id, subj] of subjectHits) evidence[id] = { via: "commit-subject", note: subj };
  for (const [id, sha] of Object.entries(RECON_SEED)) {
    if (!evidence[id]) evidence[id] = { via: "recon-seed", commit: sha, note: "LLM-agent verify-on-disk (FLEET-SEARCH-DAEMON-MS0 recon 2026-06-14)" };
  }
  const verifiedIds = Object.keys(evidence).sort();

  // merge with any existing overrides (additive, dedup) -- but keep ONLY U-* ids
  // (the picker ignores non-U-* anyway; excluding them keeps the file all-honored
  // and drops any generic-id noise a prior run may have written).
  const existing = readJsonSafe(OVERRIDES_PATH) || {};
  const existingIds = Array.isArray(existing.ids) ? existing.ids.map(norm).filter((id) => /^U-/i.test(id)) : [];
  const existingEv = existing._evidence || {};
  const mergedIds = Array.from(new Set([...existingIds, ...verifiedIds])).filter((id) => /^U-/i.test(id)).sort();
  const mergedEv = {};
  for (const id of mergedIds) mergedEv[id] = evidence[id] || existingEv[id] || { via: "prior" };

  const eligibleShipped = eligible.filter((u) => [...uidsOf(u)].some((id) => evidence[id])).length;
  const summary = {
    eligibleScanned: eligible.length,
    commitSubjects: subjects.length,
    confirmedViaSubject: subjectHits.size,
    reconSeed: Object.keys(RECON_SEED).length,
    newlyVerified: verifiedIds.length,
    eligibleNowShipped: eligibleShipped,
    overridesTotalAfter: mergedIds.length,
    applied: apply,
  };

  if (apply) {
    const payload = {
      schemaVersion: "1.0.0",
      generatedBy: "scripts/tango-reconcile-queue.mjs",
      generatedAt: new Date().toISOString(),
      advisoryOnly: true,
      caveat: "Verified-shipped overrides for the picker (5th source). Hides shipped units from pickup; never flips envelopes. A false-positive is operator-recoverable via the roadmap.",
      ids: mergedIds,
      _evidence: mergedEv,
    };
    fs.mkdirSync(path.dirname(OVERRIDES_PATH), { recursive: true });
    fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");

    const md = [
      "# TANGO Queue Reconcile -- verified-shipped overrides",
      "",
      `Generated: ${payload.generatedAt}`,
      `Eligible scanned: ${summary.eligibleScanned} | confirmed-via-commit-subject: ${summary.confirmedViaSubject} | recon-seed: ${summary.reconSeed}`,
      `Overrides total after merge: ${summary.overridesTotalAfter}`,
      "",
      "Advisory only. The picker (priority-queue / slot-queue) subtracts these ids via",
      "readVerifiedShippedOverrides (shipped-units-source-of-truth.mjs source (e)).",
      "",
      "## Verified-shipped ids (evidence)",
      ...mergedIds.map((id) => `- \`${id}\` -- ${(mergedEv[id] && mergedEv[id].via) || "?"}${mergedEv[id] && mergedEv[id].commit ? " " + mergedEv[id].commit : ""}`),
      "",
    ].join("\n");
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, md, "utf8");
  }

  if (json) { console.log(JSON.stringify(summary)); return; }
  console.log("=== TANGO Queue Reconcile ===");
  console.log(`  eligible scanned       : ${summary.eligibleScanned}`);
  console.log(`  commit subjects        : ${summary.commitSubjects}`);
  console.log(`  confirmed via subject  : ${summary.confirmedViaSubject}`);
  console.log(`  recon-seed units       : ${summary.reconSeed}`);
  console.log(`  newly verified (total) : ${summary.newlyVerified}`);
  console.log(`  eligible now shipped   : ${summary.eligibleNowShipped}`);
  console.log(`  overrides total after  : ${summary.overridesTotalAfter}`);
  console.log(`  ${apply ? "APPLIED -> " + OVERRIDES_PATH : "DRY-RUN (use --apply to write)"}`);
}

// Run main() only when invoked directly (node tango-reconcile-queue.mjs), NOT when
// a unit test imports verifyIdsInSubjects.
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("tango-reconcile-queue.mjs");
if (invokedDirectly) main();
