#!/usr/bin/env node
// scripts/generate-code-surface-plots.mjs
// -----------------------------------------
// SEARCH-PREPLOT (slot:alpha): pre-plot PRISM's three big code surfaces so
// "where is X / which thing does Y" resolves from a cache instead of a live
// grep over thousands of files:
//   - engines  (mcp-server/src/engines/*.ts, flat, name-classified to a galaxy)
//   - scripts  (scripts/**/*.mjs)
//   - hooks    (.claude/hooks/*.mjs, with harness trigger)
//
// Output (state/shared/search-plots/):
//   _engines.json { surface, count, byDomain:{<galaxy>:n}, entries:[{name,file,domain,purpose,exports}] }
//   _scripts.json { surface, count, entries:[{name,file,purpose,exports}] }
//   _hooks.json    { surface, count, entries:[{name,file,trigger,purpose,exports}] }
//
// Deterministic + re-runnable + fail-soft per file. Purpose = first meaningful
// top-of-file comment; trigger (hooks) = first harness event; domain (engines)
// = name-prefix galaxy classification (unmatched -> "shared").
// Usage: node scripts/generate-code-surface-plots.mjs [--json]
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const OUT_DIR = path.join(ROOT, "state/shared/search-plots");

const HOOK_EVENTS = [
  "PreToolUse", "PostToolUse", "UserPromptSubmit", "SessionStart",
  "Stop", "SubagentStop", "SubagentStart", "PreCompact", "Notification",
];
const SKIP_COMMENT = /^\s*(#!|\/\/\s*(tier:|eslint|@ts-|prettier|biome))/i;
// Purpose-line separators: hyphen, colon, en-dash, em-dash (last two as ASCII
// escapes so this source stays ASCII-clean per the encoding guard).
const PURPOSE_SEP = new RegExp("^\\s*//\\s*[\\w.-]+\\.(?:mjs|ts)\\s*[-:\\u2013\\u2014]\\s*(.+)$");

// Engine-name -> galaxy classifier. ORDER MATTERS (specific before general:
// CAM/HYPERMILL before MILL; blueprint-vision before cad). Unmatched -> "shared".
const GALAXY_PATTERNS = [
  ["cam", /^(cam|mastercam|hypermill|esprit|powermill|toolpath|solidcam|edgecam|nxcam|catia.*cam|fusion.*cam)/i],
  ["wedm", /^(wedm|wireedm|edm|sinker|spark|wirepath|wireguide|discharge)/i],
  ["lathe", /^(lathe|turning|groove|thread(?!mill)|chuck|swiss|tailstock|barfeed)/i],
  ["mill", /^(mill|milling|vmc|facemill|endmill)/i],
  ["speed-feed", /^(speedfeed|kienzle|taylor|merchant|cuttingforce|feedspeed|chipload|altintas|toollife)/i],
  ["post-processor", /^(post|controller|gcode|fanuc|okuma|haas|siemens|heidenhain|mazak|masterpost|dialect)/i],
  ["blueprint-vision", /^(ocr|blueprintvision|vision|pdf|printread|imageextract|drawingparse)/i],
  ["cad", /^(cad|step|geometry|feature|electrode|blueprint|nurbs|sketch|solid|brep|tessell|trilobe)/i],
  ["quoting", /^(quote|quoting|cost|pricing|estimat|bid|docustrata|margin)/i],
  ["business", /^(erp|payroll|accounting|invoice|customer|vendor|crm|employee|legal|p2p|hr[a-z])/i],
  ["quality", /^(quality|cpk|spc|cmm|inspection|tolerance|gdt|gdnt|sigma)/i],
  ["shop-floor", /^(shopfloor|machinestatus|machinemonitor|oee|mtconnect|spindlelive)/i],
  ["academy", /^(academy|course|curriculum|lesson|certif|instructor|mitocw|mitcourse)/i],
  ["ai-training", /^(metalearning|deeplearning|ultraintelligence|lora|rag|gnn|graphsage|neural|reinforce)/i],
  ["database-expansion", /^(qdrant|sqlite|persist|migration|memoryengine|datastore)/i],
  ["agent-orchestration", /^(orchestr|swarm|agentcoord|coordinat)/i],
  ["fleet-hygiene", /^(reaper|janitor|zombie|orphan|cleanup|fleetmemory)/i],
  ["wiring", /^(wiring|dispatcherwire|autowire)/i],
  ["discovery", /^(discover|duplication|orphaninventory|masterindex)/i],
  ["tribal-knowledge", /^(tribal|knowledgetip|shopwisdom)/i],
  ["system-viz", /^(systemviz|regenviz|vizgraph)/i],
  ["token-optimization", /^(token|ollama|rtk|cagrouter|contextbudget)/i],
];
function classifyGalaxy(nameNoExt) {
  for (const [g, re] of GALAXY_PATTERNS) if (re.test(nameNoExt)) return g;
  return "shared";
}

/** Walk a dir for files with the given extension. */
function listFiles(dir, { recursive = false, ext = ".mjs" } = {}) {
  const out = [];
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive && !/^(node_modules|__tests__|\.|bundles)$/.test(e.name)) {
        out.push(...listFiles(full, { recursive, ext }));
      }
      continue;
    }
    if (e.isFile() && e.name.endsWith(ext) && !e.name.endsWith(".test" + ext) && !e.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function extractPurpose(head) {
  const lines = head.split(/\r?\n/).slice(0, 40);
  for (const ln of lines) {
    const m = ln.match(PURPOSE_SEP);
    if (m && m[1].trim().length > 4) return m[1].trim().slice(0, 200);
  }
  for (const ln of lines) {
    if (SKIP_COMMENT.test(ln)) continue;
    const m = ln.match(/^\s*(?:\/\/|\*)\s+(.{8,})$/);
    if (m) {
      const t = m[1].trim();
      if (!/^[-=_*]{3,}$/.test(t) && !/^@/.test(t)) return t.slice(0, 200);
    }
  }
  return "";
}

function extractTrigger(head) {
  const window = head.slice(0, 2000);
  for (const ev of HOOK_EVENTS) {
    if (new RegExp(`\\b${ev}\\b`).test(window)) return ev;
  }
  return "";
}

function extractExports(text) {
  const names = new Set();
  const re = /export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) { names.add(m[1]); if (names.size >= 12) break; }
  return [...names];
}

