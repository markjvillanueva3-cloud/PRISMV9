/**
 * WorkpieceStateEngine — In-Process Workpiece (IPW) State Tracker
 *
 * Tracks material removal step-by-step through the operation sequence.
 * Maintains: current geometry (AABB-based), surface catalog, wall thickness,
 * clamping zones, datum surfaces, and volume removed percentage.
 *
 * 3-Level Geometry Input:
 *   Level 3: Fusion 360 B-rep (highest fidelity, via LiveBridge)
 *   Level 2: Feature-based AABB subtraction (medium, from FeatureRecognition)
 *   Level 1: G-code stock reconstruction (lowest, from SweptVolume)
 *
 * Foundation for MF-MS1 (Accessibility), MF-MS2 (Sequence Feasibility),
 * MF-MS3 (Setup Transitions), MF-MS4 (System Integration).
 *
 * @module MF-MS0/P0-U01
 */

/** Atomic value wrapper with confidence and source tracking */
export interface AtomicValue<T> {
  value: T;
  confidence: number;
  source: string;
}

// ── Legacy Compatibility Types (consumed by AccessibilityAnalysisEngine et al.) ──

/** AABB bounding box — same convention as SweptVolumeEngine */
export interface AABB {
  min_x: number; max_x: number
  min_y: number; max_y: number
  min_z: number; max_z: number
}

/** 3D unit vector */
export interface Vector3D {
  x: number; y: number; z: number
}

/** 3D position with optional rotary axes */
export interface Position3D {
  x: number; y: number; z: number
  a?: number; b?: number; c?: number
}

/** Feature type classification (compatible with PartGeometryPipelineEngine) */
export type FeatureType =
  | "pocket_open" | "pocket_closed"
  | "hole_through" | "hole_blind"
  | "wall" | "contour" | "face" | "slot"
  | "thread" | "chamfer" | "fillet"
  | "bore" | "groove" | "step" | "profile"

/** Operation type for sequence tracking */
export type MachiningOpType =
  | "face" | "rough_pocket" | "finish_pocket"
  | "rough_contour" | "finish_contour"
  | "drill" | "bore" | "ream" | "tap"
  | "slot" | "groove" | "chamfer" | "fillet"
  | "rough_3d" | "finish_3d"
  | "turn_od" | "turn_id" | "thread"
  | "cut_off" | "deburr" | "engrave"

/** Feature targeted by an operation */
export interface TargetFeature {
  id: string
  type: FeatureType
  volume_aabb: AABB
  depth_mm: number
  width_mm?: number
  length_mm?: number
  diameter_mm?: number
  corner_radius_mm?: number
  tolerance_mm?: number
  surface_finish_Ra_um?: number
  position: Position3D
}

/** Single machining operation in the sequence */
export interface MachiningOperation {
  id: string
  type: MachiningOpType
  feature: TargetFeature
  tool?: {
    id: string
    diameter_mm: number
    length_mm: number
    corner_radius_mm?: number
    type?: string
  }
  setup_id?: string
  sequence: number
  ap_mm?: number
  ae_mm?: number
  cutting_force_N?: number
  cycle_time_s?: number
}

/** Geometry fidelity level */
export type GeometryLevel = 1 | 2 | 3

/** Surface classification for clamping analysis */
export type SurfaceZone =
  | "top" | "bottom"
  | "side_x_pos" | "side_x_neg"
  | "side_y_pos" | "side_y_neg"
  | "bore" | "internal"

/** Datum surface status (legacy compat) */
export interface DatumStatus {
  datum_id: string
  surface_id: string
  intact: boolean
  flatness_degradation_um: number
  affected_by: string[]
}

/** Clamping zones keyed by face (legacy compat) */
export interface ClampingZones {
  top: { area_mm2: number; surfaces: string[]; accessible: boolean }
  bottom: { area_mm2: number; surfaces: string[]; accessible: boolean }
  side_x_pos: { area_mm2: number; surfaces: string[]; accessible: boolean }
  side_x_neg: { area_mm2: number; surfaces: string[]; accessible: boolean }
  side_y_pos: { area_mm2: number; surfaces: string[]; accessible: boolean }
  side_y_neg: { area_mm2: number; surfaces: string[]; accessible: boolean }
  bore: { area_mm2: number; surfaces: string[]; accessible: boolean }
}

