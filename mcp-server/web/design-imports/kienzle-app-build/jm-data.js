/* ============================================================================
   jm-data.js — KIENZLE SINGLE SOURCE OF TRUTH
   ----------------------------------------------------------------------------
   Every Kienzle screen binds to THIS module so they correlate for any input
   combination. The fleet wires each .dc.html's renderVals() to read from here
   (or from /api/v1, which serves the same shapes). One change here — a machine
   spec, a material kc, a job's actual cost — propagates everywhere at once.

   Sections:
     1. MACHINES   — the real 12 JM Die machines (shared by SFC, Tool Crib,
                     Shop Floor, Scheduling, Thermal, Warm-Up, Alarm Decoder)
     2. MATERIALS  — kc1.1 / mc / Taylor / thermal (SFC, Materials DB, Quote)
     3. CUSTOMERS  — the 6 active accounts (Quote, ERP, Customer Portal, Shop)
     4. JOBS       — the canonical job ledger with consistent est/actual cost
                     (Job Cost, Payroll, Shop Floor, Scheduling, ERP, Academy)
     5. PHYSICS    — the ONE Kienzle solver (SFC, Quote, Post, Trilobe)
   The "SIG cavity bleeds margin" storyline is encoded once in JOBS and surfaces
   identically in every business screen.
   ============================================================================ */

export const MACHINES = {
  vm30i:  { id: 'vm30i',  cell: 'VMC-01', label: 'Hurco VM30i',          kind: 'mill',     ctrl: 'WinMAX v10',   dialect: 'fanuc', conn: 'cat40',   maxRpm: 12000, hp: 20,  rigid: 0.92, travels: { x: 30, y: 20, z: 20 } },
  m460v:  { id: 'm460v',  cell: 'VMC-02', label: 'Okuma M460V-5AX',      kind: 'mill',     ctrl: 'OSP-P300MA',   dialect: 'osp',   conn: 'cat40',   maxRpm: 15000, hp: 30,  rigid: 1.00, travels: { x: 30, y: 18, z: 18 } },
  vf2:    { id: 'vf2',    cell: 'VMC-03', label: 'Haas VF-2',            kind: 'mill',     ctrl: 'PRE-NGC',      dialect: 'fanuc', conn: 'cat40',   maxRpm: 8100,  hp: 30,  rigid: 0.74, travels: { x: 30, y: 16, z: 20 } },
  om2:    { id: 'om2',    cell: 'VMC-04', label: 'Haas OM-2',            kind: 'mill',     ctrl: 'PRE-NGC',      dialect: 'fanuc', conn: 'cat40',   maxRpm: 30000, hp: 7.5, rigid: 0.60, travels: { x: 20, y: 16, z: 14 } },
  roku:   { id: 'roku',   cell: 'VMC-05', label: 'Roku-Roku HC658-II',   kind: 'mill',     ctrl: 'Fanuc 31i-B5', dialect: 'fanuc', conn: 'hsk_a63', maxRpm: 40000, hp: 15,  rigid: 0.95, travels: { x: 25, y: 20, z: 16 } },
  l300m:  { id: 'l300m',  cell: 'LTH-01', label: 'Okuma GENOS L300-M',   kind: 'turn',     ctrl: 'OSP-P300L-R',  dialect: 'osplathe', turret: 'bmt45', live: true, maxRpm: 5000, hp: 20, rigid: 0.90, swing: 21,   maxTurn: 13,   barCap: 3.1 },
  l200em: { id: 'l200em', cell: 'LTH-02', label: 'Okuma GENOS L200E-M',  kind: 'turn',     ctrl: 'OSP-P200LA-R', dialect: 'osplathe', turret: 'bmt45', live: true, maxRpm: 6000, hp: 15, rigid: 0.86, swing: 18.9, maxTurn: 13,   barCap: 2.5 },
  lnc8:   { id: 'lnc8',   cell: 'LTH-03', label: 'Okuma LNC8',           kind: 'turn',     ctrl: 'OSP-U10L',     dialect: 'osplathe', turret: 'vdi30', live: false, maxRpm: 4500, hp: 10, rigid: 0.78, swing: 14,   maxTurn: 8,    barCap: 2.0 },
  crown:  { id: 'crown',  cell: 'LTH-04', label: 'Okuma Crown L1060',    kind: 'turn',     ctrl: 'OSP-U10L',     dialect: 'osplathe', turret: 'vdi40', live: false, maxRpm: 3800, hp: 20, rigid: 0.84, swing: 25,   maxTurn: 12,   barCap: 3.0 },
  l400ii: { id: 'l400ii', cell: 'LTH-05', label: 'Okuma GENOS L400II-E', kind: 'turn',     ctrl: 'OSP-P300LA-E', dialect: 'osplathe', turret: 'bmt55', live: false, maxRpm: 3800, hp: 25, rigid: 0.90, swing: 27,   maxTurn: 14,   barCap: 3.1 },
  lb3000: { id: 'lb3000', cell: 'LTH-06', label: 'Okuma LB3000EX BB',    kind: 'turn',     ctrl: 'OSP-P500',     dialect: 'osplathe', turret: 'bmt55', live: false, maxRpm: 3200, hp: 25, rigid: 0.92, swing: 25.6, maxTurn: 12.6, barCap: 4.1 },
  multus: { id: 'multus', cell: 'LTH-07', label: 'Okuma Multus B250II',  kind: 'millturn', ctrl: 'OSP-P300SA',   dialect: 'osp',   turret: 'capto_c6', live: true, maxRpm: 5000, hp: 22, rigid: 0.88, swing: 20,   maxTurn: 13,   barCap: 2.6 },
};

