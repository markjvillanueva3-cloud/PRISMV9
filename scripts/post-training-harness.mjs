#!/usr/bin/env node
// post-training-harness.mjs — train a post processor toward "perfect" over a job corpus. slot:echo.
//
// Generalizes the single-job closed loop (post-closed-loop-tick) into a CORPUS- and POST-parameterized
// training loop, so the SAME machinery perfects the two Hurco posts AND generalizes to Haas + Okuma
// (incl. LB3000 lathe + Multus mill-turn). For each (post × job): generate NC (live, when MCP up) →
// dialect-lint (the post's dialect) → structural conformance → score → record deviations. The
// per-post SCORECARD (jobs passed / lint-errors / structural score + the deviation punch-list) is the
// training signal that drives a post to perfect (every job structural-100% + 0 lint ERRORs).
//
// Composes the existing tools (no reimplementation): scripts/post-nc-dialect-lint.mjs (14 dialects)
// + scripts/post-nc-conformance.mjs --structural (dialect-agnostic invariants). Pure scoring core is
// hermetically testable; the live-generate leg + child-process lint/conformance are injectable.
//
// Modes:
//   --post <id> --score-existing <dir>   MCP-DOWN: score a dir of pre-generated .nc for one post.
//   --post <id> --generate               MCP-UP: generate each corpus job via the post's action, then score.
//   --all --score-existing <dir>         score every post in the corpus against <dir> (regression sweep).
// Output: per-post scorecard JSON + appends to state/shared/post-training/<post-id>-ledger.jsonl.
//
// Exit 0 = post is perfect (all jobs pass, 0 lint errors) · 3 = imperfect (deviations remain) · 2 = bad input.

