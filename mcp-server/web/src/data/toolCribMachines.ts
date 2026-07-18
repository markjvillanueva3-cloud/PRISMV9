/**
 * Tool Crib & Setup -- machine data constants and pure helpers.
 * Ported 1:1 from design: Kienzle Tool Crib.dc.html lines ~297-368, ~330-368.
 * This is a data module; values ARE the table (not physics constants).
 */

// ── Machine kind discriminant ───────────────────────────────────────────────

export type MachineKind = 'magazine' | 'turret' | 'gang';

// ── MACH -- 12 JM Die machines ──────────────────────────────────────────────

export interface MachineEntry {
  short: string;
  label: string;
  kind: MachineKind;
  conn?: string;          // magazine only
  atc?: number;           // magazine: ATC pocket count
  turret?: string;        // turret only: turret type id
  live?: boolean;         // turret: has live tooling
  swing?: number;         // lathe: swing diameter (in)
  maxTurn?: number;       // lathe: max turning diameter (in)
  barCap?: number;        // lathe: bar capacity (in)
  travels: { x: number; y?: number; z: number };
  zClear?: number;        // mill: Z clearance (in)
  axes: string[];
}

export const MACH: Record<string, MachineEntry> = {
  vm30i:  { short: 'VM30i',   label: 'Hurco VM30i',            kind: 'magazine', conn: 'cat40',     atc: 24, travels: { x: 30, y: 20, z: 20 }, zClear: 24, axes: ['X','Y','Z'] },
  m460v:  { short: 'M460V',   label: 'Okuma M460V-5AX',        kind: 'magazine', conn: 'cat40',     atc: 32, travels: { x: 30, y: 18, z: 18 }, zClear: 22, axes: ['X','Y','Z'] },
  vf2:    { short: 'VF-2',    label: 'Haas VF-2',              kind: 'magazine', conn: 'cat40',     atc: 21, travels: { x: 30, y: 16, z: 20 }, zClear: 22, axes: ['X','Y','Z'] },
  om2:    { short: 'OM-2',    label: 'Haas OM-2',              kind: 'magazine', conn: 'cat40',     atc: 10, travels: { x: 20, y: 16, z: 14 }, zClear: 16, axes: ['X','Y','Z'] },
  roku:   { short: 'Roku-R',  label: 'Roku-Roku HC658-II',     kind: 'magazine', conn: 'hsk_a63',   atc: 20, travels: { x: 25, y: 20, z: 16 }, zClear: 18, axes: ['X','Y','Z'] },
  l300m:  { short: 'L300-M',  label: 'Okuma GENOS L300-M',     kind: 'turret',   turret: 'bmt45',   live: true,  swing: 21,   maxTurn: 13,  barCap: 3.1, travels: { x: 9, z: 22 }, axes: ['X','Z'] },
  l200em: { short: 'L200E-M', label: 'Okuma GENOS L200E-M',    kind: 'turret',   turret: 'bmt45',   live: true,  swing: 18.9, maxTurn: 13,  barCap: 2.5, travels: { x: 8, z: 20 }, axes: ['X','Z'] },
  lnc8:   { short: 'LNC8',    label: 'Okuma LNC8',             kind: 'turret',   turret: 'vdi30',               swing: 14,   maxTurn: 8,   barCap: 2.0, travels: { x: 6, z: 14 }, axes: ['X','Z'] },
  crown:  { short: 'Crown',   label: 'Okuma Crown L1060',      kind: 'turret',   turret: 'vdi40',               swing: 25,   maxTurn: 12,  barCap: 3.0, travels: { x: 9, z: 24 }, axes: ['X','Z'] },
  l400ii: { short: 'L400II',  label: 'Okuma GENOS L400II-E',   kind: 'turret',   turret: 'bmt55',               swing: 27,   maxTurn: 14,  barCap: 3.1, travels: { x: 10, z: 24 }, axes: ['X','Z'] },
  lb3000: { short: 'LB3000',  label: 'Okuma LB3000EX BB',      kind: 'turret',   turret: 'bmt55',               swing: 25.6, maxTurn: 12.6,barCap: 4.1, travels: { x: 9, z: 22 }, axes: ['X','Z'] },
  multus: { short: 'Multus',  label: 'Okuma Multus B250II',    kind: 'turret',   turret: 'capto_c6', live: true, swing: 20,  maxTurn: 13,  barCap: 2.6, travels: { x: 9, z: 30 }, axes: ['X','Z'] },
};

