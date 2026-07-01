/**
 * UserToolLibraryEngine — Personal Tool Library Management
 *
 * Manages a user's physical shop tool inventory with CRUD operations,
 * catalog import, CSV bulk import, condition tracking, holder pairing,
 * and feature-based filtering for SpeedFeedOrchestratorEngine integration.
 *
 * Actions: add_tool, add_from_catalog, import_csv, filter_for_feature,
 *          update_condition, get_library_stats
 *
 * @module engines/UserToolLibraryEngine
 */

// ============================================================================
// ATOMIC VALUE
// ============================================================================

/** A typed value with unit, optional formula, and confidence */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ============================================================================
// TYPES
// ============================================================================

/** A single tool in the user's personal library */
export interface UserTool {
  id: string;
  catalog_ref?: string;
  name: string;
  // Geometry
  diameter_mm: number;
  flutes: number;
  flute_length_mm: number;
  overall_length_mm: number;
  corner_radius_mm: number;
  helix_angle_deg: number;
  // Material
  tool_material: string;
  coating: string;
  insert_grade?: string;
  solid_or_insert: 'solid' | 'indexable';
  // Holder
  default_holder_type?: string;
  default_stickout_mm?: number;
  // Tracking
  condition: 'new' | 'good' | 'worn' | 'needs_regrind' | 'retired';
  purchase_date?: string;
  total_cutting_minutes?: number;
  regrind_count?: number;
  notes?: string;
  // Magazine
  magazine_position?: number;
  machine_name?: string;
  // Tags
  tags?: string[];
}

/** The complete user tool library */
export interface UserToolLibrary {
  tools: UserTool[];
  created_at: string;
  updated_at: string;
  owner?: string;
}

/** Input for addTool */
export interface AddToolInput {
  name: string;
  diameter_mm: number;
  flutes: number;
  tool_material: string;
  flute_length_mm?: number;
  overall_length_mm?: number;
  corner_radius_mm?: number;
  helix_angle_deg?: number;
  coating?: string;
  insert_grade?: string;
  solid_or_insert?: 'solid' | 'indexable';
  default_holder_type?: string;
  default_stickout_mm?: number;
  condition?: UserTool['condition'];
  purchase_date?: string;
  total_cutting_minutes?: number;
  regrind_count?: number;
  notes?: string;
  magazine_position?: number;
  machine_name?: string;
  tags?: string[];
  catalog_ref?: string;
}

/** Input for addFromCatalog */
export interface AddFromCatalogInput {
  catalog_id: string;
  stickout_mm?: number;
  holder_type?: string;
  notes?: string;
}

/** Input for importCSV */
export interface ImportCSVInput {
  csv_text: string;
  delimiter?: string;
}

/** Result of CSV import */
export interface ImportCSVResult {
  imported: number;
  skipped: number;
  warnings: string[];
  tools: UserTool[];
}

/** Input for filterForFeature */
export interface FilterForFeatureInput {
  library: UserToolLibrary;
  feature_type: 'pocket' | 'hole' | 'wall' | 'contour' | 'face' | 'slot';
  feature_width_mm?: number;
  feature_depth_mm?: number;
  feature_diameter_mm?: number;
  material?: string;
  operation?: string;
}

/** Result of feature filtering */
export interface FilterResult {
  qualifying_tools: UserTool[];
  disqualified: { tool_id: string; reason: string }[];
  recommendations: string[];
}

/** Input for updateCondition */
export interface UpdateConditionInput {
  tool_id: string;
  library: UserToolLibrary;
  condition: UserTool['condition'];
  cutting_minutes_added?: number;
  notes?: string;
}

/** Input for getLibraryStats */
export interface LibraryStatsInput {
  library: UserToolLibrary;
}

/** Library statistics result */
export interface LibraryStats {
  total_tools: number;
  by_condition: Record<string, number>;
  by_material: Record<string, number>;
  by_diameter_range: Record<string, number>;
  avg_age_days: number;
  tools_needing_attention: UserTool[];
}

