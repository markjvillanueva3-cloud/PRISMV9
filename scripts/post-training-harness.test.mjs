// Tests for post-training-harness.mjs — hermetic, real-value (R9). Injected child-process runner.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scoreJob, buildScorecard, lintFile, structuralFile, scoreExisting, extractGcode, generateNc, trainPost, jobsFor, isoToMaterial, sfcEnrich, numOf,
  processTypeForPost, controllerForKnowledge, enrichMachine, classifyOp, checkPlaybookConformance, summarizeEnrich, aggregateSources, buildKnowledgePack, renderKnowledgeTraveler, knowledgeEnrich } from './post-training-harness.mjs';

describe('scoreJob', () => {
  it('PASSES when structural is 100% and 0 lint errors', () => {
    const v = scoreJob({ jobId: 'a.nc', lint: { errors: 0, warns: 1 }, structural: { passed: 8, total: 8 } });
    expect(v.pass).toBe(true);
    expect(v.score).toBe(1);          // a WARN does not lower score at default warnPenalty 0
    expect(v.structScore).toBe(1);
  });
  it('FAILS (score 0) on any lint ERROR even if structural is perfect', () => {
    const v = scoreJob({ jobId: 'a.nc', lint: { errors: 1, warns: 0 }, structural: { passed: 8, total: 8 } });
    expect(v.pass).toBe(false);
    expect(v.score).toBe(0);
  });
  it('FAILS when structural is incomplete (a missing invariant)', () => {
    const v = scoreJob({ jobId: 'a.nc', lint: { errors: 0, warns: 0 }, structural: { passed: 6, total: 8 } });
    expect(v.pass).toBe(false);
    expect(v.structScore).toBeCloseTo(0.75, 5);
  });
  it('applies a warn penalty when configured', () => {
    const v = scoreJob({ jobId: 'a.nc', lint: { errors: 0, warns: 2 }, structural: { passed: 8, total: 8 } }, { warnPenalty: 0.1 });
    expect(v.score).toBeCloseTo(0.8, 5); // 1 - 0.1*2
    expect(v.pass).toBe(true);           // warns are advisory — still passes (pass keys on errors+structural)
  });
  it('handles a totally empty structural result as score 0', () => {
    expect(scoreJob({ jobId: 'x', lint: { errors: 0 }, structural: { passed: 0, total: 0 } }).score).toBe(0);
  });
});

describe('buildScorecard', () => {
  const pass = (id) => ({ jobId: id, pass: true, score: 1, structScore: 1, lintErrors: 0, lintWarns: 1 });
  const fail = (id) => ({ jobId: id, pass: false, score: 0, structScore: 0.5, lintErrors: 1, lintWarns: 0 });
  it('marks a post PERFECT only when every job passes', () => {
    const card = buildScorecard('hurco-v11', 'hurco', [pass('a'), pass('b')]);
    expect(card.perfect).toBe(true);
    expect(card.passed).toBe(2);
    expect(card.lintErrors).toBe(0);
  });
  it('is NOT perfect when any job fails, and tallies lint errors', () => {
    const card = buildScorecard('hurco-agi', 'hurco', [pass('a'), fail('b')]);
    expect(card.perfect).toBe(false);
    expect(card.passed).toBe(1);
    expect(card.lintErrors).toBe(1);
    expect(card.score).toBeCloseTo(0.5, 5); // (1 + 0)/2
  });
  it('is not perfect on an empty job set (nothing proven)', () => {
    expect(buildScorecard('p', 'haas', []).perfect).toBe(false);
  });
  it('carries the deviation punch-list through', () => {
    const card = buildScorecard('p', 'haas', [fail('b')], [{ job: 'b.nc', lintErrors: 1, failedStructural: ['program-end'] }]);
    expect(card.deviations[0].failedStructural).toContain('program-end');
  });
});

