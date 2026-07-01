#!/usr/bin/env node
// scripts/build-slash-command-plans.mjs
//
// PROMPT-ROUTE-HISTORY / U-SLASH-PLANS (slot:alpha 2026-06-16). Operator directive:
// "have plans for all slash commands from this list plus all the custom ones that we
// have. use sound logic and assess what we should use, when we should use it and how."
//
// This is the per-COMMAND half of the routing brain. U-PROMPT-EXTRACT already built
// the per-PROMPT-CLASS route (operator-prompt-route-map.json + prompt-route-inject).
// This unit maps every slash command -> its route class (via classifyRoutingClass,
// reused -- R8) so a chat doing a class-X task sees the SPECIFIC commands that serve
// class X, each with its one-line when-to-use, plus the class's optimal HOW (the
// TASK_CLASS_POLICY ladder/model/commands).
//
// DETERMINISTIC (R5: code does the enumerate + classify, not a model). Streams each
// command .md head (frontmatter + first prose) -- never the whole file. Emits
// state/shared/slash-command-plans.json. Distinct from slash-command-recommender-
// engine (runtime per-QUERY recommender) -- this is the static per-COMMAND route-
// class table the inject reads (R8: complementary, not a duplicate).
//
// Run:   node H:/prism/scripts/build-slash-command-plans.mjs
// Query: node H:/prism/scripts/build-slash-command-plans.mjs --query <class|/command>

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const OUT = path.join(PRISM, "state/shared/slash-command-plans.json");
const HEAD_BYTES = 16384;     // head carrying frontmatter+first prose; 16K covers
                              // even large frontmatter blocks (scrutiny-batch ~4.7K)
                              // so the closing --- is in-window (truncation guard below)
const WHEN_MAX = 160;         // cap the per-command "when" text (artifact hygiene)
const SCHEMA_VERSION = 1;

// Command source roots (tagged). User dir resolved from home so it works cross-host.
function sourceRoots() {
  return [
    { source: "project", dir: path.join(PRISM, ".claude/commands"), archived: false },
    { source: "user", dir: path.join(os.homedir(), ".claude/commands"), archived: false },
    { source: "archive", dir: path.join(PRISM, ".claude/commands-archive"), archived: true },
  ];
}

// ---- pure, testable core ---------------------------------------------------

/** Pure: recursively list .md files under dir (relative paths). [] if dir absent. */
export function listCommandFiles(dir, _rel = "") {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const rel = _rel ? `${_rel}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(listCommandFiles(path.join(dir, e.name), rel));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(rel);
  }
  return out;
}

/**
 * Pure: from a command file's head text + its relative path, derive
 * { name, description }. name = frontmatter `name:` else the relPath with nesting
 * as `dir:leaf` and the .md stripped (matches the `sparc:tutorial` convention).
 * description = frontmatter `description:` else the first markdown heading/prose line.
 */
export function parseCommandMeta(headText, relPath) {
  const raw = String(headText || "");
  const rel = String(relPath || "").replace(/\\/g, "/");
  const fallbackName = rel.replace(/\.md$/i, "").replace(/\//g, ":");
  const hasOpenFm = /^---\r?\n/.test(raw);
  const closed = hasOpenFm ? raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) : null;
  // truncated = an opening --- but the closing --- is beyond the head window. We must
  // NOT body-scan in that case: the "body" is actually more frontmatter, and a YAML
  // `name:`/`title:` line would be silently mistaken for the description (the P1 bug).
  const truncated = hasOpenFm && !closed;
  let fmName = null, fmDesc = null;
  if (hasOpenFm) {
    const region = closed ? closed[1] : raw.replace(/^---\r?\n/, "");
    const n = region.match(/^name:\s*(.+?)\s*$/m);
    const d = region.match(/^description:\s*(.+?)\s*$/m);
    if (n) fmName = n[1].replace(/^["']|["']$/g, "").trim();
    if (d) fmDesc = d[1].replace(/^["']|["']$/g, "").trim();
  }
  let desc = fmDesc;
  if (!desc && !truncated) {
    // body = after a CLOSED frontmatter, else the whole head (no frontmatter). Skip
    // YAML-ish "key:" lines so a stray key is never mistaken for prose.
    const body = closed ? raw.slice(closed[0].length) : raw;
    for (const line of body.split(/\r?\n/)) {
      const t = line.replace(/^#+\s*/, "").replace(/[*_`>]/g, "").trim();
      if (!t || t.startsWith("---")) continue;
      if (/^[A-Za-z][\w-]*:\s/.test(t)) continue;   // YAML key line, not prose
      desc = t; break;
    }
  }
  const name = (fmName || fallbackName).trim();
  let when = (desc || "").replace(/\s+/g, " ").trim();
  if (when.length > WHEN_MAX) when = when.slice(0, WHEN_MAX - 3).trimEnd() + "...";
  return { name, description: when, truncated };
}

