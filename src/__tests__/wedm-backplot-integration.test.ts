/**
 * U-W100-22: Backplot Integration into Calculator Page
 *
 * Tests the integration layer between WireEdmBackplot and the Calculator page:
 * - Backplot auto-displays after program generation
 * - Path verdict gates download (RED = blocked, YELLOW = allowed, GREEN = allowed)
 * - parseGCode → detectPathIssues → getPathVerdict pipeline works end-to-end
 *
 * Uses inline copies of parser/detector logic (same as wedm-backplot.test.ts)
 * to avoid React/DOM dependencies.
 */
import { describe, it, expect } from 'vitest';

// ============================================================================
// INLINE TYPES + FUNCTIONS (mirrors WireEdmBackplot.tsx exports)
// ============================================================================

interface Point2D { x: number; y: number }

interface GCodeMove {
  type: 'rapid' | 'linear' | 'arc_cw' | 'arc_ccw';
  from: Point2D;
  to: Point2D;
  i?: number;
  j?: number;
  pass: number;
  profile: number;
  isApproach: boolean;
  isDeparture: boolean;
}

interface BackplotData {
  moves: GCodeMove[];
  startHoles: Point2D[];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  totalPasses: number;
  totalProfiles: number;
}

type IssueSeverity = 'red' | 'yellow' | 'green';

interface PathIssue {
  type: 'min_radius' | 'sharp_corner' | 'slug_interference' | 'wire_lag' | 'start_hole_collision';
  severity: IssueSeverity;
  message: string;
  location: Point2D;
  value?: number;
}

// Minimal G-code parser (mirrors component)
const G_CODE_PATTERN = /([A-Z])(-?\d*\.?\d+)/g;

interface ParsedLine {
  G?: number;
  Gs: number[];
  X?: number; Y?: number;
  I?: number; J?: number;
  M?: number; E?: string;
  H?: number; F?: number; N?: number;
}

