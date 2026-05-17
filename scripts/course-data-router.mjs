#!/usr/bin/env node
// course-data-router.mjs — CLI that routes course-content-candidates through
// the pure router lib and emits an advisory ledger.
//
// Strictly additive over Phase 1 (Lane A tribal-tip emit, already shipped).
// This is the U-KC-D1 entry from KNOWLEDGE-CONVERSION-MS0 — the Lane C
// formalization layer: per-asset routing decisions feed /forge queue (human-
// gated) and the physics-reviewer agent (for formulas).
//
// Usage:
//   node scripts/course-data-router.mjs                    # run with defaults
//   node scripts/course-data-router.mjs --frozen-time T    # deterministic out
//   node scripts/course-data-router.mjs --json             # print JSON to stdout
//   node scripts/course-data-router.mjs --candidates PATH  # custom input
//   node scripts/course-data-router.mjs --dry-run          # don't write files
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLedger, DECISIONS } from "./lib/course-data-router-lib.mjs";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const DEFAULTS = Object.freeze({
  candidatesPath: resolve(REPO_ROOT, "state/shared/tribal-graph/course-content-candidates.jsonl"),
  algorithmsDir: resolve(REPO_ROOT, "mcp-server/src/algorithms"),
  enginesDir: resolve(REPO_ROOT, "mcp-server/src/engines"),
  outJson: resolve(REPO_ROOT, "state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json"),
  outMd: resolve(REPO_ROOT, "state/shared/specs/COURSE-DATA-ROUTING-LEDGER.md"),
});

function parseArgs(argv) {
  const out = {
    frozenTime: null,
    json: false,
    dryRun: false,
    candidatesPath: DEFAULTS.candidatesPath,
    algorithmsDir: DEFAULTS.algorithmsDir,
    enginesDir: DEFAULTS.enginesDir,
    outJson: DEFAULTS.outJson,
    outMd: DEFAULTS.outMd,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--frozen-time") out.frozenTime = next();
    else if (a === "--json") out.json = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--candidates") out.candidatesPath = resolve(next());
    else if (a === "--out-json") out.outJson = resolve(next());
    else if (a === "--out-md") out.outMd = resolve(next());
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: course-data-router.mjs [--frozen-time T] [--json] [--dry-run] [--candidates PATH]",
      );
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function readCandidates(path) {
  if (!existsSync(path)) {
    console.error(`ERROR: candidates file not found: ${path}`);
    process.exit(3);
  }
  const raw = readFileSync(path, "utf8");
  const lines = raw.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch (e) {
      console.error(`WARN: skipping malformed line: ${e.message}`);
    }
  }
  return out;
}

function readInventoryNames(dir) {
  // Pure name list — strip extension only, keep file-name casing (the lib
  // normalizes via its own CamelCase splitter; we don't pre-mangle).
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"))
    .map((f) => f.replace(/\.ts$/, ""));
}