import { readFileSync, writeFileSync, readdirSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const CORPUS = join(REPO, 'state/shared/post-training/post-training-corpus.json');
const LEDGER_DIR = join(REPO, 'state/shared/post-training');
const LINT = join(REPO, 'scripts/post-nc-dialect-lint.mjs');
const CONFORMANCE = join(REPO, 'scripts/post-nc-conformance.mjs');

// ── Pure scoring core (hermetic) ───────────────────────────────────────────────────────────

/**
 * Score one NC result: combine a dialect-lint result + a structural-conformance result into a
 * per-job verdict. `lint` = { errors, warns } ; `structural` = { passed, total }.
 * A job PASSES iff structural is 100% AND 0 lint errors. WARNs are advisory (tracked, non-failing
 * unless warnPenalty > 0). Pure.
 */
export function scoreJob({ jobId, lint, structural }, { warnPenalty = 0 } = {}) {
  const lintErrors = lint ? (lint.errors || 0) : 0;
  const lintWarns = lint ? (lint.warns || 0) : 0;
  const structScore = structural && structural.total ? structural.passed / structural.total : 0;
  const structOk = structScore >= 1 - 1e-9;
  const pass = structOk && lintErrors === 0;
  // composite 0..1: structural fraction minus warn penalty, hard-zeroed on a lint ERROR.
  const score = lintErrors > 0 ? 0 : Math.max(0, structScore - warnPenalty * lintWarns);
  return { jobId, pass, score, structScore, lintErrors, lintWarns };
}

/**
 * Roll up per-job verdicts into a post scorecard. `deviations` collects the specific failures
 * (the training punch-list). Pure. A post is PERFECT when every job passes.
 */
export function buildScorecard(postId, dialect, jobVerdicts, deviations = []) {
  const jobs = jobVerdicts.length;
  const passed = jobVerdicts.filter((v) => v.pass).length;
  const totalLintErrors = jobVerdicts.reduce((a, v) => a + v.lintErrors, 0);
  const totalLintWarns = jobVerdicts.reduce((a, v) => a + v.lintWarns, 0);
  const avgScore = jobs ? jobVerdicts.reduce((a, v) => a + v.score, 0) / jobs : 0;
  const perfect = jobs > 0 && passed === jobs && totalLintErrors === 0;
  return {
    post: postId, dialect, jobs, passed, perfect,
    lintErrors: totalLintErrors, lintWarns: totalLintWarns,
    score: avgScore, jobVerdicts, deviations,
  };
}

// ── Lint + conformance via the existing CLIs (injectable runner) ────────────────────────────

function defaultRun(scriptPath, args) {
  const r = spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8', timeout: 30000 });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

/** Parse a child's stdout as a single (possibly pretty-printed multi-line) JSON object. */
export function parseJsonOut(stdout) {
  const s = (stdout || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch { /* fall through */ }
  // tolerate a leading banner line before the JSON object
  const i = s.indexOf('{');
  if (i > 0) { try { return JSON.parse(s.slice(i)); } catch { /* ignore */ } }
  return null;
}

/**
 * Run the dialect lint on a file; return { errors, warns }. The lint JSON is nested:
 * { results: [ { findings, counts: { ERROR, WARN, INFO } } ] }. We read results[0].counts.
 */
export function lintFile(file, dialect, run = defaultRun) {
  const r = run(LINT, [file, '--dialect', dialect, '--json']);
  const j = parseJsonOut(r.stdout);
  const res = j && Array.isArray(j.results) ? j.results[0] : j;
  if (!res) return { errors: r.code === 0 ? 0 : 1, warns: 0, raw: null }; // unparseable + nonzero exit → fail loud
  const counts = res.counts || {};
  const findings = res.findings || [];
  const errors = counts.ERROR != null ? counts.ERROR : findings.filter((f) => (f.severity || f.level) === 'ERROR').length;
  const warns = counts.WARN != null ? counts.WARN : findings.filter((f) => (f.severity || f.level) === 'WARN').length;
  return { errors, warns, raw: res };
}

/** Run structural conformance on a file; return { passed, total, checks }. */
export function structuralFile(file, run = defaultRun) {
  const r = run(CONFORMANCE, [file, '--structural', '--json']);
  const j = parseJsonOut(r.stdout);
  if (!j) return { passed: 0, total: 0, checks: [] };
  return { passed: j.passed || 0, total: j.total || 0, checks: j.checks || [] };
}

// ── Score a directory of pre-generated NC (MCP-DOWN training pass) ───────────────────────────

/** Score every .nc in `dir` for one post; build the scorecard. Side-effectful (reads files). */
export function scoreExisting(post, dir, { run = defaultRun, warnPenalty = 0 } = {}) {
  if (!existsSync(dir)) throw new Error(`score dir not found: ${dir}`);
  const ncFiles = readdirSync(dir).filter((f) => /\.(nc|min|eia|tap|ngc)$/i.test(f)).map((f) => join(dir, f));
  if (ncFiles.length === 0) throw new Error(`no NC files in ${dir}`);
  const verdicts = [];
  const deviations = [];
  for (const file of ncFiles) {
    const lint = lintFile(file, post.dialect, run);
    const structural = structuralFile(file, run);
    const v = scoreJob({ jobId: file.split(/[\\/]/).pop(), lint, structural }, { warnPenalty });
    verdicts.push(v);
    if (!v.pass) {
      const failedChecks = structural.checks.filter((c) => !c.pass).map((c) => c.name);
      deviations.push({ job: v.jobId, lintErrors: v.lintErrors, failedStructural: failedChecks });
    }
  }
  return buildScorecard(post.id, post.dialect, verdicts, deviations);
}

// ── Live-generate leg — drive a post's action over :3100 to produce fresh NC ────────────────

const MCP_HTTP_URL = process.env.MCP_HTTP_URL || 'http://127.0.0.1:3100/mcp';

/** Pull the gcode line array out of a master-post response (tries the known shapes). */
export function extractGcode(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const d = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const cands = [
    payload.gcode,
    d.gcode, d.nc, d.program, d.lines,                       // dispatcher nests under data.* (master-post AGI shape)
    payload.engine_output && payload.engine_output.gcode,
    payload.result && payload.result.gcode,
    payload.nc, payload.program, payload.lines,
  ];
  for (const c of cands) {
    if (Array.isArray(c) && c.length) return c.join('\n');
    if (typeof c === 'string' && c.includes('\n')) return c;
  }
  return null;
}

/**
 * Generate one job's NC via the post's dispatcher action over :3100. Returns the NC text or throws.
 * `fetchImpl` injectable for tests. Job operations + machine + the post's actionParams are merged.
 */
export async function generateNc(post, job, { url = MCP_HTTP_URL, fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('no fetch transport');
  const params = { operations: job.operations, machine: post.machine, ...(post.actionParams || {}) };
  // Post-level config (units/work-offset/program-number) + optional per-job config override.
  if (post.config || job.config) params.config = { ...(post.config || {}), ...(job.config || {}) };
  const body = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'prism_cam', arguments: { action: post.action, params } } };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: JSON.stringify(body) });
  // Read the body even on a non-OK status — the JSON-RPC error envelope carries the real message
  // (the EventBus 500-cap saturation is reported as -32000 with HTTP 500 OR 200).
  const j = await r.json().catch(() => (r.ok ? null : { error: { message: `HTTP ${r.status}` } }));
  const errMsg = j && j.error && (j.error.message || JSON.stringify(j.error));
  if (errMsg) {
    // FINDING 4: EventBus.ts:657 throws "Max subscriptions reached: 500" — a per-request subscription
    // leak saturates the pool in ~a dozen calls. Name it distinctly so the loop is actionable (restart :3100).
    if (/Max subscriptions/i.test(errMsg)) throw new Error(`SERVER SATURATED — EventBus 500-cap leak (FINDING 4); restart :3100 before continuing: ${errMsg}`);
    throw new Error(`post error: ${errMsg}`);
  }
  if (!r.ok) throw new Error(`generate HTTP ${r.status}`);
  const text = j && j.result && j.result.content && j.result.content[0] && j.result.content[0].text;
  let payload; try { payload = text ? JSON.parse(text) : (j && j.result); } catch { payload = text; }
  if (payload && payload.success === false) throw new Error(`post rejected: ${payload.error || 'unknown'}`);
  const nc = extractGcode(payload);
  if (!nc) {
    // Precise signal: success:true but the post emitted nothing (the AGI empty-program defect).
    const d = (payload && payload.data) || payload || {};
    if (d.line_count === 0 || d.gcode === '') {
      throw new Error(`empty program: line_count=${d.line_count ?? 0}, segments_processed=${d.segments_processed ?? '?'} (post returned success:true with no NC)`);
    }
    throw new Error(`no gcode in response (${JSON.stringify(payload).slice(0, 120)})`);
  }
  return nc;
}

