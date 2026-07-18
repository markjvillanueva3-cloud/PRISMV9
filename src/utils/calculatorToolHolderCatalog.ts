import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../constants.js";

type MachineMode = "mill" | "lathe" | "edm" | "wire_edm" | "laser" | "waterjet";
type ToolingLayoutKind = "magazine" | "turret" | "gang" | "wire" | "laser" | "waterjet" | "electrode";
type RawHolderRecord = Record<string, unknown>;

export interface CalculatorToolHolderCatalogQuery {
  mode: MachineMode;
  layoutKind?: ToolingLayoutKind;
  spindleConnectionTypeId?: string;
  turretTypeId?: string;
  liveTooling?: boolean;
  hasMillingHead?: boolean;
  turretCount?: number;
  toolId?: string;
  toolOperation?: string;
  toolGeometryClass?: string;
  limit?: number;
}

export interface CalculatorToolHolderCatalogItem {
  id: string;
  label: string;
  detail: string;
  mode: MachineMode;
  brandId: string;
  brandLabel: string;
  holderStyleId: string;
  holderStyleIds: string[];
  holderType: string;
  holderSubcategory: string;
  spindleInterface?: string;
  toolInterface?: string;
  compatibleLayoutKinds?: ToolingLayoutKind[];
  compatibleSpindleConnectionTypeIds?: string[];
  compatibleTurretTypeIds?: string[];
  requiresLiveTooling?: boolean;
  requiresMillingHead?: boolean;
  minTurretCount?: number;
  maxTurretCount?: number;
  coolantThrough?: boolean;
  maxRpm?: number;
  source: "database";
}

const TOOL_HOLDER_CATALOG_PATH = path.join(PATHS.DATA_DIR, "tools", "TOOLHOLDERS.json");

let cachedHolderRows: RawHolderRecord[] | null = null;

function asRecord(value: unknown): RawHolderRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as RawHolderRecord)
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

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function optionId(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function stripLeadingVendor(vendor: string, label: string): string {
  const normalizedVendor = vendor.trim().toLowerCase();
  const trimmedLabel = label.trim();
  if (!normalizedVendor || !trimmedLabel) return trimmedLabel;
  return trimmedLabel.replace(new RegExp(`^${normalizedVendor}(?:[\\s_-]+|$)`, "i"), "").trim();
}

function normalizeBrandLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Catalog";
  if (trimmed === trimmed.toUpperCase()) {
    return humanizeToken(trimmed.toLowerCase());
  }
  return trimmed;
}

function normalizeInterfaceId(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  if (/(cat\s*40).*?(big\+|big plus)|(big\+|big plus).*?(cat\s*40)/i.test(normalized)) return "cat40-big-plus";
  if (/cat\s*40/i.test(normalized)) return "cat40";
  if (/cat\s*50/i.test(normalized)) return "cat50";
  if (/bt\s*40/i.test(normalized)) return "bt40";
  if (/bt\s*50/i.test(normalized)) return "bt50";
  if (/hsk[\s_-]*a\s*63/i.test(normalized)) return "hsk-a63";
  if (/hsk[\s_-]*a\s*100/i.test(normalized)) return "hsk-a100";
  if (/hsk[\s_-]*t\s*63/i.test(normalized)) return "hsk-t63";
  if (/hsk[\s_-]*t\s*80/i.test(normalized)) return "hsk-t80";
  if (/hsk[\s_-]*t\s*100/i.test(normalized)) return "hsk-t100";
  if (/capto[\s_-]*c\s*3/i.test(normalized)) return "capto-c3";
  if (/capto[\s_-]*c\s*4/i.test(normalized)) return "capto-c4";
  if (/capto[\s_-]*c\s*5/i.test(normalized)) return "capto-c5";
  if (/capto[\s_-]*c\s*6/i.test(normalized)) return "capto-c6";
  if (/capto[\s_-]*c\s*8/i.test(normalized)) return "capto-c8";
  if (/bmt\s*45/i.test(normalized)) return "bmt45";
  if (/bmt\s*55/i.test(normalized)) return "bmt55";
  if (/bmt\s*65/i.test(normalized)) return "bmt65";
  if (/bmt\s*75/i.test(normalized)) return "bmt75";
  if (/vdi\s*20/i.test(normalized)) return "vdi20";
  if (/vdi\s*25/i.test(normalized)) return "vdi25";
  if (/vdi\s*30/i.test(normalized)) return "vdi30";
  if (/vdi\s*40/i.test(normalized)) return "vdi40";
  if (/vdi\s*50/i.test(normalized)) return "vdi50";
  if (/vdi\s*60/i.test(normalized)) return "vdi60";
  if (/vdi\s*80/i.test(normalized)) return "vdi80";
  if (/psc\s*32/i.test(normalized)) return "psc32";
  if (/psc\s*40/i.test(normalized)) return "psc40";
  if (/psc\s*50/i.test(normalized)) return "psc50";
  if (/psc\s*63/i.test(normalized)) return "psc63";
  if (/psc\s*80/i.test(normalized)) return "psc80";
  return optionId(normalized, "");
}