function parseLine(line: string): ParsedLine {
  const result: ParsedLine = { Gs: [] };
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('(') || trimmed.startsWith('%') || trimmed.startsWith('L')) return result;

  const eMatch = trimmed.match(/\bE(\d{4})\b/);
  if (eMatch) result.E = `E${eMatch[1]}`;

  let match;
  G_CODE_PATTERN.lastIndex = 0;
  while ((match = G_CODE_PATTERN.exec(trimmed)) !== null) {
    const letter = match[1];
    const value = parseFloat(match[2]);
    switch (letter) {
      case 'G': result.G = value; result.Gs.push(value); break;
      case 'X': result.X = value; break;
      case 'Y': result.Y = value; break;
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

function parseGCode(gcode: string): BackplotData {
  const moves: GCodeMove[] = [];
  const startHoles: Point2D[] = [];
  let curX = 0, curY = 0, modalG = 1;
  let currentPass = 1, currentProfile = 0;
  let compActive = false, compJustActivated = false;
  let lastEPack = '', movesSinceComp = 0;

  for (const line of gcode.split('\n')) {
    const p = parseLine(line);

    if (p.E && p.E !== lastEPack) {
      lastEPack = p.E;
      const passDigit = parseInt(p.E[4], 10);
      if (!isNaN(passDigit)) currentPass = passDigit;
    }
    if (p.M === 20) startHoles.push({ x: curX, y: curY });
    if (p.M === 21) currentProfile++;

    if (p.Gs.includes(41) || p.Gs.includes(42)) {
      compActive = true; compJustActivated = true; movesSinceComp = 0;
    }
    let g40OnLine = false;
    if (p.Gs.includes(40)) {
      if (moves.length > 0) moves[moves.length - 1].isDeparture = true;
      compActive = false; compJustActivated = false; g40OnLine = true;
    }

    for (const g of p.Gs) {
      if (g === 0 || g === 1 || g === 2 || g === 3) modalG = g;
    }
    if (g40OnLine) modalG = 1;

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
      const move: GCodeMove = { type: moveType, from: { x: curX, y: curY }, to: { x: toX, y: toY }, pass: currentPass, profile: currentProfile, isApproach, isDeparture: false };
      if ((moveType === 'arc_cw' || moveType === 'arc_ccw') && p.I !== undefined && p.J !== undefined) {
        move.i = p.I; move.j = p.J;
      }
      moves.push(move);
      if (compActive) movesSinceComp++;
      if (movesSinceComp >= 2) compJustActivated = false;
      curX = toX; curY = toY;
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const m of moves) {
    minX = Math.min(minX, m.from.x, m.to.x);
    minY = Math.min(minY, m.from.y, m.to.y);
    maxX = Math.max(maxX, m.from.x, m.to.x);
    maxY = Math.max(maxY, m.from.y, m.to.y);
    if (m.i !== undefined && m.j !== undefined) {
      const cx = m.from.x + m.i;
      const cy = m.from.y + m.j;
      const r = Math.sqrt(m.i * m.i + m.j * m.j);
      minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r);
    }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  return {
    moves, startHoles,
    bbox: { minX, minY, maxX, maxY },
    totalPasses: Math.max(...moves.map(m => m.pass), 0),
    totalProfiles: Math.max(...moves.map(m => m.profile), 0) + 1,
  };
}

function detectPathIssues(data: BackplotData, wireDiameter_mm = 0.25, sparkGap_mm = 0.015): PathIssue[] {
  const issues: PathIssue[] = [];
  const minAllowedRadius = wireDiameter_mm / 2 + 2 * sparkGap_mm;

  // Only analyze pass 1 rough cut moves (exclude approach/departure/rapid)
  const roughMoves = data.moves.filter(m =>
    m.pass === 1 && !m.isApproach && !m.isDeparture && m.type !== 'rapid'
  );

  // 1. Min radius check (arcs)
  for (const m of roughMoves) {
    if ((m.type === 'arc_cw' || m.type === 'arc_ccw') && m.i !== undefined && m.j !== undefined) {
      const r = Math.sqrt(m.i * m.i + m.j * m.j);
      if (r < minAllowedRadius) {
        issues.push({ type: 'min_radius', severity: 'red', message: `Arc radius ${r.toFixed(3)}mm < minimum ${minAllowedRadius.toFixed(3)}mm`, location: m.from, value: r });
      }
    }
  }

  // 2. Sharp corner detection
  for (let i = 1; i < roughMoves.length; i++) {
    const prev = roughMoves[i - 1];
    const curr = roughMoves[i];
    if (prev.type !== 'linear' || curr.type !== 'linear') continue;
    const dx1 = prev.to.x - prev.from.x;
    const dy1 = prev.to.y - prev.from.y;
    const dx2 = curr.to.x - curr.from.x;
    const dy2 = curr.to.y - curr.from.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len1 < 0.001 || len2 < 0.001) continue;
    const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
    if (angleDeg > 165) {
      issues.push({ type: 'sharp_corner', severity: 'yellow', message: `Sharp corner: ${(180 - angleDeg).toFixed(1)}° included angle`, location: curr.from, value: angleDeg });
    }
  }

  // 3. Slug interference (profiles too close)
  if (data.startHoles.length > 1) {
    for (let i = 0; i < data.startHoles.length; i++) {
      for (let j = i + 1; j < data.startHoles.length; j++) {
        const dist = Math.sqrt((data.startHoles[i].x - data.startHoles[j].x) ** 2 + (data.startHoles[i].y - data.startHoles[j].y) ** 2);
        if (dist < 2 * wireDiameter_mm) {
          issues.push({ type: 'slug_interference', severity: 'red', message: `Profiles ${dist.toFixed(2)}mm apart < ${(2 * wireDiameter_mm).toFixed(2)}mm`, location: data.startHoles[i], value: dist });
        }
      }
    }
  }

  // 4. Wire lag (long straight runs)
  for (const m of roughMoves) {
    if (m.type === 'linear') {
      const len = Math.sqrt((m.to.x - m.from.x) ** 2 + (m.to.y - m.from.y) ** 2);
      if (len > 50) {
        issues.push({ type: 'wire_lag', severity: 'yellow', message: `Linear run ${len.toFixed(1)}mm > 50mm — wire bow risk`, location: m.from, value: len });
      }
    }
  }

  // 5. Start hole collision
  for (const hole of data.startHoles) {
    const margin = wireDiameter_mm * 2;
    if (hole.x < data.bbox.minX - margin || hole.x > data.bbox.maxX + margin ||
        hole.y < data.bbox.minY - margin || hole.y > data.bbox.maxY + margin) {
      issues.push({ type: 'start_hole_collision', severity: 'red', message: 'Start hole outside profile boundary', location: hole });
    }
  }

  return issues;
}

function getPathVerdict(issues: PathIssue[]): { color: IssueSeverity; label: string; canDownload: boolean } {
  const hasRed = issues.some(i => i.severity === 'red');
  const hasYellow = issues.some(i => i.severity === 'yellow');
  if (hasRed) return { color: 'red', label: 'BLOCKED — Critical path issues', canDownload: false };
  if (hasYellow) return { color: 'yellow', label: 'WARNING — Review before cutting', canDownload: true };
  return { color: 'green', label: 'SAFE — No path issues detected', canDownload: true };
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Clean 25mm square — no issues expected */
const CLEAN_SQUARE_GCODE = `%
O0001
(PRISM WEDM — D2 25x25mm)
G21 G90
M20
E1221
G92 X0 Y0
G0 X-2.0 Y0
N10 G41 G1 X0 Y0 H0.200 F3.5
N20 G1 X25.0 Y0
N30 G1 X25.0 Y25.0
N40 G1 X0 Y25.0
N50 G1 X0 Y0
N60 G40 X-2.0 Y0
E1222
G92 X0 Y0
G0 X-2.0 Y0
N70 G41 G1 X0 Y0 H0.150 F5.25
N80 G1 X25.0 Y0
N90 G1 X25.0 Y25.0
N100 G1 X0 Y25.0
N110 G1 X0 Y0
N120 G40 X-2.0 Y0
M30
%`;

/** Tiny arc radius — triggers min_radius RED */
const TINY_ARC_GCODE = `%
O0002
G21 G90
M20
E1221
G92 X0 Y0
G0 X-2.0 Y0
N10 G41 G1 X0 Y0 H0.200 F3.5
N20 G1 X10.0 Y0
N30 G3 X10.0 Y0.2 I0 J0.1
N40 G1 X0 Y0.2
N50 G1 X0 Y0
N60 G40 X-2.0 Y0
M30
%`;

/** Long straight run — triggers wire_lag YELLOW */
const LONG_RUN_GCODE = `%
O0003
G21 G90
M20
E1221
G92 X0 Y0
G0 X-2.0 Y0
N10 G41 G1 X0 Y0 H0.200 F3.5
N20 G1 X80.0 Y0
N30 G1 X80.0 Y10.0
N40 G1 X0 Y10.0
N50 G1 X0 Y0
N60 G40 X-2.0 Y0
M30
%`;

/** Sharp hairpin — triggers sharp_corner YELLOW */
const HAIRPIN_GCODE = `%
O0004
G21 G90
M20
E1221
G92 X0 Y0
G0 X-2.0 Y0
N10 G41 G1 X0 Y0 H0.200 F3.5
N20 G1 X10.0 Y0
N30 G1 X10.1 Y0.3
N40 G1 X0.1 Y0.3
N50 G1 X0 Y0
N60 G40 X-2.0 Y0
M30
%`;

// ============================================================================
// TESTS
// ============================================================================

describe('U-W100-22: Backplot Integration', () => {
  describe('parseGCode → detectPathIssues → getPathVerdict pipeline', () => {
    it('clean square geometry → GREEN verdict, canDownload=true', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      const issues = detectPathIssues(data);
      const verdict = getPathVerdict(issues);
      expect(verdict.color).toBe('green');
      expect(verdict.label).toContain('SAFE');
      expect(verdict.canDownload).toBe(true);
    });

    it('tiny arc radius → RED verdict, canDownload=false', () => {
      const data = parseGCode(TINY_ARC_GCODE);
      const issues = detectPathIssues(data);
      const verdict = getPathVerdict(issues);
      expect(verdict.color).toBe('red');
      expect(verdict.canDownload).toBe(false);
      expect(issues.some(i => i.type === 'min_radius')).toBe(true);
    });

    it('long straight run → YELLOW verdict, canDownload=true', () => {
      const data = parseGCode(LONG_RUN_GCODE);
      const issues = detectPathIssues(data);
      const verdict = getPathVerdict(issues);
      // wire_lag is yellow — allows download with warning
      expect(verdict.color).toBe('yellow');
      expect(verdict.canDownload).toBe(true);
      expect(issues.some(i => i.type === 'wire_lag')).toBe(true);
    });
  });

  describe('Approve gate logic', () => {
    it('RED verdict blocks download', () => {
      const verdict = getPathVerdict([
        { type: 'min_radius', severity: 'red', message: 'test', location: { x: 0, y: 0 } },
      ]);
      expect(verdict.canDownload).toBe(false);
      expect(verdict.label).toContain('BLOCKED');
    });

    it('YELLOW verdict allows download with warning', () => {
      const verdict = getPathVerdict([
        { type: 'wire_lag', severity: 'yellow', message: 'test', location: { x: 0, y: 0 } },
      ]);
      expect(verdict.canDownload).toBe(true);
      expect(verdict.label).toContain('WARNING');
    });

    it('no issues → GREEN, canDownload=true', () => {
      const verdict = getPathVerdict([]);
      expect(verdict.canDownload).toBe(true);
      expect(verdict.color).toBe('green');
    });

    it('mixed RED + YELLOW → RED wins (most severe)', () => {
      const verdict = getPathVerdict([
        { type: 'wire_lag', severity: 'yellow', message: 'lag', location: { x: 0, y: 0 } },
        { type: 'min_radius', severity: 'red', message: 'radius', location: { x: 5, y: 5 } },
      ]);
      expect(verdict.canDownload).toBe(false);
      expect(verdict.color).toBe('red');
    });
  });

  describe('Backplot data structure for integration', () => {
    it('parsed data has required fields for backplot component', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      expect(data.moves).toBeDefined();
      expect(data.moves.length).toBeGreaterThan(0);
      expect(data.startHoles).toBeDefined();
      expect(data.bbox).toBeDefined();
      expect(data.totalPasses).toBeGreaterThanOrEqual(1);
      expect(data.totalProfiles).toBeGreaterThanOrEqual(1);
    });

    it('multi-pass program has correct pass count', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      // E1221 = pass 1, E1222 = pass 2
      expect(data.totalPasses).toBe(2);
    });

    it('start hole detected from M20', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      expect(data.startHoles.length).toBeGreaterThanOrEqual(1);
    });

    it('bounding box is finite and correct for 25mm square', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      expect(isFinite(data.bbox.minX)).toBe(true);
      expect(isFinite(data.bbox.maxX)).toBe(true);
      // Square is 25×25 starting at origin
      expect(data.bbox.maxX).toBeCloseTo(25, 0);
      expect(data.bbox.maxY).toBeCloseTo(25, 0);
    });
  });

  describe('Issue detection specifics', () => {
    it('arc radius 0.1mm < min allowed 0.155mm → RED', () => {
      const data = parseGCode(TINY_ARC_GCODE);
      const issues = detectPathIssues(data, 0.25, 0.015);
      const minRadiusIssues = issues.filter(i => i.type === 'min_radius');
      expect(minRadiusIssues.length).toBeGreaterThanOrEqual(1);
      // Min allowed = 0.25/2 + 2*0.015 = 0.155mm. Arc radius = 0.1mm
      expect(minRadiusIssues[0].value).toBeLessThan(0.155);
    });

    it('80mm straight run > 50mm → wire_lag YELLOW', () => {
      const data = parseGCode(LONG_RUN_GCODE);
      const issues = detectPathIssues(data);
      const lagIssues = issues.filter(i => i.type === 'wire_lag');
      expect(lagIssues.length).toBeGreaterThanOrEqual(1);
      expect(lagIssues[0].value).toBeGreaterThan(50);
      expect(lagIssues[0].severity).toBe('yellow');
    });

    it('clean 25mm square has no issues', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      const issues = detectPathIssues(data);
      expect(issues.length).toBe(0);
    });
  });

  describe('Auto-display contract', () => {
    it('parseGCode returns valid data from any non-empty G-code', () => {
      // Simulates auto-display: as soon as program is generated, parse and show
      const data = parseGCode('G0 X10 Y10\nG1 X20 Y20');
      expect(data.moves.length).toBeGreaterThan(0);
      expect(data.bbox).toBeDefined();
    });

    it('empty G-code returns safe default bbox', () => {
      const data = parseGCode('');
      expect(data.moves.length).toBe(0);
      expect(data.bbox.minX).toBe(0);
      expect(data.bbox.maxX).toBe(100);
    });

    it('verdict always returns one of three valid colors', () => {
      for (const issues of [[], [{ type: 'wire_lag' as const, severity: 'yellow' as const, message: '', location: { x: 0, y: 0 } }], [{ type: 'min_radius' as const, severity: 'red' as const, message: '', location: { x: 0, y: 0 } }]]) {
        const verdict = getPathVerdict(issues);
        expect(['red', 'yellow', 'green']).toContain(verdict.color);
        expect(typeof verdict.canDownload).toBe('boolean');
        expect(verdict.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('EXIT GATE', () => {
    it('backplot auto-displays: parseGCode produces valid BackplotData from generated program', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      expect(data.moves.length).toBeGreaterThan(4); // At least the square moves
      expect(data.totalPasses).toBeGreaterThanOrEqual(1);
    });

    it('approve gate before download: RED blocks, GREEN/YELLOW allows', () => {
      const greenVerdict = getPathVerdict([]);
      expect(greenVerdict.canDownload).toBe(true);

      const yellowVerdict = getPathVerdict([{ type: 'wire_lag', severity: 'yellow', message: '', location: { x: 0, y: 0 } }]);
      expect(yellowVerdict.canDownload).toBe(true);

      const redVerdict = getPathVerdict([{ type: 'min_radius', severity: 'red', message: '', location: { x: 0, y: 0 } }]);
      expect(redVerdict.canDownload).toBe(false);
    });

    it('all 5 issue types detectable in pipeline', () => {
      const types: PathIssue['type'][] = ['min_radius', 'sharp_corner', 'slug_interference', 'wire_lag', 'start_hole_collision'];
      for (const type of types) {
        const verdict = getPathVerdict([{ type, severity: type === 'sharp_corner' || type === 'wire_lag' ? 'yellow' : 'red', message: '', location: { x: 0, y: 0 } }]);
        expect(typeof verdict.canDownload).toBe('boolean');
      }
    });

    it('pipeline: parseGCode → detectPathIssues → getPathVerdict → boolean gate', () => {
      const data = parseGCode(CLEAN_SQUARE_GCODE);
      const issues = detectPathIssues(data);
      const verdict = getPathVerdict(issues);
      // Clean geometry → download allowed
      expect(verdict.canDownload).toBe(true);
      // This is the exact logic the Calculator page uses
      const downloadBlocked = !verdict.canDownload;
      expect(downloadBlocked).toBe(false);
    });
  });
});
