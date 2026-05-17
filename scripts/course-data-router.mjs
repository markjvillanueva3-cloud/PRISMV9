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

const DEFAULT_STUBS_PATH = resolve(REPO_ROOT, "state/shared/specs/COURSE-FORGE-STUBS.md");

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
    emit: null,
    minRelevance: 0,
    outStubs: DEFAULT_STUBS_PATH,
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
    else if (a === "--emit") out.emit = next();
    else if (a === "--min-relevance") out.minRelevance = Number(next());
    else if (a === "--out-stubs") out.outStubs = resolve(next());
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: course-data-router.mjs [--frozen-time T] [--json] [--dry-run]\n" +
          "                              [--candidates PATH] [--out-json PATH] [--out-md PATH]\n" +
          "                              [--emit forge-stubs] [--min-relevance N] [--out-stubs PATH]\n" +
          "\n" +
          "Modes:\n" +
          "  (default)              emit COURSE-DATA-ROUTING-LEDGER.{json,md}\n" +
          "  --emit forge-stubs     emit COURSE-FORGE-STUBS.md (proposal-stub bundle for /forge)\n" +
          "  --min-relevance N      filter stubs to mfg_relevance >= N (default 0)",
      );
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (out.emit !== null && out.emit !== "forge-stubs") {
    console.error(`unknown --emit value: ${out.emit} (supported: forge-stubs)`);
    process.exit(2);
  }
  if (!Number.isFinite(out.minRelevance) || out.minRelevance < 0 || out.minRelevance > 1) {
    console.error(`--min-relevance must be a number in [0,1], got: ${out.minRelevance}`);
    process.exit(2);
  }
  return out;
}

