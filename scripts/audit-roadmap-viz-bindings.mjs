#!/usr/bin/env node
/**
 * audit-roadmap-viz-bindings.mjs — re-runnable roadmap↔system-viz binding auditor
 *
 * Emitted by /forge-audit-v2 (BACKEND-DEVTOOLS-RGS6 audit, 2026-05-11) as the
 * compounding-gains META artifact. Re-run after any RGS pass that emits or edits
 * atomized roadmap specs to keep drift bounded.
 *
 * What it measures, for a glob of atomized roadmap specs:
 *   1. viz_node_id resolution — every `viz_node_id: \`<id>\`` is classified:
 *        RESOLVES        — <id> is a live node in system-graph.json
 *        TBD-OK          — tagged (TBD-create|TBD-add|TBD), prefix matches the graph's taxonomy
 *        TBD-BAD-NS      — tagged TBD-* but the prefix is NOT a real graph namespace (invented)
 *        EXISTS-MISLABEL — tagged TBD-create but a live node ALREADY exists for that engine/asset
 *        GHOST-CANDIDATE — should be a ghost.ms.<milestone>.<unit> node, isn't
 *        UNRESOLVED      — tagged "existing/extend" but no live node matches
 *   2. dependency-reference hygiene — every `depends_on:`/`blocks:` token is classified:
 *        OK              — resolves to a known unit header (this file or another in the glob)
 *        DANGLING        — names a unit id with no header anywhere in the glob
 *        RANGE           — uses `..` range notation (not machine-expandable)
 *        MILESTONE       — names a whole milestone, not a unit
 *        PROSE           — free-text ("U-X from MILESTONE-Y", "all K2-CLOUD")
 *        CROSS-FORM      — resolves but via a non-canonical form (bare `H1` vs `U-H1`, etc.)
 *   3. internal duplication — engine/hook/script names that appear as a BUILD target in >1 unit
 *   4. tier-floor — any unit whose `tier:` < the `tier:` of one of its declared deps
 *   5. closes_synergy_edge binding — fraction of edges whose two surfaces both appear in the
 *      10-surface synergy matrix (system-viz/memories/wiki/tribal/neural/docker/hooks/skills/
 *      dispatchers/handoffs); the rest are "unbound vocabulary"
 *   6. verifies_via.tool invocability — every unit's verification channel head is classified:
 *        RUNNABLE / MCP-ROUNDTRIP (a `prism_*:action` form, valid in a Claude/MCP context)
 *        UNRUNNABLE-MCP-CALL (cites `mcp-call …` — not a real command in this repo; the ONLY
 *          verify-tool class that counts toward EXIT-FAILS)
 *        PENDING-SCRIPT (`node scripts/…mjs` whose file doesn't exist yet — expected when the
 *          unit itself creates that script; tracked, not failed)
 *        PROSE-CHANNEL / UNKNOWN-HEAD / NONE
 *      (added after this script's own peer review caught 9 units citing a non-existent `mcp-call`)
 *
 * Usage:
 *   node scripts/audit-roadmap-viz-bindings.mjs [--glob '<glob>'] [--json] [--graph <path>]
 *   node scripts/audit-roadmap-viz-bindings.mjs --self-test
 *
 * Defaults: glob = state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-2026-05-10.md
 *           graph = state/shared/system-viz/system-graph.json
 * Exit code = total count of {TBD-BAD-NS + EXISTS-MISLABEL + UNRESOLVED + DANGLING + RANGE +
 *             MILESTONE + tier-floor violations + internal-duplication groups} (0 = clean).
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { streamGraphArray, exceedsStringParseCap } from './lib/graph-io.mjs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const AS_JSON = flag('--json');
const SELF_TEST = flag('--self-test');
const GLOB = opt('--glob', 'state/shared/specs/atomized/BACKEND-DEVTOOLS-RGS6-*-ATOMIZED-2026-05-10.md');
const GRAPH_PATH = opt('--graph', 'state/shared/system-viz/system-graph.json');

// --- the 10-surface synergy matrix vocabulary (from scripts/system-synergy-map.mjs) ---
const SYNERGY_SURFACES = new Set([
  'system-viz', 'memories', 'wiki', 'tribal', 'neural', 'docker', 'hooks', 'skills', 'dispatchers', 'handoffs',
]);

// --- graph namespace taxonomy: top-level prefixes that legitimately exist ---
// (engines: eng.<domain>.<name>; scripts: script.<name>; skills: skill.<name>; registries: reg.<name>;
//  claude hooks: core.hooks_cl.<name>; source hooks: core.hooks_src.<name>; physics: core.physics.<name>;
//  algos: core.algos.<name>; tests: core.tests.<name>; fs: fs.deep.* / fs.h.*; wiring: wire.*; state: state.*;
//  ghost placeholders: ghost.*; frontend: frontend.* / fe.page.*; dispatcher actions: disp.<x>.action.<y>)
const REAL_TOP_PREFIXES = new Set([
  'eng', 'disp', 'core', 'fs', 'wire', 'state', 'ghost', 'frontend', 'fe', 'skill', 'script', 'reg',
  'wiki', 'vault', 'memory_user', 'memory_project', 'memory_reference', 'memory_feedback', 'mem', 'alg',
  'datacat', 'schema', 'ppg', 'test', 'extract', 'tr', 'p', 'jmdie', 'formula', 'combo', 'kn',
  'boxextract', 'memory_uncategorized', 'memory__index',
]);
// invented namespaces seen in the RGS6 roadmap that are NOT graph prefixes
const KNOWN_INVENTED_NS = [
  'core.engine.', 'core.hooks.', 'core.hook.', 'core.script.', 'core.web.', 'core.css.', 'core.js.',
  'core.cron.', 'core.mcp.', 'core.skill.', 'core.helper.', 'core.dispatch.', 'core.dispatcher.',
  'core.registry.', 'core.plugin.', 'eng.system.', 'eng.coordination.', 'external.devtool.', 'external.mcp.',
];

function loadGraphNodeIndex(graphPath) {
  const abs = resolve(REPO, graphPath);
  if (!existsSync(abs)) return { ids: new Set(), engineStems: new Map(), prefixes: new Set(), ghostPfx: false };
  const ids = new Set();
  const engineStems = new Map(); // stem -> [node ids]   (stem = lc engine name minus trailing "engine")
  const prefixes = new Set();
  const processNode = (n) => {
    const id = String(n && n.id != null ? n.id : '').toLowerCase();
    if (!id) return;
    ids.add(id);
    prefixes.add(id.split('.', 1)[0]);
    if (id.startsWith('eng.')) {
      const last = id.split('.').pop();
      const stem = last.replace(/engine$/, '');
      if (stem.length >= 4) {
        if (!engineStems.has(stem)) engineStems.set(stem, []);
        engineStems.get(stem).push(n.id);
      }
    }
  };
  // GRAPH-READ SAFETY (U-VIZ-ROADMAP-BIGREAD): the merged system-graph.json is ~765MB
  // -- over Node's UTF-8 string cap (0x1fffffe8 ~512MB) -- so JSON.parse(readFileSync(
  // ...,'utf8')) throws ERR_STRING_TOO_LONG. Stream the top-level `nodes` array
  // (projection, low memory) when over the cap; full-parse small fixture/curated
  // graphs (possibly the nested {graph:{nodes}} shape the streamer does not cover).
  if (exceedsStringParseCap(statSync(abs).size)) {
    streamGraphArray(abs, 'nodes', processNode);
  } else {
    const g = JSON.parse(readFileSync(abs, 'utf8'));
    const nodes = g.nodes || g.graph?.nodes || [];
    for (const n of nodes) processNode(n);
  }
  return { ids, engineStems, prefixes, ghostPfx: ids.has('ghost.planned_features') || [...ids].some(x => x.startsWith('ghost.')) };
}

function listSpecFiles(glob) {
  // glob is "<dir>/<prefix>*<suffix>" — expand the single * manually (no glob dep)
  const slash = glob.lastIndexOf('/');
  const dir = resolve(REPO, slash >= 0 ? glob.slice(0, slash) : '.');
  const pat = slash >= 0 ? glob.slice(slash + 1) : glob;
  const star = pat.indexOf('*');
  const pre = star >= 0 ? pat.slice(0, star) : pat;
  const suf = star >= 0 ? pat.slice(star + 1) : '';
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith(pre) && f.endsWith(suf) && (star >= 0 || f === pat))
    .map((f) => resolve(dir, f))
    .sort();
}

const UNIT_HDR_RE = /^##+\s+(U-[A-Za-z0-9.\-]+|H[0-9.]+|K2-K[0-9]+|HC-[0-9]+|OB-[0-9]+|U-OB-[0-9]+)\b/;
const VIZ_RE = /^\s*-?\s*viz_node_id:\s*`([^`]+)`\s*(\(([^)]*)\))?/;
const TIER_RE = /^\s*-?\s*tier:\s*T?(\d)/i;
const DEPS_RE = /^\s*-?\s*depends_on:\s*\[(.*?)\]/;
const BLOCKS_RE = /^\s*-?\s*blocks:\s*\[(.*?)\]/;
const SYN_RE = /^\s*-?\s*closes_synergy_edge:\s*(.+?)\s*$/;
const BUILD_TITLE_RE = /^##+\s+\S+\s+—\s+Build\s+`([^`]+)`/i;
const VERIFIES_VIA_RE = /^\s*-?\s*verifies_via:\s*$/;
const VERIFY_TOOL_RE = /^\s*-?\s*tool:\s*(.+?)\s*$/;

function parseSpec(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const units = [];
  let cur = null;
  let inVerifiesVia = false;
  for (const L of lines) {
    const h = L.match(UNIT_HDR_RE);
    if (h) {
      cur = { id: h[1], file: basename(path), tier: null, viz: null, vizNote: null, deps: [], blocks: [], synergy: null, buildTarget: null, verifyTool: null, headerLine: L };
      const bt = L.match(BUILD_TITLE_RE);
      if (bt) cur.buildTarget = bt[1];
      units.push(cur);
      inVerifiesVia = false;
      continue;
    }
    if (!cur) continue;
    let m;
    if (VERIFIES_VIA_RE.test(L)) { inVerifiesVia = true; continue; }
    if (inVerifiesVia && cur.verifyTool == null && (m = L.match(VERIFY_TOOL_RE))) { cur.verifyTool = m[1].replace(/^`|`$/g, '').trim(); inVerifiesVia = false; continue; }
    if ((m = L.match(TIER_RE))) cur.tier = Number(m[1]);
    else if ((m = L.match(VIZ_RE))) { cur.viz = m[1]; cur.vizNote = (m[3] || '').trim().toLowerCase(); }
    else if ((m = L.match(DEPS_RE))) cur.deps = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    else if ((m = L.match(BLOCKS_RE))) cur.blocks = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    else if ((m = L.match(SYN_RE))) cur.synergy = m[1];
  }
  return units;
}

// commands known to exist in this repo's harness (PATH tools + repo scripts + MCP-roundtrip forms)
const KNOWN_VERIFY_HEADS = new Set([
  'node', 'npx', 'npm', 'pnpm', 'cd', 'grep', 'cat', 'git', 'gh', 'bash', 'sh', 'curl', 'wget', 'tail', 'head',
  'ls', 'find', 'echo', 'jq', 'sed', 'awk', 'rtk', 'claude', 'crontab', 'tsc', 'vitest', 'docker', 'kubectl', 'E2E',
]);
function classifyVerifyTool(tool) {
  if (!tool) return { class: 'NONE', detail: 'no verifies_via.tool line found' };
  const t = tool.replace(/^E2E\s*[—-]\s*/i, '').trim();
  // MCP dispatcher round-trip (e.g. `prism_dev:skill_test {...}`, `round-trip MCP prism_ai:kimi_invoke`) — valid in a Claude/MCP context
  if (/\bprism_[a-z_]+:\w+/.test(t) || /\bround-trip\s+MCP\b/i.test(t)) return { class: 'MCP-ROUNDTRIP', detail: t };
  // explicit non-existent invented harness
  if (/^mcp-call\b/.test(t) || /\bmcp-call\s+\w/.test(t)) return { class: 'UNRUNNABLE-MCP-CALL', detail: `cites "mcp-call" — not a real command (not on PATH, no script, undocumented)` };
  // prose-only channel (no command at all — starts with a capital letter sentence, no shell head)
  const head = t.replace(/^[`"']/, '').split(/[\s|&]/)[0].replace(/[`"';]/g, '');
  if (KNOWN_VERIFY_HEADS.has(head)) {
    // node <path> into scripts/* whose file doesn't exist yet — expected for a roadmap unit that
    // CREATES that script; the unit's `baseline:` should say "script does not exist". Not a FAIL,
    // but tracked so a v2 pass can confirm each landed.
    const m = t.match(/\bnode\s+(?:-e\s+)?["'`]?((?:scripts|mcp-server\/scripts|\.claude\/scripts)\/[\w./-]+\.mjs)/);
    if (m && !existsSync(resolve(REPO, m[1]))) return { class: 'PENDING-SCRIPT', detail: `node ${m[1]} — to be created by this unit` };
    return { class: 'RUNNABLE', detail: head };
  }
  // looks like prose, not a command
  if (/^[A-Z]/.test(head) && head.length > 3 && !/[/.]/.test(head)) return { class: 'PROSE-CHANNEL', detail: t.slice(0, 80) };
  return { class: 'UNKNOWN-HEAD', detail: `unrecognised command head "${head}" in: ${t.slice(0, 80)}` };
}

const KNOWN_MS_RE = /^(HOOK-SYNERGY|K2-CLOUD|HTML-COMPANION|HTML-PRIMARY|OBSIDIAN|KNOWLEDGE-VAULT|WIKI-EVOLVE|LOOP-MIGRATE|COST-CASCADE|MACHINE-CONNECTIVITY|GRAPH-AS-LLM-CONTEXT|HOOKS-AUTOMATION|OCTOPUS-NEURAL|AUTO-LEARNING|TOOL-INVENTORY|SKILLS-UTILIZATION)/i;

function normDepToken(tok) {
  let s = tok.replace(/\(.*?\)/g, '').trim();
  if (/\.\./.test(s)) return { kind: 'RANGE', value: s };
  const ns = s.replace(/.*::/, '').trim();           // strip "MILESTONE::"
  const fromStripped = ns.replace(/^.*\bfrom\b\s+/i, '').trim(); // strip "U-X from MILESTONE"
  const m = fromStripped.match(/\b(U-[A-Za-z0-9.\-]+|H[0-9.]+|K2-K[0-9]+|HC-[0-9]+|OB-[0-9]+)\b\s*$/);
  if (m) return { kind: 'UNIT', value: m[1], wasNamespaced: s.includes('::'), wasProse: /\bfrom\b/i.test(s) };
  if (/^all\s+/i.test(fromStripped) || KNOWN_MS_RE.test(fromStripped)) return { kind: 'MILESTONE', value: fromStripped };
  return { kind: 'PROSE', value: s };
}

function classifyVizId(viz, note, graph) {
  const lc = viz.toLowerCase();
  const tbd = /\btbd/.test(note);
  if (graph.ids.has(lc)) return { class: 'RESOLVES', detail: viz };
  // existing/extend but not found
  if (!tbd && /(exist|extend|harden|shared|same)/.test(note)) return { class: 'UNRESOLVED', detail: `tagged "${note}" but no live node id "${viz}"` };
  // dedup: is there a live engine node for this stem?
  const stem = lc.split('.').pop().replace(/engine$/, '').replace(/[^a-z0-9]/g, '');
  const hit = stem.length >= 5 ? (graph.engineStems.get(stem) || []) : [];
  if (tbd && hit.length) return { class: 'EXISTS-MISLABEL', detail: `tagged TBD-create but live node(s) exist: ${hit.join(', ')}` };
  // namespace check
  const badNs = KNOWN_INVENTED_NS.some((p) => lc.startsWith(p));
  if (badNs) return { class: 'TBD-BAD-NS', detail: `invented namespace; graph has no "${lc.split('.').slice(0, 2).join('.')}"` };
  const top = lc.split('.', 1)[0];
  if (!REAL_TOP_PREFIXES.has(top)) return { class: 'TBD-BAD-NS', detail: `unknown top-level prefix "${top}"` };
  if (tbd) return { class: 'TBD-OK', detail: `${viz} — ${note}` };
  return { class: 'UNRESOLVED', detail: `untagged + not in graph: ${viz}` };
}

function run() {
  const graph = loadGraphNodeIndex(GRAPH_PATH);
  const files = listSpecFiles(GLOB);
  const allUnits = [];
  for (const f of files) allUnits.push(...parseSpec(f));
  const unitById = new Map(allUnits.map((u) => [u.id, u]));

  // --- viz_node_id classification ---
  const vizFindings = [];
  for (const u of allUnits) {
    if (!u.viz) continue;
    const c = classifyVizId(u.viz, u.vizNote || '', graph);
    vizFindings.push({ unit: u.id, file: u.file, viz: u.viz, note: u.vizNote, ...c });
  }
  const vizByClass = {};
  for (const v of vizFindings) (vizByClass[v.class] ||= []).push(v);

  // --- dependency hygiene ---
  const depFindings = [];
  for (const u of allUnits) {
    for (const kind of ['deps', 'blocks']) {
      for (const raw of u[kind]) {
        const t = normDepToken(raw);
        let cls = 'OK', detail = '';
        if (t.kind === 'RANGE') { cls = 'RANGE'; detail = raw; }
        else if (t.kind === 'MILESTONE') { cls = 'MILESTONE'; detail = raw; }
        else if (t.kind === 'PROSE') { cls = 'PROSE'; detail = raw; }
        else if (t.kind === 'UNIT') {
          if (unitById.has(t.value)) {
            cls = (t.wasNamespaced || t.wasProse || raw.trim() !== t.value) ? 'CROSS-FORM' : 'OK';
            detail = cls === 'CROSS-FORM' ? `${raw} → ${t.value}` : '';
          } else { cls = 'DANGLING'; detail = `${raw} → ${t.value} (no header)`; }
        }
        if (cls !== 'OK') depFindings.push({ unit: u.id, file: u.file, field: kind, raw, class: cls, detail });
      }
    }
  }
  const depByClass = {};
  for (const d of depFindings) (depByClass[d.class] ||= []).push(d);

  // --- internal duplication (same Build target across >1 unit) ---
  const buildTargets = {};
  for (const u of allUnits) if (u.buildTarget) (buildTargets[u.buildTarget.toLowerCase()] ||= []).push({ unit: u.id, file: u.file, target: u.buildTarget });
  const dupGroups = Object.entries(buildTargets).filter(([, arr]) => arr.length > 1).map(([k, arr]) => ({ target: k, units: arr }));

  // --- tier-floor (unit.tier < a dep's tier) ---
  const tierFloor = [];
  for (const u of allUnits) {
    if (u.tier == null) continue;
    for (const raw of u.deps) {
      const t = normDepToken(raw);
      if (t.kind !== 'UNIT') continue;
      const d = unitById.get(t.value);
      if (d && d.tier != null && u.tier < d.tier) tierFloor.push({ unit: u.id, tier: u.tier, dep: t.value, depTier: d.tier, raw });
    }
  }

  // --- closes_synergy_edge binding ---
  let synTotal = 0, synBound = 0;
  const synUnbound = [];
  for (const u of allUnits) {
    if (!u.synergy) continue;
    synTotal++;
    const parts = u.synergy.split('×').map((s) => s.replace(/\(.*?\)/g, '').trim().toLowerCase());
    const bound = parts.length >= 2 && parts.slice(0, 2).every((p) => SYNERGY_SURFACES.has(p));
    if (bound) synBound++; else synUnbound.push({ unit: u.id, edge: u.synergy });
  }

  // --- verifies_via.tool invocability (the F12 class — added after the audit's peer review) ---
  const verifyFindings = [];
  for (const u of allUnits) {
    const c = classifyVerifyTool(u.verifyTool);
    verifyFindings.push({ unit: u.id, file: u.file, tool: u.verifyTool, ...c });
  }
  const verifyByClass = {};
  for (const v of verifyFindings) (verifyByClass[v.class] ||= []).push(v);
  const unrunnable = verifyFindings.filter((v) => v.class.startsWith('UNRUNNABLE'));

  // --- missing-field census ---
  const missingTier = allUnits.filter((u) => u.tier == null).map((u) => ({ unit: u.id, file: u.file }));
  const missingViz = allUnits.filter((u) => !u.viz).map((u) => ({ unit: u.id, file: u.file }));

  const exitFails =
    (vizByClass['TBD-BAD-NS'] || []).length +
    (vizByClass['EXISTS-MISLABEL'] || []).length +
    (vizByClass['UNRESOLVED'] || []).length +
    (depByClass['DANGLING'] || []).length +
    (depByClass['RANGE'] || []).length +
    (depByClass['MILESTONE'] || []).length +
    tierFloor.length +
    dupGroups.length +
    unrunnable.length;

  const report = {
    generatedAt: new Date().toISOString(),
    glob: GLOB,
    graph: GRAPH_PATH,
    graphNodeCount: graph.ids.size,
    specFiles: files.map((f) => basename(f)),
    units: allUnits.length,
    vizNodeIds: {
      total: vizFindings.length,
      byClass: Object.fromEntries(Object.entries(vizByClass).map(([k, v]) => [k, v.length])),
      tbdBadNs: (vizByClass['TBD-BAD-NS'] || []).map((x) => ({ unit: x.unit, viz: x.viz, detail: x.detail })),
      existsMislabel: (vizByClass['EXISTS-MISLABEL'] || []).map((x) => ({ unit: x.unit, viz: x.viz, detail: x.detail })),
      unresolved: (vizByClass['UNRESOLVED'] || []).map((x) => ({ unit: x.unit, viz: x.viz, detail: x.detail })),
    },
    dependencyRefs: {
      total: depFindings.length,
      byClass: Object.fromEntries(Object.entries(depByClass).map(([k, v]) => [k, v.length])),
      findings: depFindings,
    },
    internalDuplication: dupGroups,
    tierFloorViolations: tierFloor,
    verifiesViaTools: {
      total: verifyFindings.length,
      byClass: Object.fromEntries(Object.entries(verifyByClass).map(([k, v]) => [k, v.length])),
      unrunnable: unrunnable.map((x) => ({ unit: x.unit, class: x.class, tool: x.tool, detail: x.detail })),
    },
    synergyEdges: { total: synTotal, boundToMatrix: synBound, unboundVocabulary: synUnbound.length, unboundSample: synUnbound.slice(0, 12) },
    missingFields: { tier: missingTier, vizNodeId: missingViz },
    exitFails,
  };

  if (AS_JSON) { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); return exitFails; }

  // text report
  const L = [];
  L.push(`audit-roadmap-viz-bindings — ${report.generatedAt}`);
  L.push(`  glob: ${GLOB}`);
  L.push(`  graph: ${GRAPH_PATH}  (${report.graphNodeCount.toLocaleString()} nodes)  ·  spec files: ${files.length}  ·  units: ${report.units}`);
  L.push('');
  L.push(`viz_node_id (${report.vizNodeIds.total} declared):`);
  for (const [k, v] of Object.entries(report.vizNodeIds.byClass)) L.push(`  ${k.padEnd(18)} ${v}`);
  if (report.vizNodeIds.tbdBadNs.length) { L.push('  — invented-namespace (TBD-BAD-NS):'); for (const x of report.vizNodeIds.tbdBadNs) L.push(`      ${x.unit.padEnd(28)} ${x.viz}  — ${x.detail}`); }
  if (report.vizNodeIds.existsMislabel.length) { L.push('  — already-exists (EXISTS-MISLABEL):'); for (const x of report.vizNodeIds.existsMislabel) L.push(`      ${x.unit.padEnd(28)} ${x.viz}  — ${x.detail}`); }
  if (report.vizNodeIds.unresolved.length) { L.push('  — unresolved "existing/extend":'); for (const x of report.vizNodeIds.unresolved) L.push(`      ${x.unit.padEnd(28)} ${x.viz}  — ${x.detail}`); }
  L.push('');
  L.push(`dependency refs (${report.dependencyRefs.total} non-OK):`);
  for (const [k, v] of Object.entries(report.dependencyRefs.byClass)) L.push(`  ${k.padEnd(14)} ${v}`);
  for (const d of depFindings) L.push(`      ${d.unit.padEnd(22)} ${d.field}: ${d.raw}  [${d.class}] ${d.detail}`);
  L.push('');
  L.push(`internal duplication (${dupGroups.length} build targets in >1 unit):`);
  for (const g of dupGroups) L.push(`  ${g.target}  →  ${g.units.map((u) => u.unit).join(', ')}`);
  L.push('');
  L.push(`tier-floor violations (${tierFloor.length}):`);
  for (const t of tierFloor) L.push(`  ${t.unit} (T${t.tier}) depends_on ${t.dep} (T${t.depTier})  [${t.raw}]`);
  L.push('');
  L.push(`verifies_via.tool (${report.verifiesViaTools.total} units):`);
  for (const [k, v] of Object.entries(report.verifiesViaTools.byClass)) L.push(`  ${k.padEnd(24)} ${v}`);
  if (unrunnable.length) { L.push('  — unrunnable channels:'); for (const x of unrunnable) L.push(`      ${x.unit.padEnd(28)} [${x.class}] ${x.detail}`); }
  L.push('');
  L.push(`closes_synergy_edge: ${report.synergyEdges.boundToMatrix}/${report.synergyEdges.total} bound to the 10-surface matrix; ${report.synergyEdges.unboundVocabulary} use ad-hoc vocabulary`);
  L.push('');
  L.push(`missing fields: ${report.missingFields.tier.length} units lack tier:, ${report.missingFields.vizNodeId.length} lack viz_node_id`);
  if (report.missingFields.tier.length) L.push(`  tier-less: ${report.missingFields.tier.map((u) => u.unit).join(', ')}`);
  L.push('');
  L.push(`EXIT FAILS (TBD-BAD-NS + EXISTS-MISLABEL + UNRESOLVED + DANGLING + RANGE + MILESTONE + tier-floor + dup-groups + unrunnable-verify-channels) = ${exitFails}`);
  process.stdout.write(L.join('\n') + '\n');
  return exitFails;
}

async function selfTest() {
  // smoke: parser handles a synthetic spec with one good + one bad ref + one dup
  const tmp = resolve(REPO, '.cache', 'temp', 'audit-viz-selftest.md');
  const fs = await import('node:fs/promises');
  const dir = dirname(tmp);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tmp, [
    '## U-X1 — Build `FooEngine`',
    '- tier: T0', '- depends_on: []', '- blocks: [U-X2]', '- viz_node_id: `core.engine.foo` (TBD-create)', '- closes_synergy_edge: hooks × wiki',
    'verifies_via:', '  channel: integration', '  tool: mcp-call prism_foo do_thing', '  expected_signal: 200',
    '## U-X2 — Build `FooEngine`',
    '- tier: T1', '- depends_on: [U-X1, U-X3..U-X5]', '- viz_node_id: `eng.ai.aisystemrouterengine` (existing)', '- closes_synergy_edge: hooks × settings',
    'verifies_via:', '  channel: test', '  tool: `node scripts/audit-roadmap-viz-bindings.mjs --self-test`',
  ].join('\n'));
  const units = parseSpec(tmp);
  const okParse = units.length === 2 && units[0].buildTarget === 'FooEngine' && units[1].deps.includes('U-X1') && /U-X3\.\.U-X5/.test(units[1].deps.join(','));
  const v1 = classifyVerifyTool(units[0].verifyTool);
  const v2 = classifyVerifyTool(units[1].verifyTool);
  const okVerify = v1.class === 'UNRUNNABLE-MCP-CALL' && v2.class === 'RUNNABLE';
  await fs.unlink(tmp).catch(() => {});
  if (!okParse) { console.error('SELF-TEST FAIL: parser did not return expected shape'); process.exit(1); }
  if (!okVerify) { console.error(`SELF-TEST FAIL: verify-tool classifier wrong (v1=${v1.class} expected UNRUNNABLE-MCP-CALL, v2=${v2.class} expected RUNNABLE)`); process.exit(1); }
  console.log('SELF-TEST OK: parser, viz-classifier, dep-normalizer, verify-tool classifier functional');
  process.exit(0);
}

if (SELF_TEST) {
  // top-level await in a wrapper
  (async () => { await selfTest(); })();
} else {
  process.exit(run());
}
