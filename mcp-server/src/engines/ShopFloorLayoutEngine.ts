/**
 * ShopFloorLayoutEngine — phone-walkthrough 3D shop-floor layout
 * (iter6 — hotel slot, 2026-05-24, U-EMPLOYEE-MOBILE-PORTAL-LAYOUT).
 *
 * Purpose: persist the result of a phone-side AR walkthrough (ARKit on iOS,
 * ARCore on Android) of the JM Die shop floor — so an operator can later
 * tap a machine in a 3D map view and instantly see:
 *   - the machine's identity (cross-reference to MachineRegistry)
 *   - the currently-running job + operation + primary operator
 *   - the queue of scheduled jobs
 *   - capacity + utilization (cross-reference to ShopFloorSchedule)
 *
 * Engine scope (Karpathy R5 — model only for judgment calls):
 *   THIS engine: spatial-state store + query (point → machine, machine → bbox,
 *                listing, capture-session lifecycle).
 *   NOT THIS engine: photogrammetry, SLAM, video reconstruction — those run
 *                    on the phone via OS-native AR. The phone uploads
 *                    bounding boxes + pose hints; we persist them.
 *
 * Hotel-soul:
 *   - audit row on every machine tag (who tagged, when, captureSessionId)
 *   - reject overlapping tags unless explicitly --overwrite (no silent clobber)
 *   - defensive copy on every public return
 *   - R12 fail-loud on bad geometry (NaN / Infinity / inverted bounds)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox3D {
  min: Point3D;  // axis-aligned min corner
  max: Point3D;  // axis-aligned max corner
}

export type CaptureStatus = "in_progress" | "completed" | "abandoned";

export interface CaptureSession {
  session_id: string;
  started_by: string;     // employee_id
  started_at: string;
  status: CaptureStatus;
  completed_at?: string;
  abandoned_at?: string;
  abandon_reason?: string;
  frame_count: number;    // how many ARFrame poses were posted during capture
  machines_tagged: number;
}

export interface MachineLayoutEntry {
  machine_id: string;     // refers to a MachineRegistry id
  bbox: BoundingBox3D;
  tagged_by: string;      // employee_id
  tagged_at: string;
  capture_session_id: string;
  notes?: string;
}

export interface MachineTagAudit {
  machine_id: string;
  prior_bbox?: BoundingBox3D;
  new_bbox: BoundingBox3D;
  tagged_by: string;
  tagged_at: string;
  capture_session_id: string;
  overwrote: boolean;
}

// ─── Constants (named, not magic) ───────────────────────────────────────────

const MAX_NOTES_CHARS = 500;
const MAX_FRAMES_PER_CAPTURE = 50000;  // ~50fps × 1000s, very generous
const COORD_BOUND_M = 1000;            // ±1km = sane shop-floor bound

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertFinitePoint(p: Point3D, label: string): void {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
    throw new Error(`${label}: coordinates must be finite (got x=${p.x}, y=${p.y}, z=${p.z})`);
  }
  if (Math.abs(p.x) > COORD_BOUND_M || Math.abs(p.y) > COORD_BOUND_M || Math.abs(p.z) > COORD_BOUND_M) {
    throw new Error(`${label}: coordinates out of bound (±${COORD_BOUND_M}m)`);
  }
}

function assertValidBbox(bbox: BoundingBox3D, label: string): void {
  assertFinitePoint(bbox.min, `${label}.min`);
  assertFinitePoint(bbox.max, `${label}.max`);
  if (bbox.min.x > bbox.max.x || bbox.min.y > bbox.max.y || bbox.min.z > bbox.max.z) {
    throw new Error(`${label}: inverted bbox — min must be <= max on all axes`);
  }
}

function pointInBbox(p: Point3D, bbox: BoundingBox3D): boolean {
  return p.x >= bbox.min.x && p.x <= bbox.max.x
      && p.y >= bbox.min.y && p.y <= bbox.max.y
      && p.z >= bbox.min.z && p.z <= bbox.max.z;
}

function bboxOverlap(a: BoundingBox3D, b: BoundingBox3D): boolean {
  return a.min.x <= b.max.x && a.max.x >= b.min.x
      && a.min.y <= b.max.y && a.max.y >= b.min.y
      && a.min.z <= b.max.z && a.max.z >= b.min.z;
}

function bboxCenter(b: BoundingBox3D): Point3D {
  return { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 };
}

function dist2(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class ShopFloorLayoutEngine {
  private readonly captures = new Map<string, CaptureSession>();
  private readonly layout = new Map<string, MachineLayoutEntry>();   // machine_id → entry
  private readonly audit: MachineTagAudit[] = [];
  private captureCounter = 0;

  // ─── Capture session lifecycle ────────────────────────────────────────────

  /** Start a new walkthrough capture. Returns the session id. */
  startCapture(started_by: string): CaptureSession {
    if (!started_by) throw new Error("startCapture: started_by required");
    const session: CaptureSession = {
      session_id: `CAP-${++this.captureCounter}`,
      started_by,
      started_at: new Date().toISOString(),
      status: "in_progress",
      frame_count: 0,
      machines_tagged: 0,
    };
    this.captures.set(session.session_id, session);
    return { ...session };
  }

  /**
   * Record that N frames were posted from the phone (we don't store frame
   * geometry here — phone does the AR reconstruction; we just count for
   * audit + cost tracking).
   */
  addFrames(session_id: string, n: number): CaptureSession {
    if (!Number.isInteger(n) || n <= 0) throw new Error("addFrames: n must be a positive integer");
    const s = this.captures.get(session_id);
    if (!s) throw new Error(`addFrames: capture ${session_id} not found`);
    if (s.status !== "in_progress") throw new Error(`addFrames: capture ${session_id} is ${s.status}, not in_progress`);
    if (s.frame_count + n > MAX_FRAMES_PER_CAPTURE) {
      throw new Error(`addFrames: capture would exceed MAX_FRAMES_PER_CAPTURE=${MAX_FRAMES_PER_CAPTURE}`);
    }
    s.frame_count += n;
    return { ...s };
  }

  /**
   * Tag a machine inside an in-progress capture. Overlapping bbox with an
   * EXISTING machine is REFUSED unless opts.overwrite=true (hotel-soul:
   * never silent clobber). Audit row written on every tag.
   */
  tagMachine(
    session_id: string,
    machine_id: string,
    bbox: BoundingBox3D,
    notes?: string,
    opts: { overwrite?: boolean } = {},
  ): MachineLayoutEntry {
    if (!machine_id) throw new Error("tagMachine: machine_id required");
    assertValidBbox(bbox, "tagMachine.bbox");
    const s = this.captures.get(session_id);
    if (!s) throw new Error(`tagMachine: capture ${session_id} not found`);
    if (s.status !== "in_progress") throw new Error(`tagMachine: capture ${session_id} is ${s.status}, not in_progress`);

    // Overlap check (refuse on overlap with a DIFFERENT machine unless overwrite)
    for (const [otherId, otherEntry] of this.layout) {
      if (otherId === machine_id) continue;
      if (bboxOverlap(bbox, otherEntry.bbox) && !opts.overwrite) {
        throw new Error(
          `tagMachine: bbox overlaps existing machine '${otherId}' — pass overwrite:true to replace, or move tag`,
        );
      }
    }

    const prior = this.layout.get(machine_id);
    const now = new Date().toISOString();
    const entry: MachineLayoutEntry = {
      machine_id,
      bbox,
      tagged_by: s.started_by,
      tagged_at: now,
      capture_session_id: session_id,
      notes: notes ? notes.slice(0, MAX_NOTES_CHARS) : undefined,
    };
    this.layout.set(machine_id, entry);
    this.audit.push({
      machine_id,
      prior_bbox: prior?.bbox,
      new_bbox: bbox,
      tagged_by: s.started_by,
      tagged_at: now,
      capture_session_id: session_id,
      overwrote: prior !== undefined,
    });
    s.machines_tagged += 1;
    return { ...entry };
  }

  /** Mark a capture as completed (terminal). */
  finishCapture(session_id: string): CaptureSession {
    const s = this.captures.get(session_id);
    if (!s) throw new Error(`finishCapture: ${session_id} not found`);
    if (s.status !== "in_progress") throw new Error(`finishCapture: ${session_id} is ${s.status}, not in_progress`);
    s.status = "completed";
    s.completed_at = new Date().toISOString();
    return { ...s };
  }

  /** Mark a capture as abandoned (terminal). Reason required (audit). */
  abandonCapture(session_id: string, reason: string): CaptureSession {
    const s = this.captures.get(session_id);
    if (!s) throw new Error(`abandonCapture: ${session_id} not found`);
    if (!reason || reason.trim().length < 3) throw new Error("abandonCapture: reason required (>=3 chars)");
    if (s.status !== "in_progress") throw new Error(`abandonCapture: ${session_id} already terminal`);
    s.status = "abandoned";
    s.abandoned_at = new Date().toISOString();
    s.abandon_reason = reason.slice(0, MAX_NOTES_CHARS);
    return { ...s };
  }

  // ─── Spatial queries ──────────────────────────────────────────────────────

  /**
   * Find the machine whose bbox contains the given 3D point. Returns null
   * if no machine matches. If point is inside MULTIPLE bboxes (shouldn't
   * happen given the overlap-refusal in tagMachine, but possible after
   * --overwrite), returns the closest by bbox-center distance.
   */
  getMachineAtPoint(p: Point3D): MachineLayoutEntry | null {
    assertFinitePoint(p, "getMachineAtPoint");
    const candidates: MachineLayoutEntry[] = [];
    for (const entry of this.layout.values()) {
      if (pointInBbox(p, entry.bbox)) candidates.push(entry);
    }
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return { ...candidates[0] };
    // Tie-break: nearest bbox center
    let best = candidates[0];
    let bestD = dist2(p, bboxCenter(best.bbox));
    for (let i = 1; i < candidates.length; i++) {
      const d = dist2(p, bboxCenter(candidates[i].bbox));
      if (d < bestD) { best = candidates[i]; bestD = d; }
    }
    return { ...best };
  }

  /** Get a machine's recorded layout entry by id. */
  getMachineLayout(machine_id: string): MachineLayoutEntry | null {
    const e = this.layout.get(machine_id);
    return e ? { ...e } : null;
  }

  /** Full layout snapshot (defensive copy). */
  listLayout(): MachineLayoutEntry[] {
    return Array.from(this.layout.values()).map(e => ({ ...e }));
  }

  /** All captures (lifecycle status visible to office personnel). */
  listCaptures(filter?: { status?: CaptureStatus; startedBy?: string }): CaptureSession[] {
    return Array.from(this.captures.values())
      .filter(c => !filter?.status || c.status === filter.status)
      .filter(c => !filter?.startedBy || c.started_by === filter.startedBy)
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .map(c => ({ ...c }));
  }

  /** Full audit chain (defensive copy). */
  getAudit(machine_id?: string): MachineTagAudit[] {
    const trail = machine_id ? this.audit.filter(a => a.machine_id === machine_id) : this.audit;
    return trail.slice().map(a => ({ ...a }));
  }

  /** Test hook — drop all state. */
  reset(): void {
    this.captures.clear();
    this.layout.clear();
    this.audit.length = 0;
    this.captureCounter = 0;
  }
}

export const shopFloorLayoutEngine = new ShopFloorLayoutEngine();
