// Tests for winmax-tool-pocket-autoselect.mjs — hermetic, real-value assertions (R9).
// Every case fails if the dedup/ordering/sister/units intent changes; no presence-only stubs.
import { describe, it, expect } from 'vitest';
import {
  resolveWinMaxType, normalizeTool, toolSignature, buildPocketMap, toDefineToolCourses,
  normalizeHolder, toolsToOps, buildPostParams, parseToolCsv, camProgramToTools,
  WINMAX_TOOL_TYPES, OP_TO_WINMAX_TYPE, DEFAULT_CAPACITY,
} from './winmax-tool-pocket-autoselect.mjs';

describe('camProgramToTools (live CAM program file → tools+holders via extractor)', () => {
  // a fake MCP transport: records the request, returns a canned extractor response
  const mkFetch = (responsePayload) => {
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return { ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify(responsePayload) }] } }) };
    };
    return { fetchImpl, calls };
  };
  const FUSION_TOOL = { type: 'face mill', diameter_mm: 50, flutes: 5, holder: { type: 'CAT40', gauge_length: 100 } };

  it('routes fusion → cam_fusion360_tool_parse with json_text and extracts library.tools', async () => {
    const { fetchImpl, calls } = mkFetch({ library: { tools: [FUSION_TOOL] } });
    const readFile = () => '{"fusion":"tool-library-json"}';
    const tools = await camProgramToTools({ cam: 'fusion', file: 'job.tools', fetchImpl, readFile });
    expect(calls[0].body.params.arguments.action).toBe('cam_fusion360_tool_parse');
    expect(calls[0].body.params.arguments.params.json_text).toBe('{"fusion":"tool-library-json"}');
    expect(tools).toHaveLength(1);
    // the holder survives end-to-end through toolsToOps → normalizeTool
    const t = normalizeTool(toolsToOps(tools)[0], 'mm');
    expect(t.holder.type).toBe('CAT40');
    expect(t.holder.gauge_length).toBe(100);
  });

  it('routes hypermill → hypermill_extract_tools with db_path (server reads the file, no content sent)', async () => {
    const { fetchImpl, calls } = mkFetch({ tools: [{ tool_type: 'end mill', diameter_mm: 12, flutes: 4, holder_type: 'ER32', gauge_length_mm: 80 }] });
    let readCalled = false;
    const readFile = () => { readCalled = true; return 'x'; };
    const tools = await camProgramToTools({ cam: 'hypermill', file: 'C:/tools/demo.hmt', fetchImpl, readFile });
    expect(calls[0].body.params.arguments.action).toBe('hypermill_extract_tools');
    expect(calls[0].body.params.arguments.params.db_path).toBe('C:/tools/demo.hmt');
    expect(readCalled).toBe(false); // hypermill does NOT read content client-side — server reads the path
    expect(normalizeTool(toolsToOps(tools)[0], 'mm').holder.type).toBe('ER32');
  });

  it('routes mastercam → mastercam_tool_import with native_data (parsed JSON)', async () => {
    const { fetchImpl, calls } = mkFetch({ tools: [{ type: 'drill', diameter: 6.35, flutes: 2 }] });
    const readFile = () => '{"tools":[{"type":"drill"}]}';
    await camProgramToTools({ cam: 'mastercam', file: 'job.mcam-tools', fetchImpl, readFile });
    expect(calls[0].body.params.arguments.action).toBe('mastercam_tool_import');
    expect(calls[0].body.params.arguments.params.native_data).toEqual({ tools: [{ type: 'drill' }] });
  });

  it('throws on an unknown cam (fail loud)', async () => {
    await expect(camProgramToTools({ cam: 'powermill', file: 'x', fetchImpl: async () => ({}) })).rejects.toThrow(/unknown cam/);
  });
  it('throws when the extractor returns an MCP error (e.g. server saturated)', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'Max subscriptions reached: 500' } }) });
    await expect(camProgramToTools({ cam: 'hypermill', file: 'x', fetchImpl })).rejects.toThrow(/extractor error.*Max subscriptions/);
  });
  it('throws when the response has no recognizable tool array', async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ result: { content: [{ text: JSON.stringify({ nope: true }) }] } }) });
    await expect(camProgramToTools({ cam: 'hypermill', file: 'x', fetchImpl })).rejects.toThrow(/no recognizable tool array/);
  });
});