// ── Turret types ─────────────────────────────────────────────────────────────

export interface TurretTypeEntry {
  label: string;
  stations: number;
  block: number;
}

export const TURRET_TYPES: Record<string, TurretTypeEntry> = {
  vdi20:    { label: 'VDI20',    stations: 8,  block: 0.72 },
  vdi30:    { label: 'VDI30',    stations: 12, block: 0.9  },
  vdi40:    { label: 'VDI40',    stations: 12, block: 1.1  },
  vdi50:    { label: 'VDI50',    stations: 16, block: 1.3  },
  bmt45:    { label: 'BMT45',    stations: 12, block: 0.95 },
  bmt55:    { label: 'BMT55',    stations: 12, block: 1.12 },
  bmt65:    { label: 'BMT65',    stations: 12, block: 1.3  },
  capto_c6: { label: 'Capto C6', stations: 12, block: 1.05 },
};

// ── Connection types (mill spindle) ──────────────────────────────────────────

export interface ConnTypeEntry {
  label: string;
  gauge: number;
  block: number;
}

export const CONN_TYPES: Record<string, ConnTypeEntry> = {
  cat40:    { label: 'CAT40',    gauge: 3.5, block: 1.0  },
  cat50:    { label: 'CAT50',    gauge: 4.5, block: 1.4  },
  bt30:     { label: 'BT30',     gauge: 2.8, block: 0.8  },
  bt40:     { label: 'BT40',     gauge: 3.5, block: 1.0  },
  hsk_a63:  { label: 'HSK-A63', gauge: 3.2, block: 0.95 },
  hsk_a100: { label: 'HSK-A100',gauge: 4.0, block: 1.3  },
};

// ── Gang-plate type (used by gang-kind machines) ──────────────────────────────

export interface GangTypeEntry {
  label: string;
  stations: number;
  block: number;
}

export const GANG_TYPE: Record<string, GangTypeEntry> = {
  gang: { label: 'Gang plate', stations: 6, block: 0.6 },
};

// ── Holders (per machine kind) ────────────────────────────────────────────────

export interface HolderOption {
  id: string;
  label: string;
}

export const HOLDERS: Record<MachineKind, HolderOption[]> = {
  magazine: [
    { id: 'shrink',     label: 'HAIMER shrink-fit'       },
    { id: 'hyd',        label: 'Schunk hydraulic'         },
    { id: 'er',         label: 'ER collet chuck'          },
    { id: 'shell',      label: 'Shell-mill arbor'         },
    { id: 'drillchuck', label: 'Drill chuck'              },
  ],
  turret: [
    { id: 'od',     label: 'OD turning block'       },
    { id: 'bore',   label: 'Boring-bar holder'       },
    { id: 'thread', label: 'Threading laydown'       },
    { id: 'groove', label: 'Grooving block'          },
    { id: 'drill',  label: 'Drill sleeve'            },
    { id: 'live',   label: 'Live-tool ER (driven)'   },
  ],
  gang: [
    { id: 'od',   label: 'Gang OD block'    },
    { id: 'face', label: 'Gang facing block' },
    { id: 'drill',label: 'Gang ID sleeve'    },
    { id: 'live', label: 'Gang live-tool ER' },
  ],
};

// ── Tooling (per machine kind) ────────────────────────────────────────────────

export interface ToolingOption {
  id: string;
  label: string;
  proj: number;  // default projection (in)
  w: number;     // visual width weight
}

export const TOOLING: Record<MachineKind, ToolingOption[]> = {
  magazine: [
    { id: 'em4',     label: '4FL square endmill',  proj: 3.0, w: 2 },
    { id: 'ball',    label: '2FL ball endmill',    proj: 3.0, w: 2 },
    { id: 'face',    label: 'Face mill',            proj: 2.0, w: 3 },
    { id: 'spot',    label: 'Spot drill',           proj: 3.0, w: 1 },
    { id: 'drill',   label: 'Carbide drill',        proj: 3.6, w: 1 },
    { id: 'reamer',  label: 'Reamer',               proj: 4.2, w: 1 },
    { id: 'chamfer', label: 'Chamfer mill',         proj: 3.0, w: 1 },
    { id: 'tap',     label: 'Tap',                  proj: 3.2, w: 2 },
  ],
  turret: [
    { id: 'od_turn', label: 'OD turning',          proj: 1.2, w: 2 },
    { id: 'profile', label: 'Profiling',            proj: 1.1, w: 2 },
    { id: 'bore',    label: 'Boring bar',           proj: 2.8, w: 1 },
    { id: 'thread',  label: 'Threading',            proj: 1.0, w: 2 },
    { id: 'groove',  label: 'Grooving / parting',   proj: 0.9, w: 1 },
    { id: 'drill',   label: 'Drilling',             proj: 3.0, w: 1 },
    { id: 'live_em', label: 'Live endmill',         proj: 2.8, w: 2 },
  ],
  gang: [
    { id: 'od_turn', label: 'OD turning', proj: 1.0, w: 2 },
    { id: 'face',    label: 'Facing',     proj: 0.9, w: 2 },
    { id: 'bore',    label: 'ID boring',  proj: 1.8, w: 1 },
    { id: 'drill',   label: 'Drilling',   proj: 1.9, w: 1 },
    { id: 'thread',  label: 'Threading',  proj: 0.9, w: 2 },
  ],
};

