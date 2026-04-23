/**
 * NXOpenSketchEntityEngine — U-CAD-APP-17 (PHASE-48)
 *
 * Full-coverage NX Open Sketcher bridge with parity to FreeCAD/Inventor/SolidWorks sketch engines.
 * Provides comprehensive sketch entity creation, constraint management, and solving.
 *
 * Features:
 *   - All NX sketch entity types (line, arc, circle, ellipse, spline, conic, point, text)
 *   - Geometric constraints (coincident, perpendicular, tangent, parallel, etc.)
 *   - Dimensional constraints with expressions
 *   - Sketch operations (trim, extend, offset, mirror, pattern, fillet, chamfer)
 *   - Constraint solving and DOF analysis
 *   - Auto-dimensioning suggestions
 *   - Construction geometry handling
 *
 * NXOpen References:
 *   - NXOpen.Sketch, NXOpen.SketchConstraint
 *   - NXOpen.Features.SketchFeature
 *   - NXOpen.GeometricAnalysis.SketchAnalysis
 *
 * @module engines/NXOpenSketchEntityEngine
 */

import { z } from "zod";
import {
  NXSketchSchema,
  NXSketchResultSchema,
  NXSketchEntitySchema,
  NXGeometricConstraintSchema,
  NXDimensionalConstraintSchema,
  NXSketchAnalysisSchema,
  NXCreateLineInputSchema,
  NXCreateArcInputSchema,
  NXCreateCircleInputSchema,
  NXCreateSplineInputSchema,
  NXTrimInputSchema,
  NXOffsetInputSchema,
  NXMirrorInputSchema,
  NXPatternInputSchema,
  NXFilletInputSchema,
  NXChamferInputSchema,
  NXPlaneSchema,
  NXPoint2DSchema,
  NX_SKETCH_COMMANDS,
  type NXSketch,
  type NXSketchResult,
  type NXSketchEntity,
  type NXGeometricConstraint,
  type NXDimensionalConstraint,
  type NXSketchAnalysis,
  type NXCreateLineInput,
  type NXCreateArcInput,
  type NXCreateCircleInput,
  type NXCreateSplineInput,
  type NXTrimInput,
  type NXOffsetInput,
  type NXMirrorInput,
  type NXPatternInput,
  type NXFilletInput,
  type NXChamferInput,
  type NXPlane,
  type NXPoint2D,
  type NXSketchCommand,
} from "../schemas/cadNXSketchSchema.js";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface NXSketchClock {
  now(): string;
}

export interface NXSketchTransport {
  createSketch(partTag: string, plane: NXPlane, name: string): NXSketch;
  openSketch(sketchId: string): NXSketch;
  closeSketch(sketchId: string): void;
  updateSketch(sketchId: string): NXSketchResult;
  deleteSketch(sketchId: string): boolean;

  createLine(sketchId: string, input: NXCreateLineInput): NXSketchEntity;
  createArc(sketchId: string, input: NXCreateArcInput): NXSketchEntity;
  createCircle(sketchId: string, input: NXCreateCircleInput): NXSketchEntity;
  createEllipse(sketchId: string, center: NXPoint2D, majorRadius: number, minorRadius: number, rotation?: number): NXSketchEntity;
  createSpline(sketchId: string, input: NXCreateSplineInput): NXSketchEntity;
  createConic(sketchId: string, start: NXPoint2D, end: NXPoint2D, shoulder: NXPoint2D, rho: number): NXSketchEntity;
  createPoint(sketchId: string, position: NXPoint2D): NXSketchEntity;
  createText(sketchId: string, position: NXPoint2D, text: string, height: number): NXSketchEntity;
  createCenterline(sketchId: string, start: NXPoint2D, end: NXPoint2D): NXSketchEntity;
  deleteEntity(sketchId: string, entityId: string): boolean;

  addGeometricConstraint(sketchId: string, type: NXGeometricConstraint["constraintType"], entityIds: string[]): NXGeometricConstraint;
  addDimensionalConstraint(sketchId: string, type: NXDimensionalConstraint["constraintType"], entityIds: string[], value: number, expression?: string): NXDimensionalConstraint;
  removeConstraint(sketchId: string, constraintId: string): boolean;
  modifyDimension(sketchId: string, constraintId: string, value: number, expression?: string): boolean;

