/**
 * Real-value tests for toolCribMachines data + toolCribGeometry computation.
 * All assertions use concrete reference values extracted from the design source.
 * No toBeDefined stubs -- every assert encodes WHY the value matters.
 */

import { describe, it, expect } from 'vitest';

import {
  MACH,
  TURRET_TYPES,
  CONN_TYPES,
  seedCrib,
  blankRow,
  defaultWork,
  defaultWP,
  typeTableFor,
  defaultTypeId,
  defaultCount,
  type CribRow,
} from '../data/toolCribMachines';

import { computeCribVals, type CribState } from '../lib/toolCribGeometry';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeState(machineId: string, overrides: Partial<CribState> = {}): CribState {
  const typeId = defaultTypeId(machineId);
  const count  = defaultCount(machineId, typeId);
  return {
    machineId,
    unit: 'in',
    selStation: 1,
    view: 'tooling',
    builder: {
      holderId:  'shrink',
      toolingId: 'em4',
      insertId:  'tialn',
      toolNo:    9,
      heightNo:  9,
      gauge:     '3.5000',
      offDia:    '0.5000',
    },
    crib:  seedCrib(machineId, count),
    work:  defaultWork(machineId),
    wp:    defaultWP(machineId),
    setup: { typeId, count },
    ...overrides,
  };
}

// ── MACH data integrity ──────────────────────────────────────────────────────

describe('MACH constants', () => {
  it('has exactly 12 machines matching the JM Die fleet', () => {
    expect(Object.keys(MACH)).toHaveLength(12);
  });

  it('has 5 magazine mills and 7 turret lathes', () => {
    const mills  = Object.values(MACH).filter(m => m.kind === 'magazine');
    const lathes = Object.values(MACH).filter(m => m.kind === 'turret');
    expect(mills).toHaveLength(5);
    expect(lathes).toHaveLength(7);
  });

  it('vm30i CAT40 mill: travels 30x20x20, zClear 24, atc 24', () => {
    const m = MACH['vm30i'];
    expect(m.conn).toBe('cat40');
    expect(m.atc).toBe(24);
    expect(m.travels.x).toBe(30);
    expect(m.travels.y).toBe(20);
    expect(m.travels.z).toBe(20);
    expect(m.zClear).toBe(24);
  });

  it('om2: travels 20x16x14, zClear 16, atc 10 -- used in footprint triage test', () => {
    const m = MACH['om2'];
    expect(m.travels.x).toBe(20);
    expect(m.travels.y).toBe(16);
    expect(m.travels.z).toBe(14);
    expect(m.zClear).toBe(16);
    expect(m.atc).toBe(10);
  });

  it('lnc8: maxTurn=8, swing=14 -- drives OVER/WATCH thresholds', () => {
    expect(MACH['lnc8'].maxTurn).toBe(8);
    expect(MACH['lnc8'].swing).toBe(14);
  });

  it('l300m: live=true -- seeds live endmill at T8', () => {
    expect(MACH['l300m'].live).toBe(true);
  });

  it('multus: turret=capto_c6', () => {
    expect(MACH['multus'].turret).toBe('capto_c6');
  });

  it('roku: conn=hsk_a63', () => {
    expect(MACH['roku'].conn).toBe('hsk_a63');
  });
});

// ── TURRET_TYPES / CONN_TYPES ────────────────────────────────────────────────

describe('TURRET_TYPES', () => {
  it('vdi30: stations=12, block=0.9', () => {
    expect(TURRET_TYPES['vdi30'].stations).toBe(12);
    expect(TURRET_TYPES['vdi30'].block).toBe(0.9);
  });

  it('bmt45: stations=12, block=0.95', () => {
    expect(TURRET_TYPES['bmt45'].stations).toBe(12);
    expect(TURRET_TYPES['bmt45'].block).toBeCloseTo(0.95);
  });
});

describe('CONN_TYPES', () => {
  it('cat40: gauge=3.5 -- controls default gauge string in builder', () => {
    expect(CONN_TYPES['cat40'].gauge).toBe(3.5);
  });

  it('hsk_a63: gauge=3.2', () => {
    expect(CONN_TYPES['hsk_a63'].gauge).toBeCloseTo(3.2);
  });
});