// ── SFC enrichment leg — make the corpus speeds/feeds SFC-OPTIMAL (condition 3) ───────────────

/** ISO material group (P/M/K/N/S/H) → an SFC material keyword. P=steel is JM's most common. */
export function isoToMaterial(iso) {
  return ({ P: 'steel', M: 'stainless', K: 'cast iron', N: 'aluminum', S: 'titanium', H: 'hardened steel' })[iso] || 'steel';
}

/**
 * Enrich ONE mill operation with SFC-OPTIMAL spindle/feed from ultimate_speed_feed (material-aware:
 * Kienzle/Taylor/Merchant physics). Returns the op with spindle_rpm + feed_mm_min replaced by the SFC
 * values + an `_sfc` provenance stamp. Lathe ops (feed_mm_rev/CSS) are out of scope — returned as-is.
 * `fetchImpl` injectable for tests. The post then EMITS these, so the conformance spindle-speed check
 * proves SFC-optimal emission end to end.
 */
export async function sfcEnrich(op, machine, { url = MCP_HTTP_URL, fetchImpl, material } = {}) {
  if (op.feed_mm_rev !== undefined || op.css_m_min !== undefined) return op; // turning op — SFC is whiskey's lane
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('no fetch transport');
  const m = machine || {};
  const spindle = { max_rpm: m.max_rpm ?? (m.spindle && m.spindle.max_rpm) ?? 12000, power: m.power_kw ?? m.power ?? (m.spindle && m.spindle.power) ?? 15 };
  const params = { material: material || isoToMaterial(op.material_iso), tool_diameter_mm: op.tool_diameter_mm, tool_flutes: op.tool_flutes, operation: op.operation_type, axial_depth_mm: op.axial_depth_mm, machine: { spindle } };
  const body = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'prism_calc', arguments: { action: 'ultimate_speed_feed', params } } };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: JSON.stringify(body) });
  const jr = await r.json().catch(() => null);
  const text = jr && jr.result && jr.result.content && jr.result.content[0] && jr.result.content[0].text;
  let sfc; try { sfc = text ? JSON.parse(text) : (jr && jr.result); } catch { sfc = null; }
  if (!sfc || sfc.blocked) throw new Error(`SFC enrich blocked: ${sfc ? sfc.reason || 'unknown' : 'no payload'}`);
  const rpm = numOf(sfc.spindle_rpm), feed = numOf(sfc.feed_rate);
  if (!(rpm > 0) || !(feed > 0)) throw new Error(`SFC returned no usable rpm/feed (rpm=${rpm}, feed=${feed})`);
  return { ...op, spindle_rpm: Math.round(rpm), feed_mm_min: Math.round(feed), _sfc: { rpm: Math.round(rpm), feed: Math.round(feed), material: params.material } };
}

