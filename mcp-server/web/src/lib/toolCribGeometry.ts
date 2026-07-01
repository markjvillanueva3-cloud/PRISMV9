/**
 * Tool Crib & Setup -- pure geometry + triage computation.
 * Ported 1:1 from design: Kienzle Tool Crib.dc.html renderVals() lines ~433-641.
 * No DOM, no React, no side effects. All inputs explicit; output is a plain object.
 */

import {
  MACH,
  CONN_TYPES,
  HOLDERS,
  TOOLING,
  INSERTS,
  typeTableFor,
  type CribRow,
  type WorkpieceState,
  type WorkRow,
} from '../data/toolCribMachines';

// ── Input state the caller supplies ─────────────────────────────────────────

export interface CribState {
  machineId: string;
  unit: 'in' | 'mm';
  selStation: number;
  view: 'tooling' | 'kin';
  builder: {
    holderId: string;
    toolingId: string;
    insertId: string;
    toolNo: number;
    heightNo: number;
    gauge: string;
    offDia: string;
  };
  crib: CribRow[];
  work: WorkRow[];
  wp: WorkpieceState;
  setup: { typeId: string; count: number };
}

// ── SVG primitive output types ───────────────────────────────────────────────

export interface SvgRect {
  x: number; y: number; w: number; h: number; r: number;
  fill: string; stroke: string; dash: string;
}
export interface SvgLine {
  x1: number; y1: number; x2: number; y2: number;
  c: string; w: number; dash: string;
}
export interface SvgCircle {
  cx: number; cy: number; r: number;
  fill: string; stroke: string; sw: number; dash: string;
}
export interface SvgLabel {
  x: number; y: number; anchor: string; size: number; fill: string; t: string;
}
export interface SlotMarker {
  cx: string; cy: string; r: number;
  fill: string; stroke: string; sw: number;
  ty: string; tc: string; label: number;
}
export interface ToolShape {
  hx: string; hy: string; hw: number; hh: number;
  holderFill: string; holderStroke: string;
  transform: string;
  tx1: string; ty1: string; tx2: string; ty2: string;
  toolColor: string; toolW: number;
}

// ── Issue / triage types ─────────────────────────────────────────────────────

export interface TriageIssue {
  color: string;
  title: string;
  detail: string;
  tag: string;
}

/** Severity 0 = clear, 1 = watch, 2 = collision/over */
export type TriageSeverity = 0 | 1 | 2;

// ── Assembly chain ────────────────────────────────────────────────────────────

export interface AssemblyStage {
  tag: string;
  name: string;
  spec: string;
  bg: string;
  border: string;
  tagColor: string;
  arrow: string;
}

// ── Full output of computeCribVals ────────────────────────────────────────────

export interface CribVals {
  // header / status
  layoutLabel: string;
  loadedCount: number;
  stationCount: number;
  issueSummary: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  statusBorder: string;
  worst: TriageSeverity;

  // SVG visual primitives
  slots: SlotMarker[];
  toolShapes: ToolShape[];
  ctxRects: SvgRect[];
  ctxLines: SvgLine[];
  ctxCircles: SvgCircle[];
  svgLabels: SvgLabel[];

  // panel below the SVG
  assembly: AssemblyStage[];
  issues: TriageIssue[];

  // crib / offset / work rows (derived display data, no callbacks)
  iface: string;

  // 3D data props
  kind3d: string;
  t3x: number; t3y: number; t3z: number;
  p3dia: number; p3len: number; p3x: number; p3y: number; p3z: number;
  p3depth: number; p3fix: number;
  t3tool: number;
  c3: 0 | 1;
  m3turn: number; m3swing: number;
}

// ── Main computation ─────────────────────────────────────────────────────────

/**
 * Pure function: given machine id, unit, and complete crib state,
 * returns all derived display values. No mutations, no DOM.
 */
