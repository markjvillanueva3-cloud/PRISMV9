/**
 * TransitionPathEngine — CAMK-MS3/U03
 * Optimized linking moves between cut segments and between operations.
 *
 * Strategies:
 * 1. Shortest safe retract — minimum Z clearance above stock
 * 2. Direct linking — shortest XY path with collision check
 * 3. Spiral in/out — reduces air time for pocket entries
 * 4. Smooth transitions — G2/G3 arcs for surface finish continuity
 *
 * References:
 * - Held (1991): On the Computational Geometry of Pocket Machining, Ch. 5
 * - Choi et al. (1997): Retract & approach path optimization
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface Point3D { x: number; y: number; z: number; }

interface AABB {
  min_x: number; min_y: number; min_z: number;
  max_x: number; max_y: number; max_z: number;
}

interface TransitionInput {
  from: Point3D;
  to: Point3D;
  stock: AABB;
  obstacles?: AABB[];              // fixtures, clamps
  clearance_mm?: number;           // safe Z above stock (default 5)
  rapid_rate_mmmin?: number;       // default 30000
  strategy?: "shortest_retract" | "direct" | "spiral" | "smooth" | "auto";
  tool_diameter_mm?: number;       // for spiral and smooth
}

interface TransitionMove {
  type: "rapid" | "linear" | "arc_cw" | "arc_cc";
  x: number; y: number; z: number;
  i?: number; j?: number;          // arc center offsets
  feed_mmmin?: number;             // undefined = rapid
}

interface TransitionResult {
  moves: TransitionMove[];
  strategy_used: string;
  total_distance_mm: number;
  air_time_sec: number;
  retract_height_mm: number;
  move_count: number;
}

interface BatchTransitionInput {
  points: Point3D[];               // ordered cut endpoints
  stock: AABB;
  obstacles?: AABB[];
  clearance_mm?: number;
  rapid_rate_mmmin?: number;
  strategy?: TransitionInput["strategy"];
  tool_diameter_mm?: number;
}

interface BatchTransitionResult {
  transitions: TransitionResult[];
  total_air_distance_mm: number;
  total_air_time_sec: number;
  savings_vs_full_retract_pct: number;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class TransitionPathEngine {
  private dist3D(a: Point3D, b: Point3D): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  private dist2D(a: Point3D, b: Point3D): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  private pointInAABB(p: Point3D, box: AABB, margin: number = 0): boolean {
    return p.x >= box.min_x - margin && p.x <= box.max_x + margin &&
           p.y >= box.min_y - margin && p.y <= box.max_y + margin &&
           p.z >= box.min_z - margin && p.z <= box.max_z + margin;
  }

  private lineIntersectsAABB(a: Point3D, b: Point3D, box: AABB, margin: number = 2): boolean {
    // Sample points along line and check if any are inside box
    const steps = Math.max(5, Math.ceil(this.dist3D(a, b) / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      };
      if (this.pointInAABB(p, box, margin)) return true;
    }
    return false;
  }

  /**
   * Strategy 1: Shortest safe retract.
   * Retract to clearance plane → rapid XY → plunge to target.
   */
  shortestRetract(input: TransitionInput): TransitionResult {
    const { from, to, stock, clearance_mm = 5, rapid_rate_mmmin = 30000 } = input;
    const safeZ = stock.max_z + clearance_mm;
    const moves: TransitionMove[] = [];

    // Retract to safe Z
    if (from.z < safeZ) {
      moves.push({ type: "rapid", x: from.x, y: from.y, z: safeZ });
    }
    // Rapid XY
    if (Math.abs(from.x - to.x) > 0.001 || Math.abs(from.y - to.y) > 0.001) {
      moves.push({ type: "rapid", x: to.x, y: to.y, z: safeZ });
    }
    // Plunge to target Z
    if (Math.abs(safeZ - to.z) > 0.001) {
      moves.push({ type: "rapid", x: to.x, y: to.y, z: to.z });
    }

    const totalDist = moves.reduce((sum, m, i) => {
      const prev = i === 0 ? from : { x: moves[i - 1].x, y: moves[i - 1].y, z: moves[i - 1].z };
      return sum + this.dist3D(prev, m);
    }, 0);

    return {
      moves,
      strategy_used: "shortest_retract",
      total_distance_mm: totalDist,
      air_time_sec: (totalDist / rapid_rate_mmmin) * 60,
      retract_height_mm: safeZ,
      move_count: moves.length,
    };
  }

  /**
   * Strategy 2: Direct linking — go straight if no collision.
   */
  directLink(input: TransitionInput): TransitionResult {
    const { from, to, stock, obstacles = [], clearance_mm = 5, rapid_rate_mmmin = 30000 } = input;

    // Check if direct path is collision-free
    const allObstacles = [stock, ...obstacles];
    const directSafe = !allObstacles.some(obs => this.lineIntersectsAABB(from, to, obs));

    if (directSafe) {
      const dist = this.dist3D(from, to);
      return {
        moves: [{ type: "rapid", x: to.x, y: to.y, z: to.z }],
        strategy_used: "direct",
        total_distance_mm: dist,
        air_time_sec: (dist / rapid_rate_mmmin) * 60,
        retract_height_mm: Math.max(from.z, to.z),
        move_count: 1,
      };
    }

    // Fall back to retract
    return this.shortestRetract(input);
  }

  /**
   * Strategy 3: Spiral in/out — helical approach/retract.
   */
  spiralTransition(input: TransitionInput): TransitionResult {
    const { from, to, stock, clearance_mm = 5, rapid_rate_mmmin = 30000, tool_diameter_mm = 10 } = input;
    const safeZ = stock.max_z + clearance_mm;
    const moves: TransitionMove[] = [];
    const radius = tool_diameter_mm / 2;

    // Retract with spiral out (quarter arc up)
    moves.push({
      type: "arc_cw",
      x: from.x + radius, y: from.y, z: Math.min(safeZ, from.z + radius),
      i: radius / 2, j: 0,
      feed_mmmin: rapid_rate_mmmin * 0.5,
    });

    // Rapid to safe Z
    moves.push({ type: "rapid", x: from.x + radius, y: from.y, z: safeZ });

    // Rapid XY to target approach position
    moves.push({ type: "rapid", x: to.x + radius, y: to.y, z: safeZ });

    // Spiral in (helical plunge)
    moves.push({
      type: "arc_cc",
      x: to.x, y: to.y, z: to.z,
      i: -radius / 2, j: 0,
      feed_mmmin: rapid_rate_mmmin * 0.3,
    });

    const totalDist = moves.reduce((sum, m, i) => {
      const prev = i === 0 ? from : { x: moves[i - 1].x, y: moves[i - 1].y, z: moves[i - 1].z };
      return sum + this.dist3D(prev, m);
    }, 0);

    return {
      moves,
      strategy_used: "spiral",
      total_distance_mm: totalDist,
      air_time_sec: (totalDist / rapid_rate_mmmin) * 60,
      retract_height_mm: safeZ,
      move_count: moves.length,
    };
  }

  /**
   * Strategy 4: Smooth transition — arc tangent to both paths.
   */
  smoothTransition(input: TransitionInput): TransitionResult {
    const { from, to, rapid_rate_mmmin = 30000, tool_diameter_mm = 10 } = input;
    const dist = this.dist2D(from, to);
    const moves: TransitionMove[] = [];

    if (dist < tool_diameter_mm * 2) {
      // Close enough for single arc
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const midZ = Math.max(from.z, to.z) + 1; // slight lift

      moves.push({
        type: "arc_cw",
        x: to.x, y: to.y, z: to.z,
        i: midX - from.x, j: midY - from.y,
        feed_mmmin: rapid_rate_mmmin * 0.5,
      });
    } else {
      // Lift, traverse, settle
      const liftZ = Math.max(from.z, to.z) + 2;
      moves.push({ type: "linear", x: from.x, y: from.y, z: liftZ, feed_mmmin: rapid_rate_mmmin * 0.8 });
      moves.push({ type: "rapid", x: to.x, y: to.y, z: liftZ });
      moves.push({ type: "linear", x: to.x, y: to.y, z: to.z, feed_mmmin: rapid_rate_mmmin * 0.5 });
    }

    const totalDist = moves.reduce((sum, m, i) => {
      const prev = i === 0 ? from : { x: moves[i - 1].x, y: moves[i - 1].y, z: moves[i - 1].z };
      return sum + this.dist3D(prev, m);
    }, 0);

    return {
      moves,
      strategy_used: "smooth",
      total_distance_mm: totalDist,
      air_time_sec: (totalDist / rapid_rate_mmmin) * 60,
      retract_height_mm: Math.max(from.z, to.z) + 2,
      move_count: moves.length,
    };
  }

  /**
   * Auto-select best strategy based on geometry.
   */
  autoSelect(input: TransitionInput): TransitionResult {
    const dist = this.dist2D(input.from, input.to);
    const toolDia = input.tool_diameter_mm ?? 10;

    // Try direct first
    const direct = this.directLink(input);
    if (direct.strategy_used === "direct") return direct;

    // Close moves → smooth
    if (dist < toolDia * 3) return this.smoothTransition(input);

    // Default → shortest retract (safest)
    return this.shortestRetract(input);
  }

  /**
   * Plan a single transition between two points.
   */
  plan(input: TransitionInput): TransitionResult {
    const strategy = input.strategy ?? "auto";
    switch (strategy) {
      case "shortest_retract": return this.shortestRetract(input);
      case "direct": return this.directLink(input);
      case "spiral": return this.spiralTransition(input);
      case "smooth": return this.smoothTransition(input);
      case "auto": return this.autoSelect(input);
      default: return this.shortestRetract(input);
    }
  }

  /**
   * Plan transitions for an entire toolpath (between consecutive points).
   */
  planBatch(input: BatchTransitionInput): BatchTransitionResult {
    const { points, stock, obstacles, clearance_mm, rapid_rate_mmmin, strategy, tool_diameter_mm } = input;

    if (points.length < 2) {
      return { transitions: [], total_air_distance_mm: 0, total_air_time_sec: 0, savings_vs_full_retract_pct: 0 };
    }

    const transitions: TransitionResult[] = [];
    let totalOptDist = 0;
    let totalFullRetractDist = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const trans = this.plan({
        from: points[i], to: points[i + 1],
        stock, obstacles, clearance_mm, rapid_rate_mmmin, strategy, tool_diameter_mm,
      });
      transitions.push(trans);
      totalOptDist += trans.total_distance_mm;

      // Compare with full retract
      const fullRetract = this.shortestRetract({
        from: points[i], to: points[i + 1],
        stock, clearance_mm: (clearance_mm ?? 5) + 20, // high retract
      });
      totalFullRetractDist += fullRetract.total_distance_mm;
    }

    const totalTime = transitions.reduce((s, t) => s + t.air_time_sec, 0);
    const savings = totalFullRetractDist > 0
      ? ((totalFullRetractDist - totalOptDist) / totalFullRetractDist) * 100
      : 0;

    return {
      transitions,
      total_air_distance_mm: totalOptDist,
      total_air_time_sec: totalTime,
      savings_vs_full_retract_pct: Math.max(0, savings),
    };
  }
}

export const transitionPathEngine = new TransitionPathEngine();