/** Pull a number out of an SFC field that may be a scalar or a {value,unit,...} envelope. */
export function numOf(field) {
  if (field == null) return NaN;
  if (typeof field === 'number') return field;
  if (typeof field === 'object' && typeof field.value === 'number') return field.value;
  return Number(field);
}

// ── Knowledge enrichment leg — "utilize wiki + tribal knowledge per op + program-general" (condition 3b) ──
// Composes prism_shop_practice:tribal_enrich (tribal shop-floor tips + the machining PLAYBOOK [PRISM's
// compiled best-practice/wiki knowledge] + controller-specific knowledge + provenance counts). Two outputs:
//  (1) a per-job KNOWLEDGE TRAVELER (operator-facing "why" companion to the NC) citing the applied knowledge.
//  (2) a PLAYBOOK-CONFORMANCE check on the job's operation order. The sequencing rules (face-first,
//      rough-before-finish) are MECHANICALLY checkable and the per-line dialect-linter does NOT cover cross-op
//      sequence — so this is a non-duplicative dimension. Non-sequencing tips are CITED as advisory with
//      provenance, never claimed "verified" (R12 — we do not fabricate conformance we cannot mechanically prove).

/** post.kind → the tribal_enrich `process_type` enum. Mill→milling; lathe/millturn→turning. Pure. */
export function processTypeForPost(post) {
  const k = post && post.kind;
  return (k === 'lathe' || k === 'millturn') ? 'turning' : 'milling';
}

/**
 * Map a post emission DIALECT → the tribal_enrich `controller` enum {fanuc|haas|okuma|siemens|mitsubishi|
 * sodick|makino|agiecharmilles|mazak}. For KNOWLEDGE RETRIEVAL ONLY (which controller-tips to surface) — NOT
 * for emission. Hurco has no tribal controller corpus, so it falls back to generic 'fanuc' shop knowledge with
 * an honest note (the emission dialect stays whatever the post is). Returns {controller, fallback|null}. Pure.
 */
export function controllerForKnowledge(dialect) {
  const KNOWN = new Set(['fanuc', 'haas', 'okuma', 'siemens', 'mitsubishi', 'sodick', 'makino', 'agiecharmilles', 'mazak']);
  const d = String(dialect || '').toLowerCase();
  if (KNOWN.has(d)) return { controller: d, fallback: null };
  return { controller: 'fanuc', fallback: `no tribal controller corpus for dialect '${d || '?'}' — used generic 'fanuc' shop knowledge (emission dialect is still ${d || '?'})` };
}

/** Build a machine object that satisfies the pre-machine-completeness-gate (spindle.max_rpm + power). Pure. */
export function enrichMachine(machine) {
  const m = machine || {};
  const max_rpm = m.max_rpm ?? (m.spindle && m.spindle.max_rpm) ?? 12000;
  const power = m.power_kw ?? m.power ?? (m.spindle && m.spindle.power) ?? 15;
  return { ...m, spindle: { ...(m.spindle || {}), max_rpm, power } };
}

/** Classify an operation_type into the families the sequencing rules key on. `face` is exact; `rough`/`finish` are
 * substring family matches (od_rough, contour_finish, ...). Pure. */
export function classifyOp(op) {
  const t = String((op && op.operation_type) || '').toLowerCase();
  return { type: t, face: t === 'face', rough: /rough/.test(t), finish: /finish/.test(t) };
}

/**
 * Evaluate the MECHANICALLY-CHECKABLE machining-playbook sequencing rules against a job's operation ORDER.
 *  - SEQ-001 "Face first, always": if a face op exists in a multi-op job, it must be first.
 *  - SEQ-003 "Roughing before finishing": every roughing op must precede every finishing op.
 * A rule that does not apply to this job (no face op / no rough+finish pair) is reported applies:false (neither
 * pass nor fail — we do not invent a verdict). These are JOB/CAM-ORDERING properties (the post faithfully emits
 * the order it is given), so a violation is a corpus/CAM defect — reported, NOT counted against post emission. Pure.
 */