/* kc1.1 N/mm², mc Kienzle exponent, Taylor C (m/min) & n, thermal k (W/m·K),
   density g/cc, nominal carbide SFM, ISO group, cal=JM-calibrated. */
export const MATERIALS = {
  d2:       { id: 'd2',       name: 'D2 Tool Steel', iso: 'K/H', kc: 3100, mc: 0.18, tC: 110,  tN: 0.16, k: 20,  rho: 7.70, sfm: 200,  hard: '58-62', cal: true  },
  a2:       { id: 'a2',       name: 'A2 Tool Steel', iso: 'K/H', kc: 2950, mc: 0.19, tC: 120,  tN: 0.17, k: 24,  rho: 7.86, sfm: 215,  hard: '57-60', cal: false },
  s7:       { id: 's7',       name: 'S7 Shock Steel', iso: 'K/H', kc: 2750, mc: 0.20, tC: 140, tN: 0.18, k: 27,  rho: 7.83, sfm: 250,  hard: '52-56', cal: false },
  m2:       { id: 'm2',       name: 'M2 HSS',        iso: 'H',   kc: 2600, mc: 0.27, tC: 95,   tN: 0.15, k: 21,  rho: 8.10, sfm: 180,  hard: '60-64', cal: false },
  h13:      { id: 'h13',      name: 'H13',           iso: 'H',   kc: 2400, mc: 0.22, tC: 165,  tN: 0.19, k: 28,  rho: 7.80, sfm: 300,  hard: '44-52', cal: false },
  '4140':   { id: '4140',     name: '4140 PH',       iso: 'P',   kc: 1950, mc: 0.23, tC: 200,  tN: 0.20, k: 42,  rho: 7.85, sfm: 360,  hard: '28-32', cal: true  },
  '174ph':  { id: '174ph',    name: '17-4 PH H900',  iso: 'M',   kc: 2350, mc: 0.26, tC: 175,  tN: 0.20, k: 18,  rho: 7.75, sfm: 330,  hard: '38-44', cal: true  },
  ti64:     { id: 'ti64',     name: 'Ti-6Al-4V',     iso: 'S',   kc: 1450, mc: 0.32, tC: 90,   tN: 0.22, k: 6.7, rho: 4.43, sfm: 190,  hard: '32-38', cal: true  },
  '6061':   { id: '6061',     name: '6061-T6',       iso: 'N',   kc: 700,  mc: 0.21, tC: 900,  tN: 0.33, k: 167, rho: 2.70, sfm: 1200, hard: '95 HB', cal: false },
  graphite: { id: 'graphite', name: 'Graphite EDM-3', iso: 'N/A', kc: 300, mc: 0.22, tC: 1200, tN: 0.30, k: 85,  rho: 1.80, sfm: 1600, hard: 'n/a',   cal: false },
};

export const CUSTOMERS = {
  semblex: { id: 'semblex', name: 'SEMBLEX Corp.', mtd: 92400, otd: 0.97, trend: +0.18 },
  optimas: { id: 'optimas', name: 'OPTIMAS',       mtd: 64100, otd: 0.95, trend: +0.07 },
  altracs: { id: 'altracs', name: 'ALTRACS',       mtd: 48900, otd: 0.93, trend: -0.04 },
  sfs:     { id: 'sfs',     name: 'SFS Group',     mtd: 37200, otd: 0.96, trend: +0.11 },
  sigsauer:{ id: 'sigsauer',name: 'SIG SAUER',     mtd: 29500, otd: 0.88, trend: +0.02 },
  topura:  { id: 'topura',  name: 'TOPURA',        mtd: 22100, otd: 0.94, trend: 0.00 },
};

/* Canonical job ledger. est/act = [material, labor, burden, outside] $.
   The SIG cavity (jobs[4]) is the ONE losing job — its labor overrun is the
   single thread tying Job Cost, Payroll, Shop Floor, Scheduling, Academy and
   the Alarm Decoder together. Edit it here and every screen agrees. */