  trimCurve(sketchId: string, input: NXTrimInput): NXSketchResult;
  extendCurve(sketchId: string, entityId: string, targetPoint: NXPoint2D): NXSketchResult;
  offsetCurve(sketchId: string, input: NXOffsetInput): NXSketchResult;
  mirrorEntities(sketchId: string, input: NXMirrorInput): NXSketchResult;
  patternEntities(sketchId: string, input: NXPatternInput): NXSketchResult;
  filletCurves(sketchId: string, input: NXFilletInput): NXSketchResult;
  chamferCurves(sketchId: string, input: NXChamferInput): NXSketchResult;
  projectCurve(sketchId: string, sourceEntityTag: string): NXSketchResult;
  intersectCurves(sketchId: string, entityId1: string, entityId2: string): NXSketchResult;

  getSketchInfo(sketchId: string): NXSketch;
  getEntities(sketchId: string): NXSketchEntity[];
  getConstraints(sketchId: string): { geometric: NXGeometricConstraint[]; dimensional: NXDimensionalConstraint[] };
  solveSketch(sketchId: string): NXSketchAnalysis;
  analyzeDegreesOfFreedom(sketchId: string): NXSketchAnalysis;
  autoDimension(sketchId: string, entityIds?: string[]): NXDimensionalConstraint[];

  convertToReference(sketchId: string, entityIds: string[]): boolean;
  convertToActive(sketchId: string, entityIds: string[]): boolean;
  reattachSketch(sketchId: string, newPlane: NXPlane): boolean;
}

function defaultClock(): NXSketchClock {
  return { now: () => new Date().toISOString() };
}

// ── Types ───────────────────────────────────────────────────────────────────

type SketchEventType = "entity_created" | "entity_deleted" | "constraint_added" | "constraint_removed" | "dimension_modified" | "sketch_solved" | "status_changed";

interface SketchEvent {
  type: SketchEventType;
  sketchId: string;
  timestamp: string;
  entityId?: string;
  constraintId?: string;
  details?: Record<string, unknown>;
}

type SketchSubscriber = (event: SketchEvent) => void;

// ── Engine Implementation ───────────────────────────────────────────────────

export class NXOpenSketchEntityEngine {
  private transport: NXSketchTransport;
  private clock: NXSketchClock;

  private activeSketchId: string | null = null;
  private sketchCache = new Map<string, NXSketch>();
  private undoStack = new Map<string, SketchEvent[]>();
  private redoStack = new Map<string, SketchEvent[]>();
  private subscribers: SketchSubscriber[] = [];
  private eventLog: SketchEvent[] = [];
  private maxEventLog = 1000;

  constructor(opts: {
    transport: NXSketchTransport;
    clock?: NXSketchClock;
    maxEventLog?: number;
  }) {
    this.transport = opts.transport;
    this.clock = opts.clock ?? defaultClock();
    if (opts.maxEventLog !== undefined) this.maxEventLog = opts.maxEventLog;
  }

  // ── Sketch Lifecycle ──────────────────────────────────────────────────────

  createSketch(partTag: string, plane: NXPlane, name: string): NXSketchResult {
    const sketch = this.transport.createSketch(partTag, plane, name);
    this.sketchCache.set(sketch.sketchId, sketch);
    this.activeSketchId = sketch.sketchId;
    this.undoStack.set(sketch.sketchId, []);
    this.redoStack.set(sketch.sketchId, []);

    this.emitEvent({
      type: "entity_created",
      sketchId: sketch.sketchId,
      timestamp: this.clock.now(),
      details: { name, plane },
    });

    return {
      success: true,
      command: "create_sketch",
      sketchId: sketch.sketchId,
      sketch,
    };
  }

  openSketch(sketchId: string): NXSketchResult {
    const sketch = this.transport.openSketch(sketchId);
    this.sketchCache.set(sketchId, sketch);
    this.activeSketchId = sketchId;
    if (!this.undoStack.has(sketchId)) {
      this.undoStack.set(sketchId, []);
      this.redoStack.set(sketchId, []);
    }

    return {
      success: true,
      command: "open_sketch",
      sketchId,
      sketch,
    };
  }