export function checkPlaybookConformance(job) {
  const ops = ((job && job.operations) || []).map(classifyOp);
  const checks = [];

  const faceIdxs = ops.map((o, i) => (o.face ? i : -1)).filter((i) => i >= 0);
  const faceApplies = faceIdxs.length > 0 && ops.length > 1;
  const facePass = faceApplies ? faceIdxs[0] === 0 : true;
  checks.push({ ruleId: 'SEQ-001', title: 'Face first, always', severity: 'critical', applies: faceApplies, pass: facePass,
    detail: faceApplies ? (facePass ? 'face op is first' : `face op at index ${faceIdxs[0]} — should be index 0`) : 'no face op in a multi-op job' });

  const roughIdxs = ops.map((o, i) => (o.rough ? i : -1)).filter((i) => i >= 0);
  const finIdxs = ops.map((o, i) => (o.finish ? i : -1)).filter((i) => i >= 0);
  const seqApplies = roughIdxs.length > 0 && finIdxs.length > 0;
  const seqPass = seqApplies ? Math.max(...roughIdxs) < Math.min(...finIdxs) : true;
  checks.push({ ruleId: 'SEQ-003', title: 'Roughing before finishing', severity: 'critical', applies: seqApplies, pass: seqPass,
    detail: seqApplies ? (seqPass ? 'all roughing precedes finishing' : `a roughing op at index ${Math.max(...roughIdxs)} follows a finishing op at index ${Math.min(...finIdxs)}`) : 'no rough+finish pair' });

  const applicable = checks.filter((c) => c.applies);
  const violated = applicable.filter((c) => !c.pass);
  return { checks, applied: applicable.length, violated: violated.length, pass: violated.length === 0 };
}

/** Compact a tribal_enrich payload → {tips,playbook,controller,sources,counts}. Keeps id/title (lean traveler). Pure. */
export function summarizeEnrich(enrich) {
  const e = enrich || {};
  const tips = (e.tribal_tips || []).map((t) => ({ id: t.id, title: t.title, confidence: t.confidence }));
  const playbook = (e.playbook_rules || []).map((r) => ({ id: r.id, title: r.title, severity: r.severity }));
  const controller = (e.controller_tips || []).map((c) => ({ id: c.id, title: c.title }));
  return { tips, playbook, controller, sources: e.knowledge_sources || [], counts: { tips: tips.length, playbook: playbook.length, controller: controller.length } };
}

/** Sum the per-op knowledge counts across a job (knowledge applied per operation). Pure; tolerant of a sparse entry. */
export function aggregateSources(perOp) {
  const total = { tips: 0, playbook: 0, controller: 0 };
  for (const po of perOp || []) {
    const c = po && po.summary && po.summary.counts;
    if (!c) continue;
    total.tips += c.tips || 0; total.playbook += c.playbook || 0; total.controller += c.controller || 0;
  }
  return total;
}

/** Assemble the per-job knowledge pack (per-op enrich summaries + program-level playbook conformance). Pure. */
export function buildKnowledgePack(post, job, perOp, conformance, { controllerNote = null } = {}) {
  return { post: post.id, dialect: post.dialect, job: job.id, process: processTypeForPost(post), controllerNote, perOp, conformance };
}

/** Render a per-job knowledge traveler — the operator-facing "why these params / what to watch" companion. Pure. */
export function renderKnowledgeTraveler(pack) {
  const L = [`# Knowledge Traveler — ${pack.post} · job ${pack.job}`, `_process: ${pack.process} · dialect: ${pack.dialect}_`];
  if (pack.controllerNote) L.push(`> ⚠ ${pack.controllerNote}`);
  L.push('', '## Playbook conformance (mechanically-checkable sequencing rules)');
  for (const c of pack.conformance.checks) {
    const mark = !c.applies ? '∅ n/a' : c.pass ? '✅ PASS' : '❌ FAIL';
    L.push(`- **${c.ruleId}** ${c.title} (${c.severity}) — ${mark} · ${c.detail}`);
  }
  L.push('', '## Applied knowledge per operation');
  for (const po of pack.perOp) {
    const s = po.summary;
    L.push(`### ${po.op} (${po.material})`, `- sources: ${s.counts.tips} tribal · ${s.counts.playbook} playbook · ${s.counts.controller} controller`);
    for (const t of s.tips.slice(0, 3)) L.push(`  - tribal [${t.id}] ${t.title}${t.confidence != null ? ` (${t.confidence}%)` : ''}`);
    for (const r of s.playbook.slice(0, 3)) L.push(`  - playbook [${r.id}] ${r.title}${r.severity ? ` (${r.severity})` : ''}`);
    for (const c of s.controller.slice(0, 2)) L.push(`  - controller [${c.id}] ${c.title}`);
  }
  return L.join('\n');
}

