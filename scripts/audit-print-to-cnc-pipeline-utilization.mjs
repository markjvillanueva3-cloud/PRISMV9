#!/usr/bin/env node
/**
 * audit-print-to-cnc-pipeline-utilization.mjs
 *
 * GAP-SYNERGY-AUDIT (foxtrot iter18) — per-domain pipeline utilization audit
 *
 * Quantifies how thoroughly each domain pipeline composes the available PSN
 * engine surface. For each known print-to-program pipeline:
 *
 *   1. Extract referenced engine imports + lazy-import patterns from the pipeline source.
 *   2. Cross-reference against the full engine inventory (mcp-server/src/engines/*.ts).
 *   3. Report:
 *      - utilization_pct  = referenced_engines / domain-relevant-engines
 *      - missing_engines  = domain-relevant engines NOT referenced (synergy gaps)
 *      - referenced       = engines composed by this pipeline today
 *
 * Output:
 *   state/shared/PIPELINE-UTILIZATION-AUDIT-2026-05-23.json
 *   state/shared/PIPELINE-UTILIZATION-AUDIT-2026-05-23.md
 *
 * Pure heuristic — string-grep on engine names. Advisory only; the synthesis
 * doc names which engines SHOULD be added per domain pipeline (synergy
 * recommendations). Operator must verify before adding.
 *
 * @module audit-print-to-cnc-pipeline-utilization
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.cwd());
const ENGINES_DIR = join(ROOT, "mcp-server", "src", "engines");
const OUT_DIR = join(ROOT, "state", "shared");

// ── Domain pipeline registry ──────────────────────────────────────────────
const PIPELINES = [
  { domain: "mill",       file: "PrintToProgramPipelineEngine.ts",     keywords: ["mill", "machining", "cutting", "force", "chatter", "thermal", "fixture", "speed", "feed", "toolpath", "post", "gcode", "tolerance", "deflection", "wear", "surface", "stability", "safety", "metrology", "kienzle", "taylor"] },
  { domain: "lathe",      file: "TurningPrintToProgramEngine.ts",       keywords: ["lathe", "turning", "thread", "groove", "chuck", "tailstock", "post", "okuma", "fanuc", "speed", "feed", "force", "wear", "toolpath", "deflection"] },
  { domain: "wire-edm",   file: "WireEDMAIPrintToProgramEngine.ts",     keywords: ["edm", "wedm", "wire", "spark", "dielectric", "flush", "post", "controller", "speed", "feed", "surface", "tolerance", "psn"] },
  { domain: "wire-edm-v1",file: "WEDMPrintToProgramEngine.ts",          keywords: ["edm", "wedm", "wire", "spark", "post", "controller"] },
  { domain: "sinker-edm", file: "SinkerEDMPrintToProgramEngine.ts",     keywords: ["edm", "sinker", "electrode", "spark", "flush"] },
  { domain: "design-to-floor", file: "DesignToFloorPipelineEngine.ts",  keywords: ["cad", "cam", "dfm", "fixture", "quote", "schedule", "shop", "post", "metrology", "spc"] },
  { domain: "end-to-end", file: "EndToEndPipelineEngine.ts",            keywords: ["pipeline", "orchestrate", "validate", "post", "simulate", "metrology"] },
  { domain: "adaptive",   file: "AdaptivePipelineGeneratorEngine.ts",   keywords: ["adaptive", "learn", "feedback", "ai", "neural", "ml"] },
  { domain: "dfm",        file: "DFMPipelineEngine.ts",                  keywords: ["dfm", "manufacturability", "tolerance", "gdt", "cost", "fixture"] },
  { domain: "post",       file: "PostProcessorPipelineEngine.ts",        keywords: ["post", "gcode", "controller", "macro", "fanuc", "okuma", "haas", "mazak"] },
];

// ── Extract engine class names from filesystem ────────────────────────────
function listEngineClasses() {
  const files = readdirSync(ENGINES_DIR).filter(f => f.endsWith(".ts") && f.endsWith("Engine.ts"));
  const classes = new Set();
  for (const f of files) {
    // Engine class name = filename without .ts (PascalCaseEngine)
    classes.add(f.replace(/\.ts$/, ""));
  }
  return classes;
}

function loadPipelineSource(file) {
  const path = join(ENGINES_DIR, file);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

// ── Heuristic: count engine references in pipeline source ────────────────
function referencedEngines(src, allEngines) {
  if (!src) return [];
  const found = [];
  for (const eng of allEngines) {
    // Match the class name as identifier (PascalCase token boundary)
    const re = new RegExp(`\\b${eng}\\b`);
    if (re.test(src)) found.push(eng);
  }
  return found.sort();
}

// ── Heuristic: domain-relevant engines (filename keyword overlap) ────────
function domainRelevantEngines(allEngines, keywords) {
  const result = new Set();
  for (const eng of allEngines) {
    const lower = eng.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        result.add(eng);
        break;
      }
    }
  }
  return result;
}

// ── Audit per-pipeline ────────────────────────────────────────────────────
function auditPipeline(pl, allEngines) {
  const src = loadPipelineSource(pl.file);
  if (!src) {
    return { domain: pl.domain, file: pl.file, status: "missing", utilization_pct: 0, referenced: [], missing: [], total_domain: 0 };
  }
  const referenced = referencedEngines(src, allEngines);
  const relevant = domainRelevantEngines(allEngines, pl.keywords);
  const referencedSet = new Set(referenced);
  const missing = [...relevant].filter(e => !referencedSet.has(e)).sort();
  const utilizationPct = relevant.size > 0
    ? Math.round((referenced.filter(e => relevant.has(e)).length / relevant.size) * 1000) / 10
    : 0;
  return {
    domain: pl.domain,
    file: pl.file,
    size_bytes: src.length,
    status: "audited",
    total_domain_engines: relevant.size,
    referenced_count: referenced.length,
    referenced_in_domain: referenced.filter(e => relevant.has(e)).length,
    utilization_pct: utilizationPct,
    referenced: referenced.slice(0, 40),
    missing: missing.slice(0, 30),
    missing_count: missing.length,
  };
}

// ── Renderers ─────────────────────────────────────────────────────────────
function renderMarkdown(audit) {
  const lines = [
    "# Print-to-CNC Pipeline Utilization Audit — 2026-05-23",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total engines on disk: ${audit.total_engines}`,
    `Pipelines audited: ${audit.pipelines.length}`,
    "",
    "## Per-pipeline utilization summary",
    "",
    "| Domain | Pipeline file | Domain engines | Referenced | Util % | Missing (synergy gap) |",
    "|---|---|---:|---:|---:|---:|",
  ];
  for (const p of audit.pipelines) {
    if (p.status === "missing") {
      lines.push(`| ${p.domain} | ${p.file} | — | — | — | MISSING FILE |`);
      continue;
    }
    lines.push(`| ${p.domain} | ${p.file} | ${p.total_domain_engines} | ${p.referenced_in_domain} | ${p.utilization_pct}% | ${p.missing_count} |`);
  }
  lines.push("");
  lines.push("## Top synergy gaps per domain (engines available but NOT referenced)");
  lines.push("");
  for (const p of audit.pipelines) {
    if (p.status === "missing") continue;
    lines.push(`### ${p.domain} (utilization ${p.utilization_pct}%, ${p.missing_count} gaps)`);
    lines.push("");
    if (p.missing.length === 0) {
      lines.push("No domain-relevant engines missing from this pipeline.");
    } else {
      const top = p.missing.slice(0, 15);
      for (const m of top) lines.push(`- \`${m}\``);
      if (p.missing.length > 15) {
        lines.push(`- _...+${p.missing.length - 15} more_`);
      }
    }
    lines.push("");
  }
  lines.push("## Interpretation");
  lines.push("");
  lines.push("- **utilization_pct** = (engines this pipeline references) / (domain-relevant engines on disk).");
  lines.push("- A gap is **not necessarily a bug** — many engines are intentionally orchestrated by SIBLING pipelines (e.g. post-processor engines live in `PostProcessorPipelineEngine`, not in `PrintToProgramPipelineEngine`).");
  lines.push("- Gaps DO indicate synergy opportunities: an engine in the gap list COULD be composed into the pipeline if its capability is relevant.");
  lines.push("- Heuristic: filename keyword overlap. False-positive gaps possible. Operator must verify before adding new pipeline composition.");
  lines.push("");
  lines.push("Companion: `print-to-cnc-pipeline-utilization-audit-2026-05-23.md` — synthesis + per-domain synergy recommendations.");
  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────
function main() {
  const allEngines = [...listEngineClasses()];
  const audited = PIPELINES.map(pl => auditPipeline(pl, allEngines));
  const audit = {
    schemaVersion: "1.0.0",
    generated_at: new Date().toISOString(),
    total_engines: allEngines.length,
    pipelines: audited,
  };

  if (!existsSync(OUT_DIR)) {
    console.error(`Out dir missing: ${OUT_DIR}`);
    process.exit(1);
  }
  const jsonPath = join(OUT_DIR, "PIPELINE-UTILIZATION-AUDIT-2026-05-23.json");
  const mdPath = join(OUT_DIR, "PIPELINE-UTILIZATION-AUDIT-2026-05-23.md");
  writeFileSync(jsonPath, JSON.stringify(audit, null, 2));
  writeFileSync(mdPath, renderMarkdown(audit));
  console.log(`✓ ${jsonPath}`);
  console.log(`✓ ${mdPath}`);
  console.log(`Total engines: ${allEngines.length}`);
  for (const p of audited) {
    if (p.status === "missing") {
      console.log(`  ${p.domain}: MISSING`);
    } else {
      console.log(`  ${p.domain}: ${p.utilization_pct}% util (${p.referenced_in_domain}/${p.total_domain_engines} domain engines), ${p.missing_count} gaps`);
    }
  }
}

// Direct-invoke detection (cross-platform)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { auditPipeline, listEngineClasses, referencedEngines, domainRelevantEngines, renderMarkdown };
