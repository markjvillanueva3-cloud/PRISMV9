// Direct-node runner mirroring the vitest assertions (vitest is vite-transform-contended on this repo).
// Imports the SAME module functions and asserts the SAME real values as winmax-tool-pocket-autoselect.test.mjs.
import {
  resolveWinMaxType, normalizeTool, toolSignature, buildPocketMap, toDefineToolCourses,
  WINMAX_TOOL_TYPES, OP_TO_WINMAX_TYPE, DEFAULT_CAPACITY,
} from '../../../scripts/winmax-tool-pocket-autoselect.mjs';
import assert from 'node:assert/strict';

let pass = 0, fail = 0; const fails = [];
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; fails.push(`FAIL: ${name}\n   ${e.message}`); } }

const INCH_OPS = [
  { type: 'face',    op_id: 'OP10', tool: { type: 'face mill', diameter: 2.0, flutes: 5, cal_length: 3.0 }, cut_time_min: 1.2 },
  { type: 'pocket',  op_id: 'OP20', tool: { type: 'end mill',  diameter: 0.5, flutes: 4, cal_length: 2.5 }, cut_time_min: 4.0 },
  { type: 'drill',   op_id: 'OP30', tool: { type: 'drill',     diameter: 0.25, flutes: 2, point_angle: 118, cal_length: 3.2 }, cut_time_min: 0.8 },
  { type: 'contour', op_id: 'OP40', tool: { type: 'end mill',  diameter: 0.5, flutes: 4, cal_length: 2.5 }, cut_time_min: 2.1 },
  { type: 'tap',     op_id: 'OP50', tool: { type: 'tap',       diameter: 0.3125, flutes: 3, cal_length: 2.8 }, cut_time_min: 0.5 },
];

t('op enum to type', () => { assert.equal(resolveWinMaxType({ type: 'face' }, {}), 'FACE MILL'); assert.equal(resolveWinMaxType({ type: 'pocket' }, {}), 'END MILL'); assert.equal(resolveWinMaxType({ type: '3d_surface' }, {}), 'BALL END MILL'); assert.equal(resolveWinMaxType({ type: 'bore' }, {}), 'BORING HEAD'); });
t('explicit type wins', () => assert.equal(resolveWinMaxType({ type: 'pocket' }, { type: 'CHAMFER MILL' }), 'CHAMFER MILL'));
t('synonyms', () => { assert.equal(resolveWinMaxType({}, { type: 'ballnose' }), 'BALL END MILL'); assert.equal(resolveWinMaxType({}, { type: 'spot drill' }), 'CENTER DRILL'); assert.equal(resolveWinMaxType({}, { type: 'bullnose' }), 'BULL NOSE MILL'); });
t('UNKNOWN fallback', () => { assert.equal(resolveWinMaxType({ type: 'frobnicate' }, {}), 'UNKNOWN'); assert.equal(resolveWinMaxType({}, {}), 'UNKNOWN'); });
t('all OP_TO_WINMAX members valid', () => { for (const v of Object.values(OP_TO_WINMAX_TYPE)) assert.ok(WINMAX_TOOL_TYPES.includes(v)); });

t('normalize drill', () => { const x = normalizeTool(INCH_OPS[2], 'inch'); assert.equal(x.type, 'DRILL'); assert.equal(x.diameter, 0.25); assert.equal(x.flutes, 2); assert.equal(x.point_angle, 118); assert.equal(x.units, 'inch'); });
t('diameter_in no convert', () => assert.equal(normalizeTool({ type: 'pocket', tool: { type: 'end mill', diameter_in: 0.375, flutes: 3 } }, 'inch').diameter, 0.375));
t('missing dia to 0', () => assert.equal(normalizeTool({ type: 'pocket', tool: { type: 'end mill' } }, 'inch').diameter, 0));

t('same geom merges', () => { const a = normalizeTool({ tool: { type: 'end mill', diameter: 0.5, flutes: 4, description: 'rougher' } }, 'inch'); const b = normalizeTool({ tool: { type: 'end mill', diameter: 0.5, flutes: 4, description: 'finisher' } }, 'inch'); assert.equal(toolSignature(a), toolSignature(b)); });
t('0.0001 no false merge', () => { const a = normalizeTool({ tool: { type: 'end mill', diameter: 0.2500, flutes: 4 } }, 'inch'); const b = normalizeTool({ tool: { type: 'end mill', diameter: 0.2501, flutes: 4 } }, 'inch'); assert.notEqual(toolSignature(a), toolSignature(b)); });
t('flutes differ', () => { const a = normalizeTool({ tool: { type: 'end mill', diameter: 0.5, flutes: 4 } }, 'inch'); const b = normalizeTool({ tool: { type: 'end mill', diameter: 0.5, flutes: 2 } }, 'inch'); assert.notEqual(toolSignature(a), toolSignature(b)); });

