/**
 * Calculator Data API — fetches machines, materials, and tools from backend registries.
 * Falls back to static catalogs in calculatorWorkspace.ts when the server is unreachable.
 */
import {
  filterCoolantOptionIds,
  MACHINE_CATALOG,
  MATERIAL_CATALOG,
  MATERIAL_GROUPS,
  PROGRAMMING_ENVIRONMENTS,
  TOOL_CATALOG,
  type CoolantOptionId,
  type MachineCatalogItem,
  type MachinePackageConfidence,
  type MachineConfigurationOption,
  type MachineControllerCapabilityOption,
  type MachineGuidewayType,
  type MaterialCatalogItem,
  type MachineMode,
  type MachineTaxonomyProfile,
  type ProgrammingEnvironmentOption,
  type ProgrammingToolpathOption,
  type SelectionOption,
  type ToolCatalogItem,
} from '../data/calculatorWorkspace';
import {
  dedupeSelectionOptions,
  mergeMachineConfigurationOptions,
} from '../utils/machineConfigurationOptions';
import {
  buildCanonicalMachineId,
  buildMachinePackageId,
  buildRegistryMachineProvenance,
  createMachineTaxonomyProfile,
  mergeMachinePackageConfidence,
  mergeMachinePackageProvenance,
} from '../utils/machinePackageContract';

const API_BASE = '/api/v1/data';
const KW_TO_HP = 1.34102209;
const MACHINE_PAGE_SIZE = 100;
const MACHINE_MAX_PAGES = 80;
const MATERIAL_PAGE_SIZE = 500;
const MATERIAL_MAX_PAGES = 20;

let machineCatalogPromise: Promise<MachineCatalogItem[]> | null = null;
let materialCatalogPromise: Promise<MaterialCatalogItem[]> | null = null;
let toolCatalogRowsPromise: Promise<Record<string, unknown>[]> | null = null;
const programmingCatalogPromiseCache = new Map<MachineMode, Promise<CalculatorCatalogLoadState<ProgrammingEnvironmentOption>>>();
const toolCatalogPromiseCache = new Map<MachineMode, Promise<CalculatorCatalogLoadState<ToolCatalogItem>>>();
const holderCatalogPromiseCache = new Map<string, Promise<CalculatorCatalogLoadState<HolderPackageOption>>>();

export function resetCalculatorDataCachesForTest() {
  machineCatalogPromise = null;
  materialCatalogPromise = null;
  toolCatalogRowsPromise = null;
  programmingCatalogPromiseCache.clear();
  toolCatalogPromiseCache.clear();
  holderCatalogPromiseCache.clear();
}

export type CalculatorCatalogSourceState = 'live' | 'hybrid' | 'fallback' | 'empty';

export interface CalculatorCatalogLoadState<T> {
  items: T[];
  source: CalculatorCatalogSourceState;
  liveCount: number;
  fallbackCount: number;
  note: string;
  sampled?: boolean;
}

function safeNum(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown, nestedKeys: string[] = []): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  const record = asRecord(value);
  if (!record) return '';

  for (const key of nestedKeys) {
    const nested = readText(record[key], []);
    if (nested) return nested;
  }

  return '';
}

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedupeLeadingToken(prefix: string, value: string): string {
  const normalizedPrefix = prefix.trim().toLowerCase();
  const trimmedValue = value.trim();
  if (!normalizedPrefix || !trimmedValue) return trimmedValue;

  return trimmedValue.replace(
    new RegExp(`^${escapeRegExp(normalizedPrefix)}(?:[\\s_-]+|$)`, 'i'),
    '',
  ).trimStart();
}

function optionId(label: string, fallback: string): string {
  const normalized = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function dedupeControllerCapabilityOptions(
  options: MachineControllerCapabilityOption[],
): MachineControllerCapabilityOption[] {
  const unique = new Map<string, MachineControllerCapabilityOption>();
  for (const option of options) {
    const existing = unique.get(option.id);
    if (!existing) {
      unique.set(option.id, option);
      continue;
    }
    unique.set(option.id, {
      ...existing,
      detail: existing.detail.length >= option.detail.length ? existing.detail : option.detail,
      checkTip: existing.checkTip.length >= option.checkTip.length ? existing.checkTip : option.checkTip,
      defaultEnabled: Boolean(existing.defaultEnabled || option.defaultEnabled),
    });
  }
  return [...unique.values()];
}

function normalizeManufacturerName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'Unknown';
  const aliasKey = trimmed.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const manufacturerAliases: Record<string, string> = {
    'doosan': 'DN Solutions',
    'dn solutions': 'DN Solutions',
    'dmg mori': 'DMG MORI',
    'dmg-mori': 'DMG MORI',
    'mori seiki': 'DMG MORI',
  };
  const aliased = manufacturerAliases[aliasKey];
  if (aliased) return aliased;
  if (trimmed === trimmed.toUpperCase()) {
    return trimmed
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  if (/[_-]/.test(trimmed)) {
    return humanizeToken(trimmed);
  }
  return trimmed;
}

function normalizeMachineToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  if (!/[A-Za-z]/.test(trimmed)) return trimmed;

  if (
    /^[a-z0-9-]+$/i.test(trimmed)
    && (
      /[0-9]/.test(trimmed)
      || trimmed.length <= 4
      || /^(genos|multus|integrex|cincom|vmc|hmc|osp|vf|st|lb|mu|nhx|nlx|ntx|dmu)$/i.test(trimmed)
    )
  ) {
    return trimmed.toUpperCase();
  }

  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return trimmed;
}

function normalizeMachineModel(manufacturer: string, raw: Record<string, unknown>): string {
  const rawModel = readText(raw.model, ['name', 'label'])
    || readText(raw.name, ['name', 'label'])
    || readText(raw.series, ['name', 'label'])
    || String(raw.id ?? raw.machine_id ?? '').trim();
  const withoutManufacturer = dedupeLeadingToken(manufacturer, rawModel);
  const normalized = withoutManufacturer
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';

  return dedupeLeadingToken(
    manufacturer,
    normalized
      .split(' ')
      .map(normalizeMachineToken)
      .join(' ')
      .replace(/([A-Z0-9])\s+([345]AX)\b/g, '$1-$2')
      .replace(/\s*-\s*/g, '-')
      .trim(),
  );
}

function normalizeSpindleConnection(value: string): { id: string; label: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { id: 'spindle-interface-unknown', label: 'Spindle interface not published' };
  }
  const normalized = trimmed.toLowerCase();

  if (/(cat\s*40).*?(big\+|big plus)|(big\+|big plus).*?(cat\s*40)/i.test(normalized)) {
    return { id: 'cat40-big-plus', label: 'CAT 40 Big+' };
  }
  if (/cat\s*40/i.test(normalized)) {
    return { id: 'cat40', label: 'CAT40' };
  }
  if (/bt\s*50/i.test(normalized)) {
    return { id: 'bt50', label: 'BT50' };
  }
  if (/hsk[\s-]*a\s*63/i.test(normalized)) {
    return { id: 'hsk-a63', label: 'HSK-A63' };
  }

  const label = trimmed;
  return { id: optionId(label, 'spindle-interface'), label };
}

function normalizeTurretInterface(value: string, fallback: 'turret' | 'gang'): { id: string; label: string } {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (/capto\s*c\s*6|coromant\s*capto\s*c\s*6/i.test(normalized)) {
    return { id: 'capto-c6', label: 'CAPTO C6' };
  }
  if (/bmt[\s_-]*45/i.test(normalized)) {
    return { id: 'bmt45', label: 'BMT45' };
  }
  if (/bmt[\s_-]*55/i.test(normalized)) {
    return { id: 'bmt55', label: 'BMT55' };
  }
  if (/bmt[\s_-]*65/i.test(normalized)) {
    return { id: 'bmt65', label: 'BMT65' };
  }
  if (/dual[\s_-]*bmt|\bbmt\b/i.test(normalized)) {
    return { id: 'bmt-standard', label: 'BMT' };
  }
  if (/vdi[\s_-]*30/i.test(normalized)) {
    return { id: 'vdi30', label: 'VDI30' };
  }
  if (/vdi[\s_-]*40/i.test(normalized)) {
    return { id: 'vdi40', label: 'VDI40' };
  }
  if (/vdi[\s_-]*50/i.test(normalized)) {
    return { id: 'vdi50', label: 'VDI50' };
  }
  if (/vdi[\s_-]*80/i.test(normalized)) {
    return { id: 'vdi80', label: 'VDI80' };
  }
  if (/gang/i.test(normalized)) {
    return { id: 'gang-tooling', label: 'Gang tooling' };
  }
  if (/wedge|disc|bot/i.test(normalized)) {
    return { id: 'turret-standard', label: 'Turret standard' };
  }

  const label = trimmed || (fallback === 'gang' ? 'Gang tooling' : 'Turret standard');
  return { id: optionId(label, fallback === 'gang' ? 'gang-tooling' : 'turret-standard'), label };
}

function inferTurretCount(raw: Record<string, unknown>, signature: string): number {
  const turrets = unwrapCollection(raw.turrets);
  if (turrets.length > 0) return turrets.length;

  const turret = asRecord(raw.turret);
  const rawCountCandidate =
    turret?.count
    ?? raw.turret_count
    ?? raw.turretCount
    ?? raw.second_turret_count
    ?? raw.secondTurretCount;
  const explicitCount = typeof rawCountCandidate === 'boolean'
    ? Number.NaN
    : safeNum(rawCountCandidate, Number.NaN);
  if (Number.isFinite(explicitCount) && explicitCount > 0) {
    return explicitCount;
  }
  if (Boolean(raw.dual_turret ?? raw.dualTurret ?? raw.second_turret ?? raw.secondTurret)) {
    return 2;
  }
  if (/twin turret|dual turret|two turrets|2 turrets/.test(signature)) {
    return 2;
  }
  return turret || /turret/.test(signature) ? 1 : 0;
}

function inferHasMillingHead(signature: string): boolean {
  return /mill-turn|mill turn|multi-task|multitask|multus|integrex|b-axis|b axis/.test(signature);
}

function buildMachineSignature(raw: Record<string, unknown>): string {
  const specs = asRecord(raw.specs);
  const controller = asRecord(raw.controller);
  const spindle = asRecord(raw.spindle);
  const coolant = asRecord(raw.coolant);
  const featureRecord = asRecord(raw.features);
  const turret = asRecord(raw.turret);
  const capabilities = Array.isArray(raw.capabilities) ? raw.capabilities.map(String).join(' ') : '';

  return [
    raw.id,
    raw.mode,
    raw.machine_type,
    raw.type,
    raw.subtype,
    raw.family,
    raw.category,
    raw.series,
    raw.description,
    raw.name,
    raw.model,
    raw.layer,
    specs?.type,
    specs?.machineType,
    specs?.configurationType,
    specs?.layout,
    specs?.orientation,
    specs?.table,
    specs?.axisLayout,
    controller?.brand,
    controller?.model,
    controller?.type,
    spindle?.type,
    spindle?.spindle_nose,
    coolant?.type,
    coolant?.tscAvailable ? 'tsc available' : '',
    coolant?.air_blast || coolant?.airBlast ? 'air blast' : '',
    capabilities,
    featureRecord ? Object.keys(featureRecord).join(' ') : '',
    raw.tool_interface,
    raw.toolInterface,
    raw.turret_type,
    raw.turretType,
    turret?.type,
    turret?.interface,
    raw.live_tools ? 'live tools' : '',
    raw.liveTools ? 'live tools' : '',
    raw.live_tooling ? 'live tooling' : '',
    raw.liveTooling ? 'live tooling' : '',
    raw.subSpindle ? 'sub spindle' : '',
    raw.guide_bushing ? 'guide bushing' : '',
    raw.sub_spindle ? 'sub spindle' : '',
    raw.counter_spindle ? 'counter spindle' : '',
    raw.counterSpindle ? 'counter spindle' : '',
    raw.dual_turret ? 'dual turret' : '',
    raw.dualTurret ? 'dual turret' : '',
    raw.y_axis ? 'y axis' : '',
    raw.yAxis ? 'y axis' : '',
    raw.b_axis ? 'b axis' : '',
    raw.bAxis ? 'b axis' : '',
    raw.milling_head ? 'milling head' : '',
    raw.millingHead ? 'milling head' : '',
    raw.turret ? 'turret' : '',
    raw.tailstock ? 'tailstock' : '',
    raw.chuck ? 'chuck' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasLatheStructure(raw: Record<string, unknown>): boolean {
  return Boolean(
    raw.turret
    || raw.sub_spindle
    || raw.counter_spindle
    || raw.guide_bushing
    || raw.bar_capacity
    || raw.barCapacity
    || raw.chuck
    || raw.tailstock
    || raw.parts_catcher
    || raw.partsCatcher,
  );
}

function readMillAxisCount(raw: Record<string, unknown>, signature: string, isHorizontal: boolean): number {
  const specs = asRecord(raw.specs);
  const controller = asRecord(raw.controller);
  const workEnvelope = asRecord(raw.work_envelope);
  const declaredAxes = safeNum(specs?.axes ?? raw.axes ?? controller?.axes, Number.NaN);
  if (Number.isFinite(declaredAxes) && declaredAxes >= 5) return 5;
  if (Number.isFinite(declaredAxes) && declaredAxes >= 4) return 4;
  if (
    /5axis|5-axis|5_axis|trunnion|table-head|head-table|simultaneous\s*5|five-axis/.test(signature)
    || workEnvelope?.a_axis
    || workEnvelope?.b_axis
    || workEnvelope?.c_axis
  ) {
    return 5;
  }
  if (/4axis|4-axis|4_axis|rotary|tombstone|b-axis/.test(signature)) return 4;
  if (isHorizontal && /\bhmc\b|horizontal/.test(signature)) return 4;
  return 3;
}

function inferMachineType(raw: Record<string, unknown>, mode: MachineMode, signature: string): MachineTaxonomyProfile {
  const hasPublishedTurnMill = Boolean(asRecord(raw.millingSpindle))
    || /mill[\s_-]*turn|multi[\s_-]*task|vtl[\s_-]*millturn/.test(String(raw.type ?? '').toLowerCase())
    || safeNum(raw.simultaneous_axes, 0) >= 5;

  if (mode === 'mill') {
    if (/gantry|bridge\s*mill/.test(signature)) {
      const axisCount = readMillAxisCount(raw, signature, false);
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'mill-gantry',
        familyLabel: 'Gantry / Bridge Mill',
        machineTypeId: `mill_gantry_${axisCount}`,
        machineTypeLabel: `${axisCount}-Axis Gantry`,
        axisClass: `${axisCount}-axis` as MachineTaxonomyProfile['axisClass'],
        orientation: 'gantry',
      });
    }

    const isHorizontal = /\bhmc\b|horizontal|pallet/.test(signature);
    const axisCount = readMillAxisCount(raw, signature, isHorizontal);
    const orientation = isHorizontal ? 'Horizontal' : 'Vertical';
    const familyBase = isHorizontal ? 'Horizontal Machining Center' : 'Vertical Machining Center';
    return createMachineTaxonomyProfile({
      mode,
      familyId: isHorizontal ? 'mill-horizontal' : 'mill-vertical',
      familyLabel: `${axisCount}-Axis ${familyBase}`,
      machineTypeId: `mill_${isHorizontal ? 'horizontal' : 'vertical'}_${axisCount}`,
      machineTypeLabel: `${axisCount}-Axis ${orientation}`,
      axisClass: `${axisCount}-axis` as MachineTaxonomyProfile['axisClass'],
      orientation: isHorizontal ? 'horizontal' : 'vertical',
    });
  }

  if (mode === 'lathe') {
    if (/swiss|cincom|guide bushing/.test(signature)) {
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'lathe-swiss',
        familyLabel: 'Swiss-Type Lathe',
        machineTypeId: 'lathe_swiss',
        machineTypeLabel: 'Swiss-Type Lathe',
        axisClass: 'swiss',
        orientation: 'swiss',
      });
    }
    if ((/vertical turret lathe|\bvtl\b|\bvtm\b/.test(signature)) && hasPublishedTurnMill) {
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'lathe-vtl-multitask',
        familyLabel: 'Vertical Turn-Mill Center',
        machineTypeId: 'lathe_multitask',
        machineTypeLabel: 'Vertical Turn-Mill / Multi-Tasking',
        axisClass: 'turning',
        orientation: 'multitask',
      });
    }
    if (/vertical turret lathe|\bvtl\b|\bvtm\b/.test(signature)) {
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'lathe-vtl',
        familyLabel: 'Vertical Turret Lathe',
        machineTypeId: 'lathe_vtl',
        machineTypeLabel: 'Vertical Turret Lathe',
        axisClass: 'turning',
        orientation: 'vtl',
      });
    }
    if (/mill-turn|mill turn|multus|integrex|multi-task|multitask/.test(signature)) {
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'lathe-multitask',
        familyLabel: 'Mill-Turn / Multi-Tasking Center',
        machineTypeId: 'lathe_multitask',
        machineTypeLabel: 'Mill-Turn / Multi-Tasking',
        axisClass: 'turning',
        orientation: 'multitask',
      });
    }
    if (/sub-spindle|sub spindle|counter spindle/.test(signature)) {
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'lathe-subspindle',
        familyLabel: 'Sub-Spindle Turning Center',
        machineTypeId: 'lathe_subspindle',
        machineTypeLabel: 'Sub-Spindle Turning Center',
        axisClass: 'turning',
        orientation: 'turning',
      });
    }
    if (/y-axis|y axis|c-axis|c axis|live tooling|live-tool/.test(signature) || Boolean(asRecord(raw.turret)?.live_tooling)) {
      return createMachineTaxonomyProfile({
        mode,
        familyId: 'lathe-y-axis',
        familyLabel: 'Y-Axis Turning Center',
        machineTypeId: 'lathe_y_axis',
        machineTypeLabel: 'Y-Axis / Live Tool',
        axisClass: 'turning',
        orientation: 'turning',
      });
    }
    return createMachineTaxonomyProfile({
      mode,
      familyId: 'lathe-2axis',
      familyLabel: 'Turning Center',
      machineTypeId: 'lathe_2axis',
      machineTypeLabel: '2-Axis Turning Center',
      axisClass: '2-axis',
      orientation: 'turning',
    });
  }

  if (mode === 'edm') {
    return createMachineTaxonomyProfile({
      mode,
      familyId: 'edm-sinker',
      familyLabel: 'Sinker EDM',
      machineTypeId: 'edm_sinker',
      machineTypeLabel: 'Sinker EDM',
      axisClass: '3-axis',
      orientation: 'sinker',
    });
  }
  if (mode === 'wire_edm') {
    return createMachineTaxonomyProfile({
      mode,
      familyId: 'wire-edm',
      familyLabel: 'Wire EDM',
      machineTypeId: 'wire_edm_wire',
      machineTypeLabel: 'Wire EDM',
      axisClass: 'xyuv',
      orientation: 'wire',
    });
  }
  if (mode === 'laser') {
    return createMachineTaxonomyProfile({
      mode,
      familyId: 'laser-fiber',
      familyLabel: 'Laser cutting system',
      machineTypeId: 'laser_fiber',
      machineTypeLabel: 'Fiber Laser',
      axisClass: '2d',
      orientation: 'laser',
    });
  }
  return createMachineTaxonomyProfile({
    mode,
    familyId: 'waterjet-abrasive',
    familyLabel: 'Waterjet cutting system',
    machineTypeId: 'waterjet_abrasive',
    machineTypeLabel: 'Abrasive Waterjet',
    axisClass: '2d',
    orientation: 'waterjet',
  });
}

async function dataRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Data route ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.result ?? json.data ?? json;
}

// ─── Machine catalog ────────────────────────────────────────────

function inferMachineMode(raw: Record<string, unknown>): MachineMode {
  const signature = buildMachineSignature(raw);

  if (signature.includes('wire')) return 'wire_edm';
  if (signature.includes('laser')) return 'laser';
  if (signature.includes('waterjet') || signature.includes('abrasive jet') || signature.includes('water jet')) {
    return 'waterjet';
  }
  if (signature.includes('sinker') || signature.includes('ram edm') || signature.includes('edm')) return 'edm';
  if (
    hasLatheStructure(raw)
    || /lathe|turning center|\bturn\b|swiss|cincom|mill-turn|mill turn|multi-task|multitask|multus|integrex|chucker|sub-spindle|sub spindle|counter spindle|quick turn|genos l|lb\d|nlx|ntx|lynx|puma|tt[-\d]|wt[-\d]|vertical turret lathe|\bvtl\b|\bvtm\b/.test(signature)
  ) {
    return 'lathe';
  }
  return 'mill';
}