describe('holder carry-through (CAM tool holder → pocket inputs)', () => {
  it('normalizeHolder reads a nested holder (type/gauge/coupling)', () => {
    expect(normalizeHolder({ holder: { type: 'CAT40 SHRINK', gauge_length: 120, coupling: 'CAT40' } }))
      .toEqual({ type: 'CAT40 SHRINK', gauge_length: 120, projection: null, coupling: 'CAT40' });
  });
  it('normalizeHolder returns null when no holder populated (back-compat)', () => {
    expect(normalizeHolder({ diameter: 10 })).toBeNull();
  });
  it('normalizeHolder does NOT mistake the cutter type for a holder (regression)', () => {
    // a holderless tool WITH a cutter `type` must still yield null — never {type:'FACE MILL'}
    expect(normalizeHolder({ type: 'face mill', diameter: 50, flutes: 5 })).toBeNull();
  });
  it('a holderless tool carries holder:null through normalizeTool + the pocket', () => {
    const m = buildPocketMap([{ type: 'face', tool: { type: 'face mill', diameter: 2.0, flutes: 5 } }], { units: 'inch' });
    expect(m.pockets[0].tool.holder).toBeNull();
  });
  it('normalizeTool carries the holder + uses gauge as cal_length when cal_length absent', () => {
    const t = normalizeTool({ tool: { type: 'face mill', diameter: 50, holder: { type: 'CAT40', gauge_length: 100 } } }, 'mm');
    expect(t.holder.type).toBe('CAT40');
    expect(t.cal_length).toBe(100);
  });
  it('same cutter in a DIFFERENT holder gauge → its OWN pocket (distinct Z offset)', () => {
    const ops = [
      { type: 'face', tool: { type: 'face mill', diameter: 50, flutes: 5, holder: { type: 'CAT40', gauge_length: 100 } } },
      { type: 'face', tool: { type: 'face mill', diameter: 50, flutes: 5, holder: { type: 'CAT40', gauge_length: 150 } } },
    ];
    expect(buildPocketMap(ops, { units: 'mm' }).pocketCount).toBe(2);
  });
  it('same cutter in the SAME holder still dedups to one pocket', () => {
    const ops = [
      { type: 'pocket', tool: { type: 'flat end mill', diameter: 12, flutes: 4, holder: { type: 'ER32', gauge_length: 80 } } },
      { type: 'contour', tool: { type: 'flat end mill', diameter: 12, flutes: 4, holder: { type: 'ER32', gauge_length: 80 } } },
    ];
    expect(buildPocketMap(ops, { units: 'mm' }).pocketCount).toBe(1);
  });
  it('toDefineToolCourses emits holderType + gaugeLength for the WinMax form', () => {
    const m = buildPocketMap([{ type: 'face', tool: { type: 'face mill', diameter: 50, holder: { type: 'CAT40', gauge_length: 100 } } }], { units: 'mm' });
    const cp = toDefineToolCourses(m)[0];
    expect(cp.holderType).toBe('CAT40');
    expect(cp.gaugeLength).toBe('100');
  });
});

describe('toolsToOps (CAM tool-library export → ops)', () => {
  it('maps universal_tool_export CSV-row fields (snake_case + _mm)', () => {
    const ops = toolsToOps([{ tool_type: 'end mill', diameter_mm: '12', flutes: '4', holder_type: 'ER32', gauge_length_mm: '80', taper: 'CAT40' }]);
    const t = normalizeTool(ops[0], 'mm');
    expect(t.diameter).toBe(12);
    expect(t.flutes).toBe(4);
    expect(t.holder.type).toBe('ER32');
    expect(t.holder.gauge_length).toBe(80);
  });
  it('maps a nested extractor shape {holder:{…}}', () => {
    const ops = toolsToOps([{ type: 'drill', diameter: 6.35, holder: { type: 'HSK63', gauge_length: 90 } }]);
    const t = normalizeTool(ops[0], 'mm');
    expect(t.holder.type).toBe('HSK63');
  });
  it('throws on non-array input (fail loud)', () => {
    expect(() => toolsToOps({})).toThrow(/must be an array/);
  });
});

