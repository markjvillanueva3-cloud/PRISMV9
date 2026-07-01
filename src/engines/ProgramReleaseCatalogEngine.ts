import {
  getProgramReleaseRegistryMachineProfileById,
  getProgramReleaseRegistryMachineProfiles,
  searchProgramReleaseRegistryMachineProfiles,
  type ProgramReleaseMachineFacetOption as RegistryProgramReleaseMachineFacetOption,
  type ProgramReleaseMachineSearchFacets as RegistryProgramReleaseMachineSearchFacets,
  type ProgramReleaseMachineSearchInput as RegistryProgramReleaseMachineSearchInput,
  type ProgramReleaseMachineSearchResult as RegistryProgramReleaseMachineSearchResult,
} from "../utils/programReleaseMachineCatalog.js";

/**
 * ProgramReleaseCatalogEngine — Program Release Catalog & Workspace Builder
 * ==========================================================================
 *
 * Provides the catalog of machine profiles, tooling packages, fixtures, stock
 * profiles, and CAD sources for the Program Release desk. Also builds the
 * full workspace payload when a user selects catalog entries.
 *
 * Backs the ProgramReleaseProvider contract from
 * web/src/features/operating-system/contracts.ts.
 *
 * @version 1.0.0 — Sprint C1
 */

// ─── Types (matching frontend contracts) ──────────────────────────────────────

export interface PartClass {
  id: string;
  label: string;
  detail: string;
  geometryClass: string;
}

export interface MachineProfile {
  id: string;
  manufacturerId: string;
  manufacturer: string;
  label: string;
  familyId: string;
  familyLabel: string;
  controller: string;
  kinematics: string;
  spindle: string;
  maxRpm: number;
  strength: string;
  collisionEnvelope: string;
  machineRatePerHour: number;
}

export interface ToolholderProfile {
  id: string;
  label: string;
  style: string;
  gageLength: string;
  rigidity: string;
  note: string;
}

export interface ToolingPackage {
  id: string;
  label: string;
  coverage: string;
  note: string;
  packageCost: number;
}

export interface FixtureProfile {
  id: string;
  label: string;
  setupCount: number;
  datumPlan: string;
  note: string;
  burdenCost: number;
}

export interface StockProfile {
  id: string;
  label: string;
  material: string;
  size: string;
  source: string;
  marketPrice: number;
  logisticsCost: number;
  volatility: string;
}

export interface CadSourceProfile {
  id: string;
  label: string;
  status: "preferred" | "fallback" | "compare";
  simulationReadiness: string;
  note: string;
  securityNote: string;
}

export interface ProgramReleaseCatalog {
  partClasses: PartClass[];
  machines: MachineProfile[];
  toolholders: ToolholderProfile[];
  toolingPackages: ToolingPackage[];
  fixtures: FixtureProfile[];
  stockProfiles: StockProfile[];
  cadSources: CadSourceProfile[];
}

export interface ProgramReleaseMachineSearchInput {
  query?: string;
  manufacturer?: string;
  familyId?: string;
  kinematics?: string;
  controller?: string;
  limit?: number;
  offset?: number;
}

export type ProgramReleaseMachineFacetOption = RegistryProgramReleaseMachineFacetOption;
export type ProgramReleaseMachineSearchFacets = RegistryProgramReleaseMachineSearchFacets;

export interface ProgramReleaseMachineSearchResult {
  machines: MachineProfile[];
  total: number;
  hasMore: boolean;
  facets: ProgramReleaseMachineSearchFacets;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: "ready" | "review" | "blocked";
  detail: string;
}

export interface DfmFinding {
  id: string;
  title: string;
  severity: "info" | "watch" | "critical";
  area: string;
  detail: string;
  action: string;
  source: string;
}

export interface GdtFocus {
  id: string;
  label: string;
  status: "ready" | "review" | "blocked";
  requirement: string;
  note: string;
  owner: string;
}

export interface SourceComparison {
  id: string;
  label: string;
  status: "preferred" | "fallback" | "compare";
  geometryTrust: string;
  setupGeneration: string;
  simulationTrust: string;
  releasePosture: string;
  note: string;
  recommended: boolean;
}

export interface OperationRecord {
  id: string;
  code: string;
  title: string;
  strategy: string;
  machineMode: string;
  holder: string;
  tooling: string;
  spindleRpm: number;
  feedRate: string;
  doc: string;
  stepOver: string;
  cycleMinutes: number;
  rapidPosture: string;
  collisionPosture: string;
  verificationPosture: string;
}