// ── Inserts (per machine kind) ────────────────────────────────────────────────

export interface InsertOption {
  id: string;
  label: string;
}

export const INSERTS: Record<MachineKind, InsertOption[]> = {
  magazine: [
    { id: 'tialn', label: 'Carbide · TiAlN'  },
    { id: 'alcrn', label: 'Carbide · AlCrN'  },
    { id: 'bare',  label: 'Carbide · uncoated'},
    { id: 'pcd',   label: 'PCD (alu)'         },
  ],
  turret: [
    { id: 'cnmg432',    label: 'CNMG 432 · TiAlN' },
    { id: 'dnmg431',    label: 'DNMG 431 · TiAlN' },
    { id: 'ccmt',       label: 'CCMT 32.51'        },
    { id: 'thread16er', label: '16ER 1.0 ISO'      },
    { id: 'mgmn300',    label: 'MGMN 300'          },
    { id: 'wnmg',       label: 'WNMG 432'          },
  ],
  gang: [
    { id: 'cnmg431',    label: 'CNMG 431 · TiAlN' },
    { id: 'dcmt',       label: 'DCMT 21.51'        },
    { id: 'thread11er', label: '11ER A60'           },
  ],
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the type-table appropriate for a given machine:
 * magazine -> CONN_TYPES, turret -> TURRET_TYPES, gang -> GANG_TYPE.
 */
export function typeTableFor(machineId: string): Record<string, { label: string; stations?: number; block: number; gauge?: number }> {
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);
  if (m.kind === 'turret') return TURRET_TYPES;
  if (m.kind === 'gang')   return GANG_TYPE;
  return CONN_TYPES;
}

/** Returns the default type id for the machine (turret type, conn type, or 'gang'). */
export function defaultTypeId(machineId: string): string {
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);
  if (m.kind === 'turret') return m.turret ?? 'vdi30';
  if (m.kind === 'gang')   return 'gang';
  return m.conn ?? 'cat40';
}

/**
 * Returns the default station/pocket count for a machine + typeId combination.
 * magazine -> m.atc; turret/gang -> typeTable stations.
 */
export function defaultCount(machineId: string, typeId: string): number {
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);
  if (m.kind === 'magazine') return m.atc ?? 24;
  const tt = typeTableFor(machineId)[typeId];
  return tt?.stations ?? (m.kind === 'gang' ? 6 : 12);
}

// ── CribRow ───────────────────────────────────────────────────────────────────

export interface CribRow {
  stn: number;
  T: number;
  name: string;
  holder: string;
  tooling: string;
  insert: string;
  proj: number;
  w: number;
  H: number;
  len: string;
  dia: string;
  wear: string;
  lifePct: number;
  loaded: boolean;
}

/** Returns an empty (unloaded) crib row for station number `stn`. */
export function blankRow(stn: number): CribRow {
  return { stn, T: 0, name: '', holder: '', tooling: '', insert: '', proj: 1.0, w: 2, H: 0, len: '', dia: '', wear: '0.0000', lifePct: 0, loaded: false };
}

/**
 * Produces a seeded crib array with `count` stations, pre-loaded with
 * representative tools for the machine kind. Faithfully ported from the
 * design's seedCrib() method.
 */