function interfaceAliases(interfaceId: string | undefined): string[] {
  if (!interfaceId) return [];
  switch (interfaceId) {
    case "cat40-big-plus":
      return ["cat40-big-plus", "cat40"];
    case "hsk-a63":
      return ["hsk-a63", "hsk_a63"];
    case "bmt45":
    case "bmt-45":
      return ["bmt45", "bmt-45"];
    case "bmt55":
    case "bmt-55":
      return ["bmt55", "bmt-55"];
    case "bmt65":
    case "bmt-65":
      return ["bmt65", "bmt-65"];
    case "vdi30":
    case "vdi-30":
      return ["vdi30", "vdi-30"];
    case "vdi40":
    case "vdi-40":
      return ["vdi40", "vdi-40"];
    case "vdi50":
    case "vdi-50":
      return ["vdi50", "vdi-50"];
    case "vdi60":
    case "vdi-60":
      return ["vdi60", "vdi-60"];
    case "vdi80":
    case "vdi-80":
      return ["vdi80", "vdi-80"];
    default:
      return [interfaceId];
  }
}

function inferModeFromInterface(interfaceId: string): MachineMode | null {
  if (!interfaceId) return null;
  if (
    interfaceId.startsWith("vdi")
    || interfaceId.startsWith("bmt")
    || interfaceId.startsWith("capto")
    || interfaceId.startsWith("psc")
    || interfaceId.startsWith("hsk-t")
  ) {
    return "lathe";
  }
  if (
    interfaceId.startsWith("cat")
    || interfaceId.startsWith("bt")
    || interfaceId.startsWith("hsk-a")
    || interfaceId.startsWith("hsk-e")
    || interfaceId.startsWith("hsk-b")
    || interfaceId.startsWith("hsk-f")
    || interfaceId.startsWith("sk")
    || interfaceId.startsWith("er")
    || interfaceId.startsWith("mt")
    || interfaceId === "r8"
  ) {
    return "mill";
  }
  return null;
}

function holderCapabilityTags(
  mode: MachineMode,
  type: string,
  subcategory: string,
  toolInterface: string,
): Set<string> {
  const tags = new Set<string>();
  const signature = `${type} ${subcategory} ${toolInterface}`.toUpperCase();

  if (/(FACE_MILL_ARBOR|SHELL_MILL_ARBOR)/.test(signature)) {
    tags.add("face-mill");
  }
  if (/(ER_COLLET_CHUCK|SHRINK_FIT|HYDRAULIC|MILLING_CHUCK|WELDON_SIDE_LOCK|ANTI_VIBRATION_SLIM|STRAIGHT_EXTENSION|TAPER_ADAPTER)/.test(signature)) {
    tags.add("endmill");
  }
  if (/(KEYLESS_DRILL_CHUCK|TENSION_COMPRESSION|AXIAL_DRILL|RADIAL_DRILL|ER_COLLET_CHUCK|HYDRAULIC|STRAIGHT_EXTENSION)/.test(signature)) {
    tags.add("drill");
  }
  if (/(BORING_BAR|BORING_HEAD|BORING_BAR_SLEEVE|BMT_BORING)/.test(signature)) {
    tags.add("boring");
  }
  if (mode === "lathe" && /(CAPTO_BORING)/.test(signature)) {
    tags.add("boring");
  }
  if (mode === "lathe" && /(OD_TURNING|BORING_BAR|POLYGONAL_CHUCK)/.test(signature)) {
    tags.add("turning");
  }
  if (mode === "lathe" && /(CAPTO_TURN|CAPTO_BORING|BMT_BORING)/.test(signature)) {
    tags.add("turning");
  }
  if (mode === "lathe" && /(LIVE_|AXIAL_DRILL|RADIAL_DRILL|SPEED_MULTIPLIER|ANGULAR_90|CAPTO_ER|CAPTO_HYDRO|TAPER_ADAPTER)/.test(signature)) {
    tags.add("live-milling");
    tags.add("drill");
  }

  return tags;
}

