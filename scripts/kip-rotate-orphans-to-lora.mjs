#!/usr/bin/env node
/**
 * kip-rotate-orphans-to-lora.mjs — read the KIP injection + outcome ledgers,
 * extract rotation candidates (orphans + low-help-rate), and write the
 * cross-domain candidate JSONL that LoRA cadence consumers pick from on their
 * next retrain tick.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-KIP03 (2026-05-19).
 *
 * The pure selection math lives in `scripts/lib/kip-lora-rotation.mjs`; this
 * script is the IO half (ledger read + atomic write + summary report).
 *
 * ─── READER CONTRACT (closed-loop) ───────────────────────────────
 *
 * Output is `state/shared/lora-rotation-candidates.jsonl`. Each line is a
 * `RotationCandidate` (see `scripts/lib/kip-lora-rotation.mjs` for the full
 * shape). The reader contract for downstream LoRA cadence consumers
 * (lathe/mill/wedm/cad/grinding LoRAs):
 *
 *   1. Read the JSONL line-by-line; each line is independently parseable.
 *   2. Use `candidate.kind` + `candidate.name` to look up the original asset
 *      in `state/shared/knowledge-injection-ai-registry.json` (the KIP AI
 *      registry, populated by KnowledgeInjectionPipelineEngine.executeInjection's
 *      'prism-ai' binding). The registry carries `domains[]` for domain
 *      routing — the rotation candidate intentionally doesn't duplicate it
 *      so this file stays small and the domain assignment lives in one place.
 *   3. For each candidate whose `domains[]` intersect the consumer's domain,
 *      enqueue the asset into the LoRA's training-candidate queue (mechanism
 *      is per-LoRA; e.g. lathe-lora-cadence-config has `pending_units[]`).
 *   4. Acknowledge consumption by calling
 *      `KnowledgeInjectionPipelineEngine.recordOutcome(injectionId, {
 *         consumedBy: '<lora-engine>', helped: <post-retrain measurement>,
 *         evidence: '<retrain-run-id>'
 *      })` — this closes the loop: the next rotation pass sees the outcome
 *      and decides whether to surface the candidate again (if helped=false
 *      below threshold) or drop it (if helped=true above threshold).
 *
 * R12 fail-loud anti-pattern note: an unread `lora-rotation-candidates.jsonl`
 * is silent dead knowledge. If no downstream LoRA is consuming it yet, the
 * cron should NOT fire — that's a future-unit decision (U-KIP04-LORA-CONSUMER
 * queued). Until then this CLI is producer-only and operator-invoked.
 *
 * Usage:
 *   node scripts/kip-rotate-orphans-to-lora.mjs                  # write candidates
 *   node scripts/kip-rotate-orphans-to-lora.mjs --dry-run        # plan, no write
 *   node scripts/kip-rotate-orphans-to-lora.mjs --threshold 0.7  # custom helpRate threshold
 *   node scripts/kip-rotate-orphans-to-lora.mjs --json           # machine-readable summary
 *   node scripts/kip-rotate-orphans-to-lora.mjs --frozen-time T  # deterministic selectedAt (testing)
 *
 * Outputs:
 *   state/shared/lora-rotation-candidates.jsonl      — cross-domain punch list
 *   state/shared/lora-rotation-summary.json          — last-run summary (atomic)
 *
 * Exit codes:
 *   0  success (including empty candidate list — that's a valid "all healthy")
 *   1  ledger read failure / write failure / bad CLI args
 *
 * Re-runnable cron target — designed for the existing /5min synergy /loop.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractRotationCandidates,
  renderCandidatesJsonl,
} from "./lib/kip-lora-rotation.mjs";
import { atomicWriteJson, atomicWriteText } from "./lib/atomic-json.mjs";

// ─── constants ─────────────────────────────────────────────────────
// Mirrors the KIP engine paths (LEDGER_REL / OUTCOMES_REL in
// KnowledgeInjectionPipelineEngine.ts). Hardcoded with intent — these are
// the canonical cross-process file contracts; an env override would weaken
// the contract.
const LEDGER_REL = "state/shared/knowledge-injection-ledger.jsonl";
const OUTCOMES_REL = "state/shared/knowledge-injection-outcomes.jsonl";
const CANDIDATES_REL = "state/shared/lora-rotation-candidates.jsonl";
const SUMMARY_REL = "state/shared/lora-rotation-summary.json";

const HELP_TEXT = `kip-rotate-orphans-to-lora — KIP closed-loop → LoRA retrain queue

  --dry-run            print what would be written, do not touch disk
  --threshold N        helpRate threshold (default 0.5; range 0..1)
  --min-consume N      min outcomes before low-help-rate counts (default 1)
  --frozen-time T      ISO timestamp for deterministic selectedAt (testing)
  --repo-root PATH     override repo root (default: parent of this script's dir)
  --json               machine-readable summary on stdout (suppresses report)
  -h, --help           this text
`;

// ─── CLI parser (no deps) ──────────────────────────────────────────
/**
 * Parse argv into a typed options bag. Unknown flags throw — R12 fail-loud
 * means a typo in cron config is surfaced immediately, not silently ignored.
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  /** @type {{
   *   help: boolean,
   *   dryRun: boolean,
   *   json: boolean,
   *   threshold: number | undefined,
   *   minConsume: number | undefined,
   *   frozenTime: string | undefined,
   *   repoRoot: string | undefined,
   * }} */
  const out = {
    help: false,
    dryRun: false,
    json: false,
    threshold: undefined,
    minConsume: undefined,
    frozenTime: undefined,
    repoRoot: undefined,
  };
  // Helper: refuse to consume the next argv slot when it looks like another
  // flag (e.g. `--threshold --json` should error out with "missing value",
  // NOT silently consume `--json` as the threshold value). Scrutiny P2-2.
  function takeValue(currentFlag, nextValue) {
    if (nextValue === undefined) {
      throw new Error(`${currentFlag} requires a value`);
    }
    if (nextValue === "") {
      throw new Error(`${currentFlag} requires a value (got empty string)`);
    }
    if (nextValue.startsWith("--") || nextValue === "-h") {
      throw new Error(`${currentFlag} requires a value (got next flag '${nextValue}')`);
    }
    return nextValue;
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") { out.help = true; continue; }
    if (a === "--dry-run") { out.dryRun = true; continue; }
    if (a === "--json") { out.json = true; continue; }
    if (a === "--threshold") {
      const v = takeValue("--threshold", argv[++i]);
      const n = Number.parseFloat(v);
      if (!Number.isFinite(n)) throw new Error(`--threshold requires a number, got ${v}`);
      out.threshold = n;
      continue;
    }
    if (a === "--min-consume") {
      const v = takeValue("--min-consume", argv[++i]);
      // Number.parseInt("2.5") returns 2 (truncates) — we want to REJECT
      // non-integer input, not silently round it. Use Number() which preserves
      // the decimal, then check Number.isInteger. NaN-safe (NaN fails the
      // integer check).
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error(`--min-consume requires a positive integer, got ${v}`);
      }
      out.minConsume = n;
      continue;
    }
    if (a === "--frozen-time") {
      const v = takeValue("--frozen-time", argv[++i]);
      out.frozenTime = v;
      continue;
    }
    if (a === "--repo-root") {
      const v = takeValue("--repo-root", argv[++i]);
      out.repoRoot = v;
      continue;
    }
    throw new Error(`unknown argument: ${a} (use --help)`);
  }
  return out;
}