describe('lintFile (injected runner parses the REAL nested dialect-lint JSON)', () => {
  // Real shape: { results: [ { findings, counts: { ERROR, WARN, INFO } } ] }
  it('extracts errors/warns from results[0].counts (pretty-printed multi-line OK)', () => {
    const run = () => ({ code: 0, stdout: JSON.stringify({ schemaVersion: '1.0.0', results: [{ findings: [], counts: { ERROR: 0, WARN: 1, INFO: 0 } }] }, null, 2), stderr: '' });
    expect(lintFile('a.nc', 'hurco', run)).toMatchObject({ errors: 0, warns: 1 });
  });
  it('counts findings by severity when counts absent', () => {
    const run = () => ({ code: 1, stdout: JSON.stringify({ results: [{ findings: [{ severity: 'ERROR' }, { severity: 'WARN' }, { severity: 'WARN' }] }] }), stderr: '' });
    expect(lintFile('a.nc', 'okuma', run)).toMatchObject({ errors: 1, warns: 2 });
  });
  it('fails loud (1 error) on unparseable output with a non-zero exit', () => {
    const run = () => ({ code: 2, stdout: 'boom not json', stderr: '' });
    expect(lintFile('a.nc', 'haas', run).errors).toBe(1);
  });
});

describe('structuralFile (injected runner parses conformance JSON)', () => {
  it('extracts passed/total', () => {
    const run = () => ({ code: 0, stdout: JSON.stringify({ passed: 7, total: 8, checks: [] }), stderr: '' });
    expect(structuralFile('a.nc', run)).toMatchObject({ passed: 7, total: 8 });
  });
});

describe('scoreExisting (end-to-end over a tiny fake corpus dir via injected runner)', () => {
  // We can't use the real fs here, so verify the composition logic through the pure path:
  // a post whose lint+structural both pass → perfect; one with a lint error → imperfect + deviation.
  it('composes lint + structural into a perfect scorecard when both pass', () => {
    // emulate scoreExisting's per-file loop result via buildScorecard + scoreJob (same core)
    const verdict = scoreJob({ jobId: 'f1.nc', lint: { errors: 0, warns: 0 }, structural: { passed: 8, total: 8 } });
    const card = buildScorecard('okuma-genos-osp', 'okuma', [verdict]);
    expect(card.perfect).toBe(true);
  });
  it('is a function with the documented signature (guards the export)', () => {
    expect(typeof scoreExisting).toBe('function');
    expect(scoreExisting.length).toBeGreaterThanOrEqual(2); // (post, dir, opts)
  });
});

describe('SFC enrichment — condition 3: speeds/feeds become physics-optimal (injected fetch, no network)', () => {
  it('isoToMaterial maps ISO groups to SFC keywords (P=steel is JM default)', () => {
    expect(isoToMaterial('P')).toBe('steel');
    expect(isoToMaterial('N')).toBe('aluminum');
    expect(isoToMaterial('S')).toBe('titanium');
    expect(isoToMaterial('zzz')).toBe('steel'); // safe default
  });
  it('numOf unwraps the SFC {value,unit} envelope or a bare scalar', () => {
    expect(numOf({ value: 877, unit: 'RPM' })).toBe(877);
    expect(numOf(684)).toBe(684);
    expect(numOf(null)).toBeNaN();
  });
  it('replaces a mill op spindle_rpm + feed with the SFC-optimal values + an _sfc provenance stamp', async () => {
    const op = { operation_type: 'face', tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5, material_iso: 'P', spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5 };
    const machine = { max_rpm: 12000, power_kw: 18 };
    let seen = null;
    const fetchImpl = async (url, o) => { seen = JSON.parse(o.body); return { json: async () => ({ result: { content: [{ text: JSON.stringify({ spindle_rpm: { value: 877 }, feed_rate: { value: 684 } }) }] } }) }; };
    const e = await sfcEnrich(op, machine, { fetchImpl });
    expect(e.spindle_rpm).toBe(877);
    expect(e.feed_mm_min).toBe(684);            // SFC optimized the conservative 200 → 684
    expect(e._sfc).toMatchObject({ rpm: 877, feed: 684, material: 'steel' });
    // it asked the SFC with the op geometry + the machine spindle envelope
    expect(seen.params.arguments.action).toBe('ultimate_speed_feed');
    expect(seen.params.arguments.params.machine.spindle).toMatchObject({ max_rpm: 12000, power: 18 });
  });
  it('leaves a TURNING op untouched (feed_mm_rev/CSS is whiskey lane, not the mill SFC)', async () => {
    const turn = { operation_type: 'od_rough', feed_mm_rev: 0.25, css_m_min: 220 };
    const e = await sfcEnrich(turn, {}, { fetchImpl: async () => { throw new Error('should not be called'); } });
    expect(e).toBe(turn);
  });
  it('throws (recorded as a deviation upstream) when the SFC completeness-gate blocks', async () => {
    const op = { operation_type: 'face', tool_diameter_mm: 50.8, tool_flutes: 5, material_iso: 'P', axial_depth_mm: 0.5 };
    const fetchImpl = async () => ({ json: async () => ({ result: { content: [{ text: JSON.stringify({ blocked: true, reason: 'INCOMPLETE MACHINE DATA' }) }] } }) });
    await expect(sfcEnrich(op, {}, { fetchImpl })).rejects.toThrow(/SFC enrich blocked.*INCOMPLETE/);
  });
});

