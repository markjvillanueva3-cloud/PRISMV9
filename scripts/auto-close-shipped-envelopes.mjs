#!/usr/bin/env node
/**
 * auto-close-shipped-envelopes.mjs — CLEANUP-MS0 / U-CLEANUP-F2B
 *
 * Reads state/shared/CLOSE-OUT-CANDIDATES.json (produced by
 * scripts/audit-close-out-candidates.mjs, U-CLEANUP-F2) and queues each
 * high-confidence shipped-but-pending unit as a mutation entry in
 * state/shared/golf-envelope-mutations.jsonl. A separate main-tree drainer
 * hook (out of scope for this unit) reads the queue and applies the
 * status flips to the milestone-envelope JSON files.
 *
 * Why queue + drain rather than mutate directly: the golf hygiene chat is
 * write-allowlisted by `.claude/hooks/golf-slot-write-allowlist.mjs` and
 * CANNOT commit to `mcp-server/data/milestones/*.json` itself (would
 * corrupt the milestone state). The two-stage producer/consumer pattern
 * lets golf queue advisory mutations while keeping the destructive flip
 * gated through a main-tree chat that has commit authority.
 *
 * Fail-loud doctrine: each candidate becomes ONE queue entry tagged with
 * `advisoryOnly:true` and the full evidence array from the audit. The
 * drainer is responsible for the actual disk write + human verification.
 *
 * Deduplication: the queue is append-only. Each run dedups against the
 * existing JSONL by the composite key `(milestoneId, unitId, action)` —
 * a candidate already queued is skipped (recorded in `skippedExisting[]`).
 * Ordering: candidates are processed in (milestoneId, unitId) sort order
 * so two consecutive runs with the same input produce identical output.
 *
 * Idempotency: re-running against the same audit input produces zero new
 * queue entries (all dedup-skipped). `--dry-run` plans the queue
 * additions without writing.
 *
 * Cadence: not required — operators run on demand after `/close-out-audit`
 * refreshes the candidates file, or pair with the daily `08-envelope-drift`
 * cron (F2). The script is read-only against everything except
 * `golf-envelope-mutations.jsonl`.
 *
 * Usage:
 *   node scripts/auto-close-shipped-envelopes.mjs                   apply
 *   node scripts/auto-close-shipped-envelopes.mjs --dry-run         plan only
 *   node scripts/auto-close-shipped-envelopes.mjs --json            machine-readable
 *   node scripts/auto-close-shipped-envelopes.mjs --min-confidence 0.9
 *   node scripts/auto-close-shipped-envelopes.mjs --candidates X.json --queue Q.jsonl
 *   node scripts/auto-close-shipped-envelopes.mjs --now 2026-05-14T00:00:00Z
 *
 * Exit codes: 0 = ok (or dry-run), 1 = error (input missing/malformed,
 * queue write failure, path-safety refusal). Zero new queue entries is
 * NOT an error — it's the healthy steady state once everything's caught up.
 *
 * Sister files: scripts/audit-close-out-candidates.mjs (F2 producer of
 * CLOSE-OUT-CANDIDATES.json), .claude/hooks/golf-slot-write-allowlist.mjs
 * (gates golf writes; `golf-envelope-mutations.jsonl` is explicitly allowed).
 * Envelope: mcp-server/data/milestones/CLEANUP-MS0.json (U-CLEANUP-F2B).
 */

import {
  existsSync, readFileSync, appendFileSync, mkdirSync, statSync, realpathSync,
} from "node:fs";
import { join, resolve, dirname, isAbsolute, relative, normalize } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Configuration ───────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = resolve(__dirname, "..");
const DEFAULT_CANDIDATES_REL = "state/shared/CLOSE-OUT-CANDIDATES.json";
const DEFAULT_QUEUE_REL = "state/shared/golf-envelope-mutations.jsonl";