function desiredToolTags(query: CalculatorToolHolderCatalogQuery): string[] {
  const geometry = (query.toolGeometryClass ?? "").toLowerCase();
  const toolId = (query.toolId ?? "").toLowerCase();
  const operation = (query.toolOperation ?? "").toLowerCase();

  if (query.mode === "mill") {
    if (geometry === "face-mill" || toolId.includes("face")) return ["face-mill"];
    if (geometry === "drill" || geometry === "tap" || geometry === "reamer" || operation === "drilling" || toolId.includes("drill") || toolId.includes("tap") || toolId.includes("ream")) {
      return ["drill"];
    }
    if (geometry === "boring-bar" || toolId.includes("bore")) return ["boring"];
    if (geometry) return ["endmill"];
  }

  if (query.mode === "lathe") {
    if (geometry === "boring-bar" || toolId.includes("bore")) return ["boring"];
    if (
      geometry === "drill"
      || geometry === "tap"
      || geometry === "reamer"
      || geometry === "live-tool-endmill"
      || toolId.includes("drill")
      || toolId.includes("tap")
      || toolId.includes("ream")
    ) {
      return ["live-milling", "drill"];
    }
    if (
      geometry === "roughing-insert"
      || geometry === "finishing-insert"
      || geometry === "grooving-insert"
      || geometry === "threading-insert"
      || operation.startsWith("turn")
      || operation === "grooving"
    ) {
      return ["turning"];
    }
  }

  return [];
}

function holderStyleIdsForRecord(mode: MachineMode, type: string, subcategory: string, interfaceId: string): string[] {
  const signature = `${type} ${subcategory}`.toUpperCase();
  const styles = new Set<string>(["machine-standard"]);

  if (mode === "mill") {
    if (/(HYDRAULIC|ER_COLLET_CHUCK|MILLING_CHUCK|KEYLESS_DRILL_CHUCK|TENSION_COMPRESSION)/.test(signature)) {
      styles.add("hydraulic");
    }
    if (/(SHRINK_FIT|POWRGRIP)/.test(signature)) {
      styles.add("shrink-fit");
    }
  }

  if (mode === "lathe") {
    if (/(OD_TURNING|BORING_BAR|BORING_BAR_SLEEVE|POLYGONAL_CHUCK|BMT_BORING|CAPTO_TURN|CAPTO_BORING)/.test(signature)) {
      styles.add("rigid-turning");
    }
    if (/(LIVE_|AXIAL_DRILL|RADIAL_DRILL|SPEED_MULTIPLIER|ANGULAR_90|CAPTO_ER|CAPTO_HYDRO|TAPER_ADAPTER)/.test(signature)) {
      styles.add("live-tooling");
    }
    if (interfaceId.startsWith("vdi") || interfaceId.startsWith("bmt")) {
      styles.add("twin-turret");
    }
    if (
      interfaceId.startsWith("hsk-t")
      || interfaceId.startsWith("psc")
      || (interfaceId.startsWith("capto") && /(CAPTO_ER|CAPTO_HYDRO|TAPER_ADAPTER|LIVE_)/.test(signature))
    ) {
      styles.add("milling-head");
      styles.add("live-tooling");
    }
  }

  return [...styles];
}