function isAccessoryMachineRecord(raw: Record<string, unknown>): boolean {
  const specs = asRecord(raw.specs);
  const descriptors = [
    raw.mode,
    raw.machine_type,
    raw.type,
    raw.subtype,
    raw.category,
    raw.component,
    raw.axis_type,
    specs?.type,
    specs?.machineType,
    specs?.configurationType,
  ]
    .map((value) => readText(value))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /\b(rotary[_ -]?table|floor[_ -]?rotary[_ -]?table|swivel[_ -]?head[_ -]?rotary[_ -]?table|c[_ -]?rotary[_ -]?table)\b/.test(descriptors);
}

function extractTravel(value: unknown): number | null {
  const direct = safeNum(value, Number.NaN);
  if (Number.isFinite(direct)) return direct;
  const record = asRecord(value);
  if (!record) return null;
  const travel = safeNum(record.travel, Number.NaN);
  if (Number.isFinite(travel)) return travel;
  const max = safeNum(record.max, Number.NaN);
  const min = safeNum(record.min, Number.NaN);
  if (Number.isFinite(max) && Number.isFinite(min)) return Math.abs(max - min);
  if (Number.isFinite(max)) return max;
  return null;
}

function formatEnvelope(raw: Record<string, unknown>): string {
  const travelRecord = asRecord(raw.travels);
  const workEnvelope = asRecord(raw.work_envelope);
  const specs = asRecord(raw.specs);
  const x = extractTravel(travelRecord?.x ?? workEnvelope?.x);
  const y = extractTravel(travelRecord?.y ?? workEnvelope?.y);
  const z = extractTravel(travelRecord?.z ?? workEnvelope?.z);

  if ([x, y, z].every((value) => value != null)) {
    return `${Math.round(x ?? 0)} x ${Math.round(y ?? 0)} x ${Math.round(z ?? 0)} mm`;
  }

  const table = asRecord(raw.table);
  const tableLength = safeNum(table?.length ?? specs?.tableLength ?? specs?.table_length, Number.NaN);
  const tableWidth = safeNum(table?.width ?? specs?.tableWidth ?? specs?.table_width ?? specs?.pallet, Number.NaN);
  if (Number.isFinite(tableLength) && Number.isFinite(tableWidth)) {
    return `${Math.round(tableLength)} x ${Math.round(tableWidth)} mm table`;
  }

  const fallback = String(raw.envelope ?? raw.work_envelope ?? '').trim();
  return fallback || 'Envelope not published';
}

function formatMachineFamily(raw: Record<string, unknown>, mode: MachineMode): string {
  const direct = String(raw.family ?? raw.category ?? '').trim();
  if (direct) return direct;

  const signature = String(raw.subtype ?? raw.type ?? raw.machine_type ?? '').toLowerCase();
  if (mode === 'mill') {
    if (signature.includes('5_axis') || signature.includes('5axis') || signature.includes('trunnion')) {
      return 'Multiaxis machining center';
    }
    return 'Machining center';
  }
  if (mode === 'lathe') {
    if (signature.includes('swiss')) return 'Swiss-type lathe';
    return 'Turning center';
  }
  if (mode === 'edm') return 'Sinker EDM';
  if (mode === 'wire_edm') return 'Wire EDM';
  if (mode === 'laser') return 'Laser cutting system';
  return 'Waterjet cutting system';
}

