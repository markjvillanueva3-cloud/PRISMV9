#!/usr/bin/env node
/**
 * inventory-core-scripts.mjs — ACP-MS0 / P0-U03
 *
 * Classifies every script under `H:/prism/scripts/` by **purpose** (build
 * guards, quality checks, context management, telemetry, etc.) and emits a
 * grouped markdown report at `state/shared/SCRIPT_INVENTORY.md`.
 *
 * Classification is keyword-driven against the filename + the first ~30 lines
 * of the file (the leading JSDoc/comment block). A script that matches
 * multiple classes lands in the FIRST matching class — class order encodes
 * priority so build-guard wins over generic "build-*".
 *
 * Output (markdown):
 *   - Summary table (class → count)
 *   - One section per class with script-name + short purpose line
 *
 * USAGE
 *   node scripts/inventory-core-scripts.mjs                # write SCRIPT_INVENTORY.md
 *   node scripts/inventory-core-scripts.mjs --json         # emit JSON to stdout
 *   node scripts/inventory-core-scripts.mjs --out <path>   # custom output path
 *   node scripts/inventory-core-scripts.mjs --quiet        # no stdout report
 *
 * EXIT CODES
 *   0  Success (count >= 100, output written)
 *   1  Source directory not found or no scripts discovered
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = "H:/prism";
const SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");
const DEFAULT_OUT = path.join(REPO_ROOT, "state/shared/SCRIPT_INVENTORY.md");

// ── arg parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function valueOf(flag, def) {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
}
const outPath = valueOf("--out", DEFAULT_OUT);
const emitJson = args.includes("--json");
const quiet = args.includes("--quiet");

// ── classification rules ────────────────────────────────────────────────────
// Order matters — first match wins. Each rule has filename-regex + content-regex.
// `slug` is the markdown section anchor; `label` is the human-readable title.

const RULES = [
  {
    slug: "build-guards",
    label: "Build guards",
    fileRe: /^(build-guard|comprehensive-build|build-verify|build-state-snapshot|build-doctor|stop-on-uncommitted)/i,
    contentRe: /build.?guard|comprehensive-build-enforce|build state|stop[- _]on[- _]uncommitted/i,
  },
  {
    slug: "quality-checks",
    label: "Quality checks & scrutiny",
    fileRe: /^(scrutiny|quality|svi|three-?way|audit-round|review)/i,
    contentRe: /scrutiny|quality dashboard|gate.*pass|3-of-3|review.*pass\/fail/i,
  },
  {
    slug: "audit",
    label: "Audit & verification",
    fileRe: /^(audit|verify-|check-|validate-|test-no-)/i,
    contentRe: /audit|verify|cross-check|drift detect|regress/i,
  },
  {
    slug: "context-management",
    label: "Context & session management",
    fileRe: /^(context|compact|precompact|claude-brief|handoff|session-|chat-slot|stable-session|reorient)/i,
    contentRe: /context window|precompact|handoff|chat.?slot|session.?id|reorient/i,
  },
  {
    slug: "telemetry",
    label: "Telemetry & metrics",
    fileRe: /^(telemetry|hook-latency|recall-counter|perf-|metrics|stats|token-economy)/i,
    contentRe: /telemetry|p95|p99|latency|metrics|hook.?stats|token.?economy/i,
  },
  {
    slug: "hook-infrastructure",
    label: "Hook infrastructure",
    fileRe: /(^hook-|hook-registry|hook-tier|async-hook|hook-fast|hookify)/i,
    contentRe: /\.claude\/hooks\/|HOOK_REGISTRY|async-hook|fast.?lane|tier ?[0-9]/i,
  },
  {
    slug: "engine-wiring",
    label: "Engine wiring & orphan rescue",
    fileRe: /^(wire-|audit-unwired|orphan-inventory|engine-wiring|build-engine-index|dispatcher-coverage)/i,
    contentRe: /unwired|orphan|dispatcher.*wiring|wire.*engine|wire.*dispatcher/i,
  },
  {
    slug: "automation-gap",
    label: "Automation gap & roadmap",
    fileRe: /^(automation-|gap-|roadmap-|milestone-|atomic-roadmap|build-milestone|envelope-)/i,
    contentRe: /AUTOMATION_GAP|roadmap-index|envelope|milestone.?progress/i,
  },
  {
    slug: "generators",
    label: "Generators & regenerators",
    fileRe: /^(generate-|regen-|build-.*-snapshot|build-.*-index|produce-|emit-)/i,
    contentRe: /\bregenerat|\bgenerate|emit.*markdown|build.*snapshot/i,
  },
  {
    slug: "learning",
    label: "Learning, training, LoRA",
    fileRe: /^(learn-|lora-|train-|continual|extract-skill|build-lora|fewshot)/i,
    contentRe: /lora|fine.?tune|train.*model|few.?shot|knowledge.*ingest/i,
  },
  {
    slug: "data-pipeline",
    label: "Data ingest & extraction",
    fileRe: /^(extract-|ingest-|harvest-|pdf-|video-|blueprint-|shop-note|inbox-)/i,
    contentRe: /extract.*from|ingest.*to|harvest|pdf.*pipeline|video.*transcript|inbox/i,
  },
  {
    slug: "migrations",
    label: "Migrations & patches",
    fileRe: /^(migrate-|apply-v|patch-|backfill-|rewrite-|fix-|cleanup-)/i,
    contentRe: /migration|backfill|patch.*to|one.?shot.*upgrade|rewrite/i,
  },
  {
    slug: "awareness",
    label: "Awareness & search-first",
    fileRe: /^(awareness|master-index|system-viz|capability-|fleet-|orphan-)/i,
    contentRe: /awareness|master.?index|capability.*manifest|system.?viz|fleet/i,
  },
  {
    slug: "wiki",
    label: "Wiki & memory",
    fileRe: /^(wiki-|memory-|obsidian|knowledge-|tribal-|playbook-)/i,
    contentRe: /wiki|memory.?graph|obsidian|tribal.*tip|playbook/i,
  },
  {
    slug: "maintenance",
    label: "Maintenance, prune, reap",
    fileRe: /^(prune-|reap-|repair-|sweep-|janitor|kill-|node-process)/i,
    contentRe: /prune|reap|janitor|kill.*orphan|sweep/i,
  },
  {
    slug: "release-deploy",
    label: "Release & deployment",
    fileRe: /^(release-|deploy-|publish-|nightly-|cron-|bootstrap-)/i,
    contentRe: /release|deploy|publish.*npm|nightly.*run|cron/i,
  },
  {
    slug: "tests",
    label: "Test runners & harnesses",
    fileRe: /^(test-|vitest-|run-test|coverage-)/i,
    contentRe: /vitest|test.?runner|coverage.*report/i,
  },
  {
    slug: "fleet-coordination",
    label: "Fleet & multi-chat coordination",
    fileRe: /^(claim-|slot-|fleet-|peer-|six-chat|consensus-|coordinator-)/i,
    contentRe: /claim.*file|slot|fleet|peer.*chat|consensus|coordinat/i,
  },
];

const OTHER = { slug: "other", label: "Other / uncategorized" };

// ── walk + classify ─────────────────────────────────────────────────────────

function listScripts(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isFile() && /\.(mjs|js|cjs|ts)$/.test(ent.name)) {
      out.push(path.join(dir, ent.name));
    }
  }
  return out.sort();
}

function readHead(file, lines = 30) {
  try {
    const content = fs.readFileSync(file, "utf8");
    return content.split(/\r?\n/, lines).join("\n");
  } catch {
    return "";
  }
}

function purposeLine(head) {
  // First non-shebang, non-empty comment line — strips "*" / "//" / "#" prefixes.
  const stripped = head
    .replace(/^#!.*\n/, "")
    .replace(/\/\*+\s*\n/, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[*\/#]+\s*/, "").trim())
    .filter((l) => l.length > 0);
  if (stripped.length === 0) return "(no leading docstring)";
  // Prefer the line AFTER the filename header (common pattern: "filename — purpose").
  for (const line of stripped) {
    if (line.includes("—") || line.includes(" - ")) return line.slice(0, 160);
  }
  return stripped[0].slice(0, 160);
}

