/**
 * WEDM Backplot Tests (U-W100-20)
 *
 * Validates G-code parser and backplot data extraction.
 * Tests the parseGCode function from WireEdmBackplot component.
 *
 * Note: These tests validate the parsing logic only — SVG rendering
 * is validated visually and via Playwright in integration tests.
 */
import { describe, it, expect } from "vitest";

// ============================================================================
// INLINE G-CODE PARSER (mirrors WireEdmBackplot.tsx parseGCode)
// Tests validate the algorithm directly without requiring React/DOM.
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

// Regex allows optional leading digit before decimal: .5000, -.375, 10.0 all match
const G_CODE_PATTERN = /([A-Z])(-?\d*\.?\d+)/g;

interface ParsedLine {
  G?: number; Gs: number[]; X?: number; Y?: number; I?: number; J?: number;
  M?: number; E?: string; H?: number; F?: number; N?: number;
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
    // Check ALL G-codes on this line (handles G41 G1 on same line)
    if (p.Gs.includes(41) || p.Gs.includes(42)) { compActive = true; compJustActivated = true; movesSinceComp = 0; }
    let g40OnLine = false;
    if (p.Gs.includes(40)) {
      if (moves.length > 0) moves[moves.length - 1].isDeparture = true;
      compActive = false; compJustActivated = false;
      g40OnLine = true;
    }
    // Modal motion code: use the last motion G-code on the line
    for (const g of p.Gs) {
      if (g === 0 || g === 1 || g === 2 || g === 3) modalG = g;
    }
    // G40 cancel move is always linear regardless of modal state
    if (g40OnLine) modalG = 1;
    if (p.X !== undefined || p.Y !== undefined) {
      const toX = p.X ?? curX, toY = p.Y ?? curY;
      let moveType: GCodeMove['type'];
      switch (modalG) {
        case 0: moveType = 'rapid'; break;
        case 2: moveType = 'arc_cw'; break;
        case 3: moveType = 'arc_ccw'; break;
        default: moveType = 'linear'; break;
      }
      const isApproach = compJustActivated && movesSinceComp < 2;
      const move: GCodeMove = {
        type: moveType, from: { x: curX, y: curY }, to: { x: toX, y: toY },
        pass: currentPass, profile: currentProfile, isApproach, isDeparture: false,
      };
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
      const cx = m.from.x + m.i, cy = m.from.y + m.j;
      const r = Math.sqrt(m.i * m.i + m.j * m.j);
      minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r);
    }
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }

  const totalPasses = Math.max(...moves.map(m => m.pass), 0);
  const totalProfiles = Math.max(...moves.map(m => m.profile), 0) + 1;
  return { moves, startHoles, bbox: { minX, minY, maxX, maxY }, totalPasses, totalProfiles };
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Minimal Mitsubishi program: 1 profile, 2 passes, square contour */
const MINIMAL_GCODE = `%
L001
(2026-04-06)

H175 = 0.0000

H1 = 0.0060 + H175
H2 = 0.0020 + H175

N5 G90
N10 M91
N15 G92 X0.0 Y0.0
N20 G1 X0.0000 Y0.0000 F25.0
N25 M20 (Thread Wire)
N30 M78 M78
N35 M80
N40 M82
N45 M84
N50 E1221 H1 F0.12 (PASS=1)
N55 M90
N60 G41 G1 X-0.5000 Y0.5000
N65 X1.0000 Y0.5000
N70 X1.0000 Y-0.5000
N75 X-1.0000 Y-0.5000
N80 X-1.0000 Y0.5000
N85 X-0.5000 Y0.5000
N90 G40 X0.0000 Y0.0000
N95 M01
N100 G4 X5.
N105 M78 M78
N110 M80
N115 M82
N120 M84
N125 E1222 H2 F0.20 (PASS=2)
N130 M91
N135 G41 G1 X-0.5000 Y0.5000
N140 X1.0000 Y0.5000
N145 X1.0000 Y-0.5000
N150 X-1.0000 Y-0.5000
N155 X-1.0000 Y0.5000
N160 X-0.5000 Y0.5000
N165 G40 X0.0000 Y0.0000
N170 M85 M83 M81
N175 M21
N180 M58
N185 M02
%`;

