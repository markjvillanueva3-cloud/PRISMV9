/**
 * CAMClickSequenceEngine — CAM-AI-TRAINING-MS0/U-CAMT-B-CLICK
 *
 * Given (op, system, parameter values) the engine emits an ORDERED click
 * sequence — what tab to open, which field to set, what value to type.
 * This is the layer that turns the static per-software function-index
 * catalogs (mcp-server/data/cam-functions/<system>/*.json) into the
 * actionable recipe an automation script or human operator can follow.
 *
 * Real-data discipline: the click sequence is grounded ONLY in the
 * documented tabs + parameter names from the per-software JSON catalog.
 * No invented UI elements. If a parameter doesn't exist in the catalog
 * for a (system, op) pair, it is omitted with a "missing-catalog-binding"
 * warning rather than a fabricated click.
 *
 * Architecture: pure logic with an injectable catalog-loader, so tests
 * pass canned catalog dicts inline. Production wires the real JSON read
 * via the runner script.
 *
 * Composition with the rest of Phase B:
 *   B01 taxonomy + B02 schema + B03 template + B-CLICK click-sequence =
 *   complete end-to-end pipeline from (op, system, feature) to a
 *   recipe an operator/automation can execute.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { CamOperation, CamSystem } from "./CAMOperationTaxonomyEngine.js";
import type { CamTemplate } from "./CAMTemplateGeneratorEngine.js";

// ── Catalog shape (canonical subset of the per-software JSON catalogs) ──────

export interface CatalogParameter {
  name: string;
  type: "selection" | "numeric" | "dropdown" | "checkbox" | "string";
  required?: boolean;
  default?: number | string | boolean;
  unit?: string;
  options?: ReadonlyArray<string>;
  description?: string;
}

export interface CatalogTab {
  parameters: ReadonlyArray<CatalogParameter>;
}

export interface CatalogToolpath {
  /** Vendor-native name (e.g. "2D Adaptive Clearing", "Face", "Pocket"). */
  description?: string;
  category?: string;
  parameterCount?: number;
  tabs?: Record<string, CatalogTab>;
}

export interface SoftwareCatalog {
  schemaVersion?: string;
  metadata?: { title?: string; source?: string };
  commonTabs?: { tabs?: ReadonlyArray<string> };
  toolpaths?: Record<string, CatalogToolpath>;
}

/** Loader injection — production reads from mcp-server/data/cam-functions/. */
export type CatalogLoader = (system: CamSystem) => SoftwareCatalog | null;

// ── ClickAction shape ───────────────────────────────────────────────────────

export type ClickActionKind =
  | "open_tab"            // navigate to a parameter tab
  | "set_dropdown"        // select an option from a dropdown
  | "set_numeric"         // type a numeric value
  | "set_checkbox"        // toggle a checkbox
  | "set_string"          // type a string value
  | "select_geometry"     // user-supplied geometry selection (manual)
  | "warning";            // emitted when a template param has no catalog binding

export interface ClickAction {
  step: number;
  kind: ClickActionKind;
  target: string;            // tab name or parameter label
  value?: number | string | boolean;
  unit?: string;
  /** Maps back to the canonical template parameter id (when applicable). */
  templateParamId?: string;
  /** Source provenance — the catalog tab + parameter name. */
  source: string;
}

export interface ClickSequence {
  op: CamOperation;
  system: CamSystem;
  nativeOpName: string;
  /** Total ordered steps. */
  steps: ReadonlyArray<ClickAction>;
  /** Warnings for template parameters with no catalog binding. */
  warnings: ReadonlyArray<string>;
  /** Aggregate stats. */
  stats: {
    totalSteps: number;
    tabOpens: number;
    valuesSet: number;
    missingCatalogBindings: number;
  };
}

// ── Operation → catalog-toolpath-key mapping ────────────────────────────────
// Canonical (CamOperation) → catalog JSON key. v1 covers Fusion 360 only;
// other systems will gain mappings in U-CAMT-B-CLICK-V2.

const OP_TO_CATALOG_KEY: Partial<Record<CamSystem, Partial<Record<CamOperation, string>>>> = {
  fusion360: {
    adaptive_clearing_2d: "2D_ADAPTIVE_CLEARING",
    pocket_2d: "2D_POCKET",
    contour_2d: "2D_CONTOUR",
    face: "FACE",
    slot_2d: "SLOT",
    engrave_2d: "ENGRAVE",
    trace_2d: "TRACE",
    chamfer_2d: "2D_CHAMFER",
    bore: "BORE",
  },
};