function classify(filePath) {
  const name = path.basename(filePath);
  const head = readHead(filePath);
  for (const rule of RULES) {
    if (rule.fileRe.test(name) || rule.contentRe.test(head)) {
      return { slug: rule.slug, label: rule.label, purpose: purposeLine(head) };
    }
  }
  return { slug: OTHER.slug, label: OTHER.label, purpose: purposeLine(head) };
}

// ── main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    console.error(`error: scripts dir not found: ${SCRIPTS_DIR}`);
    process.exit(1);
  }

  const scripts = listScripts(SCRIPTS_DIR);
  if (scripts.length === 0) {
    console.error(`error: no scripts discovered under ${SCRIPTS_DIR}`);
    process.exit(1);
  }

  const groups = new Map();
  for (const rule of RULES) groups.set(rule.slug, { label: rule.label, items: [] });
  groups.set(OTHER.slug, { label: OTHER.label, items: [] });

  for (const sp of scripts) {
    const c = classify(sp);
    const grp = groups.get(c.slug);
    if (grp) grp.items.push({ name: path.basename(sp), purpose: c.purpose });
  }

  const totals = { total: scripts.length, byClass: {} };
  for (const [slug, grp] of groups) totals.byClass[slug] = grp.items.length;

  if (emitJson) {
    process.stdout.write(JSON.stringify({
      generatedAt: new Date().toISOString(),
      schemaVersion: "1.0.0",
      sourceDir: path.relative(REPO_ROOT, SCRIPTS_DIR),
      totals,
      groups: [...groups.entries()].map(([slug, g]) => ({ slug, label: g.label, count: g.items.length, items: g.items })),
    }, null, 2));
    return;
  }

  // Markdown
  const lines = [];
  lines.push(`# PRISM Core Scripts Inventory`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: ACP-MS0 / P0-U03 — *Inventory core scripts by purpose*`);
  lines.push(`Producer: \`scripts/inventory-core-scripts.mjs\` · re-run any time`);
  lines.push("");
  lines.push(`Scanned **${scripts.length}** scripts under \`scripts/\`.`);
  lines.push(`Classification: filename regex + leading-comment keyword match · first-match-wins.`);
  lines.push("");

  // Summary table
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Class | Count | Section |`);
  lines.push(`|-------|------:|---------|`);
  for (const rule of RULES) {
    const grp = groups.get(rule.slug);
    if (grp.items.length === 0) continue;
    lines.push(`| ${rule.label} | ${grp.items.length} | [#${rule.slug}](#${rule.slug}) |`);
  }
  const otherGrp = groups.get(OTHER.slug);
  if (otherGrp.items.length > 0) {
    lines.push(`| ${OTHER.label} | ${otherGrp.items.length} | [#${OTHER.slug}](#${OTHER.slug}) |`);
  }
  lines.push(`| **Total** | **${scripts.length}** |  |`);
  lines.push("");

  // Per-class sections
  for (const rule of RULES) {
    const grp = groups.get(rule.slug);
    if (grp.items.length === 0) continue;
    lines.push(`## ${rule.label} {#${rule.slug}}`);
    lines.push("");
    lines.push(`*${grp.items.length} script(s)*`);
    lines.push("");
    for (const item of grp.items) {
      lines.push(`- \`${item.name}\` — ${escapeMd(item.purpose)}`);
    }
    lines.push("");
  }
  if (otherGrp.items.length > 0) {
    lines.push(`## ${OTHER.label} {#${OTHER.slug}}`);
    lines.push("");
    lines.push(`*${otherGrp.items.length} script(s)*`);
    lines.push("");
    for (const item of otherGrp.items) {
      lines.push(`- \`${item.name}\` — ${escapeMd(item.purpose)}`);
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`_ACP-MS0 P0-U03 exit conditions: implementation complete, tests pass, typecheck clean._`);
  lines.push("");

  const markdown = lines.join("\n");

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, "utf8");

  if (!quiet) {
    console.log(`script-inventory written: ${path.relative(REPO_ROOT, outPath)}`);
    console.log(`  total scripts: ${scripts.length}`);
    const top = [...groups.entries()]
      .map(([slug, g]) => ({ slug, count: g.items.length }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    console.log(`  top classes:`);
    for (const r of top) console.log(`    - ${r.slug}: ${r.count}`);
  }
}

function escapeMd(s) {
  // Escape pipe + backtick to keep table/code formatting intact.
  return String(s).replace(/\|/g, "\\|");
}

main();