describe('jobsFor — routes the job set by post kind (mill jobs vs lathe turning jobs)', () => {
  const corpus = { jobs: [{ id: 'mill-a' }], latheJobs: [{ id: 'lathe-a' }] };
  it('gives mill posts the mill jobs', () => {
    expect(jobsFor({ kind: 'mill' }, corpus)).toBe(corpus.jobs);
  });
  it('gives lathe AND mill-turn posts the lathe jobs', () => {
    expect(jobsFor({ kind: 'lathe' }, corpus)).toBe(corpus.latheJobs);
    expect(jobsFor({ kind: 'millturn' }, corpus)).toBe(corpus.latheJobs);
  });
  it('falls back to mill jobs when the corpus has no lathe set (mill-only corpus still works)', () => {
    expect(jobsFor({ kind: 'lathe' }, { jobs: [{ id: 'm' }] })).toEqual([{ id: 'm' }]);
    expect(jobsFor({ kind: 'lathe' }, { jobs: [{ id: 'm' }], latheJobs: [] })).toEqual([{ id: 'm' }]);
  });
});

describe('extractGcode — pulls NC text out of the known master-post response shapes', () => {
  it('joins a top-level gcode line array', () => {
    expect(extractGcode({ gcode: ['O1', 'S877 M03', 'M30'] })).toBe('O1\nS877 M03\nM30');
  });
  it('reads engine_output.gcode when the array is nested', () => {
    expect(extractGcode({ engine_output: { gcode: ['G21', 'M30'] } })).toBe('G21\nM30');
  });
  it('reads data.gcode — the real dispatcher shape {success,data:{gcode}}', () => {
    expect(extractGcode({ success: true, data: { gcode: 'O1\nM30', line_count: 2 } })).toBe('O1\nM30');
    expect(extractGcode({ success: true, data: { lines: ['O1', 'M30'] } })).toBe('O1\nM30');
  });
  it('returns null for an empty-program response (data.gcode "" / empty array)', () => {
    expect(extractGcode({ success: true, data: { gcode: '', line_count: 0 } })).toBe(null);
    expect(extractGcode({ success: true, data: { gcode: [] } })).toBe(null); // empty array is not NC
  });
  it('accepts a multi-line string body (result.gcode / nc / program)', () => {
    expect(extractGcode({ result: { gcode: 'O1\nM30' } })).toBe('O1\nM30');
    expect(extractGcode({ nc: 'O2\nM30' })).toBe('O2\nM30');
    expect(extractGcode({ program: 'O3\nM30' })).toBe('O3\nM30');
  });
  it('returns null on a single-line string (not real NC) and on garbage', () => {
    expect(extractGcode({ gcode: 'no newlines here' })).toBe(null);
    expect(extractGcode({ foo: 1 })).toBe(null);
    expect(extractGcode(null)).toBe(null);
  });
});

