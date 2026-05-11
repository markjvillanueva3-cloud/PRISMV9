#!/usr/bin/env node
/**
 * audit-round-aggregate.mjs — Re-runnable multi-round aggregator.
 *
 * Consumes per-agent findings JSON files emitted by parallel review subagents.
 * Emits round{N}-aggregate.{json,md} with cross-finding counts, severity rollup,
 * verdict consensus, and top blockers by frequency.
 *
 * Designed for the 5-round revenue-roadmap scrutiny cadence (claude-99eca613)
 * but generic over any audit-findings/<scope>/round{N}/ directory.
 *
 * Usage:
 *   node scripts/audit-round-aggregate.mjs --round 2 [--scope revenue-roadmap] [--json]
 *
 * Re-run is idempotent; safe to call multiple times per round as agents trickle in.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SEVERITY_RANK = { BLOCKER: 3, MAJOR: 2, MINOR: 1, CRITICAL: 3, HIGH: 2, MEDIUM: 2, LOW: 1 };
const VERDICT_RANK  = { FAIL: 0, "PASS-WITH-CHANGES": 1, PASS: 2, INSUFFICIENT_FOR_GO_LIVE: 0, PARTIAL: 1 };

// Tuned aggregator constants (extracted per hook guidance)
const MAX_AGENTS_PER_ROUND   = 10;
const AGENT_FILE_NUM_WIDTH   = 2;     // 01-, 02-, ... 10-
const VERDICT_RANK_FALLBACK  = 99;
const EVIDENCE_TRUNCATE      = 200;
const FIX_TRUNCATE           = 200;
const MAJORS_SAMPLE_LIMIT    = 10;
const BLOCKER_SEV_THRESHOLD  = 3;
const MAJOR_SEV_THRESHOLD    = 2;

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
    return acc;
  }, [])
);
const ROUND = String(args.round ?? "2");
const SCOPE = String(args.scope ?? "revenue-roadmap");
const JSON_ONLY = args.json === true;

const DIR = path.join(ROOT, "state/shared/audit-findings", SCOPE, `round${ROUND}`);
if (!fs.existsSync(DIR)) {
  process.stderr.write(`No round directory: ${DIR}\n`);
  process.exit(2);
}

const allFiles = fs.readdirSync(DIR).filter(f => f.endsWith(".json") && !f.startsWith("00-") && !f.startsWith("round"));
const agents = [];
const missing = [];
for (let n = 1; n <= MAX_AGENTS_PER_ROUND; n++) {
  const match = allFiles.find(f => f.match(new RegExp(`^${String(n).padStart(AGENT_FILE_NUM_WIDTH, "0")}-`)));
  if (!match) { missing.push(n); continue; }
  try {
    const body = JSON.parse(fs.readFileSync(path.join(DIR, match), "utf8"));
    agents.push({ n, file: match, body });
  } catch (e) {
    missing.push(n);
    process.stderr.write(`parse fail ${match}: ${e.message}\n`);
  }
}

// === Severity + verdict rollup ===
let totalBlockers = 0, totalMajors = 0, totalMinors = 0;
const verdictCounts = {};
const findingsByCategory = {};
const findingsBySeverity = { BLOCKER: [], MAJOR: [], MINOR: [] };
const findingsByAgent = {};

for (const a of agents) {
  const s = a.body.summary ?? {};
  totalBlockers += s.blockers ?? 0;
  totalMajors   += s.majors   ?? 0;
  totalMinors   += s.minors   ?? 0;
  verdictCounts[s.verdict ?? "UNKNOWN"] = (verdictCounts[s.verdict ?? "UNKNOWN"] ?? 0) + 1;
  findingsByAgent[a.n] = (a.body.findings ?? []).length;

  for (const f of a.body.findings ?? []) {
    const sev = (f.severity ?? "MINOR").toUpperCase();
    const bucket = SEVERITY_RANK[sev] >= BLOCKER_SEV_THRESHOLD ? "BLOCKER" : SEVERITY_RANK[sev] >= MAJOR_SEV_THRESHOLD ? "MAJOR" : "MINOR";
    findingsBySeverity[bucket].push({ agent: a.n, id: f.id, title: f.title, evidence: f.evidence?.slice?.(0, EVIDENCE_TRUNCATE) ?? "", fix: f.fix?.slice?.(0, FIX_TRUNCATE) ?? "" });

    const cat = f.category ?? "uncategorized";
    findingsByCategory[cat] = (findingsByCategory[cat] ?? 0) + 1;
  }
}

// === Consensus signal ===
const worstVerdict = Object.entries(verdictCounts).sort(([a], [b]) => (VERDICT_RANK[a] ?? VERDICT_RANK_FALLBACK) - (VERDICT_RANK[b] ?? VERDICT_RANK_FALLBACK))[0]?.[0] ?? "UNKNOWN";

// === Output ===
const out = {
  schemaVersion: "1.0.0",
  scope: SCOPE,
  round: Number(ROUND),
  generated_at: new Date().toISOString(),
  agents_responded: agents.length,
  agents_missing: missing,
  total_findings: findingsBySeverity.BLOCKER.length + findingsBySeverity.MAJOR.length + findingsBySeverity.MINOR.length,
  severity_rollup: {
    blockers: findingsBySeverity.BLOCKER.length,
    majors:   findingsBySeverity.MAJOR.length,
    minors:   findingsBySeverity.MINOR.length,
  },
  by_category: findingsByCategory,
  findings_per_agent: findingsByAgent,
  verdict_distribution: verdictCounts,
  consensus_verdict: worstVerdict,
  blockers: findingsBySeverity.BLOCKER,
  majors_count: findingsBySeverity.MAJOR.length,
  // sample of majors (top 10 to keep file small)
  majors_sample: findingsBySeverity.MAJOR.slice(0, MAJORS_SAMPLE_LIMIT),
};

process.stdout.write(JSON.stringify(out, null, 2) + "\n");

if (!JSON_ONLY) {
  fs.writeFileSync(path.join(DIR, `round${ROUND}-aggregate.json`), JSON.stringify(out, null, 2) + "\n");

  const md = [
    `# ${SCOPE} round ${ROUND} aggregate`,
    "",
    `**Generated:** ${out.generated_at}`,
    `**Agents responded:** ${agents.length}/10  ·  **Missing:** ${missing.length ? missing.join(",") : "none"}`,
    `**Consensus verdict:** ${worstVerdict}`,
    "",
    "## Severity rollup",
    `- BLOCKER: ${out.severity_rollup.blockers}`,
    `- MAJOR:   ${out.severity_rollup.majors}`,
    `- MINOR:   ${out.severity_rollup.minors}`,
    "",
    "## Verdict distribution",
    ...Object.entries(verdictCounts).map(([v, n]) => `- ${v}: ${n}`),
    "",
    "## Findings by category",
    ...Object.entries(findingsByCategory).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}: ${n}`),
    "",
    "## Blockers (full list)",
    findingsBySeverity.BLOCKER.length === 0
      ? "_none_"
      : findingsBySeverity.BLOCKER.map(b => `- **${b.id}** (agent ${b.agent}): ${b.title}\n  - Evidence: \`${b.evidence}\`\n  - Fix: ${b.fix}`).join("\n"),
    "",
    "## Top 10 majors",
    findingsBySeverity.MAJOR.slice(0, MAJORS_SAMPLE_LIMIT).map(m => `- **${m.id}** (agent ${m.agent}): ${m.title}`).join("\n"),
    "",
    `_Regenerate: \`node scripts/audit-round-aggregate.mjs --round ${ROUND} --scope ${SCOPE}\`_`,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(DIR, `round${ROUND}-aggregate.md`), md);
}