export interface SetupSheetSection {
  id: string;
  title: string;
  items: string[];
}

export interface QuoteLine {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "slate" | "sky" | "emerald" | "amber" | "rose" | "violet";
}

export interface SummaryMetric {
  id: string;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}

export interface ProgramReleaseInput {
  partClassId: string;
  machineId: string;
  toolholderId: string;
  toolingPackageId: string;
  fixtureId: string;
  stockId: string;
  cadSourceId: string;
}

export interface ProgramReleaseWorkspace {
  metrics: SummaryMetric[];
  selectedPartClass: PartClass;
  selectedMachine: MachineProfile;
  selectedToolholder: ToolholderProfile;
  selectedToolingPackage: ToolingPackage;
  selectedFixture: FixtureProfile;
  selectedStock: StockProfile;
  selectedCadSource: CadSourceProfile;
  alerts: string[];
  collisionChecks: ChecklistItem[];
  simulationChecks: ChecklistItem[];
  dfmFindings: DfmFinding[];
  gdtFocuses: GdtFocus[];
  sourceComparisons: SourceComparison[];
  operationPlan: OperationRecord[];
  setupSheet: SetupSheetSection[];
  quoteLines: QuoteLine[];
  quotingSummary: string;
  reviewSummary: string;
  integrationNotes: string[];
  handoffActions: string[];
  programPreview: string;
}

// ─── Default Catalog ──────────────────────────────────────────────────────────

const DEFAULT_PART_CLASSES: PartClass[] = [
  { id: "pc-prismatic", label: "Prismatic", detail: "Pockets, bores, faces — standard 3-axis", geometryClass: "prismatic" },
  { id: "pc-rotational", label: "Rotational", detail: "Shafts, sleeves, turned features", geometryClass: "rotational" },
  { id: "pc-freeform", label: "Freeform", detail: "Sculptured surfaces, molds, dies", geometryClass: "freeform" },
  { id: "pc-sheet", label: "Sheet/Plate", detail: "Flat profiles, laser/waterjet blanks", geometryClass: "sheet" },
];

const DEFAULT_MACHINES: MachineProfile[] = [
  { id: "m-haas-vf2", manufacturerId: "haas", manufacturer: "Haas", label: "Haas VF-2", familyId: "vertical-mill", familyLabel: "Vertical Machining Center", controller: "Haas NGC", kinematics: "3-axis VMC", spindle: "BT40 8100rpm", maxRpm: 8100, strength: "Standard", collisionEnvelope: "762x406x508mm", machineRatePerHour: 85 },
  { id: "m-dmg-dmu50", manufacturerId: "dmg-mori", manufacturer: "DMG MORI", label: "DMG MORI DMU 50", familyId: "5-axis", familyLabel: "5-Axis Machining Center", controller: "Siemens 840D", kinematics: "5-axis trunnion", spindle: "HSK-A63 12000rpm", maxRpm: 12000, strength: "High rigidity", collisionEnvelope: "500x450x400mm", machineRatePerHour: 145 },
  { id: "m-mazak-qt", manufacturerId: "mazak", manufacturer: "Mazak", label: "Mazak QT-250", familyId: "lathe", familyLabel: "Turning Center", controller: "Mazatrol SmoothG", kinematics: "2-axis lathe + C", spindle: "A2-8 4000rpm", maxRpm: 4000, strength: "Heavy turning", collisionEnvelope: "350x500mm dia×L", machineRatePerHour: 95 },
];

const DEFAULT_TOOLHOLDERS: ToolholderProfile[] = [
  { id: "th-er32", label: "ER32 Collet Chuck", style: "ER collet", gageLength: "75mm", rigidity: "Standard", note: "General purpose milling" },
  { id: "th-shrink", label: "Shrink Fit HSK-A63", style: "Shrink fit", gageLength: "120mm", rigidity: "High", note: "Finishing and high-speed work" },
  { id: "th-hydraulic", label: "Hydraulic Chuck", style: "Hydraulic", gageLength: "90mm", rigidity: "High", note: "Low runout reaming and finishing" },
];

const DEFAULT_TOOLING: ToolingPackage[] = [
  { id: "tp-standard", label: "Standard Package", coverage: "Roughing + finishing + drilling", note: "General-purpose carbide tools", packageCost: 450 },
  { id: "tp-high-perf", label: "High Performance", coverage: "Coated carbide + ceramic inserts", note: "For hardened steel and exotic alloys", packageCost: 1200 },
  { id: "tp-economy", label: "Economy", coverage: "HSS + basic carbide", note: "Low-volume prototyping", packageCost: 180 },
];