/** POST one tribal_enrich call; parse + fail-loud (R12 — a rejected/blocked/empty knowledge query is a thrown error). */
async function callTribalEnrich({ process_type, controller, material, operation, machine }, { url, doFetch }) {
  const params = { process_type, controller, material, operation, machine };
  const body = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'prism_shop_practice', arguments: { action: 'tribal_enrich', params } } };
  const r = await doFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => (r.ok ? null : { error: { message: `HTTP ${r.status}` } }));
  const errMsg = j && j.error && (j.error.message || JSON.stringify(j.error));
  if (errMsg) throw new Error(`tribal_enrich error: ${errMsg}`);
  const text = j && j.result && j.result.content && j.result.content[0] && j.result.content[0].text;
  let payload; try { payload = text ? JSON.parse(text) : (j && j.result); } catch { payload = text; }
  if (payload && payload.success === false) throw new Error(`tribal_enrich rejected: ${payload.error || 'unknown'}`);
  if (payload && payload.blocked) throw new Error(`tribal_enrich blocked: ${payload.reason || payload.blocker || 'unknown'}`);
  if (!payload || (!Array.isArray(payload.tribal_tips) && !Array.isArray(payload.playbook_rules) && !Array.isArray(payload.controller_tips))) {
    throw new Error(`tribal_enrich returned no knowledge (${JSON.stringify(payload).slice(0, 120)})`);
  }
  return payload;
}

/**
 * Retrieve compiled shop knowledge for each op in a job via tribal_enrich. Dedupes identical (operation,material)
 * contexts (small jobs → ≤1 call/op). Returns { perOp:[{op,material,summary}], controllerNote }. `fetchImpl`
 * injectable for tests. Throws (fail-loud) on a blocked/errored enrich — a knowledge query the server rejected is
 * a recorded failure, not silent empty knowledge.
 */