export function seedCrib(machineId: string, count: number): CribRow[] {
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);
  const rows: CribRow[] = Array.from({ length: count }, (_, i) => blankRow(i + 1));
  const set = (i: number, d: Partial<CribRow> & { loaded: true }) => {
    if (i < rows.length) rows[i] = { ...rows[i], ...d };
  };

  if (m.kind === 'magazine') {
    set(0, { loaded: true, T: 1, name: '1/2" 4FL carbide TiAlN EM',  holder: 'HAIMER shrink',    tooling: '4FL endmill',  insert: 'TiAlN', proj: 4.25, w: 2, H: 1, len: '4.2500', dia: '0.5000', wear: '0.0000', lifePct: 0.82 });
    set(1, { loaded: true, T: 2, name: '3/8" 4FL finish EM',          holder: 'Schunk hydraulic', tooling: '4FL endmill',  insert: 'TiAlN', proj: 3.88, w: 2, H: 2, len: '3.8750', dia: '0.3750', wear: '0.0002', lifePct: 0.64 });
    set(2, { loaded: true, T: 3, name: '#4 spot drill',               holder: 'ER collet',        tooling: 'Spot drill',   insert: 'TiAlN', proj: 3.12, w: 1, H: 3, len: '3.1200', dia: '0.5000', wear: '0.0000', lifePct: 0.91 });
    set(3, { loaded: true, T: 4, name: '.250 carbide drill',          holder: 'ER collet',        tooling: 'Carbide drill',insert: 'bare',   proj: 4.01, w: 1, H: 4, len: '4.0100', dia: '0.2500', wear: '0.0000', lifePct: 0.55 });
    set(4, { loaded: true, T: 5, name: '2" face mill',                holder: 'Shell arbor',      tooling: 'Face mill',    insert: 'AlCrN', proj: 2.6,  w: 3, H: 5, len: '2.6000', dia: '2.0000', wear: '0.0001', lifePct: 0.73 });
    set(5, { loaded: true, T: 6, name: '1/4" ball EM',                holder: 'HAIMER shrink',    tooling: '2FL ball',     insert: 'TiAlN', proj: 3.44, w: 2, H: 6, len: '3.4400', dia: '0.2500', wear: '0.0000', lifePct: 0.88 });
    set(6, { loaded: true, T: 7, name: '90 deg chamfer mill',         holder: 'ER collet',        tooling: 'Chamfer mill', insert: 'TiAlN', proj: 3.05, w: 1, H: 7, len: '3.0500', dia: '0.5000', wear: '0.0000', lifePct: 0.79 });
    set(7, { loaded: true, T: 8, name: '.500 reamer',                 holder: 'Schunk hydraulic', tooling: 'Reamer',       insert: 'bare',  proj: 4.62, w: 1, H: 8, len: '4.6200', dia: '0.5000', wear: '0.0000', lifePct: 0.42 });
  } else if (m.kind === 'turret') {
    set(0, { loaded: true, T: 1, name: 'OD rough turning',  holder: 'OD turning block',    tooling: 'OD turning', insert: 'CNMG 432', proj: 1.2, w: 2, H: 1, len: '1.2000', dia: '0.0312', wear: '0.0010', lifePct: 0.58 });
    set(1, { loaded: true, T: 2, name: 'OD finish',          holder: 'OD turning block',    tooling: 'Profiling',  insert: 'DNMG 431', proj: 1.1, w: 2, H: 2, len: '1.1000', dia: '0.0156', wear: '0.0004', lifePct: 0.71 });
    set(2, { loaded: true, T: 3, name: 'Boring bar dia.500', holder: 'Boring holder',       tooling: 'Boring bar', insert: 'CCMT 32.51',proj:2.8, w: 1, H: 3, len: '2.8000', dia: '0.0156', wear: '0.0002', lifePct: 0.80 });
    set(3, { loaded: true, T: 4, name: 'Threading 1/2-20',   holder: 'Threading laydown',   tooling: 'Threading',  insert: '16ER 1.0',  proj: 1.0, w: 2, H: 4, len: '1.0000', dia: '0.0000', wear: '0.0000', lifePct: 0.66 });
    set(4, { loaded: true, T: 5, name: 'Grooving / parting', holder: 'Grooving block',      tooling: 'Grooving',   insert: 'MGMN 300',  proj: 0.9, w: 1, H: 5, len: '0.9000', dia: '0.0000', wear: '0.0006', lifePct: 0.49 });
    set(5, { loaded: true, T: 6, name: 'Center drill dia.375',holder: 'Drill sleeve',       tooling: 'Drilling',   insert: 'bare',      proj: 3.0, w: 1, H: 6, len: '3.2000', dia: '0.0000', wear: '0.0000', lifePct: 0.84 });
    if (m.live && count > 7) {
      set(7, { loaded: true, T: 8, name: 'Live 1/4" cross-mill', holder: 'Live-tool ER', tooling: 'Live endmill', insert: 'TiAlN', proj: 2.8, w: 2, H: 8, len: '2.8800', dia: '0.2500', wear: '0.0000', lifePct: 0.93 });
    }
  } else {
    // gang
    set(0, { loaded: true, T: 1, name: 'OD rough turning', holder: 'Gang OD block',  tooling: 'OD turning', insert: 'CNMG 431', proj: 1.0, w: 2, H: 1, len: '1.0000', dia: '0.0312', wear: '0.0008', lifePct: 0.62 });
    set(1, { loaded: true, T: 2, name: 'OD finish',         holder: 'Gang OD block',  tooling: 'Facing',     insert: 'DCMT 21.51',proj: 0.9, w: 2, H: 2, len: '0.9000', dia: '0.0156', wear: '0.0003', lifePct: 0.74 });
    set(2, { loaded: true, T: 3, name: 'ID drill dia.125',  holder: 'Gang ID sleeve', tooling: 'Drilling',   insert: 'bare',      proj: 1.9, w: 1, H: 3, len: '1.9000', dia: '0.0000', wear: '0.0000', lifePct: 0.88 });
    set(3, { loaded: true, T: 4, name: 'Thread M6x1',       holder: 'Gang OD block',  tooling: 'Threading',  insert: '11ER A60',  proj: 0.9, w: 2, H: 4, len: '0.9000', dia: '0.0000', wear: '0.0000', lifePct: 0.70 });
  }
  return rows;
}