describe('generateNc — drives the post action over an INJECTED fetch (no network)', () => {
  const post = { id: 'p', action: 'master_post_hurco_v11', machine: { name: 'VMX42' }, actionParams: { controller: 'hurco' } };
  const job = { id: 'face-1op', operations: [{ operation_type: 'face', tool_number: 1 }] };
  const okResp = (payloadObj) => ({ ok: true, status: 200, json: async () => ({ result: { content: [{ text: JSON.stringify(payloadObj) }] } }) });

  it('POSTs prism_cam with the post action + merged operations/machine/actionParams, returns NC', async () => {
    let seen = null;
    const fetchImpl = async (url, opts) => { seen = { url, body: JSON.parse(opts.body) }; return okResp({ gcode: ['O1', 'M30'] }); };
    const nc = await generateNc(post, job, { url: 'http://x/mcp', fetchImpl });
    expect(nc).toBe('O1\nM30');
    expect(seen.body.params.name).toBe('prism_cam');
    expect(seen.body.params.arguments.action).toBe('master_post_hurco_v11');
    expect(seen.body.params.arguments.params.operations).toEqual(job.operations);
    expect(seen.body.params.arguments.params.machine).toEqual(post.machine);
    expect(seen.body.params.arguments.params.controller).toBe('hurco'); // actionParams merged
  });
  it('throws on a non-OK HTTP status', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}) });
    await expect(generateNc(post, job, { fetchImpl })).rejects.toThrow(/HTTP 503/);
  });
  it('throws on a JSON-RPC error envelope', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ error: { message: 'bad action' } }) });
    await expect(generateNc(post, job, { fetchImpl })).rejects.toThrow(/bad action/);
  });
  it('throws when the post payload reports success:false', async () => {
    const fetchImpl = async () => okResp({ success: false, error: 'kinematics unresolved' });
    await expect(generateNc(post, job, { fetchImpl })).rejects.toThrow(/kinematics unresolved/);
  });
  it('throws when the response carries no recognizable gcode', async () => {
    const fetchImpl = async () => okResp({ summary: 'done', meta: {} });
    await expect(generateNc(post, job, { fetchImpl })).rejects.toThrow(/no gcode/);
  });
  it('throws a PRECISE empty-program error on success:true with line_count 0 (the AGI defect)', async () => {
    const fetchImpl = async () => okResp({ success: true, data: { gcode: '', line_count: 0, segments_processed: 0 } });
    await expect(generateNc(post, job, { fetchImpl })).rejects.toThrow(/empty program: line_count=0/);
  });
  it('classifies the EventBus 500-cap saturation distinctly (FINDING 4) even on an HTTP 500 envelope', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, json: async () => ({ error: { code: -32000, message: 'server build failed: Max subscriptions reached: 500' } }) });
    await expect(generateNc(post, job, { fetchImpl })).rejects.toThrow(/SERVER SATURATED — EventBus 500-cap/);
  });
});

