/**
 * STEPAP242PMIExtractorEngine — Product Manufacturing Information extraction from STEP AP242
 *
 * Extracts GD&T, datums, tolerances, and surface texture from ISO 10303-242 files.
 * Links PMI annotations to geometric features for downstream WEDM processing.
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-02
 */

import { readFileSync, existsSync } from "fs";

export interface DatumReference {
  id: string;
  label: string; // A, B, C, etc.
  precedence: number; // 1=primary, 2=secondary, 3=tertiary
  featureIds: string[];
  modifier?: "M" | "L" | "F"; // MMC, LMC, Free state
}

export interface ToleranceValue {
  nominal: number;
  upper: number;
  lower: number;
  unit: "mm" | "in";
}

export interface GeometricTolerance {
  id: string;
  type:
    | "position"
    | "flatness"
    | "perpendicularity"
    | "parallelism"
    | "cylindricity"
    | "circularity"
    | "runout"
    | "total_runout"
    | "concentricity"
    | "symmetry"
    | "profile_line"
    | "profile_surface"
    | "angularity"
    | "straightness";
  value: ToleranceValue;
  datumRefs: DatumReference[];
  featureIds: string[];
  zone?: "diameter" | "radius" | "spherical";
  materialCondition?: "M" | "L" | "F" | "S"; // MMC, LMC, Free, RFS
}

export interface DimensionalSize {
  id: string;
  type: "linear" | "angular" | "radial" | "diameter";
  nominal: number;
  upperDeviation: number;
  lowerDeviation: number;
  unit: "mm" | "in" | "deg";
  featureIds: string[];
  fitClass?: string; // H7, g6, etc.
}

export interface SurfaceTexture {
  id: string;
  type: "Ra" | "Rz" | "Rt" | "Rq" | "Rmax";
  value: number;
  unit: "um" | "uin";
  direction?: "lay" | "perpendicular" | "circular" | "radial" | "multidirectional";
  featureIds: string[];
  process?: string; // grinding, lapping, EDM, etc.
}

export interface PMIExtractionResult {
  success: boolean;
  filename: string;
  schemaVersion: "AP242" | "AP214" | "AP203" | "unknown";
  unit: "mm" | "in";
  datums: DatumReference[];
  geometricTolerances: GeometricTolerance[];
  dimensionalSizes: DimensionalSize[];
  surfaceTextures: SurfaceTexture[];
  gdtFrames: GDTFrame[];
  featureMap: Map<string, string[]>; // featureId → associated PMI IDs
  warnings: string[];
  stats: {
    totalPMIEntities: number;
    extractedPMI: number;
    linkedToFeatures: number;
    coveragePercent: number;
  };
}

export interface GDTFrame {
  id: string;
  tolerance: GeometricTolerance;
  datumOrder: string[]; // [A, B, C] in precedence order
  compositeFrame?: GDTFrame; // for composite position tolerances
  featureControlFrame: string; // text representation
}

interface STEPEntity {
  id: string;
  type: string;
  params: string[];
  refs: string[];
}

class STEPAP242PMIExtractorEngine {
  private entityCache = new Map<string, STEPEntity>();
  private featureMap = new Map<string, string[]>();
  private warnings: string[] = [];