const DEFAULT_MIN_CONFIDENCE = 0.75;
const SCHEMA_VERSION = 1;
const ACTION_FLIP_STATUS = "flip-status";
const PROPOSED_STATUS = "complete";
const SOURCE_TAG = "auto-close-shipped-envelopes";

// Max staleness of CLOSE-OUT-CANDIDATES.json in hours. Older than this
// and we refuse to queue (the audit data is too old to trust — a peer
// could have flipped envelopes since the audit ran, and we'd queue a
// duplicate mutation). 4h matches the goal-gate's PRISM_GOAL_GATE_STALE_HRS
// posture for short-cycle reconciliation; operator passes a higher value
// (e.g. --max-age-hrs 24) for batch backfill.
const DEFAULT_MAX_CANDIDATES_AGE_HRS = 4;

// Per-entry evidence cap. A pathological audit could emit thousands of
// evidence entries per candidate, producing megabyte JSONL lines that some
// drainer implementations (line-by-line streaming with default Node limits)
// would OOM on. Cap at producer side so the queue never grows poisoned.
const EVIDENCE_MAX_ENTRIES = 50;
const EVIDENCE_MAX_BYTES = 8 * 1024;

// Allowed envelope statuses for the `fromStatus` field. A defensive
// drainer asserts the envelope's actual status matches `fromStatus`
// before flipping; if an audit fed us a malformed `fromStatus = "complete"`,
// the drainer's identity check passes trivially and we'd flip a unit
// that was never pending. Whitelist at producer prevents that path.
const ALLOWED_FROM_STATUSES = new Set([
  "pending", "not_started", "in_progress", "in_progress_real", "in_review",
]);

// Charset whitelist for unit_id / milestoneId — letters, digits, plus
// the punctuation our envelope schema actually uses (`.`, `_`, `-`, `+`).
// Anything else (control chars, RTL overrides, pipe `|` which would poison
// the composite dedup key) gets rejected.
const ID_CHARSET = /^[A-Za-z0-9._+\-]+$/;

// ─── Pure helpers (exported for tests) ───────────────────────────────────