  closeSketch(sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "close_sketch", error: "No active sketch" };
    }

    this.transport.closeSketch(id);
    if (this.activeSketchId === id) {
      this.activeSketchId = null;
    }

    return { success: true, command: "close_sketch", sketchId: id };
  }

  updateSketch(sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "update_sketch", error: "No active sketch" };
    }

    const result = this.transport.updateSketch(id);
    if (result.success && result.sketch) {
      this.sketchCache.set(id, result.sketch);
    }

    return result;
  }

  deleteSketch(sketchId: string): NXSketchResult {
    const success = this.transport.deleteSketch(sketchId);
    if (success) {
      this.sketchCache.delete(sketchId);
      this.undoStack.delete(sketchId);
      this.redoStack.delete(sketchId);
      if (this.activeSketchId === sketchId) {
        this.activeSketchId = null;
      }
    }

    return {
      success,
      command: "delete_sketch",
      sketchId,
      error: success ? undefined : "Failed to delete sketch",
    };
  }

  getActiveSketchId(): string | null {
    return this.activeSketchId;
  }

  // ── Entity Creation ───────────────────────────────────────────────────────

  createLine(input: NXCreateLineInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_line", error: "No active sketch" };
    }

    const entity = this.transport.createLine(id, input);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_line",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createArc(input: NXCreateArcInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_arc", error: "No active sketch" };
    }

    const entity = this.transport.createArc(id, input);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_arc",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createCircle(input: NXCreateCircleInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_circle", error: "No active sketch" };
    }

    const entity = this.transport.createCircle(id, input);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_circle",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createEllipse(center: NXPoint2D, majorRadius: number, minorRadius: number, rotation?: number, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_ellipse", error: "No active sketch" };
    }

    const entity = this.transport.createEllipse(id, center, majorRadius, minorRadius, rotation);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_ellipse",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createSpline(input: NXCreateSplineInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_spline", error: "No active sketch" };
    }

    const entity = this.transport.createSpline(id, input);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_spline",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createConic(start: NXPoint2D, end: NXPoint2D, shoulder: NXPoint2D, rho: number, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_conic", error: "No active sketch" };
    }

    const entity = this.transport.createConic(id, start, end, shoulder, rho);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_conic",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createPoint(position: NXPoint2D, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_point", error: "No active sketch" };
    }

    const entity = this.transport.createPoint(id, position);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_point",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createText(position: NXPoint2D, text: string, height: number, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_text", error: "No active sketch" };
    }

    const entity = this.transport.createText(id, position, text, height);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_text",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  createCenterline(start: NXPoint2D, end: NXPoint2D, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "create_centerline", error: "No active sketch" };
    }

    const entity = this.transport.createCenterline(id, start, end);
    this.recordEntityCreation(id, entity);

    return {
      success: true,
      command: "create_centerline",
      sketchId: id,
      createdEntityIds: [entity.entityId],
    };
  }

  deleteEntity(entityId: string, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "delete_entity", error: "No active sketch" };
    }

    const success = this.transport.deleteEntity(id, entityId);
    if (success) {
      this.emitEvent({
        type: "entity_deleted",
        sketchId: id,
        timestamp: this.clock.now(),
        entityId,
      });
    }

    return {
      success,
      command: "delete_entity",
      sketchId: id,
      deletedEntityIds: success ? [entityId] : undefined,
      error: success ? undefined : "Failed to delete entity",
    };
  }

  // ── Constraints ───────────────────────────────────────────────────────────

  addGeometricConstraint(
    type: NXGeometricConstraint["constraintType"],
    entityIds: string[],
    sketchId?: string,
  ): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "add_geometric_constraint", error: "No active sketch" };
    }

    const constraint = this.transport.addGeometricConstraint(id, type, entityIds);
    this.emitEvent({
      type: "constraint_added",
      sketchId: id,
      timestamp: this.clock.now(),
      constraintId: constraint.constraintId,
      details: { constraintType: type, entityIds },
    });

    return {
      success: true,
      command: "add_geometric_constraint",
      sketchId: id,
      constraintId: constraint.constraintId,
    };
  }

  addDimensionalConstraint(
    type: NXDimensionalConstraint["constraintType"],
    entityIds: string[],
    value: number,
    expression?: string,
    sketchId?: string,
  ): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "add_dimensional_constraint", error: "No active sketch" };
    }

    const constraint = this.transport.addDimensionalConstraint(id, type, entityIds, value, expression);
    this.emitEvent({
      type: "constraint_added",
      sketchId: id,
      timestamp: this.clock.now(),
      constraintId: constraint.constraintId,
      details: { constraintType: type, entityIds, value, expression },
    });

    return {
      success: true,
      command: "add_dimensional_constraint",
      sketchId: id,
      constraintId: constraint.constraintId,
    };
  }

  removeConstraint(constraintId: string, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "remove_constraint", error: "No active sketch" };
    }

    const success = this.transport.removeConstraint(id, constraintId);
    if (success) {
      this.emitEvent({
        type: "constraint_removed",
        sketchId: id,
        timestamp: this.clock.now(),
        constraintId,
      });
    }

    return {
      success,
      command: "remove_constraint",
      sketchId: id,
      error: success ? undefined : "Failed to remove constraint",
    };
  }

  modifyDimension(constraintId: string, value: number, expression?: string, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "modify_dimension", error: "No active sketch" };
    }

    const success = this.transport.modifyDimension(id, constraintId, value, expression);
    if (success) {
      this.emitEvent({
        type: "dimension_modified",
        sketchId: id,
        timestamp: this.clock.now(),
        constraintId,
        details: { value, expression },
      });
    }

    return {
      success,
      command: "modify_dimension",
      sketchId: id,
      error: success ? undefined : "Failed to modify dimension",
    };
  }

  // ── Sketch Operations ─────────────────────────────────────────────────────

  trimCurve(input: NXTrimInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "trim_curve", error: "No active sketch" };
    }

    return this.transport.trimCurve(id, input);
  }

  extendCurve(entityId: string, targetPoint: NXPoint2D, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "extend_curve", error: "No active sketch" };
    }

    return this.transport.extendCurve(id, entityId, targetPoint);
  }

  offsetCurve(input: NXOffsetInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "offset_curve", error: "No active sketch" };
    }

    return this.transport.offsetCurve(id, input);
  }

  mirrorEntities(input: NXMirrorInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "mirror_entities", error: "No active sketch" };
    }

    const result = this.transport.mirrorEntities(id, input);
    if (result.success && result.createdEntityIds) {
      for (const entityId of result.createdEntityIds) {
        this.emitEvent({
          type: "entity_created",
          sketchId: id,
          timestamp: this.clock.now(),
          entityId,
          details: { source: "mirror", sourceIds: input.entityIds },
        });
      }
    }

    return result;
  }

  patternEntities(input: NXPatternInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "pattern_entities", error: "No active sketch" };
    }

    const result = this.transport.patternEntities(id, input);
    if (result.success && result.createdEntityIds) {
      for (const entityId of result.createdEntityIds) {
        this.emitEvent({
          type: "entity_created",
          sketchId: id,
          timestamp: this.clock.now(),
          entityId,
          details: { source: "pattern", sourceIds: input.entityIds },
        });
      }
    }

    return result;
  }

  filletCurves(input: NXFilletInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "fillet_curves", error: "No active sketch" };
    }

    return this.transport.filletCurves(id, input);
  }

  chamferCurves(input: NXChamferInput, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "chamfer_curves", error: "No active sketch" };
    }

    return this.transport.chamferCurves(id, input);
  }

  projectCurve(sourceEntityTag: string, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "project_curve", error: "No active sketch" };
    }

    return this.transport.projectCurve(id, sourceEntityTag);
  }

  intersectCurves(entityId1: string, entityId2: string, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "intersect_curves", error: "No active sketch" };
    }

    return this.transport.intersectCurves(id, entityId1, entityId2);
  }

  // ── Query & Analysis ──────────────────────────────────────────────────────

  getSketchInfo(sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "get_sketch_info", error: "No active sketch" };
    }

    const sketch = this.transport.getSketchInfo(id);
    this.sketchCache.set(id, sketch);

    return {
      success: true,
      command: "get_sketch_info",
      sketchId: id,
      sketch,
    };
  }

  getEntities(sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "get_entities", error: "No active sketch" };
    }

    const entities = this.transport.getEntities(id);

    return {
      success: true,
      command: "get_entities",
      sketchId: id,
      createdEntityIds: entities.map(e => e.entityId),
    };
  }

  getConstraints(sketchId?: string): NXSketchResult & { geometric?: NXGeometricConstraint[]; dimensional?: NXDimensionalConstraint[] } {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "get_constraints", error: "No active sketch" };
    }

    const constraints = this.transport.getConstraints(id);

    return {
      success: true,
      command: "get_constraints",
      sketchId: id,
      geometric: constraints.geometric,
      dimensional: constraints.dimensional,
    };
  }

  solveSketch(sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "solve_sketch", error: "No active sketch" };
    }

    const analysis = this.transport.solveSketch(id);
    this.emitEvent({
      type: "sketch_solved",
      sketchId: id,
      timestamp: this.clock.now(),
      details: { status: analysis.status, dof: analysis.totalDOF },
    });

    return {
      success: true,
      command: "solve_sketch",
      sketchId: id,
      analysis,
    };
  }

  analyzeDegreesOfFreedom(sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "analyze_degrees_of_freedom", error: "No active sketch" };
    }

    const analysis = this.transport.analyzeDegreesOfFreedom(id);

    return {
      success: true,
      command: "analyze_degrees_of_freedom",
      sketchId: id,
      analysis,
    };
  }

  autoDimension(entityIds?: string[], sketchId?: string): NXSketchResult & { dimensions?: NXDimensionalConstraint[] } {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "auto_dimension", error: "No active sketch" };
    }

    const dimensions = this.transport.autoDimension(id, entityIds);
    for (const dim of dimensions) {
      this.emitEvent({
        type: "constraint_added",
        sketchId: id,
        timestamp: this.clock.now(),
        constraintId: dim.constraintId,
        details: { source: "auto_dimension" },
      });
    }

    return {
      success: true,
      command: "auto_dimension",
      sketchId: id,
      dimensions,
    };
  }

  // ── Reference Geometry ────────────────────────────────────────────────────

  convertToReference(entityIds: string[], sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "convert_to_reference", error: "No active sketch" };
    }

    const success = this.transport.convertToReference(id, entityIds);

    return {
      success,
      command: "convert_to_reference",
      sketchId: id,
      modifiedEntityIds: success ? entityIds : undefined,
      error: success ? undefined : "Failed to convert to reference",
    };
  }

  convertToActive(entityIds: string[], sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "convert_to_active", error: "No active sketch" };
    }

    const success = this.transport.convertToActive(id, entityIds);

    return {
      success,
      command: "convert_to_active",
      sketchId: id,
      modifiedEntityIds: success ? entityIds : undefined,
      error: success ? undefined : "Failed to convert to active",
    };
  }

  reattachSketch(newPlane: NXPlane, sketchId?: string): NXSketchResult {
    const id = sketchId ?? this.activeSketchId;
    if (!id) {
      return { success: false, command: "reattach_sketch", error: "No active sketch" };
    }

    const success = this.transport.reattachSketch(id, newPlane);

    return {
      success,
      command: "reattach_sketch",
      sketchId: id,
      error: success ? undefined : "Failed to reattach sketch",
    };
  }

  // ── Event Subscriptions ───────────────────────────────────────────────────

  onSketchEvent(callback: SketchSubscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx >= 0) this.subscribers.splice(idx, 1);
    };
  }

  getEventLog(opts?: { sketchId?: string; type?: SketchEventType; limit?: number }): SketchEvent[] {
    let events = [...this.eventLog];
    if (opts?.sketchId) events = events.filter(e => e.sketchId === opts.sketchId);
    if (opts?.type) events = events.filter(e => e.type === opts.type);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  clearEventLog(): number {
    const count = this.eventLog.length;
    this.eventLog = [];
    return count;
  }

  // ── Cache Management ──────────────────────────────────────────────────────

  getCachedSketch(sketchId: string): NXSketch | undefined {
    return this.sketchCache.get(sketchId);
  }

  clearCache(): number {
    const count = this.sketchCache.size;
    this.sketchCache.clear();
    return count;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private recordEntityCreation(sketchId: string, entity: NXSketchEntity): void {
    this.emitEvent({
      type: "entity_created",
      sketchId,
      timestamp: this.clock.now(),
      entityId: entity.entityId,
      details: { entityType: entity.entityType },
    });
  }

  private emitEvent(event: SketchEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog = this.eventLog.slice(-this.maxEventLog);
    }

    for (const sub of this.subscribers) {
      try { sub(event); } catch { /* ignore */ }
    }
  }
}

// ── Re-exports ──────────────────────────────────────────────────────────────

export {
  NXSketchSchema,
  NXSketchResultSchema,
  NXSketchEntitySchema,
  NXGeometricConstraintSchema,
  NXDimensionalConstraintSchema,
  NXSketchAnalysisSchema,
  NX_SKETCH_COMMANDS,
  type NXSketch,
  type NXSketchResult,
  type NXSketchEntity,
  type NXGeometricConstraint,
  type NXDimensionalConstraint,
  type NXSketchAnalysis,
  type NXSketchCommand,
};