function primaryHolderStyleId(holderStyleIds: string[]): string {
  return holderStyleIds.find((styleId) => styleId !== "machine-standard")
    ?? holderStyleIds[0]
    ?? "machine-standard";
}

function isLiveToolingRecord(type: string, subcategory: string): boolean {
  return /(LIVE_|AXIAL_DRILL|RADIAL_DRILL|SPEED_MULTIPLIER|ANGULAR_90|CAPTO_ER|CAPTO_HYDRO|TAPER_ADAPTER)/.test(
    `${type} ${subcategory}`.toUpperCase(),
  );
}

function isMillingHeadRecord(type: string, subcategory: string, interfaceId: string): boolean {
  if (interfaceId.startsWith("hsk-t") || interfaceId.startsWith("psc")) {
    return true;
  }

  if (!interfaceId.startsWith("capto")) {
    return false;
  }

  return /(CAPTO_ER|CAPTO_HYDRO|TAPER_ADAPTER|LIVE_)/.test(`${type} ${subcategory}`.toUpperCase());
}

function buildDetail(record: RawHolderRecord, interfaceLabel: string, typeLabel: string): string {
  const parts: string[] = [];
  const toolInterface = readText(record.tool_interface);
  const maxRpm = safeNum(record.max_rpm);
  const gaugeLength = safeNum(record.gauge_length_mm);
  const projection = safeNum(record.projection_mm);

  if (interfaceLabel) parts.push(interfaceLabel);
  if (toolInterface) parts.push(toolInterface);
  if (typeLabel) parts.push(typeLabel);
  if (maxRpm > 0) parts.push(`${maxRpm.toLocaleString()} RPM`);
  if (record.coolant_through === true) parts.push("Through coolant");
  if (gaugeLength > 0) parts.push(`Gauge ${gaugeLength} mm`);
  if (projection > 0 && projection !== gaugeLength) parts.push(`Projection ${projection} mm`);

  return parts.join(" · ");
}

function isToolScopedQuery(query: CalculatorToolHolderCatalogQuery): boolean {
  return Boolean(query.toolId || query.toolOperation || query.toolGeometryClass);
}

function loadHolderRows(): RawHolderRecord[] {
  if (cachedHolderRows) return cachedHolderRows;

  if (!fs.existsSync(TOOL_HOLDER_CATALOG_PATH)) {
    cachedHolderRows = [];
    return cachedHolderRows;
  }

  const payload = JSON.parse(fs.readFileSync(TOOL_HOLDER_CATALOG_PATH, "utf8")) as RawHolderRecord;
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  cachedHolderRows = tools.map(asRecord).filter((entry): entry is RawHolderRecord => Boolean(entry));
  return cachedHolderRows;
}

function mapHolderRecord(record: RawHolderRecord): CalculatorToolHolderCatalogItem | null {
  const id = readText(record.id);
  const name = readText(record.name);
  const interfaceLabel = readText(record.spindle_interface);
  const interfaceId = normalizeInterfaceId(interfaceLabel);
  const mode = inferModeFromInterface(interfaceId);

  if (!id || !name || !mode) return null;

  const brandLabel = normalizeBrandLabel(readText(record.vendor) || "Catalog");
  const brandId = optionId(brandLabel, "catalog");
  const type = readText(record.type);
  const subcategory = readText(record.subcategory);
  const typeLabel = humanizeToken(type || subcategory || "holder");
  const holderStyleIds = holderStyleIdsForRecord(mode, type, subcategory, interfaceId);
  const labelBase = stripLeadingVendor(brandLabel, name) || name;
  const compatibleLayoutKinds: ToolingLayoutKind[] = mode === "mill" ? ["magazine"] : ["turret"];

  return {
    id,
    label: `${brandLabel} — ${labelBase}`,
    detail: buildDetail(record, interfaceLabel, typeLabel),
    mode,
    brandId,
    brandLabel,
    holderStyleId: primaryHolderStyleId(holderStyleIds),
    holderStyleIds,
    holderType: type,
    holderSubcategory: subcategory,
    spindleInterface: interfaceLabel || undefined,
    toolInterface: readText(record.tool_interface) || undefined,
    compatibleLayoutKinds,
    compatibleSpindleConnectionTypeIds: mode === "mill" ? [interfaceId] : undefined,
    compatibleTurretTypeIds: mode === "lathe" ? [interfaceId] : undefined,
    requiresLiveTooling: mode === "lathe" ? isLiveToolingRecord(type, subcategory) : false,
    requiresMillingHead: mode === "lathe" ? isMillingHeadRecord(type, subcategory, interfaceId) : false,
    minTurretCount: mode === "lathe" && interfaceId.startsWith("vdi") ? 1 : undefined,
    coolantThrough: record.coolant_through === true,
    maxRpm: safeNum(record.max_rpm) || undefined,
    source: "database",
  };
}