export function parseArgs(argv) {
  const out = {
    repo: DEFAULT_REPO,
    candidates: null,
    queue: null,
    minConfidence: DEFAULT_MIN_CONFIDENCE,
    maxCandidatesAgeHrs: DEFAULT_MAX_CANDIDATES_AGE_HRS,
    now: null,
    dryRun: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo" && argv[i + 1]) out.repo = argv[++i];
    else if (a === "--candidates" && argv[i + 1]) out.candidates = argv[++i];
    else if (a === "--queue" && argv[i + 1]) out.queue = argv[++i];
    else if (a === "--min-confidence" && argv[i + 1]) {
      const n = parseFloat(argv[++i]);
      out.minConfidence = (Number.isFinite(n) && n >= 0 && n <= 1) ? n : DEFAULT_MIN_CONFIDENCE;
    } else if (a === "--max-age-hrs" && argv[i + 1]) {
      const n = parseFloat(argv[++i]);
      out.maxCandidatesAgeHrs = (Number.isFinite(n) && n >= 0) ? n : DEFAULT_MAX_CANDIDATES_AGE_HRS;
    } else if (a === "--now" && argv[i + 1]) out.now = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

/**
 * Validate a milestoneFile path: must be a relative path under
 * `mcp-server/data/milestones/`, ending in `.json`, with no traversal
 * components. Returns { ok: true } or { ok: false, reason }.
 *
 * Defense-in-depth at the producer: the queue entry's `milestoneFile`
 * will be used by a future drainer to LOCATE the envelope to mutate.
 * A manipulated audit input could put `../../../.claude/settings.json`
 * here; the drainer would then be the only thing standing between a
 * malformed audit and config-file corruption. Sanitize at producer.
 */
export function validateMilestoneFile(p) {
  if (typeof p !== "string" || p.length === 0) return { ok: false, reason: "missing or non-string" };
  if (p.includes("\0")) return { ok: false, reason: "contains NUL" };
  if (isAbsolute(p)) return { ok: false, reason: "must be relative, not absolute" };
  // Reject Windows-style backslashes that could escape POSIX normalization.
  // Audit always emits forward slashes; anything else is suspect.
  if (p.includes("\\")) return { ok: false, reason: "contains backslash" };
  const norm = normalize(p).replace(/\\/g, "/");
  if (norm.includes("..")) return { ok: false, reason: "contains traversal" };
  if (!norm.startsWith("mcp-server/data/milestones/")) return { ok: false, reason: "must be under mcp-server/data/milestones/" };
  if (!norm.toLowerCase().endsWith(".json")) return { ok: false, reason: "must end in .json" };
  return { ok: true };
}

/**
 * Validate an identifier (unit_id, milestoneId) against the envelope
 * schema charset. Allows letters/digits/`.`/`_`/`-`/`+`. Rejects
 * everything else — control chars, pipes (would poison the composite
 * dedup key), RTL overrides, etc.
 */
export function validateId(id) {
  if (typeof id !== "string" || id.length === 0) return { ok: false, reason: "missing or non-string" };
  if (id.length > 128) return { ok: false, reason: "exceeds 128 chars" };
  if (!ID_CHARSET.test(id)) return { ok: false, reason: "contains illegal characters" };
  return { ok: true };
}

/**
 * Cap an evidence array at `EVIDENCE_MAX_ENTRIES` entries and a serialized
 * size of `EVIDENCE_MAX_BYTES`. Returns `{ evidence, truncated }`.
 */
export function capEvidence(evidence) {
  if (!Array.isArray(evidence)) return { evidence: [], truncated: false };
  let out = evidence;
  let truncated = false;
  if (out.length > EVIDENCE_MAX_ENTRIES) {
    out = out.slice(0, EVIDENCE_MAX_ENTRIES);
    truncated = true;
  }
  // Size-cap: serialize and trim from end until we fit. The actual JSONL
  // line carries more than just `evidence`, so leave headroom by aiming
  // at the cap minus a 1 KB safety margin.
  const SIZE_HEADROOM = 1024;
  while (out.length > 0 && JSON.stringify(out).length > EVIDENCE_MAX_BYTES - SIZE_HEADROOM) {
    out = out.slice(0, -1);
    truncated = true;
  }
  return { evidence: out, truncated };
}

/**
 * Flatten the candidates input from the audit's nested {results:[{milestone, candidates:[{unit_id,...}]}]}
 * into a flat array of mutation-ready records, sorted deterministically.
 * Malformed entries (bad id charset, bad milestoneFile, bad fromStatus) are
 * collected into `rejectedCandidates[]` rather than silently dropped so the
 * operator can see them in the digest output.
 */
export function flattenCandidates(auditInput) {
  const accepted = [];
  const rejected = [];
  if (!auditInput || !Array.isArray(auditInput.results)) {
    return { accepted, rejected };
  }
  for (const r of auditInput.results) {
    const milestoneIdRaw = String(r.milestone || "").trim();
    if (!milestoneIdRaw) continue;
    if (!Array.isArray(r.candidates)) continue;
    const milestoneIdCheck = validateId(milestoneIdRaw);
    if (!milestoneIdCheck.ok) {
      rejected.push({ milestoneId: milestoneIdRaw, unitId: null, reason: `milestoneId: ${milestoneIdCheck.reason}` });
      continue;
    }
    const milestoneFile = r.file || "";
    const milestoneFileCheck = validateMilestoneFile(milestoneFile);
    if (!milestoneFileCheck.ok) {
      rejected.push({ milestoneId: milestoneIdRaw, unitId: null, reason: `milestoneFile: ${milestoneFileCheck.reason}` });
      continue;
    }
    for (const c of r.candidates) {
      const unitIdRaw = String(c.unit_id || "").trim();
      if (!unitIdRaw) {
        rejected.push({ milestoneId: milestoneIdRaw, unitId: null, reason: "missing unit_id" });
        continue;
      }
      const unitIdCheck = validateId(unitIdRaw);
      if (!unitIdCheck.ok) {
        rejected.push({ milestoneId: milestoneIdRaw, unitId: unitIdRaw, reason: `unit_id: ${unitIdCheck.reason}` });
        continue;
      }
      const currentStatus = typeof c.status === "string" ? c.status : "";
      if (!ALLOWED_FROM_STATUSES.has(currentStatus)) {
        rejected.push({ milestoneId: milestoneIdRaw, unitId: unitIdRaw,
          reason: `fromStatus "${currentStatus}" not in allowed set (${[...ALLOWED_FROM_STATUSES].join(", ")})` });
        continue;
      }
      accepted.push({
        milestoneId: milestoneIdRaw,
        milestoneTitle: typeof r.title === "string" ? r.title : "",
        milestoneFile,
        unitId: unitIdRaw,
        unitTitle: typeof c.title === "string" ? c.title : "",
        currentStatus,
        confidence: typeof c.confidence === "number" && Number.isFinite(c.confidence) ? c.confidence : 0,
        evidence: Array.isArray(c.evidence) ? c.evidence : [],
      });
    }
  }
  // Stable sort by milestoneId then unitId — output order must be reproducible
  // across runs to keep the queue diffable + dedup deterministic. Use plain
  // codepoint comparison (not localeCompare with no locale arg, which is
  // locale-dependent and could re-order entries across hosts with different
  // LANG settings).
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  accepted.sort((a, b) =>
    cmp(a.milestoneId, b.milestoneId) || cmp(a.unitId, b.unitId));
  return { accepted, rejected };
}

/**
 * Read existing queue (JSONL, one entry per line). Returns the array of
 * parsed entries + the set of dedup keys `(milestoneId|unitId|action)`.
 * Malformed lines are skipped (and recorded in `malformedLines[]`) — the
 * queue is append-only so a malformed line from a prior run can't break
 * dedup for new entries.
 */
export function readQueueDedup(queuePath, hooks = {}) {
  const out = { entries: [], dedupKeys: new Set(), malformedLines: [] };
  const readFn = hooks.readFn || ((p) => readFileSync(p, "utf8"));
  if (!existsSync(queuePath)) return out;
  let raw;
  try { raw = readFn(queuePath); }
  catch (err) {
    out.malformedLines.push({ lineNo: 0, reason: `read failed: ${String(err && err.message || err)}` });
    return out;
  }
  const lines = String(raw).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    let parsed;
    try { parsed = JSON.parse(line); }
    catch { out.malformedLines.push({ lineNo: i + 1, reason: "bad-json" }); continue; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      out.malformedLines.push({ lineNo: i + 1, reason: "not-object" });
      continue;
    }
    out.entries.push(parsed);
    const key = `${parsed.milestoneId || ""}|${parsed.unitId || ""}|${parsed.action || ""}`;
    if (key !== "||") out.dedupKeys.add(key);
  }
  return out;
}

/**
 * Build the JSONL line for one mutation entry. Pure — does not write.
 * Schema is stable + documented inline so a drainer can decode without
 * importing this module. Evidence is size-capped via capEvidence; a
 * `truncated` flag tells the drainer whether the on-disk version is
 * complete.
 */
export function buildMutationEntry(candidate, nowIso) {
  const capped = capEvidence(candidate.evidence);
  return {
    schemaVersion: SCHEMA_VERSION,
    queuedAtIso: nowIso,
    source: SOURCE_TAG,
    advisoryOnly: true,
    action: ACTION_FLIP_STATUS,
    milestoneId: candidate.milestoneId,
    milestoneFile: candidate.milestoneFile,
    milestoneTitle: candidate.milestoneTitle,
    unitId: candidate.unitId,
    unitTitle: candidate.unitTitle,
    fromStatus: candidate.currentStatus,
    toStatus: PROPOSED_STATUS,
    confidence: candidate.confidence,
    evidence: capped.evidence,
    evidenceTruncated: capped.truncated,
    caveat: "advisory only — main-tree drainer must human-verify before applying",
  };
}

// ─── Core orchestrator ───────────────────────────────────────────────────

/**
 * Pure-ish orchestrator. Never throws on I/O — errors accrue into
 * `result.errors`. Test seams via `hooks`:
 *   hooks.now             — Date|ISO override
 *   hooks.readCandidatesFn — replace fs read of CLOSE-OUT-CANDIDATES.json
 *   hooks.readFn          — replace fs read for the queue (used by readQueueDedup)
 *   hooks.appendFn        — replace fs append for the queue
 *   hooks.statFn          — replace fs stat for the candidates-file age check
 */
export function autoCloseShippedEnvelopes(opts, hooks = {}) {
  const nowDate = hooks.now != null ? new Date(hooks.now)
    : opts.now != null ? new Date(opts.now)
      : new Date();
  const nowMs = nowDate.getTime();

  const resolveAgainstRepo = (p, defaultRel) => {
    if (!p) return join(opts.repo, defaultRel);
    return isAbsolute(p) ? p : resolve(opts.repo, p);
  };
  const candidatesPath = resolveAgainstRepo(opts.candidates, DEFAULT_CANDIDATES_REL);
  const queuePath = resolveAgainstRepo(opts.queue, DEFAULT_QUEUE_REL);

  const result = {
    schemaVersion: SCHEMA_VERSION,
    ok: true,
    queuedAtIso: Number.isFinite(nowMs) ? nowDate.toISOString() : null,
    candidatesPath,
    queuePath,
    dryRun: !!opts.dryRun,
    minConfidence: opts.minConfidence,
    maxCandidatesAgeHrs: opts.maxCandidatesAgeHrs,
    summary: {
      totalCandidatesScanned: 0,
      belowConfidence: 0,
      rejectedShape: 0,
      skippedExisting: 0,
      queued: 0,
      malformedQueueLines: 0,
    },
    queued: [],
    skippedExisting: [],
    belowConfidence: [],
    rejectedShape: [],
    malformedQueueLines: [],
    errors: [],
  };

  if (!Number.isFinite(nowMs)) {
    result.ok = false;
    result.errors.push(`invalid --now value: ${opts.now ?? hooks.now}`);
    return result;
  }

  // 1. Read candidates input.
  let auditInput;
  if (hooks.readCandidatesFn) {
    try { auditInput = hooks.readCandidatesFn(candidatesPath); }
    catch (err) { result.errors.push(`readCandidatesFn failed: ${String(err && err.message || err)}`); }
  } else if (existsSync(candidatesPath)) {
    try {
      const raw = readFileSync(candidatesPath, "utf8");
      auditInput = JSON.parse(raw);
    } catch (err) {
      result.errors.push(`read ${candidatesPath}: ${String(err && err.message || err)}`);
    }
  } else {
    result.errors.push(
      `CLOSE-OUT-CANDIDATES missing: ${candidatesPath} — run audit-close-out-candidates.mjs first`,
    );
  }
  if (!auditInput || typeof auditInput !== "object" || Array.isArray(auditInput)) {
    if (result.errors.length === 0) {
      result.errors.push(`CLOSE-OUT-CANDIDATES is not a JSON object`);
    }
    result.ok = false;
    return result;
  }

  // 2. Staleness check on the candidates file. If audit data is too old,
  // queueing might double-process units a peer has already flipped.
  // Resolve a usable timestamp from generatedAt → fall back to file mtime.
  // A file with no usable timestamp is HARD-FAILED — silently skipping the
  // staleness gate defeats the gate's purpose.
  let genT = NaN;
  if (typeof auditInput.generatedAt === "string") {
    const parsed = Date.parse(auditInput.generatedAt);
    if (Number.isFinite(parsed)) genT = parsed;
  }
  if (!Number.isFinite(genT)) {
    const statFn = hooks.statFn || statSync;
    try { genT = statFn(candidatesPath).mtimeMs; } catch { /* statFn unavailable on injected paths */ }
  }
  if (!Number.isFinite(genT)) {
    result.errors.push(
      `CLOSE-OUT-CANDIDATES has no usable timestamp (generatedAt missing/malformed and stat failed)`,
    );
    result.ok = false;
    return result;
  }
  const ageHrs = (nowMs - genT) / (60 * 60 * 1000);
  if (ageHrs > opts.maxCandidatesAgeHrs) {
    result.errors.push(
      `CLOSE-OUT-CANDIDATES is ${ageHrs.toFixed(1)}h old (max ${opts.maxCandidatesAgeHrs}h) — re-run audit-close-out-candidates.mjs first`,
    );
    result.ok = false;
    return result;
  }

  // 3. Flatten + filter by confidence. The flatten step also surfaces any
  // candidates rejected for charset / path / fromStatus violations.
  const flat = flattenCandidates(auditInput);
  result.summary.totalCandidatesScanned = flat.accepted.length + flat.rejected.length;
  result.rejectedShape = flat.rejected;
  result.summary.rejectedShape = flat.rejected.length;
  const accepted = [];
  for (const c of flat.accepted) {
    if (c.confidence < opts.minConfidence) {
      result.belowConfidence.push({
        milestoneId: c.milestoneId, unitId: c.unitId, confidence: c.confidence,
      });
      continue;
    }
    accepted.push(c);
  }
  result.summary.belowConfidence = result.belowConfidence.length;

  // 4. Read + dedup against existing queue.
  const queue = readQueueDedup(queuePath, hooks);
  result.malformedQueueLines = queue.malformedLines;
  result.summary.malformedQueueLines = queue.malformedLines.length;

  const newEntries = [];
  for (const c of accepted) {
    const key = `${c.milestoneId}|${c.unitId}|${ACTION_FLIP_STATUS}`;
    if (queue.dedupKeys.has(key)) {
      result.skippedExisting.push({ milestoneId: c.milestoneId, unitId: c.unitId });
      continue;
    }
    newEntries.push(buildMutationEntry(c, result.queuedAtIso));
  }
  result.summary.skippedExisting = result.skippedExisting.length;

  // 5. Append to JSONL (unless --dry-run). Path-safety: refuse to write
  // outside opts.repo unless PRISM_AUTO_CLOSE_ALLOW_ABSOLUTE_OUT=1.
  // Use path.relative + realpathSync (where the path exists) for a
  // platform-agnostic + symlink-aware safety check. Case-folded prefix
  // comparison was Windows-only correct and falsely permitted writes that
  // case-collide on POSIX FS.
  if (newEntries.length > 0 && !opts.dryRun) {
    const bypass = process.env.PRISM_AUTO_CLOSE_ALLOW_ABSOLUTE_OUT === "1";
    const realPathOrResolve = (p) => {
      try { return realpathSync(p); } catch { return resolve(p); }
    };
    const realRepo = realPathOrResolve(opts.repo);
    // Check parent dir of the queue (file may not exist yet — realpath on
    // a missing file throws ENOENT, but its parent dir usually exists).
    const realQueueParent = realPathOrResolve(dirname(queuePath));
    const rel = relative(realRepo, realQueueParent);
    const safe = bypass || (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)));
    if (!safe) {
      result.errors.push(`refuse to write outside repo: ${queuePath} (override: PRISM_AUTO_CLOSE_ALLOW_ABSOLUTE_OUT=1)`);
      result.ok = false;
      return result;
    }
    const appendFn = hooks.appendFn || ((p, data) => {
      mkdirSync(dirname(p), { recursive: true });
      appendFileSync(p, data);
    });
    try {
      const payload = newEntries.map((e) => JSON.stringify(e)).join("\n") + "\n";
      appendFn(queuePath, payload);
    } catch (err) {
      result.errors.push(`append ${queuePath}: ${String(err && err.message || err)}`);
      result.ok = false;
      return result;
    }
  }

  // The result keeps the full entry array (operator-visible in --json mode);
  // the on-disk JSONL is one-line-per-entry.
  result.queued = newEntries;
  result.summary.queued = newEntries.length;

  if (result.errors.length > 0) result.ok = false;
  return result;
}

