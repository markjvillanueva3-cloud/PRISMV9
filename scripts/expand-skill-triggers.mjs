#!/usr/bin/env node
// expand-skill-triggers.mjs
// SYSTEM-VIZ-BRAIN-MS0/U-P0-TRIGGER-LEDGER-EXPAND
//
// Adds `triggers:` frontmatter blocks to high-value skill .md files that
// currently surface only via explicit /skill-name invocation. Curated keyword
// map keyed on skill basename; only adds when no `triggers:` already present.
//
// CLI:
//   node scripts/expand-skill-triggers.mjs                 # write
//   node scripts/expand-skill-triggers.mjs --dry-run       # preview only
//   node scripts/expand-skill-triggers.mjs --skill <name>  # single file
//
// After running, re-run: node scripts/extract-skill-triggers.mjs
// to regenerate knowledge/wiki/architecture/_skill-triggers.jsonl.

import { promises as fs } from "node:fs";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SKILL_DIR = path.join(PRISM_ROOT, ".claude", "commands");

// Curated trigger map. Score 0.70-0.90 reflects how strongly a keyword match
// implies the skill should fire. Domain studios + ingestion get 0.85; pipeline
// disciplines get 0.80; informational skills get 0.75.
const CURATED = {
  // Knowledge ingestion (highest priority — these MUST surface)
  "pdf-learn":           { keywords: "pdf|document|manual|catalog|paper|datasheet|handbook",                                                          score: 0.90 },
  "video-learn":         { keywords: "video|youtube|tutorial|training video|lecture|webinar",                                                          score: 0.90 },
  "shop-knowledge":      { keywords: "tribal|shop floor|operator wisdom|machinist tip|tribal knowledge|tribal-knowledge",                              score: 0.85 },
  "distill-tribal":      { keywords: "distill tribal|tribal distill|tribal corpus|tribal extract|tribal compile",                                      score: 0.80 },

  // Forge / build / scrutinize (developer-pipeline anchors)
  "forge-triple":        { keywords: "forge triple|new engine|create engine|create skill|new hook|engine+skill+hook|forge engine",                     score: 0.85 },
  "forge-audit-v2":      { keywords: "forge audit|forge-audit|forge audit v2|forge quality audit|codebase audit",                                      score: 0.85 },
  "rgs6-audit-v2":       { keywords: "rgs6|rgs6-audit|rgs audit|rgs6 review",                                                                          score: 0.80 },
  "dedup":               { keywords: "dedup|duplicate check|duplication guard|check for duplicate|already exists|duplicate engine",                    score: 0.85 },
  "scrutinize":          { keywords: "scrutinize|deep review|code audit|quality audit|exhaustive review",                                              score: 0.80 },
  "wire-unwired":        { keywords: "wire unwired|wire orphan|wire engine|unwired engine|engine needs dispatcher|wire to dispatcher",                 score: 0.80 },
  "verify-loop":         { keywords: "verify loop|verification feedback|verify before ship|verification gate",                                         score: 0.75 },

  // System-viz / master-index / awareness (the OS brain)
  "system-viz":          { keywords: "system viz|system-viz|graph|3d viewer|node graph|prism brain|visual graph|map of",                               score: 0.80 },
  "master-index":        { keywords: "master index|master-index|semantic search|cross-search|index search|fused search",                               score: 0.80 },
  "awareness-snapshot":  { keywords: "awareness|snapshot|fleet snapshot|digest|awareness digest|fleet awareness",                                      score: 0.75 },
  "deep-search":         { keywords: "deep search|deep-search|exhaustive search|search reason neural|full search",                                     score: 0.75 },
  "orphan-inventory":    { keywords: "orphan inventory|orphan engines|built but unwired|unwired punch list",                                           score: 0.80 },
  "utilization-dashboard": { keywords: "utilization|utilization dashboard|hubs sinks|graph utilization|node classification",                            score: 0.75 },
  "code-index":          { keywords: "code index|shortcode|E####|D##|code-system-index|resolve shortcode",                                             score: 0.75 },
  "impact":              { keywords: "impact analysis|blast radius|what depends on|impact of changing|change impact",                                  score: 0.75 },

  // Session lifecycle / fleet coord
  "checkin":             { keywords: "checkin|/checkin|claim slot|fleet checkin|fleet check-in",                                                       score: 0.85 },
  "handoff":             { keywords: "handoff|/handoff|session handoff|next chat|context handoff",                                                     score: 0.85 },
  "precompact":          { keywords: "precompact|/precompact|before compact|prepare compact|write handoff",                                            score: 0.80 },
  "checkpoint":          { keywords: "checkpoint|/checkpoint|save state|state snapshot|progress checkpoint",                                            score: 0.75 },
  "pick-unit":           { keywords: "pick unit|next unit|claim unit|pick task|pick a unit",                                                            score: 0.80 },
  "pick-task":           { keywords: "pick task|next task|claim task|pick a task",                                                                      score: 0.75 },
  "pick-dev":            { keywords: "pick dev|pick development|dev pick",                                                                              score: 0.70 },
  "pick-build-close":    { keywords: "pick build close|build close|pick-build|build-close",                                                             score: 0.75 },
  "run-continuous":      { keywords: "run continuous|continuous run|auto run|loop run|run all",                                                         score: 0.75 },
  "loop":                { keywords: "/loop|loop mode|iterate loop|loop iter|loop iteration",                                                           score: 0.75 },
  "goal":                { keywords: "/goal|goal complete|complete goal|goal mode",                                                                     score: 0.75 },

  // Close-out / drift
  "close-out":           { keywords: "close out|close-out|close milestone|milestone closeout|unit closeout|surface close",                              score: 0.85 },
  "close-out-audit":     { keywords: "close-out audit|closeout audit|silent close|envelope drift|drift candidates|shipped but pending",                 score: 0.80 },
  "envelope-drift-fix":  { keywords: "envelope drift|envelope-drift|status drift|envelope status",                                                      score: 0.75 },
  "envelope-sync":       { keywords: "envelope sync|sync envelope|envelope status flip|status flip",                                                    score: 0.75 },

  // Domain studios (manufacturing-side)
  "wire-edm-studio":     { keywords: "wedm|wire edm|wire-edm|wire EDM programming|edm program",                                                         score: 0.85 },
  "lathe-studio":        { keywords: "lathe|turning|okuma|mazak lathe|lathe program|turning program",                                                   score: 0.85 },
  "machine-harden":      { keywords: "machine harden|harden machine|machine-specific AI|machine hardening",                                             score: 0.75 },
  "auto-speed-feed":     { keywords: "speed feed|speeds and feeds|sfm|chip load|cutting parameters|feed rate",                                          score: 0.85 },
  "program-optimize":    { keywords: "program optimize|optimize nc|nc optimize|optimize toolpath|toolpath optimize",                                    score: 0.80 },
  "quote-to-ship":       { keywords: "quote|estimate|cost estimate|quote to ship|quote-to-ship",                                                        score: 0.80 },
  "smart":               { keywords: "/smart|smart route|intelligent route|smart task",                                                                 score: 0.70 },

  // Wiki maintenance
  "wiki-ingest":         { keywords: "wiki ingest|ingest wiki|add to wiki|wiki add",                                                                    score: 0.75 },
  "wiki-query":          { keywords: "wiki query|wiki-query|query wiki|wiki search|search wiki",                                                        score: 0.75 },
  "wiki-lint":           { keywords: "wiki lint|wiki-lint|lint wiki|wiki cleanup",                                                                      score: 0.70 },
  "wiki-morning":        { keywords: "wiki morning|morning wiki|wiki daily",                                                                            score: 0.65 },
  "wiki-bootstrap":      { keywords: "wiki bootstrap|bootstrap wiki|wiki seed",                                                                         score: 0.65 },

  // Ollama (local LLM offload)
  "ollama-explain":      { keywords: "ollama explain|explain code|local explain|qwen explain",                                                          score: 0.75 },
  "ollama-summarize":    { keywords: "ollama summarize|local summarize|qwen summarize",                                                                 score: 0.75 },
  "ollama-classify":     { keywords: "ollama classify|local classify|qwen classify",                                                                    score: 0.75 },
  "ollama-docstring":    { keywords: "ollama docstring|generate docstring|local docstring",                                                              score: 0.75 },
  "ollama-lint":         { keywords: "ollama lint|local lint|qwen lint",                                                                                score: 0.70 },
  "ollama-error-triage": { keywords: "ollama error|error triage|local error|qwen error",                                                                score: 0.75 },
  "ollama-diff-summary": { keywords: "ollama diff|diff summary|local diff",                                                                             score: 0.70 },

  // RTK
  "rtk-setup":           { keywords: "rtk setup|install rtk|rtk install|token savings setup",                                                           score: 0.75 },

  // Hygiene / fleet
  "six-chat-bootstrap":  { keywords: "six chat bootstrap|6 chat|fleet bootstrap|six-chat",                                                              score: 0.70 },
  "six-chat-commit-consensus": { keywords: "six chat commit|commit consensus|6 chat commit|consensus commit",                                            score: 0.70 },
  "fleet-reaper":        { keywords: "fleet reaper|reap fleet|orphan process|process reaper|crashed slot",                                              score: 0.80 },

  // Self-improvement / SPARC
  "sparc":               { keywords: "sparc|/sparc|problem action result code|sparc framework",                                                         score: 0.70 },

  // Encoding / staging / replay
  "encoding-guard":      { keywords: "encoding guard|utf-8|encoding check|bom check|bom|byte order mark",                                               score: 0.70 },
  "scrutiny-replay":     { keywords: "scrutiny replay|replay scrutiny|re-scrutinize",                                                                   score: 0.70 },
};