describe('parseToolCsv', () => {
  it('parses header + rows into keyed objects', () => {
    const rows = parseToolCsv('tool_type,diameter_mm,flutes\nend mill,12,4\nface mill,50,5');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ tool_type: 'end mill', diameter_mm: '12', flutes: '4' });
  });
  it('returns empty for header-only CSV', () => {
    expect(parseToolCsv('tool_type,diameter_mm')).toEqual([]);
  });
});

describe('buildPostParams (pocket map → master_post_hurco_v11 params)', () => {
  it('mm input: emits holder + tool per pocket WITHOUT unit conversion', () => {
    const map = buildPocketMap([
      { type: 'face', tool: { type: 'face mill', diameter: 50.8, flutes: 5, holder: { type: 'CAT40', gauge_length: 100 } } },
    ], { units: 'mm' });
    const pp = buildPostParams(map, { machine: { spindle_type: 'CAT40', max_rpm: 12000 } });
    expect(pp.operations[0].tool_number).toBe(1);
    expect(pp.operations[0].tool_diameter_mm).toBe(50.8);          // mm → unchanged
    expect(pp.operations[0].holder.gauge_length_mm).toBe(100);     // mm → unchanged (NOT 101.6)
    expect(pp.machine.max_rpm).toBe(12000);
  });
  it('inch input: converts diameter + gauge to mm (×25.4)', () => {
    const map = buildPocketMap([
      { type: 'face', tool: { type: 'face mill', diameter: 2.0, flutes: 5, holder: { type: 'CAT40', gauge_length: 4.0 } } },
    ], { units: 'inch' });
    const pp = buildPostParams(map);
    expect(pp.operations[0].tool_diameter_mm).toBeCloseTo(50.8, 3);
    expect(pp.operations[0].holder.gauge_length_mm).toBeCloseTo(101.6, 3);
  });
  it('maps a drill tool to operation_type drill', () => {
    const map = buildPocketMap([{ type: 'drill', tool: { type: 'drill', diameter: 6.35, flutes: 2 } }], { units: 'mm' });
    expect(buildPostParams(map).operations[0].operation_type).toBe('drill');
  });
});

// ── fixtures (INCH — the JM Die G20 reality) ──────────────────────────────────
// A realistic op list with a DUPLICATE tool: the 0.5" 4-flute end mill is used for both the
// pocket (op 1) and the contour (op 3). It must collapse to ONE pocket.
const INCH_OPS = [
  { type: 'face',    op_id: 'OP10', tool: { type: 'face mill', diameter: 2.0, flutes: 5, cal_length: 3.0 }, cut_time_min: 1.2 },
  { type: 'pocket',  op_id: 'OP20', tool: { type: 'end mill',  diameter: 0.5, flutes: 4, cal_length: 2.5 }, cut_time_min: 4.0 },
  { type: 'drill',   op_id: 'OP30', tool: { type: 'drill',     diameter: 0.25, flutes: 2, point_angle: 118, cal_length: 3.2 }, cut_time_min: 0.8 },
  { type: 'contour', op_id: 'OP40', tool: { type: 'end mill',  diameter: 0.5, flutes: 4, cal_length: 2.5 }, cut_time_min: 2.1 },
  { type: 'tap',     op_id: 'OP50', tool: { type: 'tap',       diameter: 0.3125, flutes: 3, cal_length: 2.8 }, cut_time_min: 0.5 },
];

