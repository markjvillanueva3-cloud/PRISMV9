// WIRE-EXEMPT: U-CAD-APP add-in bridge -- heavy injected NX Open session deps, no singleton; awaits its NX Open add-in host (delta/CAD), not a standalone prism_* dispatcher action.
/**
 * NXOpenAssemblyDrawingEngine — U-CAD-APP-18 (PHASE-48)
 *
 * Full-coverage NX Open Assembly and Drafting bridge with parity to FreeCAD/Inventor/SolidWorks.
 * Provides comprehensive assembly operations and drawing generation.
 *
 * Features:
 *   - Component management (add, remove, replace, suppress)
 *   - Assembly constraints (touch/align, concentric, distance, angle)
 *   - Interference checking and mass properties
 *   - BOM extraction (single/multi-level)
 *   - Drawing sheet and view creation
 *   - Section and detail views
 *   - Dimensions and annotations
 *   - PDF/DWG export
 *
 * NXOpen References:
 *   - NXOpen.Assemblies.ComponentAssembly
 *   - NXOpen.Positioning.ComponentConstraint
 *   - NXOpen.Drawings.DrawingSheet
 *   - NXOpen.Drawings.DraftingView
 *
 * @module engines/NXOpenAssemblyDrawingEngine
 */

import { z } from "zod";
import {
  NXComponentSchema,
  NXAssemblyConstraintSchema,
  NXAssemblyResultSchema,
  NXDrawingResultSchema,
  NXDrawingSchema,
  NXDrawingSheetSchema,
  NXDrawingViewSchema,
  NXDimensionSchema,
  NXAnnotationSchema,
  NXBomSchema,
  NXMassPropertiesSchema,
  NXInterferenceResultSchema,
  NXTransformSchema,
  NXPoint3DSchema,
  NXPoint2DSchema,
  NX_CONSTRAINT_TYPES,
  NX_VIEW_TYPES,
  NX_SECTION_TYPES,
  NX_DIMENSION_TYPES,
  NX_ANNOTATION_TYPES,
  type NXComponent,
  type NXAssemblyConstraint,
  type NXAssemblyResult,
  type NXDrawingResult,
  type NXDrawing,
  type NXDrawingSheet,
  type NXDrawingView,
  type NXDimension,
  type NXAnnotation,
  type NXBom,
  type NXMassProperties,
  type NXInterferenceResult,
  type NXTransform,
  type NXPoint3D,
  type NXPoint2D,
  type NXConstraintType,
  type NXViewType,
  type NXSectionType,
  type NXDimensionType,
  type NXAnnotationType,
} from "../schemas/cadNXAssemblyDrawingSchema.js";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface NXAssemblyDrawingClock {
  now(): string;
}

export interface NXAssemblyTransport {
  addComponent(assemblyTag: string, partFile: string, name: string, transform: NXTransform, refset?: string): NXComponent;
  removeComponent(assemblyTag: string, componentId: string): boolean;
  replaceComponent(assemblyTag: string, componentId: string, newPartFile: string): NXComponent;
  suppressComponent(assemblyTag: string, componentId: string): boolean;
  unsuppressComponent(assemblyTag: string, componentId: string): boolean;

  addConstraint(assemblyTag: string, type: NXConstraintType, geom1: { componentId: string; geometryTag: string }, geom2?: { componentId: string; geometryTag: string }, options?: { offset?: number; angle?: number; orientation?: string }): NXAssemblyConstraint;
  removeConstraint(assemblyTag: string, constraintId: string): boolean;
  editConstraint(assemblyTag: string, constraintId: string, updates: { offset?: number; angle?: number }): boolean;

  positionComponent(assemblyTag: string, componentId: string, transform: NXTransform): boolean;
  repositionComponent(assemblyTag: string, componentId: string, delta: NXPoint3D): boolean;