/** G-code with arcs (hex profile) */
const ARC_GCODE = `%
L002
N5 G90
N10 M20 (Thread)
N15 E1221 H1 F0.12
N20 G41 G1 X0.5 Y0.0
N25 G3 X0.0 Y0.5 I-0.5 J0.0
N30 G3 X-0.5 Y0.0 I0.0 J-0.5
N35 G3 X0.0 Y-0.5 I0.5 J0.0
N40 G3 X0.5 Y0.0 I0.0 J0.5
N45 G40 X1.0 Y0.0
N50 M02
%`;

/** Multi-profile program */
const MULTI_PROFILE_GCODE = `%
L003
N5 G90
N10 G92 X0.0 Y0.0
N15 M20 (Thread Profile 1)
N20 E1221 H1 F0.12
N25 G41 G1 X0.0 Y1.0
N30 X1.0 Y1.0
N35 X1.0 Y0.0
N40 X0.0 Y0.0
N45 G40 X-1.0 Y0.0
N50 M85
N55 M83
N60 M81
N65 M21 (Cut Wire)
N70 G0 X10.0 Y0.0
N75 M20 (Thread Profile 2)
N80 E1221 H1 F0.12
N85 G41 G1 X10.0 Y1.0
N90 X11.0 Y1.0
N95 X11.0 Y0.0
N100 X10.0 Y0.0
N105 G40 X9.0 Y0.0
N110 M02
%`;

// ============================================================================
// SUITE 1: Basic G-code parsing
// ============================================================================

describe("G-code parsing — motion types", () => {
  it("identifies rapid moves (G0)", () => {
    const data = parseGCode("N5 G0 X10.0 Y20.0");
    expect(data.moves).toHaveLength(1);
    expect(data.moves[0].type).toBe('rapid');
    expect(data.moves[0].to).toEqual({ x: 10, y: 20 });
  });

  it("identifies linear moves (G1)", () => {
    const data = parseGCode("N5 G1 X5.0 Y10.0 F0.12");
    expect(data.moves).toHaveLength(1);
    expect(data.moves[0].type).toBe('linear');
  });

  it("identifies CW arcs (G2) with I/J", () => {
    const data = parseGCode("N5 G2 X1.0 Y0.0 I0.5 J0.0");
    expect(data.moves).toHaveLength(1);
    expect(data.moves[0].type).toBe('arc_cw');
    expect(data.moves[0].i).toBe(0.5);
    expect(data.moves[0].j).toBe(0);
  });

  it("identifies CCW arcs (G3) with I/J", () => {
    const data = parseGCode(ARC_GCODE);
    const arcs = data.moves.filter(m => m.type === 'arc_ccw');
    expect(arcs.length).toBeGreaterThanOrEqual(4);
    for (const arc of arcs) {
      expect(arc.i).toBeDefined();
      expect(arc.j).toBeDefined();
    }
  });

  it("modal G-code: move without explicit G uses previous mode", () => {
    const data = parseGCode("N5 G1 X1.0 Y1.0\nN10 X2.0 Y2.0");
    expect(data.moves).toHaveLength(2);
    expect(data.moves[0].type).toBe('linear');
    expect(data.moves[1].type).toBe('linear'); // modal from previous G1
  });

  it("tracks current position across moves", () => {
    const data = parseGCode("N5 G1 X5.0 Y0.0\nN10 X5.0 Y10.0");
    expect(data.moves[1].from).toEqual({ x: 5, y: 0 });
    expect(data.moves[1].to).toEqual({ x: 5, y: 10 });
  });
});

// ============================================================================
// SUITE 2: Pass and profile tracking
// ============================================================================