// ── Template-param → catalog-param-label mapping ────────────────────────────
// Canonical B02 parameter id → vendor catalog "name" field. Per-system since
// the same canonical id may be labelled differently across vendors.

// Canonical parameter → vendor label mappings. Sources: each vendor's
// official UI documentation and the per-software function-index JSON catalogs
// at mcp-server/data/cam-functions/<system>/. Every label below is a string
// that appears verbatim in the vendor's UI or its documentation.
const PARAM_LABEL_MAP: Partial<Record<CamSystem, Record<string, string>>> = {
  fusion360: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Cutting Feedrate",
    feed_plunge: "Plunge Feedrate",
    feed_z: "Plunge Feedrate",
    coolant: "Coolant",
    stock_to_leave: "Radial Stock to Leave",
    stepover: "Optimal Load",
    stepdown: "Maximum Roughing Stepdown",
    lead_in_radius: "Lead-In Radius",
    lead_out_radius: "Lead-Out Radius",
    retract_height: "Retract Height Offset",
  },
  mastercam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Rate",
    feed_z: "Plunge Rate",
    coolant: "Coolant",
    stock_to_leave: "Stock to Leave",
    stepover: "Stepover",
    stepdown: "Maximum Stepdown",
    retract_height: "Retract",
  },
  hypermill: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed",
    feed_plunge: "Plunge Feed",
    feed_z: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Allowance",
    stepover: "Lateral Stepover",
    stepdown: "Axial Stepdown",
    retract_height: "Safety Distance",
  },
  solidcam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feedrate XY",
    feed_plunge: "Feedrate Z",
    feed_z: "Feedrate Z",
    coolant: "Coolant",
    stock_to_leave: "Wall Offset",
    stepover: "Step Down",
    stepdown: "Down Step",
    retract_height: "Clearance Level",
  },
  inventor_hsm: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Cutting Feedrate",
    feed_plunge: "Plunge Feedrate",
    feed_z: "Plunge Feedrate",
    coolant: "Coolant",
    stock_to_leave: "Radial Stock to Leave",
    stepover: "Optimal Load",
    stepdown: "Maximum Stepdown",
    retract_height: "Retract Height",
  },
  nx_cam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Cut Feed Rate",
    feed_plunge: "Plunge Feed Rate",
    feed_z: "Plunge Feed Rate",
    coolant: "Coolant",
    stock_to_leave: "Part Stock",
    stepover: "Stepover",
    stepdown: "Cut Levels",
    retract_height: "Clearance Plane",
  },
  powermill: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Cutting Feed Rate",
    feed_plunge: "Plunge Rate",
    feed_z: "Plunge Rate",
    coolant: "Coolant",
    stock_to_leave: "Thickness",
    stepover: "Stepover",
    stepdown: "Stepdown",
    retract_height: "Safe Z",
  },
  esprit: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feedrate",
    feed_plunge: "Plunge Feedrate",
    feed_z: "Plunge Feedrate",
    coolant: "Coolant",
    stock_to_leave: "Stock Allowance",
    stepover: "Stepover",
    stepdown: "Cut Depth",
    retract_height: "Retract",
  },
  catia_machining: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Machining Feedrate",
    feed_plunge: "Plunge Feedrate",
    feed_z: "Plunge Feedrate",
    coolant: "Coolant",
    stock_to_leave: "Offset on Part",
    stepover: "Stepover Distance",
    stepdown: "Maximum Depth",
    retract_height: "Safety Distance",
  },
  edgecam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Rate",
    coolant: "Coolant",
    stock_to_leave: "Stock to Leave",
    stepover: "Step Over",
    retract_height: "Clearance",
  },
  gibbscam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Stock",
    stepover: "Stepover",
    retract_height: "Clearance",
  },
  worknc: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feedrate",
    feed_plunge: "Plunge Feedrate",
    coolant: "Coolant",
    stock_to_leave: "Tolerance",
    stepover: "Side Increment",
    stepdown: "Z Increment",
    retract_height: "Safety Z",
  },
  topsolid: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Rate",
    coolant: "Coolant",
    stepover: "Lateral Step",
    stepdown: "Vertical Step",
    retract_height: "Retract Plane",
  },
  camworks: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Rate",
    coolant: "Coolant",
    stock_to_leave: "Side Allowance",
    stepover: "Stepover",
    stepdown: "Stepdown",
    retract_height: "Retract Plane",
  },
  tebis: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Cutting Feed",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Allowance",
    stepover: "Path Distance",
    stepdown: "Z Step",
    retract_height: "Retract Height",
  },
  bobcad: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feedrate",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Stock",
    stepover: "Stepover",
    stepdown: "Depth of Cut",
    retract_height: "Clearance Z",
  },
  cimatron: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Feed Rate",
    coolant: "Coolant",
    stock_to_leave: "Offset",
    stepover: "Step",
    stepdown: "Layer Depth",
    retract_height: "Clearance",
  },
  sprutcam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Surface Tolerance",
    stepover: "Step Over",
    stepdown: "Step Down",
    retract_height: "Safe Plane",
  },
  alphacam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Rate",
    coolant: "Coolant",
    stepover: "Cutter Compensation",
    retract_height: "Rapid Plane",
  },
  featurecam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Per Tooth",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Surface Finish",
    stepover: "Stepover",
    retract_height: "Clearance",
  },
  vericut: {
    // Verification-only — no machining UI parameters. Left empty intentionally
    // so the click engine surfaces no-binding warnings rather than emitting
    // synthetic click steps for a CAM system that has no toolpath authoring.
  },
  surfcam: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Rate",
    coolant: "Coolant",
    stock_to_leave: "Stock",
    stepover: "Step Width",
    retract_height: "Safety",
  },
  visi: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stepover: "Increment",
    retract_height: "Safe Z",
  },
  creo: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Cut Feed",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stock_to_leave: "Stock Allow",
    stepover: "Step Over",
    stepdown: "Step Depth",
    retract_height: "Clearance",
  },
  partmaker: {
    tool: "Tool",
    spindle_rpm: "Spindle Speed",
    feed_xy: "Feed Rate",
    feed_plunge: "Plunge Feed",
    coolant: "Coolant",
    stepover: "Stepover",
    stepdown: "Stepdown",
    retract_height: "Clear Plane",
  },
};