/** Surface on the workpiece (legacy compat) */
export interface WorkpieceSurface {
  id: string
  zone: SurfaceZone
  normal: Vector3D
  area_mm2: number
  centroid: Position3D
  flatness_um: number
  is_machined: boolean
  is_datum: boolean
  is_clamping_surface: boolean
  modified_by: string[]
  destroyed: boolean
}

/** IPW geometry (legacy compat) */
export interface IPWGeometry {
  bounding_box: AABB
  removed_volumes: Array<{ op_id: string; aabb: AABB }>
  remaining_volume_mm3: number
  original_volume_mm3: number
}

/** Init input (legacy compat) */
export interface WorkpieceInitInput {
  stock: AABB
  features: TargetFeature[]
  geometry_level?: GeometryLevel
  material?: { name: string; density_kg_m3?: number; elastic_modulus_GPa?: number; poisson_ratio?: number }
  datums?: Array<{ datum_id: string; zone: SurfaceZone }>
  clamping_surfaces?: SurfaceZone[]
}

/** Apply operation result (legacy compat) */
export interface ApplyOperationResult {
  state: WorkpieceState
  new_wall_sections: WallSection[]
  surfaces_destroyed: string[]
  datums_affected: DatumStatus[]
  warnings: string[]
}

// ── Types ──

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface Surface {
  id: string;
  type: "planar" | "cylindrical" | "conical" | "spherical" | "freeform";
  normal: { x: number; y: number; z: number };
  area_mm2: number;
  position: { x: number; y: number; z: number }; // centroid
  flatness_mm?: number;
  is_datum: boolean;
  is_clamping_surface: boolean;
  created_by_op?: string; // operation ID that created this surface
  face: "top" | "bottom" | "front" | "back" | "left" | "right" | "internal";
  zone?: SurfaceZone; // legacy compat
  destroyed?: boolean; // legacy compat
}

export interface WallSection {
  id: string;
  thickness_mm: number;
  height_mm: number;
  length_mm: number;
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number }; // wall normal
  adjacent_features: string[]; // feature IDs on either side
  rigidity_score: number; // 0-1, based on L/t ratio
}

export interface ClampingZone {
  face: "top" | "bottom" | "left" | "right" | "front" | "back" | "bore";
  available_area_mm2: number;
  original_area_mm2: number;
  area_ratio: number; // available / original
  is_accessible: boolean;
  surfaces: string[]; // surface IDs in this zone
}

export interface DatumSurface {
  id: string;
  type: "primary" | "secondary" | "tertiary";
  surface_id: string;
  is_intact: boolean; // false if material has been removed from this datum
  flatness_mm: number;
  area_mm2: number;
}

export interface OperationRecord {
  id: string;
  type: string; // "pocket", "hole", "face", "slot", etc.
  tool_diameter_mm: number;
  depth_mm: number;
  width_mm?: number;
  length_mm?: number;
  position: { x: number; y: number; z: number };
  volume_removed_mm3: number;
  surfaces_created: string[];
  surfaces_destroyed: string[];
  timestamp: number; // sequence index
}

export interface WorkpieceState {
  stock: BoundingBox;
  current_ipw: BoundingBox; // evolves as material is removed
  operations_applied: OperationRecord[];
  surfaces: Surface[];
  wall_sections: WallSection[];
  clamping_zones: ClampingZone[];
  datum_surfaces: DatumSurface[];
  volume_stock_mm3: number;
  volume_remaining_mm3: number;
  volume_removed_pct: number;
  min_wall_thickness_mm: number;
  geometry_level: 1 | 2 | 3; // fidelity level
  setup_number: number;
  setup_orientation: "top" | "bottom" | "left" | "right" | "front" | "back";
}

export interface StockInput {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  material?: string;
}

export interface OperationInput {
  id: string;
  type: string;
  tool_diameter_mm: number;
  depth_mm: number;
  width_mm?: number;
  length_mm?: number;
  position?: { x: number; y: number; z: number };
  approach_direction?: "top" | "bottom" | "left" | "right" | "front" | "back";
}

export interface FeatureInput {
  id: string;
  type: string;
  dimensions: Record<string, number>;
  position?: { x: number; y: number; z: number };
}

// ── Engine ──

export class WorkpieceStateEngine {
  readonly name = "WorkpieceStateEngine";

  private history: WorkpieceState[] = [];