function renderMarkdown(ledger) {
  const s = ledger.summary;
  const lines = [];
  lines.push("# Course-Data Routing Ledger (U-KC-D1)");
  lines.push("");
  lines.push(`**Generator:** ${ledger.generator}`);
  lines.push(`**Generated:** ${ledger.generatedAt}`);
  lines.push(`**Schema:** ${ledger.schemaVersion}`);
  lines.push(`**Advisory:** \`advisoryOnly: ${ledger.advisoryOnly}\` · \`mustHumanVerify: ${ledger.mustHumanVerify}\``);
  lines.push("");
  lines.push("## Caveat");
  lines.push("");
  lines.push("> " + ledger.caveat);
  lines.push("");
  lines.push("## Inventory");
  lines.push("");
  lines.push(`- Algorithms scanned: ${ledger.inventory.algorithmCount}`);
  lines.push(`- Engines scanned: ${ledger.inventory.engineCount}`);
  lines.push("");
  lines.push("## Thresholds");
  lines.push("");
  for (const [k, v] of Object.entries(ledger.thresholds)) {
    lines.push(`- \`${k}\`: ${v}`);
  }
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Candidates:** ${s.candidateCount}`);
  lines.push(`- **Assets routed:** ${s.assetCount}`);
  lines.push("");
  lines.push("### By decision");
  lines.push("");
  for (const d of DECISIONS) {
    const n = s.byDecision[d] || 0;
    if (n > 0) lines.push(`- **${d}**: ${n}`);
  }
  lines.push("");
  lines.push("### By node-type");
  lines.push("");
  for (const [k, v] of Object.entries(s.byNodeType)) {
    if (v > 0) lines.push(`- **${k}**: ${v}`);
  }
  lines.push("");
  lines.push("### By lane");
  lines.push("");
  lines.push(`- **Lane A** (direct-wire autonomous): ${s.byLane.A}`);
  lines.push(`- **Lane B** (port semi-autonomous): ${s.byLane.B}`);
  lines.push(`- **Lane C** (forge human-gated): ${s.byLane.C}`);
  lines.push(`- **No lane** (DISCARD): ${s.byLane.none}`);
  lines.push("");
  lines.push("## Forge-queue items (Lane C — recommended actions)");
  lines.push("");
  const forgeItems = [];
  for (const item of ledger.items) {
    for (const d of item.decisions) {
      if (d.decision === "FORGE-QUEUE") {
        forgeItems.push({ courseId: item.courseId, courseTitle: item.courseTitle, ...d });
      }
    }
  }
  if (forgeItems.length === 0) {
    lines.push("_(none — all assets routed to TRIBAL-SHIPPED / DUPLICATE / DISCARD)_");
  } else {
    lines.push("| Course | Asset | Kind | Lane | Recommended Action |");
    lines.push("|--------|-------|------|------|--------------------|");
    for (const f of forgeItems) {
      lines.push(
        `| ${f.courseId || "?"} | ${f.name} | ${f.kind} | ${f.lane} | ${f.recommendedAction} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Duplicate hits (Lane B — verify scope match)");
  lines.push("");
  const dupItems = [];
  for (const item of ledger.items) {
    for (const d of item.decisions) {
      if (d.decision === "DUPLICATE") {
        dupItems.push({ courseId: item.courseId, ...d });
      }
    }
  }
  if (dupItems.length === 0) {
    lines.push("_(none)_");
  } else {
    lines.push("| Course | Course asset | PRISM file | Score |");
    lines.push("|--------|---------------|------------|-------|");
    for (const d of dupItems) {
      lines.push(
        `| ${d.courseId || "?"} | ${d.kind}:${d.name} | ${d.prismMatch.file} | ${d.prismMatch.score.toFixed(2)} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Re-run");
  lines.push("");
  lines.push("```bash");
  lines.push("node scripts/course-data-router.mjs");
  lines.push("# or deterministic for diffs:");
  lines.push("node scripts/course-data-router.mjs --frozen-time 2026-05-17T00:00:00Z");
  lines.push("```");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  const candidates = readCandidates(args.candidatesPath);
  const algorithms = readInventoryNames(args.algorithmsDir);
  const engines = readInventoryNames(args.enginesDir);
  const ledger = buildLedger(
    candidates,
    { algorithms, engines },
    { frozenTime: args.frozenTime },
  );

  if (args.json) {
    process.stdout.write(JSON.stringify(ledger, null, 2));
    process.stdout.write("\n");
    return;
  }

  if (args.dryRun) {
    console.log(`[dry-run] would write ${args.outJson} and ${args.outMd}`);
    console.log(`[dry-run] candidates=${candidates.length} assets=${ledger.summary.assetCount} forge=${ledger.summary.forgeQueueCount} dup=${ledger.summary.duplicateCount}`);
    return;
  }

  mkdirSync(dirname(args.outJson), { recursive: true });
  writeFileSync(args.outJson, JSON.stringify(ledger, null, 2) + "\n");
  writeFileSync(args.outMd, renderMarkdown(ledger) + "\n");
  console.log(`✓ wrote ${args.outJson}`);
  console.log(`✓ wrote ${args.outMd}`);
  console.log(
    `summary: ${ledger.summary.candidateCount} candidates · ${ledger.summary.assetCount} assets routed · ` +
      `forge-queue=${ledger.summary.forgeQueueCount} dup=${ledger.summary.duplicateCount} ` +
      `tribal-shipped=${ledger.summary.tribalShippedCount} discard=${ledger.summary.discardCount}`,
  );
}

void main().catch((err) => {
  console.error("course-data-router failed:", err);
  process.exit(1);
});