/**
 * Pure: classify a command into its route class using the SAME classifier the
 * prompt-route map uses (R8 reuse). Classifies on name + description so a command
 * whose name alone is opaque ("/scope") still routes via its description.
 */
export function classifyCommand(meta, classifyRoutingClass) {
  const text = `${meta.name} ${meta.description}`.trim();
  const r = classifyRoutingClass(text);
  return { taskClass: r.taskClass, confidence: r.confidence };
}

/**
 * Pure: fold an array of { name, description, source, archived, taskClass,
 * confidence } records into the artifact's byClass aggregation. Invariant: every
 * record lands in exactly one class bucket; sum(bucket lengths) === records.length.
 */
export function aggregateByClass(records) {
  const byClass = {};
  for (const r of records) {
    const conf = Number.isFinite(r.confidence) ? r.confidence : 0;  // brittle-input guard
    (byClass[r.taskClass] ||= []).push({
      name: r.name, when: r.description, source: r.source,
      archived: r.archived, confidence: Number(conf.toFixed(2)),
    });
  }
  for (const cls of Object.keys(byClass)) {
    byClass[cls].sort((a, b) => (b.confidence - a.confidence) || a.name.localeCompare(b.name));
  }
  return byClass;
}

// ---- generator -------------------------------------------------------------