  /**
   * Initialize workpiece from stock dimensions.
   * Sets up initial surfaces, clamping zones, and datum surfaces.
   */
  initialize(stock: StockInput): AtomicValue<WorkpieceState> {
    const L = stock.length_mm;
    const W = stock.width_mm;
    const H = stock.height_mm;

    const bbox: BoundingBox = {
      min: { x: -L/2, y: -W/2, z: 0 },
      max: { x: L/2, y: W/2, z: H },
    };

    const volume = L * W * H;

    // Create initial 6 stock surfaces
    const surfaces: Surface[] = [
      { id: "S_TOP", type: "planar", normal: { x: 0, y: 0, z: 1 }, area_mm2: L * W, position: { x: 0, y: 0, z: H }, is_datum: false, is_clamping_surface: true, face: "top" },
      { id: "S_BOT", type: "planar", normal: { x: 0, y: 0, z: -1 }, area_mm2: L * W, position: { x: 0, y: 0, z: 0 }, is_datum: true, is_clamping_surface: true, face: "bottom" },
      { id: "S_FRONT", type: "planar", normal: { x: 0, y: -1, z: 0 }, area_mm2: L * H, position: { x: 0, y: -W/2, z: H/2 }, is_datum: false, is_clamping_surface: true, face: "front" },
      { id: "S_BACK", type: "planar", normal: { x: 0, y: 1, z: 0 }, area_mm2: L * H, position: { x: 0, y: W/2, z: H/2 }, is_datum: false, is_clamping_surface: true, face: "back" },
      { id: "S_LEFT", type: "planar", normal: { x: -1, y: 0, z: 0 }, area_mm2: W * H, position: { x: -L/2, y: 0, z: H/2 }, is_datum: false, is_clamping_surface: true, face: "left" },
      { id: "S_RIGHT", type: "planar", normal: { x: 1, y: 0, z: 0 }, area_mm2: W * H, position: { x: L/2, y: 0, z: H/2 }, is_datum: false, is_clamping_surface: true, face: "right" },
    ];

    // Initial clamping zones (all faces fully available)
    const clampingZones: ClampingZone[] = [
      { face: "top", available_area_mm2: L * W, original_area_mm2: L * W, area_ratio: 1.0, is_accessible: true, surfaces: ["S_TOP"] },
      { face: "bottom", available_area_mm2: L * W, original_area_mm2: L * W, area_ratio: 1.0, is_accessible: true, surfaces: ["S_BOT"] },
      { face: "left", available_area_mm2: W * H, original_area_mm2: W * H, area_ratio: 1.0, is_accessible: true, surfaces: ["S_LEFT"] },
      { face: "right", available_area_mm2: W * H, original_area_mm2: W * H, area_ratio: 1.0, is_accessible: true, surfaces: ["S_RIGHT"] },
      { face: "front", available_area_mm2: L * H, original_area_mm2: L * H, area_ratio: 1.0, is_accessible: true, surfaces: ["S_FRONT"] },
      { face: "back", available_area_mm2: L * H, original_area_mm2: L * H, area_ratio: 1.0, is_accessible: true, surfaces: ["S_BACK"] },
    ];

    // Default datums: bottom = primary, left = secondary, front = tertiary (3-2-1)
    const datumSurfaces: DatumSurface[] = [
      { id: "D_PRIMARY", type: "primary", surface_id: "S_BOT", is_intact: true, flatness_mm: 0, area_mm2: L * W },
      { id: "D_SECONDARY", type: "secondary", surface_id: "S_LEFT", is_intact: true, flatness_mm: 0, area_mm2: W * H },
      { id: "D_TERTIARY", type: "tertiary", surface_id: "S_FRONT", is_intact: true, flatness_mm: 0, area_mm2: L * H },
    ];

    const state: WorkpieceState = {
      stock: { ...bbox },
      current_ipw: { ...bbox },
      operations_applied: [],
      surfaces,
      wall_sections: [],
      clamping_zones: clampingZones,
      datum_surfaces: datumSurfaces,
      volume_stock_mm3: volume,
      volume_remaining_mm3: volume,
      volume_removed_pct: 0,
      min_wall_thickness_mm: Math.min(L, W, H),
      geometry_level: 2,
      setup_number: 1,
      setup_orientation: "top",
    };

    this.history = [this.cloneState(state)];

    return { value: state, confidence: 0.95, source: this.name };
  }