const DEFAULT_ACTION = "suggest";
const DEFAULT_EVENT = "UserPromptSubmit";
const DEFAULT_MATCHER_TYPE = "keyword";

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    skill: (() => { const i = args.indexOf("--skill"); return i >= 0 ? args[i + 1] : null; })(),
  };
}

function hasTriggersBlock(content) {
  return /^---\s*\n[\s\S]*?^triggers:\s*$/m.test(content);
}

function hasFrontmatter(content) {
  return /^---\s*\n[\s\S]*?\n---\s*\n/.test(content);
}

function buildTriggerBlock(curated) {
  return [
    "triggers:",
    `  - event: ${DEFAULT_EVENT}`,
    "    matcher:",
    `      type: ${DEFAULT_MATCHER_TYPE}`,
    `      value: "${curated.keywords}"`,
    `    score: ${curated.score}`,
    `    action: ${DEFAULT_ACTION}`,
  ].join("\n");
}

function injectTriggersIntoFrontmatter(content, triggerBlock) {
  const fmMatch = content.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
  if (!fmMatch) {
    const insertion = `---\n${triggerBlock}\n---\n\n`;
    return insertion + content;
  }
  const [, openMarker, fmBody, closeMarker] = fmMatch;
  const newFm = openMarker + fmBody + "\n" + triggerBlock + closeMarker;
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, newFm);
}

