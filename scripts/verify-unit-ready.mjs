#!/usr/bin/env node
// SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY
//
// Pre-claim dependency check for /pick-unit. Reads a unit's `depends_on`
// array and verifies each dep is `status: "complete"` in its envelope before
// allowing the picker to surface it. If any dep is missing or not complete,
// the pick is BLOCKED with a punch list of unsatisfied prereqs.
//
// Schema convention:
//   - In-milestone dep: "U-FOO" (resolves against the same envelope)
//   - Cross-milestone dep: "MS-OTHER:U-BAR" (colon-separated)
//   - depends_on missing/empty → unit is always ready (backward-compat with
//     envelopes that haven't adopted the field yet, e.g. SYSTEM-VIZ-BRAIN-MS0
//     as of 2026-05-16)
//
// Pure API (exported, tested):
//   parseDep(dep, hostMilestone) → { milestone, unit_id, malformed? }
//   lookupUnitStatus(envelopes, milestone, unit_id) → { found, status, reason? }
//   verifyUnitReady({ envelopes, unitRef }) → { ready, reason, missingDeps[], chain[], hostFound }
//
// CLI:
//   node scripts/verify-unit-ready.mjs --milestone <id> --unit <id> [--envelope-dir DIR] [--json]
//   exit 0 = ready · exit 2 = blocked · exit 3 = bad invocation
//
// Knobs:
//   PRISM_VERIFY_UNIT_READY_ENVELOPE_DIR — default H:/prism/mcp-server/data/milestones
//
// Hardening (per per-file scrutiny gate 2026-05-16):
//   - milestone + unit_id sanitized via /^[A-Z0-9][A-Z0-9_-]{0,63}$/ before
//     touching disk (no path traversal via --milestone or --unit).
//   - envelopeDir resolved to absolute + the assembled file path must
//     startsWith(resolvedDir) (defense-in-depth).
//   - depends_on > CYCLE_LIMIT emits a warning (not silent truncate).
//   - process.exit calls flush stdout via callback (Windows pipe safety).
//   - isMain uses pathToFileURL (cross-platform robust).

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_ENVELOPE_DIR = process.env.PRISM_VERIFY_UNIT_READY_ENVELOPE_DIR
  || "H:/prism/mcp-server/data/milestones";
const COMPLETE_STATUS = "complete";
const CYCLE_LIMIT = 64;
const DEP_SEP = ":";
// Restrictive ID regex: starts uppercase alnum, then alnum/dash/underscore, max 64 chars.
// Rejects: ".", "..", "/", "\\", null bytes, anything that could path-traverse.
const ID_REGEX = /^[A-Z0-9][A-Z0-9_-]{0,63}$/;

export function isSafeId(id) {
  return typeof id === "string" && ID_REGEX.test(id);
}

export function parseDep(dep, hostMilestone) {
  if (typeof dep !== "string" || dep.length === 0) {
    return { milestone: hostMilestone, unit_id: null, malformed: true };
  }
  const idx = dep.indexOf(DEP_SEP);
  let milestone, unit_id;
  if (idx < 0) {
    milestone = hostMilestone;
    unit_id = dep.trim();
  } else {
    milestone = dep.slice(0, idx).trim();
    unit_id = dep.slice(idx + 1).trim();
  }
  if (!milestone || !unit_id || !isSafeId(milestone) || !isSafeId(unit_id)) {
    return { milestone: hostMilestone, unit_id: null, malformed: true };
  }
  return { milestone, unit_id };
}