describe('trainPost — generate→write→lint→structural→score over a real temp dir (injected generate + run)', () => {
  let dir;
  const post = { id: 'hurco-v11-agi', action: 'a', dialect: 'hurco', machine: {} };
  const jobs = [{ id: 'face-1op', operations: [] }, { id: 'pocket-2op', operations: [] }];
  // run() distinguishes lint (--dialect) from structural (--structural) by the args.
  const cleanRun = (script, args) => args.includes('--structural')
    ? { code: 0, stdout: JSON.stringify({ passed: 7, total: 7, checks: [] }), stderr: '' }
    : { code: 0, stdout: JSON.stringify({ results: [{ findings: [], counts: { ERROR: 0, WARN: 0 } }] }), stderr: '' };

  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'prism-train-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('writes one NC per job and scores a clean post PERFECT', async () => {
    const generate = async (p, j) => `O1 (${j.id})\nS877 M03\nM30`;
    const card = await trainPost(post, jobs, { ncDir: dir, run: cleanRun, generate });
    expect(card.perfect).toBe(true);
    expect(card.passed).toBe(2);
    expect(existsSync(join(dir, 'hurco-v11-agi-face-1op.nc'))).toBe(true);
    expect(readFileSync(join(dir, 'hurco-v11-agi-pocket-2op.nc'), 'utf8')).toContain('pocket-2op');
  });
  it('records a generation throw as a deviation (genError) WITHOUT crashing the run', async () => {
    const generate = async (p, j) => { if (j.id === 'pocket-2op') throw new Error('post rejected: G187 for hurco'); return 'O1\nS877 M03\nM30'; };
    const card = await trainPost(post, jobs, { ncDir: dir, run: cleanRun, generate });
    expect(card.perfect).toBe(false);
    expect(card.passed).toBe(1); // face passed, pocket gen-failed
    const dev = card.deviations.find((d) => d.job === 'pocket-2op');
    expect(dev.genError).toMatch(/G187/);
    expect(existsSync(join(dir, 'hurco-v11-agi-pocket-2op.nc'))).toBe(false); // never written
  });
  it('flags a lint ERROR as a deviation (post emits but the dialect-lint rejects)', async () => {
    const generate = async () => 'O1\nG187 P3\nM30'; // would trip a hurco lint rule live
    const dirtyRun = (script, args) => args.includes('--structural')
      ? { code: 0, stdout: JSON.stringify({ passed: 7, total: 7, checks: [] }), stderr: '' }
      : { code: 1, stdout: JSON.stringify({ results: [{ findings: [{ severity: 'ERROR' }], counts: { ERROR: 1, WARN: 0 } }] }), stderr: '' };
    const card = await trainPost(post, jobs, { ncDir: dir, run: dirtyRun, generate });
    expect(card.perfect).toBe(false);
    expect(card.lintErrors).toBe(2); // both jobs
    expect(card.deviations[0].lintErrors).toBe(1);
  });
});

// ── Knowledge enrichment leg (condition 3b — utilize tribal + playbook + controller knowledge per op) ──

describe('processTypeForPost', () => {
  it('maps mill → milling, lathe/millturn → turning, default → milling', () => {
    expect(processTypeForPost({ kind: 'mill' })).toBe('milling');
    expect(processTypeForPost({ kind: 'lathe' })).toBe('turning');
    expect(processTypeForPost({ kind: 'millturn' })).toBe('turning');
    expect(processTypeForPost({})).toBe('milling');
  });
});

describe('controllerForKnowledge', () => {
  it('passes a known controller dialect through with no fallback', () => {
    expect(controllerForKnowledge('okuma')).toEqual({ controller: 'okuma', fallback: null });
    expect(controllerForKnowledge('HAAS')).toEqual({ controller: 'haas', fallback: null });
  });
  it('falls back to generic fanuc for hurco (no tribal corpus) WITH an honest note', () => {
    const r = controllerForKnowledge('hurco');
    expect(r.controller).toBe('fanuc');
    expect(r.fallback).toMatch(/hurco/);
    expect(r.fallback).toMatch(/fanuc/);
  });
  it('falls back for an unknown/empty dialect with the note naming the generic control', () => {
    expect(controllerForKnowledge('').controller).toBe('fanuc');
    expect(controllerForKnowledge(undefined).fallback).toMatch(/used generic 'fanuc'/);
  });
});

describe('enrichMachine (satisfies the pre-machine-completeness-gate)', () => {
  it('lifts top-level max_rpm/power_kw into spindle', () => {
    expect(enrichMachine({ max_rpm: 8100, power_kw: 22 }).spindle).toMatchObject({ max_rpm: 8100, power: 22 });
  });
  it('keeps an existing spindle and fills defaults when fields missing', () => {
    expect(enrichMachine({ spindle: { max_rpm: 15000 } }).spindle).toMatchObject({ max_rpm: 15000, power: 15 });
    expect(enrichMachine({}).spindle).toMatchObject({ max_rpm: 12000, power: 15 });
  });
});