// ─── CLI ─────────────────────────────────────────────────────────────────

function printHelp() {
  process.stdout.write(
    [
      "auto-close-shipped-envelopes.mjs — queue close-out mutations for the main-tree drainer (U-CLEANUP-F2B)",
      "",
      "Usage:",
      "  node scripts/auto-close-shipped-envelopes.mjs                  apply",
      "  node scripts/auto-close-shipped-envelopes.mjs --dry-run        plan only",
      "  node scripts/auto-close-shipped-envelopes.mjs --json           machine-readable",
      "  node scripts/auto-close-shipped-envelopes.mjs --min-confidence 0.9",
      "  node scripts/auto-close-shipped-envelopes.mjs --max-age-hrs 6",
      "  node scripts/auto-close-shipped-envelopes.mjs --candidates X.json --queue Q.jsonl",
      "",
      "Defaults:",
      `  min-confidence:    ${DEFAULT_MIN_CONFIDENCE}`,
      `  max-age-hrs:       ${DEFAULT_MAX_CANDIDATES_AGE_HRS}`,
      `  candidates:        <repo>/${DEFAULT_CANDIDATES_REL}`,
      `  queue:             <repo>/${DEFAULT_QUEUE_REL}`,
      "",
    ].join("\n"),
  );
}

export function run(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    printHelp();
    return 0;
  }
  const result = autoCloseShippedEnvelopes(opts, {});
  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + "\n");
  } else {
    process.stdout.write(`auto-close-shipped-envelopes: ${result.dryRun ? "dry-run" : "apply"}\n`);
    process.stdout.write(`  scanned: ${result.summary.totalCandidatesScanned}\n`);
    if (result.summary.rejectedShape > 0) {
      process.stdout.write(`  ⚠ rejected shape: ${result.summary.rejectedShape} (bad id charset / milestoneFile / fromStatus)\n`);
    }
    process.stdout.write(`  below confidence (${opts.minConfidence}): ${result.summary.belowConfidence}\n`);
    process.stdout.write(`  already queued (skipped): ${result.summary.skippedExisting}\n`);
    process.stdout.write(`  ${result.dryRun ? "would queue" : "queued"}: ${result.summary.queued}\n`);
    if (result.summary.malformedQueueLines > 0) {
      process.stdout.write(`  ⚠ malformed queue lines: ${result.summary.malformedQueueLines}\n`);
    }
    for (const e of result.errors) process.stdout.write(`  ✗ ${e}\n`);
    process.stdout.write(result.ok ? `  ✓ ok${result.dryRun ? " (preview)" : ""}\n` : "  ✗ completed with errors\n");
  }
  return result.ok ? 0 : 1;
}

// Entry guard — exact path equality so a vitest import never execs the CLI.
const _invoked = process.argv[1] ? resolve(process.argv[1]) : "";
const _here = resolve(fileURLToPath(import.meta.url));
if (_invoked !== "" && _invoked === _here) {
  try {
    process.exit(run());
  } catch (err) {
    process.stderr.write(`auto-close-shipped-envelopes: fatal: ${err && err.message || err}\n`);
    process.exit(1);
  }
}

export {
  SCHEMA_VERSION,
  DEFAULT_MIN_CONFIDENCE,
  DEFAULT_MAX_CANDIDATES_AGE_HRS,
  DEFAULT_CANDIDATES_REL,
  DEFAULT_QUEUE_REL,
  ACTION_FLIP_STATUS,
  PROPOSED_STATUS,
  SOURCE_TAG,
  EVIDENCE_MAX_ENTRIES,
  EVIDENCE_MAX_BYTES,
  ALLOWED_FROM_STATUSES,
  ID_CHARSET,
};