export const JOBS = [
  { id: 'semblex', no: 'JOB-4471', customer: 'semblex', part: 'Trilobe forming punch', qty: 500,  machine: 'l300m',  material: 'd2',     status: 'shipped',  rev: 12400, est: [2100, 4800, 2400, 300],  act: [2040, 3960, 2300, 280],  pace: 1.18 },
  { id: 'optimas', no: 'JOB-4468', customer: 'optimas', part: 'Hex-flange die insert', qty: 50,   machine: 'm460v',  material: 'a2',     status: 'invoiced', rev: 28500, est: [5200, 9800, 4900, 1200], act: [5180, 10350, 4950, 1180], pace: 0.91 },
  { id: 'altracs', no: 'JOB-4475', customer: 'altracs', part: 'Taptite punch',         qty: 200,  machine: 'vf2',    material: 'd2',     status: 'open',     rev: 9800,  est: [1600, 3900, 1950, 250],  act: [1640, 4180, 1980, 250],  pace: 1.04 },
  { id: 'sfs',     no: 'JOB-4462', customer: 'sfs',     part: 'Ejector / KO pin',      qty: 1200, machine: 'l200em', material: 'm2',     status: 'shipped',  rev: 37200, est: [7400, 12600, 6300, 900], act: [7250, 11800, 6150, 880], pace: 1.10 },
  { id: 'sigsauer',no: 'JOB-4459', customer: 'sigsauer',part: 'Carbide core cavity',   qty: 8,    machine: 'vm30i',  material: 'd2',     status: 'late',     rev: 14200, est: [3800, 5200, 2600, 1100], act: [4100, 9800, 3200, 1450], pace: 0.74 },
  { id: 'topura',  no: 'JOB-4466', customer: 'topura',  part: 'Header die cavity',     qty: 120,  machine: 'multus', material: '174ph',  status: 'invoiced', rev: 22100, est: [4600, 8200, 4100, 700],  act: [4540, 8050, 4000, 690],  pace: 0.96 },
  { id: 'stalcop', no: 'JOB-4477', customer: 'optimas', part: 'Cold-form collar die',  qty: 300,  machine: 'lb3000', material: 's7',     status: 'open',     rev: 16800, est: [3100, 6700, 3350, 500],  act: [3180, 7050, 3380, 510],  pace: 0.94 },
];

/* ── THE single physics solver. SFC, Quote, Post, Trilobe all call this so a
   given (machine, material, tool, cut, mode, aggressiveness) ALWAYS yields the
   same RPM / feed / force / safety everywhere. ── */
export function solveSpeedFeed(input) {
  const m = MACHINES[input.machineId] || MACHINES.vm30i;
  const mat = MATERIALS[input.materialId] || MATERIALS.d2;
  const modeF = ({ tool: { vc: 0.78, fz: 0.82 }, rush: { vc: 1.28, fz: 1.22 }, optimal: { vc: 1.0, fz: 1.0 }, upgrade: { vc: 1.12, fz: 1.10 } })[input.mode || 'optimal'];
  const toolVc = ({ carbide_tialn: 1.0, carbide_alcrn: 1.22, carbide: 0.82, ceramic: 2.6, hss: 0.45 })[input.toolType] ?? 1.0;
  const aggrF = 0.62 + ((input.aggr ?? 50) / 100) * 0.76;
  const dia = Math.max(0.03, input.toolDia ?? 0.5);
  const flutes = Math.max(1, Math.round(input.flutes ?? 4));
  let sfm = mat.sfm * toolVc * modeF.vc * aggrF;
  let rpm = (sfm * 12) / (Math.PI * dia);
  if (rpm > m.maxRpm) { rpm = m.maxRpm; sfm = (rpm * Math.PI * dia) / 12; }
  const fz = mat.fz ? mat.fz : (0.0014 * Math.pow(dia / 0.5, 0.35)); // mat.fz optional; fallback geometric
  const feedIpm = (mat.fzBase ?? 0.0014) * Math.pow(dia / 0.5, 0.35) * modeF.fz * aggrF * flutes * rpm;
  const ap = Math.max(0, input.ap ?? 0.25), ae = Math.max(0, input.ae ?? 0.15);
  const fzmm = ((mat.fzBase ?? 0.0014) * modeF.fz * aggrF) * 25.4;
  const Fc = mat.kc * Math.max(0.1, ap * 25.4) * Math.pow(Math.max(0.01, fzmm), 1 - mat.mc) * (0.35 + 0.65 * Math.min(1, ae / dia));
  const powerHp = ((Fc * (sfm * 0.3048)) / 60000 / 0.85) * 1.341;
  const loadPct = Math.min(150, (powerHp / m.hp) * 100);
  return { machine: m, material: mat, sfm, rpm, feedIpm, mrr: ap * ae * feedIpm, forceN: Fc, powerHp, loadPct };
}

export const totalCost = (arr) => arr.reduce((a, b) => a + b, 0);
export const jobMargin = (job) => (job.rev - totalCost(job.act)) / job.rev;

/* UMD-style global fallback so non-module screens (and the standalone
   .dc.html previews) can read window.KIENZLE without an import. */
if (typeof window !== 'undefined') {
  window.KIENZLE = { MACHINES, MATERIALS, CUSTOMERS, JOBS, solveSpeedFeed, totalCost, jobMargin };
}