// ── Work offset rows ──────────────────────────────────────────────────────────

export interface WorkRow {
  code: string;
  x: string;
  y: string;
  z: string;
  src: 'probe' | 'manual' | 'g53';
}

/** Returns default G54..G59 work offset rows for the machine. */
export function defaultWork(machineId: string): WorkRow[] {
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);
  const lathe = m.kind !== 'magazine';
  if (lathe) {
    return [
      { code: 'G54', x: '-8.4120', y: '', z: '-12.6050', src: 'probe'  },
      { code: 'G55', x: '-8.4120', y: '', z: '-9.1180',  src: 'probe'  },
      { code: 'G56', x: '0.0000',  y: '', z: '0.0000',   src: 'manual' },
      { code: 'G57', x: '0.0000',  y: '', z: '0.0000',   src: 'manual' },
      { code: 'G58', x: '0.0000',  y: '', z: '0.0000',   src: 'manual' },
      { code: 'G59', x: '0.0000',  y: '', z: '0.0000',   src: 'manual' },
    ];
  }
  return [
    { code: 'G54', x: '-12.4051', y: '-8.2210', z: '-14.0330', src: 'probe'  },
    { code: 'G55', x: '-6.1200',  y: '-8.2210', z: '-14.0330', src: 'probe'  },
    { code: 'G56', x: '0.0000',   y: '0.0000',  z: '0.0000',   src: 'manual' },
    { code: 'G57', x: '0.0000',   y: '0.0000',  z: '0.0000',   src: 'manual' },
    { code: 'G58', x: '0.0000',   y: '0.0000',  z: '0.0000',   src: 'manual' },
    { code: 'G59', x: '0.0000',   y: '0.0000',  z: '0.0000',   src: 'manual' },
  ];
}

// ── Workpiece defaults ────────────────────────────────────────────────────────

export interface WorkpieceState {
  dia: number;
  px: number;
  py: number;
  pz: number;
  depth: number;
  fixture: number;
  fixType: string;
  fixX: number;
  fixY: number;
  origin: string;
  snap: boolean;
}

/** Returns default workpiece values for the machine (in inches). */
export function defaultWP(machineId: string): WorkpieceState {
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);
  if (m.kind === 'magazine') {
    return { dia: 0, px: 6, py: 4, pz: 2.5, depth: 1.2, fixture: 1.5, fixType: 'vise', fixX: 0, fixY: 0, origin: 'corner', snap: true };
  }
  return {
    dia: m.maxTurn != null ? Math.min(m.maxTurn * 0.6, 6) : 1.0,
    px: 0, py: 0,
    pz: m.kind === 'gang' ? 3 : 8,
    depth: 0, fixture: 0,
    fixType: 'chuck', fixX: 0, fixY: 0, origin: 'face', snap: true,
  };
}