function toPascalCase(slug) {
  return String(slug || "")
    .split(/[-_\s.]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}

const REJECTED_NAMES = new Set([
  "solidworks",
  "mastercam",
  "hypermill",
  "esprit",
  "inventor",
  "fusion360",
  "fusion-360",
  "cam-path-optimization",
  "toolpath-optimization",
]);

function proposeStubFor(courseId, courseTitle, courseRelevance, dec, inv) {
  const kind = dec.kind;
  const name = dec.name;
  const lcName = String(name).toLowerCase();
  const pascal = toPascalCase(name);
  const domains = (dec.domains || []).join(", ") || "(unscored)";
  const rejected = REJECTED_NAMES.has(lcName);
  const physicsGate = kind === "formula" ? "required" : "not required";

  let proposedPath = dec.targetSurface || "";
  let dispatcherAction = "(operator-select)";
  if (kind === "algorithm") {
    proposedPath = `mcp-server/src/algorithms/${pascal}.ts`;
    dispatcherAction = "prism_calc:<action> OR prism_intelligence:<action>";
  } else if (kind === "engine") {
    const enginePascal = pascal.endsWith("Engine") ? pascal : `${pascal}Engine`;
    proposedPath = `mcp-server/src/engines/${enginePascal}.ts`;
    dispatcherAction = "(operator-select existing dispatcher)";
  } else if (kind === "formula") {
    proposedPath = `mcp-server/src/physics/constants.ts + prism_calc:<action>`;
    dispatcherAction = "prism_calc:<action> (constants ALWAYS in physics/constants.ts)";
  }

  const dupHits = [];
  const inventoryAll = [...(inv.algorithms || []), ...(inv.engines || [])];
  const needle = pascal.toLowerCase();
  for (const file of inventoryAll) {
    const lc = file.toLowerCase();
    if (lc.includes(needle) || (needle.length >= 5 && lc.includes(needle.slice(0, -1)))) {
      dupHits.push(file);
      if (dupHits.length >= 3) break;
    }
  }
  const dedup = rejected
    ? `**REJECT** — name matches first-party PRISM stack (no forge)`
    : dupHits.length > 0
      ? `**REVIEW** — name-similarity hits: ${dupHits.join(", ")}`
      : `CLEAR (no name-match in algorithms/ or engines/)`;

  return {
    courseId,
    courseTitle,
    kind,
    name,
    pascal,
    mfgRelevance: courseRelevance,
    domains,
    proposedPath,
    dispatcherAction,
    physicsGate,
    dedup,
    rejected,
    action: rejected ? "REJECT (reclassify TRIBAL-SHIPPED)" : `/forge-triple ${kind}:${name}`,
  };
}

function buildForgeStubs(ledger, inv, minRelevance) {
  const stubs = [];
  for (const item of ledger.items) {
    if ((item.mfgRelevance || 0) < minRelevance) continue;
    for (const dec of item.decisions || []) {
      if (dec.decision !== "FORGE-QUEUE") continue;
      stubs.push(proposeStubFor(item.courseId, item.courseTitle, item.mfgRelevance, dec, inv));
    }
  }
  stubs.sort((a, b) => (b.mfgRelevance || 0) - (a.mfgRelevance || 0) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  return stubs;
}

function renderForgeStubs(ledger, stubs, opts) {
  const lines = [];
  const ts = ledger.generatedAt;
  lines.push("# COURSE-FORGE-STUBS — auto-emitted /forge proposal bundle");
  lines.push("");
  lines.push(`**Generator:** ${ledger.generator} (\`--emit forge-stubs\`)`);
  lines.push(`**Generated:** ${ts}`);
  lines.push(`**Source:** \`state/shared/specs/COURSE-DATA-ROUTING-LEDGER.json\` (${ledger.summary.forgeQueueCount} FORGE-QUEUE items, ${ledger.summary.candidateCount} courses)`);
  lines.push(`**Filter:** \`mfg_relevance >= ${opts.minRelevance}\` → ${stubs.length} stubs surfaced`);
  lines.push(`**Status:** advisory · mustHumanVerify · NOT auto-build`);
  lines.push("");
  lines.push("> Per `state/shared/specs/COURSE-FORGE-PROPOSALS.md` (P1-P10 hand-curated) + Lane C policy:");
  lines.push("> every entry below requires operator review + `duplicationGuardEngine.mustCheckBeforeCreating()`");
  lines.push("> + (for formulas) `physics-reviewer` agent PASS before `/forge-triple` invocation.");
  lines.push("");
  lines.push("## Hard gates (do NOT bypass)");
  lines.push("");
  lines.push("- `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS on dup at /forge time.");
  lines.push("- Formula stubs: physics-reviewer PASS REQUIRED; constants land in `src/physics/constants.ts` only.");
  lines.push("- Tier-1 CAM bridges (Mastercam, hyperMILL, Esprit, Fusion 360, Inventor HSM, SolidWorks) auto-REJECTED.");
  lines.push("- Course-derived intent ≠ production-validated. The course is the IDEA source; PRISM convention + JM Die data is the VALIDATION source.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Stubs");
  lines.push("");
  let n = 0;
  for (const s of stubs) {
    n += 1;
    const title = `${s.kind}:${s.name}`;
    const ctx = `${s.courseId} / "${s.courseTitle}"`;
    lines.push(`### #${n} ${title} (${ctx})`);
    lines.push("");
    lines.push(`- **mfg_relevance:** ${s.mfgRelevance != null ? s.mfgRelevance.toFixed(2) : "?"}`);
    lines.push(`- **domains:** ${s.domains}`);
    lines.push(`- **proposed_path:** \`${s.proposedPath}\``);
    lines.push(`- **dispatcher_action:** \`${s.dispatcherAction}\``);
    lines.push(`- **physics_gate:** ${s.physicsGate}`);
    lines.push(`- **dedup_preflight:** ${s.dedup}`);
    lines.push(`- **action:** \`${s.action}\``);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("## Re-run");
  lines.push("");
  lines.push("```bash");
  lines.push("node scripts/course-data-router.mjs --emit forge-stubs --min-relevance 0.6");
  lines.push("node scripts/course-data-router.mjs --emit forge-stubs --min-relevance 0.8  # top tier only");
  lines.push("```");
  lines.push("");
  lines.push("## Related");
  lines.push("");
  lines.push("- `state/shared/specs/COURSE-FORGE-PROPOSALS.md` — hand-curated P1-P10 (companion doc)");
  lines.push("- `state/shared/specs/COURSE-DATA-ROUTING-LEDGER.{json,md}` — full inventory");
  lines.push("- `state/shared/specs/COURSE-DATA-ROUTING-PIPELINE.md` — 3-lane policy doctrine");
  lines.push("- `mcp-server/src/engines/DuplicationGuardEngine.ts` — pre-create gate (THROWS on dup)");
  return lines.join("\n");
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

  if (args.emit === "forge-stubs") {
    const stubs = buildForgeStubs(ledger, { algorithms, engines }, args.minRelevance);
    if (args.json) {
      process.stdout.write(JSON.stringify({ generatedAt: ledger.generatedAt, minRelevance: args.minRelevance, count: stubs.length, stubs }, null, 2));
      process.stdout.write("\n");
      return;
    }
    if (args.dryRun) {
      console.log(`[dry-run] would write ${args.outStubs}`);
      console.log(`[dry-run] stubs=${stubs.length} (filter mfg_relevance >= ${args.minRelevance})`);
      return;
    }
    mkdirSync(dirname(args.outStubs), { recursive: true });
    writeFileSync(args.outStubs, renderForgeStubs(ledger, stubs, { minRelevance: args.minRelevance }) + "\n");
    console.log(`✓ wrote ${args.outStubs}`);
    console.log(`stubs: ${stubs.length} (filter mfg_relevance >= ${args.minRelevance})`);
    return;
  }

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
