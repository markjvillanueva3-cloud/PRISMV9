import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";
import type {
  ControllerPackage,
  CoolantStrategyOption,
  KinematicPackage,
  MachineCapabilitySnapshot,
  MachineOptionSource,
  MachineAxisTopology,
  SpindlePackageOption,
  UserMachineProfileOverlay,
} from "../contracts/userMachineProfile.js";

export interface ProgramReleaseMachineCatalogProfile {
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

export interface ProgramReleaseMachineSearchInput {
  query?: string;
  manufacturer?: string;
  familyId?: string;
  kinematics?: string;
  controller?: string;
  limit?: number;
  offset?: number;
}

export interface ProgramReleaseMachineFacetOption {
  id?: string;
  label?: string;
  value: string;
  count: number;
}

export interface ProgramReleaseMachineSearchFacets {
  manufacturers: ProgramReleaseMachineFacetOption[];
  families: ProgramReleaseMachineFacetOption[];
  kinematics: ProgramReleaseMachineFacetOption[];
  controllers: ProgramReleaseMachineFacetOption[];
}

export interface ProgramReleaseMachineSearchResult {
  machines: ProgramReleaseMachineCatalogProfile[];
  total: number;
  hasMore: boolean;
  facets: ProgramReleaseMachineSearchFacets;
}

export interface ProgramReleaseMachineProfileSelectionInput {
  userId: string;
  workspaceId?: string;
  machineId: string;
  displayName?: string;
  enabledControllerFeatureIds?: string[];
  enabledCoolantStrategyIds?: string[];
  preferredToolingFamilies?: string[];
  preferredToolpathFamilies?: string[];
  notes?: string[];
  tags?: string[];
}

type RawMachineRecord = Record<string, unknown>;

const MACHINE_CATALOG_PATHS = [
  path.join(PATHS.DATA_DIR, "machines", "ENHANCED", "json", "ALL_MACHINES_ENRICHED.json"),
  path.join(PATHS.DATA_DIR, "machines", "ENHANCED", "json", "ALL_MACHINES.json"),
];

let cachedCatalogProfiles: ProgramReleaseMachineCatalogProfile[] | null = null;

const MANUFACTURER_DISPLAY_OVERRIDES: Record<string, string> = {
  "dmg mori": "DMG MORI",
  "dmg-mori": "DMG MORI",
};

function asRecord(value: unknown): RawMachineRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as RawMachineRecord)
    : null;
}

function safeNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readText(value: unknown, nestedKeys: string[] = []): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  const record = asRecord(value);
  if (!record) return "";

  for (const key of nestedKeys) {
    const nested = readText(record[key]);
    if (nested) return nested;
  }

  return "";
}

