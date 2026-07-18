// cimco-verify-open-file.mjs — PRISM's blind-safe in-app post VERIFIER (CIMCO External-Command hook).
//
// The runnable half of the blind-safe proof arm the launch-surface integrationHook describes
// (state/shared/cimco/launch-surface.json): register THIS as CIMCO Edit "External Command 1"
// (Editor Setup > External Commands, title e.g. "PRISM Verify"). When the operator invokes it on
// the open NC, CIMCO passes $FILEPATH and reads the verdict back from $OUTFILE — a pure FILE-channel
// loop that needs NO UIA automation and NO live license (the gap the nav-planner classifies as
// PROOF_ARMS.external-cmd). It composes the already-built offline arms:
//   • dialectLint  (cimco-dialect-allowlist.mjs) — the post's G/M vocabulary vs the codes JM actually
//                  used in its goldens for that dialect (a foreign code = a post the machine never ran)
//   • byte-equiv   (nc-dialect-masks.roundTrip) — vs an operator-supplied golden, classified
//                  byte-identical | volatile-header-only | semantic-drift (header churn vs real divergence)
//
// HONEST COVERAGE (R12): this is the STATIC + byte-equivalence verdict. It does NOT — and cannot —
// produce the CIMCO Machine-Simulation collision/gouge/over-travel verdict, which is UIA + live-license
// gated (the nav-planner's sim-uia arm / SPINE-2). It FAILS CLOSED: an empty/unreadable NC, an unknown
// dialect, or semantic-drift vs the golden never reads "cleared". A clean dialect lint alone is
// NECESSARY-NOT-SUFFICIENT (vocab in-allowlist ≠ correct toolpath) — clearance REQUIRES a golden
// byte-equivalence pass. Cleared:true is only ever earned, never assumed.
//
// Reuses scripts/cimco-dialect-allowlist.mjs + scripts/lib/nc-dialect-masks.mjs (no dup).
// Wiki: [[cimco-verification-simulation-integration]] · sibling: cimco-nav-planner.mjs (classifies arms)
// Tests: scripts/cimco-verify-open-file.test.mjs.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dialectLint, loadAllowlist } from "./cimco-dialect-allowlist.mjs";
import { detectDialect, roundTrip } from "./lib/nc-dialect-masks.mjs";

/** Overall verdicts, ordered worst→best. FAIL-CLOSED: anything but a golden byte-equiv pass ≠ cleared. */
export const VERDICTS = Object.freeze(["FAIL", "INCONCLUSIVE", "WARN", "PASS"]);

/** Read a required NC file FAIL-LOUD (a verifier that silently treats a missing file as "nothing wrong" is the fail-open trap). */
function readNc(path, label) {
  if (!path) throw new Error(`${label} path is required`);
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    throw new Error(`${label} not readable: ${path} (${e.code || e.message})`);
  }
}

/**
 * Verify a candidate NC post offline.
 * @param {object} opts
 * @param {string} opts.ncFile - candidate NC path ($FILEPATH from CIMCO). REQUIRED.
 * @param {string} [opts.goldenFile] - golden NC to byte-equiv against (the only path to "cleared").
 * @param {string} [opts.machine] - JM machine id for the report (annotation only).
 * @param {object} [opts.allowlist] - pre-loaded dialect allowlist (defaults to loadAllowlist()).
 * @returns {object} structured verdict
 */