// ── typeTableFor / defaultTypeId / defaultCount ──────────────────────────────

describe('typeTableFor', () => {
  it('vm30i (magazine) -> returns CONN_TYPES keys (has cat40, no vdi30)', () => {
    const tbl = typeTableFor('vm30i');
    expect('cat40' in tbl).toBe(true);
    expect('vdi30' in tbl).toBe(false);
  });

  it('lnc8 (turret) -> returns TURRET_TYPES keys (has vdi30, no cat40)', () => {
    const tbl = typeTableFor('lnc8');
    expect('vdi30' in tbl).toBe(true);
    expect('cat40' in tbl).toBe(false);
  });

  it('unknown machineId throws "Unknown machineId"', () => {
    expect(() => typeTableFor('bogus_xyz')).toThrow('Unknown machineId');
  });
});

describe('defaultTypeId', () => {
  it('vm30i -> cat40',     () => expect(defaultTypeId('vm30i')).toBe('cat40'));
  it('lnc8 -> vdi30',     () => expect(defaultTypeId('lnc8')).toBe('vdi30'));
  it('l300m -> bmt45',    () => expect(defaultTypeId('l300m')).toBe('bmt45'));
  it('multus -> capto_c6',() => expect(defaultTypeId('multus')).toBe('capto_c6'));
  it('roku -> hsk_a63',   () => expect(defaultTypeId('roku')).toBe('hsk_a63'));
});

describe('defaultCount', () => {
  it('vm30i/cat40 -> 24 (atc pocket count from MACH.atc)', () => {
    expect(defaultCount('vm30i', 'cat40')).toBe(24);
  });

  it('lnc8/vdi30 -> 12 (TURRET_TYPES.vdi30.stations)', () => {
    expect(defaultCount('lnc8', 'vdi30')).toBe(12);
  });

  it('om2/cat40 -> 10 (MACH.om2.atc)', () => {
    expect(defaultCount('om2', 'cat40')).toBe(10);
  });

  it('m460v/cat40 -> 32 (MACH.m460v.atc)', () => {
    expect(defaultCount('m460v', 'cat40')).toBe(32);
  });
});

// ── seedCrib ─────────────────────────────────────────────────────────────────

