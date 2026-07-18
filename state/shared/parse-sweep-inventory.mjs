#!/usr/bin/env node
/**
 * Parse the sharded vitest sweep logs into a triaged failing-test inventory.
 * Reads state/shared/test-sweep-shards/shard-*.log (+ .done markers), extracts
 * failing test files, dedups, classifies each by failure-nature + domain-owner,
 * and emits a markdown + JSON inventory for india triage.
 *
 * Usage: node state/shared/parse-sweep-inventory.mjs   (pure fs; no child_process)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";

const DIR = "H:/prism/state/shared/test-sweep-shards";
const OUT_MD = "H:/prism/state/shared/SWEEP-INVENTORY.md";
const OUT_JSON = "H:/prism/state/shared/SWEEP-INVENTORY.json";

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");

// filename -> domain owner (heuristic keyword map; first match wins)
const DOMAIN_RULES = [
  [/gnn|graphsage|lora|\brag\b|consensus|octopus|neural|deeplearn|deep-learn|reinforcement|policygradient|ewc|episodic|conformal|calibrat|ensemble|metatuner|meta-tune|reward|drift|selfimprov|self-improv|knowledgegraph|embedding|hnsw|agentdb/i, "india/ai-training"],
  [/cad|step|brep|geometry|mesh|tolerancecallout|electrode|trilobe|blisk|drawanypart/i, "delta/cad"],
  [/\bcam\b|camx|powermill|hypermill(?!turning)|mastercam|toolpath|strategy|esprit|fusion360|5axis|fiveaxis/i, "kilo/cam"],
  [/speedfeed|speed-feed|sfc|chatter|stability|kienzle|merchant|taylor|deflection|cuttingforce|surfacefinish|thermal|toollife|wear/i, "oscar/speed-feed"],
  [/lathe|turning|okuma|g96|g50|partoff|boringbar/i, "whiskey/lathe"],
  [/wedm|wire-?edm|sinkeredm|edmprogram/i, "mike/wedm"],
  [/post(processor|gen|nc)|masterpost|hurco|haasngc|fanuclegacy|siemenslegacy|dialect|gcode(emit|understanding)/i, "echo/post-processor"],
  [/grinding|grind/i, "oscar/grinding"],
  [/quote|quoting|costestimat|jobcost|docustrata|bidwin|pricing/i, "charlie/quoting"],
  [/erp|business|payroll|invoic|accounting|customerport|hr|gl\b|creditmemo|araging/i, "hotel/business"],
  [/cmm|metrology|spc|qualitypredict|firstarticle|fai|gauge|gdt|inspection/i, "quality"],
  [/machinehandbook|machine-handbook|registry-load|database-expansion|jmdie.*corpus/i, "juliett/data"],
  [/blueprint|ocr|printreading|print-reading|visionextract/i, "xray/blueprint-vision"],
  [/probe/i, "probe(camx/echo)"],
  [/weeklysynthesis|memorydispatcher|obsidian|hermes|slot|chat-?bus|handoff|fleet/i, "fleet-infra"],
];

function classifyDomain(file) {
  const base = file.replace(/^.*\//, "");
  for (const [re, owner] of DOMAIN_RULES) if (re.test(base)) return owner;
  return "unclassified";
}

function natureFromContext(log, file) {
  const idx = log.indexOf(file);
  const around = idx >= 0 ? log.slice(idx, idx + 1200) : "";
  if (/Cannot find module|Failed to load|ERR_MODULE_NOT_FOUND/i.test(around)) return "load-error";
  if (/timed out|Test timed out|exceeded|ECONNREFUSED|ETIMEDOUT/i.test(around)) return "timeout(env)";
  if (/TypeError|Cannot read propert|is not a function|undefined/i.test(around)) return "type-error";
  if (/AssertionError|expected .* to|toBe|toEqual|toContain/i.test(around)) return "assertion";
  return "other";
}

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => /^shard-\d+\.log$/.test(f)) : [];
if (files.length === 0) {
  console.log("No shard logs yet at " + DIR);
} else {
  const failing = new Map();
  const shardSummary = [];
  const crashedShards = [];
  const FAIL_FILE = /(?:FAIL|❯)\s+(src\/__tests__\/[A-Za-z0-9_./-]+\.test\.ts)/g;

  for (const fn of files.sort((a, b) => (+a.match(/\d+/)) - (+b.match(/\d+/)))) {
    const shard = fn.match(/\d+/)[0];
    const log = strip(readFileSync(`${DIR}/${fn}`, "utf8"));
    const doneFile = `${DIR}/shard-${shard}.done`;
    const exit = existsSync(doneFile) ? (readFileSync(doneFile, "utf8").match(/exit=(-?\d+)/)?.[1] ?? "?") : "running";
    const crashed = exit === "139" || (!/Test Files\s+\d+/.test(log) && exit !== "running");
    if (crashed) crashedShards.push(`${shard}(exit ${exit})`);
    const sumMatch = log.match(/Test Files\s+([^\n]+)/);
    shardSummary.push({ shard, exit, crashed, summary: sumMatch ? sumMatch[1].trim() : "(no summary)" });

    for (const m of log.matchAll(FAIL_FILE)) {
      const f = m[1];
      if (!failing.has(f)) failing.set(f, { file: f, nature: natureFromContext(log, f), shards: [] });
      if (!failing.get(f).shards.includes(shard)) failing.get(f).shards.push(shard);
    }
  }

  const list = [...failing.values()].sort((a, b) => a.file.localeCompare(b.file));
  for (const f of list) f.domain = classifyDomain(f.file);

  const byDomain = {};
  const byNature = {};
  for (const f of list) {
    (byDomain[f.domain] ??= []).push(f.file);
    byNature[f.nature] = (byNature[f.nature] || 0) + 1;
  }

  const inventory = {
    generatedAt: new Date().toISOString(),
    shardsParsed: files.length,
    crashedShards,
    distinctFailingFiles: list.length,
    byNature,
    domainCounts: Object.fromEntries(Object.entries(byDomain).map(([k, v]) => [k, v.length])),
    shardSummary,
    failing: list,
  };
  writeFileSync(OUT_JSON, JSON.stringify(inventory, null, 2));

  let md = `# Full-suite sweep -- failing-test inventory\n\nGenerated: ${inventory.generatedAt}\n`;
  md += `Shards parsed: ${files.length} | crashed shards: ${crashedShards.join(", ") || "none"}\n`;
  md += `Distinct failing files: **${list.length}**\n\n`;
  md += `## By failure nature\n` + Object.entries(byNature).map(([k, v]) => `- ${k}: ${v}`).join("\n") + "\n\n";
  md += `## By domain owner\n` + Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `- **${k}**: ${v.length}`).join("\n") + "\n\n";
  md += `## Failing files (by domain)\n`;
  for (const [dom, fs2] of Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length)) {
    md += `\n### ${dom} (${fs2.length})\n`;
    for (const f of fs2) {
      const rec = list.find((x) => x.file === f);
      md += `- \`${f}\` -- ${rec.nature} [shards ${rec.shards.join(",")}]\n`;
    }
  }
  writeFileSync(OUT_MD, md);
  console.log(`Inventory: ${list.length} distinct failing files across ${files.length} shards.`);
  console.log(`Crashed shards: ${crashedShards.join(", ") || "none"}`);
  console.log(`Domains: ${JSON.stringify(inventory.domainCounts)}`);
  console.log(`Nature: ${JSON.stringify(byNature)}`);
  console.log(`Written: ${OUT_MD} + ${OUT_JSON}`);
}