describe('resolveWinMaxType — op→WinMax tool-type label', () => {
  it('maps the HurcoV11 op enum through OP_TO_WINMAX_TYPE when no explicit tool type', () => {
    expect(resolveWinMaxType({ type: 'face' }, {})).toBe('FACE MILL');
    expect(resolveWinMaxType({ type: 'pocket' }, {})).toBe('END MILL');
    expect(resolveWinMaxType({ type: '3d_surface' }, {})).toBe('BALL END MILL');
    expect(resolveWinMaxType({ type: 'bore' }, {})).toBe('BORING HEAD');
  });
  it('honors an explicit verbatim WinMax type over op inference (R8 author intent wins)', () => {
    expect(resolveWinMaxType({ type: 'pocket' }, { type: 'CHAMFER MILL' })).toBe('CHAMFER MILL');
  });
  it('resolves cutter-name synonyms to the canonical label', () => {
    expect(resolveWinMaxType({}, { type: 'ballnose' })).toBe('BALL END MILL');
    expect(resolveWinMaxType({}, { type: 'spot drill' })).toBe('CENTER DRILL');
    expect(resolveWinMaxType({}, { type: 'bullnose' })).toBe('BULL NOSE MILL');
  });
  it('falls back to UNKNOWN (non-blocking per User Guide p99) for an unmappable op', () => {
    expect(resolveWinMaxType({ type: 'frobnicate' }, {})).toBe('UNKNOWN');
    expect(resolveWinMaxType({}, {})).toBe('UNKNOWN');
  });
  it('every emitted type is a member of the real ADD_TOOL_FORM dropdown enum', () => {
    for (const v of Object.values(OP_TO_WINMAX_TYPE)) expect(WINMAX_TOOL_TYPES).toContain(v);
  });
});

describe('normalizeTool — units carried verbatim, never scaled', () => {
  it('extracts diameter/flutes/angle and stamps declared units (NO 25.4x convert)', () => {
    const t = normalizeTool(INCH_OPS[2], 'inch');
    expect(t.type).toBe('DRILL');
    expect(t.diameter).toBe(0.25);
    expect(t.flutes).toBe(2);
    expect(t.point_angle).toBe(118);
    expect(t.units).toBe('inch');
  });
  it('reads the unit-matched diameter suffix (diameter_in under inch) without cross-convert', () => {
    const t = normalizeTool({ type: 'pocket', tool: { type: 'end mill', diameter_in: 0.375, flutes: 3 } }, 'inch');
    expect(t.diameter).toBe(0.375); // taken as-is, NOT multiplied
  });
  it('defaults a missing diameter to 0 (WinMax renders dia-0 unknown, non-blocking)', () => {
    const t = normalizeTool({ type: 'pocket', tool: { type: 'end mill' } }, 'inch');
    expect(t.diameter).toBe(0);
  });
});

describe('toolSignature — geometry-only dedup key', () => {
  it('two ops with the same cutter geometry share a signature (description ignored)', () => {
    const a = normalizeTool({ type: 'pocket', tool: { type: 'end mill', diameter: 0.5, flutes: 4, description: 'rougher' } }, 'inch');
    const b = normalizeTool({ type: 'contour', tool: { type: 'end mill', diameter: 0.5, flutes: 4, description: 'finisher' } }, 'inch');
    expect(toolSignature(a)).toBe(toolSignature(b));
  });
  it('a 0.0001" diameter difference does NOT falsely merge', () => {
    const a = normalizeTool({ tool: { type: 'end mill', diameter: 0.2500, flutes: 4 } }, 'inch');
    const b = normalizeTool({ tool: { type: 'end mill', diameter: 0.2501, flutes: 4 } }, 'inch');
    expect(toolSignature(a)).not.toBe(toolSignature(b));
  });
  it('different flute counts are different pockets', () => {
    const a = normalizeTool({ tool: { type: 'end mill', diameter: 0.5, flutes: 4 } }, 'inch');
    const b = normalizeTool({ tool: { type: 'end mill', diameter: 0.5, flutes: 2 } }, 'inch');
    expect(toolSignature(a)).not.toBe(toolSignature(b));
  });
});