// ============================================================================
// CATALOG SUMMARY (20 common tools)
// ============================================================================

interface CatalogEntry {
  id: string;
  name: string;
  diameter_mm: number;
  flutes: number;
  flute_length_mm: number;
  overall_length_mm: number;
  corner_radius_mm: number;
  helix_angle_deg: number;
  tool_material: string;
  coating: string;
  solid_or_insert: 'solid' | 'indexable';
  tool_type: string;
}

/** Helper to build a CatalogEntry with less repetition */
function ce(
  id: string, name: string, d: number, fl: number,
  flen: number, olen: number, cr: number, helix: number,
  mat: string, coat: string, typ: string
): CatalogEntry {
  return {
    id, name, diameter_mm: d, flutes: fl,
    flute_length_mm: flen, overall_length_mm: olen,
    corner_radius_mm: cr, helix_angle_deg: helix,
    tool_material: mat, coating: coat,
    solid_or_insert: 'solid', tool_type: typ,
  };
}

const CATALOG_SUMMARY: CatalogEntry[] = [
  ce('CAT-EM-004-4F', '4mm 4FL Carbide TiAlN Endmill',
    4, 4, 12, 50, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-006-3F', '6mm 3FL Carbide AlCrN Endmill',
    6, 3, 18, 57, 0, 40, 'carbide', 'AlCrN', 'endmill'),
  ce('CAT-EM-008-4F', '8mm 4FL Carbide TiAlN Endmill',
    8, 4, 24, 63, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-010-4F', '10mm 4FL Carbide TiAlN Endmill',
    10, 4, 30, 72, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-012-4F', '12mm 4FL Carbide TiAlN Endmill',
    12, 4, 36, 83, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-016-4F', '16mm 4FL Carbide TiAlN Endmill',
    16, 4, 48, 100, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-020-4F', '20mm 4FL Carbide TiAlN Endmill',
    20, 4, 60, 120, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-025-5F', '25mm 5FL Carbide TiAlN Endmill',
    25, 5, 75, 140, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-BN-006-2F', '6mm 2FL Carbide Ball Nose',
    6, 2, 18, 57, 3, 30, 'carbide', 'TiAlN', 'ball_nose'),
  ce('CAT-BN-010-2F', '10mm 2FL Carbide Ball Nose',
    10, 2, 30, 72, 5, 30, 'carbide', 'TiAlN', 'ball_nose'),
  ce('CAT-EM-003175-2F', '3.175mm (1/8") 2FL Carbide Endmill',
    3.175, 2, 9.5, 38, 0, 30, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-00635-4F', '6.35mm (1/4") 4FL Carbide Endmill',
    6.35, 4, 19, 57, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-EM-01270-4F', '12.7mm (1/2") 4FL Carbide Endmill',
    12.7, 4, 38, 89, 0, 35, 'carbide', 'TiAlN', 'endmill'),
  ce('CAT-DR-008', '8mm Carbide Drill',
    8, 2, 40, 79, 0, 30, 'carbide', 'TiAlN', 'drill'),
  ce('CAT-DR-010', '10mm Carbide Drill',
    10, 2, 50, 89, 0, 30, 'carbide', 'TiAlN', 'drill'),
  ce('CAT-DR-012', '12mm Carbide Drill',
    12, 2, 60, 101, 0, 30, 'carbide', 'TiAlN', 'drill'),
  ce('CAT-TAP-M6', 'M6 HSS Tap',
    6, 3, 18, 72, 0, 15, 'HSS', 'TiN', 'tap'),
  ce('CAT-TAP-M8', 'M8 HSS Tap',
    8, 3, 22, 83, 0, 15, 'HSS', 'TiN', 'tap'),
  ce('CAT-TAP-M10', 'M10 HSS Tap',
    10, 3, 26, 93, 0, 15, 'HSS', 'TiN', 'tap'),
  ce('CAT-RM-010', '10mm Carbide Reamer',
    10, 6, 30, 89, 0, 8, 'carbide', 'TiAlN', 'reamer'),
];

// ============================================================================
// REGRIND THRESHOLDS (minutes of cutting before suggesting regrind)
// ============================================================================

const REGRIND_THRESHOLDS: Record<string, number> = {
  carbide: 120,
  HSS: 60,
  ceramic: 90,
  CBN: 150,
};

// ============================================================================
// UUID GENERATOR (self-contained, no external deps)
// ============================================================================

let _uuidCounter = 0;

/**
 * Generate a unique ID from timestamp + counter.
 * Format: utl-<timestamp_hex>-<counter_hex>-<random_hex>
 */
function generateId(): string {
  _uuidCounter++;
  const ts = Date.now().toString(16);
  const cnt = _uuidCounter.toString(16).padStart(4, '0');
  const rnd = Math.floor(Math.random() * 0xffff)
    .toString(16).padStart(4, '0');
  return `utl-${ts}-${cnt}-${rnd}`;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * UserToolLibraryEngine — manages a user's personal shop tool inventory.
 *
 * Provides CRUD, catalog import, CSV bulk import, condition tracking,
 * feature-based filtering, and library statistics. All public methods
 * return AtomicValue wrappers for pipeline compatibility.
 */
class UserToolLibraryEngine {

  /**
   * Add a tool to the user's library.
   *
   * Requires at minimum: name, diameter_mm, flutes, tool_material.
   * Auto-generates a UUID and defaults condition to 'new'.
   *
   * @param input - Partial tool specification
   * @returns AtomicValue wrapping the created UserTool
   */
  addTool(input: AddToolInput): AtomicValue<UserTool> {
    const tool: UserTool = {
      id: generateId(),
      catalog_ref: input.catalog_ref,
      name: input.name,
      diameter_mm: input.diameter_mm,
      flutes: input.flutes,
      flute_length_mm: input.flute_length_mm ?? input.diameter_mm * 3,
      overall_length_mm: input.overall_length_mm ?? input.diameter_mm * 8,
      corner_radius_mm: input.corner_radius_mm ?? 0,
      helix_angle_deg: input.helix_angle_deg ?? 35,
      tool_material: input.tool_material,
      coating: input.coating ?? 'uncoated',
      insert_grade: input.insert_grade,
      solid_or_insert: input.solid_or_insert ?? 'solid',
      default_holder_type: input.default_holder_type,
      default_stickout_mm: input.default_stickout_mm,
      condition: input.condition ?? 'new',
      purchase_date: input.purchase_date
        ?? new Date().toISOString().slice(0, 10),
      total_cutting_minutes: input.total_cutting_minutes ?? 0,
      regrind_count: input.regrind_count ?? 0,
      notes: input.notes,
      magazine_position: input.magazine_position,
      machine_name: input.machine_name,
      tags: input.tags ?? [],
    };

    return {
      value: tool,
      unit: 'UserTool',
      formula: 'addTool(input) -> UUID-assigned tool with defaults',
      confidence: 1.0,
    };
  }

  /**
   * Import a tool from PRISM's built-in 46K catalog summary.
   *
   * Looks up the catalog_id in the 20-entry demo catalog, maps fields
   * to UserTool, and sets catalog_ref for traceability.
   *
   * @param input - Catalog ID and optional holder/stickout overrides
   * @returns AtomicValue wrapping the created UserTool
   * @throws Error if catalog_id not found
   */
  addFromCatalog(input: AddFromCatalogInput): AtomicValue<UserTool> {
    const entry = CATALOG_SUMMARY.find(c => c.id === input.catalog_id);
    if (!entry) {
      const available = CATALOG_SUMMARY.map(c => c.id).join(', ');
      throw new Error(
        `Catalog ID "${input.catalog_id}" not found. ` +
        `Available: ${available}`
      );
    }

    const result = this.addTool({
      name: entry.name,
      diameter_mm: entry.diameter_mm,
      flutes: entry.flutes,
      flute_length_mm: entry.flute_length_mm,
      overall_length_mm: entry.overall_length_mm,
      corner_radius_mm: entry.corner_radius_mm,
      helix_angle_deg: entry.helix_angle_deg,
      tool_material: entry.tool_material,
      coating: entry.coating,
      solid_or_insert: entry.solid_or_insert,
      catalog_ref: entry.id,
      default_holder_type: input.holder_type,
      default_stickout_mm: input.stickout_mm,
      notes: input.notes,
    });

    return {
      value: result.value,
      unit: 'UserTool',
      formula: `addFromCatalog("${entry.id}") -> ` +
        `mapped from "${entry.name}"`,
      confidence: 1.0,
    };
  }

  /**
   * Bulk-import tools from CSV text.
   *
   * Expected headers: name, diameter_mm, flutes, flute_length_mm,
   * tool_material, coating, condition.
   * Rows missing required fields (name, diameter_mm, flutes,
   * tool_material) are skipped with warnings.
   *
   * @param input - CSV text and optional delimiter (default ',')
   * @returns AtomicValue wrapping the import result
   */
  importCSV(input: ImportCSVInput): AtomicValue<ImportCSVResult> {
    const delimiter = input.delimiter ?? ',';
    const lines = input.csv_text
      .split(/\r?\n/)
      .filter(l => l.trim().length > 0);

    if (lines.length < 2) {
      return {
        value: {
          imported: 0, skipped: 0,
          warnings: ['CSV needs a header row and at least one data row'],
          tools: [],
        },
        unit: 'ImportCSVResult',
        confidence: 0.5,
      };
    }

    const headers = lines[0]
      .split(delimiter)
      .map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const diaIdx = headers.indexOf('diameter_mm');
    const fluteIdx = headers.indexOf('flutes');
    const fluteLenIdx = headers.indexOf('flute_length_mm');
    const matIdx = headers.indexOf('tool_material');
    const coatIdx = headers.indexOf('coating');
    const condIdx = headers.indexOf('condition');

    const warnings: string[] = [];
    const tools: UserTool[] = [];
    let skipped = 0;

    if (nameIdx < 0) {
      warnings.push('Missing "name" column — will auto-generate names');
    }
    if (diaIdx < 0) {
      return {
        value: {
          imported: 0, skipped: 0,
          warnings: ['Missing required "diameter_mm" column'],
          tools: [],
        },
        unit: 'ImportCSVResult', confidence: 0,
      };
    }
    if (fluteIdx < 0) {
      return {
        value: {
          imported: 0, skipped: 0,
          warnings: ['Missing required "flutes" column'],
          tools: [],
        },
        unit: 'ImportCSVResult', confidence: 0,
      };
    }
    if (matIdx < 0) {
      return {
        value: {
          imported: 0, skipped: 0,
          warnings: ['Missing required "tool_material" column'],
          tools: [],
        },
        unit: 'ImportCSVResult', confidence: 0,
      };
    }

    const validConds = [
      'new', 'good', 'worn', 'needs_regrind', 'retired',
    ] as const;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim());
      const rowNum = i + 1;

      const dia = parseFloat(cols[diaIdx] ?? '');
      const flutes = parseInt(cols[fluteIdx] ?? '', 10);
      const mat = cols[matIdx] ?? '';

      if (isNaN(dia) || dia <= 0) {
        warnings.push(
          `Row ${rowNum}: invalid diameter_mm ` +
          `"${cols[diaIdx]}" — skipped`
        );
        skipped++;
        continue;
      }
      if (isNaN(flutes) || flutes <= 0) {
        warnings.push(
          `Row ${rowNum}: invalid flutes ` +
          `"${cols[fluteIdx]}" — skipped`
        );
        skipped++;
        continue;
      }
      if (!mat) {
        warnings.push(
          `Row ${rowNum}: missing tool_material — skipped`
        );
        skipped++;
        continue;
      }

      const name = (nameIdx >= 0 && cols[nameIdx])
        ? cols[nameIdx]
        : `${dia}mm ${flutes}FL ${mat}`;
      const fluteLen = (fluteLenIdx >= 0)
        ? parseFloat(cols[fluteLenIdx])
        : undefined;
      const coating = (coatIdx >= 0 && cols[coatIdx])
        ? cols[coatIdx]
        : 'uncoated';
      const condRaw = (condIdx >= 0 && cols[condIdx])
        ? cols[condIdx]
        : 'new';
      const cond = (validConds as readonly string[]).includes(condRaw)
        ? condRaw as UserTool['condition']
        : 'new';

      if (
        !(validConds as readonly string[]).includes(condRaw) &&
        condIdx >= 0 && cols[condIdx]
      ) {
        warnings.push(
          `Row ${rowNum}: unknown condition ` +
          `"${condRaw}" — defaulted to "new"`
        );
      }

      const result = this.addTool({
        name,
        diameter_mm: dia,
        flutes,
        flute_length_mm: isNaN(fluteLen as number)
          ? undefined
          : fluteLen,
        tool_material: mat,
        coating,
        condition: cond,
      });

      tools.push(result.value);
    }

    const rowCount = lines.length - 1;
    return {
      value: { imported: tools.length, skipped, warnings, tools },
      unit: 'ImportCSVResult',
      formula: `importCSV: parsed ${rowCount} rows, ` +
        `${tools.length} imported, ${skipped} skipped`,
      confidence: warnings.length === 0 ? 1.0 : 0.85,
    };
  }

  /**
   * Filter the library for tools that can machine a given feature.
   *
   * Applies geometry, depth, and condition rules per feature type.
   * Ranks qualifying tools by efficiency (larger diameter = higher
   * MRR) for roughing, or by precision (smaller corner radius)
   * for finishing.
   *
   * @param input - Library, feature geometry, optional material/op
   * @returns AtomicValue wrapping qualifying/disqualified/recs
   */
  filterForFeature(
    input: FilterForFeatureInput
  ): AtomicValue<FilterResult> {
    const {
      library, feature_type, feature_width_mm,
      feature_depth_mm, feature_diameter_mm, operation,
    } = input;
    const qualifying: UserTool[] = [];
    const disqualified: { tool_id: string; reason: string }[] = [];
    const recommendations: string[] = [];

    for (const tool of library.tools) {
      // Always exclude retired tools
      if (tool.condition === 'retired') {
        disqualified.push({
          tool_id: tool.id, reason: 'Tool is retired',
        });
        continue;
      }

      let passes = true;
      let reason = '';

      switch (feature_type) {
        case 'pocket': {
          const maxDia = (feature_width_mm ?? Infinity) * 0.9;
          if (tool.diameter_mm > maxDia) {
            passes = false;
            reason =
              `Diameter ${tool.diameter_mm}mm exceeds pocket ` +
              `clearance ${maxDia.toFixed(1)}mm ` +
              `(90% of ${feature_width_mm}mm)`;
          } else if (
            feature_depth_mm !== undefined &&
            tool.flute_length_mm < feature_depth_mm
          ) {
            passes = false;
            reason =
              `Flute length ${tool.flute_length_mm}mm ` +
              `insufficient for depth ${feature_depth_mm}mm`;
          }
          break;
        }
        case 'hole': {
          if (feature_diameter_mm !== undefined) {
            const diff = Math.abs(
              tool.diameter_mm - feature_diameter_mm
            );
            const tolerance = 0.5;
            if (diff > tolerance) {
              passes = false;
              reason =
                `Diameter ${tool.diameter_mm}mm doesn't match ` +
                `hole ${feature_diameter_mm}mm ` +
                `(+/-${tolerance}mm)`;
            }
          }
          if (
            passes &&
            feature_depth_mm !== undefined &&
            tool.flute_length_mm < feature_depth_mm
          ) {
            passes = false;
            reason =
              `Flute length ${tool.flute_length_mm}mm ` +
              `insufficient for depth ${feature_depth_mm}mm`;
          }
          break;
        }
        case 'wall': {
          if (
            feature_width_mm !== undefined &&
            feature_width_mm < 2
          ) {
            recommendations.push(
              `Thin wall (${feature_width_mm}mm) — ` +
              `use low radial engagement and climb milling`
            );
          }
          break;
        }
        case 'slot': {
          if (
            feature_width_mm !== undefined &&
            tool.diameter_mm > feature_width_mm
          ) {
            passes = false;
            reason =
              `Diameter ${tool.diameter_mm}mm exceeds ` +
              `slot width ${feature_width_mm}mm`;
          }
          if (
            passes &&
            feature_depth_mm !== undefined &&
            tool.flute_length_mm < feature_depth_mm
          ) {
            passes = false;
            reason =
              `Flute length ${tool.flute_length_mm}mm ` +
              `insufficient for depth ${feature_depth_mm}mm`;
          }
          break;
        }
        case 'contour': {
          // Any non-retired tool; prefer smaller for tight radii
          break;
        }
        case 'face': {
          // Any non-retired tool; prefer largest for efficiency
          break;
        }
      }

      // Warn about worn tools
      if (passes && tool.condition === 'worn') {
        recommendations.push(
          `Tool "${tool.name}" (${tool.id}) is worn — ` +
          `consider regrind before precision ops`
        );
      }
      if (passes && tool.condition === 'needs_regrind') {
        recommendations.push(
          `Tool "${tool.name}" (${tool.id}) needs ` +
          `regrind — not recommended for finishing`
        );
      }

      if (passes) {
        qualifying.push(tool);
      } else {
        disqualified.push({ tool_id: tool.id, reason });
      }
    }

    // Sort qualifying tools
    const isFinishing = (
      operation === 'finishing' || operation === 'finish'
    );
    if (feature_type === 'face') {
      qualifying.sort((a, b) => b.diameter_mm - a.diameter_mm);
    } else if (feature_type === 'contour' || isFinishing) {
      qualifying.sort(
        (a, b) => a.corner_radius_mm - b.corner_radius_mm
      );
    } else {
      qualifying.sort((a, b) => b.diameter_mm - a.diameter_mm);
    }

    if (qualifying.length === 0) {
      recommendations.push(
        'No qualifying tools — consider purchasing one'
      );
    } else if (qualifying.length === 1) {
      recommendations.push(
        `Only one tool qualifies: "${qualifying[0].name}"`
      );
    }

    const qLen = qualifying.length;
    const dLen = disqualified.length;
    return {
      value: {
        qualifying_tools: qualifying,
        disqualified,
        recommendations,
      },
      unit: 'FilterResult',
      formula: `filterForFeature("${feature_type}"): ` +
        `${qLen} qualifying, ${dLen} disqualified`,
      confidence: qLen > 0 ? 0.9 : 0.5,
    };
  }

  /**
   * Update a tool's condition and accumulate cutting time.
   *
   * Automatically suggests regrind when total_cutting_minutes
   * exceeds the material-specific threshold:
   * carbide=120, HSS=60, ceramic=90, CBN=150.
   *
   * @param input - Tool ID, new condition, optional minutes/notes
   * @returns AtomicValue wrapping the updated UserTool
   * @throws Error if tool_id not found in library
   */
  updateCondition(
    input: UpdateConditionInput
  ): AtomicValue<UserTool> {
    const {
      library, tool_id, condition, cutting_minutes_added, notes,
    } = input;
    const tool = library.tools.find(t => t.id === tool_id);

    if (!tool) {
      throw new Error(
        `Tool ID "${tool_id}" not found in library`
      );
    }

    // Update condition
    tool.condition = condition;

    // Accumulate cutting minutes
    if (
      cutting_minutes_added !== undefined &&
      cutting_minutes_added > 0
    ) {
      tool.total_cutting_minutes =
        (tool.total_cutting_minutes ?? 0) + cutting_minutes_added;
    }

    // Append notes
    if (notes) {
      tool.notes = tool.notes
        ? `${tool.notes}; ${notes}`
        : notes;
    }

    // Update library timestamp
    library.updated_at = new Date().toISOString();

    // Check regrind threshold
    const threshold = REGRIND_THRESHOLDS[tool.tool_material] ?? 120;
    const totalMin = tool.total_cutting_minutes ?? 0;
    let formula =
      `updateCondition("${tool_id}"): condition=${condition}`;
    let regrindSuggested = false;

    if (
      totalMin > threshold &&
      condition !== 'needs_regrind' &&
      condition !== 'retired'
    ) {
      regrindSuggested = true;
      formula +=
        ` | REGRIND SUGGESTED: ${totalMin.toFixed(0)}min ` +
        `exceeds ${tool.tool_material} threshold ${threshold}min`;
      const regrindNote =
        `Auto-suggestion: regrind recommended ` +
        `(${totalMin.toFixed(0)}/${threshold}min)`;
      tool.notes = tool.notes
        ? `${tool.notes}; ${regrindNote}`
        : regrindNote;
    }

    return {
      value: { ...tool },
      unit: 'UserTool',
      formula,
      confidence: regrindSuggested ? 0.8 : 1.0,
    };
  }

  /**
   * Compute summary statistics for the entire tool library.
   *
   * Returns counts by condition, by material, by diameter range,
   * average tool age, and a list of tools needing attention
   * (worn, needs_regrind, or over regrind threshold).
   *
   * @param input - The user's tool library
   * @returns AtomicValue wrapping the LibraryStats
   */
  getLibraryStats(
    input: LibraryStatsInput
  ): AtomicValue<LibraryStats> {
    const { library } = input;
    const tools = library.tools;

    // By condition
    const byCondition: Record<string, number> = {};
    for (const t of tools) {
      byCondition[t.condition] =
        (byCondition[t.condition] ?? 0) + 1;
    }

    // By material
    const byMaterial: Record<string, number> = {};
    for (const t of tools) {
      byMaterial[t.tool_material] =
        (byMaterial[t.tool_material] ?? 0) + 1;
    }

    // By diameter range
    const byDiameterRange: Record<string, number> = {};
    for (const t of tools) {
      const range = t.diameter_mm < 3 ? '<3mm'
        : t.diameter_mm < 6 ? '3-6mm'
        : t.diameter_mm < 10 ? '6-10mm'
        : t.diameter_mm < 16 ? '10-16mm'
        : t.diameter_mm < 25 ? '16-25mm'
        : '25mm+';
      byDiameterRange[range] =
        (byDiameterRange[range] ?? 0) + 1;
    }

    // Average age in days
    const now = Date.now();
    let totalAgeDays = 0;
    let toolsWithDate = 0;
    for (const t of tools) {
      if (t.purchase_date) {
        const purchased = new Date(t.purchase_date).getTime();
        if (!isNaN(purchased)) {
          totalAgeDays +=
            (now - purchased) / (1000 * 60 * 60 * 24);
          toolsWithDate++;
        }
      }
    }
    const avgAgeDays = toolsWithDate > 0
      ? Math.round(totalAgeDays / toolsWithDate)
      : 0;

    // Tools needing attention
    const needingAttention: UserTool[] = [];
    for (const t of tools) {
      if (
        t.condition === 'worn' ||
        t.condition === 'needs_regrind'
      ) {
        needingAttention.push(t);
        continue;
      }
      const threshold =
        REGRIND_THRESHOLDS[t.tool_material] ?? 120;
      if (
        (t.total_cutting_minutes ?? 0) > threshold &&
        t.condition !== 'retired'
      ) {
        needingAttention.push(t);
      }
    }

    const attLen = needingAttention.length;
    return {
      value: {
        total_tools: tools.length,
        by_condition: byCondition,
        by_material: byMaterial,
        by_diameter_range: byDiameterRange,
        avg_age_days: avgAgeDays,
        tools_needing_attention: needingAttention,
      },
      unit: 'LibraryStats',
      formula: `getLibraryStats: ${tools.length} tools, ` +
        `${attLen} needing attention`,
      confidence: 1.0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of UserToolLibraryEngine */
export const userToolLibraryEngine = new UserToolLibraryEngine();

export { UserToolLibraryEngine };