  /**
   * Extract PMI from STEP AP242 file
   */
  extract(filePath: string): PMIExtractionResult {
    this.entityCache.clear();
    this.featureMap.clear();
    this.warnings = [];

    if (!existsSync(filePath)) {
      return this.errorResult(filePath, `File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf-8");
    const schemaVersion = this.detectSchema(content);

    if (schemaVersion === "unknown") {
      return this.errorResult(filePath, "Unsupported STEP schema - requires AP242, AP214, or AP203");
    }

    const unit = this.extractUnit(content);
    this.parseEntities(content);

    const datums = this.extractDatums();
    const geometricTolerances = this.extractGeometricTolerances(unit);
    const dimensionalSizes = this.extractDimensionalSizes(unit);
    const surfaceTextures = this.extractSurfaceTextures(unit);
    const gdtFrames = this.buildGDTFrames(geometricTolerances, datums);

    const totalPMI =
      datums.length + geometricTolerances.length + dimensionalSizes.length + surfaceTextures.length;

    const linkedCount = this.countLinkedFeatures();
    const coverage = totalPMI > 0 ? (linkedCount / totalPMI) * 100 : 0;

    return {
      success: true,
      filename: filePath,
      schemaVersion,
      unit,
      datums,
      geometricTolerances,
      dimensionalSizes,
      surfaceTextures,
      gdtFrames,
      featureMap: this.featureMap,
      warnings: this.warnings,
      stats: {
        totalPMIEntities: totalPMI,
        extractedPMI: totalPMI,
        linkedToFeatures: linkedCount,
        coveragePercent: Math.round(coverage * 10) / 10,
      },
    };
  }

  /**
   * Extract PMI from STEP content string (for testing/integration)
   */
  extractFromContent(content: string, filename = "inline.stp"): PMIExtractionResult {
    this.entityCache.clear();
    this.featureMap.clear();
    this.warnings = [];

    const schemaVersion = this.detectSchema(content);
    if (schemaVersion === "unknown") {
      return this.errorResult(filename, "Unsupported STEP schema");
    }

    const unit = this.extractUnit(content);
    this.parseEntities(content);

    const datums = this.extractDatums();
    const geometricTolerances = this.extractGeometricTolerances(unit);
    const dimensionalSizes = this.extractDimensionalSizes(unit);
    const surfaceTextures = this.extractSurfaceTextures(unit);
    const gdtFrames = this.buildGDTFrames(geometricTolerances, datums);

    const totalPMI =
      datums.length + geometricTolerances.length + dimensionalSizes.length + surfaceTextures.length;
    const linkedCount = this.countLinkedFeatures();
    const coverage = totalPMI > 0 ? (linkedCount / totalPMI) * 100 : 0;

    return {
      success: true,
      filename,
      schemaVersion,
      unit,
      datums,
      geometricTolerances,
      dimensionalSizes,
      surfaceTextures,
      gdtFrames,
      featureMap: this.featureMap,
      warnings: this.warnings,
      stats: {
        totalPMIEntities: totalPMI,
        extractedPMI: totalPMI,
        linkedToFeatures: linkedCount,
        coveragePercent: Math.round(coverage * 10) / 10,
      },
    };
  }

  private detectSchema(content: string): "AP242" | "AP214" | "AP203" | "unknown" {
    const headerMatch = content.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
    if (!headerMatch) return "unknown";

    const schema = headerMatch[1].toUpperCase();
    if (schema.includes("AP242") || schema.includes("242")) return "AP242";
    if (schema.includes("AP214") || schema.includes("214")) return "AP214";
    if (schema.includes("AP203") || schema.includes("203")) return "AP203";
    if (schema.includes("AUTOMOTIVE_DESIGN")) return "AP214";
    if (schema.includes("CONFIG_CONTROL_DESIGN")) return "AP203";
    return "unknown";
  }

  private extractUnit(content: string): "mm" | "in" {
    // Look for length unit in context
    const mmMatch = content.match(/LENGTH_MEASURE\s*\(\s*['"]?MILLI/i);
    const inMatch = content.match(/LENGTH_MEASURE\s*\(\s*['"]?INCH/i);

    if (inMatch && !mmMatch) return "in";
    if (mmMatch) return "mm";

    // Check conversion factor
    const convMatch = content.match(
      /LENGTH_UNIT.*CONVERSION_BASED_UNIT.*\(\s*'([^']+)'\s*,\s*([0-9.E+-]+)\s*\)/i
    );
    if (convMatch) {
      const factor = parseFloat(convMatch[2]);
      if (Math.abs(factor - 25.4) < 0.1) return "in";
    }

    return "mm"; // default
  }

  private parseEntities(content: string): void {
    // Extract DATA section
    const dataMatch = content.match(/DATA\s*;([\s\S]*?)ENDSEC/i);
    if (!dataMatch) return;

    const dataSection = dataMatch[1];

    // Parse each entity line: #123 = ENTITY_TYPE(params);
    const entityRegex = /#(\d+)\s*=\s*([A-Z_0-9]+)\s*\(([^;]*)\)\s*;/gi;
    let match;

    while ((match = entityRegex.exec(dataSection)) !== null) {
      const id = `#${match[1]}`;
      const type = match[2].toUpperCase();
      const paramStr = match[3];

      const params = this.parseParams(paramStr);
      const refs = this.extractRefs(paramStr);

      this.entityCache.set(id, { id, type, params, refs });
    }
  }

  private parseParams(paramStr: string): string[] {
    const params: string[] = [];
    let depth = 0;
    let current = "";

    for (const char of paramStr) {
      if (char === "(" || char === "[") {
        depth++;
        current += char;
      } else if (char === ")" || char === "]") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        params.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) params.push(current.trim());

    return params;
  }

  private extractRefs(paramStr: string): string[] {
    const refs: string[] = [];
    const refRegex = /#(\d+)/g;
    let match;
    while ((match = refRegex.exec(paramStr)) !== null) {
      refs.push(`#${match[1]}`);
    }
    return refs;
  }

  private extractDatums(): DatumReference[] {
    const datums: DatumReference[] = [];

    for (const [id, entity] of this.entityCache) {
      if (
        entity.type === "DATUM" ||
        entity.type === "DATUM_FEATURE" ||
        entity.type === "DATUM_REFERENCE"
      ) {
        const datum = this.parseDatum(id, entity);
        if (datum) datums.push(datum);
      }
    }

    // Sort by label (A, B, C order)
    datums.sort((a, b) => a.label.localeCompare(b.label));

    // Assign precedence based on label
    datums.forEach((d, i) => {
      d.precedence = i + 1;
    });

    return datums;
  }

  private parseDatum(id: string, entity: STEPEntity): DatumReference | null {
    let label = "A";
    let modifier: "M" | "L" | "F" | undefined;
    const featureIds: string[] = [];

    // Extract label from params
    for (const param of entity.params) {
      const labelMatch = param.match(/'([A-Z])'/);
      if (labelMatch) {
        label = labelMatch[1];
      }
      if (param.includes("MAXIMUM_MATERIAL") || param.includes("MMC")) modifier = "M";
      if (param.includes("LEAST_MATERIAL") || param.includes("LMC")) modifier = "L";
      if (param.includes("FREE_STATE")) modifier = "F";
    }

    // Link to geometric features
    for (const ref of entity.refs) {
      const refEntity = this.entityCache.get(ref);
      if (refEntity && this.isGeometricFeature(refEntity.type)) {
        featureIds.push(ref);
        this.addToFeatureMap(ref, id);
      }
    }

    return {
      id,
      label,
      precedence: 0, // set later
      featureIds,
      modifier,
    };
  }

  private extractGeometricTolerances(unit: "mm" | "in"): GeometricTolerance[] {
    const tolerances: GeometricTolerance[] = [];

    const toleranceTypes = new Map<string, GeometricTolerance["type"]>([
      ["POSITION_TOLERANCE", "position"],
      ["FLATNESS_TOLERANCE", "flatness"],
      ["PERPENDICULARITY_TOLERANCE", "perpendicularity"],
      ["PARALLELISM_TOLERANCE", "parallelism"],
      ["CYLINDRICITY_TOLERANCE", "cylindricity"],
      ["CIRCULARITY_TOLERANCE", "circularity"],
      ["CIRCULAR_RUNOUT_TOLERANCE", "runout"],
      ["TOTAL_RUNOUT_TOLERANCE", "total_runout"],
      ["CONCENTRICITY_TOLERANCE", "concentricity"],
      ["SYMMETRY_TOLERANCE", "symmetry"],
      ["LINE_PROFILE_TOLERANCE", "profile_line"],
      ["SURFACE_PROFILE_TOLERANCE", "profile_surface"],
      ["ANGULARITY_TOLERANCE", "angularity"],
      ["STRAIGHTNESS_TOLERANCE", "straightness"],
      ["GEOMETRIC_TOLERANCE", "position"], // generic fallback
    ]);

    for (const [id, entity] of this.entityCache) {
      const tolType = toleranceTypes.get(entity.type);
      if (tolType) {
        const tol = this.parseGeometricTolerance(id, entity, tolType, unit);
        if (tol) tolerances.push(tol);
      }
    }

    return tolerances;
  }

  private parseGeometricTolerance(
    id: string,
    entity: STEPEntity,
    type: GeometricTolerance["type"],
    unit: "mm" | "in"
  ): GeometricTolerance | null {
    let value = 0;
    let zone: "diameter" | "radius" | "spherical" | undefined;
    let materialCondition: "M" | "L" | "F" | "S" | undefined;
    const datumRefs: DatumReference[] = [];
    const featureIds: string[] = [];

    // Extract tolerance value
    for (const param of entity.params) {
      const numMatch = param.match(/([0-9.E+-]+)/);
      if (numMatch && !param.startsWith("#")) {
        const v = parseFloat(numMatch[1]);
        if (!isNaN(v) && v > 0 && v < 100) {
          value = v;
        }
      }

      // Zone modifiers
      if (param.includes("DIAMETER") || param.includes("DIA")) zone = "diameter";
      if (param.includes("RADIUS") || param.includes("RAD")) zone = "radius";
      if (param.includes("SPHERICAL") || param.includes("SPH")) zone = "spherical";

      // Material condition
      if (param.includes("MAXIMUM_MATERIAL") || param.includes("MMC")) materialCondition = "M";
      if (param.includes("LEAST_MATERIAL") || param.includes("LMC")) materialCondition = "L";
      if (param.includes("FREE_STATE")) materialCondition = "F";
      if (param.includes("REGARDLESS_FEATURE_SIZE") || param.includes("RFS"))
        materialCondition = "S";
    }

    // Extract datum references
    for (const ref of entity.refs) {
      const refEntity = this.entityCache.get(ref);
      if (refEntity) {
        if (
          refEntity.type === "DATUM_REFERENCE" ||
          refEntity.type === "DATUM" ||
          refEntity.type === "DATUM_FEATURE"
        ) {
          const datum = this.parseDatum(ref, refEntity);
          if (datum) datumRefs.push(datum);
        } else if (this.isGeometricFeature(refEntity.type)) {
          featureIds.push(ref);
          this.addToFeatureMap(ref, id);
        }
      }
    }

    if (value === 0) {
      this.warnings.push(`Tolerance ${id} has no value`);
      return null;
    }

    return {
      id,
      type,
      value: {
        nominal: 0,
        upper: value / 2,
        lower: -value / 2,
        unit,
      },
      datumRefs,
      featureIds,
      zone,
      materialCondition,
    };
  }

  private extractDimensionalSizes(unit: "mm" | "in"): DimensionalSize[] {
    const sizes: DimensionalSize[] = [];

    const sizeTypes = [
      "DIMENSIONAL_SIZE",
      "DIMENSIONAL_SIZE_WITH_PATH",
      "ANGULAR_SIZE",
      "LINEAR_DIMENSION",
      "DIAMETER_DIMENSION",
      "RADIAL_DIMENSION",
    ];

    for (const [id, entity] of this.entityCache) {
      if (sizeTypes.includes(entity.type)) {
        const size = this.parseDimensionalSize(id, entity, unit);
        if (size) sizes.push(size);
      }
    }

    return sizes;
  }

  private parseDimensionalSize(
    id: string,
    entity: STEPEntity,
    defaultUnit: "mm" | "in"
  ): DimensionalSize | null {
    let nominal = 0;
    let upperDev = 0;
    let lowerDev = 0;
    let type: DimensionalSize["type"] = "linear";
    let unit: "mm" | "in" | "deg" = defaultUnit;
    const featureIds: string[] = [];
    let fitClass: string | undefined;

    // Determine type
    if (entity.type.includes("ANGULAR")) {
      type = "angular";
      unit = "deg";
    } else if (entity.type.includes("DIAMETER")) {
      type = "diameter";
    } else if (entity.type.includes("RADIAL")) {
      type = "radial";
    }

    // Extract numeric values
    const numbers: number[] = [];
    for (const param of entity.params) {
      const numMatches = param.match(/([0-9.E+-]+)/g);
      if (numMatches) {
        for (const nm of numMatches) {
          const v = parseFloat(nm);
          if (!isNaN(v)) numbers.push(v);
        }
      }

      // Fit class
      const fitMatch = param.match(/[A-Z]\d+|[a-z]\d+/);
      if (fitMatch) fitClass = fitMatch[0];
    }

    if (numbers.length >= 1) nominal = numbers[0];
    if (numbers.length >= 2) upperDev = numbers[1];
    if (numbers.length >= 3) lowerDev = numbers[2];

    // Link features
    for (const ref of entity.refs) {
      const refEntity = this.entityCache.get(ref);
      if (refEntity && this.isGeometricFeature(refEntity.type)) {
        featureIds.push(ref);
        this.addToFeatureMap(ref, id);
      }
    }

    if (nominal === 0) return null;

    return {
      id,
      type,
      nominal,
      upperDeviation: upperDev,
      lowerDeviation: lowerDev,
      unit,
      featureIds,
      fitClass,
    };
  }

  private extractSurfaceTextures(unit: "mm" | "in"): SurfaceTexture[] {
    const textures: SurfaceTexture[] = [];

    const textureTypes = [
      "SURFACE_TEXTURE_PARAMETER",
      "SURFACE_TEXTURE_REPRESENTATION",
      "MACHINING_PROCESS_SURFACE_TEXTURE",
    ];

    for (const [id, entity] of this.entityCache) {
      if (textureTypes.includes(entity.type)) {
        const texture = this.parseSurfaceTexture(id, entity, unit);
        if (texture) textures.push(texture);
      }
    }

    return textures;
  }

  private parseSurfaceTexture(
    id: string,
    entity: STEPEntity,
    defaultUnit: "mm" | "in"
  ): SurfaceTexture | null {
    let type: SurfaceTexture["type"] = "Ra";
    let value = 0;
    let unit: "um" | "uin" = defaultUnit === "mm" ? "um" : "uin";
    let direction: SurfaceTexture["direction"];
    let process: string | undefined;
    const featureIds: string[] = [];

    for (const param of entity.params) {
      // Surface parameter type
      if (param.includes("'RA'") || param.includes("'Ra'")) type = "Ra";
      if (param.includes("'RZ'") || param.includes("'Rz'")) type = "Rz";
      if (param.includes("'RT'") || param.includes("'Rt'")) type = "Rt";
      if (param.includes("'RQ'") || param.includes("'Rq'")) type = "Rq";
      if (param.includes("'RMAX'") || param.includes("'Rmax'")) type = "Rmax";

      // Value
      const numMatch = param.match(/([0-9.]+)/);
      if (numMatch && !param.startsWith("#")) {
        const v = parseFloat(numMatch[1]);
        if (!isNaN(v) && v > 0 && v < 1000) {
          value = v;
        }
      }

      // Direction
      if (param.includes("LAY")) direction = "lay";
      if (param.includes("PERPENDICULAR")) direction = "perpendicular";
      if (param.includes("CIRCULAR")) direction = "circular";
      if (param.includes("RADIAL")) direction = "radial";
      if (param.includes("MULTI")) direction = "multidirectional";

      // Process
      const processMatch = param.match(/'(GRINDING|LAPPING|EDM|MILLING|TURNING|POLISHING)'/i);
      if (processMatch) process = processMatch[1].toLowerCase();
    }

    // Link features
    for (const ref of entity.refs) {
      const refEntity = this.entityCache.get(ref);
      if (refEntity && this.isGeometricFeature(refEntity.type)) {
        featureIds.push(ref);
        this.addToFeatureMap(ref, id);
      }
    }

    if (value === 0) return null;

    return {
      id,
      type,
      value,
      unit,
      direction,
      featureIds,
      process,
    };
  }

  private buildGDTFrames(
    tolerances: GeometricTolerance[],
    datums: DatumReference[]
  ): GDTFrame[] {
    const frames: GDTFrame[] = [];
    const datumMap = new Map(datums.map((d) => [d.id, d]));

    for (const tol of tolerances) {
      const datumOrder = tol.datumRefs
        .sort((a, b) => a.precedence - b.precedence)
        .map((d) => d.label);

      const fcf = this.buildFeatureControlFrame(tol, datumOrder);

      frames.push({
        id: `frame-${tol.id}`,
        tolerance: tol,
        datumOrder,
        featureControlFrame: fcf,
      });
    }

    return frames;
  }

  private buildFeatureControlFrame(tol: GeometricTolerance, datumOrder: string[]): string {
    const parts: string[] = [];

    // Tolerance symbol
    const symbols: Record<string, string> = {
      position: "⌖",
      flatness: "⏥",
      perpendicularity: "⟂",
      parallelism: "∥",
      cylindricity: "⌭",
      circularity: "○",
      runout: "↗",
      total_runout: "↗↗",
      concentricity: "◎",
      symmetry: "⌯",
      profile_line: "⌒",
      profile_surface: "⌓",
      angularity: "∠",
      straightness: "—",
    };

    parts.push(symbols[tol.type] || "?");

    // Zone modifier
    if (tol.zone === "diameter") parts.push("⌀");
    if (tol.zone === "spherical") parts.push("S⌀");

    // Tolerance value
    const tolVal = Math.abs(tol.value.upper) + Math.abs(tol.value.lower);
    parts.push(tolVal.toFixed(3));

    // Material condition
    if (tol.materialCondition === "M") parts.push("Ⓜ");
    if (tol.materialCondition === "L") parts.push("Ⓛ");
    if (tol.materialCondition === "F") parts.push("Ⓕ");

    // Datum references
    if (datumOrder.length > 0) {
      parts.push("|");
      parts.push(datumOrder.join("-"));
    }

    return parts.join(" ");
  }

  private isGeometricFeature(type: string): boolean {
    const featureTypes = [
      "FACE",
      "EDGE",
      "VERTEX",
      "SHELL",
      "SOLID",
      "SURFACE",
      "CURVE",
      "PLANE",
      "CYLINDER",
      "CONE",
      "SPHERE",
      "TORUS",
      "CIRCLE",
      "LINE",
      "ADVANCED_FACE",
      "FACE_SURFACE",
      "FACE_OUTER_BOUND",
      "EDGE_CURVE",
      "EDGE_LOOP",
      "VERTEX_POINT",
      "MANIFOLD_SOLID_BREP",
      "BREP_WITH_VOIDS",
      "SHELL_BASED_SURFACE_MODEL",
      "GEOMETRIC_SET",
      "GEOMETRIC_CURVE_SET",
    ];

    return featureTypes.some((ft) => type.includes(ft));
  }

  private addToFeatureMap(featureId: string, pmiId: string): void {
    const existing = this.featureMap.get(featureId) || [];
    if (!existing.includes(pmiId)) {
      existing.push(pmiId);
      this.featureMap.set(featureId, existing);
    }
  }

  private countLinkedFeatures(): number {
    let count = 0;
    for (const [, pmiIds] of this.featureMap) {
      count += pmiIds.length;
    }
    return count;
  }

  private errorResult(filename: string, error: string): PMIExtractionResult {
    return {
      success: false,
      filename,
      schemaVersion: "unknown",
      unit: "mm",
      datums: [],
      geometricTolerances: [],
      dimensionalSizes: [],
      surfaceTextures: [],
      gdtFrames: [],
      featureMap: new Map(),
      warnings: [error],
      stats: {
        totalPMIEntities: 0,
        extractedPMI: 0,
        linkedToFeatures: 0,
        coveragePercent: 0,
      },
    };
  }

  /**
   * Get tolerance for a specific feature (for WEDM feature recognition)
   */
  getFeatureTolerances(result: PMIExtractionResult, featureId: string): {
    geometricTolerances: GeometricTolerance[];
    dimensionalSizes: DimensionalSize[];
    surfaceTextures: SurfaceTexture[];
    tightestTolerance: number | null;
  } {
    const geometricTolerances = result.geometricTolerances.filter((t) =>
      t.featureIds.includes(featureId)
    );
    const dimensionalSizes = result.dimensionalSizes.filter((d) =>
      d.featureIds.includes(featureId)
    );
    const surfaceTextures = result.surfaceTextures.filter((s) =>
      s.featureIds.includes(featureId)
    );

    let tightestTolerance: number | null = null;

    for (const gt of geometricTolerances) {
      const tol = Math.abs(gt.value.upper) + Math.abs(gt.value.lower);
      if (tightestTolerance === null || tol < tightestTolerance) {
        tightestTolerance = tol;
      }
    }

    for (const ds of dimensionalSizes) {
      const tol = Math.abs(ds.upperDeviation) + Math.abs(ds.lowerDeviation);
      if (tol > 0 && (tightestTolerance === null || tol < tightestTolerance)) {
        tightestTolerance = tol;
      }
    }

    return {
      geometricTolerances,
      dimensionalSizes,
      surfaceTextures,
      tightestTolerance,
    };
  }

  /**
   * Check if feature requires WEDM (based on tolerance tightness and surface finish)
   */
  requiresWEDM(
    result: PMIExtractionResult,
    featureId: string,
    thresholds = { tolerance_mm: 0.01, surface_Ra_um: 1.6 }
  ): { required: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const { tightestTolerance, surfaceTextures } = this.getFeatureTolerances(result, featureId);

    if (tightestTolerance !== null) {
      const tolMm = result.unit === "in" ? tightestTolerance * 25.4 : tightestTolerance;
      if (tolMm <= thresholds.tolerance_mm) {
        reasons.push(`Tight tolerance: ${tolMm.toFixed(4)} mm (threshold: ${thresholds.tolerance_mm} mm)`);
      }
    }

    for (const st of surfaceTextures) {
      const raUm = st.unit === "uin" ? st.value * 0.0254 : st.value;
      if (raUm <= thresholds.surface_Ra_um) {
        reasons.push(`Fine surface finish: Ra ${raUm.toFixed(2)} µm (threshold: ${thresholds.surface_Ra_um} µm)`);
      }
    }

    return {
      required: reasons.length > 0,
      reasons,
    };
  }
}

export const stepAP242PMIExtractorEngine = new STEPAP242PMIExtractorEngine();
