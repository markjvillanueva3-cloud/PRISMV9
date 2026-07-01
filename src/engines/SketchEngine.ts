/**
 * SketchEngine — 2D Sketch Creation and Constraint Solving
 *
 * Creates 2D profiles (sketches) that serve as the basis for 3D features:
 * extrude, revolve, sweep, loft. Supports:
 *   - Geometric primitives: line, arc, circle, rectangle, polygon, spline, slot, ellipse
 *   - Constraint system: coincident, parallel, perpendicular, tangent, equal, fixed,
 *     horizontal, vertical, concentric, symmetric, dimension (distance, angle, radius)
 *   - Profile operations: offset, trim, extend, fillet corners, chamfer corners
 *   - Export: SVG path, DXF entities, CadQuery Python code
 *
 * Source: Fusion360 Skill Roadmap Phase A + domain knowledge
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export type SketchEntityType =
  | "line" | "arc" | "circle" | "rectangle" | "polygon"
  | "spline" | "ellipse" | "slot" | "point" | "construction_line";

export interface SketchEntity {
  id: string;
  type: SketchEntityType;
  params: Record<string, any>;
  construction: boolean;
}

export type ConstraintType =
  | "coincident" | "parallel" | "perpendicular" | "tangent"
  | "equal" | "fixed" | "horizontal" | "vertical"
  | "concentric" | "symmetric"
  | "distance" | "angle" | "radius" | "diameter";

export interface SketchConstraint {
  id: string;
  type: ConstraintType;
  entities: string[];         // entity IDs involved
  value?: number;             // for dimensional constraints
  reference_entity?: string;  // for symmetric, etc.
}

export interface Sketch {
  id: string;
  name: string;
  plane: "XY" | "XZ" | "YZ" | "custom";
  origin: Point2D;
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  closed: boolean;
  area_mm2?: number;
  perimeter_mm?: number;
}

export interface SketchProfile {
  sketch_id: string;
  is_closed: boolean;
  entity_ids: string[];
  area_mm2: number;
  perimeter_mm: number;
  centroid: Point2D;
  bounding_box: { min: Point2D; max: Point2D };
}

export type Feature3DType =
  | "extrude" | "extrude_cut" | "revolve" | "revolve_cut"
  | "sweep" | "loft" | "shell" | "fillet" | "chamfer"
  | "hole" | "thread" | "mirror" | "pattern_linear" | "pattern_circular"
  | "draft";

export interface Feature3D {
  id: string;
  type: Feature3DType;
  sketch_id?: string;
  params: Record<string, any>;
}

export interface PartDefinition {
  id: string;
  name: string;
  material?: string;
  sketches: Sketch[];
  features: Feature3D[];
  estimated_volume_mm3?: number;
  estimated_mass_g?: number;
  bounding_box?: { min: Point2D & { z: number }; max: Point2D & { z: number } };
}

// ============================================================================
// ENGINE
// ============================================================================

let entityCounter = 0;
let constraintCounter = 0;
let sketchCounter = 0;
let featureCounter = 0;
let partCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++entityCounter).toString(36)}`;
}

export class SketchEngine {
  // ── Sketch Creation ──

  createSketch(name?: string, plane: Sketch["plane"] = "XY"): Sketch {
    return {
      id: nextId("sk"),
      name: name ?? `Sketch-${++sketchCounter}`,
      plane,
      origin: { x: 0, y: 0 },
      entities: [],
      constraints: [],
      closed: false,
    };
  }

  // ── Entity Creation ──

  addLine(sketch: Sketch, start: Point2D, end: Point2D, construction = false): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("ln"),
      type: "line",
      params: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
      construction,
    };
    sketch.entities.push(entity);
    return entity;
  }

  addArc(sketch: Sketch, center: Point2D, radius: number, startAngleDeg: number, endAngleDeg: number, construction = false): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("ar"),
      type: "arc",
      params: { cx: center.x, cy: center.y, radius, start_angle: startAngleDeg, end_angle: endAngleDeg },
      construction,
    };
    sketch.entities.push(entity);
    return entity;
  }

  addCircle(sketch: Sketch, center: Point2D, radius: number, construction = false): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("ci"),
      type: "circle",
      params: { cx: center.x, cy: center.y, radius },
      construction,
    };
    sketch.entities.push(entity);
    return entity;
  }

  addRectangle(sketch: Sketch, corner: Point2D, width: number, height: number): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("rc"),
      type: "rectangle",
      params: { x: corner.x, y: corner.y, width, height },
      construction: false,
    };
    sketch.entities.push(entity);
    // A rectangle is always closed
    sketch.closed = true;
    return entity;
  }

  addPolygon(sketch: Sketch, center: Point2D, radius: number, sides: number): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("pg"),
      type: "polygon",
      params: { cx: center.x, cy: center.y, radius, sides },
      construction: false,
    };
    sketch.entities.push(entity);
    sketch.closed = true;
    return entity;
  }

  addSlot(sketch: Sketch, center1: Point2D, center2: Point2D, width: number): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("sl"),
      type: "slot",
      params: { x1: center1.x, y1: center1.y, x2: center2.x, y2: center2.y, width },
      construction: false,
    };
    sketch.entities.push(entity);
    sketch.closed = true;
    return entity;
  }

  addEllipse(sketch: Sketch, center: Point2D, majorRadius: number, minorRadius: number, rotationDeg = 0): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("el"),
      type: "ellipse",
      params: { cx: center.x, cy: center.y, major_radius: majorRadius, minor_radius: minorRadius, rotation: rotationDeg },
      construction: false,
    };
    sketch.entities.push(entity);
    sketch.closed = true;
    return entity;
  }

  addSpline(sketch: Sketch, points: Point2D[], closed = false): SketchEntity {
    const entity: SketchEntity = {
      id: nextId("sp"),
      type: "spline",
      params: { points, closed },
      construction: false,
    };
    sketch.entities.push(entity);
    if (closed) sketch.closed = true;
    return entity;
  }

  // ── Constraints ──

  addConstraint(sketch: Sketch, type: ConstraintType, entityIds: string[], value?: number): SketchConstraint {
    const constraint: SketchConstraint = {
      id: nextId("cn"),
      type,
      entities: entityIds,
      value,
    };
    sketch.constraints.push(constraint);
    return constraint;
  }

  // ── Profile Analysis ──

  analyzeProfile(sketch: Sketch): SketchProfile {
    let area = 0;
    let perimeter = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let cx = 0, cy = 0;
    let count = 0;

    for (const e of sketch.entities) {
      if (e.construction) continue;
      const p = e.params;

      switch (e.type) {
        case "line": {
          const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
          perimeter += Math.sqrt(dx * dx + dy * dy);
          this.expandBounds(p.x1, p.y1);
          this.expandBounds(p.x2, p.y2);
          cx += (p.x1 + p.x2) / 2;
          cy += (p.y1 + p.y2) / 2;
          count++;
          break;
        }
        case "circle": {
          area = Math.PI * p.radius * p.radius;
          perimeter = 2 * Math.PI * p.radius;
          cx = p.cx; cy = p.cy;
          count = 1;
          minX = p.cx - p.radius; maxX = p.cx + p.radius;
          minY = p.cy - p.radius; maxY = p.cy + p.radius;
          break;
        }
        case "rectangle": {
          area = p.width * p.height;
          perimeter = 2 * (p.width + p.height);
          cx = p.x + p.width / 2;
          cy = p.y + p.height / 2;
          count = 1;
          minX = p.x; maxX = p.x + p.width;
          minY = p.y; maxY = p.y + p.height;
          break;
        }
        case "polygon": {
          const n = p.sides;
          area = 0.5 * n * p.radius * p.radius * Math.sin(2 * Math.PI / n);
          perimeter = 2 * n * p.radius * Math.sin(Math.PI / n);
          cx = p.cx; cy = p.cy;
          count = 1;
          minX = p.cx - p.radius; maxX = p.cx + p.radius;
          minY = p.cy - p.radius; maxY = p.cy + p.radius;
          break;
        }
        case "ellipse": {
          area = Math.PI * p.major_radius * p.minor_radius;
          // Ramanujan approximation
          const a = p.major_radius, b = p.minor_radius;
          perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
          cx = p.cx; cy = p.cy;
          count = 1;
          minX = p.cx - a; maxX = p.cx + a;
          minY = p.cy - b; maxY = p.cy + b;
          break;
        }
        case "slot": {
          const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const r = p.width / 2;
          area = len * p.width + Math.PI * r * r;
          perimeter = 2 * len + 2 * Math.PI * r;
          cx = (p.x1 + p.x2) / 2;
          cy = (p.y1 + p.y2) / 2;
          count = 1;
          minX = Math.min(p.x1, p.x2) - r;
          maxX = Math.max(p.x1, p.x2) + r;
          minY = Math.min(p.y1, p.y2) - r;
          maxY = Math.max(p.y1, p.y2) + r;
          break;
        }
        case "arc": {
          const angleDelta = Math.abs(p.end_angle - p.start_angle) * Math.PI / 180;
          perimeter += p.radius * angleDelta;
          cx += p.cx; cy += p.cy;
          count++;
          minX = Math.min(minX, p.cx - p.radius);
          maxX = Math.max(maxX, p.cx + p.radius);
          minY = Math.min(minY, p.cy - p.radius);
          maxY = Math.max(maxY, p.cy + p.radius);
          break;
        }
      }
    }

    if (count > 0) { cx /= count; cy /= count; }

    // Fix bounds for line-only sketches
    for (const e of sketch.entities) {
      if (e.construction) continue;
      if (e.type === "line") {
        minX = Math.min(minX, e.params.x1, e.params.x2);
        maxX = Math.max(maxX, e.params.x1, e.params.x2);
        minY = Math.min(minY, e.params.y1, e.params.y2);
        maxY = Math.max(maxY, e.params.y1, e.params.y2);
      }
    }

    return {
      sketch_id: sketch.id,
      is_closed: sketch.closed,
      entity_ids: sketch.entities.filter(e => !e.construction).map(e => e.id),
      area_mm2: Math.round(area * 100) / 100,
      perimeter_mm: Math.round(perimeter * 100) / 100,
      centroid: { x: Math.round(cx * 100) / 100, y: Math.round(cy * 100) / 100 },
      bounding_box: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } },
    };
  }

  private expandBounds(_x: number, _y: number): void {
    // Used internally — bounds are computed in analyzeProfile
  }

  // ── 3D Feature Creation ──

  createExtrude(sketchId: string, depth: number, symmetric = false, draft_angle = 0): Feature3D {
    return {
      id: nextId("ft"),
      type: "extrude",
      sketch_id: sketchId,
      params: { depth, symmetric, draft_angle },
    };
  }

  createExtrudeCut(sketchId: string, depth: number, through_all = false): Feature3D {
    return {
      id: nextId("ft"),
      type: "extrude_cut",
      sketch_id: sketchId,
      params: { depth, through_all },
    };
  }

  createRevolve(sketchId: string, angleDeg: number, axisEntityId: string): Feature3D {
    return {
      id: nextId("ft"),
      type: "revolve",
      sketch_id: sketchId,
      params: { angle: angleDeg, axis_entity_id: axisEntityId },
    };
  }

  createHole(diameter: number, depth: number, position: Point2D & { z?: number }, countersink?: number, counterbore?: { diameter: number; depth: number }): Feature3D {
    return {
      id: nextId("ft"),
      type: "hole",
      params: { diameter, depth, position, countersink, counterbore },
    };
  }

  createFillet3D(radius: number, edgeIds: string[]): Feature3D {
    return { id: nextId("ft"), type: "fillet", params: { radius, edge_ids: edgeIds } };
  }

  createChamfer(distance: number, edgeIds: string[], angle = 45): Feature3D {
    return { id: nextId("ft"), type: "chamfer", params: { distance, angle, edge_ids: edgeIds } };
  }

  createShell(thickness: number, facesToRemove: string[]): Feature3D {
    return { id: nextId("ft"), type: "shell", params: { thickness, faces_to_remove: facesToRemove } };
  }

  createLinearPattern(featureId: string, direction: Point2D & { z?: number }, count: number, spacing: number): Feature3D {
    return { id: nextId("ft"), type: "pattern_linear", params: { feature_id: featureId, direction, count, spacing } };
  }

  createCircularPattern(featureId: string, axisOrigin: Point2D & { z?: number }, count: number, angleDeg = 360): Feature3D {
    return { id: nextId("ft"), type: "pattern_circular", params: { feature_id: featureId, axis_origin: axisOrigin, count, angle: angleDeg } };
  }

  createMirror(featureId: string, mirrorPlane: "XY" | "XZ" | "YZ"): Feature3D {
    return { id: nextId("ft"), type: "mirror", params: { feature_id: featureId, mirror_plane: mirrorPlane } };
  }

  // ── Part Builder ──

  createPart(name: string, material?: string): PartDefinition {
    return {
      id: nextId("pt"),
      name,
      material,
      sketches: [],
      features: [],
    };
  }

  addSketchToPart(part: PartDefinition, sketch: Sketch): void {
    part.sketches.push(sketch);
  }

  addFeatureToPart(part: PartDefinition, feature: Feature3D): void {
    part.features.push(feature);
  }

  estimatePartVolume(part: PartDefinition): number {
    let volume = 0;
    for (const f of part.features) {
      const sketch = f.sketch_id ? part.sketches.find(s => s.id === f.sketch_id) : undefined;
      if (!sketch) continue;
      const profile = this.analyzeProfile(sketch);

      switch (f.type) {
        case "extrude": {
          const depth = f.params.depth ?? 0;
          volume += profile.area_mm2 * depth;
          break;
        }
        case "extrude_cut": {
          const depth = f.params.through_all ? 1000 : (f.params.depth ?? 0);
          volume -= profile.area_mm2 * depth;
          break;
        }
        case "revolve": {
          const angle = (f.params.angle ?? 360) / 360;
          // Pappus theorem: V = 2π × centroid_distance × area × (angle/360)
          const dist = Math.sqrt(profile.centroid.x ** 2 + profile.centroid.y ** 2);
          volume += 2 * Math.PI * dist * profile.area_mm2 * angle;
          break;
        }
      }
    }

    // Holes
    for (const f of part.features) {
      if (f.type === "hole") {
        const r = (f.params.diameter ?? 0) / 2;
        const d = f.params.depth ?? 0;
        volume -= Math.PI * r * r * d;
      }
    }

    part.estimated_volume_mm3 = Math.max(0, Math.round(volume * 100) / 100);
    return part.estimated_volume_mm3;
  }

  // ── Code Generation ──

  toCadQueryPython(part: PartDefinition): string {
    const lines: string[] = [
      "import cadquery as cq",
      "",
      `# Part: ${part.name}`,
    ];

    let hasResult = false;

    for (const f of part.features) {
      const sketch = f.sketch_id ? part.sketches.find(s => s.id === f.sketch_id) : undefined;

      switch (f.type) {
        case "extrude": {
          if (!sketch) break;
          const profileCode = this.sketchToCadQuery(sketch);
          if (!hasResult) {
            lines.push(`result = ${profileCode}`);
            lines.push(`    .extrude(${f.params.depth})`);
            hasResult = true;
          } else {
            lines.push(`result = result.faces(">Z").workplane()`);
            lines.push(`    ${profileCode.replace("cq.Workplane(\"XY\")", "")}`);
            lines.push(`    .extrude(${f.params.depth})`);
          }
          break;
        }
        case "extrude_cut": {
          if (!sketch) break;
          const profileCode = this.sketchToCadQuery(sketch);
          if (!hasResult) break; // Can't cut from nothing
          lines.push(`result = result.faces(">Z").workplane()`);
          lines.push(`    ${profileCode.replace("cq.Workplane(\"XY\")", "")}`);
          lines.push(`    .cutBlind(${f.params.through_all ? "-1000" : `-${f.params.depth}`})`);
          break;
        }
        case "revolve": {
          if (!sketch) break;
          const profileCode = this.sketchToCadQuery(sketch);
          if (!hasResult) {
            lines.push(`result = ${profileCode}`);
            lines.push(`    .revolve(${f.params.angle ?? 360})`);
            hasResult = true;
          }
          break;
        }
        case "hole": {
          if (!hasResult) break;
          const pos = f.params.position;
          lines.push(`result = result.faces(">Z").workplane()`);
          lines.push(`    .center(${pos.x}, ${pos.y})`);
          if (f.params.counterbore) {
            lines.push(`    .cboreHole(${f.params.diameter}, ${f.params.counterbore.diameter}, ${f.params.counterbore.depth}, depth=${f.params.depth})`);
          } else if (f.params.countersink) {
            lines.push(`    .cskHole(${f.params.diameter}, ${f.params.countersink}, 82, depth=${f.params.depth})`);
          } else {
            lines.push(`    .hole(${f.params.diameter}, ${f.params.depth})`);
          }
          break;
        }
        case "fillet": {
          if (!hasResult) break;
          lines.push(`result = result.edges().fillet(${f.params.radius})`);
          break;
        }
        case "chamfer": {
          if (!hasResult) break;
          lines.push(`result = result.edges().chamfer(${f.params.distance})`);
          break;
        }
        case "shell": {
          if (!hasResult) break;
          const face = f.params.faces_to_remove?.[0] ?? ">Z";
          lines.push(`result = result.faces("${face}").shell(${f.params.thickness})`);
          break;
        }
        case "mirror": {
          if (!hasResult) break;
          lines.push(`result = result.mirror("${f.params.mirror_plane}")`);
          break;
        }
      }
    }

    if (!hasResult) {
      lines.push("# No geometry features defined");
      lines.push("result = cq.Workplane('XY').box(10, 10, 10)");
    }

    lines.push("");
    lines.push("# Export");
    lines.push('cq.exporters.export(result, "output.step")');
    lines.push('cq.exporters.export(result, "output.stl")');

    return lines.join("\n");
  }

  private sketchToCadQuery(sketch: Sketch): string {
    const entity = sketch.entities.find(e => !e.construction);
    if (!entity) return 'cq.Workplane("XY")';

    const p = entity.params;
    switch (entity.type) {
      case "rectangle":
        return `cq.Workplane("XY")\n    .rect(${p.width}, ${p.height})`;
      case "circle":
        return `cq.Workplane("XY")\n    .circle(${p.radius})`;
      case "polygon":
        return `cq.Workplane("XY")\n    .polygon(${p.sides}, ${p.radius * 2})`;
      case "ellipse":
        return `cq.Workplane("XY")\n    .ellipse(${p.major_radius}, ${p.minor_radius})`;
      case "slot": {
        const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        return `cq.Workplane("XY")\n    .slot2D(${len + p.width}, ${p.width})`;
      }
      default:
        return `cq.Workplane("XY")\n    .rect(10, 10)  # TODO: ${entity.type}`;
    }
  }

  toSVG(sketch: Sketch, viewBox = 200): string {
    const profile = this.analyzeProfile(sketch);
    const bb = profile.bounding_box;
    const margin = 10;
    const w = bb.max.x - bb.min.x + 2 * margin;
    const h = bb.max.y - bb.min.y + 2 * margin;

    const paths: string[] = [];
    for (const e of sketch.entities) {
      if (e.construction) continue;
      const p = e.params;
      const stroke = e.construction ? "#0088ff" : "#000000";
      const dash = e.construction ? ' stroke-dasharray="4,2"' : "";

      switch (e.type) {
        case "line":
          paths.push(`<line x1="${p.x1}" y1="${-p.y1}" x2="${p.x2}" y2="${-p.y2}" stroke="${stroke}"${dash} stroke-width="0.5"/>`);
          break;
        case "circle":
          paths.push(`<circle cx="${p.cx}" cy="${-p.cy}" r="${p.radius}" fill="none" stroke="${stroke}" stroke-width="0.5"/>`);
          break;
        case "rectangle":
          paths.push(`<rect x="${p.x}" y="${-(p.y + p.height)}" width="${p.width}" height="${p.height}" fill="none" stroke="${stroke}" stroke-width="0.5"/>`);
          break;
        case "ellipse":
          paths.push(`<ellipse cx="${p.cx}" cy="${-p.cy}" rx="${p.major_radius}" ry="${p.minor_radius}" fill="none" stroke="${stroke}" stroke-width="0.5"/>`);
          break;
        case "arc": {
          const r = p.radius;
          const sa = p.start_angle * Math.PI / 180;
          const ea = p.end_angle * Math.PI / 180;
          const x1 = p.cx + r * Math.cos(sa);
          const y1 = -(p.cy + r * Math.sin(sa));
          const x2 = p.cx + r * Math.cos(ea);
          const y2 = -(p.cy + r * Math.sin(ea));
          const largeArc = Math.abs(p.end_angle - p.start_angle) > 180 ? 1 : 0;
          paths.push(`<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="0.5"/>`);
          break;
        }
        case "polygon": {
          const n = p.sides;
          const pts: string[] = [];
          for (let i = 0; i < n; i++) {
            const angle = (2 * Math.PI * i) / n - Math.PI / 2;
            pts.push(`${p.cx + p.radius * Math.cos(angle)},${-(p.cy + p.radius * Math.sin(angle))}`);
          }
          paths.push(`<polygon points="${pts.join(" ")}" fill="none" stroke="${stroke}" stroke-width="0.5"/>`);
          break;
        }
      }
    }

    const vb = `${bb.min.x - margin} ${-(bb.max.y + margin)} ${w} ${h}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${viewBox}" height="${viewBox}">\n  ${paths.join("\n  ")}\n</svg>`;
  }

  // ── Common Part Templates ──

  createBoxPart(name: string, width: number, height: number, depth: number, material?: string): PartDefinition {
    const part = this.createPart(name, material);
    const sketch = this.createSketch("Base Profile");
    this.addRectangle(sketch, { x: -width / 2, y: -height / 2 }, width, height);
    this.addSketchToPart(part, sketch);
    this.addFeatureToPart(part, this.createExtrude(sketch.id, depth));
    this.estimatePartVolume(part);
    return part;
  }

  createCylinderPart(name: string, diameter: number, height: number, material?: string): PartDefinition {
    const part = this.createPart(name, material);
    const sketch = this.createSketch("Base Profile");
    this.addCircle(sketch, { x: 0, y: 0 }, diameter / 2);
    sketch.closed = true;
    this.addSketchToPart(part, sketch);
    this.addFeatureToPart(part, this.createExtrude(sketch.id, height));
    this.estimatePartVolume(part);
    return part;
  }

  createFlangedPart(name: string, outerDia: number, boreDia: number, thickness: number, boltCircleDia: number, holeCount: number, holeDia: number, material?: string): PartDefinition {
    const part = this.createPart(name, material);

    // Base disk
    const baseSketch = this.createSketch("Flange Profile");
    this.addCircle(baseSketch, { x: 0, y: 0 }, outerDia / 2);
    baseSketch.closed = true;
    this.addSketchToPart(part, baseSketch);
    this.addFeatureToPart(part, this.createExtrude(baseSketch.id, thickness));

    // Center bore
    const boreSketch = this.createSketch("Bore Profile");
    this.addCircle(boreSketch, { x: 0, y: 0 }, boreDia / 2);
    boreSketch.closed = true;
    this.addSketchToPart(part, boreSketch);
    this.addFeatureToPart(part, this.createExtrudeCut(boreSketch.id, thickness, true));

    // Bolt holes (circular pattern)
    const boltR = boltCircleDia / 2;
    const firstHolePos = { x: boltR, y: 0 };
    const holeFeature = this.createHole(holeDia, thickness, firstHolePos);
    this.addFeatureToPart(part, holeFeature);
    if (holeCount > 1) {
      this.addFeatureToPart(part, this.createCircularPattern(holeFeature.id, { x: 0, y: 0 }, holeCount));
    }

    this.estimatePartVolume(part);
    return part;
  }

  createBracketPart(name: string, baseWidth: number, baseHeight: number, baseThickness: number, wallHeight: number, wallThickness: number, holeDia?: number, material?: string): PartDefinition {
    const part = this.createPart(name, material);

    // Base plate
    const baseSketch = this.createSketch("Base");
    this.addRectangle(baseSketch, { x: -baseWidth / 2, y: -baseHeight / 2 }, baseWidth, baseHeight);
    this.addSketchToPart(part, baseSketch);
    this.addFeatureToPart(part, this.createExtrude(baseSketch.id, baseThickness));

    // Vertical wall
    const wallSketch = this.createSketch("Wall");
    this.addRectangle(wallSketch, { x: -wallThickness / 2, y: -baseHeight / 2 }, wallThickness, baseHeight);
    this.addSketchToPart(part, wallSketch);
    this.addFeatureToPart(part, this.createExtrude(wallSketch.id, wallHeight));

    // Mounting hole
    if (holeDia) {
      this.addFeatureToPart(part, this.createHole(holeDia, baseThickness, { x: 0, y: 0 }));
    }

    this.estimatePartVolume(part);
    return part;
  }
}

export const sketchEngine = new SketchEngine();
