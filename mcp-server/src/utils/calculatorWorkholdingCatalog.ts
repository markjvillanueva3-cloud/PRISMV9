import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { PATHS } from "../constants.js";
import {
  getWorkholdingCatalogBundle,
  type WorkholdingCatalogBundle,
} from "../data/calculatorWorkholdingCatalog.js";
import {
  ORANGE_VISE_SPECS,
  SOFT_JAW_SPECS,
  SUBPLATE_SPECS,
  TOMBSTONE_SPECS,
} from "../data/workholding-catalog.js";

type MachineMode = "mill" | "lathe" | "edm" | "wire_edm" | "laser" | "waterjet";

interface SelectionOption {
  id: string;
  label: string;
  detail: string;
}

interface WorkholdingPresetOption extends SelectionOption {
  modes: MachineMode[];
  categoryId: string;
  brandId: string;
  workholdingId: string;
  stabilityId: string;
}

interface WorkholdingCatalogResponse {
  categoryOptions: SelectionOption[];
  brandOptions: SelectionOption[];
  presetOptions: WorkholdingPresetOption[];
  stabilityOptions: SelectionOption[];
  total: number;
  source: "database" | "hybrid" | "curated";
  liveCount: number;
  fallbackCount: number;
  note: string;
}

interface WorkholdingDatabasePayload {
  vises?: RawWorkholdingProduct[];
  chucks?: RawWorkholdingProduct[];
  collets?: RawWorkholdingProduct[];
  fixtures?: RawWorkholdingProduct[];
  toolholders?: RawWorkholdingProduct[];
}

type RawWorkholdingProduct = Record<string, unknown>;

const WORKHOLDING_DATABASE_PATH = path.join(PATHS.DATA_DIR, "workholding", "WORKHOLDING.json");
const WORKHOLDING_REFERENCE_DATABASE_PATH = path.join(PATHS.DATA_DIR, "databases", "WorkholdingDB.json");
const PRISM_FIXTURE_DATABASE_PATH = path.join(PATHS.DATA_DIR, "workholding", "PRISM_FIXTURE_DATABASE.js");
const PRISM_WORKHOLDING_DATABASE_PATH = path.join(PATHS.DATA_DIR, "workholding", "PRISM_WORKHOLDING_DATABASE.js");