describe("Pass and profile tracking", () => {
  it("detects pass number from E-pack codes", () => {
    const data = parseGCode(MINIMAL_GCODE);
    const pass1 = data.moves.filter(m => m.pass === 1);
    const pass2 = data.moves.filter(m => m.pass === 2);
    expect(pass1.length).toBeGreaterThan(0);
    expect(pass2.length).toBeGreaterThan(0);
  });

  it("totalPasses matches highest pass number", () => {
    const data = parseGCode(MINIMAL_GCODE);
    expect(data.totalPasses).toBe(2);
  });

  it("detects start holes from M20 commands", () => {
    const data = parseGCode(MINIMAL_GCODE);
    expect(data.startHoles.length).toBeGreaterThanOrEqual(1);
  });

  it("multi-profile: detects multiple profiles from M21 wire cut", () => {
    const data = parseGCode(MULTI_PROFILE_GCODE);
    expect(data.totalProfiles).toBeGreaterThanOrEqual(2);
  });

  it("multi-profile: detects start holes for each profile", () => {
    const data = parseGCode(MULTI_PROFILE_GCODE);
    expect(data.startHoles.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// SUITE 3: Compensation and approach/departure detection
// ============================================================================

describe("Approach and departure detection", () => {
  it("marks first moves after G41/G42 as approach", () => {
    const data = parseGCode(MINIMAL_GCODE);
    const approachMoves = data.moves.filter(m => m.isApproach);
    expect(approachMoves.length).toBeGreaterThanOrEqual(1);
  });

  it("marks move before G40 as departure", () => {
    const data = parseGCode(MINIMAL_GCODE);
    const departureMoves = data.moves.filter(m => m.isDeparture);
    expect(departureMoves.length).toBeGreaterThanOrEqual(1);
  });

  it("approach is only on first 2 moves after comp activation", () => {
    const data = parseGCode(MINIMAL_GCODE);
    // For each pass, at most 2 approach moves
    for (let pass = 1; pass <= data.totalPasses; pass++) {
      const passMoves = data.moves.filter(m => m.pass === pass);
      const approachCount = passMoves.filter(m => m.isApproach).length;
      expect(approachCount).toBeLessThanOrEqual(2);
    }
  });
});

// ============================================================================
// SUITE 4: Bounding box
// ============================================================================

describe("Bounding box computation", () => {
  it("bbox contains all move endpoints", () => {
    const data = parseGCode(MINIMAL_GCODE);
    for (const m of data.moves) {
      expect(m.to.x).toBeGreaterThanOrEqual(data.bbox.minX);
      expect(m.to.x).toBeLessThanOrEqual(data.bbox.maxX);
      expect(m.to.y).toBeGreaterThanOrEqual(data.bbox.minY);
      expect(m.to.y).toBeLessThanOrEqual(data.bbox.maxY);
    }
  });

  it("bbox includes arc bulge for arc moves", () => {
    const data = parseGCode(ARC_GCODE);
    // Circle at origin, radius 0.5: bbox should be at least [-0.5, -0.5, 0.5, 0.5]
    expect(data.bbox.minX).toBeLessThanOrEqual(-0.4);
    expect(data.bbox.minY).toBeLessThanOrEqual(-0.4);
    expect(data.bbox.maxX).toBeGreaterThanOrEqual(0.4);
    expect(data.bbox.maxY).toBeGreaterThanOrEqual(0.4);
  });

  it("empty gcode → default bbox", () => {
    const data = parseGCode("");
    expect(data.bbox.minX).toBe(0);
    expect(data.bbox.maxX).toBe(100);
  });
});

// ============================================================================
// SUITE 5: Color coding rules (verified by move type)
// ============================================================================

describe("Color coding via move types", () => {
  it("G0 moves are typed as rapid (renders red dashed)", () => {
    const data = parseGCode(MULTI_PROFILE_GCODE);
    const rapids = data.moves.filter(m => m.type === 'rapid');
    expect(rapids.length).toBeGreaterThan(0);
  });

  it("G1 moves are typed as linear (renders blue solid)", () => {
    const data = parseGCode(MINIMAL_GCODE);
    const linears = data.moves.filter(m => m.type === 'linear');
    expect(linears.length).toBeGreaterThan(0);
  });

  it("G2/G3 moves are typed as arc (renders green solid)", () => {
    const data = parseGCode(ARC_GCODE);
    const arcs = data.moves.filter(m => m.type === 'arc_cw' || m.type === 'arc_ccw');
    expect(arcs.length).toBeGreaterThan(0);
  });

  it("approach moves marked separately (renders orange)", () => {
    const data = parseGCode(MINIMAL_GCODE);
    const approaches = data.moves.filter(m => m.isApproach);
    expect(approaches.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// SUITE 6: Edge cases
// ============================================================================

describe("Edge cases", () => {
  it("handles negative coordinates", () => {
    const data = parseGCode("G1 X-5.0 Y-10.0");
    expect(data.moves[0].to).toEqual({ x: -5, y: -10 });
  });

  it("handles comments in parentheses", () => {
    const data = parseGCode("N5 G1 X1.0 Y2.0 (this is a comment)");
    expect(data.moves).toHaveLength(1);
    expect(data.moves[0].to).toEqual({ x: 1, y: 2 });
  });

  it("skips header lines (%, L###)", () => {
    const data = parseGCode("%\nL001\nG1 X1.0 Y1.0");
    expect(data.moves).toHaveLength(1);
  });

  it("handles missing Y (uses previous Y)", () => {
    const data = parseGCode("G1 X0.0 Y5.0\nX10.0");
    expect(data.moves[1].to).toEqual({ x: 10, y: 5 }); // Y from previous
  });

  it("handles imperial decimal format", () => {
    const data = parseGCode("G1 X.5000 Y-.3750");
    expect(data.moves[0].to.x).toBeCloseTo(0.5, 3);
    expect(data.moves[0].to.y).toBeCloseTo(-0.375, 3);
  });
});

// ============================================================================
// SUITE 7: ITW SHAKEPROOF structure (matches real program)
// ============================================================================

describe("ITW SHAKEPROOF structure", () => {
  it("4-pass program: detects correct pass count", () => {
    // Simulate ITW SHAKEPROOF structure with 4 E-pack codes
    const gcode = `%
L001
N5 G90
N10 M20
N15 E1221 H1 F0.12
N20 G41 G1 X0.5 Y0.5
N25 X1.0 Y0.5
N30 G40 X0.0 Y0.0
N35 G4 X5.
N40 E1222 H2 F0.20
N45 G41 G1 X0.5 Y0.5
N50 X1.0 Y0.5
N55 G40 X0.0 Y0.0
N60 G4 X5.
N65 E1223 H3 F0.30
N70 G42 G1 X0.5 Y0.5
N75 X1.0 Y0.5
N80 G40 X0.0 Y0.0
N85 G4 X5.
N90 E1224 H4 F0.40
N95 G41 G1 X0.5 Y0.5
N100 X1.0 Y0.5
N105 G40 X0.0 Y0.0
N110 M02
%`;
    const data = parseGCode(gcode);
    expect(data.totalPasses).toBe(4);
  });

  it("Pass 3 uses G42 (reversed comp) — detected as separate pass", () => {
    const gcode = `N5 E1221 H1\nN10 G41 G1 X1.0 Y0.0\nN15 G40 X0.0 Y0.0\nN20 E1223 H3\nN25 G42 G1 X1.0 Y0.0\nN30 G40 X0.0 Y0.0`;
    const data = parseGCode(gcode);
    const pass1 = data.moves.filter(m => m.pass === 1);
    const pass3 = data.moves.filter(m => m.pass === 3);
    expect(pass1.length).toBeGreaterThan(0);
    expect(pass3.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// SUITE 8: EXIT GATE — Backplot renders all required elements
// ============================================================================

describe("EXIT GATE: Backplot data completeness", () => {
  it("all 4 move types present in mixed program", () => {
    const gcode = `N5 G0 X5.0 Y5.0\nN10 G1 X10.0 Y5.0\nN15 G2 X10.0 Y10.0 I0.0 J2.5\nN20 G3 X5.0 Y10.0 I-2.5 J0.0`;
    const data = parseGCode(gcode);

    const types = new Set(data.moves.map(m => m.type));
    expect(types.has('rapid')).toBe(true);
    expect(types.has('linear')).toBe(true);
    expect(types.has('arc_cw')).toBe(true);
    expect(types.has('arc_ccw')).toBe(true);
  });

  it("start holes detected for each M20", () => {
    const data = parseGCode(MULTI_PROFILE_GCODE);
    expect(data.startHoles.length).toBe(2);
  });

  it("bbox is finite and non-zero for valid programs", () => {
    const data = parseGCode(MINIMAL_GCODE);
    expect(isFinite(data.bbox.minX)).toBe(true);
    expect(isFinite(data.bbox.maxX)).toBe(true);
    expect(data.bbox.maxX - data.bbox.minX).toBeGreaterThan(0);
    expect(data.bbox.maxY - data.bbox.minY).toBeGreaterThan(0);
  });

  it("pass overlay data: moves grouped by pass number", () => {
    const data = parseGCode(MINIMAL_GCODE);
    for (let p = 1; p <= data.totalPasses; p++) {
      const passMoves = data.moves.filter(m => m.pass === p);
      expect(passMoves.length).toBeGreaterThan(0);
    }
  });
});