  /**
   * Apply a machining operation to the current workpiece state.
   * Subtracts material, updates surfaces, walls, clamping zones, datums.
   */
  applyOperation(state: WorkpieceState, op: OperationInput): AtomicValue<WorkpieceState> {
    const newState = this.cloneState(state);
    const pos = op.position ?? { x: 0, y: 0, z: newState.current_ipw.max.z };
    const approach = op.approach_direction ?? "top";

    // Calculate volume removed (AABB approximation)
    const opWidth = op.width_mm ?? op.tool_diameter_mm;
    const opLength = op.length_mm ?? op.tool_diameter_mm;
    const opDepth = op.depth_mm;
    let volumeRemoved = 0;

    if (op.type === "hole" || op.type === "drill" || op.type === "bore") {
      // Cylindrical volume
      volumeRemoved = Math.PI * Math.pow(op.tool_diameter_mm / 2, 2) * opDepth;
    } else if (op.type === "face") {
      // Full face area x depth
      const faceArea = (newState.stock.max.x - newState.stock.min.x) * (newState.stock.max.y - newState.stock.min.y);
      volumeRemoved = faceArea * opDepth;
    } else {
      // Rectangular pocket/slot approximation
      volumeRemoved = opWidth * opLength * opDepth;
    }

    // Clamp to reasonable bounds
    volumeRemoved = Math.min(volumeRemoved, newState.volume_remaining_mm3);

    // Update volumes
    newState.volume_remaining_mm3 -= volumeRemoved;
    newState.volume_removed_pct = ((newState.volume_stock_mm3 - newState.volume_remaining_mm3) / newState.volume_stock_mm3) * 100;

    // Create new surfaces from this operation
    const newSurfaceId = `S_OP_${op.id}`;
    const newSurface: Surface = {
      id: newSurfaceId,
      type: op.type === "hole" || op.type === "bore" ? "cylindrical" : "planar",
      normal: this.approachToNormal(approach),
      area_mm2: op.type === "hole" ? Math.PI * op.tool_diameter_mm * opDepth : opWidth * opLength,
      position: pos,
      is_datum: false,
      is_clamping_surface: false,
      created_by_op: op.id,
      face: "internal",
    };

    // Floor surface of pocket/hole
    const floorSurfaceId = `S_FLOOR_${op.id}`;
    const floorSurface: Surface = {
      id: floorSurfaceId,
      type: "planar",
      normal: this.approachToNormal(approach),
      area_mm2: op.type === "hole" ? Math.PI * Math.pow(op.tool_diameter_mm / 2, 2) : opWidth * opLength,
      position: { x: pos.x, y: pos.y, z: pos.z - opDepth },
      is_datum: false,
      is_clamping_surface: false,
      created_by_op: op.id,
      face: "internal",
    };

    newState.surfaces.push(newSurface, floorSurface);

    // Record operation
    const record: OperationRecord = {
      id: op.id,
      type: op.type,
      tool_diameter_mm: op.tool_diameter_mm,
      depth_mm: opDepth,
      width_mm: opWidth,
      length_mm: opLength,
      position: pos,
      volume_removed_mm3: volumeRemoved,
      surfaces_created: [newSurfaceId, floorSurfaceId],
      surfaces_destroyed: [],
      timestamp: newState.operations_applied.length,
    };
    newState.operations_applied.push(record);

    // Update clamping zones — reduce area if operation is on a clamping face
    this.updateClampingZones(newState, op, pos);

    // Update wall sections — detect thin walls created by adjacent operations
    this.updateWallSections(newState, op, pos);

    // Update datum integrity
    this.updateDatumIntegrity(newState, op, pos);

    // Update minimum wall thickness
    if (newState.wall_sections.length > 0) {
      newState.min_wall_thickness_mm = Math.min(...newState.wall_sections.map(w => w.thickness_mm));
    }

    // Save to history
    this.history.push(this.cloneState(newState));

    return { value: newState, confidence: 0.85, source: this.name };
  }

  /**
   * Get workpiece state at any point in the operation sequence.
   * @param afterOp - index of operation (0 = after first op, -1 = initial stock)
   */
  getState(afterOp: number): AtomicValue<WorkpieceState | null> {
    const idx = afterOp + 1; // +1 because history[0] is initial stock
    if (idx < 0 || idx >= this.history.length) {
      return { value: null, confidence: 0, source: this.name };
    }
    return { value: this.cloneState(this.history[idx]), confidence: 0.95, source: this.name };
  }