function buildSurface(label, files) {
  const entries = [];
  for (const full of files) {
    let text = "";
    try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
    const head = text.slice(0, 4000);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    const base = path.basename(full);
    const entry = { name: base, file: rel };
    if (label === "engines") entry.domain = classifyGalaxy(base.replace(/\.[^.]+$/, ""));
    if (label === "hooks") entry.trigger = extractTrigger(head);
    entry.purpose = extractPurpose(head);
    const exp = extractExports(text);
    if (exp.length) entry.exports = exp;
    entries.push(entry);
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const surface = { surface: label, count: entries.length, generatedAt: null };
  if (label === "engines") {
    const byDomain = {};
    for (const e of entries) byDomain[e.domain] = (byDomain[e.domain] || 0) + 1;
    surface.byDomain = byDomain;
  }
  surface.entries = entries;
  return surface;
}

function main() {
  const engines = buildSurface("engines", listFiles(path.join(ROOT, "mcp-server/src/engines"), { ext: ".ts" }));
  const scripts = buildSurface("scripts", listFiles(path.join(ROOT, "scripts"), { recursive: true, ext: ".mjs" }));
  const hooks = buildSurface("hooks", listFiles(path.join(ROOT, ".claude/hooks"), { ext: ".mjs" }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, data] of [["_engines", engines], ["_scripts", scripts], ["_hooks", hooks]]) {
    const tmp = path.join(OUT_DIR, `${name}.json.tmp`);
    const dst = path.join(OUT_DIR, `${name}.json`);
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
    fs.renameSync(tmp, dst);
  }

  const wp = (s) => s.entries.filter((e) => e.purpose).length;
  const domains = Object.keys(engines.byDomain || {}).length;
  const shared = (engines.byDomain || {}).shared || 0;
  const out = {
    engines: { count: engines.count, withPurpose: wp(engines), domains, sharedBucket: shared },
    scripts: { count: scripts.count, withPurpose: wp(scripts) },
    hooks: { count: hooks.count, withPurpose: wp(hooks), withTrigger: hooks.entries.filter((e) => e.trigger).length },
  };
  if (process.argv.includes("--json")) process.stdout.write(JSON.stringify(out) + "\n");
  else process.stdout.write(
    `engines: ${out.engines.count} (purpose ${out.engines.withPurpose}, ${domains} domains, shared ${shared}) | ` +
    `scripts: ${out.scripts.count} (purpose ${out.scripts.withPurpose}) | ` +
    `hooks: ${out.hooks.count} (purpose ${out.hooks.withPurpose}, trigger ${out.hooks.withTrigger})\n`);
}

main();