export async function knowledgeEnrich(post, job, { url = MCP_HTTP_URL, fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('no fetch transport');
  const process_type = processTypeForPost(post);
  const { controller, fallback } = controllerForKnowledge(post.dialect);
  const machine = enrichMachine(post.machine);
  const perOp = [];
  const seen = new Map();
  for (const op of job.operations || []) {
    const material = isoToMaterial(op.material_iso);
    const operation = op.operation_type;
    const key = `${operation}|${material}`;
    let summary = seen.get(key);
    if (!summary) {
      const enrich = await callTribalEnrich({ process_type, controller, material, operation, machine }, { url, doFetch });
      summary = summarizeEnrich(enrich);
      seen.set(key, summary);
    }
    perOp.push({ op: operation, material, summary });
  }
  return { perOp, controllerNote: fallback };
}

/**
 * TRAIN one post: generate each corpus job live → write the NC to <ncDir>/<post>-<job>.nc → lint +
 * structural → score → scorecard with deviations. Side-effectful (network + fs). When a job's
 * generation THROWS, that is a recorded training failure (the post can't even emit it), not a crash.
 */
export async function trainPost(post, jobs, { ncDir, run = defaultRun, warnPenalty = 0, generate = generateNc, sfc = null, sfcMaterial, knowledge = null } = {}) {
  mkdirSync(ncDir, { recursive: true });
  const verdicts = [];
  const deviations = [];
  const sfcOptimal = [];           // condition-3 proof: the SFC-optimal speeds/feeds that flowed into the post
  const knowledgeCards = [];       // condition-3b: per-job tribal+playbook+controller knowledge applied + sequencing conformance
  for (const job of jobs) {
    const ncPath = join(ncDir, `${post.id}-${job.id}.nc`);
    let useJob = job;
    // SFC-OPTIMIZE: replace each op's speed/feed with ultimate_speed_feed's physics-optimal values (condition 3).
    if (sfc) {
      try {
        const ops = [];
        for (const op of job.operations) {
          const e = await sfc(op, post.machine, { material: sfcMaterial });
          if (e._sfc) sfcOptimal.push({ job: job.id, op: op.operation_type, rpm: e._sfc.rpm, feed: e._sfc.feed, material: e._sfc.material });
          ops.push(e);
        }
        useJob = { ...job, operations: ops };
      } catch (e) {
        verdicts.push({ jobId: job.id, pass: false, score: 0, structScore: 0, lintErrors: 1, lintWarns: 0, genError: `SFC: ${e.message}` });
        deviations.push({ job: job.id, genError: `SFC: ${e.message}` });
        continue;
      }
    }
    let genErr = null;
    try {
      const nc = await generate(post, useJob);
      writeFileSync(ncPath, nc, 'utf8');
    } catch (e) { genErr = e.message; }
    if (genErr) {
      verdicts.push({ jobId: job.id, pass: false, score: 0, structScore: 0, lintErrors: 1, lintWarns: 0, genError: genErr });
      deviations.push({ job: job.id, genError: genErr });
      continue;
    }
    const lint = lintFile(ncPath, post.dialect, run);
    const structural = structuralFile(ncPath, run);
    const v = scoreJob({ jobId: job.id, lint, structural }, { warnPenalty });
    verdicts.push(v);
    if (!v.pass) deviations.push({ job: job.id, lintErrors: v.lintErrors, failedStructural: structural.checks.filter((c) => !c.pass).map((c) => c.name) });
    // Condition-3b: enrich the (just-generated) NC with applied tribal+playbook+controller knowledge + write a
    // knowledge traveler beside it + check the playbook sequencing rules. Kept SEPARATE from the emission verdict
    // (sequencing is a job/CAM-ordering property — a violation is reported in the knowledge card, not a post defect).
    if (knowledge) {
      try {
        const ke = await knowledge(post, useJob);
        const conf = checkPlaybookConformance(useJob);
        const pack = buildKnowledgePack(post, useJob, ke.perOp, conf, { controllerNote: ke.controllerNote });
        writeFileSync(join(ncDir, `${post.id}-${job.id}.knowledge.md`), renderKnowledgeTraveler(pack), 'utf8');
        knowledgeCards.push({ job: job.id, process: pack.process, sources: aggregateSources(ke.perOp), conformance: conf, controllerNote: ke.controllerNote });
      } catch (e) {
        knowledgeCards.push({ job: job.id, error: e.message });
      }
    }
  }
  const card = buildScorecard(post.id, post.dialect, verdicts, deviations);
  if (sfc) card.sfcOptimal = sfcOptimal;
  if (knowledge) card.knowledge = knowledgeCards;
  return card;
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────

function getArg(argv, flag, def) { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : def; }

function loadCorpus() {
  return JSON.parse(readFileSync(CORPUS, 'utf8'));
}

/**
 * Pick the right job set for a post by its `kind`: turning posts (lathe / mill-turn) need the
 * lathe-shaped jobs (od_rough/tool_orientation/feed_mm_rev); mill posts use the mill jobs. Pure.
 * Falls back to corpus.jobs if a lathe corpus set is absent (so a mill-only corpus still works).
 */
export function jobsFor(post, corpus) {
  const isTurning = post && (post.kind === 'lathe' || post.kind === 'millturn');
  return (isTurning && Array.isArray(corpus.latheJobs) && corpus.latheJobs.length) ? corpus.latheJobs : corpus.jobs;
}

async function main() {
  const argv = process.argv.slice(2);
  const corpus = loadCorpus();
  const warnPenalty = corpus.scoring ? (corpus.scoring.lintWarnPenalty || 0) : 0;
  const scoreDir = getArg(argv, '--score-existing', null);
  const doGenerate = argv.includes('--generate');
  const postId = getArg(argv, '--post', null);
  const all = argv.includes('--all');
  const ncDir = getArg(argv, '--nc-dir', join(LEDGER_DIR, 'nc'));
  const fromSfc = argv.includes('--from-sfc');         // condition 3: SFC-optimize speeds/feeds per op
  const fromKnowledge = argv.includes('--from-knowledge'); // condition 3b: enrich w/ tribal+playbook+controller knowledge + traveler
  const sfcMaterial = getArg(argv, '--material', undefined); // optional override; else derived from op.material_iso

  if (!scoreDir && !doGenerate) {
    console.error(JSON.stringify({ ok: false, error: 'use: --post <id> --generate (live :3100)  OR  --post <id> --score-existing <dir>  OR add --all. Posts: ' + corpus.posts.map((p) => p.id).join(', ') }));
    process.exit(2);
  }
  const targets = all ? corpus.posts : corpus.posts.filter((p) => p.id === postId);
  if (targets.length === 0) { console.error(JSON.stringify({ ok: false, error: `unknown --post '${postId}'. Known: ${corpus.posts.map((p) => p.id).join(', ')}` })); process.exit(2); }

  mkdirSync(LEDGER_DIR, { recursive: true });
  const scorecards = [];
  let allPerfect = true;
  for (const post of targets) {
    let card;
    try {
      card = doGenerate
        ? await trainPost(post, jobsFor(post, corpus), { ncDir: resolve(ncDir), warnPenalty, sfc: fromSfc ? sfcEnrich : null, sfcMaterial, knowledge: fromKnowledge ? knowledgeEnrich : null })
        : scoreExisting(post, resolve(scoreDir), { warnPenalty });
    } catch (e) { console.error(JSON.stringify({ ok: false, post: post.id, error: e.message })); process.exit(2); }
    card.ts = STAMP;
    card.mode = doGenerate ? 'generate' : 'score-existing';
    appendFileSync(join(LEDGER_DIR, `${post.id}-ledger.jsonl`), JSON.stringify(card) + '\n', 'utf8');
    scorecards.push(card);
    allPerfect = allPerfect && card.perfect;

    console.log(`\n=== ${post.id} [${post.dialect}] (${card.mode}) — ${card.passed}/${card.jobs} jobs pass · score ${(card.score * 100).toFixed(0)}% · lint ${card.lintErrors}E/${card.lintWarns}W · ${card.perfect ? 'PERFECT ✓' : 'IMPERFECT'} ===`);
    for (const d of card.deviations.slice(0, 8)) {
      const parts = [];
      if (d.genError) parts.push('GEN-FAIL: ' + d.genError);
      if (d.lintErrors) parts.push(d.lintErrors + ' lint-ERROR');
      if (d.failedStructural && d.failedStructural.length) parts.push('struct[' + d.failedStructural.join(',') + ']');
      console.log(`  ✗ ${d.job}: ${parts.join(' · ')}`);
    }
    if (card.deviations.length > 8) console.log(`  … +${card.deviations.length - 8} more`);
    if (card.sfcOptimal && card.sfcOptimal.length) {
      console.log(`  ⚙ SFC-OPTIMIZED (ultimate_speed_feed → post): ${card.sfcOptimal.map((s) => `${s.op}/${s.material} S${s.rpm} F${s.feed}`).join(' · ')}`);
    }
    if (card.knowledge && card.knowledge.length) {
      for (const k of card.knowledge) {
        if (k.error) { console.log(`  📖 KNOWLEDGE ${k.job}: ✗ enrich failed — ${k.error}`); continue; }
        const c = k.conformance;
        const seq = c.checks.map((x) => `${x.ruleId}${!x.applies ? '∅' : x.pass ? '✓' : '✗'}`).join(' ');
        console.log(`  📖 KNOWLEDGE ${k.job}: ${k.sources.tips}tribal/${k.sources.playbook}playbook/${k.sources.controller}controller applied · seq[${seq}] ${c.violated ? `${c.violated} VIOLATION` : 'conformant'}${k.controllerNote ? ` · ⚠ ${k.controllerNote}` : ''}`);
      }
    }
  }
  console.log(`\nrecorded ${scorecards.length} scorecard(s) → ${LEDGER_DIR}/<post>-ledger.jsonl`);
  process.exit(allPerfect ? 0 : 3);
}

// Deterministic stamp injected via env (Date.* avoided for reproducible runs/tests).
const STAMP = process.env.PRISM_TRAIN_STAMP || new Date().toISOString();

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(JSON.stringify({ ok: false, error: String(e && e.message || e) })); process.exit(2); });
}