async function processSkill(filePath, curated, dryRun) {
  const content = readFileSync(filePath, "utf8");
  if (hasTriggersBlock(content)) {
    return { file: filePath, action: "skip", reason: "already-has-triggers" };
  }
  const triggerBlock = buildTriggerBlock(curated);
  const newContent = injectTriggersIntoFrontmatter(content, triggerBlock);
  if (dryRun) {
    return { file: filePath, action: "would-write", bytes: newContent.length - content.length };
  }
  await fs.writeFile(filePath, newContent, "utf8");
  return { file: filePath, action: "wrote", bytes: newContent.length - content.length };
}

async function main() {
  const { dryRun, skill } = parseArgs();
  const targets = skill ? [skill] : Object.keys(CURATED);

  const results = { wrote: [], skipped: [], wouldWrite: [], missing: [], errored: [] };

  for (const name of targets) {
    const curated = CURATED[name];
    if (!curated) {
      results.errored.push({ name, reason: "not in CURATED map" });
      continue;
    }
    const filePath = path.join(SKILL_DIR, `${name}.md`);
    if (!existsSync(filePath)) {
      results.missing.push(name);
      continue;
    }
    try {
      const r = await processSkill(filePath, curated, dryRun);
      if (r.action === "wrote") results.wrote.push(name);
      else if (r.action === "would-write") results.wouldWrite.push(name);
      else if (r.action === "skip") results.skipped.push(name);
    } catch (e) {
      results.errored.push({ name, reason: e.message });
    }
  }

  console.error(`expand-skill-triggers: dry=${dryRun}`);
  console.error(`  curated map size: ${Object.keys(CURATED).length}`);
  console.error(`  wrote:        ${results.wrote.length}`);
  console.error(`  would-write:  ${results.wouldWrite.length}`);
  console.error(`  skipped:      ${results.skipped.length} (already have triggers)`);
  console.error(`  missing:      ${results.missing.length}${results.missing.length ? " — " + results.missing.join(",") : ""}`);
  console.error(`  errored:      ${results.errored.length}${results.errored.length ? " — " + results.errored.map(e => e.name + ":" + e.reason).join("; ") : ""}`);

  process.stdout.write(JSON.stringify({ ok: true, dryRun, ...results }) + "\n");
}

main().catch(e => { console.error("expand-skill-triggers fatal:", e.message); process.exit(2); });