  getComponents(assemblyTag: string, recursive?: boolean): NXComponent[];
  getConstraints(assemblyTag: string): NXAssemblyConstraint[];
  checkInterference(assemblyTag: string, componentIds?: string[]): NXInterferenceResult[];
  getMassProperties(assemblyTag: string, componentIds?: string[]): NXMassProperties;
  getBom(assemblyTag: string, type: "single_level" | "multi_level" | "indented"): NXBom;

  createPattern(assemblyTag: string, componentIds: string[], patternType: "linear" | "circular", params: Record<string, number>): string[];
  mirrorAssembly(assemblyTag: string, componentIds: string[], mirrorPlane: { origin: NXPoint3D; normal: NXPoint3D }): string[];

  createArrangement(assemblyTag: string, name: string): string;
  activateArrangement(assemblyTag: string, arrangementId: string): boolean;

  explodeView(assemblyTag: string, distance: number): boolean;
  collapseView(assemblyTag: string): boolean;
}

export interface NXDrawingTransport {
  createDrawing(name: string, sourceFile: string): NXDrawing;
  addSheet(drawingId: string, sheet: Partial<NXDrawingSheet>): NXDrawingSheet;
  deleteSheet(drawingId: string, sheetId: string): boolean;

  addBaseView(drawingId: string, sheetId: string, anchor: NXPoint2D, scale: number, orientation?: number[][]): NXDrawingView;
  addProjectedView(drawingId: string, parentViewId: string, direction: "top" | "bottom" | "left" | "right" | "front" | "back", anchor: NXPoint2D): NXDrawingView;
  addSectionView(drawingId: string, parentViewId: string, sectionType: NXSectionType, cuttingPoints: NXPoint3D[], direction: NXPoint3D, anchor: NXPoint2D, label: string): NXDrawingView;
  addDetailView(drawingId: string, parentViewId: string, center: NXPoint2D, radius: number, anchor: NXPoint2D, label: string, scaleFactor: number): NXDrawingView;
  addIsometricView(drawingId: string, sheetId: string, anchor: NXPoint2D, scale: number): NXDrawingView;
  deleteView(drawingId: string, viewId: string): boolean;
  moveView(drawingId: string, viewId: string, newAnchor: NXPoint2D): boolean;
  updateView(drawingId: string, viewId: string): boolean;

  addDimension(drawingId: string, viewId: string, type: NXDimensionType, geometryTags: string[], position: NXPoint2D): NXDimension;
  editDimension(drawingId: string, dimensionId: string, updates: Partial<NXDimension>): boolean;
  deleteDimension(drawingId: string, dimensionId: string): boolean;

  addAnnotation(drawingId: string, viewId: string, type: NXAnnotationType, position: NXPoint2D, options?: { text?: string; leaderPoints?: NXPoint2D[] }): NXAnnotation;
  addCenterline(drawingId: string, viewId: string, geometryTags: string[]): NXAnnotation;
  addCenterMark(drawingId: string, viewId: string, geometryTag: string): NXAnnotation;
  addBalloon(drawingId: string, viewId: string, componentId: string, position: NXPoint2D, leaderPoint: NXPoint2D): NXAnnotation;
  addPartsList(drawingId: string, sheetId: string, bomId: string, anchor: NXPoint2D): string;
  addTitleBlock(drawingId: string, sheetId: string, templateName: string): string;

  getViews(drawingId: string, sheetId?: string): NXDrawingView[];
  getDimensions(drawingId: string, viewId?: string): NXDimension[];
  getDrawing(drawingId: string): NXDrawing;

  exportPdf(drawingId: string, outputPath: string, options?: { resolution?: number; sheets?: number[] }): string;
  exportDwg(drawingId: string, outputPath: string, version?: string): string;
}

function defaultClock(): NXAssemblyDrawingClock {
  return { now: () => new Date().toISOString() };
}

// ── Types ───────────────────────────────────────────────────────────────────

type AssemblyEventType = "component_added" | "component_removed" | "constraint_added" | "constraint_removed" | "position_changed" | "bom_generated";
type DrawingEventType = "drawing_created" | "view_added" | "view_deleted" | "dimension_added" | "annotation_added" | "exported";

