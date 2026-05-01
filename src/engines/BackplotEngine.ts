/**
 * PRISM MCP Server — Backplot Engine
 *
 * G-code parsing for backplot visualization: parse G-code into structured
 * moves with arc interpolation, compute toolpath statistics (distances,
 * bounding box, machining time).
 *
 * Ported from PRISM_GCODE_BACKPLOT_ENGINE.js (monolith R2.3.1).
 * Server-side only — visualization/animation/voxel portions excluded.
 *
 * @module BackplotEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type MoveType = "rapid" | "linear" | "arc" | "home";

export interface BackplotMove {
  type: MoveType;
  from: Point3D;
  to: Point3D;
  feedRate: number;
  lineNumber: number;
  tool: number;
  arcData?: {
    center: { x: number; y: number };
    radius: number;
    clockwise: boolean;
  };
}

export interface BackplotStatistics {
  totalMoves: number;
  rapidDistance: number;
  feedDistance: number;
  totalDistance: number;
  machiningTime: number;
  boundingBox: {
    min: Point3D;
    max: Point3D;
  };
}

export interface ParseResult {
  moves: BackplotMove[];
  statistics: BackplotStatistics;
}

interface ParseState {
  x: number; y: number; z: number;
  f: number; s: number;
  absolute: boolean;
  metric: boolean;
  plane: "XY" | "XZ" | "YZ";
  rapidMode: boolean;
  tool: number;
}

interface Word {
  letter: string;
  value: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class BackplotEngineImpl {

  /** Parse G-code into structured moves with statistics. */
  parse(gcode: string): ParseResult {
    const lines = gcode.split("\n");
    const moves: BackplotMove[] = [];

    const state: ParseState = {
      x: 0, y: 0, z: 0,
      f: 100, s: 0,
      absolute: true, metric: true,
      plane: "XY", rapidMode: false,
      tool: 1,
    };

    let lineNumber = 0;
    for (const rawLine of lines) {
      lineNumber++;
      const line = cleanLine(rawLine);
      if (!line) continue;
      const parsed = this.parseLine(line, state, lineNumber);
      moves.push(...parsed);
    }

    return { moves, statistics: this.calcStats(moves) };
  }

  /** Get statistics only (no move list). */
  statistics(gcode: string): BackplotStatistics {
    return this.parse(gcode).statistics;
  }

  // ─── internal ───

  private parseLine(
    line: string, state: ParseState, lineNumber: number,
  ): BackplotMove[] {
    const moves: BackplotMove[] = [];
    const words = parseWords(line);

    let newX: number | null = null;
    let newY: number | null = null;
    let newZ: number | null = null;
    let arcI: number | null = null;
    let arcJ: number | null = null;
    let arcK: number | null = null;
    let arcR: number | null = null;
    let moveType: MoveType | null = null;

    for (const w of words) {
      switch (w.letter) {
        case "G":
          switch (Math.floor(w.value)) {
            case 0: moveType = "rapid"; state.rapidMode = true; break;
            case 1: moveType = "linear"; state.rapidMode = false; break;
            case 2: moveType = "arc"; break;
            case 3: moveType = "arc"; break;
            case 17: state.plane = "XY"; break;
            case 18: state.plane = "XZ"; break;
            case 19: state.plane = "YZ"; break;
            case 20: state.metric = false; break;
            case 21: state.metric = true; break;
            case 28: moveType = "home"; break;
            case 90: state.absolute = true; break;
            case 91: state.absolute = false; break;
          }
          break;
        case "X": newX = w.value; break;
        case "Y": newY = w.value; break;
        case "Z": newZ = w.value; break;
        case "I": arcI = w.value; break;
        case "J": arcJ = w.value; break;
        case "K": arcK = w.value; break;
        case "R": arcR = w.value; break;
        case "F": state.f = w.value; break;
        case "S": state.s = w.value; break;
        case "T": state.tool = w.value; break;
      }
    }

    // Determine if G2 (CW) or G3 (CCW) from the original line
    const isG2 = words.some(
      w => w.letter === "G" && Math.floor(w.value) === 2,
    );
    const isG3 = words.some(
      w => w.letter === "G" && Math.floor(w.value) === 3,
    );
    const clockwise = isG2;

    const targetX = newX !== null
      ? (state.absolute ? newX : state.x + newX) : state.x;
    const targetY = newY !== null
      ? (state.absolute ? newY : state.y + newY) : state.y;
    const targetZ = newZ !== null
      ? (state.absolute ? newZ : state.z + newZ) : state.z;

    if (moveType || newX !== null || newY !== null || newZ !== null) {
      const effectiveType = moveType
        ?? (state.rapidMode ? "rapid" : "linear");

      if ((isG2 || isG3) && effectiveType === "arc") {
        const arcMoves = this.generateArcMoves(
          state.x, state.y, state.z,
          targetX, targetY, targetZ,
          arcI, arcJ, arcK, arcR,
          clockwise, state.f, lineNumber, state.tool,
        );
        moves.push(...arcMoves);
      } else {
        moves.push({
          type: effectiveType,
          from: { x: state.x, y: state.y, z: state.z },
          to: { x: targetX, y: targetY, z: targetZ },
          feedRate: state.rapidMode ? 10000 : state.f,
          lineNumber,
          tool: state.tool,
        });
      }
      state.x = targetX;
      state.y = targetY;
      state.z = targetZ;
    }

    return moves;
  }

  private generateArcMoves(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    i: number | null, j: number | null,
    _k: number | null, r: number | null,
    clockwise: boolean, feedRate: number,
    lineNumber: number, tool: number,
  ): BackplotMove[] {
    const moves: BackplotMove[] = [];
    let cx: number, cy: number, radius: number;

    if (r !== null) {
      radius = Math.abs(r);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1e-10) return moves;
      const h = Math.sqrt(Math.max(0, radius * radius - (dist / 2) ** 2));
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const sign = (clockwise ? 1 : -1) * (r < 0 ? -1 : 1);
      cx = mx + sign * h * (-dy / dist);
      cy = my + sign * h * (dx / dist);
    } else {
      cx = x1 + (i ?? 0);
      cy = y1 + (j ?? 0);
      radius = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
    }

    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);
    let sweep = endAngle - startAngle;
    if (clockwise) { if (sweep > 0) sweep -= Math.PI * 2; }
    else { if (sweep < 0) sweep += Math.PI * 2; }

    const segments = Math.max(
      12, Math.abs(Math.round(sweep / (Math.PI / 18))),
    );
    const deltaZ = (z2 - z1) / segments;
    let prevX = x1, prevY = y1, prevZ = z1;

    for (let seg = 1; seg <= segments; seg++) {
      const t = seg / segments;
      const angle = startAngle + sweep * t;
      const nx = cx + radius * Math.cos(angle);
      const ny = cy + radius * Math.sin(angle);
      const nz = z1 + deltaZ * seg;

      moves.push({
        type: "arc",
        from: { x: prevX, y: prevY, z: prevZ },
        to: { x: nx, y: ny, z: nz },
        feedRate,
        lineNumber,
        tool,
        arcData: { center: { x: cx, y: cy }, radius, clockwise },
      });
      prevX = nx; prevY = ny; prevZ = nz;
    }
    return moves;
  }

  private calcStats(moves: BackplotMove[]): BackplotStatistics {
    let rapidDist = 0, feedDist = 0, machTime = 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const m of moves) {
      const dx = m.to.x - m.from.x;
      const dy = m.to.y - m.from.y;
      const dz = m.to.z - m.from.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (m.type === "rapid") {
        rapidDist += dist;
      } else {
        feedDist += dist;
        if (m.feedRate > 0) machTime += dist / m.feedRate;
      }
      minX = Math.min(minX, m.from.x, m.to.x);
      maxX = Math.max(maxX, m.from.x, m.to.x);
      minY = Math.min(minY, m.from.y, m.to.y);
      maxY = Math.max(maxY, m.from.y, m.to.y);
      minZ = Math.min(minZ, m.from.z, m.to.z);
      maxZ = Math.max(maxZ, m.from.z, m.to.z);
    }

    if (moves.length === 0) {
      minX = maxX = minY = maxY = minZ = maxZ = 0;
    }

    return {
      totalMoves: moves.length,
      rapidDistance: round3(rapidDist),
      feedDistance: round3(feedDist),
      totalDistance: round3(rapidDist + feedDist),
      machiningTime: round3(machTime),
      boundingBox: {
        min: { x: round3(minX), y: round3(minY), z: round3(minZ) },
        max: { x: round3(maxX), y: round3(maxY), z: round3(maxZ) },
      },
    };
  }
}

// ── helpers ──

function cleanLine(line: string): string {
  let clean = line.replace(/\(.*?\)/g, "").replace(/;.*$/, "");
  clean = clean.replace(/^N\d+\s*/i, "");
  return clean.trim().toUpperCase();
}

function parseWords(line: string): Word[] {
  const words: Word[] = [];
  const regex = /([A-Z])(-?\d*\.?\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    words.push({ letter: match[1], value: parseFloat(match[2]) });
  }
  return words;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export const backplotEngine = new BackplotEngineImpl();