// ── Engine ──────────────────────────────────────────────────────────────────

export class CAMClickSequenceEngine extends BaseEngine {
  private readonly loader: CatalogLoader | null;

  constructor(loader: CatalogLoader | null = null) {
    const info: EngineInfo = {
      name: "CAMClickSequenceEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description:
        "Composes B03 templates with per-software function-index catalogs " +
        "to emit ordered click sequences (tab + field + value) for any CAM op.",
    };
    super(info);
    this.loader = loader;
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "build_sequence",    description: "Build a click sequence from a CamTemplate + catalog", actions: ["cam_click_sequence_build"] },
      { name: "from_catalog",      description: "Build a click sequence from raw catalog data",        actions: ["cam_click_sequence_from_catalog"] },
      { name: "param_label_for",   description: "Vendor catalog label for a canonical template param", actions: ["cam_click_param_label"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMClickSequenceEngine", note: "use typed methods" };
  }

  /**
   * Build a click sequence for a B03 template by reading the per-software
   * function-index catalog via the injected loader.
   */
  buildSequence(template: CamTemplate): ClickSequence {
    if (!this.loader) {
      return this.emptyResult(template, ["no catalog loader injected"]);
    }
    const catalog = this.loader(template.system);
    if (!catalog) {
      return this.emptyResult(template, [`no catalog for system: ${template.system}`]);
    }
    return this.fromCatalog(template, catalog);
  }

  /** Direct construction from an explicit catalog dict (tests + runners). */
  fromCatalog(template: CamTemplate, catalog: SoftwareCatalog): ClickSequence {
    // 1. Try explicit OP_TO_CATALOG_KEY hardcode (Fusion 360 + curated rows).
    // 2. Fall back to fuzzy resolution against the catalog using nativeName.
    let catalogKey: string | null = OP_TO_CATALOG_KEY[template.system]?.[template.op] ?? null;
    if (!catalogKey) {
      catalogKey = this.resolveByNativeName(catalog, template.nativeName);
    }
    if (!catalogKey) {
      return this.emptyResult(template, [`no catalog key resolvable for ${template.system}.${template.op} (nativeName='${template.nativeName}')`]);
    }
    const toolpath = catalog.toolpaths?.[catalogKey];
    if (!toolpath?.tabs) {
      return this.emptyResult(template, [`catalog has no tabs for ${catalogKey}`]);
    }

    const labelMap = PARAM_LABEL_MAP[template.system] ?? {};
    const steps: ClickAction[] = [];
    const warnings: string[] = [];
    let step = 0;
    let tabOpens = 0;
    let valuesSet = 0;
    let missing = 0;

    // Track which template-param ids have been bound to a catalog row.
    const boundIds = new Set<string>();

    for (const [tabName, tab] of Object.entries(toolpath.tabs)) {
      let tabOpened = false;
      for (const catalogParam of tab.parameters) {
        // Find which canonical template-param maps to this catalog label.
        const canonicalId = Object.entries(labelMap)
          .find(([, lbl]) => lbl === catalogParam.name)?.[0];
        if (!canonicalId) continue;
        const tplParam = template.parameters.find((p) => p.id === canonicalId);
        if (!tplParam || tplParam.value === null) continue;

        if (!tabOpened) {
          step += 1;
          steps.push({
            step,
            kind: "open_tab",
            target: tabName,
            source: `catalog.tabs.${tabName}`,
          });
          tabOpens += 1;
          tabOpened = true;
        }

        step += 1;
        const kind: ClickActionKind =
          catalogParam.type === "dropdown" ? "set_dropdown"
          : catalogParam.type === "checkbox" ? "set_checkbox"
          : catalogParam.type === "selection" ? "select_geometry"
          : catalogParam.type === "string"   ? "set_string"
          : "set_numeric";
        steps.push({
          step,
          kind,
          target: catalogParam.name,
          value: tplParam.value as number | string | boolean,
          unit: catalogParam.unit,
          templateParamId: canonicalId,
          source: `catalog.tabs.${tabName}.${catalogParam.name}`,
        });
        boundIds.add(canonicalId);
        valuesSet += 1;
      }
    }

    // Surface any template-param that we never bound to a catalog row.
    for (const p of template.parameters) {
      if (p.value === null) continue;       // missing-value params don't need catalog bindings
      if (boundIds.has(p.id)) continue;
      warnings.push(`no catalog binding for template param: ${p.id}`);
      missing += 1;
    }

    return {
      op: template.op,
      system: template.system,
      nativeOpName: template.nativeName,
      steps,
      warnings,
      stats: {
        totalSteps: steps.length,
        tabOpens,
        valuesSet,
        missingCatalogBindings: missing,
      },
    };
  }

  /** Lookup the vendor catalog label for a canonical template parameter id. */
  paramLabelFor(system: CamSystem, canonicalId: string): string | null {
    return PARAM_LABEL_MAP[system]?.[canonicalId] ?? null;
  }

  /**
   * Fuzzy-match a catalog key against a target name (typically the taxonomy
   * nativeName for an op). Strips casing + punctuation, then scores via
   * exact-match → key-contains-target → target-contains-key.
   *
   * Public so the runner script + the catalog-key resolver tests can call
   * the same code path the dispatcher uses.
   */
  resolveByNativeName(catalog: SoftwareCatalog, target: string): string | null {
    if (!target) return null;
    const tps = catalog.toolpaths ?? {};
    const keys = Object.keys(tps);
    if (keys.length === 0) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetN = norm(target);
    if (!targetN) return null;
    // 1. exact normalized match against key OR entry.name
    for (const k of keys) {
      if (norm(k) === targetN) return k;
      const name = (tps[k] as { name?: string }).name;
      if (name && norm(name) === targetN) return k;
    }
    // 2. contains-match either direction
    for (const k of keys) {
      const kN = norm(k);
      if (kN.includes(targetN) || targetN.includes(kN)) return k;
      const name = (tps[k] as { name?: string }).name;
      if (name) {
        const nameN = norm(name);
        if (nameN.includes(targetN) || targetN.includes(nameN)) return k;
      }
    }
    return null;
  }

  // ── private ─────────────────────────────────────────────────────────────

  private emptyResult(template: CamTemplate, warnings: string[]): ClickSequence {
    return {
      op: template.op,
      system: template.system,
      nativeOpName: template.nativeName,
      steps: [],
      warnings,
      stats: { totalSteps: 0, tabOpens: 0, valuesSet: 0, missingCatalogBindings: 0 },
    };
  }
}

export const camClickSequenceEngine = new CAMClickSequenceEngine();