export function lookupUnitStatus(envelopes, milestone, unit_id) {
  if (!envelopes || typeof envelopes !== "object") {
    return { found: false, status: null, reason: "envelope_missing" };
  }
  const env = envelopes[milestone];
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return { found: false, status: null, reason: "envelope_missing" };
  }
  const units = env.units;
  if (!units || typeof units !== "object" || Array.isArray(units)) {
    return { found: false, status: null, reason: "unit_missing_from_envelope" };
  }
  // Use Object.prototype.hasOwnProperty to dodge prototype-pollution lookups.
  if (!Object.prototype.hasOwnProperty.call(units, unit_id)) {
    return { found: false, status: null, reason: "unit_missing_from_envelope" };
  }
  const u = units[unit_id];
  if (!u || typeof u !== "object") {
    return { found: false, status: null, reason: "unit_missing_from_envelope" };
  }
  return { found: true, status: typeof u.status === "string" ? u.status : null };
}

export function verifyUnitReady({ envelopes, unitRef }) {
  if (!envelopes || typeof envelopes !== "object" || Array.isArray(envelopes)) {
    return { ready: false, reason: "envelopes_not_provided", missingDeps: [], chain: [], hostFound: false };
  }
  if (!unitRef || typeof unitRef !== "object" || !unitRef.milestone || !unitRef.unit_id) {
    return { ready: false, reason: "unitRef_invalid", missingDeps: [], chain: [], hostFound: false };
  }

  const host = lookupUnitStatus(envelopes, unitRef.milestone, unitRef.unit_id);
  if (!host.found) {
    return {
      ready: false,
      reason: host.reason,
      missingDeps: [],
      chain: [unitRef],
      hostFound: false,
    };
  }

  const env = envelopes[unitRef.milestone];
  const u = env.units[unitRef.unit_id];
  const depsRaw = u.depends_on;

  if (!Array.isArray(depsRaw) || depsRaw.length === 0) {
    return {
      ready: true,
      reason: Array.isArray(depsRaw) ? "deps_empty" : "deps_not_declared",
      missingDeps: [],
      chain: [unitRef],
      hostFound: true,
    };
  }

  const chain = [unitRef];
  const missing = [];
  const limited = depsRaw.length > CYCLE_LIMIT;
  const iterCount = Math.min(depsRaw.length, CYCLE_LIMIT);

  for (let i = 0; i < iterCount; i++) {
    const parsed = parseDep(depsRaw[i], unitRef.milestone);
    if (parsed.malformed) {
      missing.push({ dep: String(depsRaw[i]), reason: "malformed_dep_string" });
      continue;
    }
    chain.push({ milestone: parsed.milestone, unit_id: parsed.unit_id });
    const lookup = lookupUnitStatus(envelopes, parsed.milestone, parsed.unit_id);
    if (!lookup.found) {
      missing.push({
        dep: String(depsRaw[i]),
        milestone: parsed.milestone,
        unit_id: parsed.unit_id,
        reason: lookup.reason,
      });
    } else if (lookup.status !== COMPLETE_STATUS) {
      missing.push({
        dep: String(depsRaw[i]),
        milestone: parsed.milestone,
        unit_id: parsed.unit_id,
        reason: "status_not_complete",
        status: lookup.status,
      });
    }
  }

  if (limited) {
    // P2 surface — depends_on exceeded the cap; user should see this in CLI output.
    missing.push({
      dep: `(truncated ${depsRaw.length - CYCLE_LIMIT} entries beyond CYCLE_LIMIT=${CYCLE_LIMIT})`,
      reason: "deps_exceeded_cycle_limit",
    });
  }

  return {
    ready: missing.length === 0,
    reason: missing.length === 0 ? "all_deps_complete" : "missing_deps",
    missingDeps: missing,
    chain,
    hostFound: true,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = { milestone: null, unit: null, envelopeDir: DEFAULT_ENVELOPE_DIR, json: false };
  const errors = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--milestone") { args.milestone = argv[++i] || null; }
    else if (a === "--unit") { args.unit = argv[++i] || null; }
    else if (a === "--envelope-dir") { args.envelopeDir = argv[++i] || args.envelopeDir; }
    else if (a === "--json") { args.json = true; }
    else { errors.push(a); }
  }
  return { args, errors };
}