function matchesMachine(query: CalculatorToolHolderCatalogQuery, item: CalculatorToolHolderCatalogItem): boolean {
  if (item.mode !== query.mode) return false;

  if (query.layoutKind && item.compatibleLayoutKinds?.length && !item.compatibleLayoutKinds.includes(query.layoutKind)) {
    return false;
  }

  if (query.mode === "mill") {
    const machineInterfaces = new Set(interfaceAliases(query.spindleConnectionTypeId));
    if (
      item.compatibleSpindleConnectionTypeIds?.length
      && (!machineInterfaces.size || !item.compatibleSpindleConnectionTypeIds.some((interfaceId) => machineInterfaces.has(interfaceId)))
    ) {
      return false;
    }
  }

  if (query.mode === "lathe") {
    const machineTurretInterfaces = new Set(interfaceAliases(query.turretTypeId));
    if (
      item.compatibleTurretTypeIds?.length
      && (!machineTurretInterfaces.size || !item.compatibleTurretTypeIds.some((interfaceId) => machineTurretInterfaces.has(interfaceId)))
    ) {
      return false;
    }
    if (item.requiresLiveTooling && !query.liveTooling && !query.hasMillingHead) {
      return false;
    }
    if (item.requiresMillingHead && !query.hasMillingHead) {
      return false;
    }
    if (item.minTurretCount && safeNum(query.turretCount) < item.minTurretCount) {
      return false;
    }
  }

  return true;
}

function matchesTool(query: CalculatorToolHolderCatalogQuery, item: CalculatorToolHolderCatalogItem): boolean {
  const tags = desiredToolTags(query);
  if (tags.length === 0) return true;

  const capabilityTags = holderCapabilityTags(
    item.mode,
    item.holderType,
    item.holderSubcategory,
    item.toolInterface ?? "",
  );
  return tags.some((tag) => capabilityTags.has(tag));
}

function compareHolders(left: CalculatorToolHolderCatalogItem, right: CalculatorToolHolderCatalogItem): number {
  return left.brandLabel.localeCompare(right.brandLabel)
    || left.label.localeCompare(right.label)
    || (right.maxRpm ?? 0) - (left.maxRpm ?? 0);
}

export function buildCalculatorToolHolderCatalog(
  rows: RawHolderRecord[],
  query: CalculatorToolHolderCatalogQuery,
): CalculatorToolHolderCatalogItem[] {
  const normalized = rows
    .map(mapHolderRecord)
    .filter((entry): entry is CalculatorToolHolderCatalogItem => Boolean(entry))
    .filter((entry) => matchesMachine(query, entry));

  const toolMatched = normalized.filter((entry) => matchesTool(query, entry));
  const resolved = toolMatched.length > 0
    ? toolMatched
    : isToolScopedQuery(query) && desiredToolTags(query).length > 0
      ? []
      : normalized;
  const limit = safeNum(query.limit) || resolved.length;

  return resolved
    .sort(compareHolders)
    .slice(0, limit);
}

export function getCalculatorToolHolderCatalog(
  query: CalculatorToolHolderCatalogQuery,
): CalculatorToolHolderCatalogItem[] {
  const rows = loadHolderRows();
  return buildCalculatorToolHolderCatalog(rows, query);
}
