#!/usr/bin/env node
/**
 * skill-marketplace-scan.mjs — U-SKU07 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-1: *"Browse skillsmp.com or github.com/anthropics/skills
 * and find a Skill relevant to your work. There are over 80,000 community Skills…
 * most people have never installed a single one."* This fetches the major skill
 * collections, scores each listing against PRISM's domain vocabulary, dedup-checks
 * against the existing library, and writes a candidates report:
 *
 *   state/shared/skill-marketplace-candidates-<YYYY-MM-DD>.json   (machine-readable)
 *   state/shared/skill-marketplace-candidates-<YYYY-MM-DD>.md     (human report)
 *
 * It only **recommends** — installing a community skill is a human/forge action
 * that goes through `/harness-security-audit`. Grading/scoring lives in
 * `mcp-server/src/engines/SkillMarketplaceScannerEngine.ts`; this file is the I/O
 * shim (fetch each source → hand the content to the engine → write artifacts).
 *
 * Sources: the three public GitHub READMEs (anthropics/skills, wshobson/agents,
 * obra/superpowers) fetch fine here. skillsmp.com is a JS-rendered SPA — a raw
 * fetch returns only the app shell, so it is **skipped and flagged** (not silently
 * degraded). Run with the Playwright MCP available to include it.
 *
 * Modes:
 *   node scripts/skill-marketplace-scan.mjs                  fetch all sources → write artifacts; exit 0 if ≥1 source scanned, 1 if all failed
 *   node scripts/skill-marketplace-scan.mjs --json           machine-readable summary on stdout
 *   node scripts/skill-marketplace-scan.mjs --no-write       compute only, write nothing
 *   node scripts/skill-marketplace-scan.mjs --min-relevance 0.67   raise the relevance floor (default 0.5 ≈ ≥2 domain hits)
 *   node scripts/skill-marketplace-scan.mjs --sources anthropics-skills,wshobson-agents   scan only these source ids
 *   node scripts/skill-marketplace-scan.mjs --from-content <file.json>   inject pre-fetched content {sourceId: "<markdown>"} — no network (tests / offline)
 *   node scripts/skill-marketplace-scan.mjs --self-test      synthetic-fixture grader check; exit 0/1
 *   node scripts/skill-marketplace-scan.mjs --help
 *
 * Cron: `0 10 1 * *` (1st of month, 10:00 local) — registered in mcp-server/data/state/cron-jobs.json as `skill-marketplace-scan-monthly`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "tsx/esm/api";

// scripts/skill-marketplace-scan.mjs → repo root is one dir up.
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const FETCH_TIMEOUT_MS = 15_000;

const args = process.argv.slice(2);
const flag = (...names) => names.some((n) => args.includes(n));
const valueOf = (name) => { const i = args.indexOf(name); return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined; };
const OPTS = {
  help: flag("--help", "-h"),
  json: flag("--json"),
  noWrite: flag("--no-write"),
  selfTest: flag("--self-test", "--selftest"),
  quiet: flag("--quiet", "-q"),
  minRelevance: valueOf("--min-relevance"),
  cap: valueOf("--cap"),
  sources: valueOf("--sources"),
  fromContent: valueOf("--from-content"),
};

const HELP = `skill-marketplace-scan.mjs — scan community skill collections for PRISM-domain-relevant skills (recommend only; never installs)

  node scripts/skill-marketplace-scan.mjs                       fetch all sources → state/shared/skill-marketplace-candidates-<date>.{md,json}
  node scripts/skill-marketplace-scan.mjs --json                machine-readable summary on stdout
  node scripts/skill-marketplace-scan.mjs --no-write            compute only
  node scripts/skill-marketplace-scan.mjs --min-relevance 0.67  raise the relevance floor (default 0.5)
  node scripts/skill-marketplace-scan.mjs --sources a,b,c       scan only these source ids
  node scripts/skill-marketplace-scan.mjs --from-content f.json inject pre-fetched content (no network)
  node scripts/skill-marketplace-scan.mjs --self-test           synthetic-fixture self-check; exit 0/1

Exit 0 if ≥1 source was scanned, 1 if every source failed. --self-test exits 0/1 vs fixtures.
NOTE: skillsmp.com is a JS-rendered SPA — without the Playwright MCP this scanner skips it (and says so).`;

async function withTsx(fn) {
  const unregister = register();
  try { return await fn(); } finally { unregister(); }
}

async function fetchText(url) {
  // Node 22 global fetch + AbortSignal.timeout.
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { "user-agent": "PRISM-skill-marketplace-scan/1.0 (+internal tooling)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

/** Build the SourceFetch[] the engine wants: for each requested source, either fetched `content` or a `fetchError`. */
async function gatherSources(defaults, wanted, injected) {
  const out = [];
  for (const src of defaults) {
    if (wanted && !wanted.includes(src.id)) continue;
    if (injected && Object.prototype.hasOwnProperty.call(injected, src.id)) {
      out.push({ id: src.id, url: src.url, content: String(injected[src.id] ?? "") });
      continue;
    }
    if (src.jsGated) {
      out.push({ id: src.id, url: src.url, fetchError: "JS-rendered SPA — a raw fetch returns only the app shell; needs the Playwright MCP. Skipped." });
      continue;
    }
    try { out.push({ id: src.id, url: src.url, content: await fetchText(src.url) }); }
    catch (e) { out.push({ id: src.id, url: src.url, fetchError: String(e?.message ?? e) }); }
  }
  // any injected ids not in `defaults` → include them too (lets a test inject an arbitrary source)
  if (injected) for (const id of Object.keys(injected)) {
    if (!out.some((s) => s.id === id)) out.push({ id, url: `(injected:${id})`, content: String(injected[id] ?? "") });
  }
  return out;
}