export function verifyPost(opts = {}) {
  const ncFile = String(opts.ncFile || "").trim();
  const ncText = readNc(ncFile, "candidate NC");
  const dialect = detectDialect(ncText);
  const arms = {};
  const blockers = [];

  // Empty/whitespace NC is a fail-closed FAIL — never "nothing wrong".
  const nonBlank = ncText.replace(/\s+/g, "").length;
  if (nonBlank === 0) {
    return _finish(ncFile, dialect, opts.machine, { empty: { ran: true, status: "fail", note: "NC file is empty/whitespace-only" } }, ["empty-nc"], "FAIL", false);
  }

  // ── Arm 1: dialect G/M allowlist lint (necessary, not sufficient) ──
  let allowlist;
  try {
    allowlist = opts.allowlist || loadAllowlist();
  } catch (e) {
    allowlist = null;
    blockers.push(`allowlist-unavailable (${e.message})`);
  }
  if (allowlist) {
    // dialectLint → { family, classified, hasAllowlist, sampleCount, observedG/M, unobservedG/M, review, note }.
    // hasAllowlist=false ⇒ no JM goldens mined for this dialect (cannot lint — NOT a pass). review=true ⇒ codes
    // emitted that were never observed in JM's goldens (unobserved≠invalid, but a foreign code warrants review).
    const lint = dialectLint(ncText, { allowlist, family: dialect }); // dialectLint keys the override on `family`, not `dialect`
    const unknown = [...(lint.unobservedG || []), ...(lint.unobservedM || [])];
    const known = lint.hasAllowlist === true;
    arms.dialectLint = {
      ran: true,
      dialect: lint.family ?? dialect,
      sampleCount: lint.sampleCount ?? 0,
      status: !known ? "inconclusive" : lint.review ? "warn" : "pass",
      unknownCodes: unknown,
      note: lint.note,
    };
    if (!known) blockers.push("dialect-not-in-allowlist-corpus");
    if (lint.review) blockers.push("unobserved-gm-codes-vs-goldens");
  } else {
    arms.dialectLint = { ran: false, status: "inconclusive", note: "allowlist not loadable" };
  }

  // ── Arm 2: byte-equivalence vs a golden (the only path to "cleared") ──
  const goldenFile = String(opts.goldenFile || "").trim();
  if (goldenFile) {
    const goldenText = readNc(goldenFile, "golden NC");
    // roundTrip(golden, candidate) → { classification: 'byte-identical'|'volatile-header-only'|'semantic-drift', firstDiff, safe }
    const rt = roundTrip(goldenText, ncText, { dialect });
    const cls = rt.classification ?? null;
    const passCls = cls === "byte-identical" || cls === "volatile-header-only";
    arms.byteEquiv = {
      ran: true,
      golden: basename(goldenFile),
      classification: cls,
      status: passCls ? "pass" : cls === "semantic-drift" ? "fail" : "inconclusive",
      firstDiff: rt.firstDiff ?? null,
      note: passCls
        ? "byte-equivalent to the golden (header churn only is safe) — TRUE parity requires golden + candidate share a CAM source"
        : cls === "semantic-drift"
          ? "semantic divergence from the golden — genuine content difference, NOT just header churn"
          : "byte-equivalence inconclusive",
    };
    if (cls === "semantic-drift") blockers.push("semantic-drift-vs-golden");
  } else {
    arms.byteEquiv = { ran: false, status: "inconclusive", note: "no golden supplied — byte-equivalence (the only clearance arm) cannot run" };
    blockers.push("no-golden-for-byte-equivalence");
  }

  // ── Overall verdict (FAIL-CLOSED) ──
  const armList = Object.values(arms);
  const anyFail = armList.some((a) => a.status === "fail");
  const byteEquivPassed = arms.byteEquiv.ran && arms.byteEquiv.status === "pass";
  const lintWarn = arms.dialectLint.status === "warn";
  let verdict;
  let cleared;
  if (anyFail) {
    verdict = "FAIL";
    cleared = false;
  } else if (byteEquivPassed) {
    // Earned clearance: byte-equivalent to a golden, no failures. A lint warn downgrades to WARN but stays cleared-with-caveat=false.
    verdict = lintWarn ? "WARN" : "PASS";
    cleared = !lintWarn; // a foreign G/M code, even with byte-equiv, blocks an unqualified clearance
  } else {
    // No golden pass → static-only. NEVER cleared (necessary-not-sufficient).
    verdict = lintWarn ? "WARN" : "INCONCLUSIVE";
    cleared = false;
  }
  // NOTE: cleared:true may coexist with a non-empty blockers[] only in the unknown-dialect case —
  // byte-IDENTITY to an operator-supplied golden earns clearance even when the vocab lint could not
  // run (dialect not in the JM-golden corpus). Byte-identity subsumes the lint: the golden contains
  // exactly the candidate's codes. A foreign code in a KNOWN dialect is a `warn` and withholds clearance.
  return _finish(ncFile, dialect, opts.machine, arms, [...new Set(blockers)], verdict, cleared);
}

function _finish(ncFile, dialect, machine, arms, blockers, verdict, cleared) {
  return {
    schemaVersion: "1.0.0",
    tool: "cimco-verify-open-file",
    ncFile,
    dialect,
    machine: machine || null,
    arms,
    verdict,
    cleared,
    coverage:
      "static dialect-lint + byte-equivalence (offline, blind-safe). Does NOT include the CIMCO Machine-Simulation collision/gouge verdict (UIA + live license — run the nav-planner 'simulate' arm / SPINE-2).",
    blockers,
  };
}

/** Render the verdict as the text CIMCO reads back from $OUTFILE (operator-legible header + JSON block). */
export function renderOutfile(verdict) {
  const lines = [
    `PRISM VERIFY: ${verdict.verdict}${verdict.cleared ? " (cleared)" : " (NOT cleared — see blockers)"}`,
    `NC: ${verdict.ncFile}`,
    `Dialect: ${verdict.dialect}${verdict.machine ? `  Machine: ${verdict.machine}` : ""}`,
    `Coverage: static + byte-equivalence (NOT the collision sim verdict)`,
  ];
  for (const [name, a] of Object.entries(verdict.arms)) {
    lines.push(`  - ${name}: ${a.status}${a.note ? ` — ${a.note}` : ""}`);
  }
  if (verdict.blockers.length) lines.push(`Blockers: ${verdict.blockers.join(", ")}`);
  lines.push("", "--- JSON ---", JSON.stringify(verdict, null, 2));
  return lines.join("\n") + "\n";
}

/** Write the verdict to $OUTFILE FAIL-LOUD (an unwritable verdict file must throw, not be swallowed). */
export function writeOutfile(verdict, outPath) {
  if (!outPath) throw new Error("writeOutfile: outPath is required");
  try {
    writeFileSync(outPath, renderOutfile(verdict), "utf8");
  } catch (e) {
    throw new Error(`could not write verdict to ${outPath} (${e.code || e.message})`);
  }
  return outPath;
}

// ─── CLI (argv-guarded) — the External-Command entrypoint ──────────────────────────────────────
function _arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function _main(argv) {
  // Positional first arg = $FILEPATH (CIMCO passes the open file path); flags for golden/machine/out.
  const ncFile = argv[0] && !argv[0].startsWith("--") ? argv[0] : _arg(argv, "--nc");
  const goldenFile = _arg(argv, "--golden");
  const machine = _arg(argv, "--machine");
  const out = _arg(argv, "--out"); // $OUTFILE
  try {
    const verdict = verifyPost({ ncFile, goldenFile, machine });
    if (out) writeOutfile(verdict, out);
    console.log(JSON.stringify(verdict, null, 2));
    // Exit code mirrors clearance so a caller/script can gate on it: 0=cleared, 1=not-cleared, 2=fail.
    process.exit(verdict.verdict === "FAIL" ? 2 : verdict.cleared ? 0 : 1);
  } catch (e) {
    console.error(`cimco-verify-open-file: ${e.message}`);
    process.exit(3);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  _main(process.argv.slice(2));
}