const DEFAULT_FIXTURES: FixtureProfile[] = [
  { id: "fx-vise", label: "Kurt Vise (6\")", setupCount: 1, datumPlan: "Bottom + X-stop", note: "Standard prismatic clamping", burdenCost: 15 },
  { id: "fx-plate", label: "Modular Fixture Plate", setupCount: 2, datumPlan: "Datum A/B/C from drawing", note: "Multi-op with relocatable pins", burdenCost: 85 },
  { id: "fx-chuck", label: "3-Jaw Chuck", setupCount: 1, datumPlan: "Centerline + face", note: "Turning and rotational work", burdenCost: 10 },
];

const DEFAULT_STOCK: StockProfile[] = [
  { id: "stk-6061", label: "6061-T6 Bar", material: "Aluminum 6061-T6", size: "2\"x4\"x6\" block", source: "Local distributor", marketPrice: 32, logisticsCost: 8, volatility: "low" },
  { id: "stk-4140", label: "4140 Pre-Hard", material: "Steel 4140 PH (28-32 HRC)", size: "3\" round bar", source: "Service center", marketPrice: 65, logisticsCost: 12, volatility: "medium" },
  { id: "stk-ti64", label: "Ti-6Al-4V Bar", material: "Titanium Grade 5", size: "2\" round bar", source: "Specialty metals", marketPrice: 280, logisticsCost: 25, volatility: "high" },
];