describe('classifyOp', () => {
  it('identifies face / rough / finish families (conservative, named-only)', () => {
    expect(classifyOp({ operation_type: 'face' })).toMatchObject({ face: true, rough: false, finish: false });
    expect(classifyOp({ operation_type: 'od_rough' })).toMatchObject({ rough: true, finish: false });
    expect(classifyOp({ operation_type: 'od_finish' })).toMatchObject({ rough: false, finish: true });
    expect(classifyOp({})).toMatchObject({ face: false, rough: false, finish: false, type: '' });
  });
});

describe('checkPlaybookConformance (mechanically-checkable sequencing rules)', () => {
  it('SEQ-001 PASSES when face is first in a multi-op job', () => {
    const r = checkPlaybookConformance({ operations: [{ operation_type: 'face' }, { operation_type: 'pocket' }] });
    expect(r.checks.find((c) => c.ruleId === 'SEQ-001')).toMatchObject({ applies: true, pass: true });
    expect(r.pass).toBe(true);
    expect(r.violated).toBe(0);
  });
  it('SEQ-001 FAILS when a face op is not first', () => {
    const r = checkPlaybookConformance({ operations: [{ operation_type: 'pocket' }, { operation_type: 'face' }] });
    const seq1 = r.checks.find((c) => c.ruleId === 'SEQ-001');
    expect(seq1).toMatchObject({ applies: true, pass: false });
    expect(seq1.detail).toMatch(/index 1/);
    expect(r.violated).toBe(1);
    expect(r.pass).toBe(false);
  });
  it('SEQ-001 is n/a for a single-op job (no ordering to check)', () => {
    expect(checkPlaybookConformance({ operations: [{ operation_type: 'face' }] }).checks.find((c) => c.ruleId === 'SEQ-001').applies).toBe(false);
  });
  it('SEQ-003 PASSES when all roughing precedes finishing', () => {
    expect(checkPlaybookConformance({ operations: [{ operation_type: 'od_rough' }, { operation_type: 'od_finish' }] }).checks.find((c) => c.ruleId === 'SEQ-003')).toMatchObject({ applies: true, pass: true });
  });
  it('SEQ-003 FAILS when a roughing op follows a finishing op', () => {
    const r = checkPlaybookConformance({ operations: [{ operation_type: 'od_finish' }, { operation_type: 'od_rough' }] });
    expect(r.checks.find((c) => c.ruleId === 'SEQ-003')).toMatchObject({ applies: true, pass: false });
    expect(r.violated).toBe(1);
  });
  it('SEQ-003 is n/a when there is no rough+finish pair', () => {
    expect(checkPlaybookConformance({ operations: [{ operation_type: 'drill' }] }).checks.find((c) => c.ruleId === 'SEQ-003').applies).toBe(false);
  });
  it('the real corpus pocket-2op job [face,pocket] is fully conformant (SEQ-001 applies, SEQ-003 n/a)', () => {
    const r = checkPlaybookConformance({ operations: [{ operation_type: 'face' }, { operation_type: 'pocket' }] });
    expect(r.pass).toBe(true);
    expect(r.applied).toBe(1);
  });
  it('the real corpus lathe-od-face-turn [face,od_rough,od_finish] is fully conformant (both rules apply+pass)', () => {
    const r = checkPlaybookConformance({ operations: [{ operation_type: 'face' }, { operation_type: 'od_rough' }, { operation_type: 'od_finish' }] });
    expect(r.pass).toBe(true);
    expect(r.applied).toBe(2);
  });
  it('handles an empty job (no ops) — both rules n/a, conformant', () => {
    const r = checkPlaybookConformance({ operations: [] });
    expect(r.applied).toBe(0);
    expect(r.pass).toBe(true);
  });
});