// ── self-test ──────────────────────────────────────────────────────────────

async function runSelfTest() {
  const readme = [
    "# Awesome Skills",
    "",
    "| Skill | Description |",
    "|---|---|",
    "| [cnc-feed-optimizer](skills/cnc-feed-optimizer) | Optimize CNC milling feeds and speeds for carbide tooling and tool life |",
    "| [pdf-table-extract](skills/pdf-table-extract) | Extract tables from PDF documents with OCR fallback |",
    "| [react-state-helper](skills/react-state-helper) | Manage React component state with hooks |",
    "",
    "### lathe-thread-wizard",
    "Generate single-point threading G-code for CNC lathes (a near-duplicate of an existing PRISM skill)",
    "",
    "- [gd-and-t-checker](skills/gdt) — Validate GD&T callouts and tolerance stacks on engineering drawings",
  ].join("\n");
  const injected = { "anthropics-skills": readme, "skillsmp": "<html><body><div id='app'></div><script src='/bundle.js'></script></body></html>" };
  const librarySkills = [
    { name: "lathe-thread", description: "Generate single-point threading G-code for CNC lathes" },
    { name: "wedm-program", description: "Wire EDM program generation" },
  ];

  let pass = 0, fail = 0;
  const check = (cond, msg) => { if (cond) pass++; else { fail++; console.error(`  ✗ ${msg}`); } };

  const { skillMarketplaceScannerEngine, DEFAULT_MARKETPLACE_SOURCES } = await import("../mcp-server/src/engines/SkillMarketplaceScannerEngine.ts");
  const sources = await gatherSources(DEFAULT_MARKETPLACE_SOURCES, ["anthropics-skills", "skillsmp"], injected);
  const r = skillMarketplaceScannerEngine.scan({ sources, minRelevance: 0.5, registrySkillsOverride: librarySkills });
  const cand = (n) => r.candidates.find((c) => c.name === n);

  check(r.sourcesScanned.includes("anthropics-skills"), "anthropics-skills was scanned");
  check(r.sourcesSkipped.some((s) => String(s.id) === "skillsmp"), "skillsmp was skipped (JS-gated)");
  check(r.totalListings >= 4, `extracted ≥4 listings (got ${r.totalListings})`);
  check(cand("cnc-feed-optimizer") && ["install", "study"].includes(cand("cnc-feed-optimizer").recommendation), `cnc-feed-optimizer → install/study (got ${cand("cnc-feed-optimizer")?.recommendation})`);
  check(cand("pdf-table-extract") && ["install", "study"].includes(cand("pdf-table-extract").recommendation), `pdf-table-extract → install/study (got ${cand("pdf-table-extract")?.recommendation})`);
  check(cand("react-state-helper")?.recommendation === "skip", `react-state-helper → skip (off-domain) (got ${cand("react-state-helper")?.recommendation})`);
  check(cand("lathe-thread-wizard")?.recommendation === "already-covered" && cand("lathe-thread-wizard")?.alreadyCoveredBy === "lathe-thread", `lathe-thread-wizard → already-covered by lathe-thread (got ${cand("lathe-thread-wizard")?.recommendation} / ${cand("lathe-thread-wizard")?.alreadyCoveredBy})`);
  check(cand("gd-and-t-checker") && ["install", "study"].includes(cand("gd-and-t-checker").recommendation), `gd-and-t-checker → install/study (got ${cand("gd-and-t-checker")?.recommendation})`);
  check(r.advisories.join(" ").toLowerCase().includes("skillsmp"), "advisory mentions skillsmp/Playwright");
  check(typeof skillMarketplaceScannerEngine.renderMarkdown(r) === "string" && skillMarketplaceScannerEngine.renderMarkdown(r).includes("# PRISM Skill-Marketplace Scan"), "renderMarkdown produces a report");

  // all-sources-fail case
  const r2 = skillMarketplaceScannerEngine.scan({ sources: [{ id: "x", url: "u", fetchError: "boom" }], registrySkillsOverride: librarySkills });
  check(r2.sourcesScanned.length === 0 && r2.advisories.join(" ").toLowerCase().includes("hard miss"), "all-sources-fail → 0 scanned + a 'hard miss' advisory");

  const ok = fail === 0;
  if (!OPTS.quiet) console.log(`[skill-marketplace-scan --self-test] ${pass}/${pass + fail} checks passed`);
  return ok ? 0 : 1;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  if (OPTS.help) { console.log(HELP); return 0; }
  if (OPTS.selfTest) return withTsx(() => runSelfTest());

  return withTsx(async () => {
    const { skillMarketplaceScannerEngine, DEFAULT_MARKETPLACE_SOURCES } = await import("../mcp-server/src/engines/SkillMarketplaceScannerEngine.ts");

    const wanted = OPTS.sources ? OPTS.sources.split(",").map((s) => s.trim()).filter(Boolean) : null;
    let injected = null;
    if (OPTS.fromContent) {
      try { injected = JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, OPTS.fromContent), "utf-8")); }
      catch (e) { console.error(`[skill-marketplace-scan] could not read --from-content ${OPTS.fromContent}: ${e?.message ?? e}`); return 1; }
    }
    if (!injected && !OPTS.quiet && !OPTS.json) console.error("[skill-marketplace-scan] fetching community collections …");
    const sources = await gatherSources(DEFAULT_MARKETPLACE_SOURCES, wanted, injected);

    const result = skillMarketplaceScannerEngine.scan({
      sources,
      ...(OPTS.minRelevance != null && Number.isFinite(Number(OPTS.minRelevance)) ? { minRelevance: Number(OPTS.minRelevance) } : {}),
      ...(OPTS.cap != null && Number.isFinite(Number(OPTS.cap)) ? { perSourceCap: Number(OPTS.cap) } : {}),
    });

    const dateLabel = result.generatedAt.slice(0, 10);
    const outDir = path.join(REPO_ROOT, "state", "shared");
    const jsonPath = path.join(outDir, `skill-marketplace-candidates-${dateLabel}.json`);
    const mdPath = path.join(outDir, `skill-marketplace-candidates-${dateLabel}.md`);
    if (!OPTS.noWrite) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
      fs.writeFileSync(mdPath, skillMarketplaceScannerEngine.renderMarkdown(result, { dateLabel }), "utf-8");
    }

    if (OPTS.json) {
      const summary = {
        schemaVersion: result.schemaVersion, generatedAt: result.generatedAt,
        sourcesScanned: result.sourcesScanned, sourcesSkipped: result.sourcesSkipped,
        totalListings: result.totalListings, relevantCount: result.relevantCount,
        byRecommendation: result.byRecommendation,
        shortlist: result.candidates.filter((c) => c.recommendation === "install" || c.recommendation === "study").slice(0, 50),
        alreadyCovered: result.candidates.filter((c) => c.recommendation === "already-covered").map((c) => ({ name: c.name, source: c.source, coveredBy: c.alreadyCoveredBy })),
        advisories: result.advisories, sources: result.sources,
        written: OPTS.noWrite ? null : { md: mdPath, json: jsonPath },
      };
      process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    } else if (!OPTS.quiet) {
      const r = result;
      console.log(`\nPRISM Skill-Marketplace Scan — ${dateLabel}`);
      console.log(`  scanned: ${r.sourcesScanned.join(", ") || "(none)"}  |  skipped: ${r.sourcesSkipped.map((s) => s.id).join(", ") || "(none)"}`);
      console.log(`  listings=${r.totalListings}  relevant=${r.relevantCount}  →  install=${r.byRecommendation.install}  study=${r.byRecommendation.study}  already-covered=${r.byRecommendation["already-covered"]}  skip=${r.byRecommendation.skip}`);
      for (const a of r.advisories) console.log(`  ⚠ ${a}`);
      if (!OPTS.noWrite) { console.log(`  written: ${path.relative(REPO_ROOT, mdPath)}`); console.log(`           ${path.relative(REPO_ROOT, jsonPath)}`); }
      console.log("");
    }

    return result.sourcesScanned.length > 0 ? 0 : 1;
  });
}

main()
  .then((code) => process.exit(typeof code === "number" ? code : 0))
  .catch((e) => { console.error(`[skill-marketplace-scan] fatal: ${e?.stack ?? e}`); process.exit(1); });