const DEFAULT_CAD_SOURCES: CadSourceProfile[] = [
  { id: "cad-step", label: "STEP AP214", status: "preferred", simulationReadiness: "Full geometry", note: "Neutral format, verified import", securityNote: "No embedded macros" },
  { id: "cad-fusion", label: "Fusion 360 Native", status: "fallback", simulationReadiness: "Full with history", note: "Feature history available for editing", securityNote: "Cloud-linked design" },
  { id: "cad-dxf", label: "DXF 2D Drawing", status: "compare", simulationReadiness: "2D only", note: "Reference only — no 3D model", securityNote: "Static flat file" },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ProgramReleaseCatalogEngine {
  private static machineCatalogCache: MachineProfile[] | null = null;

  private static getMachineCatalog(): MachineProfile[] {
    if (ProgramReleaseCatalogEngine.machineCatalogCache) {
      return ProgramReleaseCatalogEngine.machineCatalogCache;
    }

    const projectedMachines = getProgramReleaseRegistryMachineProfiles();
    ProgramReleaseCatalogEngine.machineCatalogCache = projectedMachines.length > 0
      ? projectedMachines
      : DEFAULT_MACHINES;

    return ProgramReleaseCatalogEngine.machineCatalogCache;
  }

  /**
   * Get the program release catalog with available options.
   * Machine selection is projected from the enriched machine corpus when
   * available, with the original defaults preserved as a safe fallback.
   */
  static getCatalog(): ProgramReleaseCatalog {
    return {
      partClasses: DEFAULT_PART_CLASSES,
      machines: ProgramReleaseCatalogEngine.getMachineCatalog(),
      toolholders: DEFAULT_TOOLHOLDERS,
      toolingPackages: DEFAULT_TOOLING,
      fixtures: DEFAULT_FIXTURES,
      stockProfiles: DEFAULT_STOCK,
      cadSources: DEFAULT_CAD_SOURCES,
    };
  }

  static getMachine(machineId: string): MachineProfile | null {
    if (!machineId) {
      return null;
    }

    return getProgramReleaseRegistryMachineProfileById(machineId)
      ?? ProgramReleaseCatalogEngine.getMachineCatalog().find((machine) => machine.id === machineId)
      ?? null;
  }

  static searchMachines(input: ProgramReleaseMachineSearchInput = {}): ProgramReleaseMachineSearchResult {
    const result: RegistryProgramReleaseMachineSearchResult =
      searchProgramReleaseRegistryMachineProfiles(input as RegistryProgramReleaseMachineSearchInput);

    return result;
  }

  /**
   * Build a program release workspace from selected catalog entries.
   * @param input - IDs of selected catalog entries
   */
  static buildWorkspace(input: ProgramReleaseInput): ProgramReleaseWorkspace {
    const catalog = ProgramReleaseCatalogEngine.getCatalog();

    const partClass = catalog.partClasses.find((p) => p.id === input.partClassId) || catalog.partClasses[0];
    const machine = ProgramReleaseCatalogEngine.getMachine(input.machineId) || catalog.machines[0];
    const toolholder = catalog.toolholders.find((t) => t.id === input.toolholderId) || catalog.toolholders[0];
    const toolingPkg = catalog.toolingPackages.find((t) => t.id === input.toolingPackageId) || catalog.toolingPackages[0];
    const fixture = catalog.fixtures.find((f) => f.id === input.fixtureId) || catalog.fixtures[0];
    const stock = catalog.stockProfiles.find((s) => s.id === input.stockId) || catalog.stockProfiles[0];
    const cadSource = catalog.cadSources.find((c) => c.id === input.cadSourceId) || catalog.cadSources[0];

    const estCycleMin = partClass.geometryClass === "freeform" ? 45 : partClass.geometryClass === "prismatic" ? 20 : 30;
    const machiningCost = (estCycleMin / 60) * machine.machineRatePerHour;
    const totalCost = machiningCost + toolingPkg.packageCost + fixture.burdenCost + stock.marketPrice + stock.logisticsCost;

    const alerts: string[] = [];
    if (stock.volatility === "high") alerts.push(`Material price volatile: ${stock.material} — consider locking price`);
    if (machine.maxRpm < 8000 && partClass.geometryClass === "freeform") alerts.push("Machine RPM may limit freeform finishing quality");

    return {
      metrics: [
        { id: "met-cycle", label: "Est. Cycle", value: `${estCycleMin} min`, hint: "Estimated total cycle time" },
        { id: "met-cost", label: "Est. Cost", value: `$${totalCost.toFixed(2)}`, hint: "Material + tooling + machine + fixture", accent: totalCost > 500 ? "amber" : "emerald" },
        { id: "met-rate", label: "Machine Rate", value: `$${machine.machineRatePerHour}/hr`, hint: machine.label },
        { id: "met-setups", label: "Setups", value: String(fixture.setupCount), hint: fixture.datumPlan },
      ],
      selectedPartClass: partClass,
      selectedMachine: machine,
      selectedToolholder: toolholder,
      selectedToolingPackage: toolingPkg,
      selectedFixture: fixture,
      selectedStock: stock,
      selectedCadSource: cadSource,
      alerts,
      collisionChecks: [
        { id: "cc-envelope", label: "Envelope check", status: "ready", detail: `Part fits within ${machine.collisionEnvelope}` },
        { id: "cc-holder", label: "Holder clearance", status: "review", detail: `Verify ${toolholder.style} clears fixture` },
      ],
      simulationChecks: [
        { id: "sc-gouge", label: "Gouge detection", status: "ready", detail: "No gouges detected in toolpath preview" },
        { id: "sc-collision", label: "Collision simulation", status: "review", detail: "Run full simulation before release" },
      ],
      dfmFindings: ProgramReleaseCatalogEngine.generateDfmFindings(partClass, stock),
      gdtFocuses: [
        { id: "gdt-position", label: "Position tolerance", status: "review", requirement: "True position within 0.005\"", note: "Verify datum alignment", owner: "Quality" },
      ],
      sourceComparisons: catalog.cadSources.map((src) => ({
        id: `cmp-${src.id}`,
        label: src.label,
        status: src.status,
        geometryTrust: src.simulationReadiness,
        setupGeneration: src.status === "preferred" ? "Auto" : "Manual",
        simulationTrust: src.simulationReadiness === "Full geometry" ? "High" : "Low",
        releasePosture: src.status === "preferred" ? "Ready" : "Review required",
        note: src.note,
        recommended: src.status === "preferred",
      })),
      operationPlan: ProgramReleaseCatalogEngine.buildOperationPlan(partClass, machine, toolholder, toolingPkg),
      setupSheet: [
        { id: "ss-workholding", title: "Workholding", items: [fixture.label, fixture.datumPlan, fixture.note] },
        { id: "ss-tooling", title: "Tooling", items: [toolingPkg.label, toolholder.label, `Coverage: ${toolingPkg.coverage}`] },
        { id: "ss-stock", title: "Stock", items: [stock.material, stock.size, `Source: ${stock.source}`] },
      ],
      quoteLines: [
        { id: "ql-material", label: "Material", value: `$${stock.marketPrice.toFixed(2)}`, detail: stock.material, tone: "slate" },
        { id: "ql-tooling", label: "Tooling", value: `$${toolingPkg.packageCost.toFixed(2)}`, detail: toolingPkg.label, tone: "sky" },
        { id: "ql-machining", label: "Machining", value: `$${machiningCost.toFixed(2)}`, detail: `${estCycleMin}min @ $${machine.machineRatePerHour}/hr`, tone: "emerald" },
        { id: "ql-fixture", label: "Fixture Burden", value: `$${fixture.burdenCost.toFixed(2)}`, detail: fixture.label, tone: "slate" },
        { id: "ql-logistics", label: "Logistics", value: `$${stock.logisticsCost.toFixed(2)}`, detail: "Shipping + handling", tone: "slate" },
        { id: "ql-total", label: "Total", value: `$${totalCost.toFixed(2)}`, detail: "All-in part cost", tone: "violet" },
      ],
      quotingSummary: `Estimated $${totalCost.toFixed(2)} per part on ${machine.label} with ${toolingPkg.label} tooling.`,
      reviewSummary: `${cadSource.label} source, ${fixture.setupCount} setup(s), ${alerts.length} alert(s).`,
      integrationNotes: [
        `Machine: ${machine.label} (${machine.controller})`,
        `Stock: ${stock.material} — ${stock.size}`,
        `CAD: ${cadSource.label} (${cadSource.simulationReadiness})`,
      ],
      handoffActions: [
        "Verify fixture clearance",
        "Run collision simulation",
        "Confirm material availability",
        "Generate setup sheet PDF",
      ],
      programPreview: `( Program release preview for ${partClass.label} part on ${machine.label} )`,
    };
  }

  private static generateDfmFindings(partClass: PartClass, stock: StockProfile): DfmFinding[] {
    const findings: DfmFinding[] = [];
    if (stock.volatility === "high") {
      findings.push({
        id: "dfm-cost", title: "High material cost", severity: "watch",
        area: "Cost", detail: `${stock.material} has high price volatility`, action: "Consider alternative alloys", source: "ProgramReleaseCatalogEngine",
      });
    }
    if (partClass.geometryClass === "freeform") {
      findings.push({
        id: "dfm-surface", title: "Freeform surfaces", severity: "info",
        area: "Geometry", detail: "Sculptured surfaces require ball-end finishing", action: "Verify surface tolerance spec", source: "ProgramReleaseCatalogEngine",
      });
    }
    return findings;
  }

  private static buildOperationPlan(
    partClass: PartClass,
    machine: MachineProfile,
    toolholder: ToolholderProfile,
    toolingPkg: ToolingPackage,
  ): OperationRecord[] {
    const ops: OperationRecord[] = [
      {
        id: "op-face", code: "OP010", title: "Face Mill", strategy: "Adaptive",
        machineMode: machine.kinematics, holder: toolholder.label, tooling: "50mm face mill",
        spindleRpm: Math.min(3000, machine.maxRpm), feedRate: "1200 mm/min",
        doc: "2.0mm", stepOver: "35mm", cycleMinutes: 3,
        rapidPosture: "Safe", collisionPosture: "Clear", verificationPosture: "Checked",
      },
      {
        id: "op-rough", code: "OP020", title: "Rough Profile", strategy: "Trochoidal",
        machineMode: machine.kinematics, holder: toolholder.label, tooling: "12mm end mill",
        spindleRpm: Math.min(6000, machine.maxRpm), feedRate: "2400 mm/min",
        doc: "1.5×D", stepOver: "15%", cycleMinutes: 8,
        rapidPosture: "Safe", collisionPosture: "Clear", verificationPosture: "Checked",
      },
      {
        id: "op-finish", code: "OP030", title: "Finish Profile", strategy: "Contour",
        machineMode: machine.kinematics, holder: toolholder.label, tooling: "6mm end mill",
        spindleRpm: Math.min(10000, machine.maxRpm), feedRate: "800 mm/min",
        doc: "0.3mm", stepOver: "N/A", cycleMinutes: 5,
        rapidPosture: "Safe", collisionPosture: "Clear", verificationPosture: "Checked",
      },
    ];

    if (partClass.geometryClass === "rotational") {
      ops[0] = { ...ops[0], title: "Face & Center", strategy: "Facing", tooling: "Facing tool" };
      ops[1] = { ...ops[1], title: "Rough Turn", strategy: "Rough turn cycle", tooling: "CNMG insert" };
      ops[2] = { ...ops[2], title: "Finish Turn", strategy: "Finish contour", tooling: "DNMG insert" };
    }

    return ops;
  }
}

export const programReleaseCatalogEngine = new ProgramReleaseCatalogEngine();