function humanizeToken(value: string): string {
  return value
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeManufacturer(raw: RawMachineRecord): string {
  const manufacturer = readText(raw.manufacturer, ["name", "label", "brand"])
    || readText(raw.brand, ["name", "label"])
    || readText(asRecord(raw.controller)?.manufacturer)
    || readText(asRecord(raw.controller)?.brand)
    || "Unknown";

  const normalized = manufacturer === manufacturer.toUpperCase()
    ? humanizeToken(manufacturer.toLowerCase())
    : humanizeToken(manufacturer);
  return MANUFACTURER_DISPLAY_OVERRIDES[normalized.toLowerCase()] ?? normalized;
}

function stripLeadingManufacturer(manufacturer: string, value: string): string {
  const normalized = manufacturer.trim().toLowerCase();
  const trimmed = value.trim();
  if (!normalized || !trimmed) return trimmed;

  return trimmed.replace(new RegExp(`^${normalized}(?:[\\s_-]+|$)`, "i"), "").trim();
}

function normalizeMachineModel(manufacturer: string, raw: RawMachineRecord): string {
  const rawModel = readText(raw.model, ["name", "label"])
    || readText(raw.name, ["name", "label"])
    || readText(raw.series, ["name", "label"])
    || readText(raw.id);
  const withoutManufacturer = stripLeadingManufacturer(manufacturer, rawModel);
  const cleaned = withoutManufacturer
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((token) => {
      if (!/[A-Za-z]/.test(token)) return token;
      if (/^[a-z0-9-]+$/i.test(token) && (/[0-9]/.test(token) || token.length <= 4)) {
        return token.toUpperCase();
      }
      if (token === token.toLowerCase()) {
        return token.charAt(0).toUpperCase() + token.slice(1);
      }
      return token;
    })
    .join(" ")
    .replace(/([A-Z0-9])\s+([345]AX)\b/g, "$1-$2")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

function buildSignature(raw: RawMachineRecord): string {
  return [
    raw.type,
    raw.subtype,
    raw.description,
    raw.name,
    raw.model,
    raw.machine_type,
    raw.category,
    readText(asRecord(raw.controller)?.type),
    readText(asRecord(raw.controller)?.cnc_type),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isProgramReleaseCompatible(raw: RawMachineRecord): boolean {
  const signature = buildSignature(raw);
  const spindle = asRecord(raw.spindle);
  const maxRpm = Math.max(
    safeNum(spindle?.max_rpm),
    safeNum(spindle?.rpm),
    safeNum(raw.max_rpm),
  );

  if (maxRpm <= 0) return false;

  return !/(wire edm|sinker|edm|laser|waterjet|grind|grinder)/.test(signature);
}

function inferKinematics(raw: RawMachineRecord): string {
  const signature = buildSignature(raw);
  const simultaneousAxes = safeNum(raw.simultaneous_axes);
  const workEnvelope = asRecord(raw.work_envelope);

  if (/mill-turn|mill turn|multi-task|multitask|multus|integrex/.test(signature)) {
    return "Mill-turn multitasking";
  }
  if (/swiss|cincom|guide bushing/.test(signature)) {
    return "Swiss-type lathe";
  }
  if (/lathe|turning center|quick turn|sub-spindle|sub spindle|counter spindle/.test(signature)) {
    return /c-axis|y-axis|live tooling|live-tool/.test(signature)
      ? "C/Y live-tool lathe"
      : "Turning center";
  }
  if (/double_column|bridge|gantry/.test(signature)) {
    return simultaneousAxes >= 5 ? "5-axis gantry" : "Bridge machining center";
  }
  if (/horizontal|\bhmc\b|pallet/.test(signature)) {
    return simultaneousAxes >= 5 ? "5-axis horizontal" : "Horizontal machining center";
  }
  if (
    simultaneousAxes >= 5
    || /5axis|5-axis|5_axis|trunnion|a-axis|b-axis/.test(signature)
    || workEnvelope?.a_axis
    || workEnvelope?.b_axis
    || workEnvelope?.c_axis
  ) {
    return "5-axis trunnion";
  }
  if (/drill[_ -]?tap|drill and tap|robodrill/.test(signature)) {
    return "Drill/tap center";
  }
  if (/router/.test(signature)) {
    return "CNC router";
  }
  return "3-axis VMC";
}

function inferMachineFamily(raw: RawMachineRecord, kinematics: string): { id: string; label: string } {
  const signature = buildSignature(raw);
  const normalizedKinematics = kinematics.toLowerCase();

  if (/mill-turn multitasking/.test(normalizedKinematics)) {
    return { id: "mill-turn", label: "Mill-Turn / Multi-Tasking" };
  }
  if (/swiss-type lathe/.test(normalizedKinematics)) {
    return { id: "swiss", label: "Swiss-Type Lathe" };
  }
  if (/turning center|live-tool lathe/.test(normalizedKinematics)) {
    return { id: "lathe", label: /live-tool/.test(normalizedKinematics) ? "Live-Tool Turning Center" : "Turning Center" };
  }
  if (/bridge machining center|gantry/.test(normalizedKinematics)) {
    return { id: "gantry", label: "Gantry / Bridge Mill" };
  }
  if (/horizontal machining center/.test(normalizedKinematics)) {
    return { id: "horizontal-mill", label: "Horizontal Machining Center" };
  }
  if (/5-axis/.test(normalizedKinematics)) {
    return { id: "5-axis", label: "5-Axis Machining Center" };
  }
  if (/drill\/tap/.test(normalizedKinematics) || /drill[_ -]?tap|robodrill/.test(signature)) {
    return { id: "drill-tap", label: "Drill / Tap Center" };
  }
  if (/router/.test(normalizedKinematics)) {
    return { id: "router", label: "CNC Router" };
  }
  return { id: "vertical-mill", label: "Vertical Machining Center" };
}

function formatController(raw: RawMachineRecord): string {
  const controller = asRecord(raw.controller);
  const controllerType = readText(controller?.type);
  if (controllerType && !/unknown/i.test(controllerType)) return controllerType;

  const manufacturer = readText(controller?.manufacturer) || readText(controller?.brand);
  const model = readText(controller?.model) || readText(controller?.cnc_type);
  const joined = [manufacturer, model].filter(Boolean).join(" ").trim();
  return joined || "Controller not published";
}

function formatSpindle(raw: RawMachineRecord): { label: string; maxRpm: number; powerKw: number } {
  const spindle = asRecord(raw.spindle);
  const maxRpm = Math.max(
    safeNum(spindle?.max_rpm),
    safeNum(spindle?.rpm),
    safeNum(raw.max_rpm),
  );
  const powerKw = Math.max(
    safeNum(spindle?.power_continuous),
    safeNum(spindle?.power_kw),
    safeNum(raw.power_kw),
  );
  const taper = readText(spindle?.spindle_nose)
    || readText(spindle?.taper)
    || readText(raw.tool_interface)
    || "Spindle";
  const rpmLabel = maxRpm > 0 ? `${Math.round(maxRpm).toLocaleString("en-US")}rpm` : "rpm not published";

  return {
    label: `${taper} ${rpmLabel}`.trim(),
    maxRpm,
    powerKw,
  };
}

function formatCollisionEnvelope(raw: RawMachineRecord): string {
  const travels = asRecord(raw.travels);
  const workEnvelope = asRecord(raw.work_envelope);
  const envelope = asRecord(raw.envelope);
  const collisionModel = asRecord(raw.collision_model);
  const collisionWorkVolume = asRecord(collisionModel?.work_volume);

  const x = Math.max(
    safeNum(travels?.x),
    safeNum(workEnvelope?.x),
    safeNum(workEnvelope?.x_mm),
    safeNum(envelope?.x_travel),
    safeNum(collisionWorkVolume?.x),
  );
  const y = Math.max(
    safeNum(travels?.y),
    safeNum(workEnvelope?.y),
    safeNum(workEnvelope?.y_mm),
    safeNum(envelope?.y_travel),
    safeNum(collisionWorkVolume?.y),
  );
  const z = Math.max(
    safeNum(travels?.z),
    safeNum(workEnvelope?.z),
    safeNum(workEnvelope?.z_mm),
    safeNum(envelope?.z_travel),
    safeNum(collisionWorkVolume?.z),
  );

  if (x > 0 && y > 0 && z > 0) {
    return `${Math.round(x)}x${Math.round(y)}x${Math.round(z)}mm`;
  }

  const table = asRecord(raw.table);
  const tableLength = Math.max(safeNum(table?.length), safeNum(table?.table_length));
  const tableWidth = Math.max(safeNum(table?.width), safeNum(table?.table_width));
  if (tableLength > 0 && tableWidth > 0) {
    return `${Math.round(tableLength)}x${Math.round(tableWidth)}mm table`;
  }

  return "Envelope not published";
}

function inferStrength(raw: RawMachineRecord, kinematics: string, maxRpm: number, powerKw: number): string {
  const signature = buildSignature(raw);
  const weightKg = Math.max(safeNum(raw.weight), safeNum(raw.weight_kg));

  if (/bridge machining center|gantry/.test(kinematics.toLowerCase())) {
    return "Heavy roughing / mold work";
  }
  if (/mill-turn/.test(kinematics.toLowerCase())) {
    return "Complex multi-op done-in-one";
  }
  if (/swiss/.test(kinematics.toLowerCase())) {
    return "Small-part high-throughput turning";
  }
  if (/turning center/.test(kinematics.toLowerCase())) {
    return powerKw >= 25 || weightKg >= 5000 ? "Heavy turning" : "General-purpose turning";
  }
  if (/horizontal machining center/.test(kinematics.toLowerCase())) {
    return "Palletized heavy metal removal";
  }
  if (/5-axis/.test(kinematics.toLowerCase())) {
    return maxRpm >= 15000 ? "5-axis contouring / high-speed finishing" : "5-axis contouring";
  }
  if (/drill\/tap/.test(kinematics.toLowerCase())) {
    return "High-speed small-tool work";
  }
  if (/router/.test(kinematics.toLowerCase())) {
    return "High-speed light-cut routing";
  }
  if (maxRpm >= 18000) return "High-speed finishing";
  if (powerKw >= 30 || /box way/.test(signature)) return "High-torque roughing";
  return "General-purpose machining";
}

function inferMachineRate(raw: RawMachineRecord, kinematics: string, maxRpm: number, powerKw: number): number {
  const signature = buildSignature(raw);
  let rate = 110;

  if (/mill-turn/.test(kinematics.toLowerCase())) rate = 185;
  else if (/swiss/.test(kinematics.toLowerCase())) rate = 135;
  else if (/turning center/.test(kinematics.toLowerCase())) rate = 105;
  else if (/bridge machining center|gantry/.test(kinematics.toLowerCase())) rate = 190;
  else if (/horizontal machining center/.test(kinematics.toLowerCase())) rate = 145;
  else if (/5-axis/.test(kinematics.toLowerCase())) rate = 165;
  else if (/drill\/tap/.test(kinematics.toLowerCase())) rate = 95;

  if (maxRpm >= 18000) rate += 10;
  if (powerKw >= 30) rate += 10;
  if (/automation|pallet/.test(signature)) rate += 5;

  return rate;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeAvailability(source: MachineOptionSource = "catalog") {
  return { enabled: true, source, confidence: 0.56 as const };
}

function inferTopology(familyId: string, kinematics: string): MachineAxisTopology {
  const normalizedFamily = familyId.toLowerCase();
  const normalizedKinematics = kinematics.toLowerCase();

  if (normalizedFamily === "mill-turn") return "mill_turn";
  if (normalizedFamily === "swiss") return "swiss";
  if (normalizedFamily === "lathe") {
    return /live-tool|y-axis|c\/y/i.test(normalizedKinematics) ? "y_axis_lathe" : "2_axis_lathe";
  }
  if (normalizedFamily === "horizontal-mill") {
    return normalizedKinematics.includes("5-axis") ? "5_axis_horizontal" : "3_axis_horizontal";
  }
  if (normalizedFamily === "gantry") {
    return normalizedKinematics.includes("5-axis") ? "5_axis_vertical" : "3_axis_vertical";
  }
  if (normalizedFamily === "5-axis") return "5_axis_vertical";
  if (normalizedFamily === "drill-tap") return "3_axis_vertical";
  if (normalizedFamily === "router") return "router";
  return "3_axis_vertical";
}

function buildControllerPackage(machine: ProgramReleaseMachineCatalogProfile): ControllerPackage {
  const controllerId = slugify(machine.controller) || "controller";
  return {
    controllerId,
    controllerLabel: machine.controller,
    controlFeatures: [],
  };
}

function buildSpindlePackage(machine: ProgramReleaseMachineCatalogProfile): SpindlePackageOption {
  return {
    id: slugify(machine.spindle) || `${machine.id}-spindle`,
    label: machine.spindle,
    maxRpm: machine.maxRpm > 0 ? machine.maxRpm : undefined,
    availability: makeAvailability(),
  };
}

function buildCoolantStrategies(): CoolantStrategyOption[] {
  return [
    {
      id: "flood",
      label: "Flood",
      availability: makeAvailability(),
    },
  ];
}

function buildKinematicPackage(machine: ProgramReleaseMachineCatalogProfile): KinematicPackage {
  return {
    familyId: machine.familyId,
    familyLabel: machine.familyLabel,
    topology: inferTopology(machine.familyId, machine.kinematics),
  };
}

export function buildProgramReleaseMachineCapabilitySnapshot(
  machineId: string,
): MachineCapabilitySnapshot | null {
  const machine = getProgramReleaseRegistryMachineProfileById(machineId);
  if (!machine) {
    return null;
  }

  const controllerPackage = buildControllerPackage(machine);
  const spindlePackage = buildSpindlePackage(machine);

  return {
    machineId: machine.id,
    canonicalMachineId: machine.id,
    packageId: `${machine.id}::${controllerPackage.controllerId}::${spindlePackage.id}`,
    manufacturerId: machine.manufacturerId,
    manufacturerLabel: machine.manufacturer,
    modelLabel: machine.label,
    familyId: machine.familyId,
    familyLabel: machine.familyLabel,
    controllerPackages: [controllerPackage],
    spindlePackages: [spindlePackage],
    coolantStrategies: buildCoolantStrategies(),
    kinematics: buildKinematicPackage(machine),
    sourceRecords: [`program_release_catalog:${machine.id}`],
  };
}

export function buildProgramReleaseUserMachineProfileSelection(
  input: ProgramReleaseMachineProfileSelectionInput,
): UserMachineProfileOverlay | null {
  const machine = buildProgramReleaseMachineCapabilitySnapshot(input.machineId);
  if (!machine) {
    return null;
  }

  const selectedControllerId = machine.controllerPackages[0]?.controllerId ?? "";
  const selectedSpindlePackageId = machine.spindlePackages[0]?.id ?? "";
  const allowedCoolantIds = new Set(machine.coolantStrategies.map((strategy) => strategy.id));
  const enabledCoolantStrategyIds = (input.enabledCoolantStrategyIds?.length
    ? input.enabledCoolantStrategyIds
    : machine.coolantStrategies.map((strategy) => strategy.id)
  ).filter((coolantId) => allowedCoolantIds.has(coolantId));

  return {
    profileId:
      slugify(
        `program-release-${input.userId}-${input.workspaceId ?? "default"}-${machine.machineId}`,
      ) || `program-release-${machine.machineId}`,
    userId: input.userId,
    workspaceId: input.workspaceId,
    displayName: input.displayName?.trim() || `${machine.modelLabel} Program Release default`,
    machine,
    selectedControllerId,
    enabledControllerFeatureIds: input.enabledControllerFeatureIds ?? [],
    selectedSpindlePackageId,
    enabledCoolantStrategyIds,
    preferredToolingFamilies: input.preferredToolingFamilies,
    preferredToolpathFamilies: input.preferredToolpathFamilies,
    notes: input.notes,
    tags: input.tags,
  };
}

function buildProfileId(manufacturer: string, model: string): string {
  return `machine-${slugify(`${manufacturer}-${model}`)}`;
}

function profileRichnessScore(profile: ProgramReleaseMachineCatalogProfile): number {
  let score = 0;
  if (profile.maxRpm > 0) score += 2;
  if (!/not published/i.test(profile.controller)) score += 2;
  if (!/Envelope not published/i.test(profile.collisionEnvelope)) score += 1;
  if (!/General-purpose machining/i.test(profile.strength)) score += 1;
  if (!/^Spindle /.test(profile.spindle)) score += 1;
  return score;
}

function mergeProfiles(
  existing: ProgramReleaseMachineCatalogProfile,
  incoming: ProgramReleaseMachineCatalogProfile,
): ProgramReleaseMachineCatalogProfile {
  const preferred = profileRichnessScore(incoming) > profileRichnessScore(existing) ? incoming : existing;
  const secondary = preferred === incoming ? existing : incoming;

  return {
    ...preferred,
    controller: /not published/i.test(preferred.controller) ? secondary.controller : preferred.controller,
    spindle: preferred.maxRpm >= secondary.maxRpm ? preferred.spindle : secondary.spindle,
    maxRpm: Math.max(preferred.maxRpm, secondary.maxRpm),
    collisionEnvelope:
      preferred.collisionEnvelope !== "Envelope not published"
        ? preferred.collisionEnvelope
        : secondary.collisionEnvelope,
    machineRatePerHour: Math.max(preferred.machineRatePerHour, secondary.machineRatePerHour),
  };
}

function buildMachineSearchFacets(
  machines: ProgramReleaseMachineCatalogProfile[],
): ProgramReleaseMachineSearchFacets {
  const manufacturers = new Map<string, number>();
  const manufacturerLabels = new Map<string, string>();
  const families = new Map<string, number>();
  const familyLabels = new Map<string, string>();
  const kinematics = new Map<string, number>();
  const controllers = new Map<string, number>();

  for (const machine of machines) {
    manufacturers.set(machine.manufacturerId, (manufacturers.get(machine.manufacturerId) ?? 0) + 1);
    manufacturerLabels.set(machine.manufacturerId, machine.manufacturer);
    families.set(machine.familyId, (families.get(machine.familyId) ?? 0) + 1);
    familyLabels.set(machine.familyId, machine.familyLabel);
    kinematics.set(machine.kinematics, (kinematics.get(machine.kinematics) ?? 0) + 1);
    controllers.set(machine.controller, (controllers.get(machine.controller) ?? 0) + 1);
  }

  const toFacetList = (source: Map<string, number>): ProgramReleaseMachineFacetOption[] =>
    [...source.entries()]
      .map(([value, count]) => ({ id: value, label: value, value, count }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return (left.label ?? left.value).localeCompare(right.label ?? right.value, "en-US");
      });

  return {
    manufacturers: [...manufacturers.entries()]
      .map(([value, count]) => ({
        id: value,
        label: manufacturerLabels.get(value) ?? value,
        value,
        count,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return (left.label ?? left.value).localeCompare(right.label ?? right.value, "en-US");
      }),
    families: [...families.entries()]
      .map(([value, count]) => ({
        id: value,
        label: familyLabels.get(value) ?? value,
        value,
        count,
      }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return (left.label ?? left.value).localeCompare(right.label ?? right.value, "en-US");
      }),
    kinematics: toFacetList(kinematics),
    controllers: toFacetList(controllers),
  };
}

function parseMachineRows(): RawMachineRecord[] {
  for (const filePath of MACHINE_CATALOG_PATHS) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const payload = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      if (Array.isArray(payload)) {
        return payload.filter((entry): entry is RawMachineRecord => Boolean(asRecord(entry)));
      }
      const record = asRecord(payload);
      if (record && Array.isArray(record.machines)) {
        return record.machines.filter((entry): entry is RawMachineRecord => Boolean(asRecord(entry)));
      }
    } catch {
      continue;
    }
  }

  return [];
}

function normalizeMachineRow(raw: RawMachineRecord): ProgramReleaseMachineCatalogProfile | null {
  if (!isProgramReleaseCompatible(raw)) return null;

  const manufacturer = normalizeManufacturer(raw);
  const model = normalizeMachineModel(manufacturer, raw);
  if (!model) return null;

  const label = `${manufacturer} ${model}`.trim();
  const kinematics = inferKinematics(raw);
  const family = inferMachineFamily(raw, kinematics);
  const spindle = formatSpindle(raw);

  return {
    id: buildProfileId(manufacturer, model),
    manufacturerId: slugify(manufacturer),
    manufacturer,
    label,
    familyId: family.id,
    familyLabel: family.label,
    controller: formatController(raw),
    kinematics,
    spindle: spindle.label,
    maxRpm: spindle.maxRpm,
    strength: inferStrength(raw, kinematics, spindle.maxRpm, spindle.powerKw),
    collisionEnvelope: formatCollisionEnvelope(raw),
    machineRatePerHour: inferMachineRate(raw, kinematics, spindle.maxRpm, spindle.powerKw),
  };
}

export function getProgramReleaseRegistryMachineProfiles(): ProgramReleaseMachineCatalogProfile[] {
  if (cachedCatalogProfiles) {
    return cachedCatalogProfiles;
  }

  const mergedProfiles = new Map<string, ProgramReleaseMachineCatalogProfile>();
  for (const raw of parseMachineRows()) {
    const profile = normalizeMachineRow(raw);
    if (!profile) continue;

    const mergeKey = `${slugify(profile.label)}|${slugify(profile.kinematics)}`;
    const existing = mergedProfiles.get(mergeKey);
    mergedProfiles.set(mergeKey, existing ? mergeProfiles(existing, profile) : profile);
  }

  const canonicalProfiles = new Map<string, ProgramReleaseMachineCatalogProfile>();
  for (const profile of mergedProfiles.values()) {
    const existing = canonicalProfiles.get(profile.id);
    canonicalProfiles.set(profile.id, existing ? mergeProfiles(existing, profile) : profile);
  }

  cachedCatalogProfiles = [...canonicalProfiles.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "en-US"),
  );

  return cachedCatalogProfiles;
}

export function getProgramReleaseRegistryMachineProfileById(
  machineId: string,
): ProgramReleaseMachineCatalogProfile | null {
  return getProgramReleaseRegistryMachineProfiles().find((machine) => machine.id === machineId) ?? null;
}

export function searchProgramReleaseRegistryMachineProfiles(
  input: ProgramReleaseMachineSearchInput = {},
): ProgramReleaseMachineSearchResult {
  const query = input.query?.trim().toLowerCase() ?? "";
  const manufacturer = input.manufacturer?.trim().toLowerCase() ?? "";
  const familyId = input.familyId?.trim().toLowerCase() ?? "";
  const kinematics = input.kinematics?.trim().toLowerCase() ?? "";
  const controller = input.controller?.trim().toLowerCase() ?? "";
  const offset = Math.max(0, input.offset ?? 0);
  const limit = Math.max(1, input.limit ?? 20);

  let machines = getProgramReleaseRegistryMachineProfiles();

  if (query) {
    machines = machines.filter((machine) => {
      const haystack = [
        machine.label,
        machine.familyLabel,
        machine.controller,
        machine.kinematics,
        machine.spindle,
        machine.strength,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (manufacturer) {
    machines = machines.filter((machine) =>
      machine.manufacturerId.toLowerCase() === manufacturer
      || machine.manufacturer.toLowerCase() === manufacturer,
    );
  }

  if (familyId) {
    machines = machines.filter((machine) => machine.familyId.toLowerCase() === familyId);
  }

  if (kinematics) {
    machines = machines.filter((machine) => machine.kinematics.toLowerCase().includes(kinematics));
  }

  if (controller) {
    machines = machines.filter((machine) => machine.controller.toLowerCase().includes(controller));
  }

  const total = machines.length;
  const facets = buildMachineSearchFacets(machines);
  const paged = machines.slice(offset, offset + limit);

  return {
    machines: paged,
    total,
    hasMore: offset + paged.length < total,
    facets,
  };
}