describe('buildPocketMap — dedup + first-use ordering (CASE: duplicate-tool)', () => {
  const map = buildPocketMap(INCH_OPS, { units: 'inch' });

  it('collapses the re-used 0.5" end mill (ops OP20+OP40) into ONE pocket', () => {
    expect(map.distinctTools).toBe(4);            // face, 0.5EM, 0.25drill, tap — NOT 5
    expect(map.pocketCount).toBe(4);              // no sisters here
    const em = map.pockets.find((p) => p.tool.diameter === 0.5 && p.tool.type === 'END MILL');
    expect(em.ops.map((o) => o.op_id)).toEqual(['OP20', 'OP40']);
    expect(em.cut_time_min).toBe(6.1);            // 4.0 + 2.1 summed across the two ops
  });

  it('orders pockets by FIRST-USE: T1=face, T2=0.5EM, T3=0.25drill, T4=tap', () => {
    expect(map.pockets.map((p) => p.pocket)).toEqual(['T1', 'T2', 'T3', 'T4']);
    expect(map.pockets[0].tool.type).toBe('FACE MILL');
    expect(map.pockets[0].tool.diameter).toBe(2.0);
    expect(map.pockets[1].tool.diameter).toBe(0.5);    // first used at op index 1 (before the drill)
    expect(map.pockets[2].tool.type).toBe('DRILL');
    expect(map.pockets[3].tool.type).toBe('TAP');
  });

  it('pocketNumber is sequential 1..n and units are stamped inch', () => {
    expect(map.pockets.map((p) => p.pocketNumber)).toEqual([1, 2, 3, 4]);
    expect(map.units).toBe('inch');
    expect(map.machine).toBe('Hurco VMX42SRTi');
  });

  it('is NOT oversize under the 40-pocket default capacity', () => {
    expect(map.capacity).toBe(DEFAULT_CAPACITY);
    expect(map.oversize).toBe(false);
    expect(map.overCapacityPockets).toEqual([]);
  });

  it('records first_use_op_index matching program order', () => {
    expect(map.pockets.map((p) => p.first_use_op_index)).toEqual([0, 1, 2, 4]);
  });
});

describe('buildPocketMap — CASE: empty op list', () => {
  const map = buildPocketMap([], { units: 'inch' });
  it('produces zero pockets, not oversize, valid envelope', () => {
    expect(map.pocketCount).toBe(0);
    expect(map.distinctTools).toBe(0);
    expect(map.operationCount).toBe(0);
    expect(map.oversize).toBe(false);
    expect(map.pockets).toEqual([]);
    expect(map.sisterCount).toBe(0);
  });
  it('emits an empty define-tool course array for an empty map', () => {
    expect(toDefineToolCourses(map)).toEqual([]);
  });
});

describe('buildPocketMap — CASE: oversize (more distinct tools than capacity)', () => {
  // 6 distinct drills, capacity 4 → oversize; the 2 excess pockets flagged, NONE dropped.
  const ops = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60].map((d, i) => ({
    type: 'drill', op_id: `D${i}`, tool: { type: 'drill', diameter: d, flutes: 2 },
  }));
  const map = buildPocketMap(ops, { units: 'inch', capacity: 4 });

  it('assigns all 6 pockets (never silently drops a tool) but flags oversize', () => {
    expect(map.pocketCount).toBe(6);
    expect(map.distinctTools).toBe(6);
    expect(map.capacity).toBe(4);
    expect(map.oversize).toBe(true);
  });
  it('flags exactly the pockets beyond capacity (T5, T6) as overCapacity', () => {
    expect(map.overCapacityPockets).toEqual(['T5', 'T6']);
    expect(map.pockets.filter((p) => p.overCapacity).map((p) => p.pocket)).toEqual(['T5', 'T6']);
    expect(map.pockets.slice(0, 4).map((p) => p.overCapacity)).toEqual([false, false, false, false]);
  });
});