interface EngineEvent {
  type: AssemblyEventType | DrawingEventType;
  timestamp: string;
  assemblyTag?: string;
  drawingId?: string;
  details?: Record<string, unknown>;
}

type EventSubscriber = (event: EngineEvent) => void;

// ── Engine Implementation ───────────────────────────────────────────────────

export class NXOpenAssemblyDrawingEngine {
  private assemblyTransport: NXAssemblyTransport;
  private drawingTransport: NXDrawingTransport;
  private clock: NXAssemblyDrawingClock;

  private activeAssemblyTag: string | null = null;
  private activeDrawingId: string | null = null;
  private componentCache = new Map<string, Map<string, NXComponent>>();
  private drawingCache = new Map<string, NXDrawing>();
  private subscribers: EventSubscriber[] = [];
  private eventLog: EngineEvent[] = [];
  private maxEventLog = 1000;

  constructor(opts: {
    assemblyTransport: NXAssemblyTransport;
    drawingTransport: NXDrawingTransport;
    clock?: NXAssemblyDrawingClock;
    maxEventLog?: number;
  }) {
    this.assemblyTransport = opts.assemblyTransport;
    this.drawingTransport = opts.drawingTransport;
    this.clock = opts.clock ?? defaultClock();
    if (opts.maxEventLog !== undefined) this.maxEventLog = opts.maxEventLog;
  }

  // ── Assembly Management ───────────────────────────────────────────────────

  setActiveAssembly(assemblyTag: string): void {
    this.activeAssemblyTag = assemblyTag;
    if (!this.componentCache.has(assemblyTag)) {
      this.componentCache.set(assemblyTag, new Map());
    }
  }

  getActiveAssemblyTag(): string | null {
    return this.activeAssemblyTag;
  }