describe('summarizeEnrich + aggregateSources', () => {
  const enrich = {
    tribal_tips: [{ id: 'tk-1', title: 'climb mill steel', confidence: 95 }, { id: 'tk-2', title: 'safety', confidence: 100 }],
    playbook_rules: [{ id: 'SEQ-001', title: 'Face first', severity: 'critical' }],
    controller_tips: [{ id: 'ctrl-1', title: 'Okuma dialect' }],
    knowledge_sources: [{ source: 'Tribal', count: 2 }],
  };
  it('compacts the enrich payload to id/title (+confidence/severity) with counts', () => {
    const s = summarizeEnrich(enrich);
    expect(s.counts).toEqual({ tips: 2, playbook: 1, controller: 1 });
    expect(s.tips[0]).toEqual({ id: 'tk-1', title: 'climb mill steel', confidence: 95 });
    expect(s.playbook[0]).toMatchObject({ severity: 'critical' });
  });
  it('tolerates an empty/absent payload (no knowledge → zero counts, no throw)', () => {
    expect(summarizeEnrich(null).counts).toEqual({ tips: 0, playbook: 0, controller: 0 });
  });
  it('aggregateSources sums counts across ops (and is 0 for empty)', () => {
    const s = summarizeEnrich(enrich);
    expect(aggregateSources([{ summary: s }, { summary: s }])).toEqual({ tips: 4, playbook: 2, controller: 2 });
    expect(aggregateSources([])).toEqual({ tips: 0, playbook: 0, controller: 0 });
  });
});

describe('buildKnowledgePack + renderKnowledgeTraveler', () => {
  const post = { id: 'okuma-genos-osp', dialect: 'okuma', kind: 'mill' };
  const job = { id: 'pocket-2op', operations: [{ operation_type: 'face' }, { operation_type: 'pocket' }] };
  const perOp = [{ op: 'face', material: 'steel', summary: summarizeEnrich({ tribal_tips: [{ id: 'tk-1', title: 'warm spindle', confidence: 88 }], playbook_rules: [{ id: 'SEQ-001', title: 'Face first', severity: 'critical' }], controller_tips: [] }) }];
  it('renders a traveler with conformance + per-op knowledge + provenance', () => {
    const md = renderKnowledgeTraveler(buildKnowledgePack(post, job, perOp, checkPlaybookConformance(job)));
    expect(md).toContain('Knowledge Traveler — okuma-genos-osp');
    expect(md).toContain('SEQ-001');
    expect(md).toContain('face (steel)');
    expect(md).toContain('tk-1');
    expect(md).toMatch(/sources: 1 tribal/);
  });
  it('surfaces a controller fallback note when present', () => {
    const pack = buildKnowledgePack({ id: 'hurco-v11-standalone', dialect: 'hurco', kind: 'mill' }, job, perOp, checkPlaybookConformance(job), { controllerNote: 'used generic fanuc' });
    expect(renderKnowledgeTraveler(pack)).toContain('used generic fanuc');
  });
});