async function main() {
  const m = await import(pathToFileURL(path.join(PRISM, "scripts/lib/feature-routing-graph.mjs")).href);
  const { classifyRoutingClass, TASK_CLASS_POLICY } = m;

  const records = [];
  const seen = new Set();              // dedup identical (source, name)
  const sources = { project: 0, user: 0, archive: 0 };
  const truncatedFiles = [];           // frontmatter beyond HEAD_BYTES (fail-loud, R12)
  for (const root of sourceRoots()) {
    for (const rel of listCommandFiles(root.dir)) {
      let head = "";
      try {
        const fd = fs.openSync(path.join(root.dir, rel), "r");
        const buf = Buffer.alloc(HEAD_BYTES);
        const n = fs.readSync(fd, buf, 0, HEAD_BYTES, 0);
        fs.closeSync(fd);
        head = buf.slice(0, n).toString("utf8");
      } catch { continue; }
      const meta = parseCommandMeta(head, rel);
      if (!meta.name) continue;
      if (meta.truncated) truncatedFiles.push(`${root.source}/${rel}`);
      const key = `${root.source}:${meta.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cls = classifyCommand(meta, classifyRoutingClass);
      records.push({ ...meta, source: root.source, archived: root.archived, file: rel, ...cls });
      sources[root.source]++;
    }
  }

  const byClass = aggregateByClass(records);
  const classCoverage = {};
  for (const cls of Object.keys(byClass)) classCoverage[cls] = byClass[cls].length;

  // compact route per class (the HOW), from the canonical policy
  const routes = {};
  for (const cls of Object.keys(TASK_CLASS_POLICY)) {
    const p = TASK_CLASS_POLICY[cls];
    routes[cls] = {
      ladder: p.substrateLadder, model: p.modelTier,
      commands: p.commands, avoid: p.antipattern,
    };
  }

  const out = {
    schemaVersion: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    note: "Per-command route-class plan (U-SLASH-PLANS). Every slash command mapped to its TASK_CLASS_POLICY route via classifyRoutingClass. Consumed by prompt-route-inject (class-specific command surfacing) + --query CLI.",
    total: records.length,
    distinctNames: new Set(records.map((r) => r.name)).size,
    sources,
    truncatedFrontmatter: truncatedFiles.length,
    classCoverage,
    routes,
    byClass,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const cov = Object.entries(classCoverage).sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c}:${n}`).join("  ");
  console.log(`slash-command-plans: ${out.total} commands (${out.distinctNames} distinct) | project ${sources.project} user ${sources.user} archive ${sources.archive}`);
  console.log(`classCoverage  ${cov}`);
  if (truncatedFiles.length) console.warn(`WARN ${truncatedFiles.length} file(s) with frontmatter > ${HEAD_BYTES}B (raise HEAD_BYTES): ${truncatedFiles.slice(0, 5).join(", ")}`);
  console.log(`-> ${OUT}`);
}

// ---- query mode ------------------------------------------------------------

/**
 * Pure: resolve a --query arg against the plan. A leading "/" means the operator
 * meant a COMMAND, so search commands first (a bare class name like "learn"/"quote"
 * that also exists as a command would otherwise always resolve to the class and
 * shadow the command). A bare arg resolves class-first (back-compat), then command.
 * Returns { kind: "class"|"command"|"none", cls?, cmd?, q }.
 */
export function resolveQuery(plan, arg) {
  const rawArg = String(arg || "").trim();
  const looksCommand = rawArg.startsWith("/");
  const q = rawArg.replace(/^\//, "").trim();
  const byClass = (plan && plan.byClass) || {};
  if (!q) return { kind: "none", q };
  const findCmd = () => {
    for (const [cls, cmds] of Object.entries(byClass)) {
      const hit = (cmds || []).find((c) => c.name === q);
      if (hit) return { kind: "command", cls, cmd: hit, q };
    }
    return null;
  };
  if (looksCommand) return findCmd() || (byClass[q] ? { kind: "class", cls: q, q } : { kind: "none", q });
  if (byClass[q]) return { kind: "class", cls: q, q };
  return findCmd() || { kind: "none", q };
}

function query(arg) {
  let plan;
  try { plan = JSON.parse(fs.readFileSync(OUT, "utf8")); }
  catch { console.error(`no plan at ${OUT} -- run the generator first`); process.exit(1); }
  const r = resolveQuery(plan, arg);
  if (r.kind === "class") {
    const route = plan.routes[r.cls] || {};
    console.log(`# class: ${r.cls}  (${plan.byClass[r.cls].length} commands)`);
    if (route.ladder) console.log(`route: ${route.ladder.join(" -> ")} | model: ${route.model}`);
    for (const c of plan.byClass[r.cls]) console.log(`  /${c.name}${c.archived ? " [archived]" : ""} -- ${c.when || "(no description)"}`);
    return;
  }
  if (r.kind === "command") {
    console.log(`/${r.cmd.name}  ->  class: ${r.cls}`);
    console.log(`when: ${r.cmd.when || "(no description)"}`);
    const route = plan.routes[r.cls] || {};
    if (route.ladder) console.log(`how:  ${route.ladder.join(" -> ")} | model: ${route.model} | cmds: ${(route.commands || []).join(" ")}`);
    return;
  }
  console.error(`no class or command "${r.q}" in the plan`);
  process.exit(1);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("build-slash-command-plans.mjs");
if (isMain) {
  const qi = process.argv.indexOf("--query");
  if (qi >= 0) query(process.argv[qi + 1]);
  else main().catch((e) => { console.error("build-slash-command-plans failed:", e?.message || e); process.exit(1); });
}