let cachedWorkholdingDatabase: WorkholdingDatabasePayload | null = null;
let cachedReferenceDatabase: Record<string, unknown> | null = null;
let cachedFixtureScriptDatabase: Record<string, unknown> | null = null;
let cachedWorkholdingScriptDatabase: Record<string, unknown> | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function safeNum(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

function optionId(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function dedupeOptions(items: SelectionOption[]): SelectionOption[] {
  const byId = new Map<string, SelectionOption>();
  for (const item of items) {
    if (!item.id || !item.label || !item.detail) continue;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

function dedupePresets(items: WorkholdingPresetOption[]): WorkholdingPresetOption[] {
  const byId = new Map<string, WorkholdingPresetOption>();
  for (const item of items) {
    if (!item.id) continue;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

function loadWorkholdingDatabase(): WorkholdingDatabasePayload {
  if (cachedWorkholdingDatabase) return cachedWorkholdingDatabase;
  if (!fs.existsSync(WORKHOLDING_DATABASE_PATH)) {
    cachedWorkholdingDatabase = {};
    return cachedWorkholdingDatabase;
  }

  const payload = JSON.parse(fs.readFileSync(WORKHOLDING_DATABASE_PATH, "utf8")) as WorkholdingDatabasePayload;
  cachedWorkholdingDatabase = payload;
  return payload;
}

function loadReferenceDatabase(): Record<string, unknown> {
  if (cachedReferenceDatabase) return cachedReferenceDatabase;
  if (!fs.existsSync(WORKHOLDING_REFERENCE_DATABASE_PATH)) {
    cachedReferenceDatabase = {};
    return cachedReferenceDatabase;
  }

  cachedReferenceDatabase = JSON.parse(fs.readFileSync(WORKHOLDING_REFERENCE_DATABASE_PATH, "utf8")) as Record<string, unknown>;
  return cachedReferenceDatabase;
}

function loadJavascriptObject(filePath: string, exportName: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const source = fs.readFileSync(filePath, "utf8").replace(/\\n/g, "\n");
  const sandbox: {
    globalThis: Record<string, unknown>;
  } = {
    globalThis: {},
  };

  vm.runInNewContext(
    `${source}\n;globalThis.__calculatorExport = typeof ${exportName} !== "undefined" ? ${exportName} : null;`,
    sandbox,
    { filename: filePath },
  );

  return asRecord(sandbox.globalThis.__calculatorExport) ?? {};
}

function loadFixtureScriptDatabase(): Record<string, unknown> {
  if (cachedFixtureScriptDatabase) return cachedFixtureScriptDatabase;
  cachedFixtureScriptDatabase = loadJavascriptObject(PRISM_FIXTURE_DATABASE_PATH, "PRISM_FIXTURE_DATABASE");
  return cachedFixtureScriptDatabase;
}

function loadWorkholdingScriptDatabase(): Record<string, unknown> {
  if (cachedWorkholdingScriptDatabase) return cachedWorkholdingScriptDatabase;
  cachedWorkholdingScriptDatabase = loadJavascriptObject(PRISM_WORKHOLDING_DATABASE_PATH, "PRISM_WORKHOLDING_DATABASE");
  return cachedWorkholdingScriptDatabase;
}

function inferMillWorkholdingId(entry: RawWorkholdingProduct): string {
  const signature = [
    readText(entry.name),
    readText(entry.type),
    readText(entry.manufacturer),
    ...(Array.isArray(entry.features) ? entry.features.map(readText) : []),
    ...(Array.isArray(entry.recommended_for) ? entry.recommended_for.map(readText) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/vacuum/.test(signature)) return "vacuum-fixture";
  if (/magnetic/.test(signature)) return "magnetic-chuck";
  if (/tombstone|column|multi-face|pallet/.test(signature)) return "tombstone-pallet";
  if (/rotary|trunnion/.test(signature)) return "rotary-trunnion";
  if (/fixture|plate|subplate|zero-point|zero point/.test(signature)) return "fixture-plate";
  return "vise-soft-jaw";
}

function inferLatheWorkholdingId(entry: RawWorkholdingProduct): string {
  const signature = [
    readText(entry.name),
    readText(entry.type),
    ...(Array.isArray(entry.features) ? entry.features.map(readText) : []),
    ...(Array.isArray(entry.recommended_for) ? entry.recommended_for.map(readText) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/collet/.test(signature)) return "collet-chuck";
  if (/6[- ]?jaw|six[- ]?jaw/.test(signature)) return "six-jaw-chuck";
  if (/4[- ]?jaw|four[- ]?jaw/.test(signature)) return "four-jaw-chuck";
  if (/soft/.test(signature)) return "soft-jaw-chuck";
  return "three-jaw-chuck";
}

function inferStabilityId(entry: RawWorkholdingProduct, workholdingId: string): string {
  const signature = [
    workholdingId,
    readText(entry.type),
    ...(Array.isArray(entry.features) ? entry.features.map(readText) : []),
    ...(Array.isArray(entry.recommended_for) ? entry.recommended_for.map(readText) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/vacuum|magnetic|detail|thin|precision/.test(signature)) return "detail-control";
  if (/rotary|trunnion|index/.test(signature)) return "index-ready";
  if (/5axis|5-axis|high-force|heavy|superalloy|aggressive|dovetail/.test(signature)) {
    return "aggressive-rigid";
  }
  return "production-stable";
}

function buildProductDetail(entry: RawWorkholdingProduct): string {
  const parts: string[] = [];
  const type = readText(entry.type);
  const clampForce = safeNum(entry.max_clamping_force_N);
  const jawWidth = safeNum(entry.jaw_width_mm);
  const opening = safeNum(entry.max_opening_mm);
  const repeatability = safeNum(entry.repeatability_mm);
  const diameter = safeNum(entry.diameter_mm);
  const rpm = safeNum(entry.max_rpm);

  if (type) parts.push(titleCase(type));
  if (clampForce > 0) parts.push(`${Math.round(clampForce).toLocaleString()} N clamp`);
  if (jawWidth > 0) parts.push(`${Math.round(jawWidth)} mm jaw`);
  if (opening > 0) parts.push(`${Math.round(opening)} mm opening`);
  if (diameter > 0) parts.push(`${Math.round(diameter)} mm size`);
  if (rpm > 0) parts.push(`${Math.round(rpm).toLocaleString()} RPM`);
  if (repeatability > 0) parts.push(`${repeatability.toFixed(3)} mm repeatability`);

  return parts.join(" · ");
}

function mapProductToPreset(
  entry: RawWorkholdingProduct,
  mode: MachineMode,
  categoryId: string,
  workholdingId: string,
): WorkholdingPresetOption | null {
  const id = readText(entry.id);
  const label = readText(entry.name);
  const manufacturer = readText(entry.manufacturer);
  if (!id || !label || !manufacturer) return null;

  const brandId = optionId(manufacturer, "catalog");
  return {
    id,
    label,
    detail: buildProductDetail(entry) || `${manufacturer} ${label}`.trim(),
    modes: [mode],
    categoryId,
    brandId,
    workholdingId,
    stabilityId: inferStabilityId(entry, workholdingId),
  };
}

function mapMillDatabasePresets(payload: WorkholdingDatabasePayload): WorkholdingPresetOption[] {
  const vises = (payload.vises ?? [])
    .map((entry) => mapProductToPreset(entry, "mill", "vise", inferMillWorkholdingId(entry)))
    .filter((entry): entry is WorkholdingPresetOption => Boolean(entry));
  const fixtures = (payload.fixtures ?? [])
    .map((entry) => {
      const workholdingId = inferMillWorkholdingId(entry);
      return mapProductToPreset(
        entry,
        "mill",
        workholdingId === "rotary-trunnion" ? "rotary" : "fixture",
        workholdingId,
      );
    })
    .filter((entry): entry is WorkholdingPresetOption => Boolean(entry));

  const orangeVisePresets: WorkholdingPresetOption[] = ORANGE_VISE_SPECS.map((vise) => ({
    id: `orange-vise-${optionId(vise.model, "vise")}`,
    label: `${vise.brand} ${vise.model}`,
    detail: `${titleCase(vise.type)} · ${Math.round(vise.clamping_force_kn * 1000).toLocaleString()} N clamp · ${Math.round(vise.jaw_width_mm)} mm jaw · ${vise.repeatability_mm.toFixed(3)} mm repeatability`,
    modes: ["mill"],
    categoryId: "vise",
    brandId: optionId(vise.brand, "orange-vise"),
    workholdingId: "vise-soft-jaw",
    stabilityId: /5axis|self_centering/i.test(vise.type) ? "aggressive-rigid" : "production-stable",
  }));

  const tombstonePresets: WorkholdingPresetOption[] = TOMBSTONE_SPECS.map((fixture) => ({
    id: `orange-vise-${optionId(fixture.model, "tombstone")}`,
    label: `${fixture.brand} ${fixture.model}`,
    detail: `${titleCase(fixture.type)} · ${fixture.stations} stations · ${Math.round(fixture.height_mm)} mm tall`,
    modes: ["mill"],
    categoryId: "fixture",
    brandId: optionId(fixture.brand, "orange-vise"),
    workholdingId: "tombstone-pallet",
    stabilityId: "production-stable",
  }));

  const subplatePresets: WorkholdingPresetOption[] = SUBPLATE_SPECS.map((fixture) => ({
    id: `orange-vise-subplate-${fixture.sku.toLowerCase()}`,
    label: `${fixture.brand} ${fixture.sku}`,
    detail: `Fixture plate · ${Math.round(fixture.size_mm.length)} x ${Math.round(fixture.size_mm.width)} x ${Math.round(fixture.size_mm.height)} mm · ${fixture.integrated_receivers} receivers`,
    modes: ["mill"],
    categoryId: "fixture",
    brandId: optionId(fixture.brand, "orange-vise"),
    workholdingId: "fixture-plate",
    stabilityId: "production-stable",
  }));

  const softJawPresets: WorkholdingPresetOption[] = SOFT_JAW_SPECS.map((jaw) => ({
    id: `orange-vise-soft-jaw-${optionId(`${jaw.material}-${jaw.size_mm.length}`, "soft-jaw")}`,
    label: `${jaw.brand} ${titleCase(jaw.type)} jaws`,
    detail: `${titleCase(jaw.material)} · ${Math.round(jaw.size_mm.length)} x ${Math.round(jaw.size_mm.width)} x ${Math.round(jaw.size_mm.height)} mm`,
    modes: ["mill"],
    categoryId: "vise",
    brandId: optionId(jaw.brand, "orange-vise"),
    workholdingId: "vise-soft-jaw",
    stabilityId: "production-stable",
  }));

  return dedupePresets([...vises, ...fixtures, ...orangeVisePresets, ...tombstonePresets, ...subplatePresets, ...softJawPresets]);
}

function mapLatheDatabasePresets(payload: WorkholdingDatabasePayload): WorkholdingPresetOption[] {
  const chucks = (payload.chucks ?? [])
    .map((entry) => mapProductToPreset(entry, "lathe", "chucking", inferLatheWorkholdingId(entry)))
    .filter((entry): entry is WorkholdingPresetOption => Boolean(entry));
  const collets = (payload.collets ?? [])
    .map((entry) => mapProductToPreset(entry, "lathe", "chucking", "collet-chuck"))
    .filter((entry): entry is WorkholdingPresetOption => Boolean(entry));

  const reference = loadReferenceDatabase();
  const referenceDeviceTypes = Array.isArray(reference.device_types)
    ? reference.device_types.map(readText).filter(Boolean)
    : [];
  const referencePresets: WorkholdingPresetOption[] = referenceDeviceTypes
    .filter((type) => ["COLLET", "THREE_JAW_CHUCK", "FOUR_JAW_CHUCK"].includes(type))
    .map((type) => ({
      id: `prism-reference-${optionId(type, "workholding")}`,
      label: `PRISM reference ${titleCase(type)}`,
      detail: `Reference workholding posture from the validated workholding safety database for ${titleCase(type)}.`,
      modes: ["lathe"],
      categoryId: "chucking",
      brandId: "prism-reference",
      workholdingId:
        type === "COLLET"
          ? "collet-chuck"
          : type === "FOUR_JAW_CHUCK"
            ? "four-jaw-chuck"
            : "three-jaw-chuck",
      stabilityId: "production-stable",
    }));

  return dedupePresets([...chucks, ...collets, ...referencePresets]);
}

function mapReferenceMillPresets(): WorkholdingPresetOption[] {
  const reference = loadReferenceDatabase();
  const referenceDeviceTypes = Array.isArray(reference.device_types)
    ? reference.device_types.map(readText).filter(Boolean)
    : [];

  return dedupePresets(
    referenceDeviceTypes
      .filter((type) => ["VACUUM_FIXTURE", "MAGNETIC_CHUCK", "FIXTURE_PLATE", "TOMBSTONE"].includes(type))
      .map((type) => ({
        id: `prism-reference-${optionId(type, "fixture")}`,
        label: `PRISM reference ${titleCase(type)}`,
        detail: `Reference ${titleCase(type)} posture from the validated workholding safety database.`,
        modes: ["mill"],
        categoryId: "fixture",
        brandId: "prism-reference",
        workholdingId:
          type === "VACUUM_FIXTURE"
            ? "vacuum-fixture"
            : type === "MAGNETIC_CHUCK"
              ? "magnetic-chuck"
              : type === "TOMBSTONE"
                ? "tombstone-pallet"
                : "fixture-plate",
        stabilityId:
          type === "VACUUM_FIXTURE" || type === "MAGNETIC_CHUCK"
            ? "detail-control"
            : "production-stable",
      })),
  );
}

function inferScriptProductMode(typeId: string): MachineMode {
  if (/chuck|collet|mandrel/i.test(typeId)) {
    return "lathe";
  }
  return "mill";
}

function inferScriptProductCategoryId(typeId: string): string {
  if (/chuck|collet|mandrel/i.test(typeId)) {
    return "chucking";
  }
  if (/tombstone|pallet|fixture|vacuum|magnetic/i.test(typeId)) {
    return "fixture";
  }
  return "vise";
}

function inferScriptWorkholdingId(typeId: string, entry: Record<string, unknown>): string {
  const signature = `${typeId} ${readText(entry.model)} ${readText(entry.manufacturer)}`.toLowerCase();
  if (/collet/.test(signature)) return "collet-chuck";
  if (/6jaw|6-jaw|six-jaw/.test(signature)) return "six-jaw-chuck";
  if (/4jaw|4-jaw|four-jaw/.test(signature)) return "four-jaw-chuck";
  if (/3jaw|3-jaw|three-jaw/.test(signature)) return "three-jaw-chuck";
  if (/mandrel/.test(signature)) return "collet-chuck";
  if (/vacuum/.test(signature)) return "vacuum-fixture";
  if (/magnetic/.test(signature)) return "magnetic-chuck";
  if (/tombstone|pallet/.test(signature)) return "tombstone-pallet";
  if (/fixture/.test(signature)) return "fixture-plate";
  return "vise-soft-jaw";
}

function buildScriptProductDetail(typeId: string, entry: Record<string, unknown>): string {
  const parts: string[] = [];
  const jawWidth = safeNum(entry.jawWidth);
  const opening = safeNum(entry.maxOpening);
  const clampForce = safeNum(entry.clampingForce);
  const repeatability = safeNum(entry.repeatability);
  const rigidityFactor = safeNum(entry.rigidityFactor);
  const typeLabel = titleCase(typeId);

  if (typeLabel) parts.push(typeLabel);
  if (jawWidth > 0) parts.push(`${Math.round(jawWidth)} mm jaw`);
  if (opening > 0) parts.push(`${Math.round(opening)} mm opening`);
  if (clampForce > 0) parts.push(`${Math.round(clampForce).toLocaleString()} N clamp`);
  if (repeatability > 0) parts.push(`${repeatability.toFixed(3)} mm repeatability`);
  if (rigidityFactor > 0) parts.push(`${rigidityFactor.toFixed(2)} rigidity`);
  if (safeBoolean(entry.fiveAxisCapable)) parts.push("5-axis capable");

  return parts.join(" · ");
}

function mapScriptDatabasePresets(): WorkholdingPresetOption[] {
  const scriptDatabase = loadWorkholdingScriptDatabase();
  const productMap = asRecord(scriptDatabase.products) ?? {};

  const productPresets = Object.entries(productMap)
    .map(([key, rawEntry]) => {
      const entry = asRecord(rawEntry);
      if (!entry) return null;

      const manufacturer = readText(entry.manufacturer);
      const model = readText(entry.model);
      const typeId = readText(entry.type);
      if (!manufacturer || !model || !typeId) return null;

      const mode = inferScriptProductMode(typeId);
      const workholdingId = inferScriptWorkholdingId(typeId, entry);
      const categoryId = inferScriptProductCategoryId(typeId);

      return {
        id: key.replace(/_/g, "-"),
        label: `${manufacturer} ${model}`,
        detail: buildScriptProductDetail(typeId, entry) || `${manufacturer} ${model}`.trim(),
        modes: [mode],
        categoryId,
        brandId: optionId(manufacturer, "catalog"),
        workholdingId,
        stabilityId: inferStabilityId(entry, workholdingId),
      } satisfies WorkholdingPresetOption;
    })
    .filter((entry): entry is WorkholdingPresetOption => Boolean(entry));

  const fixtureDatabase = loadFixtureScriptDatabase();
  const categoryMap = asRecord(fixtureDatabase.categories) ?? {};
  const categoryReferencePresets = Object.entries(categoryMap)
    .map(([key, rawCategory]) => {
      const category = asRecord(rawCategory);
      if (!category) return null;

      const mode = /CHUCK|COLLET/i.test(key) ? "lathe" : "mill";
      const workholdingId = inferScriptWorkholdingId(key, category);
      const categoryId = inferScriptProductCategoryId(key);

      return {
        id: `prism-fixture-${optionId(key, "fixture")}`,
        label: `PRISM ${titleCase(key)}`,
        detail: `Reference ${titleCase(key)} posture from the H:\\PRISM fixture database.`,
        modes: [mode],
        categoryId,
        brandId: "prism-fixture-db",
        workholdingId,
        stabilityId: inferStabilityId(category, workholdingId),
      } satisfies WorkholdingPresetOption;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null) as WorkholdingPresetOption[];

  return dedupePresets([...productPresets, ...categoryReferencePresets]);
}

function livePresetsForMode(mode: MachineMode): WorkholdingPresetOption[] {
  const payload = loadWorkholdingDatabase();
  const scriptPresets = mapScriptDatabasePresets().filter((entry) => entry.modes.includes(mode));
  switch (mode) {
    case "mill":
      return dedupePresets([...mapMillDatabasePresets(payload), ...mapReferenceMillPresets(), ...scriptPresets]);
    case "lathe":
      return dedupePresets([...mapLatheDatabasePresets(payload), ...scriptPresets]);
    default:
      return [];
  }
}

function liveBrandOptions(presets: WorkholdingPresetOption[]): SelectionOption[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const preset of presets) {
    counts.set(preset.brandId, (counts.get(preset.brandId) ?? 0) + 1);
    if (!labels.has(preset.brandId)) {
      labels.set(preset.brandId, titleCase(preset.brandId));
    }
  }

  return [...counts.entries()].map(([id, count]) => ({
    id,
    label: labels.get(id) ?? titleCase(id),
    detail: `${count} live-backed workholding packages available for this machine mode.`,
  }));
}

export function getCalculatorWorkholdingCatalog(
  mode: MachineMode,
): WorkholdingCatalogResponse {
  const fallbackBundle = getWorkholdingCatalogBundle(mode);
  const livePresets = livePresetsForMode(mode);

  if (livePresets.length === 0) {
    return {
      ...fallbackBundle,
      total: fallbackBundle.presetOptions.length,
      source: "curated",
      liveCount: 0,
      fallbackCount: fallbackBundle.presetOptions.length,
      note: "Calculator-native curated workholding presets are active because no live H:\\PRISM workholding products are mapped for this machine mode yet.",
    };
  }

  const mergedPresetOptions = dedupePresets([...livePresets, ...fallbackBundle.presetOptions]);
  const fallbackIds = new Set(fallbackBundle.presetOptions.map((item) => item.id));
  const liveIds = new Set(livePresets.map((item) => item.id));
  const fallbackCount = mergedPresetOptions.filter((item) => !liveIds.has(item.id) && fallbackIds.has(item.id)).length;

  const categoryOptions = dedupeOptions([
    ...fallbackBundle.categoryOptions,
  ]);

  const brandOptions = dedupeOptions([
    ...fallbackBundle.brandOptions,
    ...liveBrandOptions(livePresets),
  ]);

  const source = fallbackCount > 0 ? "hybrid" : "database";

  return {
    categoryOptions,
    brandOptions,
    presetOptions: mergedPresetOptions,
    stabilityOptions: fallbackBundle.stabilityOptions,
    total: mergedPresetOptions.length,
    source,
    liveCount: livePresets.length,
    fallbackCount,
    note:
      source === "hybrid"
        ? "Live H:\\PRISM workholding and fixture products are merged with calculator-native presets so support-only and nontraditional setup packages remain selectable."
        : "Live H:\\PRISM workholding and fixture products are active for this machine mode.",
  };
}