  addComponent(
    partFile: string,
    name: string,
    transform: NXTransform,
    refset?: string,
    assemblyTag?: string,
  ): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "add_component", error: "No active assembly" };
    }

    const component = this.assemblyTransport.addComponent(tag, partFile, name, transform, refset);
    this.getAssemblyCache(tag).set(component.componentId, component);

    this.emitEvent({
      type: "component_added",
      timestamp: this.clock.now(),
      assemblyTag: tag,
      details: { componentId: component.componentId, partFile, name },
    });

    return {
      success: true,
      command: "add_component",
      componentId: component.componentId,
      components: [component],
    };
  }

  removeComponent(componentId: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "remove_component", error: "No active assembly" };
    }

    const success = this.assemblyTransport.removeComponent(tag, componentId);
    if (success) {
      this.getAssemblyCache(tag).delete(componentId);
      this.emitEvent({
        type: "component_removed",
        timestamp: this.clock.now(),
        assemblyTag: tag,
        details: { componentId },
      });
    }

    return {
      success,
      command: "remove_component",
      componentId,
      error: success ? undefined : "Failed to remove component",
    };
  }

  replaceComponent(componentId: string, newPartFile: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "replace_component", error: "No active assembly" };
    }

    const component = this.assemblyTransport.replaceComponent(tag, componentId, newPartFile);
    this.getAssemblyCache(tag).set(componentId, component);

    return {
      success: true,
      command: "replace_component",
      componentId,
      components: [component],
    };
  }

  suppressComponent(componentId: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "suppress_component", error: "No active assembly" };
    }

    const success = this.assemblyTransport.suppressComponent(tag, componentId);

    return {
      success,
      command: "suppress_component",
      componentId,
      error: success ? undefined : "Failed to suppress component",
    };
  }

  unsuppressComponent(componentId: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "unsuppress_component", error: "No active assembly" };
    }

    const success = this.assemblyTransport.unsuppressComponent(tag, componentId);

    return {
      success,
      command: "unsuppress_component",
      componentId,
      error: success ? undefined : "Failed to unsuppress component",
    };
  }

  // ── Assembly Constraints ──────────────────────────────────────────────────

  addConstraint(
    type: NXConstraintType,
    geom1: { componentId: string; geometryTag: string },
    geom2?: { componentId: string; geometryTag: string },
    options?: { offset?: number; angle?: number; orientation?: string },
    assemblyTag?: string,
  ): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "add_constraint", error: "No active assembly" };
    }

    const constraint = this.assemblyTransport.addConstraint(tag, type, geom1, geom2, options);

    this.emitEvent({
      type: "constraint_added",
      timestamp: this.clock.now(),
      assemblyTag: tag,
      details: { constraintId: constraint.constraintId, constraintType: type },
    });

    return {
      success: true,
      command: "add_constraint",
      constraintId: constraint.constraintId,
      constraints: [constraint],
    };
  }

  removeConstraint(constraintId: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "remove_constraint", error: "No active assembly" };
    }

    const success = this.assemblyTransport.removeConstraint(tag, constraintId);
    if (success) {
      this.emitEvent({
        type: "constraint_removed",
        timestamp: this.clock.now(),
        assemblyTag: tag,
        details: { constraintId },
      });
    }

    return {
      success,
      command: "remove_constraint",
      constraintId,
      error: success ? undefined : "Failed to remove constraint",
    };
  }

  editConstraint(constraintId: string, updates: { offset?: number; angle?: number }, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "edit_constraint", error: "No active assembly" };
    }

    const success = this.assemblyTransport.editConstraint(tag, constraintId, updates);

    return {
      success,
      command: "edit_constraint",
      constraintId,
      error: success ? undefined : "Failed to edit constraint",
    };
  }

  // ── Positioning ───────────────────────────────────────────────────────────

  positionComponent(componentId: string, transform: NXTransform, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "position_component", error: "No active assembly" };
    }

    const success = this.assemblyTransport.positionComponent(tag, componentId, transform);
    if (success) {
      this.emitEvent({
        type: "position_changed",
        timestamp: this.clock.now(),
        assemblyTag: tag,
        details: { componentId, transform },
      });
    }

    return {
      success,
      command: "position_component",
      componentId,
      error: success ? undefined : "Failed to position component",
    };
  }

  repositionComponent(componentId: string, delta: NXPoint3D, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "reposition_component", error: "No active assembly" };
    }

    const success = this.assemblyTransport.repositionComponent(tag, componentId, delta);

    return {
      success,
      command: "reposition_component",
      componentId,
      error: success ? undefined : "Failed to reposition component",
    };
  }

  // ── Query & Analysis ──────────────────────────────────────────────────────

  getComponents(recursive?: boolean, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "get_components", error: "No active assembly" };
    }

    const components = this.assemblyTransport.getComponents(tag, recursive);
    const cache = this.getAssemblyCache(tag);
    for (const c of components) {
      cache.set(c.componentId, c);
    }

    return {
      success: true,
      command: "get_components",
      components,
    };
  }

  getConstraints(assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "get_constraints", error: "No active assembly" };
    }

    const constraints = this.assemblyTransport.getConstraints(tag);

    return {
      success: true,
      command: "get_constraints",
      constraints,
    };
  }

  checkInterference(componentIds?: string[], assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "check_interference", error: "No active assembly" };
    }

    const interferences = this.assemblyTransport.checkInterference(tag, componentIds);

    return {
      success: true,
      command: "check_interference",
      interferences,
    };
  }

  getMassProperties(componentIds?: string[], assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "get_mass_properties", error: "No active assembly" };
    }

    const massProperties = this.assemblyTransport.getMassProperties(tag, componentIds);

    return {
      success: true,
      command: "get_mass_properties",
      massProperties,
    };
  }

  getBom(type: "single_level" | "multi_level" | "indented" = "single_level", assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "get_bom", error: "No active assembly" };
    }

    const bom = this.assemblyTransport.getBom(tag, type);

    this.emitEvent({
      type: "bom_generated",
      timestamp: this.clock.now(),
      assemblyTag: tag,
      details: { bomType: type, totalParts: bom.totalParts },
    });

    return {
      success: true,
      command: "get_bom",
      bom,
    };
  }

  // ── Patterns & Mirror ─────────────────────────────────────────────────────

  createPattern(
    componentIds: string[],
    patternType: "linear" | "circular",
    params: Record<string, number>,
    assemblyTag?: string,
  ): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "create_pattern", error: "No active assembly" };
    }

    const newIds = this.assemblyTransport.createPattern(tag, componentIds, patternType, params);

    return {
      success: true,
      command: "create_pattern",
      components: newIds.map(id => ({ componentId: id } as NXComponent)),
    };
  }

  mirrorAssembly(
    componentIds: string[],
    mirrorPlane: { origin: NXPoint3D; normal: NXPoint3D },
    assemblyTag?: string,
  ): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "mirror_assembly", error: "No active assembly" };
    }

    const newIds = this.assemblyTransport.mirrorAssembly(tag, componentIds, mirrorPlane);

    return {
      success: true,
      command: "mirror_assembly",
      components: newIds.map(id => ({ componentId: id } as NXComponent)),
    };
  }

  // ── Arrangements ──────────────────────────────────────────────────────────

  createArrangement(name: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "create_arrangement", error: "No active assembly" };
    }

    const arrangementId = this.assemblyTransport.createArrangement(tag, name);

    return {
      success: true,
      command: "create_arrangement",
      componentId: arrangementId,
    };
  }

  activateArrangement(arrangementId: string, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "activate_arrangement", error: "No active assembly" };
    }

    const success = this.assemblyTransport.activateArrangement(tag, arrangementId);

    return {
      success,
      command: "activate_arrangement",
      error: success ? undefined : "Failed to activate arrangement",
    };
  }

  // ── Explode/Collapse ──────────────────────────────────────────────────────

  explodeView(distance: number, assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "explode_view", error: "No active assembly" };
    }

    const success = this.assemblyTransport.explodeView(tag, distance);

    return {
      success,
      command: "explode_view",
      error: success ? undefined : "Failed to explode view",
    };
  }

  collapseView(assemblyTag?: string): NXAssemblyResult {
    const tag = assemblyTag ?? this.activeAssemblyTag;
    if (!tag) {
      return { success: false, command: "collapse_view", error: "No active assembly" };
    }

    const success = this.assemblyTransport.collapseView(tag);

    return {
      success,
      command: "collapse_view",
      error: success ? undefined : "Failed to collapse view",
    };
  }

  // ── Drawing Management ────────────────────────────────────────────────────

  createDrawing(name: string, sourceFile: string): NXDrawingResult {
    const drawing = this.drawingTransport.createDrawing(name, sourceFile);
    this.drawingCache.set(drawing.drawingId, drawing);
    this.activeDrawingId = drawing.drawingId;

    this.emitEvent({
      type: "drawing_created",
      timestamp: this.clock.now(),
      drawingId: drawing.drawingId,
      details: { name, sourceFile },
    });

    return {
      success: true,
      command: "create_drawing",
      drawingId: drawing.drawingId,
      drawing,
    };
  }

  setActiveDrawing(drawingId: string): void {
    this.activeDrawingId = drawingId;
  }

  getActiveDrawingId(): string | null {
    return this.activeDrawingId;
  }

  addSheet(sheet: Partial<NXDrawingSheet>, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_sheet", error: "No active drawing" };
    }

    const newSheet = this.drawingTransport.addSheet(id, sheet);

    return {
      success: true,
      command: "add_sheet",
      drawingId: id,
      sheetId: newSheet.sheetId,
    };
  }

  deleteSheet(sheetId: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "delete_sheet", error: "No active drawing" };
    }

    const success = this.drawingTransport.deleteSheet(id, sheetId);

    return {
      success,
      command: "delete_sheet",
      drawingId: id,
      sheetId,
      error: success ? undefined : "Failed to delete sheet",
    };
  }

  // ── View Creation ─────────────────────────────────────────────────────────

  addBaseView(sheetId: string, anchor: NXPoint2D, scale: number, orientation?: number[][], drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_base_view", error: "No active drawing" };
    }

    const view = this.drawingTransport.addBaseView(id, sheetId, anchor, scale, orientation);

    this.emitEvent({
      type: "view_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { viewId: view.viewId, viewType: "base" },
    });

    return {
      success: true,
      command: "add_base_view",
      drawingId: id,
      viewId: view.viewId,
      views: [view],
    };
  }

  addProjectedView(parentViewId: string, direction: "top" | "bottom" | "left" | "right" | "front" | "back", anchor: NXPoint2D, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_projected_view", error: "No active drawing" };
    }

    const view = this.drawingTransport.addProjectedView(id, parentViewId, direction, anchor);

    this.emitEvent({
      type: "view_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { viewId: view.viewId, viewType: "projected", direction },
    });

    return {
      success: true,
      command: "add_projected_view",
      drawingId: id,
      viewId: view.viewId,
      views: [view],
    };
  }

  addSectionView(
    parentViewId: string,
    sectionType: NXSectionType,
    cuttingPoints: NXPoint3D[],
    direction: NXPoint3D,
    anchor: NXPoint2D,
    label: string,
    drawingId?: string,
  ): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_section_view", error: "No active drawing" };
    }

    const view = this.drawingTransport.addSectionView(id, parentViewId, sectionType, cuttingPoints, direction, anchor, label);

    this.emitEvent({
      type: "view_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { viewId: view.viewId, viewType: "section", sectionType, label },
    });

    return {
      success: true,
      command: "add_section_view",
      drawingId: id,
      viewId: view.viewId,
      views: [view],
    };
  }

  addDetailView(
    parentViewId: string,
    center: NXPoint2D,
    radius: number,
    anchor: NXPoint2D,
    label: string,
    scaleFactor: number,
    drawingId?: string,
  ): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_detail_view", error: "No active drawing" };
    }

    const view = this.drawingTransport.addDetailView(id, parentViewId, center, radius, anchor, label, scaleFactor);

    this.emitEvent({
      type: "view_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { viewId: view.viewId, viewType: "detail", label },
    });

    return {
      success: true,
      command: "add_detail_view",
      drawingId: id,
      viewId: view.viewId,
      views: [view],
    };
  }

  addIsometricView(sheetId: string, anchor: NXPoint2D, scale: number, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_isometric_view", error: "No active drawing" };
    }

    const view = this.drawingTransport.addIsometricView(id, sheetId, anchor, scale);

    this.emitEvent({
      type: "view_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { viewId: view.viewId, viewType: "isometric" },
    });

    return {
      success: true,
      command: "add_isometric_view",
      drawingId: id,
      viewId: view.viewId,
      views: [view],
    };
  }

  deleteView(viewId: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "delete_view", error: "No active drawing" };
    }

    const success = this.drawingTransport.deleteView(id, viewId);
    if (success) {
      this.emitEvent({
        type: "view_deleted",
        timestamp: this.clock.now(),
        drawingId: id,
        details: { viewId },
      });
    }

    return {
      success,
      command: "delete_view",
      drawingId: id,
      viewId,
      error: success ? undefined : "Failed to delete view",
    };
  }

  moveView(viewId: string, newAnchor: NXPoint2D, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "move_view", error: "No active drawing" };
    }

    const success = this.drawingTransport.moveView(id, viewId, newAnchor);

    return {
      success,
      command: "move_view",
      drawingId: id,
      viewId,
      error: success ? undefined : "Failed to move view",
    };
  }

  updateView(viewId: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "update_view", error: "No active drawing" };
    }

    const success = this.drawingTransport.updateView(id, viewId);

    return {
      success,
      command: "update_view",
      drawingId: id,
      viewId,
      error: success ? undefined : "Failed to update view",
    };
  }

  // ── Dimensions ────────────────────────────────────────────────────────────

  addDimension(viewId: string, type: NXDimensionType, geometryTags: string[], position: NXPoint2D, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_dimension", error: "No active drawing" };
    }

    const dimension = this.drawingTransport.addDimension(id, viewId, type, geometryTags, position);

    this.emitEvent({
      type: "dimension_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { dimensionId: dimension.dimensionId, dimensionType: type },
    });

    return {
      success: true,
      command: "add_dimension",
      drawingId: id,
      dimensionId: dimension.dimensionId,
      dimensions: [dimension],
    };
  }

  editDimension(dimensionId: string, updates: Partial<NXDimension>, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "edit_dimension", error: "No active drawing" };
    }

    const success = this.drawingTransport.editDimension(id, dimensionId, updates);

    return {
      success,
      command: "edit_dimension",
      drawingId: id,
      dimensionId,
      error: success ? undefined : "Failed to edit dimension",
    };
  }

  deleteDimension(dimensionId: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "delete_dimension", error: "No active drawing" };
    }

    const success = this.drawingTransport.deleteDimension(id, dimensionId);

    return {
      success,
      command: "delete_dimension",
      drawingId: id,
      dimensionId,
      error: success ? undefined : "Failed to delete dimension",
    };
  }

  // ── Annotations ───────────────────────────────────────────────────────────

  addAnnotation(viewId: string, type: NXAnnotationType, position: NXPoint2D, options?: { text?: string; leaderPoints?: NXPoint2D[] }, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_annotation", error: "No active drawing" };
    }

    const annotation = this.drawingTransport.addAnnotation(id, viewId, type, position, options);

    this.emitEvent({
      type: "annotation_added",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { annotationId: annotation.annotationId, annotationType: type },
    });

    return {
      success: true,
      command: "add_annotation",
      drawingId: id,
      annotationId: annotation.annotationId,
    };
  }

  addCenterline(viewId: string, geometryTags: string[], drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_centerline", error: "No active drawing" };
    }

    const annotation = this.drawingTransport.addCenterline(id, viewId, geometryTags);

    return {
      success: true,
      command: "add_centerline",
      drawingId: id,
      annotationId: annotation.annotationId,
    };
  }

  addCenterMark(viewId: string, geometryTag: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_center_mark", error: "No active drawing" };
    }

    const annotation = this.drawingTransport.addCenterMark(id, viewId, geometryTag);

    return {
      success: true,
      command: "add_center_mark",
      drawingId: id,
      annotationId: annotation.annotationId,
    };
  }

  addBalloon(viewId: string, componentId: string, position: NXPoint2D, leaderPoint: NXPoint2D, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_balloon", error: "No active drawing" };
    }

    const annotation = this.drawingTransport.addBalloon(id, viewId, componentId, position, leaderPoint);

    return {
      success: true,
      command: "add_balloon",
      drawingId: id,
      annotationId: annotation.annotationId,
    };
  }

  addPartsList(sheetId: string, bomId: string, anchor: NXPoint2D, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_parts_list", error: "No active drawing" };
    }

    const partsListId = this.drawingTransport.addPartsList(id, sheetId, bomId, anchor);

    return {
      success: true,
      command: "add_parts_list",
      drawingId: id,
      annotationId: partsListId,
    };
  }

  addTitleBlock(sheetId: string, templateName: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "add_title_block", error: "No active drawing" };
    }

    const titleBlockId = this.drawingTransport.addTitleBlock(id, sheetId, templateName);

    return {
      success: true,
      command: "add_title_block",
      drawingId: id,
      annotationId: titleBlockId,
    };
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  getViews(sheetId?: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "get_views", error: "No active drawing" };
    }

    const views = this.drawingTransport.getViews(id, sheetId);

    return {
      success: true,
      command: "get_views",
      drawingId: id,
      views,
    };
  }

  getDimensions(viewId?: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "get_dimensions", error: "No active drawing" };
    }

    const dimensions = this.drawingTransport.getDimensions(id, viewId);

    return {
      success: true,
      command: "get_dimensions",
      drawingId: id,
      dimensions,
    };
  }

  getDrawing(drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "get_views", error: "No active drawing" };
    }

    const drawing = this.drawingTransport.getDrawing(id);
    this.drawingCache.set(id, drawing);

    return {
      success: true,
      command: "get_views",
      drawingId: id,
      drawing,
    };
  }

  // ── Export ────────────────────────────────────────────────────────────────

  exportPdf(outputPath: string, options?: { resolution?: number; sheets?: number[] }, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "export_pdf", error: "No active drawing" };
    }

    const exportPath = this.drawingTransport.exportPdf(id, outputPath, options);

    this.emitEvent({
      type: "exported",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { format: "pdf", path: exportPath },
    });

    return {
      success: true,
      command: "export_pdf",
      drawingId: id,
      exportPath,
    };
  }

  exportDwg(outputPath: string, version?: string, drawingId?: string): NXDrawingResult {
    const id = drawingId ?? this.activeDrawingId;
    if (!id) {
      return { success: false, command: "export_dwg", error: "No active drawing" };
    }

    const exportPath = this.drawingTransport.exportDwg(id, outputPath, version);

    this.emitEvent({
      type: "exported",
      timestamp: this.clock.now(),
      drawingId: id,
      details: { format: "dwg", path: exportPath, version },
    });

    return {
      success: true,
      command: "export_dwg",
      drawingId: id,
      exportPath,
    };
  }

  // ── Event Subscriptions ───────────────────────────────────────────────────

  onEvent(callback: EventSubscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx >= 0) this.subscribers.splice(idx, 1);
    };
  }

  getEventLog(opts?: { assemblyTag?: string; drawingId?: string; limit?: number }): EngineEvent[] {
    let events = [...this.eventLog];
    if (opts?.assemblyTag) events = events.filter(e => e.assemblyTag === opts.assemblyTag);
    if (opts?.drawingId) events = events.filter(e => e.drawingId === opts.drawingId);
    if (opts?.limit) events = events.slice(-opts.limit);
    return events;
  }

  clearEventLog(): number {
    const count = this.eventLog.length;
    this.eventLog = [];
    return count;
  }

  // ── Cache Management ──────────────────────────────────────────────────────

  getCachedComponent(assemblyTag: string, componentId: string): NXComponent | undefined {
    return this.componentCache.get(assemblyTag)?.get(componentId);
  }

  getCachedDrawing(drawingId: string): NXDrawing | undefined {
    return this.drawingCache.get(drawingId);
  }

  clearCache(): { components: number; drawings: number } {
    let components = 0;
    for (const cache of this.componentCache.values()) {
      components += cache.size;
    }
    this.componentCache.clear();
    const drawings = this.drawingCache.size;
    this.drawingCache.clear();
    return { components, drawings };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private getAssemblyCache(assemblyTag: string): Map<string, NXComponent> {
    if (!this.componentCache.has(assemblyTag)) {
      this.componentCache.set(assemblyTag, new Map());
    }
    return this.componentCache.get(assemblyTag)!;
  }

  private emitEvent(event: EngineEvent): void {
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
  NXComponentSchema,
  NXAssemblyConstraintSchema,
  NXAssemblyResultSchema,
  NXDrawingResultSchema,
  NXDrawingSchema,
  NX_CONSTRAINT_TYPES,
  NX_VIEW_TYPES,
  NX_SECTION_TYPES,
  NX_DIMENSION_TYPES,
  NX_ANNOTATION_TYPES,
  type NXComponent,
  type NXAssemblyConstraint,
  type NXAssemblyResult,
  type NXDrawingResult,
  type NXDrawing,
  type NXConstraintType,
  type NXViewType,
  type NXSectionType,
  type NXDimensionType,
  type NXAnnotationType,
};