export function safeLoadEnvelope(envelopeDir, milestoneId) {
  // Reject anything not matching the strict ID regex BEFORE touching disk.
  if (!isSafeId(milestoneId)) return { ok: false, reason: "unsafe_milestone_id" };
  const resolvedDir = path.resolve(envelopeDir);
  const candidate = path.resolve(resolvedDir, `${milestoneId}.json`);
  // Defense-in-depth: even though ID_REGEX blocks ".." and "/", confirm the
  // resolved path is INSIDE the envelope directory.
  if (!candidate.startsWith(resolvedDir + path.sep) && candidate !== resolvedDir) {
    return { ok: false, reason: "path_escapes_envelope_dir" };
  }
  let raw;
  try {
    raw = fs.readFileSync(candidate, "utf8");
  } catch {
    return { ok: false, reason: "read_failed" };
  }
  try {
    return { ok: true, envelope: JSON.parse(raw) };
  } catch {
    return { ok: false, reason: "parse_failed" };
  }
}

function loadEnvelopesLazily(envelopeDir, neededIds) {
  const out = {};
  for (const id of neededIds) {
    const r = safeLoadEnvelope(envelopeDir, id);
    if (r.ok) out[id] = r.envelope;
  }
  return out;
}

function exitWith(code, msg) {
  // Windows pipe safety: flush stdout via callback BEFORE exiting, so the
  // BLOCKED punch-list isn't truncated.
  process.stdout.write(msg, () => process.exit(code));
}

function exitWithErr(code, msg) {
  // Symmetric flush-then-exit for stderr (same Windows pipe-safety reasoning).
  process.stderr.write(msg, () => process.exit(code));
}

export function cliMain(argv) {
  const usage = "usage: verify-unit-ready --milestone <id> --unit <id> [--envelope-dir DIR] [--json]\n";
  const { args, errors } = parseArgs(argv);
  if (errors.length > 0) {
    return exitWithErr(3, `unknown arg(s): ${errors.join(" ")}\n${usage}`);
  }
  if (!args.milestone || !args.unit) {
    return exitWithErr(3, `missing required --milestone and/or --unit\n${usage}`);
  }
  if (!isSafeId(args.milestone) || !isSafeId(args.unit)) {
    return exitWithErr(3, "milestone/unit ID must match /^[A-Z0-9][A-Z0-9_-]{0,63}$/\n");
  }

  // Pre-read the host envelope to discover dep milestone IDs.
  const hostEnvelopes = loadEnvelopesLazily(args.envelopeDir, [args.milestone]);
  const hostUnit = (hostEnvelopes[args.milestone]?.units || {})[args.unit];
  const depMilestones = new Set([args.milestone]);
  if (Array.isArray(hostUnit?.depends_on)) {
    for (const d of hostUnit.depends_on) {
      const parsed = parseDep(d, args.milestone);
      if (!parsed.malformed) depMilestones.add(parsed.milestone);
    }
  }
  const envelopes = loadEnvelopesLazily(args.envelopeDir, [...depMilestones]);
  const result = verifyUnitReady({
    envelopes,
    unitRef: { milestone: args.milestone, unit_id: args.unit },
  });
  let msg;
  if (args.json) {
    msg = JSON.stringify(result, null, 2) + "\n";
  } else if (result.ready) {
    msg = `READY (${result.reason})\n`;
  } else {
    msg = `BLOCKED (${result.reason})\n`;
    for (const m of result.missingDeps) {
      const id = `${m.milestone || "(no-ms)"}:${m.unit_id || "(no-id)"}`;
      msg += `  - ${id} — ${m.reason}${m.status ? " (status=" + m.status + ")" : ""}\n`;
    }
  }
  exitWith(result.ready ? 0 : 2, msg);
}

// pathToFileURL gives the exact `file:///H:/...` shape that import.meta.url
// also produces, cross-platform. Robust to absolute/relative argv and Windows
// backslashes.
const isMain = typeof process.argv[1] === "string"
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) cliMain(process.argv.slice(2));