// ─── ledger reader ─────────────────────────────────────────────────
/**
 * Tolerant JSONL reader — skips malformed lines (multi-chat append races
 * occasionally truncate a final line). Returns [] for a missing file —
 * that's a valid "no data yet" state, not an error.
 *
 * @template T
 * @param {string} path
 * @returns {T[]}
 */
export function readJsonlTolerant(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  /** @type {T[]} */
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(/** @type {T} */ (JSON.parse(t)));
    } catch {
      // corrupt line — silent-skip (multi-chat tail truncation class)
    }
  }
  return out;
}

// `atomicWriteText` is now imported from `./lib/atomic-json.mjs` — the
// canonical PRISM atomic-write lib. The inlined twin that lived here in the
// initial U-KIP03 ship was flagged by per-file scrutiny (P1) as a
// convention-drift against the U-ROADMAP-INDEX-WRITER-CONSOLIDATE doctrine
// (one writer-primitive, not five), and folded back into the lib in the
// same session.

// ─── orchestration ─────────────────────────────────────────────────
/**
 * Pure orchestration: given resolved opts + readers, return what would
 * be written. The IO entry calls `runRotation` then performs the writes.
 * Split this way to make the orchestration hermetically testable.
 *
 * @param {{
 *   injections: import("./lib/kip-lora-rotation.mjs").InjectionRecord[],
 *   outcomes: import("./lib/kip-lora-rotation.mjs").OutcomeRecord[],
 *   threshold: number | undefined,
 *   minConsume: number | undefined,
 *   frozenTime: string | undefined,
 * }} ctx
 */
export function planRotation(ctx) {
  /** @type {import("./lib/kip-lora-rotation.mjs").ExtractOptions} */
  const opts = {};
  if (ctx.threshold !== undefined) opts.helpRateThreshold = ctx.threshold;
  if (ctx.minConsume !== undefined) opts.minConsumeForHelpRate = ctx.minConsume;
  if (ctx.frozenTime !== undefined) opts.frozenTime = ctx.frozenTime;
  const { candidates, summary } = extractRotationCandidates(
    ctx.injections, ctx.outcomes, opts,
  );
  const jsonlBody = renderCandidatesJsonl(candidates);
  return { candidates, summary, jsonlBody };
}

/**
 * Human-readable summary line. Stable shape so consumers can grep.
 * @param {ReturnType<typeof planRotation>['summary']} summary
 * @param {boolean} dryRun
 */