function formatAxes(raw: Record<string, unknown>, mode: MachineMode): string {
  const signature = [
    raw.type,
    raw.subtype,
    raw.description,
    raw.name,
    raw.model,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const controller = asRecord(raw.controller);
  const controllerAxes = safeNum(controller?.axes, 0);
  const workEnvelope = asRecord(raw.work_envelope);

  if (mode === 'mill') {
    if (
      signature.includes('5axis')
      || signature.includes('5-axis')
      || signature.includes('5_axis')
      || signature.includes('trunnion')
      || controllerAxes >= 5
      || workEnvelope?.a_axis
      || workEnvelope?.c_axis
    ) {
      return '5-axis';
    }
    if (signature.includes('4-axis') || signature.includes('4_axis') || signature.includes('rotary')) {
      return '4-axis';
    }
    if (signature.includes('3+2')) return '3+2';
    return '3-axis';
  }

  if (mode === 'lathe') {
    if (signature.includes('swiss') || signature.includes('cincom')) return 'Swiss / gang tooling';
    if (
      signature.includes('y-axis')
      || signature.includes('y axis')
      || signature.includes('c-axis')
      || signature.includes('c axis')
      || signature.includes('live')
      || signature.includes('mill-turn')
    ) {
      return 'C/Y live-tool capable';
    }
    return '2-axis turning center';
  }

  if (mode === 'edm') return '3-axis burn platform';
  if (mode === 'wire_edm') return 'XYUV wire path';
  if (mode === 'laser') return '2D cutting platform';
  return '2D + taper control';
}

function formatCoolant(raw: Record<string, unknown>, mode: MachineMode): string {
  const direct = typeof raw.coolant === 'string'
    ? raw.coolant.trim()
    : typeof raw.coolant_type === 'string'
      ? raw.coolant_type.trim()
      : '';
  if (direct) return direct;

  if (mode === 'edm') return 'Dielectric and flushing setup';
  if (mode === 'wire_edm') return 'DI water and flushing';
  if (mode === 'laser') return 'Assist gas only';
  if (mode === 'waterjet') return 'Water + abrasive';

  const coolant = asRecord(raw.coolant);
  const spindle = asRecord(raw.spindle);
  const specs = asRecord(raw.specs);
  const hasTsc = Boolean(coolant?.tsc ?? spindle?.coolant_through ?? specs?.tsc);
  const hasThroughAir = Boolean(coolant?.through_air ?? spindle?.through_air ?? specs?.through_air);
  const hasAirBlast = Boolean(coolant?.air ?? coolant?.air_blast ?? specs?.air ?? specs?.air_blast);
  const tscPressure = safeNum(coolant?.tsc_pressure_bar ?? spindle?.coolant_pressure ?? specs?.tscPressure ?? specs?.tsc_pressure_bar, Number.NaN);
  const floodPressure = safeNum(coolant?.pressure_bar, Number.NaN);
  const parts: string[] = ['Flood-ready'];
  if (hasTsc) parts.push('Through-spindle coolant');
  if (hasThroughAir) parts.push('Through-air');
  if (hasAirBlast) parts.push('Air blast');
  if (Number.isFinite(tscPressure)) {
    parts.push(`${Math.round(tscPressure)} bar TSC`);
  } else if (Number.isFinite(floodPressure)) {
    parts.push(`${Math.round(floodPressure)} bar flood`);
  }
  return parts.join(' · ');
}

function buildCoolantOptionIds(raw: Record<string, unknown>, mode: MachineMode): MachineCatalogItem['coolantOptionIds'] {
  if (mode === 'edm' || mode === 'wire_edm' || mode === 'waterjet') {
    return ['dielectric'];
  }
  if (mode === 'laser') {
    return ['air'];
  }

  const normalized = new Set<CoolantOptionId>();
  const directText = [
    typeof raw.coolant === 'string' ? raw.coolant : '',
    typeof raw.coolant_type === 'string' ? raw.coolant_type : '',
    String(raw.description ?? ''),
    String(asRecord(raw.specs)?.coolant ?? ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const coolant = asRecord(raw.coolant);
  const spindle = asRecord(raw.spindle);
  const specs = asRecord(raw.specs);

  if (
    Boolean(
      coolant?.tsc
      ?? coolant?.tscAvailable
      ?? coolant?.through_tool
      ?? spindle?.coolant_through
      ?? specs?.tsc
      ?? raw.tsc_available
      ?? raw.tscAvailable,
    )
    || Number.isFinite(
      safeNum(
        coolant?.tsc_pressure_bar
          ?? coolant?.tscPressure
          ?? specs?.tsc_pressure_bar
          ?? specs?.tscPressure,
        Number.NaN,
      ),
    )
    || /(through[-\s]?spindle|through[-\s]?tool|\btsc\b|high-pressure)/.test(directText)
  ) {
    normalized.add('tsc');
    normalized.add('flood');
  }
  if (
    Boolean(coolant?.through_air ?? spindle?.through_air ?? specs?.through_air)
    || /\bthrough[-\s]?air\b|\bspindle[-\s]?air\b|\bair[-\s]?through\b/.test(directText)
  ) {
    normalized.add('through_air');
  }
  if (Boolean(coolant?.mist ?? coolant?.mql ?? specs?.mist ?? specs?.mql) || /\bmist\b|\bmql\b/.test(directText)) {
    normalized.add('mist');
  }
  if (
    Boolean(
      coolant?.air
      ?? coolant?.air_blast
      ?? coolant?.airBlast
      ?? specs?.air
      ?? specs?.air_blast
      ?? specs?.airBlast
      ?? raw.air_blast
      ?? raw.airBlast,
    )
    || /\bair\s*blast\b|\bblast\b|\bdry\b/.test(directText)
  ) {
    normalized.add('air');
  }
  if (/\bdielectric\b|\bflush(?:ing)?\b|\bdi water\b|\bdeionized\b|\babrasive\b/.test(directText)) {
    normalized.add('dielectric');
  }

  const floodPressure = safeNum(coolant?.pressure_bar, Number.NaN);
  if (
    Boolean(coolant?.flood ?? specs?.flood)
    || Number.isFinite(floodPressure)
    || /\bflood\b|\bcoolant\b|\boil\b/.test(directText)
  ) {
    normalized.add('flood');
  }

  return filterCoolantOptionIds(Array.from(normalized), mode);
}

function extractSpindleRpm(raw: Record<string, unknown>): number {
  const spindle = asRecord(raw.spindle);
  const specs = asRecord(raw.specs);
  return safeNum(
    raw.max_rpm
      ?? raw.spindle_rpm
      ?? raw.spindleRpm
      ?? specs?.maxRpm
      ?? specs?.max_rpm
      ?? specs?.rpm
      ?? spindle?.max_rpm
      ?? spindle?.rpm,
    0,
  );
}

function extractPowerHp(raw: Record<string, unknown>): number {
  const spindle = asRecord(raw.spindle);
  const specs = asRecord(raw.specs);
  const directHp = safeNum(
    raw.power_hp
      ?? raw.powerHp
      ?? raw.power
      ?? specs?.peakHp
      ?? specs?.peak_hp
      ?? specs?.power_hp
      ?? specs?.hp
      ?? spindle?.power_hp,
    Number.NaN,
  );
  if (Number.isFinite(directHp)) return Math.round(directHp * 10) / 10;

  const kw = safeNum(
    specs?.powerKw
      ?? specs?.power_kw
      ?? spindle?.power_kw
      ?? spindle?.power_continuous
      ?? spindle?.power_30min,
    Number.NaN,
  );
  if (Number.isFinite(kw)) return Math.round(kw * KW_TO_HP * 10) / 10;

  return 0;
}

function extractGuidewayType(raw: Record<string, unknown>): MachineGuidewayType | undefined {
  const signature = [
    readText(raw.guideway),
    readText(raw.guideways),
    readText(raw.ways),
    readText(raw.slideways),
    readText(raw.features),
    readText(raw.description),
    readText(raw.specs, ['guideway', 'guideways', 'ways', 'slideways']),
    buildMachineSignature(raw),
  ]
    .join(' ')
    .toLowerCase();

  if (!signature) return undefined;
  if (/hydrostatic/.test(signature)) return 'hydrostatic';
  if (/box[\s_-]*way|boxway/.test(signature)) return 'box';
  if (/linear[\s_-]*guide|roller[\s_-]*guide|roller[\s_-]*way|lm[\s_-]*guide|linear[\s_-]*way/.test(signature)) {
    return 'linear';
  }
  return undefined;
}

function extractNaturalFrequencyHz(raw: Record<string, unknown>): number | undefined {
  const spindle = asRecord(raw.spindle);
  const specs = asRecord(raw.specs);
  const value = safeNum(
    raw.natural_frequency_hz
      ?? raw.naturalFrequencyHz
      ?? raw.nat_freq_hz
      ?? raw.natFreqHz
      ?? specs?.natural_frequency_hz
      ?? specs?.naturalFrequencyHz
      ?? specs?.nat_freq_hz
      ?? spindle?.natural_frequency_hz
      ?? spindle?.naturalFrequencyHz,
    Number.NaN,
  );
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function extractAxisAccelerationMps2(raw: Record<string, unknown>): number | undefined {
  const specs = asRecord(raw.specs);
  const value = safeNum(
    raw.accel_m_s2
      ?? raw.axis_accel_m_s2
      ?? raw.axisAccelerationMps2
      ?? raw.acceleration_m_s2
      ?? specs?.accel_m_s2
      ?? specs?.axis_accel_m_s2
      ?? specs?.axisAccelerationMps2
      ?? specs?.acceleration_m_s2,
    Number.NaN,
  );
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function extractAxisJerkMps3(raw: Record<string, unknown>): number | undefined {
  const specs = asRecord(raw.specs);
  const value = safeNum(
    raw.jerk_m_s3
      ?? raw.axis_jerk_m_s3
      ?? raw.axisJerkMps3
      ?? specs?.jerk_m_s3
      ?? specs?.axis_jerk_m_s3
      ?? specs?.axisJerkMps3,
    Number.NaN,
  );
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function buildMachineNotes(raw: Record<string, unknown>): string[] {
  const notes: string[] = [];
  const description = String(raw.description ?? '').trim();
  if (description) notes.push(description);
  if (raw.has3DModel === true) notes.push('3D model available for simulation');

  const atc = asRecord(raw.atc);
  const capacity = safeNum(atc?.capacity, Number.NaN);
  if (Number.isFinite(capacity) && capacity > 0) {
    notes.push(`${capacity} tool capacity in registry profile`);
  }

  const layer = String(raw.layer ?? '').trim();
  if (layer) notes.push(`${humanizeToken(layer)} machine registry profile`);
  return notes.slice(0, 3);
}

function isOkumaM460(machine: Pick<MachineCatalogItem, 'mode' | 'manufacturer' | 'model' | 'canonicalMachineId'>): boolean {
  if (machine.mode !== 'mill') return false;
  if (machine.canonicalMachineId?.toLowerCase() === 'mill-okuma-genos-m460v-5ax') return true;
  const modelSignature = machine.model.replace(/[^a-z0-9]+/gi, '').toLowerCase();
  return machine.manufacturer.trim().toLowerCase() === 'okuma'
    && modelSignature.includes('genosm460v5ax');
}

function applyKnownMachineCatalogOverrides(machine: MachineCatalogItem): MachineCatalogItem {
  if (!isOkumaM460(machine)) {
    return machine;
  }

  const curatedMachine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
  const nextNotes = [
    ...machine.notes.filter((note) => !/tool capacity in registry profile/i.test(note)),
    'Shop-audited magazine presets: 30, 48, or 60 tools. Local default is 48.',
  ].slice(0, 4);
  const toolingStationOptions = [
    ...(machine.toolingLayout?.stationOptions ?? []),
    ...(curatedMachine?.toolingLayout?.stationOptions ?? []),
    30,
    48,
    60,
  ].filter((value): value is number => Number.isFinite(value));
  const genericCat40Interface = machine.toolingLayout?.interfaceId === 'cat40' || machine.toolingLayout?.spindleConnectionTypeId === 'cat40';
  const preferredInterface =
    !genericCat40Interface && machine.toolingLayout?.interface
      ? machine.toolingLayout.interface
      : curatedMachine?.toolingLayout?.interface ?? machine.toolingLayout?.interface ?? 'CAT 40 Big+';
  const preferredInterfaceId =
    !genericCat40Interface && machine.toolingLayout?.interfaceId
      ? machine.toolingLayout.interfaceId
      : curatedMachine?.toolingLayout?.interfaceId ?? machine.toolingLayout?.interfaceId ?? 'cat40-big-plus';
  const preferredSpindleConnectionTypeId =
    !genericCat40Interface && machine.toolingLayout?.spindleConnectionTypeId
      ? machine.toolingLayout.spindleConnectionTypeId
      : curatedMachine?.toolingLayout?.spindleConnectionTypeId ?? machine.toolingLayout?.spindleConnectionTypeId ?? 'cat40-big-plus';
  const preferredSpindleConnectionLabel =
    !genericCat40Interface && machine.toolingLayout?.spindleConnectionLabel
      ? machine.toolingLayout.spindleConnectionLabel
      : curatedMachine?.toolingLayout?.spindleConnectionLabel ?? machine.toolingLayout?.spindleConnectionLabel ?? 'CAT 40 Big+';

  return {
    ...machine,
    coolantOptionIds: filterCoolantOptionIds(
      [
        ...new Set([
          ...machine.coolantOptionIds,
          ...(curatedMachine?.coolantOptionIds ?? []),
          'flood',
          'tsc',
          'through_air',
          'air',
        ]),
      ],
      machine.mode,
    ),
    controllerCapabilityOptions: dedupeControllerCapabilityOptions([
      ...(machine.controllerCapabilityOptions ?? []),
      ...(curatedMachine?.controllerCapabilityOptions ?? []),
    ]),
    notes: nextNotes,
    toolingLayout: {
      ...(curatedMachine?.toolingLayout ?? {}),
      ...(machine.toolingLayout ?? {}),
      kind: 'magazine',
      stations: 48,
      stationOptions: [...new Set(toolingStationOptions)].sort((left, right) => left - right),
      allowCustomStations: true,
      interface: preferredInterface,
      interfaceId: preferredInterfaceId,
      spindleConnectionTypeId: preferredSpindleConnectionTypeId,
      spindleConnectionLabel: preferredSpindleConnectionLabel,
      liveTooling: false,
    },
    guidewayType: machine.guidewayType ?? curatedMachine?.guidewayType ?? 'box',
    naturalFrequencyHz: machine.naturalFrequencyHz ?? curatedMachine?.naturalFrequencyHz ?? 680,
    axisAccelerationMps2: machine.axisAccelerationMps2 ?? curatedMachine?.axisAccelerationMps2 ?? 5.5,
    axisJerkMps3: machine.axisJerkMps3 ?? curatedMachine?.axisJerkMps3 ?? 12,
  };
}

function buildBestFor(mode: MachineMode): string[] {
  switch (mode) {
    case 'mill':
      return ['General-purpose milling', 'Fixture-based production', 'Simulation-backed prove-out'];
    case 'lathe':
      return ['OD / ID turning', 'Chucking and shaft work', 'Live-tool handoff'];
    case 'edm':
      return ['Rib and cavity burns', 'Sharp internal corners', 'Electrode-driven finishing'];
    case 'wire_edm':
      return ['Tight contouring', 'Skim-pass finishing', 'Punch / die detail'];
    case 'laser':
      return ['Sheet profiling', 'Nested work', 'Edge-quality packages'];
    case 'waterjet':
      return ['Heat-sensitive material', 'Thick plate', 'Cold-cut contouring'];
    default:
      return ['General production'];
  }
}

function buildControllerOption(
  rawController: unknown,
  fallbackId: string,
): MachineCatalogItem['controllerOptions'][number] | null {
  if (typeof rawController === 'string' || typeof rawController === 'number') {
    const label = String(rawController).trim();
    if (!label) return null;
    return {
      id: optionId(label, fallbackId),
      label,
      detail: 'Registered machine controller',
    };
  }

  const controller = asRecord(rawController);
  if (!controller) return null;
  const brand = readText(controller.brand, ['name', 'label']) || readText(controller.manufacturer, ['name', 'label']);
  const model = dedupeLeadingToken(
    brand,
    readText(controller.model, ['name', 'label']) || readText(controller.name, ['name', 'label']),
  );
  const label = [brand, model].filter(Boolean).join(' ') || humanizeToken(String(controller.type ?? 'controller'));
  const detailParts = [
    String(controller.type ?? '').trim(),
    Number.isFinite(safeNum(controller.axes, Number.NaN)) && safeNum(controller.axes, Number.NaN) > 0
      ? `${Math.round(safeNum(controller.axes, 0))} axis channels`
      : '',
    controller.tcpc || controller.tcpm ? 'TCPC / TCPM ready' : '',
  ].filter(Boolean);

  return {
    id: optionId(label, fallbackId),
    label,
    detail: detailParts.join(' · ') || 'Registered machine controller',
  };
}

function buildControllerOptions(raw: Record<string, unknown>): MachineCatalogItem['controllerOptions'] {
  const multi = [
    ...unwrapCollection(raw.controllers),
    ...unwrapCollection(raw.controller_options),
    ...unwrapCollection(raw.control_options),
  ];
  const normalized = multi
    .map((entry, index) => buildControllerOption(entry, `controller-${index + 1}`))
    .filter(Boolean) as MachineCatalogItem['controllerOptions'];
  if (normalized.length > 0) return normalized;

  const single = buildControllerOption(raw.controller, 'controller-standard');
  if (single) return [single];

  return [
    {
      id: 'controller-pending',
      label: 'Controller pending',
      detail: 'Live registry has not published a controller profile for this machine yet.',
    },
  ];
}

function controllerCapabilityOption(
  id: string,
  label: string,
  detail: string,
  checkTip: string,
  defaultEnabled = false,
): MachineControllerCapabilityOption {
  return { id, label, detail, checkTip, defaultEnabled };
}

function hasFiveAxisProfile(machineType: MachineTaxonomyProfile, signature: string): boolean {
  return machineType.machineTypeId.endsWith('_5') || /5axis|5-axis|trunnion|simultaneous\s*5|b-axis/.test(signature);
}

function buildControllerCapabilityOptions(
  raw: Record<string, unknown>,
  mode: MachineMode,
  machineType: MachineTaxonomyProfile,
  controllerOptions: MachineCatalogItem['controllerOptions'],
  spindleRpm: number,
): MachineControllerCapabilityOption[] {
  const manufacturer = normalizeManufacturerName(
    readText(raw.manufacturer, ['name', 'label', 'manufacturer', 'brand', 'make'])
      || readText(raw.brand, ['name', 'label'])
      || '',
  ).toLowerCase();
  const controllerSignature = controllerOptions.map((option) => option.label).join(' ').toLowerCase();
  const signature = buildMachineSignature(raw);
  const fiveAxis = hasFiveAxisProfile(machineType, signature);
  const highSpeedDefault = spindleRpm >= 15000 || /high-speed|super-speed|high precision/.test(signature);

  const okumaTechnologies = asRecord(raw.okuma_technologies);
  const collisionAvoidance = asRecord(okumaTechnologies?.collision_avoidance);
  const machiningNavi = asRecord(okumaTechnologies?.machining_navi);
  const thermoFriendly = asRecord(okumaTechnologies?.thermo_friendly_concept);
  const collisionModel = asRecord(raw.collision_model);
  const collisionConfig =
    asRecord(collisionModel?.collision_config) ?? asRecord(asRecord(raw.geometry_reference)?.collision_config);
  const publishedCas = Boolean(collisionAvoidance?.enabled || collisionConfig?.okuma_cas_compatible);
  const publishedMachiningNavi = Boolean(machiningNavi?.enabled);
  const publishedThermoFriendly = Boolean(thermoFriendly?.enabled);
  const okumaTurningAdvanced =
    mode === 'lathe'
    && (
      machineType.machineTypeId === 'lathe_multitask'
      || machineType.machineTypeId === 'lathe_subspindle'
      || /live|mill-turn|multus|integrex|multi-task|multitask|y-axis|y axis|b-axis|b axis/.test(signature)
    );

  const options: MachineControllerCapabilityOption[] = [];

  if ((mode === 'mill' || mode === 'lathe') && (manufacturer.includes('okuma') || controllerSignature.includes('osp'))) {
    options.push(
      controllerCapabilityOption(
        'okuma-cas',
        'CAS collision avoidance',
        'Okuma Collision Avoidance System with machine-model checks for prove-out and multiaxis motion.',
        'Check CAS licensing, active machine model data, and collision-check settings on the OSP control.',
        publishedCas,
      ),
      controllerCapabilityOption(
        'okuma-machining-navi',
        'Machining Navi',
        'Okuma adaptive cutting-condition and chatter-control package.',
        'Verify Machining Navi pages are present on the control and unlocked for the current machine.',
        publishedMachiningNavi,
      ),
      controllerCapabilityOption(
        'okuma-hsm',
        'High-speed machining mode',
        mode === 'lathe'
          ? 'Smoothing / high-speed contouring mode for live-tool, Y-axis, and multitask turning workflows.'
          : 'Smoothing / high-speed contouring mode for 3D finishing and faster multiaxis motion.',
        mode === 'lathe'
          ? 'Confirm the OSP option and post are calling the licensed smooth-turn / multitask contour mode for the active job.'
          : 'Confirm the post or template is calling the licensed OSP smoothing mode for the current job.',
        highSpeedDefault || okumaTurningAdvanced,
      ),
      controllerCapabilityOption(
        'okuma-hpcc',
        'High-precision contour control',
        mode === 'lathe'
          ? 'Higher-accuracy contour tracking and synchronized path smoothing for tighter turning and live-tool finishes.'
          : 'Higher-accuracy contour tracking and path smoothing for tighter surface quality.',
        mode === 'lathe'
          ? 'Check the OSP contour-control posture, sync mode, and tolerance settings expected by the turning template.'
          : 'Check the contour-control option and tolerance mode expected by the post and process template.',
        highSpeedDefault || fiveAxis || okumaTurningAdvanced,
      ),
      controllerCapabilityOption(
        'okuma-probing',
        'Probing macros',
        'Touch probe and tool-setter support for setup validation and in-process checks.',
        'Confirm the spindle probe, receiver, and offset-write macros are active on the control.',
      ),
      controllerCapabilityOption(
        'okuma-ssv',
        'Spindle speed variation',
        'Oscillating spindle-speed mode for chatter suppression on harder materials or longer overhangs.',
        'Check the OSP spindle variation option and process plan requirements before relying on it.',
      ),
    );
    if (fiveAxis || okumaTurningAdvanced) {
      options.push(
        controllerCapabilityOption(
          'okuma-tcp',
          'TCP / 5-axis kinematics',
          mode === 'lathe'
            ? 'Tool-center-point and multitask kinematic transforms for B-axis / milling-head turning centers.'
            : 'Tool-center-point compensation and multiaxis transform support for simultaneous 5-axis work.',
          mode === 'lathe'
            ? 'Verify the active B-axis or multitask kinematic package matches the machine geometry and post mode.'
            : 'Verify the active kinematic package matches the machine geometry and the post is outputting the right mode.',
          fiveAxis || /multus|integrex|b-axis|b axis/.test(signature),
        ),
        controllerCapabilityOption(
          'okuma-tilted-plane',
          'Tilted workplane',
          mode === 'lathe'
            ? 'Indexed and multitask workplane transforms for angled live-tool or B-axis operations.'
            : 'Workplane transformation support for indexed and simultaneous 5-axis setups.',
          mode === 'lathe'
            ? 'Check the control and post are aligned on multitask tilted-plane output for the current machine.'
            : 'Check the control and post are aligned on tilted-plane / workplane transform output.',
          fiveAxis || /multus|integrex|b-axis|b axis/.test(signature),
        ),
      );
    }
    if (publishedThermoFriendly) {
      options.push(
        controllerCapabilityOption(
          'okuma-thermo-friendly',
          'Thermo-Friendly Concept',
          'Okuma thermal-stability package for compensating warm-up drift and stabilizing size.',
          'Confirm thermal compensation is active and warm-up compensation is not bypassed for the current machine.',
          true,
        ),
      );
    }
  }

  if (mode === 'mill' && (manufacturer.includes('haas') || controllerSignature.includes('haas ngc'))) {
    options.push(
      controllerCapabilityOption(
        'haas-hsm',
        'HSM smoothing',
        'Haas high-speed smoothing / accuracy mode for mold, surfacing, and tighter finish work.',
        'Check the control option and the active G187 posture expected by the program or template.',
        highSpeedDefault,
      ),
      controllerCapabilityOption(
        'haas-probing',
        'Probing package',
        'Wireless probing and tool setter macros for setup verification.',
        'Verify the WIPS package, probe hardware, and probing macros are active.',
      ),
      controllerCapabilityOption(
        'haas-ssv',
        'Spindle speed variation',
        'Oscillating spindle-speed option for chatter suppression.',
        'Check the spindle variation option and use case before enabling it in process planning.',
      ),
    );
    if (fiveAxis) {
      options.push(
        controllerCapabilityOption(
          'haas-dwo-tcpc',
          'DWO / TCPC',
          'Dynamic work offset and tool-center-point control for multiaxis kinematics.',
          'Verify DWO/TCPC licensing and post output for the active 4/5-axis setup.',
          true,
        ),
      );
    }
  }

  if (mode === 'mill' && (manufacturer.includes('mazak') || controllerSignature.includes('smooth'))) {
    options.push(
      controllerCapabilityOption(
        'mazak-hsm',
        'Smooth AI / high-speed mode',
        'Mazak high-speed contouring and smoothing posture for 3D surfacing and multiaxis motion.',
        'Check the active Mazatrol Smooth option set and post mode for smoothing / high-speed cuts.',
        highSpeedDefault,
      ),
      controllerCapabilityOption(
        'mazak-probing',
        'Probing package',
        'Touch probe and tool-setter workflow support on the Smooth control.',
        'Confirm the current machine has probing hardware and protected macros enabled.',
      ),
      controllerCapabilityOption(
        'mazak-ssv',
        'Spindle speed variation',
        'Chatter-control spindle modulation for difficult finishing passes.',
        'Check the control option set and process template before depending on spindle variation.',
      ),
    );
    if (fiveAxis) {
      options.push(
        controllerCapabilityOption(
          'mazak-tcp',
          'TCP / tilted plane',
          'Tool-center-point and tilted-plane support for indexed and simultaneous multiaxis work.',
          'Verify the post and control are aligned on TCP / tilted-plane output for the active machine.',
          true,
        ),
      );
    }
  }

  return dedupeControllerCapabilityOptions(options);
}

function buildSpindleOption(
  rawSpindle: unknown,
  mode: MachineMode,
  fallbackId: string,
): MachineCatalogItem['spindleOptions'][number] | null {
  const spindle = asRecord(rawSpindle);
  if (!spindle) return null;

  const maxRpm = safeNum(spindle.max_rpm ?? spindle.rpm, Number.NaN);
  const taper = String(spindle.taper ?? spindle.spindle_nose ?? '').trim();
  const role = readText(spindle.role, ['name', 'label'])
    || readText(spindle.position, ['name', 'label'])
    || readText(spindle.label, ['name'])
    || readText(spindle.name, ['label']);
  const labelParts = [
    role ? humanizeToken(role) : '',
    Number.isFinite(maxRpm) && maxRpm > 0 ? `${Math.round(maxRpm).toLocaleString()} RPM` : '',
    taper,
  ].filter(Boolean);

  const powerKw = safeNum(spindle.power_kw ?? spindle.power_continuous ?? spindle.power_30min, Number.NaN);
  const powerHp = safeNum(spindle.power_hp ?? spindle.peak_hp ?? spindle.hp, Number.NaN);
  const detailParts = [
    String(spindle.type ?? '').trim() ? humanizeToken(String(spindle.type)) : '',
    Number.isFinite(powerKw) && powerKw > 0 ? `${Math.round(powerKw * 10) / 10} kW` : '',
    !Number.isFinite(powerKw) && Number.isFinite(powerHp) && powerHp > 0 ? `${Math.round(powerHp * 10) / 10} hp` : '',
    safeNum(spindle.torque_max, Number.NaN) > 0 ? `${Math.round(safeNum(spindle.torque_max, 0))} Nm max torque` : '',
    spindle.coolant_through ? 'Through-spindle coolant' : '',
  ].filter(Boolean);

  return {
    id: optionId(labelParts.join(' '), fallbackId),
    label: labelParts.join(' · ') || (mode === 'mill' || mode === 'lathe' ? 'Standard spindle package' : 'Process package'),
    detail: detailParts.join(' · ') || 'Primary spindle / process package from the live registry.',
  };
}

function buildSpindleOptions(raw: Record<string, unknown>, mode: MachineMode): MachineCatalogItem['spindleOptions'] {
  const specs = asRecord(raw.specs);
  const syntheticSpecSpindle = specs
    ? {
        role: specs.spindleRole ?? 'main spindle',
        max_rpm: specs.maxRpm ?? specs.max_rpm ?? specs.rpm,
        taper: specs.taper ?? specs.spindleTaper ?? specs.spindle_nose,
        power_hp: specs.peakHp ?? specs.peak_hp ?? specs.power_hp ?? specs.hp,
        power_kw: specs.powerKw ?? specs.power_kw,
        coolant_through: specs.tsc,
        type: specs.type,
      }
    : null;
  const multi = [
    ...unwrapCollection(raw.spindles),
    ...unwrapCollection(raw.spindle_options),
    ...unwrapCollection(raw.process_packages),
  ];
  const normalized = multi
    .map((entry, index) => buildSpindleOption(entry, mode, `spindle-${index + 1}`))
    .filter(Boolean) as MachineCatalogItem['spindleOptions'];

  if (normalized.length > 0) return normalized;

  const single = buildSpindleOption(raw.spindle, mode, 'spindle-standard');
  if (single) return [single];

  const mainSpindle = buildSpindleOption(
    raw.main_spindle ? { role: 'Main spindle', ...(asRecord(raw.main_spindle) ?? {}) } : null,
    mode,
    'spindle-main',
  );
  const subSpindle = buildSpindleOption(
    raw.sub_spindle || raw.counter_spindle
      ? { role: 'Sub spindle', ...(asRecord(raw.sub_spindle ?? raw.counter_spindle) ?? {}) }
      : null,
    mode,
    'spindle-sub',
  );
  const specSpindle = buildSpindleOption(syntheticSpecSpindle, mode, 'spindle-spec');
  const fallbackOptions = [mainSpindle, subSpindle, specSpindle].filter(Boolean) as MachineCatalogItem['spindleOptions'];
  if (fallbackOptions.length > 0) return fallbackOptions;

  return [
    {
      id: 'process-package',
      label: mode === 'mill' || mode === 'lathe' ? 'Standard spindle package' : 'Process package',
      detail:
        mode === 'mill' || mode === 'lathe'
          ? 'Live registry has not published spindle details for this machine yet.'
          : 'Performance is process-driven for this machine family rather than spindle-driven.',
    },
  ];
}

function buildMachineConfigurationOptions(
  raw: Record<string, unknown>,
  mode: MachineMode,
  controllerOptions: MachineCatalogItem['controllerOptions'],
  spindleOptions: MachineCatalogItem['spindleOptions'],
  controllerCapabilityOptions: MachineCatalogItem['controllerCapabilityOptions'],
  coolantOptionIds: CoolantOptionId[],
): MachineConfigurationOption[] {
  const recordId = String(raw.id ?? raw.machine_id ?? 'machine');
  const normalizedControllers = dedupeSelectionOptions(controllerOptions);
  const normalizedSpindles = dedupeSelectionOptions(spindleOptions);
  const normalizedCoolantIds = filterCoolantOptionIds(coolantOptionIds, mode);
  const confidence = inferMachinePackageConfidence(normalizedControllers, normalizedSpindles);

  if (normalizedControllers.length <= 1 && normalizedSpindles.length <= 1) {
    return [
      {
        id: `${recordId}-standard-configuration`,
        label: 'Standard machine package',
        detail: 'Primary machine package from the live registry.',
        controllerOptions: normalizedControllers,
        spindleOptions: normalizedSpindles,
        controllerCapabilityOptions,
        coolantOptionIds: normalizedCoolantIds,
        sourceRecordIds: [recordId],
        confidence,
      },
    ];
  }

  if (normalizedControllers.length === 1) {
    return [
      {
        id: `${recordId}-controller-package`,
        label: normalizedControllers[0]?.label ?? 'Controller package',
        detail: 'Controller-scoped package with the spindle options published for this machine.',
        controllerOptions: normalizedControllers,
        spindleOptions: normalizedSpindles,
        controllerCapabilityOptions,
        coolantOptionIds: normalizedCoolantIds,
        sourceRecordIds: [recordId],
        confidence,
      },
    ];
  }

  if (normalizedSpindles.length === 1) {
    return normalizedControllers.map((controllerOption, index) => ({
      id: `${recordId}-controller-${index + 1}`,
      label: controllerOption.label,
      detail: 'Controller-specific machine package from the live registry.',
      controllerOptions: [controllerOption],
      spindleOptions: normalizedSpindles,
      controllerCapabilityOptions,
      coolantOptionIds: normalizedCoolantIds,
      sourceRecordIds: [recordId],
      confidence,
    }));
  }

  if (normalizedControllers.length === normalizedSpindles.length) {
    return normalizedControllers.map((controllerOption, index) => ({
      id: `${recordId}-paired-${index + 1}`,
      label: `${controllerOption.label} package`,
      detail: 'Paired controller and spindle package from the live registry.',
      controllerOptions: [controllerOption],
      spindleOptions: [normalizedSpindles[index]],
      controllerCapabilityOptions,
      coolantOptionIds: normalizedCoolantIds,
      sourceRecordIds: [recordId],
      confidence,
    }));
  }

  return [
    {
      id: `${recordId}-broad-configuration`,
      label: 'Published machine packages',
      detail: 'Registry lists multiple controllers and spindle packages for this machine; calculator is preserving the published set without inventing unsupported combinations.',
      controllerOptions: normalizedControllers,
      spindleOptions: normalizedSpindles,
      controllerCapabilityOptions,
      coolantOptionIds: normalizedCoolantIds,
      sourceRecordIds: [recordId],
      confidence,
    },
  ];
}

function inferToolingLayout(raw: Record<string, unknown>, mode: MachineMode): MachineCatalogItem['toolingLayout'] {
  const spindle = asRecord(raw.spindle);
  const millingSpindle = asRecord(raw.millingSpindle);
  const atc = asRecord(raw.atc);
  const turret = asRecord(raw.turret);
  const specs = asRecord(raw.specs);
  const signature = buildMachineSignature(raw);

  if (mode === 'mill') {
    const spindleConnection = normalizeSpindleConnection(
      String(
        spindle?.taper
        ?? spindle?.spindle_nose
        ?? specs?.taper
        ?? specs?.spindle_taper
        ?? specs?.spindleTaper
        ?? '',
      ),
    );
    return {
      kind: 'magazine',
      stations: safeNum(atc?.capacity, 24),
      interface: spindleConnection.label,
      interfaceId: spindleConnection.id,
      spindleConnectionTypeId: spindleConnection.id,
      spindleConnectionLabel: spindleConnection.label,
      liveTooling: false,
    };
  }

  if (mode === 'lathe') {
    const isSwiss = signature.includes('swiss') || signature.includes('cincom');
    const hasPublishedMillingHead = Boolean(millingSpindle)
      || /mill[\s_-]*turn|multi[\s_-]*task|vertical turret lathe|\bvtl\b|\bvtm\b/.test(String(raw.type ?? '').toLowerCase());
    const liveTooling = isSwiss
      || Boolean(
        raw.live_tools
        ?? raw.liveTools
        ?? raw.live_tooling
        ?? raw.liveTooling
        ?? raw.y_axis
        ?? raw.yAxis
        ?? raw.b_axis
        ?? raw.bAxis
        ?? raw.milling_head
        ?? raw.millingHead
        ?? raw.milling_spindle
        ?? raw.millingSpindle
        ?? turret?.live_tooling_option
        ?? turret?.liveToolingOption
        ?? turret?.live_tooling
        ?? turret?.liveTooling,
      )
      || hasPublishedMillingHead
      || signature.includes('live')
      || signature.includes('y-axis')
      || signature.includes('y axis')
      || signature.includes('mill-turn')
      || signature.includes('multus')
      || signature.includes('integrex')
      || signature.includes('multi-task')
      || signature.includes('multitask');
    const rawTurretInterface = String(
      turret?.turret_type
      ?? turret?.turretType
      ?? raw.turret_type
      ?? raw.turretType
      ?? turret?.interface
      ?? raw.tool_interface
      ?? raw.toolInterface
      ?? specs?.tool_interface
      ?? specs?.toolInterface
      ?? specs?.turret_type
      ?? specs?.turretType
      ?? turret?.type
      ?? (signature.includes('multus') ? 'CAPTO C6' : '')
      ?? '',
    ).trim();
    const turretConnection = normalizeTurretInterface(
      rawTurretInterface || (isSwiss ? 'Gang tooling' : 'Turret standard'),
      isSwiss ? 'gang' : 'turret',
    );
    const hasSubSpindle = Boolean(
      raw.sub_spindle
      || raw.counter_spindle
      || raw.subSpindle
      || raw.counterSpindle
      || /sub spindle|sub-spindle|counter spindle/.test(signature),
    );
    const turretCount = isSwiss ? 1 : Math.max(
      inferTurretCount(raw, signature),
      /vertical turret lathe|\bvtl\b|\bvtm\b/.test(signature) ? 1 : 0,
    );
    const hasMillingHead = !isSwiss && liveTooling && (
      Boolean(raw.b_axis ?? raw.bAxis ?? raw.milling_head ?? raw.millingHead)
      || hasPublishedMillingHead
      || inferHasMillingHead(signature)
    );

    if (isSwiss) {
      return {
        kind: 'gang',
        stations: safeNum(raw.tool_positions ?? raw.toolPositions ?? raw.tool_stations ?? raw.toolStations ?? turret?.stations ?? turret?.positions, 8),
        interface: turretConnection.label,
        interfaceId: turretConnection.id,
        turretTypeId: turretConnection.id,
        turretTypeLabel: turretConnection.label,
        turretCount,
        hasSubSpindle,
        liveTooling,
        liveRpm: liveTooling ? 8000 : undefined,
      };
    }

    return {
      kind: 'turret',
      stations: safeNum(turret?.stations ?? turret?.positions ?? raw.tool_positions ?? raw.toolPositions ?? raw.tool_stations ?? raw.toolStations, 12),
      interface: turretConnection.label,
      interfaceId: turretConnection.id,
      turretTypeId: turretConnection.id,
      turretTypeLabel: turretConnection.label,
      turretCount,
      hasSubSpindle,
      hasMillingHead,
      millingHeadLabel: hasMillingHead ? 'B-axis milling head' : undefined,
      liveTooling,
      liveRpm: liveTooling ? safeNum(
        millingSpindle?.max_rpm
          ?? millingSpindle?.rpm
          ?? millingSpindle?.maxRpm
          ?? millingSpindle?.live_rpm
          ?? millingSpindle?.liveRpm
          ?? turret?.live_rpm
          ?? turret?.liveRpm
          ?? raw.live_rpm
          ?? raw.liveRpm
          ?? (hasMillingHead ? 12000 : 6000),
        hasMillingHead ? 12000 : 6000,
      ) : undefined,
    };
  }

  if (mode === 'edm') {
    return { kind: 'electrode', stations: safeNum(atc?.capacity, 6), interface: 'EROWA / 3R', liveTooling: false };
  }
  if (mode === 'wire_edm') {
    return { kind: 'wire', stations: 4, interface: String(spindle?.wire_diameter ?? '0.25 mm standard'), liveTooling: false };
  }
  if (mode === 'laser') {
    return { kind: 'laser', stations: safeNum(atc?.capacity, 3), interface: 'Nozzle / lens stack', liveTooling: false };
  }
  return { kind: 'waterjet', stations: safeNum(atc?.capacity, 3), interface: 'Orifice / mixing tube', liveTooling: false };
}

function unwrapCollection(raw: unknown, collectionKeys: string[] = []): unknown[] {
  if (Array.isArray(raw)) return raw;

  const record = asRecord(raw);
  if (!record) return [];

  if (Array.isArray(record._items)) return record._items;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.results)) return record.results;

  for (const key of collectionKeys) {
    const nested = unwrapCollection(record[key], []);
    if (nested.length > 0) return nested;
  }

  return [];
}

function unwrapMachineResults(raw: unknown): unknown[] {
  return unwrapCollection(raw, ['machines', 'items', 'results']);
}

async function fetchAllMachineRows(): Promise<unknown[]> {
  const rows: unknown[] = [];
  let offset = 0;

  for (let page = 0; page < MACHINE_MAX_PAGES; page += 1) {
    const raw = await dataRequest<unknown>('/machine/search', 'POST', {
      limit: MACHINE_PAGE_SIZE,
      offset,
    });

    const batch = unwrapMachineResults(raw);
    if (batch.length === 0) break;

    rows.push(...batch);

    const envelope = asRecord(raw);
    const machineEnvelope = asRecord(envelope?.machines);
    const total = safeNum(machineEnvelope?._total ?? envelope?.total, Number.NaN);
    offset += batch.length;

    const hasMore = Boolean(envelope?.hasMore)
      || (Number.isFinite(total) && offset < total);

    if (!hasMore) break;
  }

  return rows;
}

function normalizeMachine(raw: Record<string, unknown>): MachineCatalogItem | null {
  const manufacturer = normalizeManufacturerName(
    readText(raw.manufacturer, ['name', 'label', 'manufacturer', 'brand', 'make'])
    || readText(raw.brand, ['name', 'label'])
    || readText(raw.make, ['name', 'label'])
    || readText(asRecord(raw.controller)?.brand, ['name', 'label'])
    || 'Unknown',
  );
  const model = normalizeMachineModel(manufacturer, raw);
  if (!model) return null;
  const id = String(raw.id ?? raw.machine_id ?? '').trim()
    || optionId(
      [manufacturer, model, String(raw.type ?? '').trim()].filter(Boolean).join(' '),
      'machine',
    );
  if (isAccessoryMachineRecord(raw)) return null;

  const mode = inferMachineMode(raw);
  const signature = buildMachineSignature(raw);
  const machineType = inferMachineType(raw, mode, signature);
  const spindleRpm = extractSpindleRpm(raw);
  const coolantOptionIds = buildCoolantOptionIds(raw, mode);
  const controllerOptions = buildControllerOptions(raw);
  const spindleOptions = buildSpindleOptions(raw, mode);
  const controllerCapabilityOptions = buildControllerCapabilityOptions(
    raw,
    mode,
    machineType,
    controllerOptions,
    spindleRpm,
  );
  const configurationOptions = buildMachineConfigurationOptions(
    raw,
    mode,
    controllerOptions,
    spindleOptions,
    controllerCapabilityOptions,
    coolantOptionIds,
  );
  const canonicalMachineId = buildCanonicalMachineId(mode, manufacturer, model);
  const packageConfidence = inferMachinePackageConfidence(controllerOptions, spindleOptions);
  const packageProvenance = buildRegistryMachineProvenance({
    recordId: id,
    confidence: packageConfidence,
    notes:
      packageConfidence === 'published'
        ? ['Machine package built from published registry controller and spindle data.']
        : ['Machine package includes inferred selections because the source registry row is incomplete.'],
  });

  return applyKnownMachineCatalogOverrides({
    id,
    mode,
    manufacturer,
    model,
    machineTypeId: machineType.machineTypeId,
    machineTypeLabel: machineType.machineTypeLabel,
    family: machineType.familyLabel || formatMachineFamily(raw, mode),
    spindleRpm,
    powerHp: extractPowerHp(raw),
    envelope: formatEnvelope(raw),
    axes: formatMachineTaxonomyAxes(machineType) || formatAxes(raw, mode),
    coolant: formatCoolant(raw, mode),
    coolantOptionIds,
    controllerOptions,
    spindleOptions,
    controllerCapabilityOptions,
    configurationOptions,
    canonicalMachineId,
    packageId: buildMachinePackageId(canonicalMachineId),
    taxonomy: machineType,
    packageProvenance,
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : buildMachineNotes(raw),
    bestFor: Array.isArray(raw.best_for ?? raw.bestFor)
      ? (raw.best_for as string[] ?? raw.bestFor as string[]).map(String)
      : buildBestFor(mode),
    toolingLayout: raw.tooling_layout
      ? (raw.tooling_layout as MachineCatalogItem['toolingLayout'])
      : raw.toolingLayout
        ? (raw.toolingLayout as MachineCatalogItem['toolingLayout'])
        : inferToolingLayout(raw, mode),
    guidewayType: extractGuidewayType(raw),
    naturalFrequencyHz: extractNaturalFrequencyHz(raw),
    axisAccelerationMps2: extractAxisAccelerationMps2(raw),
    axisJerkMps3: extractAxisJerkMps3(raw),
  });
}

function formatMachineTaxonomyAxes(taxonomy: MachineTaxonomyProfile): string {
  switch (taxonomy.axisClass) {
    case '2-axis':
      return '2-axis';
    case '3-axis':
      return '3-axis';
    case '4-axis':
      return '4-axis';
    case '5-axis':
      return '5-axis';
    case 'swiss':
      return 'Swiss / gang tooling';
    case 'turning':
      return taxonomy.machineTypeId === 'lathe_subspindle'
        ? 'Dual-spindle turning center'
        : taxonomy.machineTypeId === 'lathe_multitask'
          ? 'Multi-task / live-tool capable'
          : taxonomy.machineTypeId === 'lathe_vtl'
            ? 'Vertical turning center'
            : taxonomy.machineTypeId === 'lathe_y_axis'
              ? 'C/Y live-tool capable'
              : 'Turning center';
    case 'xyuv':
      return 'XYUV wire path';
    case '2d':
      return taxonomy.mode === 'waterjet' ? '2D + taper control' : '2D cutting platform';
    default:
      return '';
  }
}

function inferMachinePackageConfidence(
  controllerOptions: MachineCatalogItem['controllerOptions'],
  spindleOptions: MachineCatalogItem['spindleOptions'],
): MachinePackageConfidence {
  const publishedControllers = controllerOptions.some((option) => !isPlaceholderControllerOption(option));
  const publishedSpindles = spindleOptions.some((option) => !isPlaceholderSpindleOption(option));

  if (publishedControllers && publishedSpindles) return 'published';
  if (publishedControllers || publishedSpindles) return 'inferred';
  return 'fallback';
}

function machineRichnessScore(machine: MachineCatalogItem): number {
  let score = 0;
  if (machine.spindleRpm > 0) score += 2;
  if (machine.powerHp > 0) score += 1;
  if (machine.envelope !== 'Envelope not published') score += 1;
  if (machine.controllerOptions.some((item) => !/pending/i.test(item.id))) score += 2;
  if (machine.spindleOptions.some((item) => !/process-package|pending/i.test(item.id) && !/not published/i.test(item.detail))) score += 2;
  if (machine.machineTypeId) score += 1;
  score += Math.min(machine.notes.length, 3);
  return score;
}

function mergeMachineToolingLayout(
  preferred?: MachineCatalogItem['toolingLayout'],
  secondary?: MachineCatalogItem['toolingLayout'],
): MachineCatalogItem['toolingLayout'] | undefined {
  if (!preferred) return secondary;
  if (!secondary) return preferred;

  const pickPositive = (primary?: number, fallback?: number) => {
    if (typeof primary === 'number' && Number.isFinite(primary) && primary > 0) return primary;
    if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0) return fallback;
    return undefined;
  };

  const stationOptions = [...new Set([
    ...(preferred.stationOptions ?? []),
    ...(secondary.stationOptions ?? []),
  ])]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  const pickSpecific = (
    primary?: string,
    fallback?: string,
    genericValues: string[] = [],
  ) => {
    const normalizedGenerics = new Set(genericValues.map((value) => value.toLowerCase()));
    const primaryValue = primary?.trim();
    const fallbackValue = fallback?.trim();
    if (primaryValue && !normalizedGenerics.has(primaryValue.toLowerCase())) return primaryValue;
    if (fallbackValue && !normalizedGenerics.has(fallbackValue.toLowerCase())) return fallbackValue;
    return primaryValue || fallbackValue;
  };

  return {
    ...secondary,
    ...preferred,
    kind: preferred.kind ?? secondary.kind,
    stations: pickPositive(preferred.stations, secondary.stations),
    stationOptions: stationOptions.length ? stationOptions : undefined,
    allowCustomStations: Boolean(preferred.allowCustomStations || secondary.allowCustomStations),
    interface: pickSpecific(preferred.interface, secondary.interface, ['Turret standard']),
    interfaceId: preferred.interfaceId || secondary.interfaceId,
    spindleConnectionTypeId: preferred.spindleConnectionTypeId || secondary.spindleConnectionTypeId,
    spindleConnectionLabel: preferred.spindleConnectionLabel || secondary.spindleConnectionLabel,
    turretTypeId: pickSpecific(preferred.turretTypeId, secondary.turretTypeId, ['turret-standard']),
    turretTypeLabel: pickSpecific(preferred.turretTypeLabel, secondary.turretTypeLabel, ['Turret standard']),
    turretCount: pickPositive(preferred.turretCount, secondary.turretCount),
    hasSubSpindle: Boolean(preferred.hasSubSpindle || secondary.hasSubSpindle),
    hasMillingHead: Boolean(preferred.hasMillingHead || secondary.hasMillingHead),
    millingHeadLabel: preferred.millingHeadLabel || secondary.millingHeadLabel,
    liveTooling: Boolean(preferred.liveTooling || secondary.liveTooling),
    liveRpm: pickPositive(preferred.liveRpm, secondary.liveRpm),
  };
}

function modelDisplayScore(model: string): number {
  let score = model.length;
  if (/-/.test(model)) score += 3;
  if (/[0-9]/.test(model)) score += 2;
  if (/[A-Z]{2,}/.test(model)) score += 2;
  if (/\s/.test(model)) score += 1;
  return score;
}

function isPlaceholderControllerOption(option: MachineCatalogItem['controllerOptions'][number]): boolean {
  return /pending/i.test(option.id) || /pending/i.test(option.label) || /pending/i.test(option.detail);
}

function isPlaceholderSpindleOption(option: MachineCatalogItem['spindleOptions'][number]): boolean {
  return /pending|process-package/i.test(option.id)
    || /pending/i.test(option.label)
    || /not published|pending/i.test(option.detail);
}

function preferPublishedSelectionOptions<T extends MachineCatalogItem['controllerOptions'][number]>(
  options: T[],
  isPlaceholder: (option: T) => boolean,
): T[] {
  const published = options.filter((option) => !isPlaceholder(option));
  return published.length ? published : options;
}

function mergeMachineRecords(existing: MachineCatalogItem, incoming: MachineCatalogItem): MachineCatalogItem {
  const preferred = machineRichnessScore(incoming) > machineRichnessScore(existing) ? incoming : existing;
  const secondary = preferred === incoming ? existing : incoming;
  const mergedConfigurationOptions = mergeMachineConfigurationOptions(
    preferred.configurationOptions ?? [],
    secondary.configurationOptions ?? [],
    preferred.mode,
  );
  const controllerOptions = preferPublishedSelectionOptions(
    dedupeSelectionOptions([
      ...mergedConfigurationOptions.flatMap((configuration) => configuration.controllerOptions),
      ...preferred.controllerOptions,
      ...secondary.controllerOptions,
    ]) as MachineCatalogItem['controllerOptions'],
    isPlaceholderControllerOption,
  ) as MachineCatalogItem['controllerOptions'];
  const spindleOptions = preferPublishedSelectionOptions(
    dedupeSelectionOptions([
      ...mergedConfigurationOptions.flatMap((configuration) => configuration.spindleOptions),
      ...preferred.spindleOptions,
      ...secondary.spindleOptions,
    ]) as MachineCatalogItem['spindleOptions'],
    isPlaceholderSpindleOption,
  ) as MachineCatalogItem['spindleOptions'];
  const controllerCapabilityOptions = dedupeControllerCapabilityOptions([
    ...(preferred.controllerCapabilityOptions ?? []),
    ...(secondary.controllerCapabilityOptions ?? []),
  ]);
  const coolantOptionIds = filterCoolantOptionIds(
    [
      ...new Set([
        ...preferred.coolantOptionIds,
        ...secondary.coolantOptionIds,
        ...mergedConfigurationOptions.flatMap((configuration) => configuration.coolantOptionIds),
      ]),
    ],
    preferred.mode,
  );
  const configurationOptions =
    controllerOptions.length === 1 && spindleOptions.length === 1
      ? [
          {
            id: `${preferred.id}-standard-configuration`,
            label: 'Standard machine package',
            detail: 'Merged machine package synthesized from complementary registry rows.',
            controllerOptions,
            spindleOptions,
            coolantOptionIds,
            sourceRecordIds: [
              ...new Set([
                ...(preferred.packageProvenance?.sourceRecordIds ?? [preferred.id]),
                ...(secondary.packageProvenance?.sourceRecordIds ?? [secondary.id]),
              ]),
            ],
            confidence: 'merged',
          },
        ]
      : mergedConfigurationOptions;
  const canonicalMachineId = preferred.canonicalMachineId
    ?? secondary.canonicalMachineId
    ?? buildCanonicalMachineId(preferred.mode, preferred.manufacturer, preferred.model);
  const packageProvenance = mergeMachinePackageProvenance(
    preferred.packageProvenance,
    secondary.packageProvenance,
  );
  const mergedTaxonomy = preferred.taxonomy ?? secondary.taxonomy;

  return applyKnownMachineCatalogOverrides({
    ...preferred,
    manufacturer: preferred.manufacturer === 'Unknown' ? secondary.manufacturer : preferred.manufacturer,
    model: modelDisplayScore(secondary.model) > modelDisplayScore(preferred.model) ? secondary.model : preferred.model,
    machineTypeId: preferred.machineTypeId || secondary.machineTypeId,
    machineTypeLabel: preferred.machineTypeLabel || secondary.machineTypeLabel,
    family: preferred.family !== 'Machining center' && preferred.family !== 'Turning center' ? preferred.family : secondary.family,
    spindleRpm: Math.max(preferred.spindleRpm, secondary.spindleRpm),
    powerHp: Math.max(preferred.powerHp, secondary.powerHp),
    envelope: preferred.envelope !== 'Envelope not published' ? preferred.envelope : secondary.envelope,
    axes: preferred.axes || secondary.axes,
    coolant: preferred.coolant !== 'Flood-ready' ? preferred.coolant : secondary.coolant,
    coolantOptionIds,
    controllerOptions,
    spindleOptions,
    controllerCapabilityOptions,
    configurationOptions,
    canonicalMachineId,
    packageId: buildMachinePackageId(canonicalMachineId),
    taxonomy: mergedTaxonomy,
    packageProvenance: packageProvenance
      ? {
          ...packageProvenance,
          confidence: mergeMachinePackageConfidence(
            packageProvenance.confidence,
            'merged',
          ),
        }
      : {
          source: 'registry-merged',
          confidence: 'merged',
          sourceRecordIds: [preferred.id, secondary.id],
          notes: ['Machine package merged from complementary registry rows.'],
        },
    notes: [...new Set([...preferred.notes, ...secondary.notes])].slice(0, 4),
    bestFor: [...new Set([...preferred.bestFor, ...secondary.bestFor])].slice(0, 4),
    toolingLayout: mergeMachineToolingLayout(preferred.toolingLayout, secondary.toolingLayout),
    guidewayType: preferred.guidewayType ?? secondary.guidewayType,
    naturalFrequencyHz: preferred.naturalFrequencyHz ?? secondary.naturalFrequencyHz,
    axisAccelerationMps2:
      typeof preferred.axisAccelerationMps2 === 'number'
        ? preferred.axisAccelerationMps2
        : secondary.axisAccelerationMps2,
    axisJerkMps3:
      typeof preferred.axisJerkMps3 === 'number'
        ? preferred.axisJerkMps3
        : secondary.axisJerkMps3,
  });
}

function machineCanonicalKey(machine: MachineCatalogItem): string {
  if (machine.canonicalMachineId) return machine.canonicalMachineId;

  const canonicalModel = dedupeLeadingToken(
    machine.manufacturer,
    machine.model
      .replace(/\b(setup|profile|package|configuration|config)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  return buildCanonicalMachineId(machine.mode, machine.manufacturer, canonicalModel || machine.model);
}

export function normalizeMachineCatalogRows(rows: unknown[]): MachineCatalogItem[] {
  const normalizedByKey = new Map<string, MachineCatalogItem>();

  for (const entry of rows) {
    const record = asRecord(entry);
    if (!record) continue;
    try {
      const machine = normalizeMachine(record);
      if (machine) {
        const key = machineCanonicalKey(machine);
        const existing = normalizedByKey.get(key);
        normalizedByKey.set(key, existing ? mergeMachineRecords(existing, machine) : machine);
      }
    } catch {
      continue;
    }
  }

  return [...normalizedByKey.values()];
}

async function fetchNormalizedMachineCatalog(): Promise<MachineCatalogItem[]> {
  const load = async () => {
    const rows = await fetchAllMachineRows();
    return normalizeMachineCatalogRows(rows);
  };

  if (!shouldCacheCalculatorData()) {
    return load();
  }

  if (!machineCatalogPromise) {
    machineCatalogPromise = load().catch((error) => {
      machineCatalogPromise = null;
      throw error;
    });
  }

  return machineCatalogPromise;
}

export async function fetchMachineCatalog(mode?: MachineMode): Promise<MachineCatalogItem[]> {
  return (await fetchMachineCatalogState(mode)).items;
}

export async function fetchMachineCatalogState(
  mode?: MachineMode,
): Promise<CalculatorCatalogLoadState<MachineCatalogItem>> {
  const fallbackItems = mode ? MACHINE_CATALOG.filter((item) => item.mode === mode) : MACHINE_CATALOG;

  try {
    const normalized = await fetchNormalizedMachineCatalog();
    const liveItems = mode ? normalized.filter((item) => item.mode === mode) : normalized;
    if (liveItems.length > 0) {
      return {
        items: liveItems,
        source: 'live',
        liveCount: liveItems.length,
        fallbackCount: 0,
        note: 'Live machine registry is active for this machine slice.',
      };
    }

    return {
      items: fallbackItems,
      source: fallbackItems.length ? 'fallback' : 'empty',
      liveCount: 0,
      fallbackCount: fallbackItems.length,
      note: fallbackItems.length
        ? 'Live machine registry returned no rows for this slice, so the bundled machine catalog is active.'
        : 'No machine packages were available for this slice.',
    };
  } catch {
    return {
      items: fallbackItems,
      source: fallbackItems.length ? 'fallback' : 'empty',
      liveCount: 0,
      fallbackCount: fallbackItems.length,
      note: fallbackItems.length
        ? 'Machine registry is unavailable, so the bundled machine catalog is active.'
        : 'No machine packages were available for this slice.',
    };
  }
}

// ─── Material catalog ───────────────────────────────────────────

function formatRangeLabel(value: unknown, suffix: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.round(value * 10) / 10} ${suffix}`;
  }
  if (typeof value === 'string' && value.trim()) {
    return `${value.trim()} ${suffix}`.trim();
  }

  const record = asRecord(value);
  if (!record) return '';

  const min = safeNum(record.min, Number.NaN);
  const max = safeNum(record.max, Number.NaN);
  const typical = safeNum(record.typical ?? record.value ?? record.nominal, Number.NaN);

  if (Number.isFinite(min) && Number.isFinite(max) && min !== max) {
    return `${Math.round(min * 10) / 10}-${Math.round(max * 10) / 10} ${suffix}`;
  }
  if (Number.isFinite(typical)) {
    return `${Math.round(typical * 10) / 10} ${suffix}`;
  }
  if (Number.isFinite(min)) {
    return `${Math.round(min * 10) / 10} ${suffix}`;
  }
  if (Number.isFinite(max)) {
    return `${Math.round(max * 10) / 10} ${suffix}`;
  }

  return '';
}

function readMaterialIsoGroup(raw: Record<string, unknown>): string {
  return readText(raw.iso_group ?? asRecord(raw.identification)?.iso_group ?? raw.isoGroup, ['value']).toUpperCase();
}

function buildTrustedMaterialSignature(raw: Record<string, unknown>) {
  const materialClass = readText(asRecord(raw.identification)?.material_class, ['value']).toLowerCase();
  const materialType = readText(raw.material_type ?? raw.family ?? raw.category ?? raw.group, ['value']).toLowerCase();
  const condition = readText(raw.condition, ['value']).toLowerCase();
  const name = readText(raw.name, ['value']).toLowerCase();
  const description = readText(raw.description, ['summary']).toLowerCase();

  return [materialClass, materialType, condition, name, description].filter(Boolean).join(' ');
}

function inferMaterialGroup(raw: Record<string, unknown>): MaterialCatalogItem['group'] {
  const isoGroup = readMaterialIsoGroup(raw);
  const subcategory = readText(raw.subcategory ?? raw.family ?? raw.category, ['value']).toLowerCase();
  const trustedSignature = buildTrustedMaterialSignature(raw);
  const signature = [trustedSignature, subcategory].filter(Boolean).join(' ');
  const titaniumNamed = /titanium|ti-6al-4v|ti64|grade\s*(5|23)\b|cp titanium/.test(trustedSignature);
  const titaniumSubfamily = /alpha[_ -]?beta|near[_ -]?alpha|beta titanium|\bbeta\b/.test(signature);

  if (/slm|dmls|binder jet|additive|mim|process stock|edm stock/.test(signature) || isoGroup === 'X') {
    return 'nontraditional';
  }
  if (isoGroup === 'K' || /cast iron|ductile iron|grey iron|gray iron|malleable iron|compacted graphite/.test(trustedSignature)) {
    return 'cast';
  }
  if (isoGroup === 'M' || /stainless|inox|duplex|austenitic|martensitic|precipitation/.test(trustedSignature)) {
    return 'stainless';
  }
  if (isoGroup === 'N') {
    if (/copper|copper[_ -]?alloy|brass|bronze|beryllium copper|cupronickel|naval brass/.test(signature)) {
      return 'copper';
    }
    return 'aluminum';
  }
  if (isoGroup === 'S') {
    if (titaniumNamed || titaniumSubfamily) {
      return 'titanium';
    }
    if (/zirconium|zr702|zr705|nitinol|shape[_ -]?memory|tantalum|niobium|molybdenum|tungsten|refractory metal|reactive alloy/.test(signature)) {
      return 'exotic_alloy';
    }
    return 'superalloy';
  }

  if (/tool_steel|tool steel|mold_steel|mold steel|die steel|hot[_ -]?work(?: tool)? steel|cold[_ -]?work(?: tool)? steel|high[_ -]?speed|shock[_ -]?resisting|powder metal|powder[_ -]?metallurgy|h13|a2|d2|s7|o1|o2|m2|m4|p20|dc53/.test(trustedSignature)) {
    return 'tool_steel';
  }
  if (titaniumNamed || (titaniumSubfamily && /ti[- ]?\d|grade\s*(5|23)\b|titanium/.test(signature))) {
    return 'titanium';
  }
  if (/zirconium|zr702|zr705|nitinol|shape[_ -]?memory|tantalum|niobium|molybdenum|tungsten|refractory metal|reactive alloy/.test(signature)) {
    return 'exotic_alloy';
  }
  if (/superalloy|inconel|hastelloy|waspaloy|monel|nimonic|haynes|rene|nickel[_ -]?base|cobalt[_ -]?base/.test(signature) || isoGroup === 'S') {
    return 'superalloy';
  }
  if (/copper|copper[_ -]?alloy|brass|bronze|beryllium copper|cupronickel|naval brass/.test(signature)) {
    return 'copper';
  }
  if (/polymer|plastic|peek|acetal|delrin|nylon|ptfe|uhmw|abs|polycarbonate|phenolic|g10|garolite|composite|carbon fiber|fiberglass/.test(signature)) {
    return 'polymer_composite';
  }
  if (/graphite|ceramic|glass|quartz|alumina|zirconia|silicon carbide/.test(signature)) {
    return 'graphite_ceramic';
  }

  if (/aluminum|aluminium|magnesium|zinc/.test(signature)) {
    return 'aluminum';
  }
  if (isoGroup === 'H') return /h13|a2|d2|s7|o1|o2|m2|m4|p20|dc53/.test(signature) ? 'tool_steel' : 'steel';
  return 'steel';
}

function normalizeMaterialSubcategoryId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function humanizeMaterialSubcategory(value: string) {
  return humanizeToken(value).replace(/\bQt\b/g, 'Q&T').replace(/\bSta\b/g, 'STA');
}

function fromMaterialTaxonomy(id: string, label: string) {
  return { id, label };
}

function canonicalizeExplicitMaterialSubcategory(
  explicit: string,
  group: MaterialCatalogItem['group'],
): { id: string; label: string } | null {
  const signature = explicit.toLowerCase();

  switch (group) {
    case 'steel':
      if (/free[_ -]?machining|12l14|11smnpb|leaded/.test(signature)) return fromMaterialTaxonomy('free_machining', 'Free-Machining');
      if (/bearing|52100/.test(signature)) return fromMaterialTaxonomy('bearing_steel', 'Bearing Steel');
      if (/structural|a36|a572|plate/.test(signature)) return fromMaterialTaxonomy('structural', 'Structural');
      if (/carburiz|8620|9310|case/.test(signature)) return fromMaterialTaxonomy('case_hardening', 'Case Hardening');
      if (/4140|4340|4130|alloy/.test(signature)) return fromMaterialTaxonomy('alloy_steel', 'Alloy Steel');
      if (/carbon|mild/.test(signature)) return fromMaterialTaxonomy('carbon_alloy', 'Carbon / Alloy');
      return null;
    case 'tool_steel':
      if (/hot[_ -]?work|h13|h11/.test(signature)) return fromMaterialTaxonomy('hot_work', 'Hot Work');
      if (/cold[_ -]?work|a2|d2|o1|o2|dc53/.test(signature)) return fromMaterialTaxonomy('cold_work', 'Cold Work');
      if (/high[_ -]?speed|m2|m4|t15/.test(signature)) return fromMaterialTaxonomy('high_speed', 'High Speed');
      if (/shock|s7/.test(signature)) return fromMaterialTaxonomy('shock_resisting', 'Shock Resisting');
      if (/mold|p20|plastic mold/.test(signature)) return fromMaterialTaxonomy('mold_steel', 'Mold Steel');
      if (/tool/.test(signature)) return fromMaterialTaxonomy('tool_steel', 'General Tool Steel');
      return null;
    case 'stainless':
      if (/super[_ -]?duplex/.test(signature)) return fromMaterialTaxonomy('super_duplex', 'Super Duplex');
      if (/duplex/.test(signature)) return fromMaterialTaxonomy('duplex', 'Duplex');
      if (/austenitic/.test(signature)) return fromMaterialTaxonomy('austenitic', 'Austenitic');
      if (/martensitic/.test(signature)) return fromMaterialTaxonomy('martensitic', 'Martensitic');
      if (/ferritic/.test(signature)) return fromMaterialTaxonomy('ferritic', 'Ferritic');
      if (/precipitation|17[_ -]?4|15[_ -]?5|13[_ -]?8|ph/.test(signature)) {
        return fromMaterialTaxonomy('precipitation_hardening', 'Precipitation Hardening');
      }
      if (/stainless|inox/.test(signature)) return fromMaterialTaxonomy('stainless', 'General Stainless');
      return null;
    case 'cast':
      if (/gray|grey/.test(signature)) return fromMaterialTaxonomy('gray_iron', 'Gray Iron');
      if (/ductile/.test(signature)) return fromMaterialTaxonomy('ductile_iron', 'Ductile Iron');
      if (/austempered|adi/.test(signature)) return fromMaterialTaxonomy('austempered_ductile', 'ADI');
      if (/malleable|blackheart|whiteheart/.test(signature)) return fromMaterialTaxonomy('malleable_iron', 'Malleable Iron');
      if (/compacted graphite|cgi/.test(signature)) return fromMaterialTaxonomy('cgi', 'Compacted Graphite');
      if (/cast/.test(signature)) return fromMaterialTaxonomy('cast_alloy', 'Cast Alloy');
      return null;
    case 'aluminum':
      if (/cast/.test(signature)) return fromMaterialTaxonomy('cast_aluminum', 'Cast Aluminum');
      if (/2xxx|2024/.test(signature)) return fromMaterialTaxonomy('series_2xxx', '2xxx');
      if (/5xxx|5052|5083/.test(signature)) return fromMaterialTaxonomy('series_5xxx', '5xxx');
      if (/6xxx|6061|6082/.test(signature)) return fromMaterialTaxonomy('series_6xxx', '6xxx');
      if (/7xxx|7050|7075/.test(signature)) return fromMaterialTaxonomy('series_7xxx', '7xxx');
      if (/aluminum|aluminium/.test(signature)) return fromMaterialTaxonomy('aluminum_alloy', 'General Aluminum');
      return null;
    case 'copper':
      if (/brass/.test(signature)) return fromMaterialTaxonomy('brass', 'Brass');
      if (/bronze/.test(signature)) return fromMaterialTaxonomy('bronze', 'Bronze');
      if (/beryllium copper|be[_ -]?cu/.test(signature)) return fromMaterialTaxonomy('beryllium_copper', 'Beryllium Copper');
      if (/cupronickel|copper nickel/.test(signature)) return fromMaterialTaxonomy('cupronickel', 'Cupronickel');
      if (/copper/.test(signature)) return fromMaterialTaxonomy('copper_alloy', 'Copper Alloy');
      return null;
    case 'titanium':
      if (/alpha[_ -]?beta|grade 5|grade 23|ti[_ -]?6al[_ -]?4v|ti64/.test(signature)) {
        return fromMaterialTaxonomy('alpha_beta', 'Alpha-Beta');
      }
      if (/cp titanium|commercially pure|grade 1|grade 2/.test(signature)) {
        return fromMaterialTaxonomy('commercially_pure', 'Commercially Pure');
      }
      if (/\bbeta\b/.test(signature)) return fromMaterialTaxonomy('beta', 'Beta');
      if (/titanium/.test(signature)) return fromMaterialTaxonomy('titanium_alloy', 'Titanium Alloy');
      return null;
    case 'superalloy':
      if (/nickel|inconel|hastelloy|monel|haynes|nimonic/.test(signature)) return fromMaterialTaxonomy('nickel_base', 'Nickel Base');
      if (/cobalt/.test(signature)) return fromMaterialTaxonomy('cobalt_base', 'Cobalt Base');
      if (/superalloy/.test(signature)) return fromMaterialTaxonomy('superalloy', 'Superalloy');
      return null;
    case 'exotic_alloy':
      if (/zirconium/.test(signature)) return fromMaterialTaxonomy('zirconium', 'Zirconium');
      if (/nitinol|shape[_ -]?memory/.test(signature)) return fromMaterialTaxonomy('shape_memory', 'Shape-Memory');
      if (/tantalum|niobium/.test(signature)) return fromMaterialTaxonomy('reactive_refractory', 'Reactive / Refractory');
      if (/molybdenum|tungsten/.test(signature)) return fromMaterialTaxonomy('refractory_metal', 'Refractory Metal');
      if (/reactive|exotic/.test(signature)) return fromMaterialTaxonomy('exotic_alloy', 'General Exotic Alloy');
      return null;
    case 'polymer_composite':
      if (/composite|carbon fiber|fiberglass|g10/.test(signature)) return fromMaterialTaxonomy('composite', 'Composite');
      if (/phenolic|thermoset/.test(signature)) return fromMaterialTaxonomy('thermoset', 'Thermoset');
      if (/plastic|polymer|peek|acetal|delrin|nylon|ptfe|uhmw|abs|polycarbonate/.test(signature)) {
        return fromMaterialTaxonomy('thermoplastic', 'Thermoplastic');
      }
      return null;
    case 'graphite_ceramic':
      if (/graphite/.test(signature)) return fromMaterialTaxonomy('graphite', 'Graphite');
      if (/glass|quartz/.test(signature)) return fromMaterialTaxonomy('glass', 'Glass');
      if (/ceramic|alumina|zirconia|silicon carbide/.test(signature)) return fromMaterialTaxonomy('ceramic', 'Ceramic');
      return null;
    case 'nontraditional':
      if (/slm|dmls|binder jet|additive/.test(signature)) return fromMaterialTaxonomy('additive_feedstock', 'Additive Feedstock');
      if (/mim/.test(signature)) return fromMaterialTaxonomy('mim', 'MIM');
      if (/process stock|edm stock/.test(signature)) return fromMaterialTaxonomy('process_stock', 'Process Stock');
      return null;
    default:
      return null;
  }
}

function inferMaterialSubcategory(raw: Record<string, unknown>, group: MaterialCatalogItem['group']) {
  const explicit = readText(raw.subcategory ?? raw.family ?? raw.category, ['value']).toLowerCase();
  if (explicit) {
    const canonical = canonicalizeExplicitMaterialSubcategory(explicit, group);
    if (canonical) return canonical;
  }

  const signature = [
    readText(raw.material_type, ['value']),
    readText(raw.condition, ['value']),
    readText(raw.name, ['value']),
    readText(raw.description, ['summary']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  switch (group) {
    case 'steel':
      if (/free[_ -]?machining|12l14|11smnpb|leaded/.test(signature)) return fromMaterialTaxonomy('free_machining', 'Free-Machining');
      if (/bearing|52100/.test(signature)) return fromMaterialTaxonomy('bearing_steel', 'Bearing Steel');
      if (/structural|a36|a572|plate/.test(signature)) return fromMaterialTaxonomy('structural', 'Structural');
      if (/carburiz|8620|9310|case/.test(signature)) return fromMaterialTaxonomy('case_hardening', 'Case Hardening');
      if (/4140|4340|4130|alloy/.test(signature)) return fromMaterialTaxonomy('alloy_steel', 'Alloy Steel');
      return fromMaterialTaxonomy('carbon_alloy', 'Carbon / Alloy');
    case 'tool_steel':
      if (/hot[_ -]?work|h13|h11/.test(signature)) return fromMaterialTaxonomy('hot_work', 'Hot Work');
      if (/cold[_ -]?work|a2|d2|o1|o2|dc53/.test(signature)) return fromMaterialTaxonomy('cold_work', 'Cold Work');
      if (/high[_ -]?speed|m2|m4|t15/.test(signature)) return fromMaterialTaxonomy('high_speed', 'High Speed');
      if (/shock|s7/.test(signature)) return fromMaterialTaxonomy('shock_resisting', 'Shock Resisting');
      if (/mold|p20|plastic mold/.test(signature)) return fromMaterialTaxonomy('mold_steel', 'Mold Steel');
      return fromMaterialTaxonomy('tool_steel', 'General Tool Steel');
    case 'stainless':
      if (/super[_ -]?duplex/.test(signature)) return fromMaterialTaxonomy('super_duplex', 'Super Duplex');
      if (/duplex/.test(signature)) return fromMaterialTaxonomy('duplex', 'Duplex');
      if (/austenitic/.test(signature)) return fromMaterialTaxonomy('austenitic', 'Austenitic');
      if (/martensitic/.test(signature)) return fromMaterialTaxonomy('martensitic', 'Martensitic');
      if (/ferritic/.test(signature)) return fromMaterialTaxonomy('ferritic', 'Ferritic');
      if (/precipitation|17-4|15-5|13-8/.test(signature)) return fromMaterialTaxonomy('precipitation_hardening', 'Precipitation Hardening');
      return fromMaterialTaxonomy('stainless', 'General Stainless');
    case 'cast':
      if (/gray|grey/.test(signature)) return fromMaterialTaxonomy('gray_iron', 'Gray Iron');
      if (/ductile/.test(signature)) return fromMaterialTaxonomy('ductile_iron', 'Ductile Iron');
      if (/austempered|adi/.test(signature)) return fromMaterialTaxonomy('austempered_ductile', 'ADI');
      if (/malleable|blackheart|whiteheart/.test(signature)) return fromMaterialTaxonomy('malleable_iron', 'Malleable Iron');
      if (/compacted graphite|cgi/.test(signature)) return fromMaterialTaxonomy('cgi', 'Compacted Graphite');
      return fromMaterialTaxonomy('cast_alloy', 'Cast Alloy');
    case 'aluminum':
      if (/cast/.test(signature)) return fromMaterialTaxonomy('cast_aluminum', 'Cast Aluminum');
      if (/2xxx|2024/.test(signature)) return fromMaterialTaxonomy('series_2xxx', '2xxx');
      if (/5xxx|5052|5083/.test(signature)) return fromMaterialTaxonomy('series_5xxx', '5xxx');
      if (/6xxx|6061|6082/.test(signature)) return fromMaterialTaxonomy('series_6xxx', '6xxx');
      if (/7xxx|7050|7075/.test(signature)) return fromMaterialTaxonomy('series_7xxx', '7xxx');
      return fromMaterialTaxonomy('aluminum_alloy', 'General Aluminum');
    case 'copper':
      if (/brass/.test(signature)) return fromMaterialTaxonomy('brass', 'Brass');
      if (/bronze/.test(signature)) return fromMaterialTaxonomy('bronze', 'Bronze');
      if (/beryllium copper|be[_ -]?cu/.test(signature)) return fromMaterialTaxonomy('beryllium_copper', 'Beryllium Copper');
      if (/cupronickel|copper nickel/.test(signature)) return fromMaterialTaxonomy('cupronickel', 'Cupronickel');
      return fromMaterialTaxonomy('copper_alloy', 'Copper Alloy');
    case 'titanium':
      if (/alpha[_ -]?beta|grade 5|grade 23|ti-6al-4v|ti64/.test(signature)) return fromMaterialTaxonomy('alpha_beta', 'Alpha-Beta');
      if (/cp titanium|commercially pure/.test(signature)) return fromMaterialTaxonomy('commercially_pure', 'Commercially Pure');
      if (/\bbeta\b/.test(signature)) return fromMaterialTaxonomy('beta', 'Beta');
      return fromMaterialTaxonomy('titanium_alloy', 'Titanium Alloy');
    case 'superalloy':
      if (/nickel/.test(signature) || /inconel|hastelloy|monel|haynes|nimonic/.test(signature)) return fromMaterialTaxonomy('nickel_base', 'Nickel Base');
      if (/cobalt/.test(signature)) return fromMaterialTaxonomy('cobalt_base', 'Cobalt Base');
      return fromMaterialTaxonomy('superalloy', 'Superalloy');
    case 'exotic_alloy':
      if (/zirconium/.test(signature)) return fromMaterialTaxonomy('zirconium', 'Zirconium');
      if (/nitinol|shape[_ -]?memory/.test(signature)) return fromMaterialTaxonomy('shape_memory', 'Shape-Memory');
      if (/tantalum|niobium/.test(signature)) return fromMaterialTaxonomy('reactive_refractory', 'Reactive / Refractory');
      if (/molybdenum|tungsten/.test(signature)) return fromMaterialTaxonomy('refractory_metal', 'Refractory Metal');
      return fromMaterialTaxonomy('exotic_alloy', 'General Exotic Alloy');
    case 'polymer_composite':
      if (/composite|carbon fiber|fiberglass|g10/.test(signature)) return fromMaterialTaxonomy('composite', 'Composite');
      if (/phenolic|thermoset/.test(signature)) return fromMaterialTaxonomy('thermoset', 'Thermoset');
      return fromMaterialTaxonomy('thermoplastic', 'Thermoplastic');
    case 'graphite_ceramic':
      if (/graphite/.test(signature)) return fromMaterialTaxonomy('graphite', 'Graphite');
      if (/glass|quartz/.test(signature)) return fromMaterialTaxonomy('glass', 'Glass');
      return fromMaterialTaxonomy('ceramic', 'Ceramic');
    case 'nontraditional':
      if (/slm|dmls|binder jet|additive/.test(signature)) return fromMaterialTaxonomy('additive_feedstock', 'Additive Feedstock');
      if (/mim/.test(signature)) return fromMaterialTaxonomy('mim', 'MIM');
      return fromMaterialTaxonomy('process_stock', 'Process Stock');
    default:
      return fromMaterialTaxonomy('general', 'General');
  }
}

function inferMaterialCondition(raw: Record<string, unknown>) {
  const explicit = readText(raw.condition, ['value']).toLowerCase();
  const signature = [
    explicit,
    readText(raw.name, ['value']),
    readText(raw.description, ['summary']),
    readText(raw.notes, ['summary']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!signature) return undefined;
  if (/annealed|anneal/.test(signature)) return { id: 'annealed', label: 'Annealed' };
  if (/normalized|normalised/.test(signature)) return { id: 'normalized', label: 'Normalized' };
  if (/q&t|qt|quenched.*tempered|quenched.*and.*tempered|prehard|pre-hard/.test(signature)) {
    return { id: 'prehardened_qt', label: 'Prehardened / Q&T' };
  }
  if (/aged|h900|h1025|h1150|sta|solution treated and aged/.test(signature)) {
    return { id: 'aged_sta', label: 'Aged / STA' };
  }
  if (/solution treated/.test(signature)) return { id: 'solution_treated', label: 'Solution Treated' };
  if (/t6|t651|t6511/.test(signature)) return { id: 't6', label: 'T6' };
  if (/cold worked|cold-worked|half hard/.test(signature)) return { id: 'cold_worked', label: 'Cold Worked' };
  if (/blackheart/.test(signature)) return { id: 'blackheart', label: 'Blackheart' };
  if (/commercially pure|grade 1|grade 2/.test(signature)) return { id: 'commercially_pure', label: 'Commercially Pure' };
  if (!explicit) return undefined;
  return {
    id: normalizeMaterialSubcategoryId(explicit),
    label: humanizeMaterialSubcategory(explicit),
  };
}

function formatMaterialHardness(raw: Record<string, unknown>): string {
  const direct = readText(raw.hardness, ['range', 'label']) || readText(raw.hardness_range, ['label']);
  if (direct) return direct;

  const mechanical = asRecord(raw.mechanical);
  const hardness = asRecord(mechanical?.hardness);
  const hardnessHrc = asRecord(raw.hardness_hrc);
  const hardnessHb = asRecord(raw.hardness_hb);
  const hardnessHrb = asRecord(raw.hardness_hrb);
  const hardnessHv = asRecord(raw.hardness_hv);

  const topLevelRange =
    formatRangeLabel(hardnessHrc, 'HRC')
    || formatRangeLabel(hardnessHb, 'HB')
    || formatRangeLabel(hardnessHrb, 'HRB')
    || formatRangeLabel(hardnessHv, 'HV');
  if (topLevelRange) return topLevelRange;

  if (!hardness) return '';

  return (
    formatRangeLabel(hardness.rockwell_c, 'HRC')
    || formatRangeLabel(hardness.brinell, 'HB')
    || formatRangeLabel(hardness.rockwell_b, 'HRB')
    || formatRangeLabel(hardness.vickers, 'HV')
  );
}

function deriveBaseSfm(raw: Record<string, unknown>): number {
  const taylor = asRecord(raw.taylor);
  const cutting = asRecord(raw.cutting_recommendations);
  const milling = asRecord(cutting?.milling);
  const turning = asRecord(cutting?.turning);
  const recommendations = asRecord(raw.recommendations);
  const recommendedMilling = asRecord(recommendations?.milling);
  const recommendedTurning = asRecord(recommendations?.turning);

  const candidate =
    safeNum(raw.base_sfm ?? raw.baseSfm ?? raw.recommended_sfm, Number.NaN)
    || safeNum(taylor?.C_carbide ?? taylor?.C, Number.NaN)
    || safeNum(milling?.speed_finishing ?? milling?.speed_roughing ?? milling?.speed, Number.NaN)
    || safeNum(turning?.speed_finishing ?? turning?.speed_roughing ?? turning?.speed, Number.NaN)
    || safeNum(recommendedMilling?.speed, Number.NaN)
    || safeNum(recommendedTurning?.speed, Number.NaN);

  return Number.isFinite(candidate) && candidate > 0 ? candidate : 250;
}

function formatMachinability(raw: Record<string, unknown>): string {
  const direct = readText(raw.machinability, ['label', 'rating']);
  if (direct) return direct;

  const machinability = asRecord(raw.machinability);
  const rating = safeNum(machinability?.aisi_rating ?? machinability?.relative_to_1212, Number.NaN);
  if (Number.isFinite(rating) && rating > 0) {
    return rating > 2 ? `${Math.round(rating)}% AISI 1212` : `${Math.round(rating * 100)}% AISI 1212`;
  }
  const indexedMachinability = asRecord(raw.machinability_index);
  const topLevelRating = safeNum(indexedMachinability?.value ?? raw.machinability_index, Number.NaN);
  if (Number.isFinite(topLevelRating) && topLevelRating > 0) {
    return topLevelRating > 2 ? `${Math.round(topLevelRating)}% AISI 1212` : `${Math.round(topLevelRating * 100)}% AISI 1212`;
  }
  return '';
}

function formatChipControl(raw: Record<string, unknown>): string {
  const direct = readText(raw.chip_control, ['label']);
  if (direct) return direct;

  const chipFormation = asRecord(raw.chip_formation);
  const chipBreaking = readText(chipFormation?.chip_breaking, []);
  const chipType = readText(chipFormation?.chip_type, []);
  if (chipBreaking && chipType) {
    return `${humanizeToken(chipBreaking)} · ${humanizeToken(chipType)}`;
  }

  const topLevelChipBreaking = readText(raw.chip_breakability, []);
  const topLevelChipType = readText(raw.chip_type, []);
  if (topLevelChipBreaking && topLevelChipType) {
    return `${humanizeToken(topLevelChipBreaking)} · ${humanizeToken(topLevelChipType)}`;
  }

  const chipForm = readText(asRecord(raw.machinability)?.chip_form, []);
  return (
    chipBreaking
      ? humanizeToken(chipBreaking)
      : humanizeToken(chipType)
        || humanizeToken(topLevelChipBreaking)
        || humanizeToken(topLevelChipType)
        || humanizeToken(chipForm)
  );
}

function formatMaterialNote(raw: Record<string, unknown>): string {
  const direct = readText(raw.note, ['label']) || readText(raw.notes, ['summary']) || readText(raw.description, ['summary']);
  if (direct) return direct;

  const materialType = humanizeToken(readText(raw.material_type, ['value']) || 'Material');
  const subcategory = humanizeToken(readText(raw.subcategory, ['value']));
  const condition = humanizeToken(readText(raw.condition, ['value']));

  return [materialType, subcategory, condition].filter(Boolean).join(' · ');
}

function formatIdealCoolant(raw: Record<string, unknown>): string {
  const humanizeCoolantLabel = (value: string) => {
    const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (!normalized) return '';
    if (normalized === 'tsc') return 'TSC';
    if (normalized === 'mql') return 'MQL';
    if (normalized === 'hpc' || normalized === 'high pressure' || normalized === 'high pressure flood') {
      return 'High-pressure flood';
    }
    return humanizeToken(normalized).replace(/\bTsc\b/g, 'TSC').replace(/\bMql\b/g, 'MQL');
  };

  const direct =
    readText(raw.ideal_coolant, ['label'])
    || readText(raw.idealCoolant, ['label'])
    || readText(raw.recommended_coolant, ['label'])
    || readText(raw.coolant_primary_recommendation, ['label'])
    || readText(asRecord(raw.coolant_recommendations)?.primary, ['label']);
  const secondary = readText(raw.coolant_secondary_recommendation, ['label']);

  if (direct && secondary) {
    return `${humanizeCoolantLabel(direct)} or ${humanizeCoolantLabel(secondary)}`;
  }
  if (direct) return humanizeCoolantLabel(direct);

  const cutting = asRecord(raw.cutting_recommendations);
  const coolant = asRecord(cutting?.coolant);
  const type = readText(coolant?.type, ['primary', 'recommended']);
  return type ? humanizeCoolantLabel(type) : '';
}

function unwrapMaterialResults(raw: unknown): unknown[] {
  return unwrapCollection(raw, ['materials', 'items', 'results']);
}

async function fetchAllMaterialRows(): Promise<unknown[]> {
  const rows: unknown[] = [];
  let offset = 0;

  for (let page = 0; page < MATERIAL_MAX_PAGES; page += 1) {
    const raw = await dataRequest<unknown>('/material/search', 'POST', {
      query: '',
      limit: MATERIAL_PAGE_SIZE,
      offset,
    });

    const batch = unwrapMaterialResults(raw);
    if (batch.length === 0) break;
    rows.push(...batch);

    const envelope = asRecord(raw);
    const materialEnvelope = asRecord(envelope?.materials);
    const total = safeNum(materialEnvelope?._total ?? envelope?.total, Number.NaN);
    const hasMore = Boolean(materialEnvelope?._hasMore ?? envelope?.hasMore);

    offset += batch.length;

    if (Number.isFinite(total) && offset >= total) break;
    if (!hasMore && batch.length < MATERIAL_PAGE_SIZE) break;
  }

  return rows;
}

function shouldCacheCalculatorData() {
  const isVitestWorker = typeof globalThis !== 'undefined' && '__vitest_worker__' in globalThis;
  const isVitestProcess = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  return !(isVitestWorker || isVitestProcess);
}

function normalizeMaterial(raw: Record<string, unknown>): MaterialCatalogItem | null {
  const id = String(raw.id ?? raw.material_id ?? '');
  const name = String(raw.name ?? raw.material_name ?? '');
  if (!id || !name) return null;
  const group = inferMaterialGroup(raw);
  const subcategory = inferMaterialSubcategory(raw, group);
  const condition = inferMaterialCondition(raw);

  return {
    id,
    group,
    groupLabel: MATERIAL_GROUPS.find((item) => item.id === group)?.label,
    subcategoryId: subcategory.id,
    subcategoryLabel: subcategory.label,
    conditionId: condition?.id,
    conditionLabel: condition?.label,
    familyLabel: humanizeMaterialSubcategory(
      readText(asRecord(raw.identification)?.material_class ?? raw.material_type ?? raw.family ?? raw.category, ['value']) || group,
    ),
    isoGroup: readMaterialIsoGroup(raw) || undefined,
    name,
    hardness: formatMaterialHardness(raw),
    baseSfm: deriveBaseSfm(raw),
    machinability: formatMachinability(raw),
    chipControl: formatChipControl(raw),
    note: formatMaterialNote(raw),
    idealCoolant: formatIdealCoolant(raw),
  };
}

function mergeMaterialCatalogItem(base: MaterialCatalogItem | undefined, incoming: MaterialCatalogItem): MaterialCatalogItem {
  if (!base) return incoming;
  return {
    ...base,
    ...incoming,
    groupLabel: incoming.groupLabel || base.groupLabel,
    subcategoryId: incoming.subcategoryId || base.subcategoryId,
    subcategoryLabel: incoming.subcategoryLabel || base.subcategoryLabel,
    conditionId: incoming.conditionId || base.conditionId,
    conditionLabel: incoming.conditionLabel || base.conditionLabel,
    familyLabel: incoming.familyLabel || base.familyLabel,
    isoGroup: incoming.isoGroup || base.isoGroup,
    hardness: incoming.hardness || base.hardness,
    baseSfm: incoming.baseSfm || base.baseSfm,
    machinability: incoming.machinability || base.machinability,
    chipControl: incoming.chipControl || base.chipControl,
    note: incoming.note || base.note,
    idealCoolant: incoming.idealCoolant || base.idealCoolant,
  };
}

function mergeMaterialCatalog(items: MaterialCatalogItem[], group?: string): MaterialCatalogItem[] {
  const staticSlice = group ? MATERIAL_CATALOG.filter((item) => item.group === group) : MATERIAL_CATALOG;
  const map = new Map(staticSlice.map((item) => [item.id, item]));
  for (const item of items) {
    if (group && item.group !== group) continue;
    map.set(item.id, mergeMaterialCatalogItem(map.get(item.id), item));
  }
  return Array.from(map.values()).sort(
    (left, right) =>
      (left.subcategoryLabel ?? '').localeCompare(right.subcategoryLabel ?? '')
      || left.name.localeCompare(right.name)
      || (left.conditionLabel ?? '').localeCompare(right.conditionLabel ?? '')
      || (left.hardness ?? '').localeCompare(right.hardness ?? ''),
  );
}

function normalizeMaterialCatalogRows(rows: unknown[]): MaterialCatalogItem[] {
  const normalized: MaterialCatalogItem[] = [];

  for (const entry of rows) {
    const record = asRecord(entry);
    if (!record) continue;

    try {
      const material = normalizeMaterial(record);
      if (material) {
        normalized.push(material);
      }
    } catch (error) {
      console.log('DEBUG_MATERIAL_NORMALIZE_FAIL', JSON.stringify(record), String(error));
      continue;
    }
  }

  return normalized;
}

export async function fetchMaterialCatalog(group?: string): Promise<MaterialCatalogItem[]> {
  return (await fetchMaterialCatalogState(group)).items;
}

export async function fetchMaterialCatalogState(
  group?: string,
): Promise<CalculatorCatalogLoadState<MaterialCatalogItem>> {
  const fallbackItems = mergeMaterialCatalog([], group);

  try {
    let normalized: MaterialCatalogItem[];
    if (!shouldCacheCalculatorData()) {
      const rows = await fetchAllMaterialRows();
      normalized = normalizeMaterialCatalogRows(rows);
    } else {
      if (!materialCatalogPromise) {
        materialCatalogPromise = fetchAllMaterialRows().then((rows) => normalizeMaterialCatalogRows(rows));
      }
      normalized = await materialCatalogPromise;
    }

    const liveItems = group ? normalized.filter((item) => item.group === group) : normalized;
    const mergedItems = liveItems.length > 0 ? mergeMaterialCatalog(liveItems, group) : fallbackItems;
    const liveIds = new Set(liveItems.map((item) => item.id));
    const fallbackCount = mergedItems.filter((item) => !liveIds.has(item.id)).length;

    if (liveItems.length === 0) {
      return {
        items: mergedItems,
        source: mergedItems.length ? 'fallback' : 'empty',
        liveCount: 0,
        fallbackCount: mergedItems.length,
        note: mergedItems.length
          ? 'Material registry is unavailable for this slice, so the curated fallback material catalog is active.'
          : 'No materials were available for this slice.',
      };
    }

    return {
      items: mergedItems,
      source: fallbackCount > 0 ? 'hybrid' : 'live',
      liveCount: liveItems.length,
      fallbackCount,
      note: fallbackCount > 0
        ? 'Live material rows are merged with curated fallback entries so the material families stay complete.'
        : 'Live material registry is active for this material slice.',
    };
  } catch {
    materialCatalogPromise = null;
    return {
      items: fallbackItems,
      source: fallbackItems.length ? 'fallback' : 'empty',
      liveCount: 0,
      fallbackCount: fallbackItems.length,
      note: fallbackItems.length
        ? 'Material registry is unavailable, so the curated fallback material catalog is active.'
        : 'No materials were available for this slice.',
    };
  }
}

// ─── Programming catalog ────────────────────────────────────────

function normalizeProgrammingToolpath(entry: unknown): ProgrammingToolpathOption | null {
  const record = asRecord(entry);
  if (!record) return null;

  const id = readText(record.id);
  const label = readText(record.label);
  const path = readText(record.path);
  const summary = readText(record.summary);
  const operationId = readText(record.operationId ?? record.operation_id);

  if (!id || !label || !path || !summary || !operationId) {
    return null;
  }

  return { id, label, path, summary, operationId };
}

function normalizeProgrammingEnvironment(entry: unknown): ProgrammingEnvironmentOption | null {
  const record = asRecord(entry);
  if (!record) return null;

  const id = readText(record.id);
  const mode = normalizeToolMode(readText(record.mode).toLowerCase());
  const label = readText(record.label);
  const vendor = readText(record.vendor);
  const summary = readText(record.summary);
  const badge = readText(record.badge);
  const kind = readText(record.kind).toLowerCase();
  const toolpaths = unwrapCollection(record.toolpaths)
    .map(normalizeProgrammingToolpath)
    .filter((item): item is ProgrammingToolpathOption => Boolean(item));

  if (
    !id
    || !mode
    || !label
    || !vendor
    || !summary
    || !badge
    || !toolpaths.length
    || !(['manual', 'cam', 'nesting'] as const).includes(kind as ProgrammingEnvironmentOption['kind'])
  ) {
    return null;
  }

  return {
    id,
    mode,
    label,
    vendor,
    kind: kind as ProgrammingEnvironmentOption['kind'],
    summary,
    badge,
    toolpaths,
  };
}

function sortProgrammingCatalog(items: ProgrammingEnvironmentOption[]) {
  return [...items].sort(
    (left, right) =>
      left.label.localeCompare(right.label)
      || left.vendor.localeCompare(right.vendor)
      || left.id.localeCompare(right.id),
  );
}

export async function fetchProgrammingCatalog(mode?: MachineMode): Promise<ProgrammingEnvironmentOption[]> {
  return (await fetchProgrammingCatalogState(mode)).items;
}

export async function fetchProgrammingCatalogState(
  mode?: MachineMode,
): Promise<CalculatorCatalogLoadState<ProgrammingEnvironmentOption>> {
  const fallbackItems = sortProgrammingCatalog(
    mode ? PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === mode) : PROGRAMMING_ENVIRONMENTS,
  );

  const load = async (requestedMode?: MachineMode) => {
    const raw = await dataRequest<unknown>('/programming/catalog', 'POST', requestedMode ? { mode: requestedMode } : {});
    const liveItems = sortProgrammingCatalog(
      unwrapCollection(raw, ['programming', 'items', 'results'])
        .map(normalizeProgrammingEnvironment)
        .filter((item): item is ProgrammingEnvironmentOption => Boolean(item))
        .filter((item) => !requestedMode || item.mode === requestedMode),
    );

    if (liveItems.length === 0) {
      return {
        items: fallbackItems,
        source: fallbackItems.length ? 'fallback' : 'empty',
        liveCount: 0,
        fallbackCount: fallbackItems.length,
        note: fallbackItems.length
          ? 'Programming catalog route returned no compatible packages, so the bundled programming catalog is active.'
          : 'No programming packages were available for this machine slice.',
        sampled: false,
      };
    }

    return {
      items: liveItems,
      source: 'live',
      liveCount: liveItems.length,
      fallbackCount: 0,
      note: 'Backend programming catalog is active for this machine slice.',
      sampled: false,
    };
  };

  try {
    if (!shouldCacheCalculatorData() || !mode) {
      return await load(mode);
    }

    const cached = programmingCatalogPromiseCache.get(mode);
    if (cached) {
      return await cached;
    }

    const promise = load(mode).catch((error) => {
      programmingCatalogPromiseCache.delete(mode);
      throw error;
    });
    programmingCatalogPromiseCache.set(mode, promise);
    return await promise;
  } catch {
    return {
      items: fallbackItems,
      source: fallbackItems.length ? 'fallback' : 'empty',
      liveCount: 0,
      fallbackCount: fallbackItems.length,
      note: fallbackItems.length
        ? 'Programming catalog route is unavailable, so the bundled programming catalog is active.'
        : 'No programming packages were available for this machine slice.',
      sampled: false,
    };
  }
}

// ─── Tool catalog ───────────────────────────────────────────────

const TOOL_PAGE_SIZE = 250;
const TOOL_MAX_PAGES = 160;

type CalculatorToolKind =
  | 'face-mill'
  | 'square-endmill'
  | 'variable-helix-endmill'
  | 'ball-endmill'
  | 'chamfer'
  | 'drill'
  | 'tap'
  | 'reamer'
  | 'roughing-insert'
  | 'finishing-insert'
  | 'grooving-insert'
  | 'threading-insert'
  | 'boring-bar'
  | 'live-tool-endmill'
  | 'wire'
  | 'electrode'
  | 'beam'
  | 'stream'
  | 'unknown';

function buildToolSignature(raw: Record<string, unknown>): string {
  return [
    raw.id,
    raw.vendor,
    raw.manufacturer,
    raw.catalog_number,
    raw.category,
    raw.subcategory,
    raw.type,
    raw.name,
    raw.label,
    raw.description,
    raw.tool_family,
    raw.family,
    raw.application,
  ]
    .map((value) => readText(value))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function normalizeToolMode(rawMode: string): MachineMode | null {
  return (['mill', 'lathe', 'edm', 'wire_edm', 'laser', 'waterjet'] as const).includes(rawMode as MachineMode)
    ? (rawMode as MachineMode)
    : null;
}

function inferToolKind(signature: string, requestedMode?: MachineMode): CalculatorToolKind {
  if (requestedMode === 'wire_edm') return 'wire';
  if (requestedMode === 'edm') return 'electrode';
  if (requestedMode === 'laser') return 'beam';
  if (requestedMode === 'waterjet') return 'stream';

  if (/wire\s*edm|wire-cut|wire cut|skim pass|brass wire/.test(signature)) return 'wire';
  if (/electrode|graphite electrode|copper tungsten|ram edm|sinker edm/.test(signature)) return 'electrode';
  if (/laser nozzle|laser lens|laser cutting/.test(signature)) return 'beam';
  if (/waterjet|mixing tube|orifice/.test(signature)) return 'stream';
  if (/boring bar/.test(signature)) return 'boring-bar';
  if (/groov|parting|cutoff|cut-off/.test(signature)) return 'grooving-insert';
  if (/thread(ing)? insert|laydown|threading tool/.test(signature)) return 'threading-insert';
  if (/turning|external tool|internal tool|\bcnmg\b|\bdnmg\b|\bvnmg\b|\bwnmg\b|\btnmg\b|\bsnmg\b|\bccmt\b|\bdcmt\b|\bvcgt\b|\bvbmt\b|\bmgmn\b/.test(signature)) {
    return /finish|wiper|finishing/.test(signature) ? 'finishing-insert' : 'roughing-insert';
  }
  if (/face mill|shell mill|high feed mill/.test(signature)) return 'face-mill';
  if (/ball nose|ball end mill|ball mill/.test(signature)) return requestedMode === 'lathe' ? 'live-tool-endmill' : 'ball-endmill';
  if (/chamfer|spot drill/.test(signature)) return requestedMode === 'lathe' ? 'live-tool-endmill' : 'chamfer';
  if (/reamer/.test(signature)) return 'reamer';
  if (/\btap\b|forming tap|spiral point tap|spiral flute tap/.test(signature)) return 'tap';
  if (/drill|u-?drill|twist drill|indexable drill|center drill|spade drill/.test(signature)) return 'drill';
  if (/end mill|slot drill|thread mill|square mill|rougher|variable helix|variable flute/.test(signature)) {
    if (requestedMode === 'lathe') return 'live-tool-endmill';
    if (/variable helix|variable flute|rougher|trochoidal|pow-r-feed|high feed/.test(signature)) return 'variable-helix-endmill';
    return 'square-endmill';
  }
  return 'unknown';
}

function toolKindMatchesMode(kind: CalculatorToolKind, mode?: MachineMode): boolean {
  if (!mode) return true;
  const allowedByMode: Record<MachineMode, CalculatorToolKind[]> = {
    mill: ['face-mill', 'square-endmill', 'variable-helix-endmill', 'ball-endmill', 'chamfer', 'drill', 'tap', 'reamer'],
    lathe: ['roughing-insert', 'finishing-insert', 'grooving-insert', 'threading-insert', 'boring-bar', 'drill', 'tap', 'reamer', 'live-tool-endmill'],
    edm: ['electrode'],
    wire_edm: ['wire'],
    laser: ['beam'],
    waterjet: ['stream'],
  };
  return allowedByMode[mode].includes(kind);
}

function inferToolMode(kind: CalculatorToolKind, fallbackMode: MachineMode = 'mill'): MachineMode {
  switch (kind) {
    case 'roughing-insert':
    case 'finishing-insert':
    case 'grooving-insert':
    case 'threading-insert':
    case 'boring-bar':
    case 'live-tool-endmill':
      return 'lathe';
    case 'electrode':
      return 'edm';
    case 'wire':
      return 'wire_edm';
    case 'beam':
      return 'laser';
    case 'stream':
      return 'waterjet';
    default:
      return fallbackMode;
  }
}

function inferToolMaterialClass(signature: string, raw: Record<string, unknown>): ToolCatalogItem['toolMaterialClass'] | undefined {
  const substrate = readText(raw.substrate).toLowerCase();
  if (substrate.includes('carbide')) return 'carbide';
  if (substrate.includes('cermet')) return 'cermet';
  if (substrate.includes('pcd') || substrate.includes('diamond')) return 'pcd';
  if (substrate.includes('ceramic') || substrate.includes('cbn')) return 'ceramic';
  if (signature.includes('wire edm')) return 'wire';
  if (signature.includes('graphite')) return 'graphite';
  if (signature.includes('electrode')) return 'electrode';
  if (signature.includes('abrasive') || signature.includes('waterjet')) return 'abrasive';
  return undefined;
}

function inferToolFamily(kind: CalculatorToolKind, signature: string, raw: Record<string, unknown>): string {
  const explicitFamily = readText(raw.family ?? raw.tool_family);
  if (explicitFamily) return explicitFamily;

  switch (kind) {
    case 'face-mill':
      return signature.includes('high feed') ? 'High-Feed Face Mill' : 'Indexable Face Mill';
    case 'variable-helix-endmill':
      return 'Variable-Flute End Mill';
    case 'square-endmill':
      return 'End Mill';
    case 'ball-endmill':
      return 'Ball Nose End Mill';
    case 'chamfer':
      return 'Chamfer Mill';
    case 'drill':
      return signature.includes('center drill') ? 'Center Drill' : 'Drill';
    case 'tap':
      return 'Tap';
    case 'reamer':
      return 'Reamer';
    case 'roughing-insert':
      return 'Turning Roughing Tool';
    case 'finishing-insert':
      return 'Turning Finishing Tool';
    case 'grooving-insert':
      return 'Grooving Tool';
    case 'threading-insert':
      return 'Threading Tool';
    case 'boring-bar':
      return 'Boring Bar';
    case 'live-tool-endmill':
      return signature.includes('drill') ? 'Live Tool Drill' : 'Live Tool End Mill';
    case 'wire':
      return 'EDM Wire';
    case 'electrode':
      return 'EDM Electrode';
    case 'beam':
      return 'Laser Cutting Head';
    case 'stream':
      return 'Waterjet Stream';
    default:
      return humanizeToken(readText(raw.subcategory) || readText(raw.category) || 'Tool');
  }
}

function inferToolHolder(kind: CalculatorToolKind, requestedMode: MachineMode, raw: Record<string, unknown>, signature: string): string {
  const explicit = readText(raw.holder ?? raw.holder_type ?? raw.holder_interface);
  if (explicit) return explicit;

  switch (kind) {
    case 'face-mill':
      return 'Shell mill arbor';
    case 'square-endmill':
    case 'variable-helix-endmill':
      return signature.includes('shrink') ? 'Shrink-fit or hydraulic chuck' : 'Hydraulic or shrink-fit';
    case 'ball-endmill':
      return 'Shrink-fit or hydraulic chuck';
    case 'chamfer':
      return 'ER collet or hydraulic chuck';
    case 'drill':
      return requestedMode === 'lathe' ? 'Turret drill holder' : 'Hydraulic or ER collet';
    case 'tap':
      return requestedMode === 'lathe' ? 'Tapping holder' : 'Synchronous tapping chuck';
    case 'reamer':
      return 'Hydraulic chuck';
    case 'boring-bar':
      return 'Boring bar holder';
    case 'roughing-insert':
    case 'finishing-insert':
    case 'grooving-insert':
    case 'threading-insert':
      return 'Turret holder';
    case 'live-tool-endmill':
      return 'Driven-tool holder';
    case 'wire':
      return 'Wire guide stack';
    case 'electrode':
      return 'Electrode chuck';
    case 'beam':
      return 'Nozzle / lens stack';
    case 'stream':
      return 'Orifice / tube assembly';
    default:
      return 'Machine standard';
  }
}

function inferToolGeometryClass(kind: CalculatorToolKind): ToolCatalogItem['geometryClass'] | undefined {
  switch (kind) {
    case 'face-mill':
    case 'variable-helix-endmill':
    case 'square-endmill':
    case 'ball-endmill':
    case 'chamfer':
    case 'drill':
    case 'tap':
    case 'reamer':
    case 'roughing-insert':
    case 'finishing-insert':
    case 'grooving-insert':
    case 'threading-insert':
    case 'boring-bar':
    case 'live-tool-endmill':
    case 'wire':
    case 'electrode':
    case 'beam':
    case 'stream':
      return kind;
    case 'unknown':
      return undefined;
    default:
      return undefined;
  }
}

function inferToolBodyType(
  raw: Record<string, unknown>,
  kind: CalculatorToolKind,
  signature: string,
): ToolCatalogItem['bodyType'] | undefined {
  const substrate = readText(raw.substrate).toUpperCase();
  if (substrate.includes('INDEXABLE')) return 'indexable';
  if (readText(raw.insert_type) || safeNum(raw.insert_count) > 0) return 'indexable';

  switch (kind) {
    case 'face-mill':
    case 'roughing-insert':
    case 'finishing-insert':
    case 'grooving-insert':
    case 'threading-insert':
    case 'boring-bar':
      return 'indexable';
    case 'drill':
      return /indexable|u-?drill/.test(signature) ? 'indexable' : 'solid';
    case 'wire':
    case 'electrode':
    case 'beam':
    case 'stream':
      return undefined;
    default:
      return 'solid';
  }
}

function inferToolOperation(kind: CalculatorToolKind, signature: string, requestedMode: MachineMode): string {
  switch (kind) {
    case 'face-mill':
      return 'face_milling';
    case 'variable-helix-endmill':
      return 'roughing';
    case 'square-endmill':
      if (/slot/.test(signature)) return 'slot_milling';
      if (/shoulder|profile/.test(signature)) return 'shoulder_milling';
      if (/finish/.test(signature)) return 'finishing';
      return 'roughing';
    case 'ball-endmill':
      return 'finishing';
    case 'chamfer':
      return 'chamfer_milling';
    case 'tap':
      return requestedMode === 'lathe' ? 'threading' : 'drilling';
    case 'reamer':
      return requestedMode === 'lathe' ? 'boring' : 'drilling';
    case 'drill':
      return requestedMode === 'lathe' ? 'boring' : 'drilling';
    case 'roughing-insert':
      return 'turning_rough';
    case 'finishing-insert':
      return 'turning_finish';
    case 'grooving-insert':
      return 'grooving';
    case 'threading-insert':
      return 'threading';
    case 'boring-bar':
      return 'boring';
    case 'live-tool-endmill':
      return /drill/.test(signature) ? 'boring' : 'turning_finish';
    case 'wire':
      return 'wire_profile';
    case 'electrode':
      return 'burn_roughing';
    case 'beam':
      return 'laser_cut';
    case 'stream':
      return 'abrasive_cut';
    default:
      return requestedMode === 'lathe' ? 'turning_finish' : 'roughing';
  }
}

function inferSupportedOperations(kind: CalculatorToolKind, primaryOperation: string, requestedMode: MachineMode): string[] {
  switch (kind) {
    case 'face-mill':
      return ['face_milling'];
    case 'variable-helix-endmill':
      return ['roughing', 'pocket_milling'];
    case 'square-endmill':
      return ['roughing', 'finishing', 'pocket_milling', 'shoulder_milling', 'slot_milling'];
    case 'ball-endmill':
      return ['finishing'];
    case 'chamfer':
      return ['chamfer_milling'];
    case 'tap':
      return requestedMode === 'lathe' ? ['threading', 'boring'] : ['drilling'];
    case 'reamer':
    case 'drill':
      return requestedMode === 'lathe' ? ['boring'] : ['drilling'];
    case 'roughing-insert':
      return ['turning_rough'];
    case 'finishing-insert':
      return ['turning_finish'];
    case 'grooving-insert':
      return ['grooving'];
    case 'threading-insert':
      return ['threading', 'turning_finish'];
    case 'boring-bar':
      return ['boring'];
    case 'live-tool-endmill':
      return ['turning_finish', 'boring'];
    case 'wire':
      return ['wire_profile', 'wire_skims'];
    case 'electrode':
      return ['burn_roughing', 'burn_finishing'];
    case 'beam':
      return ['laser_cut', 'laser_edge'];
    case 'stream':
      return ['abrasive_cut', 'taper_control'];
    default:
      return primaryOperation ? [primaryOperation] : [];
  }
}

function inferToolpathKeywords(kind: CalculatorToolKind, signature: string): string[] {
  const keywords = new Set<string>();
  switch (kind) {
    case 'face-mill':
      keywords.add('face');
      break;
    case 'variable-helix-endmill':
      keywords.add('adaptive');
      keywords.add('dynamic');
      keywords.add('rough');
      keywords.add('pocket');
      break;
    case 'square-endmill':
      keywords.add(/slot/.test(signature) ? 'slot' : 'profile');
      break;
    case 'ball-endmill':
      ['parallel', 'scallop', 'surface', 'flow', 'swarf', 'multiaxis'].forEach((keyword) => keywords.add(keyword));
      break;
    case 'chamfer':
      keywords.add('chamfer');
      break;
    case 'drill':
    case 'tap':
    case 'reamer':
      keywords.add('drill');
      break;
    case 'grooving-insert':
      keywords.add('groove');
      break;
    case 'threading-insert':
      keywords.add('thread');
      break;
    case 'boring-bar':
      keywords.add('bore');
      break;
    case 'live-tool-endmill':
      keywords.add('mill-turn');
      keywords.add('live-tooling');
      break;
    case 'wire':
      keywords.add('wire');
      break;
    case 'electrode':
      keywords.add('burn');
      break;
    case 'beam':
      keywords.add('laser');
      break;
    case 'stream':
      keywords.add('waterjet');
      break;
    default:
      break;
  }
  return [...keywords];
}

function inferEdgePrep(signature: string): ToolCatalogItem['edgePrep'] | undefined {
  if (/wiper/.test(signature)) return 'wiper';
  if (/honed/.test(signature)) return 'honed';
  if (/rough|high feed|negative rake|reinforced/.test(signature)) return 'reinforced';
  if (/sharp|finishing|micro grain/.test(signature)) return 'sharp';
  return undefined;
}

function extractToolMaterialGroups(raw: Record<string, unknown>): string[] {
  const cuttingParams = asRecord(raw.cutting_params);
  return cuttingParams ? Object.keys(cuttingParams).filter(Boolean) : [];
}

function unwrapToolResults(raw: unknown): unknown[] {
  return unwrapCollection(raw, ['tools', 'items', 'results']);
}

function normalizeTool(raw: Record<string, unknown>, requestedMode?: MachineMode): ToolCatalogItem | null {
  const id = readText(raw.id ?? raw.tool_id);
  const label = readText(raw.label ?? raw.name ?? raw.tool_name);
  if (!id || !label) return null;

  const signature = buildToolSignature(raw);
  const kind = inferToolKind(signature, requestedMode);
  if (!toolKindMatchesMode(kind, requestedMode)) return null;

  const explicitMode = normalizeToolMode(readText(raw.mode ?? raw.machine_type).toLowerCase());
  const fallbackMode = explicitMode ?? requestedMode ?? 'mill';
  const mode = inferToolMode(kind, fallbackMode);
  const geometryClass = inferToolGeometryClass(kind);
  const operation = readText(raw.operation ?? raw.primary_operation) || inferToolOperation(kind, signature, mode);
  const supportedOperations = Array.isArray(raw.supportedOperations)
    ? raw.supportedOperations.map(String).filter(Boolean)
    : Array.isArray(raw.supported_operations)
      ? raw.supported_operations.map(String).filter(Boolean)
      : inferSupportedOperations(kind, operation, mode);
  const toolpathKeywords = Array.isArray(raw.toolpathKeywords)
    ? raw.toolpathKeywords.map(String).filter(Boolean)
    : Array.isArray(raw.toolpath_keywords)
      ? raw.toolpath_keywords.map(String).filter(Boolean)
      : inferToolpathKeywords(kind, signature);

  const family = inferToolFamily(kind, signature, raw);
  const coating = readText(raw.coating);
  const diameter = safeNum(
    raw.cutting_diameter_mm
    ?? raw.diameter_mm
    ?? raw.defaultDiameter
    ?? raw.default_diameter
    ?? raw.diameter,
  );
  const flutes = safeNum(raw.flute_count ?? raw.flutes ?? raw.defaultFlutes ?? raw.default_flutes);
  const holder = inferToolHolder(kind, mode, raw, signature);
  const insertGrades = Array.isArray(raw.insert_grades)
    ? raw.insert_grades.map(String).filter(Boolean)
    : [];

  return {
    id,
    mode,
    family,
    label,
    description: readText(raw.description),
    holder,
    coating,
    defaultDiameter: diameter || 1,
    defaultFlutes: flutes || 1,
    operation,
    vendor: readText(raw.vendor ?? raw.manufacturer) || undefined,
    catalogNumber: readText(raw.catalog_number ?? raw.catalogNumber) || undefined,
    priceUsd: safeNum(raw.price_usd ?? raw.priceUsd) || undefined,
    confidence: safeNum(raw.confidence) || undefined,
    source: 'database',
    materialGroupIds: extractToolMaterialGroups(raw),
    coolantThrough: typeof raw.coolant_through === 'boolean' ? Boolean(raw.coolant_through) : undefined,
    centerCutting: typeof raw.center_cutting === 'boolean' ? Boolean(raw.center_cutting) : undefined,
    variableHelix: typeof raw.variable_helix === 'boolean' ? Boolean(raw.variable_helix) : undefined,
    requiresLiveTooling: mode === 'lathe' && kind === 'live-tool-endmill',
    bodyType: inferToolBodyType(raw, kind, signature),
    insertType: readText(raw.insert_type) || undefined,
    insertCount: safeNum(raw.insert_count) || undefined,
    insertGrades: insertGrades.length ? insertGrades : undefined,
    insertPriceUsd: safeNum(raw.insert_price_usd ?? raw.insertPriceUsd) || undefined,
    holderInterface: readText(raw.holder_interface ?? raw.arbor_type) || undefined,
    maxApMm: safeNum(raw.max_ap_mm ?? raw.maxApMm) || undefined,
    rampingCapable: typeof raw.ramping_capable === 'boolean' ? Boolean(raw.ramping_capable) : undefined,
    plungeCapable: typeof raw.plunge_capable === 'boolean' ? Boolean(raw.plunge_capable) : undefined,
    maxRpm: safeNum(raw.max_rpm ?? raw.maxRpm) || undefined,
    supportedOperations,
    toolpathKeywords,
    toolMaterialClass: inferToolMaterialClass(signature, raw),
    geometryClass,
    edgePrep: inferEdgePrep(signature),
    cornerRadiusMm: safeNum(raw.corner_radius_mm ?? raw.cornerRadiusMm) || undefined,
    noseRadiusMm: safeNum(raw.nose_radius_mm ?? raw.noseRadiusMm) || undefined,
    leadAngleDeg: safeNum(raw.lead_angle_deg ?? raw.leadAngleDeg) || (kind === 'face-mill' ? 45 : undefined),
    helixAngleDeg: safeNum(raw.helix_angle_deg ?? raw.helixAngleDeg) || undefined,
    wiperGeometry: /wiper/.test(signature) || Boolean(raw.wiper_geometry ?? raw.wiperGeometry),
    fluteLengthMm: safeNum(raw.flute_length_mm ?? raw.fluteLengthMm) || undefined,
    overallLengthMm: safeNum(raw.overall_length_mm ?? raw.overallLengthMm) || undefined,
    shankDiameterMm: safeNum(raw.shank_diameter_mm ?? raw.shankDiameterMm) || undefined,
  };
}

async function fetchAllLiveToolRows(): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  for (let page = 0; page < TOOL_MAX_PAGES; page += 1) {
    const raw = await dataRequest<unknown>('/tool/search', 'POST', {
      query: '*',
      limit: TOOL_PAGE_SIZE,
      offset,
    });

    const batch = unwrapToolResults(raw)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));

    if (batch.length === 0) {
      break;
    }

    rows.push(...batch);

    const envelope = asRecord(raw);
    const total = safeNum(envelope?.total, Number.NaN);
    offset += batch.length;

    const hasMore = Boolean(envelope?.hasMore)
      || (Number.isFinite(total) && offset < total);

    if (!hasMore) {
      break;
    }
  }

  return rows;
}

async function fetchLiveToolRows(): Promise<Record<string, unknown>[]> {
  if (!shouldCacheCalculatorData()) {
    return fetchAllLiveToolRows();
  }

  if (!toolCatalogRowsPromise) {
    toolCatalogRowsPromise = fetchAllLiveToolRows().catch((error) => {
      toolCatalogRowsPromise = null;
      throw error;
    });
  }

  return toolCatalogRowsPromise;
}

function mergeToolCatalogItem(base: ToolCatalogItem | undefined, incoming: ToolCatalogItem): ToolCatalogItem {
  if (!base) return incoming;
  return {
    ...base,
    ...incoming,
    family: incoming.family || base.family,
    description: incoming.description || base.description,
    holder: incoming.holder || base.holder,
    coating: incoming.coating || base.coating,
    defaultDiameter: incoming.defaultDiameter || base.defaultDiameter,
    defaultFlutes: incoming.defaultFlutes || base.defaultFlutes,
    vendor: incoming.vendor || base.vendor,
    catalogNumber: incoming.catalogNumber || base.catalogNumber,
    priceUsd: incoming.priceUsd ?? base.priceUsd,
    confidence: incoming.confidence ?? base.confidence,
    source: incoming.source ?? base.source,
    materialGroupIds: incoming.materialGroupIds?.length ? incoming.materialGroupIds : base.materialGroupIds,
    coolantThrough: incoming.coolantThrough ?? base.coolantThrough,
    centerCutting: incoming.centerCutting ?? base.centerCutting,
    variableHelix: incoming.variableHelix ?? base.variableHelix,
    requiresLiveTooling: incoming.requiresLiveTooling ?? base.requiresLiveTooling,
    bodyType: incoming.bodyType ?? base.bodyType,
    insertType: incoming.insertType ?? base.insertType,
    insertCount: incoming.insertCount ?? base.insertCount,
    insertGrades: incoming.insertGrades?.length ? incoming.insertGrades : base.insertGrades,
    insertPriceUsd: incoming.insertPriceUsd ?? base.insertPriceUsd,
    holderInterface: incoming.holderInterface ?? base.holderInterface,
    maxApMm: incoming.maxApMm ?? base.maxApMm,
    rampingCapable: incoming.rampingCapable ?? base.rampingCapable,
    plungeCapable: incoming.plungeCapable ?? base.plungeCapable,
    maxRpm: incoming.maxRpm ?? base.maxRpm,
    operation: incoming.operation || base.operation,
    supportedOperations: incoming.supportedOperations?.length ? incoming.supportedOperations : base.supportedOperations,
    toolpathKeywords: incoming.toolpathKeywords?.length ? incoming.toolpathKeywords : base.toolpathKeywords,
    toolMaterialClass: incoming.toolMaterialClass ?? base.toolMaterialClass,
    geometryClass: incoming.geometryClass ?? base.geometryClass,
    edgePrep: incoming.edgePrep ?? base.edgePrep,
    cornerRadiusMm: incoming.cornerRadiusMm ?? base.cornerRadiusMm,
    noseRadiusMm: incoming.noseRadiusMm ?? base.noseRadiusMm,
    leadAngleDeg: incoming.leadAngleDeg ?? base.leadAngleDeg,
    helixAngleDeg: incoming.helixAngleDeg ?? base.helixAngleDeg,
    wiperGeometry: incoming.wiperGeometry ?? base.wiperGeometry,
    fluteLengthMm: incoming.fluteLengthMm ?? base.fluteLengthMm,
    overallLengthMm: incoming.overallLengthMm ?? base.overallLengthMm,
    shankDiameterMm: incoming.shankDiameterMm ?? base.shankDiameterMm,
  };
}

function mergeToolCatalog(items: ToolCatalogItem[], mode?: MachineMode): ToolCatalogItem[] {
  const staticSlice = mode ? TOOL_CATALOG.filter((item) => item.mode === mode) : TOOL_CATALOG;
  const map = new Map(staticSlice.map((item) => [item.id, item]));
  for (const item of items) {
    if (mode && item.mode !== mode) continue;
    map.set(item.id, mergeToolCatalogItem(map.get(item.id), item));
  }
  return Array.from(map.values());
}

export async function fetchToolCatalog(mode?: MachineMode): Promise<ToolCatalogItem[]> {
  return (await fetchToolCatalogState(mode)).items;
}

export async function fetchToolCatalogState(
  mode?: MachineMode,
): Promise<CalculatorCatalogLoadState<ToolCatalogItem>> {
  const fallbackItems = mergeToolCatalog([], mode);

  const load = async (requestedMode?: MachineMode) => {
    if (!requestedMode) {
      return {
        items: mergeToolCatalog([], requestedMode),
        source: 'fallback' as CalculatorCatalogSourceState,
        liveCount: 0,
        fallbackCount: mergeToolCatalog([], requestedMode).length,
        note: 'Select a machine mode to load the full live-compatible tool catalog slice.',
        sampled: false,
      };
    }

    const rows = await fetchLiveToolRows();
    const normalized = rows
      .map((entry) => normalizeTool(entry, requestedMode))
      .filter((entry): entry is ToolCatalogItem => Boolean(entry));
    const mergedItems = normalized.length > 0 ? mergeToolCatalog(normalized, requestedMode) : mergeToolCatalog([], requestedMode);
    const liveIds = new Set(normalized.map((item) => item.id));
    const fallbackCount = mergedItems.filter((item) => !liveIds.has(item.id)).length;

    if (normalized.length === 0) {
      return {
        items: mergedItems,
        source: mergedItems.length ? 'fallback' : 'empty',
        liveCount: 0,
        fallbackCount: mergedItems.length,
        note: mergedItems.length
          ? 'Live tool search returned no compatible rows, so the curated fallback tool catalog is active.'
          : 'No tools were available for this machine slice.',
        sampled: false,
      };
    }

    return {
      items: mergedItems,
      source: fallbackCount > 0 ? 'hybrid' : 'live',
      liveCount: normalized.length,
      fallbackCount,
      note: fallbackCount > 0
        ? 'Live tool database is merged with curated fallback tools so the tool universe stays complete for this slice.'
        : 'Live tool database is active for this machine slice.',
      sampled: false,
    };
  };

  try {
    if (!shouldCacheCalculatorData()) {
      return await load(mode);
    }

    if (!mode) {
      return await load(mode);
    }

    const cached = toolCatalogPromiseCache.get(mode);
    if (cached) {
      return await cached;
    }

    const promise = load(mode).catch((error) => {
      toolCatalogPromiseCache.delete(mode);
      throw error;
    });
    toolCatalogPromiseCache.set(mode, promise);
    return await promise;
  } catch {
    toolCatalogRowsPromise = null;
    return {
      items: fallbackItems,
      source: fallbackItems.length ? 'fallback' : 'empty',
      liveCount: 0,
      fallbackCount: fallbackItems.length,
      note: fallbackItems.length
        ? 'Tool search is unavailable, so the curated fallback tool catalog is active.'
        : 'No tools were available for this machine slice.',
      sampled: false,
    };
  }
}

export interface HolderPackageOption extends SelectionOption {
  mode: MachineMode;
  brandId: string;
  brandLabel?: string;
  holderStyleId?: string;
  holderStyleIds?: string[];
  holderType?: string;
  holderSubcategory?: string;
  spindleInterface?: string;
  toolId?: string;
  toolInterface?: string;
  compatibleLayoutKinds?: Array<NonNullable<MachineCatalogItem['toolingLayout']>['kind']>;
  compatibleSpindleConnectionTypeIds?: string[];
  compatibleTurretTypeIds?: string[];
  requiresLiveTooling?: boolean;
  requiresMillingHead?: boolean;
  minTurretCount?: number;
  maxTurretCount?: number;
  coolantThrough?: boolean;
  maxRpm?: number;
  source?: 'database' | 'fallback';
}

export interface ToolHolderCatalogRequest {
  mode: MachineMode;
  layoutKind?: NonNullable<MachineCatalogItem['toolingLayout']>['kind'];
  spindleConnectionTypeId?: string;
  turretTypeId?: string;
  liveTooling?: boolean;
  hasMillingHead?: boolean;
  turretCount?: number;
  toolId?: string;
  toolOperation?: string;
  toolGeometryClass?: ToolCatalogItem['geometryClass'];
  limit?: number;
}

function buildHolderCatalogCacheKey(input: ToolHolderCatalogRequest): string {
  return JSON.stringify({
    mode: input.mode,
    layoutKind: input.layoutKind ?? '',
    spindleConnectionTypeId: input.spindleConnectionTypeId ?? '',
    turretTypeId: input.turretTypeId ?? '',
    liveTooling: Boolean(input.liveTooling),
    hasMillingHead: Boolean(input.hasMillingHead),
    turretCount: input.turretCount ?? 0,
    toolId: input.toolId ?? '',
    toolOperation: input.toolOperation ?? '',
    toolGeometryClass: input.toolGeometryClass ?? '',
    limit: input.limit ?? 0,
  });
}

function normalizeHolderPackage(entry: unknown): HolderPackageOption | null {
  const record = asRecord(entry);
  if (!record) return null;

  const id = readText(record.id);
  const label = readText(record.label);
  const detail = readText(record.detail);
  const modeRaw = readText(record.mode).toLowerCase();
  const mode = (['mill', 'lathe', 'edm', 'wire_edm', 'laser', 'waterjet'] as const).includes(modeRaw as MachineMode)
    ? (modeRaw as MachineMode)
    : null;
  const brandId = readText(record.brandId ?? record.brand_id);

  if (!id || !label || !detail || !mode || !brandId) {
    return null;
  }

  const holderStyleIds = Array.isArray(record.holderStyleIds)
    ? record.holderStyleIds.map(String).filter(Boolean)
    : Array.isArray(record.holder_style_ids)
      ? record.holder_style_ids.map(String).filter(Boolean)
      : [];
  const preferredHolderStyleId =
    readText(record.holderStyleId ?? record.holder_style_id)
    || holderStyleIds.find((styleId) => styleId !== 'machine-standard')
    || holderStyleIds[0]
    || 'machine-standard';

  return {
    id,
    label,
    detail,
    mode,
    brandId,
    brandLabel: readText(record.brandLabel ?? record.brand_label) || undefined,
    holderStyleId: preferredHolderStyleId,
    holderStyleIds,
    holderType: readText(record.holderType ?? record.holder_type) || undefined,
    holderSubcategory: readText(record.holderSubcategory ?? record.holder_subcategory) || undefined,
    spindleInterface: readText(record.spindleInterface ?? record.spindle_interface) || undefined,
    toolId: readText(record.toolId ?? record.tool_id) || undefined,
    toolInterface: readText(record.toolInterface ?? record.tool_interface) || undefined,
    compatibleLayoutKinds: Array.isArray(record.compatibleLayoutKinds)
      ? record.compatibleLayoutKinds.map(String).filter(Boolean) as Array<NonNullable<MachineCatalogItem['toolingLayout']>['kind']>
      : Array.isArray(record.compatible_layout_kinds)
        ? record.compatible_layout_kinds.map(String).filter(Boolean) as Array<NonNullable<MachineCatalogItem['toolingLayout']>['kind']>
        : undefined,
    compatibleSpindleConnectionTypeIds: Array.isArray(record.compatibleSpindleConnectionTypeIds)
      ? record.compatibleSpindleConnectionTypeIds.map(String).filter(Boolean)
      : Array.isArray(record.compatible_spindle_connection_type_ids)
        ? record.compatible_spindle_connection_type_ids.map(String).filter(Boolean)
        : undefined,
    compatibleTurretTypeIds: Array.isArray(record.compatibleTurretTypeIds)
      ? record.compatibleTurretTypeIds.map(String).filter(Boolean)
      : Array.isArray(record.compatible_turret_type_ids)
        ? record.compatible_turret_type_ids.map(String).filter(Boolean)
        : undefined,
    requiresLiveTooling: Boolean(record.requiresLiveTooling ?? record.requires_live_tooling),
    requiresMillingHead: Boolean(record.requiresMillingHead ?? record.requires_milling_head),
    minTurretCount: safeNum(record.minTurretCount ?? record.min_turret_count) || undefined,
    maxTurretCount: safeNum(record.maxTurretCount ?? record.max_turret_count) || undefined,
    coolantThrough: typeof (record.coolantThrough ?? record.coolant_through) === 'boolean'
      ? Boolean(record.coolantThrough ?? record.coolant_through)
      : undefined,
    maxRpm: safeNum(record.maxRpm ?? record.max_rpm) || undefined,
    source: readText(record.source) === 'database' ? 'database' : 'fallback',
  };
}

export async function fetchToolHolderCatalog(
  input: ToolHolderCatalogRequest,
  fallbackItems: HolderPackageOption[] = [],
): Promise<HolderPackageOption[]> {
  return (await fetchToolHolderCatalogState(input, fallbackItems)).items;
}

export async function fetchToolHolderCatalogState(
  input: ToolHolderCatalogRequest,
  fallbackItems: HolderPackageOption[] = [],
): Promise<CalculatorCatalogLoadState<HolderPackageOption>> {
  const normalizedFallbackItems = fallbackItems
    .filter((item) => item.mode === input.mode)
    .map((item) => ({
      ...item,
      source: 'fallback' as const,
    }));

  const load = async () => {
    const raw = await dataRequest<unknown>('/holder/catalog', 'POST', input).catch(() => null);
    if (!raw) {
      return {
        items: normalizedFallbackItems,
        source: normalizedFallbackItems.length ? 'fallback' as CalculatorCatalogSourceState : 'empty' as CalculatorCatalogSourceState,
        liveCount: 0,
        fallbackCount: normalizedFallbackItems.length,
        note: normalizedFallbackItems.length
          ? 'Live holder database is unavailable, so the curated holder fallback is active.'
          : 'No holder packages were available for this machine slice.',
        sampled: false,
      };
    }
    const liveItems = unwrapCollection(raw, ['holders', 'items', 'results'])
      .map(normalizeHolderPackage)
      .filter((item): item is HolderPackageOption => Boolean(item))
      .filter((item) => item.mode === input.mode);

    if (liveItems.length === 0) {
      return {
        items: normalizedFallbackItems,
        source: normalizedFallbackItems.length ? 'fallback' as CalculatorCatalogSourceState : 'empty' as CalculatorCatalogSourceState,
        liveCount: 0,
        fallbackCount: normalizedFallbackItems.length,
        note: normalizedFallbackItems.length
          ? 'Live holder database returned no compatible packages, so the curated holder fallback is active.'
          : 'No holder packages were available for this machine slice.',
        sampled: false,
      };
    }

    const merged = new Map<string, HolderPackageOption>(
      normalizedFallbackItems.map((item) => [item.id, item]),
    );
    for (const item of liveItems) {
      merged.set(item.id, item);
    }
    const mergedItems = Array.from(merged.values());
    const liveIds = new Set(liveItems.map((item) => item.id));
    const fallbackCount = mergedItems.filter((item) => !liveIds.has(item.id)).length;

    return {
      items: mergedItems,
      source: fallbackCount > 0 ? 'hybrid' : 'live',
      liveCount: liveItems.length,
      fallbackCount,
      note: fallbackCount > 0
        ? 'Live holder database is merged with the curated holder fallback so compatible packages stay populated.'
        : 'Live holder database is active for this machine slice.',
      sampled: false,
    };
  };

  try {
    if (!shouldCacheCalculatorData()) {
      return await load();
    }

    const key = buildHolderCatalogCacheKey(input);
    const cached = holderCatalogPromiseCache.get(key);
    if (cached) {
      return await cached;
    }

    const promise = load().catch((error) => {
      holderCatalogPromiseCache.delete(key);
      throw error;
    });
    holderCatalogPromiseCache.set(key, promise);
    return await promise;
  } catch {
    return {
      items: normalizedFallbackItems,
      source: normalizedFallbackItems.length ? 'fallback' : 'empty',
      liveCount: 0,
      fallbackCount: normalizedFallbackItems.length,
      note: normalizedFallbackItems.length
        ? 'Holder catalog failed, so the curated holder fallback is active.'
        : 'No holder packages were available for this machine slice.',
      sampled: false,
    };
  }
}