export function computeCribVals(state: CribState): CribVals {
  const { machineId, unit, selStation, view, builder } = state;
  const m = MACH[machineId];
  if (!m) throw new Error(`Unknown machineId: ${machineId}`);

  const kind = m.kind;
  const lathe = kind !== 'magazine';
  const setup = state.setup;
  const crib = state.crib;
  const wp = state.wp;

  const typeTbl = typeTableFor(machineId);
  const typeDef = typeTbl[setup.typeId] ?? Object.values(typeTbl)[0];
  const blockScale = typeDef?.block ?? 1.0;

  // interface label
  const iface: string = kind === 'magazine'
    ? ((CONN_TYPES[setup.typeId] ?? CONN_TYPES['cat40']).label)
    : kind === 'gang'
      ? 'gang'
      : (typeDef?.label ?? 'VDI30');

  const sel = crib.find(r => r.stn === selStation) ?? crib[0];
  const loadedCount = crib.filter(r => r.loaded).length;
  const loaded = crib.filter(r => r.loaded);

  // ── COLLISION FLAGS ──────────────────────────────────────────────────────
  const collFlags: Record<number, 'swing' | 'mag'> = {};
  let swingWorst = 0;
  let adjWorst = false;
  const pitch = 360 / (crib.length || 1);

  if (lathe && kind === 'turret') {
    const partR = (wp.dia > 0 ? wp.dia : (m.maxTurn ?? 1) * 0.5) / 2;
    const swing2 = (m.swing ?? 0) / 2;
    const turretGap = Math.max(0.5, swing2 - partR - 1.2);
    loaded.forEach(r => {
      if (r.proj > turretGap) {
        collFlags[r.stn] = 'swing';
        swingWorst = Math.max(swingWorst, r.proj - turretGap);
      }
    });
    // adjacency (coarse, mirrors design)
    loaded.forEach(r => {
      const nb = loaded.find(o => o.loaded && Math.abs(o.stn - r.stn) === 1);
      if (nb && (r.w * blockScale + nb.w * blockScale) > (pitch / 9)) {
        // coarse adjacency flag -- design keeps this as a no-op placeholder
      }
    });
  } else if (kind === 'magazine') {
    crib.forEach((r, i) => {
      if (r.loaded && r.proj > 4.0) {
        const prev = crib[(i - 1 + crib.length) % crib.length];
        const next = crib[(i + 1) % crib.length];
        if (prev.loaded || next.loaded) {
          collFlags[r.stn] = 'mag';
          adjWorst = true;
        }
      }
    });
  }

  // ── TRIAGE ISSUES ────────────────────────────────────────────────────────
  const issues: TriageIssue[] = [];
  let worst: TriageSeverity = 0 as TriageSeverity;

  const push = (sev: TriageSeverity, title: string, detail: string, tag: string) => {
    issues.push({
      color: sev === 2 ? '#FF5247' : sev === 1 ? '#F4B740' : '#36D399',
      title, detail, tag,
    });
    if (sev > worst) worst = sev;
  };

  if (lathe) {
    const maxTurn = m.maxTurn ?? 99;
    const partDia = wp.dia;
    if (partDia > maxTurn) {
      push(2, 'Part exceeds max turning dia', `${partDia}" part vs ${maxTurn}" max turn`, 'OVER');
    } else if (partDia > maxTurn * 0.85) {
      push(1, 'Part dia near swing limit', `${partDia}" vs ${maxTurn}" max`, 'WATCH');
    } else {
      push(0, 'Part within swing', `${partDia}" <= ${maxTurn}" max turn`, 'OK');
    }
    if (wp.pz > m.travels.z) {
      push(2, 'Part length exceeds Z travel', `${wp.pz}" vs ${m.travels.z}" Z`, 'OVER');
    } else {
      push(0, 'Length within Z travel', `${wp.pz}" <= ${m.travels.z}"`, 'OK');
    }
    if (kind === 'gang' && wp.dia > (m.barCap ?? 99)) {
      push(2, 'Bar exceeds collet capacity', `${wp.dia}" vs ${m.barCap}" bar cap`, 'OVER');
    }
    if (swingWorst > 0) {
      push(2, 'Turret swing collision', `longest tool ${swingWorst.toFixed(2)}" past clearance`, 'CRASH');
    } else if (kind === 'turret') {
      push(0, 'Turret clears part on index', 'tools inside swing envelope', 'OK');
    }
    const selProj = sel?.loaded ? sel.proj : 0;
    // Mirror the design's `(wp.dia || 1)/2` fallback (renderVals line 463): a 0-dia part
    // must still evaluate the reach-tight watch against a 0.5" centerline, not 0.
    const partR = (wp.dia > 0 ? wp.dia : 1) / 2;
    if (sel?.loaded && selProj < partR + 0.2) {
      push(1, `${sel.name.split(' · ')[0]} reach tight`, `proj ${selProj}" vs ${partR.toFixed(2)}" to centerline`, 'REACH');
    }
  } else {
    // magazine mill
    const travels = m.travels;
    if (wp.px > (travels.x ?? 0) || wp.py > (travels.y ?? 0)) {
      push(2, 'Part footprint exceeds X/Y travel', `${wp.px}x${wp.py}" vs ${travels.x}x${travels.y}"`, 'OVER');
    } else {
      push(0, 'Footprint within X/Y travel', `${wp.px}x${wp.py}" <= ${travels.x}x${travels.y}"`, 'OK');
    }
    const stack = wp.pz + wp.fixture;
    const longest = loaded.length > 0 ? Math.max(0.01, ...loaded.map(r => r.proj)) : 0.01;
    const zClear = m.zClear ?? 99;
    if (stack + longest > zClear) {
      push(2, 'Tool + part exceeds Z clearance', `${(stack + longest).toFixed(1)}" stack+tool vs ${zClear}" gap`, 'CRASH');
    } else if (stack + longest > zClear * 0.9) {
      push(1, 'Z clearance tight', `${(stack + longest).toFixed(1)}" vs ${zClear}"`, 'WATCH');
    } else {
      push(0, 'Z clearance OK', `${(stack + longest).toFixed(1)}" <= ${zClear}"`, 'OK');
    }
    const selProj = sel?.loaded ? sel.proj : 0;
    if (sel?.loaded && selProj < wp.depth + wp.fixture + 0.3) {
      push(1, `${sel.name.split(' · ')[0]} too short for depth`, `reach ${selProj}" vs ${(wp.depth + wp.fixture).toFixed(1)}" needed`, 'REACH');
    } else if (sel?.loaded) {
      push(0, 'Selected tool reaches feature', `${selProj}" reach >= ${wp.depth.toFixed(1)}" deep`, 'OK');
    }
    if (adjWorst) {
      push(1, 'Long tool needs empty ATC neighbor', '>=4" tool with loaded adjacent pocket', 'MAG');
    }
  }

  // `worst` is mutated only inside push() -- a closure TS control-flow analysis cannot
  // track -- so it narrows to the literal 0 at these reads. Math.max yields a plain number
  // for the comparisons; the runtime value (the real max severity) is unchanged.
  const worstN = Math.max(0, worst);
  const statusLabel = worstN === 2 ? 'TRIAGE: STOP' : worstN === 1 ? 'TRIAGE: CHECK' : 'TRIAGE: PLAUSIBLE';
  const statusColor = worstN === 2 ? '#FF5247' : worstN === 1 ? '#F4B740' : '#36D399';
  const statusBg    = worstN === 2 ? 'rgba(255,82,71,0.08)' : worstN === 1 ? 'rgba(244,183,64,0.07)' : 'rgba(54,211,153,0.06)';
  const statusBorder= worstN === 2 ? 'rgba(255,82,71,0.35)' : worstN === 1 ? 'rgba(244,183,64,0.3)'  : 'rgba(54,211,153,0.25)';

  // ── SLOT FILL / STROKE helpers (pure) ───────────────────────────────────
  const slotFill = (r: CribRow): string =>
    r.stn === selStation ? '#FF5A2B'
    : collFlags[r.stn] ? '#FF5247'
    : r.loaded ? 'rgba(42,111,219,0.22)' : '#16181D';
  const slotStroke = (r: CribRow): string =>
    r.stn === selStation ? '#FF8A5A'
    : collFlags[r.stn] ? '#FF5247'
    : r.loaded ? 'rgba(42,111,219,0.6)' : '#2B2F36';
  const slotTc = (r: CribRow): string =>
    r.stn === selStation ? '#0A0B0D'
    : r.loaded ? '#7FB2FF' : '#6B7280';

  // ── VISUAL GEOMETRY ──────────────────────────────────────────────────────
  const slots: SlotMarker[] = [];
  const toolShapes: ToolShape[] = [];
  const ctxRects: SvgRect[] = [];
  const ctxLines: SvgLine[] = [];
  const ctxCircles: SvgCircle[] = [];
  const svgLabels: SvgLabel[] = [];

  if (view === 'tooling') {
    if (kind === 'gang') {
      ctxRects.push(
        { x: 40,  y: 168, w: 64,  h: 70, r: 6, fill: '#15171C', stroke: '#2B2F36', dash: '0' },
        { x: 104, y: 192, w: 150, h: 22, r: 4, fill: '#23262E', stroke: '#3A3D44', dash: '0' },
      );
      svgLabels.push(
        { x: 72,  y: 256, anchor: 'middle', size: 10, fill: '#6B7280', t: 'GUIDE BUSH' },
        { x: 180, y: 256, anchor: 'middle', size: 10, fill: '#6B7280', t: 'BAR dia' + wp.dia + '"' },
      );
      const plateX = 470, gapY = 40, n = crib.length;
      ctxRects.push({ x: plateX - 16, y: 70, w: 20, h: gapY * n + 14, r: 6, fill: '#101216', stroke: 'rgba(255,255,255,0.1)', dash: '0' });
      svgLabels.push({ x: plateX - 6, y: 60, anchor: 'middle', size: 10, fill: '#6B7280', t: 'GANG' });
      crib.forEach((r, i) => {
        const cy = 90 + i * gapY;
        slots.push({ cx: String(plateX + 28), cy: String(cy), r: 14, fill: slotFill(r), stroke: slotStroke(r), sw: r.stn === selStation ? 2 : 1, ty: String(cy + 4), tc: slotTc(r), label: r.stn });
        if (r.loaded) {
          const tl = Math.min(120, r.proj * 32);
          toolShapes.push({ hx: String(plateX + 4), hy: String(cy - 7), hw: 16, hh: 14, holderFill: collFlags[r.stn] ? 'rgba(255,82,71,0.3)' : '#2B2F36', holderStroke: collFlags[r.stn] ? '#FF5247' : '#3A3D44', transform: '', tx1: String(plateX + 4), ty1: String(cy), tx2: String(plateX + 4 - tl), ty2: String(cy), toolColor: r.stn === selStation ? '#FF7A4D' : '#7FB2FF', toolW: 2.5 });
        }
      });
    } else {
      // magazine or turret -- circular ATC / turret layout
      const n = crib.length;
      const cx = 430, cy = 196;
      const R  = n > 16 ? 132 : 116;
      const sr = n > 20 ? 11 : n > 16 ? 13 : 16;
      ctxCircles.push(
        { cx, cy, r: R - sr - 8,  fill: '#101216', stroke: 'rgba(255,255,255,0.1)', sw: 1.5, dash: '0' },
        { cx, cy, r: R - sr - 24, fill: 'none',    stroke: 'rgba(255,255,255,0.06)', sw: 1,   dash: '0' },
      );
      svgLabels.push(
        { x: cx, y: cy - 4,  anchor: 'middle', size: 11, fill: '#9398A2', t: lathe ? 'TURRET' : 'ATC' },
        { x: cx, y: cy + 12, anchor: 'middle', size: 9,  fill: '#6B7280', t: iface + ' · ' + n },
      );
      if (lathe) {
        const maxTurn = m.maxTurn ?? 1;
        const partR = Math.max(14, (wp.dia / maxTurn) * 80);
        ctxRects.push({ x: 60, y: 156, w: 54, h: 78, r: 6, fill: '#15171C', stroke: '#2B2F36', dash: '0' });
        ctxCircles.push({ cx: 150, cy: 195, r: partR, fill: '#1B1E24', stroke: '#3A3D44', sw: 1.5, dash: '0' });
        svgLabels.push(
          { x: 87,  y: 250, anchor: 'middle', size: 10, fill: '#6B7280', t: 'CHUCK' },
          { x: 150, y: 250, anchor: 'middle', size: 10, fill: '#6B7280', t: 'PART dia' + wp.dia + '"' },
        );
        const maxProj = loaded.length > 0 ? Math.max(...loaded.map(r => r.proj), 0.5) : 0.5;
        ctxCircles.push({ cx, cy, r: R + Math.min(60, maxProj * 26), fill: 'none', stroke: swingWorst > 0 ? '#FF5247' : 'rgba(54,211,153,0.4)', sw: 1.2, dash: '5 4' });
      } else {
        ctxRects.push(
          { x: 120, y: 70, w: 44, h: 24, r: 3, fill: '#23262E', stroke: '#3A3D44', dash: '0' },
          { x: 132, y: 94, w: 20, h: 34, r: 2, fill: '#1B1E24', stroke: '#3A3D44', dash: '0' },
        );
        svgLabels.push(
          { x: 142, y: 60,  anchor: 'middle', size: 10, fill: '#6B7280', t: 'SPINDLE' },
          { x: 142, y: 144, anchor: 'middle', size: 9,  fill: '#6B7280', t: iface },
        );
      }
      crib.forEach((r, i) => {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
        const px = cx + R * Math.cos(ang);
        const py = cy + R * Math.sin(ang);
        slots.push({
          cx: px.toFixed(1), cy: py.toFixed(1), r: sr,
          fill: slotFill(r), stroke: slotStroke(r),
          sw: r.stn === selStation ? 2.5 : 1,
          ty: (py + 4).toFixed(1), tc: slotTc(r), label: r.stn,
        });
        if (r.loaded) {
          const dir = lathe ? 1 : -1;
          const tl = Math.min(58, r.proj * 22);
          const ex = px + dir * Math.cos(ang) * tl;
          const ey = py + dir * Math.sin(ang) * tl;
          toolShapes.push({
            hx: (px - 7).toFixed(1), hy: (py - 7).toFixed(1), hw: 14, hh: 14,
            holderFill:   collFlags[r.stn] ? 'rgba(255,82,71,0.3)' : 'transparent',
            holderStroke: collFlags[r.stn] ? '#FF5247' : 'transparent',
            transform: '',
            tx1: px.toFixed(1), ty1: py.toFixed(1),
            tx2: ex.toFixed(1), ty2: ey.toFixed(1),
            toolColor: collFlags[r.stn] ? '#FF5247' : r.stn === selStation ? '#FF7A4D' : '#7FB2FF',
            toolW: 2,
          });
        }
      });
    }
  } else {
    // ── KINEMATICS & ENVELOPE ───────────────────────────────────────────────
    if (lathe) {
      const cyAxis = 196;
      const maxTurn = m.maxTurn ?? 10;
      const travelZ = m.travels.z;
      const partLpx = Math.min(300, (wp.pz / travelZ) * 300 + 60);
      const partR   = Math.max(10, Math.min(70, (wp.dia / maxTurn) * 80));
      // headstock
      ctxRects.push({ x: 40, y: cyAxis - 60, w: 50, h: 120, r: 6, fill: '#15171C', stroke: '#2B2F36', dash: '0' });
      svgLabels.push({ x: 65, y: cyAxis + 86, anchor: 'middle', size: 9, fill: '#6B7280', t: 'HEADSTOCK' });
      // chuck
      ctxRects.push({ x: 90, y: cyAxis - 14, w: 24, h: 28, r: 2, fill: '#23262E', stroke: '#3A3D44', dash: '0' });
      // part body
      ctxRects.push({ x: 114, y: cyAxis - partR, w: partLpx, h: partR * 2, r: 3, fill: '#1B1E24', stroke: wp.dia > maxTurn ? '#FF5247' : '#3A3D44', dash: '0' });
      svgLabels.push({ x: 114 + partLpx / 2, y: cyAxis + partR + 18, anchor: 'middle', size: 9, fill: '#9398A2', t: 'dia' + wp.dia + '" x ' + wp.pz + '"' });
      // tailstock
      ctxRects.push({ x: 114 + partLpx + 8, y: cyAxis - 16, w: 30, h: 32, r: 3, fill: '#15171C', stroke: '#2B2F36', dash: '0' });
      svgLabels.push({ x: 129 + partLpx + 8, y: cyAxis + 40, anchor: 'middle', size: 9, fill: '#6B7280', t: 'T/STOCK' });
      // max swing envelope lines
      ctxLines.push(
        { x1: 114, y1: cyAxis - 80, x2: 420, y2: cyAxis - 80, c: 'rgba(54,211,153,0.4)', w: 1, dash: '5 4' },
        { x1: 114, y1: cyAxis + 80, x2: 420, y2: cyAxis + 80, c: 'rgba(54,211,153,0.4)', w: 1, dash: '5 4' },
      );
      svgLabels.push({ x: 420, y: cyAxis - 84, anchor: 'end', size: 9, fill: '#36D399', t: 'max swing ' + (m.swing ?? 0) + '"' });
      // turret cross-slide
      const turX = 250, turY = cyAxis + 120;
      ctxRects.push({ x: turX - 30, y: turY - 24, w: 60, h: 48, r: 5, fill: '#101216', stroke: '#FF7A4D', dash: '0' });
      svgLabels.push({ x: turX, y: turY + 40, anchor: 'middle', size: 9, fill: '#FF7A4D', t: 'TURRET' });
      ctxRects.push({ x: turX - 90, y: turY - 70, w: 180, h: 120, r: 6, fill: 'none', stroke: 'rgba(42,111,219,0.4)', dash: '5 4' });
      svgLabels.push({ x: turX + 86, y: turY - 74, anchor: 'end', size: 9, fill: '#7FB2FF', t: 'X' + m.travels.x + '" Z' + travelZ + '"' });
      // tool from turret
      const selProj2 = sel?.loaded ? sel.proj : 1;
      const toolTop  = turY - 24 - Math.min(90, selProj2 * 26);
      const partR2   = cyAxis + partR;
      ctxLines.push({ x1: turX, y1: turY - 24, x2: turX, y2: Math.max(partR2, toolTop), c: '#FF7A4D', w: 3, dash: '0' });
      svgLabels.push({ x: 360, y: 40, anchor: 'end', size: 11, fill: '#9398A2', t: m.label + ' -- kinematic envelope (plan)' });
    } else {
      // mill side elevation
      const baseY = 320, tableX = 150, tableW = 360, colX = 540;
      ctxRects.push({ x: colX, y: 60, w: 60, h: 280, r: 4, fill: '#15171C', stroke: '#2B2F36', dash: '0' });
      svgLabels.push({ x: colX + 30, y: 352, anchor: 'middle', size: 9, fill: '#6B7280', t: 'COLUMN' });
      // X travel envelope
      ctxRects.push({ x: tableX - 40, y: baseY - 6, w: tableW + 80, h: 12, r: 2, fill: 'none', stroke: 'rgba(42,111,219,0.4)', dash: '5 4' });
      svgLabels.push({ x: tableX + tableW / 2, y: baseY + 24, anchor: 'middle', size: 9, fill: '#7FB2FF', t: 'X travel ' + (m.travels.x ?? 0) + '"' });
      // table
      ctxRects.push({ x: tableX, y: baseY - 18, w: tableW, h: 18, r: 2, fill: '#23262E', stroke: '#3A3D44', dash: '0' });
      // fixture + part stack
      const fixH  = Math.min(60, wp.fixture * 22);
      const partH = Math.min(110, wp.pz * 22);
      const partW = Math.min(220, wp.px * 22);
      const pcx   = tableX + tableW / 2;
      ctxRects.push({ x: pcx - partW / 2 - 8, y: baseY - 18 - fixH,           w: partW + 16, h: fixH,  r: 2, fill: '#1B1E24', stroke: '#3A3D44', dash: '0' });
      ctxRects.push({ x: pcx - partW / 2,      y: baseY - 18 - fixH - partH,   w: partW,      h: partH, r: 2, fill: '#1B1E24', stroke: wp.px > (m.travels.x ?? 0) ? '#FF5247' : '#3A3D44', dash: '0' });
      ctxRects.push({ x: pcx - 24, y: baseY - 18 - fixH - partH, w: 48, h: Math.min(partH - 6, wp.depth * 22), r: 1, fill: '#0A0B0D', stroke: '#2B2F36', dash: '0' });
      svgLabels.push({ x: pcx, y: baseY + 24, anchor: 'middle', size: 9, fill: '#9398A2', t: 'part ' + wp.px + 'x' + wp.pz + '" · pocket ' + wp.depth + '"' });
      // spindle head
      const spX = pcx, spHeadY = 90;
      ctxRects.push({ x: spX - 34, y: spHeadY, w: 68, h: 30, r: 3, fill: '#23262E', stroke: '#3A3D44', dash: '0' });
      svgLabels.push({ x: spX, y: spHeadY - 8, anchor: 'middle', size: 9, fill: '#6B7280', t: 'SPINDLE ' + iface });
      // Z travel envelope
      const travelZ = m.travels.z ?? 20;
      ctxRects.push({ x: spX + 50, y: spHeadY, w: 10, h: travelZ * 7, r: 1, fill: 'none', stroke: 'rgba(42,111,219,0.4)', dash: '5 4' });
      svgLabels.push({ x: spX + 88, y: spHeadY + travelZ * 3.5, anchor: 'middle', size: 9, fill: '#7FB2FF', t: 'Z ' + travelZ + '"' });
      // tool hanging from spindle
      const selProj3 = sel?.loaded ? sel.proj : 3;
      const tipY     = spHeadY + 30 + Math.min(150, selProj3 * 30);
      const partTopY = baseY - 18 - fixH - partH;
      const zClear   = m.zClear ?? 99;
      const crash    = tipY > partTopY && (wp.pz + wp.fixture + selProj3 > zClear);
      ctxRects.push({ x: spX - 10, y: spHeadY + 30, w: 20, h: 20, r: 2, fill: '#2B2F36', stroke: '#3A3D44', dash: '0' });
      ctxLines.push({ x1: spX, y1: spHeadY + 50, x2: spX, y2: tipY, c: crash ? '#FF5247' : '#FF7A4D', w: 3, dash: '0' });
      svgLabels.push(
        { x: spX + 16, y: spHeadY + 40, anchor: 'start', size: 9, fill: crash ? '#FF5247' : '#FF7A4D', t: 'tool ' + selProj3.toFixed(1) + '"' },
        { x: 360, y: 40, anchor: 'middle', size: 11, fill: '#9398A2', t: m.label + ' -- kinematic envelope (elevation)' },
      );
    }
  }

  // ── ASSEMBLY CHAIN ───────────────────────────────────────────────────────
  const holderLib  = HOLDERS[kind];
  const toolingLib = TOOLING[kind];
  const insertLib  = INSERTS[kind];
  const hSel = holderLib.find(h => h.id === builder.holderId)   ?? holderLib[0];
  const tSel = toolingLib.find(t => t.id === builder.toolingId) ?? toolingLib[0];
  const iSel = insertLib.find(i => i.id === builder.insertId)   ?? insertLib[0];

  const srcStage = lathe
    ? kind === 'turret'
      ? { tag: 'TURRET STATION', name: 'Station ' + selStation, spec: iface }
      : { tag: 'SPINDLE', name: 'Main spindle', spec: 'guide bushing' }
    : { tag: 'SPINDLE', name: iface + ' taper', spec: 'BIG-Plus face' };

  const assembly: AssemblyStage[] = [
    { tag: srcStage.tag, name: srcStage.name, spec: srcStage.spec, bg: 'linear-gradient(135deg,rgba(255,90,43,0.08),#0E0F12)', border: 'rgba(255,90,43,0.25)', tagColor: '#FF7A4D', arrow: '->' },
    { tag: 'HOLDER',  name: hSel.label, spec: lathe ? iface + ' interface' : 'gauge ' + builder.gauge + unit, bg: '#0E0F12', border: 'rgba(255,255,255,0.08)', tagColor: '#9398A2', arrow: '->' },
    { tag: 'TOOLING', name: tSel.label, spec: 'proj ' + tSel.proj + '"',   bg: '#0E0F12', border: 'rgba(255,255,255,0.08)', tagColor: '#9398A2', arrow: '->' },
    { tag: lathe ? 'INSERT' : 'EDGE', name: iSel.label, spec: lathe ? 'wear ' + (sel?.wear ?? '0') : 'coated', bg: 'linear-gradient(135deg,rgba(42,111,219,0.08),#0E0F12)', border: 'rgba(42,111,219,0.25)', tagColor: '#7FB2FF', arrow: '' },
  ];

  // ── 3D DATA PROPS ────────────────────────────────────────────────────────
  const t3tool  = sel?.loaded ? sel.proj : lathe ? 1.5 : 3.5;
  const c3: 0 | 1 = worstN === 2 ? 1 : 0;

  // ── LAYOUT LABEL ─────────────────────────────────────────────────────────
  const layoutLabel = lathe
    ? kind === 'turret' ? iface + ' TURRET' : 'GANG / SWISS'
    : iface + ' ATC';

  return {
    layoutLabel,
    loadedCount,
    stationCount: crib.length,
    issueSummary: statusLabel,
    statusLabel,
    statusColor,
    statusBg,
    statusBorder,
    worst,
    slots,
    toolShapes,
    ctxRects,
    ctxLines,
    ctxCircles,
    svgLabels,
    assembly,
    issues,
    iface,
    kind3d: kind,
    t3x: m.travels.x,
    t3y: m.travels.y ?? 10,
    t3z: m.travels.z,
    p3dia: wp.dia,
    p3len: wp.pz,
    p3x: wp.px,
    p3y: wp.py,
    p3z: wp.pz,
    p3depth: wp.depth,
    p3fix: wp.fixture,
    t3tool,
    c3,
    m3turn: m.maxTurn ?? 10,
    m3swing: m.swing ?? 22,
  };
}