function reportLine(summary, dryRun) {
  const dr = dryRun ? " [DRY-RUN]" : "";
  return (
    `KIP rotation${dr}: ${summary.candidateCount} candidate(s) — ` +
    `${summary.orphanCount} orphan + ${summary.lowHelpRateCount} low-help-rate ` +
    `(${summary.healthyCount} healthy of ${summary.totalInjections} total) | ` +
    `threshold=${summary.thresholds.helpRateThreshold} ` +
    `minConsume=${summary.thresholds.minConsumeForHelpRate}`
  );
}

// ─── main ──────────────────────────────────────────────────────────
/**
 * @param {string[]} argv  argv slice (NOT including node + script)
 * @param {{
 *   readJsonl?: (p: string) => any[],
 *   writeText?: (p: string, body: string) => void,
 *   writeJson?: (p: string, obj: unknown) => void,
 *   stdout?: (line: string) => void,
 *   stderr?: (line: string) => void,
 *   cwd?: string,
 *   scriptDir?: string,
 * }} [io]
 * @returns {{ ok: boolean, exitCode: number, summary?: ReturnType<typeof planRotation>['summary'] }}
 */
export function main(argv, io = {}) {
  const stdout = io.stdout ?? ((s) => process.stdout.write(s + "\n"));
  const stderr = io.stderr ?? ((s) => process.stderr.write(s + "\n"));
  const readJsonl = io.readJsonl ?? readJsonlTolerant;
  const writeText = io.writeText ?? atomicWriteText;
  const writeJson = io.writeJson ?? ((p, obj) => atomicWriteJson(p, obj));

  /** @type {ReturnType<typeof parseArgs>} */
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    stderr(`error: ${err instanceof Error ? err.message : String(err)}`);
    stderr("");
    stderr(HELP_TEXT);
    return { ok: false, exitCode: 1 };
  }

  if (opts.help) {
    stdout(HELP_TEXT);
    return { ok: true, exitCode: 0 };
  }

  // Resolve repoRoot. Default: parent of this script's containing dir
  // (this script is `scripts/kip-rotate-orphans-to-lora.mjs` → repo root is
  // one level up).
  const here = io.scriptDir ?? dirname(fileURLToPath(import.meta.url));
  const repoRoot = opts.repoRoot
    ? resolve(opts.repoRoot)
    : resolve(here, "..");
  // R12 fail-loud: a typoed --repo-root used to be tolerated (the ledger
  // reader silently returned [] for missing files, so rotation reported "0
  // candidates" against the wrong tree). Scrutiny P2-3 fix: existsSync gate
  // surfaces the typo immediately.
  if (opts.repoRoot && !existsSync(repoRoot)) {
    stderr(`--repo-root path does not exist: ${repoRoot}`);
    return { ok: false, exitCode: 1 };
  }
  const ledgerPath = resolve(repoRoot, LEDGER_REL);
  const outcomesPath = resolve(repoRoot, OUTCOMES_REL);
  const candidatesPath = resolve(repoRoot, CANDIDATES_REL);
  const summaryPath = resolve(repoRoot, SUMMARY_REL);

  /** @type {import("./lib/kip-lora-rotation.mjs").InjectionRecord[]} */
  let injections;
  /** @type {import("./lib/kip-lora-rotation.mjs").OutcomeRecord[]} */
  let outcomes;
  try {
    injections = readJsonl(ledgerPath);
    outcomes = readJsonl(outcomesPath);
  } catch (err) {
    stderr(`ledger read failed: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, exitCode: 1 };
  }

  /** @type {ReturnType<typeof planRotation>} */
  let plan;
  try {
    plan = planRotation({
      injections, outcomes,
      threshold: opts.threshold,
      minConsume: opts.minConsume,
      frozenTime: opts.frozenTime,
    });
  } catch (err) {
    stderr(`extractRotationCandidates failed: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, exitCode: 1 };
  }

  if (!opts.dryRun) {
    try {
      writeText(candidatesPath, plan.jsonlBody);
      writeJson(summaryPath, plan.summary);
    } catch (err) {
      stderr(`write failed: ${err instanceof Error ? err.message : String(err)}`);
      return { ok: false, exitCode: 1 };
    }
  }

  if (opts.json) {
    stdout(JSON.stringify({
      ok: true,
      dryRun: opts.dryRun,
      ledgerPath, outcomesPath, candidatesPath, summaryPath,
      summary: plan.summary,
    }));
  } else {
    stdout(reportLine(plan.summary, opts.dryRun));
    if (!opts.dryRun && plan.candidates.length > 0) {
      stdout(`  → wrote ${candidatesPath}`);
      stdout(`  → wrote ${summaryPath}`);
    } else if (opts.dryRun) {
      stdout(`  (would write ${plan.candidates.length} candidate(s) to ${candidatesPath})`);
    }
  }

  return { ok: true, exitCode: 0, summary: plan.summary };
}

// ─── direct-invocation guard ───────────────────────────────────────
// Only run when invoked as `node scripts/kip-rotate-orphans-to-lora.mjs` —
// importers (tests, other scripts) get the named exports without side
// effects. The fileURLToPath comparison handles Windows path casing
// differences via resolve() normalization.
if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1] ?? "")) {
  const result = main(process.argv.slice(2));
  process.exit(result.exitCode);
}