  /**
   * Get all surfaces in the current state.
   */
  getSurfaces(state: WorkpieceState): AtomicValue<Surface[]> {
    return { value: [...state.surfaces], confidence: 0.9, source: this.name };
  }

  /**
   * Get minimum wall thickness in the current state.
   * Scans all wall sections created by adjacent operations.
   */
  getMinWallThickness(state: WorkpieceState): AtomicValue<{ thickness_mm: number; location: WallSection | null }> {
    if (state.wall_sections.length === 0) {
      return {
        value: { thickness_mm: state.min_wall_thickness_mm, location: null },
        confidence: 0.7,
        source: this.name,
      };
    }
    const thinnest = state.wall_sections.reduce((min, w) => w.thickness_mm < min.thickness_mm ? w : min);
    return {
      value: { thickness_mm: thinnest.thickness_mm, location: thinnest },
      confidence: 0.85,
      source: this.name,
    };
  }

  /**
   * Rollback to a previous state (for alternate sequence testing).
   * Returns state after rolling back to the specified operation index.
   */
  rollback(toOp: number): AtomicValue<WorkpieceState | null> {
    const idx = toOp + 1;
    if (idx < 0 || idx >= this.history.length) {
      return { value: null, confidence: 0, source: this.name };
    }
    // Truncate history to the rollback point
    this.history = this.history.slice(0, idx + 1);
    return { value: this.cloneState(this.history[this.history.length - 1]), confidence: 0.95, source: this.name };
  }

  /**
   * Get clamping zone status for a specific face.
   */
  getClampingZone(state: WorkpieceState, face: ClampingZone["face"]): AtomicValue<ClampingZone | null> {
    const zone = state.clamping_zones.find(z => z.face === face) ?? null;
    return { value: zone, confidence: zone ? 0.9 : 0, source: this.name };
  }

  /**
   * Check if all datum surfaces are still intact.
   */
  checkDatumIntegrity(state: WorkpieceState): AtomicValue<{ all_intact: boolean; compromised: DatumSurface[] }> {
    const compromised = state.datum_surfaces.filter(d => !d.is_intact);
    return {
      value: { all_intact: compromised.length === 0, compromised },
      confidence: 0.9,
      source: this.name,
    };
  }

  /**
   * Initialize from features (Level 2 geometry).
   * Converts feature list to stock + pre-planned operations.
   */
  initializeFromFeatures(stock: StockInput, features: FeatureInput[]): AtomicValue<{ state: WorkpieceState; planned_operations: OperationInput[] }> {
    const initResult = this.initialize(stock);
    const state = initResult.value;

    const operations: OperationInput[] = features.map((f, i) => ({
      id: f.id || `F${i + 1}`,
      type: f.type,
      tool_diameter_mm: f.dimensions.diameter_mm ?? f.dimensions.width_mm ?? 10,
      depth_mm: f.dimensions.depth_mm ?? f.dimensions.height_mm ?? 5,
      width_mm: f.dimensions.width_mm,
      length_mm: f.dimensions.length_mm,
      position: f.position ?? { x: 0, y: 0, z: stock.height_mm },
    }));

    return {
      value: { state, planned_operations: operations },
      confidence: 0.85,
      source: this.name,
    };
  }

  /**
   * Simulate full operation sequence and return final state + per-step snapshots.
   */
  simulateSequence(stock: StockInput, operations: OperationInput[]): AtomicValue<{
    final_state: WorkpieceState;
    snapshots: WorkpieceState[];
    warnings: string[];
  }> {
    const initResult = this.initialize(stock);
    let state = initResult.value;
    const snapshots: WorkpieceState[] = [this.cloneState(state)];
    const warnings: string[] = [];

    for (const op of operations) {
      const result = this.applyOperation(state, op);
      state = result.value;
      snapshots.push(this.cloneState(state));

      // Check for thin wall warning
      if (state.min_wall_thickness_mm < 1.0) {
        warnings.push(`After op ${op.id}: wall thickness ${state.min_wall_thickness_mm.toFixed(2)}mm < 1.0mm — deflection risk`);
      }

      // Check for excessive material removal
      if (state.volume_removed_pct > 90) {
        warnings.push(`After op ${op.id}: ${state.volume_removed_pct.toFixed(1)}% material removed — structural integrity concern`);
      }

      // Check datum integrity
      const datumCheck = this.checkDatumIntegrity(state);
      if (!datumCheck.value.all_intact) {
        for (const d of datumCheck.value.compromised) {
          warnings.push(`After op ${op.id}: datum ${d.type} (${d.surface_id}) compromised — tolerance may be affected`);
        }
      }

      // Check clamping zone degradation
      for (const zone of state.clamping_zones) {
        if (zone.area_ratio < 0.3) {
          warnings.push(`After op ${op.id}: ${zone.face} clamping area reduced to ${(zone.area_ratio * 100).toFixed(0)}% — reclamp may be needed`);
        }
      }
    }

    return {
      value: { final_state: state, snapshots, warnings },
      confidence: 0.85,
      source: this.name,
    };
  }

