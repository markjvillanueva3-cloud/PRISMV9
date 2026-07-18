#!/usr/bin/env node
/**
 * cam-knowledge-index.mjs — compile ALL CAM-domain wiki + tribal + file paths into one index (slot:kilo)
 *
 * The "compile all relevant wiki and tribal knowledge + wire all file paths for quicker
 * search/usability" surface. Enumerates every CAM-relevant wiki leaf (precise filename-token
 * filter — NOT broad substring, which false-matches camera/campaign), the tribal sources
 * (928-tip corpus + RAG index), and the key CAM file paths, into a single auto-invokable index.
 *
 * Output: state/shared/CAM-KNOWLEDGE-INDEX.md (+ .json sidecar).
 * Auto-invoked: referenced by cam/MEMORY.md (galaxy brain) + the awareness snapshot; a kilo
 * session gets the full CAM knowledge map without re-globbing.
 *
 * Design: root from script location (worktree AND post-merge); fs-only (no child_process, no
 * Ollama); fail-soft per section (R12). Deterministic except generatedAt.
 *
 * CLI: node scripts/cam-knowledge-index.mjs           # write the index
 *      node scripts/cam-knowledge-index.mjs --stdout  # print, do not write
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WIKI = path.join(ROOT, "knowledge", "wiki");
const TRIBAL_CORPUS = path.join(ROOT, "state", "shared", "corpus", "cam-tribal-tips.jsonl");
const TRIBAL_RAG = path.join(ROOT, "mcp-server", "data", "state", "CAM_TRIBAL_RAG_INDEX.json");
const OUT_MD = path.join(ROOT, "state", "shared", "CAM-KNOWLEDGE-INDEX.md");
const OUT_JSON = path.join(ROOT, "state", "shared", "CAM-KNOWLEDGE-INDEX.json");

// Precise CAM-domain filename tokens (multi-char vendor/strategy terms are substring-safe;
// "cam"/"cad-cam" require a delimiter boundary so camera/campaign/scam don't match).
// CAM-specific only: toolpath STRATEGY + CAM SYSTEMS. Deliberately EXCLUDES generic
// milling/machining/fixture/fusion360/5axis (those overlap the mill domain = foxtrot, and
// general machining) — a CAM knowledge index must stay CAM, not absorb the mill galaxy.
const MULTI_TOKENS = [
  "toolpath", "hypermill", "mastercam", "inventorcam", "powermill", "nxcam", "nx-cam",
  "solidcam", "esprit", "gibbscam", "bobcad", "cimatron", "worknc", "camworks", "featurecam",
  "edgecam", "sprutcam", "camfunction", "swarf", "trochoidal", "waterline", "scallop",
  "adaptive-clearing", "rest-machining",
];
const DENY = ["camera", "campaign", "scam", "camp-", "scamper"];

function isCamWiki(base) {
  const n = base.toLowerCase();
  if (DENY.some((d) => n.includes(d))) return false;
  if (MULTI_TOKENS.some((t) => n.includes(t))) return true;
  // boundary-delimited "cam" (cam-*, *-cam, cad-cam)
  return /(^|[-_.])cam([-_.]|$)/.test(n);
}

function walk(dir) {
  let out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Auto-generated wiki subtrees (per-action / per-combo / per-frontend reference) — voluminous
// machine-gen, covered by DISPATCHER_DIGEST; a CURATED knowledge index excludes them.
const EXCLUDE_DIR_RE = /(^|\/)(actions|combos|frontends)\//;

function collectWiki() {
  const files = walk(WIKI).filter((f) => {
    const rel = path.relative(WIKI, f).replace(/\\/g, "/");
    return !EXCLUDE_DIR_RE.test(rel) && isCamWiki(path.basename(f, ".md"));
  });
  // group by top-level wiki subdir (architecture / code-tribal / lessons / training / ...)
  const groups = {};
  for (const f of files) {
    const rel = path.relative(WIKI, f).replace(/\\/g, "/");
    const dir = path.posix.dirname(rel);
    const group = dir === "." ? "_root" : dir;
    (groups[group] ||= new Set()).add(rel);
  }
  // Set→sorted array, dedupe
  const out = {};
  let total = 0;
  for (const g of Object.keys(groups).sort()) {
    out[g] = [...groups[g]].sort();
    total += out[g].length;
  }
  return { groups: out, total };
}

function countLines(p) {
  try { return readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).length; } catch { return null; }
}
function sizeOf(p) {
  try { return statSync(p).size; } catch { return null; }
}

function collect() {
  const wiki = collectWiki();
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    wiki,
    tribal: {
      corpusTips: countLines(TRIBAL_CORPUS),
      corpusBytes: sizeOf(TRIBAL_CORPUS),
      ragIndexBytes: sizeOf(TRIBAL_RAG),
    },
  };
}

function renderMd(d) {
  const L = [];
  L.push("# 📚 CAM Knowledge Index (slot:kilo — compiled wiki + tribal + paths)");
  L.push("");
  L.push(`_Generated ${d.generatedAt} · regen: \`node scripts/cam-knowledge-index.mjs\` · the one-stop CAM knowledge map for fast search._`);
  L.push("");
  L.push("## Tribal knowledge");
  const t = d.tribal;
  L.push(`- **Catalog tribal corpus:** \`state/shared/corpus/cam-tribal-tips.jsonl\` — ${t.corpusTips ?? "?"} real-data tips (regen \`node scripts/emit-cam-tribal-tips.mjs\`, MCP/Ollama-free).`);
  L.push(`- **Tribal RAG index:** \`mcp-server/data/state/CAM_TRIBAL_RAG_INDEX.json\` (${t.ragIndexBytes ? Math.round(t.ragIndexBytes / 1e6) + "M" : "?"}).`);
  L.push("- **Dev-pattern tribal:** `mcp-server/src/engines/cam/GSD.md` §4 (wiring/security-hook/cwd gotchas) + [[reference_kilo_cam_gsd_2026_05_29]].");
  L.push("- **Per-prompt surfacing:** `.claude/hooks/tribal-by-domain-inject.mjs` (top-3 CAM tribal by domain).");
  L.push("");
  L.push(`## CAM wiki entries (${d.wiki.total} leaves)`);
  for (const g of Object.keys(d.wiki.groups)) {
    L.push(`### ${g} (${d.wiki.groups[g].length})`);
    for (const rel of d.wiki.groups[g]) L.push(`- [[${path.basename(rel, ".md")}]] · \`knowledge/wiki/${rel}\``);
    L.push("");
  }
  L.push("## Key CAM file paths (full atlas: `mcp-server/src/engines/cam/PATHS.md`)");
  L.push("- **Galaxy brain:** `mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT,GSD}.md`");
  L.push("- **Dispatchers:** `mcp-server/src/tools/dispatchers/{camDispatcher,camFunctionDispatcher,toolpathDispatcher}.ts`");
  L.push("- **Engines:** `mcp-server/src/engines/CAM*.ts` (99) · `HyperMill*.ts` (61) · `engines/hypermill/*.ts` (17) · `engines/cam/` (galaxy)");
  L.push("- **State:** `mcp-server/data/state/CAM_{VENDOR_REGISTRY,AI_ACTIONS_INDEX,TRIBAL_RAG_INDEX,ML_DRIFT_LOG}.json` · `cad-cam-resources-pdf-index.json`");
  L.push("- **Awareness:** `state/shared/CAM-AWARENESS-SNAPSHOT.md` (regen `cam-awareness-snapshot.mjs`) · verify `cam-galaxy-verify.mjs`");
  L.push("- **Skills:** `/cam-route-kilo` · `/cam-context` · `/cam-strategy*` · vendor guides (`/mastercam-*`, `/hypermill-*`, `/nx-cam-*`, …)");
  L.push("- **JM Die CAM corpus:** `JM DIE/FUSION CAD AND CAM FILES/` · `JM DIE/ROKU-ROKU/CAM TEMPLATES` · `JM DIE/OKUMA/hyperCAD-S and hyperMILL Online Training`");
  L.push("");
  L.push("_Auto-invoked: referenced from cam/MEMORY.md (galaxy brain) + surfaced via the awareness snapshot. Query `/wiki-query <name>` for any entry above._");
  return L.join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const d = collect();
  const md = renderMd(d);
  if (argv.includes("--stdout")) {
    process.stdout.write(md + "\n");
  } else {
    writeFileSync(OUT_MD, md + "\n", "utf8");
    writeFileSync(OUT_JSON, JSON.stringify(d, null, 2) + "\n", "utf8");
    process.stdout.write(`[cam-knowledge-index] wrote ${path.relative(ROOT, OUT_MD)} — ${d.wiki.total} wiki leaves, ${d.tribal.corpusTips ?? "?"} tribal tips\n`);
  }
}

try {
  main();
} catch (e) {
  process.stderr.write(`[cam-knowledge-index] ${e?.message || e}\n`);
  process.exit(1);
}