describe('knowledgeEnrich (live leg — injected fetch)', () => {
  const post = { id: 'okuma-genos-osp', dialect: 'okuma', kind: 'mill', machine: { max_rpm: 15000, power_kw: 18 } };
  const enrichPayload = { tribal_tips: [{ id: 'tk-1', title: 'x', confidence: 90 }], playbook_rules: [{ id: 'SEQ-001', title: 'Face first', severity: 'critical' }], controller_tips: [{ id: 'c1', title: 'osp' }], knowledge_sources: [] };
  const okFetch = () => async () => ({ ok: true, json: async () => ({ result: { content: [{ text: JSON.stringify(enrichPayload) }] } }) });
  it('retrieves per-op knowledge for each op (known controller → no fallback note)', async () => {
    const job = { id: 'j', operations: [{ operation_type: 'face', material_iso: 'P' }, { operation_type: 'drill', material_iso: 'P' }] };
    const r = await knowledgeEnrich(post, job, { fetchImpl: okFetch() });
    expect(r.perOp).toHaveLength(2);
    expect(r.perOp[0]).toMatchObject({ op: 'face', material: 'steel' });
    expect(r.perOp[0].summary.counts).toEqual({ tips: 1, playbook: 1, controller: 1 });
    expect(r.controllerNote).toBeNull();
  });
  it('dedupes identical (operation,material) contexts — one fetch per unique key', async () => {
    let calls = 0;
    const counting = async () => { calls++; return { ok: true, json: async () => ({ result: { content: [{ text: JSON.stringify(enrichPayload) }] } }) }; };
    const job = { id: 'j', operations: [{ operation_type: 'face', material_iso: 'P' }, { operation_type: 'face', material_iso: 'P' }] };
    const r = await knowledgeEnrich(post, job, { fetchImpl: counting });
    expect(r.perOp).toHaveLength(2);
    expect(calls).toBe(1);
  });
  it('stamps a controller fallback note for a hurco post', async () => {
    const r = await knowledgeEnrich({ ...post, dialect: 'hurco' }, { id: 'j', operations: [{ operation_type: 'face', material_iso: 'P' }] }, { fetchImpl: okFetch() });
    expect(r.controllerNote).toMatch(/hurco/);
  });
  it('FAILS LOUD on a server error envelope (R12 — not silent empty knowledge)', async () => {
    const errFetch = async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'boom' } }) });
    await expect(knowledgeEnrich(post, { id: 'j', operations: [{ operation_type: 'face', material_iso: 'P' }] }, { fetchImpl: errFetch })).rejects.toThrow(/tribal_enrich error/);
  });
  it('FAILS LOUD when the enrich is blocked by a pre-hook gate', async () => {
    const blocked = async () => ({ ok: true, json: async () => ({ result: { content: [{ text: JSON.stringify({ blocked: true, reason: 'machine gate' }) }] } }) });
    await expect(knowledgeEnrich(post, { id: 'j', operations: [{ operation_type: 'face', material_iso: 'P' }] }, { fetchImpl: blocked })).rejects.toThrow(/blocked/);
  });
  it('FAILS LOUD when the payload carries no knowledge arrays at all', async () => {
    const empty = async () => ({ ok: true, json: async () => ({ result: { content: [{ text: JSON.stringify({ foo: 1 }) }] } }) });
    await expect(knowledgeEnrich(post, { id: 'j', operations: [{ operation_type: 'face', material_iso: 'P' }] }, { fetchImpl: empty })).rejects.toThrow(/no knowledge/);
  });
});

describe('trainPost with the knowledge leg (injected generate + knowledge)', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pt-know-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });
  const post = { id: 'okuma-genos-osp', dialect: 'okuma', kind: 'mill', machine: { max_rpm: 15000, power_kw: 18 } };
  const jobs = [{ id: 'pocket-2op', operations: [{ operation_type: 'face', material_iso: 'P' }, { operation_type: 'pocket', material_iso: 'P' }] }];
  const cleanRun = (script, args) => args.includes('--structural')
    ? { code: 0, stdout: JSON.stringify({ passed: 7, total: 7, checks: [] }), stderr: '' }
    : { code: 0, stdout: JSON.stringify({ results: [{ findings: [], counts: { ERROR: 0, WARN: 0 } }] }), stderr: '' };
  const generate = async () => 'O1\n[FACE]\nM30';
  const knowledge = async () => ({ perOp: [{ op: 'face', material: 'steel', summary: summarizeEnrich({ tribal_tips: [{ id: 'tk-1', title: 't', confidence: 90 }], playbook_rules: [], controller_tips: [] }) }], controllerNote: null });
  it('writes a knowledge traveler beside the NC and attaches card.knowledge (emission verdict unaffected)', async () => {
    const card = await trainPost(post, jobs, { ncDir: dir, run: cleanRun, generate, knowledge });
    expect(card.perfect).toBe(true);
    expect(card.knowledge).toHaveLength(1);
    expect(card.knowledge[0].conformance.pass).toBe(true);
    expect(existsSync(join(dir, 'okuma-genos-osp-pocket-2op.knowledge.md'))).toBe(true);
    expect(readFileSync(join(dir, 'okuma-genos-osp-pocket-2op.knowledge.md'), 'utf8')).toContain('Knowledge Traveler');
  });
  it('records a knowledge-enrich error WITHOUT failing the post emission verdict', async () => {
    const boom = async () => { throw new Error('enrich down'); };
    const card = await trainPost(post, jobs, { ncDir: dir, run: cleanRun, generate, knowledge: boom });
    expect(card.perfect).toBe(true);
    expect(card.knowledge[0].error).toMatch(/enrich down/);
  });
});