  // ── Private helpers ──

  private updateClampingZones(state: WorkpieceState, op: OperationInput, pos: { x: number; y: number; z: number }): void {
    const approach = op.approach_direction ?? "top";
    const opArea = (op.width_mm ?? op.tool_diameter_mm) * (op.length_mm ?? op.tool_diameter_mm);

    // If operation is from top, it reduces top clamping area
    const faceMap: Record<string, ClampingZone["face"]> = {
      top: "top", bottom: "bottom", left: "left", right: "right", front: "front", back: "back",
    };
    const affectedFace = faceMap[approach];
    if (affectedFace) {
      const zone = state.clamping_zones.find(z => z.face === affectedFace);
      if (zone) {
        zone.available_area_mm2 = Math.max(0, zone.available_area_mm2 - opArea);
        zone.area_ratio = zone.original_area_mm2 > 0 ? zone.available_area_mm2 / zone.original_area_mm2 : 0;
        if (zone.area_ratio < 0.1) zone.is_accessible = false;
      }
    }
  }

  private updateWallSections(state: WorkpieceState, op: OperationInput, pos: { x: number; y: number; z: number }): void {
    // Check wall thickness between this operation and stock edges
    const stock = state.stock;
    const opW = (op.width_mm ?? op.tool_diameter_mm) / 2;
    const opL = (op.length_mm ?? op.tool_diameter_mm) / 2;

    // Wall to left edge
    const wallLeft = pos.x - opW - stock.min.x;
    if (wallLeft > 0 && wallLeft < 20) { // only track thin walls
      state.wall_sections.push({
        id: `W_${op.id}_LEFT`,
        thickness_mm: wallLeft,
        height_mm: op.depth_mm,
        length_mm: op.length_mm ?? op.tool_diameter_mm,
        position: { x: stock.min.x + wallLeft / 2, y: pos.y, z: pos.z - op.depth_mm / 2 },
        direction: { x: 1, y: 0, z: 0 },
        adjacent_features: [op.id],
        rigidity_score: Math.min(1, wallLeft / (op.depth_mm * 0.3)),
      });
    }

    // Wall to right edge
    const wallRight = stock.max.x - (pos.x + opW);
    if (wallRight > 0 && wallRight < 20) {
      state.wall_sections.push({
        id: `W_${op.id}_RIGHT`,
        thickness_mm: wallRight,
        height_mm: op.depth_mm,
        length_mm: op.length_mm ?? op.tool_diameter_mm,
        position: { x: stock.max.x - wallRight / 2, y: pos.y, z: pos.z - op.depth_mm / 2 },
        direction: { x: -1, y: 0, z: 0 },
        adjacent_features: [op.id],
        rigidity_score: Math.min(1, wallRight / (op.depth_mm * 0.3)),
      });
    }

    // Wall to front edge
    const wallFront = pos.y - opL - stock.min.y;
    if (wallFront > 0 && wallFront < 20) {
      state.wall_sections.push({
        id: `W_${op.id}_FRONT`,
        thickness_mm: wallFront,
        height_mm: op.depth_mm,
        length_mm: op.width_mm ?? op.tool_diameter_mm,
        position: { x: pos.x, y: stock.min.y + wallFront / 2, z: pos.z - op.depth_mm / 2 },
        direction: { x: 0, y: 1, z: 0 },
        adjacent_features: [op.id],
        rigidity_score: Math.min(1, wallFront / (op.depth_mm * 0.3)),
      });
    }

    // Wall to back edge
    const wallBack = stock.max.y - (pos.y + opL);
    if (wallBack > 0 && wallBack < 20) {
      state.wall_sections.push({
        id: `W_${op.id}_BACK`,
        thickness_mm: wallBack,
        height_mm: op.depth_mm,
        length_mm: op.width_mm ?? op.tool_diameter_mm,
        position: { x: pos.x, y: stock.max.y - wallBack / 2, z: pos.z - op.depth_mm / 2 },
        direction: { x: 0, y: -1, z: 0 },
        adjacent_features: [op.id],
        rigidity_score: Math.min(1, wallBack / (op.depth_mm * 0.3)),
      });
    }

    // Check wall between adjacent operations (inter-feature walls)
    for (const prevOp of state.operations_applied) {
      if (prevOp.id === op.id) continue;
      const dx = Math.abs(pos.x - prevOp.position.x);
      const dy = Math.abs(pos.y - prevOp.position.y);
      const prevW = (prevOp.width_mm ?? prevOp.tool_diameter_mm) / 2;

      // X-direction wall between features
      const wallBetweenX = dx - opW - prevW;
      if (wallBetweenX > 0 && wallBetweenX < 15) {
        state.wall_sections.push({
          id: `W_${prevOp.id}_${op.id}_X`,
          thickness_mm: wallBetweenX,
          height_mm: Math.max(prevOp.depth_mm, op.depth_mm),
          length_mm: Math.max(prevOp.length_mm ?? prevOp.tool_diameter_mm, op.length_mm ?? op.tool_diameter_mm),
          position: { x: (pos.x + prevOp.position.x) / 2, y: pos.y, z: pos.z - op.depth_mm / 2 },
          direction: { x: 1, y: 0, z: 0 },
          adjacent_features: [prevOp.id, op.id],
          rigidity_score: Math.min(1, wallBetweenX / (Math.max(prevOp.depth_mm, op.depth_mm) * 0.3)),
        });
      }

      // Y-direction wall between features
      const wallBetweenY = dy - opL - (prevOp.length_mm ?? prevOp.tool_diameter_mm) / 2;
      if (wallBetweenY > 0 && wallBetweenY < 15) {
        state.wall_sections.push({
          id: `W_${prevOp.id}_${op.id}_Y`,
          thickness_mm: wallBetweenY,
          height_mm: Math.max(prevOp.depth_mm, op.depth_mm),
          length_mm: Math.max(prevOp.width_mm ?? prevOp.tool_diameter_mm, op.width_mm ?? op.tool_diameter_mm),
          position: { x: pos.x, y: (pos.y + prevOp.position.y) / 2, z: pos.z - op.depth_mm / 2 },
          direction: { x: 0, y: 1, z: 0 },
          adjacent_features: [prevOp.id, op.id],
          rigidity_score: Math.min(1, wallBetweenY / (Math.max(prevOp.depth_mm, op.depth_mm) * 0.3)),
        });
      }
    }
  }

