/**
 * WireEdmBackplot — G-code wire path visualization with pass overlay.
 *
 * Parses generated G-code text into motion segments and renders as interactive SVG:
 *   G0 = rapid (red dashed)
 *   G1 = linear cut (blue)
 *   G2/G3 = arc cut (green)
 *   Lead-in/out = first/last moves after/before comp (orange)
 *   Start hole = circle marker
 *
 * Engineering Y-up orientation. All passes overlaid with offset envelopes.
 * Pass-by-pass stepping via selectedPass prop.
 *
 * U-W100-20: Initial implementation — G-code parser + SVG renderer.
 */
import { useMemo, useState, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Point2D { x: number; y: number }

/** A single parsed motion from the G-code */
export interface GCodeMove {
  type: 'rapid' | 'linear' | 'arc_cw' | 'arc_ccw';
  from: Point2D;
  to: Point2D;
  /** Arc center offsets (I, J) — incremental from start */
  i?: number;
  j?: number;
  /** Which pass this move belongs to (1-based) */
  pass: number;
  /** Which profile this move belongs to (0-based) */
  profile: number;
  /** Is this part of the approach/lead-in? */
  isApproach: boolean;
  /** Is this part of the departure/lead-out? */
  isDeparture: boolean;
}

/** Parsed backplot data from G-code */
export interface BackplotData {
  moves: GCodeMove[];
  startHoles: Point2D[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  totalPasses: number;
  totalProfiles: number;
}

interface Props {
  /** Raw G-code program text */
  gcode: string;
  /** Which pass to highlight (0 = all, 1-N = specific pass) */
  selectedPass?: number;
  /** Callback when user clicks a pass */
  onPassSelect?: (pass: number) => void;
  /** SVG height in pixels */
  height?: number;
  /** Show start hole markers */
  showStartHoles?: boolean;
  /** Show rapid moves */
  showRapids?: boolean;
  /** Wire diameter for issue detection (default 0.25mm) */
  wireDiameter_mm?: number;
  /** Spark gap for issue detection (default 0.015mm) */
  sparkGap_mm?: number;
  /** Show path issues panel */
  showIssues?: boolean;
}

// ============================================================================
// G-CODE PARSER
// ============================================================================

// Regex allows optional leading digit before decimal: .5000, -.375, 10.0 all match
const G_CODE_PATTERN = /([A-Z])(-?\d*\.?\d+)/g;

interface ParsedLine {
  G?: number;
  Gs: number[];
  X?: number;
  Y?: number;
  U?: number;
  V?: number;
  I?: number;
  J?: number;
  M?: number;
  E?: string;
  H?: number;
  F?: number;
  N?: number;
}

function parseLine(line: string): ParsedLine {
  const result: ParsedLine = { Gs: [] };
  const trimmed = line.trim();

  // Skip comments, empty lines, header/footer
  if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith('%') || trimmed.startsWith('L')) {
    return result;
  }

  // E-pack codes: E#### (4 digits)
  const eMatch = trimmed.match(/\bE(\d{4})\b/);
  if (eMatch) result.E = `E${eMatch[1]}`;

  // Parse letter-number pairs
  let match;
  G_CODE_PATTERN.lastIndex = 0;
  while ((match = G_CODE_PATTERN.exec(trimmed)) !== null) {
    const letter = match[1];
    const value = parseFloat(match[2]);
    switch (letter) {
      case 'G': result.G = value; result.Gs.push(value); break;
      case 'X': result.X = value; break;
      case 'Y': result.Y = value; break;
      case 'U': result.U = value; break;
      case 'V': result.V = value; break;
      case 'I': result.I = value; break;
      case 'J': result.J = value; break;
      case 'M': result.M = value; break;
      case 'H': result.H = value; break;
      case 'F': result.F = value; break;
      case 'N': result.N = value; break;
    }
  }

  return result;
}

/**
 * Parse raw G-code text into BackplotData for rendering.
 *
 * Tracks modal G-code state (G0/G1/G2/G3), pass number (from E-pack codes),
 * profile index (from M20 wire threading), and comp state (G41/G42/G40).
 */
export function parseGCode(gcode: string): BackplotData {
  const moves: GCodeMove[] = [];
  const startHoles: Point2D[] = [];

  let curX = 0;
  let curY = 0;
  let modalG = 1;       // Current motion mode (0=rapid, 1=linear, 2=CW arc, 3=CCW arc)
  let currentPass = 1;
  let currentProfile = 0;
  let compActive = false;
  let compJustActivated = false;
  let lastEPack = '';
  let movesSinceComp = 0;

  const lines = gcode.split('\n');

  for (const line of lines) {
    const p = parseLine(line);

    // Track E-pack changes → pass number (last digit of E####)
    if (p.E && p.E !== lastEPack) {
      lastEPack = p.E;
      const passDigit = parseInt(p.E[4], 10);
      if (!isNaN(passDigit)) currentPass = passDigit;
    }

    // M20 = wire thread → new profile start, record position as start hole
    if (p.M === 20) {
      startHoles.push({ x: curX, y: curY });
    }

    // M21 = wire cut → profile boundary
    if (p.M === 21) {
      currentProfile++;
    }

    // Compensation activation (G41/G42) — check ALL G-codes on line (handles G41 G1 combo)
    if (p.Gs.includes(41) || p.Gs.includes(42)) {
      compActive = true;
      compJustActivated = true;
      movesSinceComp = 0;
    }

    // Compensation cancel (G40) → previous move was departure
    let g40OnLine = false;
    if (p.Gs.includes(40)) {
      if (moves.length > 0) {
        moves[moves.length - 1].isDeparture = true;
      }
      compActive = false;
      compJustActivated = false;
      g40OnLine = true;
    }

    // Update modal G-code: use last motion G-code on the line
    for (const g of p.Gs) {
      if (g === 0 || g === 1 || g === 2 || g === 3) {
        modalG = g;
      }
    }
    // G40 cancel move is always linear regardless of modal state
    if (g40OnLine) modalG = 1;

    // Motion moves (X/Y present)
    if (p.X !== undefined || p.Y !== undefined) {
      const toX = p.X ?? curX;
      const toY = p.Y ?? curY;

      let moveType: GCodeMove['type'];
      switch (modalG) {
        case 0: moveType = 'rapid'; break;
        case 2: moveType = 'arc_cw'; break;
        case 3: moveType = 'arc_ccw'; break;
        default: moveType = 'linear'; break;
      }

      const isApproach = compJustActivated && movesSinceComp < 2;
      const isDeparture = false; // Set retroactively on G40

      const move: GCodeMove = {
        type: moveType,
        from: { x: curX, y: curY },
        to: { x: toX, y: toY },
        pass: currentPass,
        profile: currentProfile,
        isApproach,
        isDeparture,
      };

      if ((moveType === 'arc_cw' || moveType === 'arc_ccw') && p.I !== undefined && p.J !== undefined) {
        move.i = p.I;
        move.j = p.J;
      }

      moves.push(move);

      if (compActive) movesSinceComp++;
      if (movesSinceComp >= 2) compJustActivated = false;

      curX = toX;
      curY = toY;
    }
  }

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const m of moves) {
    minX = Math.min(minX, m.from.x, m.to.x);
    minY = Math.min(minY, m.from.y, m.to.y);
    maxX = Math.max(maxX, m.from.x, m.to.x);
    maxY = Math.max(maxY, m.from.y, m.to.y);
    // For arcs, include the center bulge in bbox
    if (m.i !== undefined && m.j !== undefined) {
      const cx = m.from.x + m.i;
      const cy = m.from.y + m.j;
      const r = Math.sqrt(m.i * m.i + m.j * m.j);
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    }
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  const totalPasses = Math.max(...moves.map(m => m.pass), 0);
  const totalProfiles = Math.max(...moves.map(m => m.profile), 0) + 1;

  return { moves, startHoles, bbox: { minX, minY, maxX, maxY }, totalPasses, totalProfiles };
}

// ============================================================================
// SVG PATH BUILDERS
// ============================================================================

/**
 * Build SVG arc path command from G-code arc data.
 *
 * G-code arcs use incremental I,J center offsets.
 * SVG arcs use rx, ry, rotation, large-arc-flag, sweep-flag.
 *
 * In engineering Y-up orientation:
 *   G2 (CW machining) → SVG sweep=0
 *   G3 (CCW machining) → SVG sweep=1
 */
function buildArcPath(move: GCodeMove): string {
  if (move.i === undefined || move.j === undefined) {
    // Fallback to line if no center data
    return `L ${move.to.x} ${move.to.y}`;
  }

  const cx = move.from.x + move.i;
  const cy = move.from.y + move.j;
  const r = Math.sqrt(move.i * move.i + move.j * move.j);

  // Compute arc angles
  const startAngle = Math.atan2(move.from.y - cy, move.from.x - cx);
  const endAngle = Math.atan2(move.to.y - cy, move.to.x - cx);

  let dTheta: number;
  if (move.type === 'arc_cw') {
    // CW: negative direction
    dTheta = startAngle - endAngle;
    if (dTheta < 0) dTheta += 2 * Math.PI;
  } else {
    // CCW: positive direction
    dTheta = endAngle - startAngle;
    if (dTheta < 0) dTheta += 2 * Math.PI;
  }

  const largeArc = dTheta > Math.PI ? 1 : 0;
  // Engineering Y-up: G2(CW)→sweep=0, G3(CCW)→sweep=1
  const sweep = move.type === 'arc_cw' ? 0 : 1;

  return `A ${r} ${r} 0 ${largeArc} ${sweep} ${move.to.x} ${move.to.y}`;
}

function movesToSvgPath(moves: GCodeMove[]): string {
  if (moves.length === 0) return '';
  let d = `M ${moves[0].from.x} ${moves[0].from.y}`;

  for (const move of moves) {
    if (move.type === 'arc_cw' || move.type === 'arc_ccw') {
      d += ' ' + buildArcPath(move);
    } else {
      d += ` L ${move.to.x} ${move.to.y}`;
    }
  }

  return d;
}

// ============================================================================
// COLORS
// ============================================================================

const MOVE_COLORS = {
  rapid:    { stroke: '#ef4444', dash: '4,3' },  // red-500, dashed
  linear:   { stroke: '#3b82f6', dash: '' },      // blue-500, solid
  arc_cw:   { stroke: '#22c55e', dash: '' },      // green-500, solid
  arc_ccw:  { stroke: '#22c55e', dash: '' },      // green-500, solid
  approach: { stroke: '#f97316', dash: '' },       // orange-500, solid
  departure:{ stroke: '#f97316', dash: '6,2' },   // orange-500, dashed
};

const PASS_OPACITY = [1.0, 0.7, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15];

// ============================================================================
// PATH ISSUE DETECTION (U-W100-21)
// ============================================================================

/** Severity levels for path issues */
export type IssueSeverity = 'red' | 'yellow' | 'green';

/** A detected path issue with location and severity */
export interface PathIssue {
  type: 'min_radius' | 'sharp_corner' | 'slug_interference' | 'wire_lag' | 'start_hole_collision';
  severity: IssueSeverity;
  message: string;
  /** Location on the path where the issue occurs */
  location: Point2D;
  /** Issue-specific value (radius in mm, angle in degrees, etc.) */
  value?: number;
}

/**
 * Detect path issues from parsed backplot data.
 *
 * 5 issue types:
 *   1. min_radius: Inside radius < wire_d/2 + spark_gap → IMPOSSIBLE cut
 *   2. sharp_corner: Angle < 15° → wire break risk
 *   3. slug_interference: Profiles closer than 2× wire_d → slug can't drop
 *   4. wire_lag: Straight run > 50mm → wire bows, accuracy degrades
 *   5. start_hole_collision: Start hole outside profile bbox → collision risk
 *
 * @param data Parsed backplot data
 * @param wireDiameter_mm Wire diameter (default 0.25mm)
 * @param sparkGap_mm Spark gap per side (default 0.015mm)
 */
export function detectPathIssues(
  data: BackplotData,
  wireDiameter_mm: number = 0.25,
  sparkGap_mm: number = 0.015,
): PathIssue[] {
  const issues: PathIssue[] = [];
  const minAllowedRadius = wireDiameter_mm / 2 + sparkGap_mm * 2;

  // Only analyze pass 1 (rough cut) — skim paths are offset variants of the same contour
  const roughMoves = data.moves.filter(m => m.pass === 1 && !m.isApproach && !m.isDeparture && m.type !== 'rapid');

  // Issue 1: Minimum radius check on arcs
  for (const move of roughMoves) {
    if ((move.type === 'arc_cw' || move.type === 'arc_ccw') && move.i !== undefined && move.j !== undefined) {
      const radius = Math.sqrt(move.i * move.i + move.j * move.j);
      if (radius < minAllowedRadius) {
        issues.push({
          type: 'min_radius',
          severity: 'red',
          message: `Arc radius ${radius.toFixed(3)}mm < minimum ${minAllowedRadius.toFixed(3)}mm (wire ${wireDiameter_mm}mm + gap)`,
          location: { x: move.from.x + move.i, y: move.from.y + move.j },
          value: radius,
        });
      } else if (radius < minAllowedRadius * 2) {
        issues.push({
          type: 'min_radius',
          severity: 'yellow',
          message: `Arc radius ${radius.toFixed(3)}mm is tight — within 2× minimum ${minAllowedRadius.toFixed(3)}mm`,
          location: { x: move.from.x + move.i, y: move.from.y + move.j },
          value: radius,
        });
      }
    }
  }

  // Issue 2: Sharp corners — angle between consecutive linear moves
  for (let i = 1; i < roughMoves.length; i++) {
    const prev = roughMoves[i - 1];
    const curr = roughMoves[i];
    if (prev.type === 'linear' && curr.type === 'linear') {
      const dx1 = prev.to.x - prev.from.x;
      const dy1 = prev.to.y - prev.from.y;
      const dx2 = curr.to.x - curr.from.x;
      const dy2 = curr.to.y - curr.from.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (len1 > 0.001 && len2 > 0.001) {
        const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
        const angleDeg = Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI;
        // Included angle < 15° → sharp corner (wire break risk)
        if (angleDeg > 165) {
          issues.push({
            type: 'sharp_corner',
            severity: 'yellow',
            message: `Sharp corner: ${angleDeg.toFixed(1)}° included angle — wire break risk`,
            location: curr.from,
            value: angleDeg,
          });
        }
      }
    }
  }

  // Issue 3: Slug interference — profiles too close together
  // Compare bounding boxes of different profiles
  const profileBboxes: Map<number, { minX: number; minY: number; maxX: number; maxY: number }> = new Map();
  for (const move of roughMoves) {
    const bbox = profileBboxes.get(move.profile) ?? { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    bbox.minX = Math.min(bbox.minX, move.from.x, move.to.x);
    bbox.minY = Math.min(bbox.minY, move.from.y, move.to.y);
    bbox.maxX = Math.max(bbox.maxX, move.from.x, move.to.x);
    bbox.maxY = Math.max(bbox.maxY, move.from.y, move.to.y);
    profileBboxes.set(move.profile, bbox);
  }

  const profileIds = [...profileBboxes.keys()];
  for (let i = 0; i < profileIds.length; i++) {
    for (let j = i + 1; j < profileIds.length; j++) {
      const a = profileBboxes.get(profileIds[i])!;
      const b = profileBboxes.get(profileIds[j])!;
      // Minimum gap between bounding boxes
      const gapX = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
      const gapY = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
      const gap = Math.sqrt(gapX * gapX + gapY * gapY);
      if (gap < wireDiameter_mm * 2 && gap > 0) {
        issues.push({
          type: 'slug_interference',
          severity: 'yellow',
          message: `Profiles ${profileIds[i] + 1} and ${profileIds[j] + 1} are ${gap.toFixed(3)}mm apart — slug may not drop`,
          location: { x: (a.maxX + b.minX) / 2, y: (a.maxY + b.minY) / 2 },
          value: gap,
        });
      }
    }
  }

  // Issue 4: Wire lag — long straight runs > 50mm
  const WIRE_LAG_THRESHOLD_MM = 50;
  for (const move of roughMoves) {
    if (move.type === 'linear') {
      const dx = move.to.x - move.from.x;
      const dy = move.to.y - move.from.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > WIRE_LAG_THRESHOLD_MM) {
        issues.push({
          type: 'wire_lag',
          severity: 'yellow',
          message: `Long straight run: ${length.toFixed(1)}mm — wire may lag, causing taper error`,
          location: { x: (move.from.x + move.to.x) / 2, y: (move.from.y + move.to.y) / 2 },
          value: length,
        });
      }
    }
  }

  // Issue 5: Start hole collision — check if start holes are reasonably close to profile
  for (let hi = 0; hi < data.startHoles.length; hi++) {
    const hole = data.startHoles[hi];
    const profileMoves = roughMoves.filter(m => m.profile === hi);
    if (profileMoves.length === 0) continue;

    // Check if hole is within expanded bbox of its profile
    const bbox = profileBboxes.get(hi);
    if (bbox) {
      const margin = wireDiameter_mm * 10; // 10× wire diameter margin
      const insideOrNear = hole.x >= bbox.minX - margin && hole.x <= bbox.maxX + margin &&
                          hole.y >= bbox.minY - margin && hole.y <= bbox.maxY + margin;
      if (!insideOrNear) {
        issues.push({
          type: 'start_hole_collision',
          severity: 'red',
          message: `Start hole at (${hole.x.toFixed(2)}, ${hole.y.toFixed(2)}) is far from profile ${hi + 1} — collision risk`,
          location: hole,
        });
      }
    }
  }

  return issues;
}

/** Overall safety verdict from issues */
export function getPathVerdict(issues: PathIssue[]): { color: IssueSeverity; label: string; canDownload: boolean } {
  const hasRed = issues.some(i => i.severity === 'red');
  const hasYellow = issues.some(i => i.severity === 'yellow');
  if (hasRed) return { color: 'red', label: 'BLOCKED — Critical path issues', canDownload: false };
  if (hasYellow) return { color: 'yellow', label: 'WARNING — Review before cutting', canDownload: true };
  return { color: 'green', label: 'SAFE — No path issues detected', canDownload: true };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WireEdmBackplot({
  gcode,
  selectedPass = 0,
  onPassSelect,
  height = 500,
  showStartHoles = true,
  showRapids = true,
  wireDiameter_mm = 0.25,
  sparkGap_mm = 0.015,
  showIssues = true,
}: Props) {
  const [hoveredPass, setHoveredPass] = useState<number | null>(null);

  // Parse G-code into backplot data
  const data = useMemo(() => parseGCode(gcode), [gcode]);

  // Detect path issues (U-W100-21)
  const issues = useMemo(
    () => showIssues ? detectPathIssues(data, wireDiameter_mm, sparkGap_mm) : [],
    [data, wireDiameter_mm, sparkGap_mm, showIssues],
  );
  const verdict = useMemo(() => getPathVerdict(issues), [issues]);

  // Group moves by type and pass for efficient rendering
  const groupedPaths = useMemo(() => {
    const groups: Record<string, { d: string; color: string; dash: string; opacity: number }[]> = {
      rapid: [], approach: [], departure: [], linear: [], arc: [],
    };

    // Group consecutive same-type moves for path efficiency
    for (let pass = 1; pass <= data.totalPasses; pass++) {
      if (selectedPass > 0 && pass !== selectedPass) continue;

      const passMoves = data.moves.filter(m => m.pass === pass);
      const opacity = selectedPass > 0 ? 1.0 : (PASS_OPACITY[pass - 1] ?? 0.15);

      // Separate by rendering category
      const rapids: GCodeMove[] = [];
      const approaches: GCodeMove[] = [];
      const departures: GCodeMove[] = [];
      const cuts: GCodeMove[] = [];

      for (const m of passMoves) {
        if (m.isApproach) approaches.push(m);
        else if (m.isDeparture) departures.push(m);
        else if (m.type === 'rapid') rapids.push(m);
        else cuts.push(m);
      }

      if (showRapids && rapids.length > 0) {
        groups.rapid.push({
          d: movesToSvgPath(rapids),
          color: MOVE_COLORS.rapid.stroke,
          dash: MOVE_COLORS.rapid.dash,
          opacity,
        });
      }

      if (approaches.length > 0) {
        groups.approach.push({
          d: movesToSvgPath(approaches),
          color: MOVE_COLORS.approach.stroke,
          dash: MOVE_COLORS.approach.dash,
          opacity,
        });
      }

      if (departures.length > 0) {
        groups.departure.push({
          d: movesToSvgPath(departures),
          color: MOVE_COLORS.departure.stroke,
          dash: MOVE_COLORS.departure.dash,
          opacity,
        });
      }

      // Separate arcs from linear for color coding
      const linears = cuts.filter(m => m.type === 'linear');
      const arcs = cuts.filter(m => m.type === 'arc_cw' || m.type === 'arc_ccw');

      if (linears.length > 0) {
        groups.linear.push({
          d: movesToSvgPath(linears),
          color: MOVE_COLORS.linear.stroke,
          dash: MOVE_COLORS.linear.dash,
          opacity,
        });
      }

      if (arcs.length > 0) {
        groups.arc.push({
          d: movesToSvgPath(arcs),
          color: MOVE_COLORS.arc_cw.stroke,
          dash: MOVE_COLORS.arc_cw.dash,
          opacity,
        });
      }
    }

    return groups;
  }, [data, selectedPass, showRapids]);

  // ViewBox with padding — engineering Y-up via transform
  const viewBox = useMemo(() => {
    const { minX, minY, maxX, maxY } = data.bbox;
    const w = maxX - minX || 100;
    const h = maxY - minY || 100;
    const pad = Math.max(w, h) * 0.1;
    return {
      x: minX - pad,
      y: minY - pad,
      w: w + pad * 2,
      h: h + pad * 2,
    };
  }, [data.bbox]);

  const strokeWidth = useMemo(() => Math.max(viewBox.w, viewBox.h) * 0.003, [viewBox]);
  const holeRadius = useMemo(() => Math.max(viewBox.w, viewBox.h) * 0.008, [viewBox]);

  // Pass selector handler
  const handlePassClick = useCallback((pass: number) => {
    onPassSelect?.(pass);
  }, [onPassSelect]);

  if (!gcode.trim()) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-6 text-center text-sm text-slate-500">
        No G-code to display
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] overflow-hidden">
      {/* Header with legend */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/40">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Wire Path Backplot
        </div>
        <div className="flex gap-3">
          <LegendItem color={MOVE_COLORS.rapid.stroke} label="Rapid" dashed />
          <LegendItem color={MOVE_COLORS.linear.stroke} label="Linear" />
          <LegendItem color={MOVE_COLORS.arc_cw.stroke} label="Arc" />
          <LegendItem color={MOVE_COLORS.approach.stroke} label="Lead" />
        </div>
      </div>

      {/* SVG viewport */}
      <svg
        width="100%"
        height={height}
        viewBox={`${viewBox.x} ${-(viewBox.y + viewBox.h)} ${viewBox.w} ${viewBox.h}`}
        className="bg-[#060d17]"
        role="img"
        aria-label={`Wire EDM backplot: ${data.totalPasses} passes, ${data.totalProfiles} profiles, ${data.moves.length} moves`}
      >
        {/* Engineering Y-up: flip Y axis */}
        <g transform="scale(1, -1)">
          {/* Grid origin crosshair */}
          <line x1={-viewBox.w} y1={0} x2={viewBox.w + viewBox.x * 2} y2={0}
            stroke="#1e293b" strokeWidth={strokeWidth * 0.5} />
          <line x1={0} y1={-viewBox.h} x2={0} y2={viewBox.h + viewBox.y * 2}
            stroke="#1e293b" strokeWidth={strokeWidth * 0.5} />

          {/* Render paths by layer: rapids first (under), then cuts, then leads on top */}
          {groupedPaths.rapid.map((p, i) => (
            <path key={`rapid-${i}`} d={p.d} fill="none"
              stroke={p.color} strokeWidth={strokeWidth * 0.7}
              strokeDasharray={p.dash} opacity={p.opacity} />
          ))}

          {groupedPaths.linear.map((p, i) => (
            <path key={`linear-${i}`} d={p.d} fill="none"
              stroke={p.color} strokeWidth={strokeWidth}
              opacity={p.opacity} />
          ))}

          {groupedPaths.arc.map((p, i) => (
            <path key={`arc-${i}`} d={p.d} fill="none"
              stroke={p.color} strokeWidth={strokeWidth}
              opacity={p.opacity} />
          ))}

          {groupedPaths.approach.map((p, i) => (
            <path key={`approach-${i}`} d={p.d} fill="none"
              stroke={p.color} strokeWidth={strokeWidth * 1.2}
              opacity={p.opacity} />
          ))}

          {groupedPaths.departure.map((p, i) => (
            <path key={`departure-${i}`} d={p.d} fill="none"
              stroke={p.color} strokeWidth={strokeWidth * 1.2}
              strokeDasharray={p.dash} opacity={p.opacity} />
          ))}

          {/* Start holes */}
          {showStartHoles && data.startHoles.map((hole, i) => (
            <circle key={`hole-${i}`} cx={hole.x} cy={hole.y} r={holeRadius}
              fill="none" stroke="#ef4444" strokeWidth={strokeWidth * 0.8} />
          ))}

          {/* Issue markers (U-W100-21) */}
          {showIssues && issues.map((issue, i) => {
            const markerColor = issue.severity === 'red' ? '#ef4444' : '#eab308';
            return (
              <g key={`issue-${i}`}>
                <circle cx={issue.location.x} cy={issue.location.y}
                  r={holeRadius * 1.5} fill="none"
                  stroke={markerColor} strokeWidth={strokeWidth * 1.5}
                  strokeDasharray={`${strokeWidth * 2},${strokeWidth}`} />
                <circle cx={issue.location.x} cy={issue.location.y}
                  r={holeRadius * 0.4} fill={markerColor} />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Pass selector footer */}
      {data.totalPasses > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-700/40">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Pass:</span>
          <button
            onClick={() => handlePassClick(0)}
            onMouseEnter={() => setHoveredPass(0)}
            onMouseLeave={() => setHoveredPass(null)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              selectedPass === 0
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {Array.from({ length: data.totalPasses }, (_, i) => i + 1).map(pass => (
            <button
              key={pass}
              onClick={() => handlePassClick(pass)}
              onMouseEnter={() => setHoveredPass(pass)}
              onMouseLeave={() => setHoveredPass(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                selectedPass === pass
                  ? 'bg-blue-600 text-white'
                  : hoveredPass === pass
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {pass}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-500">
            {data.moves.length} moves · {data.totalProfiles} profile{data.totalProfiles !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Path issues verdict + list (U-W100-21) */}
      {showIssues && (
        <div className="px-4 py-2 border-t border-slate-700/40">
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-2.5 w-2.5 rounded-full ${
              verdict.color === 'red' ? 'bg-red-500' :
              verdict.color === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-500'
            }`} />
            <span className={`text-[11px] font-semibold ${
              verdict.color === 'red' ? 'text-red-400' :
              verdict.color === 'yellow' ? 'text-yellow-400' : 'text-emerald-400'
            }`}>
              {verdict.label}
            </span>
            {!verdict.canDownload && (
              <span className="ml-auto text-[10px] text-red-400 font-medium">NC download blocked</span>
            )}
          </div>
          {issues.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px]">
                  <span className={issue.severity === 'red' ? 'text-red-400' : 'text-yellow-400'}>
                    {issue.severity === 'red' ? 'BLOCK' : 'WARN'}
                  </span>
                  <span className="text-slate-400">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Legend dot ────────────────────────────────────────────────────────

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-2.5 w-5 rounded-sm"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)`
            : color,
        }}
      />
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
}