describe('buildPocketMap — sister-pocket reservation when life < cut time', () => {
  const ops = [
    // 0.5" EM cuts 12 min total but predicted life is only 8 min → reserve a sister.
    { type: 'pocket',  op_id: 'P1', tool: { type: 'end mill', diameter: 0.5, flutes: 4, life_min: 8 }, cut_time_min: 7 },
    { type: 'contour', op_id: 'P2', tool: { type: 'end mill', diameter: 0.5, flutes: 4, life_min: 8 }, cut_time_min: 5 },
    // 1.0" face mill: life 20 min >> cut 2 min → no sister.
    { type: 'face',    op_id: 'F1', tool: { type: 'face mill', diameter: 1.0, flutes: 5, life_min: 20 }, cut_time_min: 2 },
  ];
  const map = buildPocketMap(ops, { units: 'inch' });

  it('reserves a sister pocket for the worn tool and back-references its primary', () => {
    expect(map.distinctTools).toBe(2);                 // EM + face mill
    expect(map.sisterCount).toBe(1);
    expect(map.pocketCount).toBe(3);                   // T1 EM, T2 face, T3 sister-of-T1
    const primary = map.pockets.find((p) => p.pocket === 'T1');
    expect(primary.needs_sister).toBe(true);
    expect(primary.cut_time_min).toBe(12);             // 7 + 5 summed, exceeds the 8 min life
    expect(primary.sister).toBe('T3');
    const sister = map.pockets.find((p) => p.is_sister_of === 'T1');
    expect(sister.pocket).toBe('T3');
    expect(sister.tool.diameter).toBe(0.5);            // identical tool staged
    expect(sister.reason).toBe('predicted life 8min < cut time 12min');
  });
  it('does NOT reserve a sister for the long-life face mill (needs_sister false, no sister field)', () => {
    const face = map.pockets.find((p) => p.tool.type === 'FACE MILL');
    expect(face.needs_sister).toBe(false);
    expect(face.sister ?? 'NONE').toBe('NONE');         // value-based absence check
  });
});

describe('buildPocketMap — units fail-loud (25.4x guard, R12)', () => {
  it('throws when units are undeclared (refuses to guess)', () => {
    expect(() => buildPocketMap(INCH_OPS, {})).toThrow(/25\.4x|refusing to guess/i);
  });
  it('throws on an unrecognized units value', () => {
    expect(() => buildPocketMap(INCH_OPS, { units: 'furlongs' })).toThrow(/inch.*mm|mm.*inch/i);
  });
  it('accepts mm and stamps it (the engine-native unit) without altering numbers', () => {
    const map = buildPocketMap([{ type: 'pocket', tool: { type: 'end mill', diameter: 12, flutes: 4 } }], { units: 'mm' });
    expect(map.units).toBe('mm');
    expect(map.pockets[0].tool.diameter).toBe(12);     // NOT divided by 25.4
  });
});

describe('toDefineToolCourses — harness-replay param emission', () => {
  const map = buildPocketMap(INCH_OPS, { units: 'inch' });
  const courses = toDefineToolCourses(map);

  it('emits one define-tool param row per pocket with the exact harness param names', () => {
    expect(courses).toHaveLength(4);
    const t1 = courses[0];
    // winmax-courses.json `define-tool` accepts toolNumber/diameter/calLength — all present.
    expect(t1.toolNumber).toBe(1);
    expect(t1.diameter).toBe('2');           // string for the field op / valuesMatch numeric compare
    expect(t1.calLength).toBe('3');
    expect(t1.toolType).toBe('FACE MILL');
    expect(t1.units).toBe('inch');
  });
  it('emits the deduped 0.5" end mill exactly once as T2', () => {
    const em = courses.filter((c) => c.diameter === '0.5');
    expect(em).toHaveLength(1);
    expect(em[0].toolNumber).toBe(2);
  });
  it('passes calLength through as null (never invents geometry) when absent', () => {
    const noCal = buildPocketMap([{ type: 'drill', tool: { type: 'drill', diameter: 0.25, flutes: 2 } }], { units: 'inch' });
    const row = toDefineToolCourses(noCal)[0];
    expect(row.calLength).toBe(null);        // value-based: explicitly null, not invented
    expect(row.diameter).toBe('0.25');       // diameter still emitted
  });
});