  private updateDatumIntegrity(state: WorkpieceState, op: OperationInput, pos: { x: number; y: number; z: number }): void {
    const approach = op.approach_direction ?? "top";

    // If operation cuts into a datum surface, mark it compromised
    for (const datum of state.datum_surfaces) {
      const surf = state.surfaces.find(s => s.id === datum.surface_id);
      if (!surf) continue;

      // Check if operation overlaps with datum surface
      if (datum.type === "primary" && approach === "bottom") {
        datum.is_intact = false;
      }
      if (datum.type === "secondary" && approach === "left") {
        datum.is_intact = false;
      }
      if (datum.type === "tertiary" && approach === "front") {
        datum.is_intact = false;
      }
    }
  }

  private approachToNormal(approach: string): { x: number; y: number; z: number } {
    switch (approach) {
      case "top": return { x: 0, y: 0, z: -1 };
      case "bottom": return { x: 0, y: 0, z: 1 };
      case "left": return { x: 1, y: 0, z: 0 };
      case "right": return { x: -1, y: 0, z: 0 };
      case "front": return { x: 0, y: 1, z: 0 };
      case "back": return { x: 0, y: -1, z: 0 };
      default: return { x: 0, y: 0, z: -1 };
    }
  }

  private cloneState(state: WorkpieceState): WorkpieceState {
    return JSON.parse(JSON.stringify(state));
  }
}

export const workpieceStateEngine = new WorkpieceStateEngine();