const m = buildPocketMap(INCH_OPS, { units: 'inch' });
t('dedup 0.5EM to one pocket', () => { assert.equal(m.distinctTools, 4); assert.equal(m.pocketCount, 4); const em = m.pockets.find((p) => p.tool.diameter === 0.5 && p.tool.type === 'END MILL'); assert.deepEqual(em.ops.map((o) => o.op_id), ['OP20', 'OP40']); assert.equal(em.cut_time_min, 6.1); });
t('first-use order', () => { assert.deepEqual(m.pockets.map((p) => p.pocket), ['T1', 'T2', 'T3', 'T4']); assert.equal(m.pockets[0].tool.type, 'FACE MILL'); assert.equal(m.pockets[1].tool.diameter, 0.5); assert.equal(m.pockets[2].tool.type, 'DRILL'); assert.equal(m.pockets[3].tool.type, 'TAP'); });
t('seq numbers + units', () => { assert.deepEqual(m.pockets.map((p) => p.pocketNumber), [1, 2, 3, 4]); assert.equal(m.units, 'inch'); assert.equal(m.machine, 'Hurco VMX42SRTi'); });
t('not oversize', () => { assert.equal(m.capacity, DEFAULT_CAPACITY); assert.equal(m.oversize, false); assert.deepEqual(m.overCapacityPockets, []); });
t('first_use_op_index', () => assert.deepEqual(m.pockets.map((p) => p.first_use_op_index), [0, 1, 2, 4]));

const me = buildPocketMap([], { units: 'inch' });
t('empty map', () => { assert.equal(me.pocketCount, 0); assert.equal(me.distinctTools, 0); assert.equal(me.operationCount, 0); assert.equal(me.oversize, false); assert.deepEqual(me.pockets, []); assert.equal(me.sisterCount, 0); });
t('empty courses', () => assert.deepEqual(toDefineToolCourses(me), []));

const oversizeOps = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60].map((d, i) => ({ type: 'drill', op_id: `D${i}`, tool: { type: 'drill', diameter: d, flutes: 2 } }));
const mo = buildPocketMap(oversizeOps, { units: 'inch', capacity: 4 });
t('oversize all 6 none dropped', () => { assert.equal(mo.pocketCount, 6); assert.equal(mo.distinctTools, 6); assert.equal(mo.capacity, 4); assert.equal(mo.oversize, true); });
t('oversize flags T5 T6', () => { assert.deepEqual(mo.overCapacityPockets, ['T5', 'T6']); assert.deepEqual(mo.pockets.slice(0, 4).map((p) => p.overCapacity), [false, false, false, false]); });

const sisterOps = [
  { type: 'pocket',  op_id: 'P1', tool: { type: 'end mill', diameter: 0.5, flutes: 4, life_min: 8 }, cut_time_min: 7 },
  { type: 'contour', op_id: 'P2', tool: { type: 'end mill', diameter: 0.5, flutes: 4, life_min: 8 }, cut_time_min: 5 },
  { type: 'face',    op_id: 'F1', tool: { type: 'face mill', diameter: 1.0, flutes: 5, life_min: 20 }, cut_time_min: 2 },
];
const ms = buildPocketMap(sisterOps, { units: 'inch' });
t('sister reserved', () => { assert.equal(ms.distinctTools, 2); assert.equal(ms.sisterCount, 1); assert.equal(ms.pocketCount, 3); const p = ms.pockets.find((x) => x.pocket === 'T1'); assert.equal(p.needs_sister, true); assert.equal(p.cut_time_min, 12); assert.equal(p.sister, 'T3'); const s = ms.pockets.find((x) => x.is_sister_of === 'T1'); assert.equal(s.pocket, 'T3'); assert.equal(s.tool.diameter, 0.5); assert.equal(s.reason, 'predicted life 8min < cut time 12min'); });
t('no sister long-life face', () => { const f = ms.pockets.find((x) => x.tool.type === 'FACE MILL'); assert.equal(f.needs_sister, false); assert.equal(f.sister ?? 'NONE', 'NONE'); });

t('undeclared units throws', () => assert.throws(() => buildPocketMap(INCH_OPS, {}), /25\.4x|refusing to guess/i));
t('bad units throws', () => assert.throws(() => buildPocketMap(INCH_OPS, { units: 'furlongs' }), /inch.*mm|mm.*inch/i));
t('mm no convert', () => { const mm = buildPocketMap([{ type: 'pocket', tool: { type: 'end mill', diameter: 12, flutes: 4 } }], { units: 'mm' }); assert.equal(mm.units, 'mm'); assert.equal(mm.pockets[0].tool.diameter, 12); });

const courses = toDefineToolCourses(m);
t('course rows', () => { assert.equal(courses.length, 4); const t1 = courses[0]; assert.equal(t1.toolNumber, 1); assert.equal(t1.diameter, '2'); assert.equal(t1.calLength, '3'); assert.equal(t1.toolType, 'FACE MILL'); assert.equal(t1.units, 'inch'); });
t('deduped EM once as T2', () => { const em = courses.filter((c) => c.diameter === '0.5'); assert.equal(em.length, 1); assert.equal(em[0].toolNumber, 2); });
t('calLength null when absent', () => { const nc = buildPocketMap([{ type: 'drill', tool: { type: 'drill', diameter: 0.25, flutes: 2 } }], { units: 'inch' }); const r = toDefineToolCourses(nc)[0]; assert.equal(r.calLength, null); assert.equal(r.diameter, '0.25'); });

console.log(`\nRESULT: ${pass} passed, ${fail} failed (of ${pass + fail})`);
if (fail) { console.log('\n' + fails.join('\n')); process.exit(1); }