describe('seedCrib', () => {
  it('vm30i count=24: produces exactly 24 rows', () => {
    expect(seedCrib('vm30i', 24)).toHaveLength(24);
  });

  it('vm30i: exactly 8 loaded tools in stations 1-8', () => {
    const rows   = seedCrib('vm30i', 24);
    const loaded = rows.filter(r => r.loaded);
    expect(loaded).toHaveLength(8);
    expect(loaded.map(r => r.stn)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('vm30i T1: 1/2" 4FL shrink-fit EM, proj=4.25, len="4.2500", lifePct=0.82', () => {
    const row = seedCrib('vm30i', 24)[0];
    expect(row.loaded).toBe(true);
    expect(row.T).toBe(1);
    expect(row.len).toBe('4.2500');
    expect(row.dia).toBe('0.5000');
    expect(row.proj).toBeCloseTo(4.25);
    expect(row.lifePct).toBeCloseTo(0.82);
    expect(row.holder).toBe('HAIMER shrink');
    expect(row.tooling).toBe('4FL endmill');
  });

  it('vm30i T8: reamer proj=4.62, lifePct=0.42 (lowest life in seed)', () => {
    const row = seedCrib('vm30i', 24)[7];
    expect(row.loaded).toBe(true);
    expect(row.T).toBe(8);
    expect(row.proj).toBeCloseTo(4.62);
    expect(row.lifePct).toBeCloseTo(0.42);
  });

  it('vm30i loaded lifePct values all in [0,1]', () => {
    seedCrib('vm30i', 24).filter(r => r.loaded).forEach(r => {
      expect(r.lifePct).toBeGreaterThanOrEqual(0);
      expect(r.lifePct).toBeLessThanOrEqual(1);
    });
  });

  it('lnc8 count=12: exactly 6 turret tools loaded', () => {
    expect(seedCrib('lnc8', 12).filter(r => r.loaded)).toHaveLength(6);
  });

  it('lnc8 T1: OD rough turning, proj=1.2, len="1.2000"', () => {
    const row = seedCrib('lnc8', 12)[0];
    expect(row.loaded).toBe(true);
    expect(row.proj).toBeCloseTo(1.2);
    expect(row.len).toBe('1.2000');
    expect(row.tooling).toBe('OD turning');
  });

  it('l300m (live=true, count=12): station 8 is a loaded live endmill at proj=2.8', () => {
    const rows = seedCrib('l300m', 12);
    const s8   = rows.find(r => r.stn === 8);
    expect(s8?.loaded).toBe(true);
    expect(s8?.tooling).toBe('Live endmill');
    expect(s8?.proj).toBeCloseTo(2.8);
  });

  it('lnc8 (live=undefined): station 8 NOT loaded (no live tooling)', () => {
    const rows = seedCrib('lnc8', 12);
    const s8   = rows.find(r => r.stn === 8);
    expect(s8?.loaded).toBe(false);
  });

  it('unknown machineId throws "Unknown machineId"', () => {
    expect(() => seedCrib('not_a_machine', 12)).toThrow('Unknown machineId');
  });

  it('resize clamp -- count=4: first 4 rows include the 4 loaded tools from vm30i seed', () => {
    // Manually slice + restamp (mirrors what a UI resize does)
    const original = seedCrib('vm30i', 24);
    const shrunk   = original.slice(0, 4).map((r, i) => ({ ...r, stn: i + 1 }));
    expect(shrunk).toHaveLength(4);
    expect(shrunk.filter(r => r.loaded)).toHaveLength(4);
  });

  it('resize clamp -- grow to 64: 8 loaded rows survive, 56 blank appended', () => {
    const original = seedCrib('vm30i', 24);
    const grown    = Array.from({ length: 64 }, (_, i) =>
      original[i] ? { ...original[i], stn: i + 1 } : blankRow(i + 1),
    );
    expect(grown).toHaveLength(64);
    expect(grown.filter(r => r.loaded)).toHaveLength(8);
    expect(grown[63].loaded).toBe(false);
  });
});

// ── blankRow ──────────────────────────────────────────────────────────────────

describe('blankRow', () => {
  it('stn=7: loaded=false, T=0, lifePct=0', () => {
    const r = blankRow(7);
    expect(r.stn).toBe(7);
    expect(r.loaded).toBe(false);
    expect(r.T).toBe(0);
    expect(r.lifePct).toBe(0);
  });
});

// ── defaultWork / defaultWP ──────────────────────────────────────────────────

describe('defaultWork', () => {
  it('vm30i (mill): 6 rows; G54 x="-12.4051", y="-8.2210", z="-14.0330"', () => {
    const w = defaultWork('vm30i');
    expect(w).toHaveLength(6);
    expect(w[0].code).toBe('G54');
    expect(w[0].x).toBe('-12.4051');
    expect(w[0].y).toBe('-8.2210');
    expect(w[0].z).toBe('-14.0330');
  });

  it('lnc8 (lathe): 6 rows; G54 y="" (no Y axis), z="-12.6050"', () => {
    const w = defaultWork('lnc8');
    expect(w).toHaveLength(6);
    expect(w[0].y).toBe('');
    expect(w[0].z).toBe('-12.6050');
  });
});

describe('defaultWP', () => {
  it('vm30i (mill): px=6, py=4, pz=2.5, depth=1.2, fixture=1.5', () => {
    const wp = defaultWP('vm30i');
    expect(wp.px).toBe(6);
    expect(wp.py).toBe(4);
    expect(wp.pz).toBeCloseTo(2.5);
    expect(wp.depth).toBeCloseTo(1.2);
    expect(wp.fixture).toBeCloseTo(1.5);
    expect(wp.fixType).toBe('vise');
  });

  it('lnc8 (turret, maxTurn=8): dia = min(8*0.6, 6) = 4.8', () => {
    expect(defaultWP('lnc8').dia).toBeCloseTo(4.8);
  });

  it('lnc8 (turret): pz=8 (lathe default), fixType="chuck"', () => {
    const wp = defaultWP('lnc8');
    expect(wp.pz).toBe(8);
    expect(wp.fixType).toBe('chuck');
  });

  it('l300m (turret, maxTurn=13): dia = min(13*0.6, 6) = 6.0', () => {
    expect(defaultWP('l300m').dia).toBeCloseTo(6.0);
  });
});

// ── computeCribVals: mill Z clearance triage ─────────────────────────────────

describe('computeCribVals -- mill Z clearance', () => {
  it('vm30i default seed: stack 8.62 < zClear=24, but T1 proj=4.25 with loaded T2 neighbor -> MAG WATCH (worst=1)', () => {
    // pz=2.5, fixture=1.5 -> stack=4.0; longest seeded proj=4.62 (T8 reamer)
    // total = 8.62 << zClear=24 -> Z clearance OK
    // BUT T1 proj=4.25 > 4.0 threshold AND T2 is loaded (adjacent) -> MAG sev 1 -> worst=1
    const vals = computeCribVals(makeState('vm30i'));
    expect(vals.worst).toBe(1);
    expect(vals.statusLabel).toBe('TRIAGE: CHECK');
    const mag = vals.issues.find(i => i.tag === 'MAG');
    expect(mag?.color).toBe('#F4B740');
  });

  it('vm30i with only short tools (proj<=4.0) and good Z: worst=0, PLAUSIBLE', () => {
    // Override with a crib of only proj=3.0 tools (no MAG adjacency trigger)
    const crib: CribRow[] = [
      { stn: 1, T: 1, name: 'short EM', holder: 'HAIMER shrink', tooling: '4FL endmill',
        insert: 'TiAlN', proj: 3.0, w: 2, H: 1, len: '3.0', dia: '0.5', wear: '0', lifePct: 0.9, loaded: true },
      ...Array.from({ length: 23 }, (_, i) => blankRow(i + 2)),
    ];
    // sel=station 1, proj=3.0 > depth+fixture+0.3=3.0 (not strictly less) -> no REACH
    const state = makeState('vm30i', { crib, wp: { ...defaultWP('vm30i'), depth: 0.5, fixture: 1.0 } });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(0);
    expect(vals.statusLabel).toBe('TRIAGE: PLAUSIBLE');
    expect(vals.statusColor).toBe('#36D399');
  });

  it('om2: forced tall stack (pz=12, fix=2) + seeded longest=4.62 -> 18.62>16 -> CRASH worst=2', () => {
    // om2 zClear=16; stack=12+2=14; longest seeded=4.62; total=18.62 > 16 -> CRASH sev 2
    const state = makeState('om2', {
      wp: { ...defaultWP('om2'), pz: 12, fixture: 2, px: 6, py: 4, depth: 1.2 },
    });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(2);
    expect(vals.statusLabel).toBe('TRIAGE: STOP');
    expect(vals.statusColor).toBe('#FF5247');
    // verify the CRASH issue was emitted with the red collision color
    const crash = vals.issues.find(i => i.tag === 'CRASH');
    expect(crash?.color).toBe('#FF5247');
  });

  it('om2: stack just under zClear=16 but in 90% band -> WATCH (worst=1)', () => {
    // zClear=16; 90% = 14.4; target stack+tool = 15 (> 14.4, < 16) -> WATCH
    // pz=3, fixture=1, proj=11 -> 3+1+11=15
    const crib: CribRow[] = [
      { stn: 1, T: 1, name: 'test-tool', holder: 'h', tooling: 't', insert: 'i', proj: 11, w: 2, H: 1, len: '11.0', dia: '0.5', wear: '0', lifePct: 0.8, loaded: true },
      ...Array.from({ length: 9 }, (_, i) => blankRow(i + 2)),
    ];
    const state = makeState('om2', {
      crib,
      wp: { ...defaultWP('om2'), pz: 3, fixture: 1, px: 6, py: 4, depth: 1.2 },
    });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(1);
    expect(vals.statusLabel).toBe('TRIAGE: CHECK');
  });

  it('om2: part footprint 25" x 4" > travel 20x16 -> OVER sev 2 (TRIAGE: STOP)', () => {
    const state = makeState('om2', {
      wp: { ...defaultWP('om2'), px: 25, py: 4 },
    });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(2);
    const over = vals.issues.find(i => i.tag === 'OVER');
    expect(over?.color).toBe('#FF5247');
  });
});

// ── computeCribVals: lathe swing triage ─────────────────────────────────────

describe('computeCribVals -- lathe swing (lnc8 maxTurn=8)', () => {
  it('dia=9 > maxTurn=8 -> OVER sev 2, TRIAGE: STOP', () => {
    const state = makeState('lnc8', {
      wp: { ...defaultWP('lnc8'), dia: 9 },
    });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(2);
    expect(vals.statusLabel).toBe('TRIAGE: STOP');
    const over = vals.issues.find(i => i.tag === 'OVER');
    expect(over?.color).toBe('#FF5247');
  });

  it('dia=7.0 in [0.85*8=6.8, 8) band -> WATCH sev 1, TRIAGE: CHECK (empty crib avoids turret collision)', () => {
    // With seeded tools, boring bar proj=2.8 collides when partR=3.5 -> turretGap=2.3.
    // Use an empty crib to isolate the WATCH swing-diameter check alone.
    const crib: CribRow[] = Array.from({ length: 12 }, (_, i) => blankRow(i + 1));
    const state = makeState('lnc8', {
      crib,
      wp: { ...defaultWP('lnc8'), dia: 7.0 },
    });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(1);
    expect(vals.statusLabel).toBe('TRIAGE: CHECK');
    const watch = vals.issues.find(i => i.tag === 'WATCH');
    expect(watch?.color).toBe('#F4B740');
  });

  it('dia=7.0 with seeded tools -> CRASH dominates WATCH (boring bar proj=2.8 > turretGap=2.3)', () => {
    // partR=3.5, turretGap=max(0.5, 14/2-3.5-1.2)=max(0.5,2.3)=2.3; seeded T3 boring bar proj=2.8 > 2.3
    const state = makeState('lnc8', {
      wp: { ...defaultWP('lnc8'), dia: 7.0 },
    });
    const vals = computeCribVals(state);
    expect(vals.worst).toBe(2);
    const crash = vals.issues.find(i => i.tag === 'CRASH');
    expect(crash?.color).toBe('#FF5247');
  });

  it('dia=4.0 << 6.8 lower bound -> no OVER, no WATCH for swing', () => {
    const state = makeState('lnc8', {
      wp: { ...defaultWP('lnc8'), dia: 4.0 },
    });
    const vals = computeCribVals(state);
    // the OVER/WATCH for part swing should not exist
    const swingOver  = vals.issues.find(i => i.tag === 'OVER' && i.title.includes('max turning'));
    const swingWatch = vals.issues.find(i => i.tag === 'WATCH' && i.title.includes('swing'));
    expect(swingOver).toBeUndefined();
    expect(swingWatch).toBeUndefined();
  });
});

// ── computeCribVals: assembly chain ─────────────────────────────────────────

describe('computeCribVals -- assembly chain', () => {
  it('always exactly 4 stages', () => {
    expect(computeCribVals(makeState('vm30i')).assembly).toHaveLength(4);
    expect(computeCribVals(makeState('lnc8')).assembly).toHaveLength(4);
  });

  it('mill assembly stage tags in order: SPINDLE -> HOLDER -> TOOLING -> EDGE', () => {
    const a = computeCribVals(makeState('vm30i')).assembly;
    expect(a[0].tag).toBe('SPINDLE');
    expect(a[1].tag).toBe('HOLDER');
    expect(a[2].tag).toBe('TOOLING');
    expect(a[3].tag).toBe('EDGE');
  });

  it('lathe assembly stage tags in order: TURRET STATION -> HOLDER -> TOOLING -> INSERT', () => {
    const a = computeCribVals(makeState('lnc8')).assembly;
    expect(a[0].tag).toBe('TURRET STATION');
    expect(a[1].tag).toBe('HOLDER');
    expect(a[2].tag).toBe('TOOLING');
    expect(a[3].tag).toBe('INSERT');
  });

  it('last stage arrow="", first three arrow="->"', () => {
    const a = computeCribVals(makeState('vm30i')).assembly;
    expect(a[0].arrow).toBe('->');
    expect(a[1].arrow).toBe('->');
    expect(a[2].arrow).toBe('->');
    expect(a[3].arrow).toBe('');
  });
});

// ── computeCribVals: slot markers ────────────────────────────────────────────

describe('computeCribVals -- slot markers', () => {
  it('vm30i: 24 slot markers (ATC pocket count)', () => {
    expect(computeCribVals(makeState('vm30i')).slots).toHaveLength(24);
  });

  it('lnc8: 12 slot markers (turret station count)', () => {
    expect(computeCribVals(makeState('lnc8')).slots).toHaveLength(12);
  });

  it('selected station (1) gets fill #FF5A2B (orange)', () => {
    const vals = computeCribVals(makeState('vm30i', { selStation: 1 }));
    expect(vals.slots[0].fill).toBe('#FF5A2B');
  });

  it('loaded but un-selected station gets blue-tint fill rgba(42,111,219,...)', () => {
    // station 2 is loaded in seed; station 1 is selected
    const vals = computeCribVals(makeState('vm30i', { selStation: 1 }));
    expect(vals.slots[1].fill).toBe('rgba(42,111,219,0.22)');
  });

  it('empty station gets dark fill #16181D', () => {
    // station 9+ are blank in vm30i seed
    const vals = computeCribVals(makeState('vm30i', { selStation: 1 }));
    expect(vals.slots[8].fill).toBe('#16181D');
  });
});

// ── computeCribVals: tool shapes ─────────────────────────────────────────────

describe('computeCribVals -- tool shapes', () => {
  it('vm30i default seed: 8 tool shapes for 8 loaded tools', () => {
    expect(computeCribVals(makeState('vm30i')).toolShapes).toHaveLength(8);
  });

  it('empty crib: 0 tool shapes', () => {
    const crib  = Array.from({ length: 24 }, (_, i) => blankRow(i + 1));
    const state = makeState('vm30i', { crib });
    expect(computeCribVals(state).toolShapes).toHaveLength(0);
  });
});

// ── computeCribVals: turret swing collision ──────────────────────────────────

describe('computeCribVals -- turret swing collision (lnc8)', () => {
  it('tool proj=5 > turretGap=3.4 -> CRASH sev 2', () => {
    // lnc8: swing=14, dia default=4.8, partR=2.4
    // turretGap = max(0.5, 14/2 - 2.4 - 1.2) = max(0.5, 3.4) = 3.4
    // proj=5 > 3.4 -> collision
    const crib: CribRow[] = [
      { stn: 1, T: 1, name: 'mega drill', holder: 'Drill sleeve', tooling: 'Drilling',
        insert: 'bare', proj: 5, w: 1, H: 1, len: '5.0', dia: '0', wear: '0', lifePct: 0.5, loaded: true },
      ...Array.from({ length: 11 }, (_, i) => blankRow(i + 2)),
    ];
    const state = makeState('lnc8', { crib });
    const vals  = computeCribVals(state);
    expect(vals.worst).toBe(2);
    const crash = vals.issues.find(i => i.tag === 'CRASH');
    expect(crash?.color).toBe('#FF5247');
  });

  it('tool proj=1.5 < turretGap=3.4 -> no CRASH', () => {
    const crib: CribRow[] = [
      { stn: 1, T: 1, name: 'short OD', holder: 'OD turning block', tooling: 'OD turning',
        insert: 'CNMG 432', proj: 1.5, w: 2, H: 1, len: '1.5', dia: '0.03', wear: '0', lifePct: 0.7, loaded: true },
      ...Array.from({ length: 11 }, (_, i) => blankRow(i + 2)),
    ];
    const state = makeState('lnc8', { crib, wp: { ...defaultWP('lnc8'), dia: 4.8 } });
    const vals  = computeCribVals(state);
    expect(vals.issues.find(i => i.tag === 'CRASH')).toBeUndefined();
  });
});

// ── computeCribVals: ATC adjacency (MAG) ─────────────────────────────────────

describe('computeCribVals -- ATC adjacency (magazine)', () => {
  it('proj=4.5 tool with loaded neighbor -> MAG issue emitted (sev 1, amber)', () => {
    const crib: CribRow[] = Array.from({ length: 24 }, (_, i) => blankRow(i + 1));
    crib[0] = { stn: 1, T: 1, name: 'long drill', holder: 'HAIMER shrink', tooling: 'Carbide drill',
      insert: 'TiAlN', proj: 4.5, w: 1, H: 1, len: '4.5', dia: '0.25', wear: '0', lifePct: 0.8, loaded: true };
    crib[1] = { stn: 2, T: 2, name: 'short EM',   holder: 'Schunk hydraulic', tooling: '4FL endmill',
      insert: 'TiAlN', proj: 2.0, w: 2, H: 2, len: '2.0', dia: '0.5', wear: '0', lifePct: 0.9, loaded: true };
    const state = makeState('vm30i', { crib });
    const vals  = computeCribVals(state);
    const mag   = vals.issues.find(i => i.tag === 'MAG');
    expect(mag?.color).toBe('#F4B740');
  });

  it('proj=4.5 tool with empty neighbors -> no MAG issue', () => {
    const crib: CribRow[] = Array.from({ length: 24 }, (_, i) => blankRow(i + 1));
    // station 6 has the long tool; 5 and 7 are blank -> no adjacency
    crib[5] = { stn: 6, T: 6, name: 'long drill', holder: 'ER collet', tooling: 'Carbide drill',
      insert: 'bare', proj: 4.5, w: 1, H: 6, len: '4.5', dia: '0.25', wear: '0', lifePct: 0.7, loaded: true };
    const state = makeState('vm30i', { crib });
    expect(computeCribVals(state).issues.find(i => i.tag === 'MAG')).toBeUndefined();
  });
});

// ── computeCribVals: adversarial inputs ─────────────────────────────────────

describe('computeCribVals -- adversarial inputs', () => {
  it('unknown machineId throws "Unknown machineId"', () => {
    const state = makeState('vm30i');
    state.machineId = 'not_real';
    expect(() => computeCribVals(state)).toThrow('Unknown machineId');
  });

  it('empty crib (length 0): stationCount=0, loadedCount=0, no throw', () => {
    const state = makeState('vm30i', { crib: [] });
    const vals  = computeCribVals(state);
    expect(vals.stationCount).toBe(0);
    expect(vals.loadedCount).toBe(0);
    // worst must still be a valid TriageSeverity (0|1|2)
    expect([0, 1, 2]).toContain(vals.worst);
  });

  it('wp.dia=0 on lathe: no NaN in worst or issues (turretGap falls back to swing/2)', () => {
    const state = makeState('lnc8', { wp: { ...defaultWP('lnc8'), dia: 0 } });
    const vals  = computeCribVals(state);
    expect(isNaN(vals.worst as number)).toBe(false);
    vals.issues.forEach(iss => {
      expect(iss.color).toMatch(/^#/);
    });
  });

  it('all 10 om2 pockets loaded, proj=2.5, pz=2.5, fix=1.5: total=6.5 < 16 -> no CRASH', () => {
    const crib: CribRow[] = Array.from({ length: 10 }, (_, i) => ({
      stn: i + 1, T: i + 1, name: 'EM', holder: 'HAIMER shrink', tooling: '4FL endmill',
      insert: 'TiAlN', proj: 2.5, w: 2, H: i + 1, len: '2.5', dia: '0.5', wear: '0', lifePct: 0.9, loaded: true as const,
    }));
    const state = makeState('om2', { crib, wp: { ...defaultWP('om2'), pz: 2.5, fixture: 1.5 } });
    const vals  = computeCribVals(state);
    expect(vals.issues.find(i => i.tag === 'CRASH')).toBeUndefined();
    expect(vals.worst).toBeLessThan(2);
  });
});

// ── computeCribVals: 3D data props ───────────────────────────────────────────

describe('computeCribVals -- 3D data props', () => {
  it('c3=1 when worst=2 (3D model shows collision flag)', () => {
    const state = makeState('om2', {
      wp: { ...defaultWP('om2'), pz: 12, fixture: 2, px: 6, py: 4, depth: 1.2 },
    });
    const vals = computeCribVals(state);
    expect(vals.c3).toBe(1);
  });

  it('c3=0 when worst < 2', () => {
    const vals = computeCribVals(makeState('vm30i'));
    // default seed -> no collision -> c3 must be 0
    expect(vals.c3).toBe(0);
  });

  it('m3turn matches MACH maxTurn for lnc8', () => {
    expect(computeCribVals(makeState('lnc8')).m3turn).toBe(8);
  });

  it('m3turn matches MACH maxTurn for l300m', () => {
    expect(computeCribVals(makeState('l300m')).m3turn).toBe(13);
  });

  it('t3x / t3z match MACH travels for vm30i', () => {
    const vals = computeCribVals(makeState('vm30i'));
    expect(vals.t3x).toBe(30);
    expect(vals.t3z).toBe(20);
  });
});

// ── computeCribVals: iface / layoutLabel ─────────────────────────────────────

describe('computeCribVals -- iface and layoutLabel', () => {
  it('vm30i: iface="CAT40"', () => {
    expect(computeCribVals(makeState('vm30i')).iface).toBe('CAT40');
  });

  it('roku (hsk_a63): iface="HSK-A63"', () => {
    expect(computeCribVals(makeState('roku')).iface).toBe('HSK-A63');
  });

  it('lnc8 layoutLabel contains "TURRET"', () => {
    expect(computeCribVals(makeState('lnc8')).layoutLabel).toContain('TURRET');
  });

  it('vm30i layoutLabel contains "ATC"', () => {
    expect(computeCribVals(makeState('vm30i')).layoutLabel).toContain('ATC');
  });

  it('lnc8 layoutLabel = "VDI30 TURRET"', () => {
    expect(computeCribVals(makeState('lnc8')).layoutLabel).toBe('VDI30 TURRET');
  });

  it('vm30i layoutLabel = "CAT40 ATC"', () => {
    expect(computeCribVals(makeState('vm30i')).layoutLabel).toBe('CAT40 ATC');
  });
});

// ── computeCribVals: kinematics view geometry ─────────────────────────────────

describe('computeCribVals -- kinematics view geometry', () => {
  it('mill kin view: ctxRects and ctxLines both non-empty', () => {
    const vals = computeCribVals(makeState('vm30i', { view: 'kin' }));
    expect(vals.ctxRects.length).toBeGreaterThan(0);
    expect(vals.ctxLines.length).toBeGreaterThan(0);
  });

  it('lathe kin view: ctxRects and ctxLines both non-empty', () => {
    const vals = computeCribVals(makeState('lnc8', { view: 'kin' }));
    expect(vals.ctxRects.length).toBeGreaterThan(0);
    expect(vals.ctxLines.length).toBeGreaterThan(0);
  });

  it('mill tooling view: ctxCircles non-empty (ATC carousel rings)', () => {
    const vals = computeCribVals(makeState('vm30i', { view: 'tooling' }));
    expect(vals.ctxCircles.length).toBeGreaterThan(0);
  });

  it('mill tooling view: svgLabels contains "SPINDLE" label', () => {
    const vals    = computeCribVals(makeState('vm30i', { view: 'tooling' }));
    const spindle = vals.svgLabels.find(l => l.t === 'SPINDLE');
    expect(spindle?.t).toBe('SPINDLE');
    expect(typeof spindle?.x).toBe('number');
  });

  it('lathe tooling view: svgLabels contains "CHUCK" label', () => {
    const vals  = computeCribVals(makeState('lnc8', { view: 'tooling' }));
    const chuck = vals.svgLabels.find(l => l.t === 'CHUCK');
    expect(chuck?.t).toBe('CHUCK');
  });

  it('mill tooling view: ATC label shows iface and pocket count', () => {
    // svgLabels[1] from design: iface + " . " + n
    const vals = computeCribVals(makeState('vm30i', { view: 'tooling' }));
    const atcLabel = vals.svgLabels.find(l => l.t.includes('CAT40') && l.t.includes('24'));
    expect(atcLabel?.t).toBe('CAT40 · 24');
  });
});

// ── computeCribVals: loadedCount / stationCount ──────────────────────────────

describe('computeCribVals -- loadedCount and stationCount', () => {
  it('vm30i default seed: loadedCount=8, stationCount=24', () => {
    const vals = computeCribVals(makeState('vm30i'));
    expect(vals.loadedCount).toBe(8);
    expect(vals.stationCount).toBe(24);
  });

  it('lnc8 default seed: loadedCount=6, stationCount=12', () => {
    const vals = computeCribVals(makeState('lnc8'));
    expect(vals.loadedCount).toBe(6);
    expect(vals.stationCount).toBe(12);
  });
});
