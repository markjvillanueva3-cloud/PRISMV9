import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  fetchMachineCatalog,
  fetchMaterialCatalog,
  fetchToolCatalog,
  fetchToolHolderCatalog,
} from '../web/src/api/calculatorData.ts';
import { sfQuick } from '../web/src/api/speedfeed.ts';
import {
  COOLANT_OPTIONS,
  PROGRAMMING_ENVIRONMENTS,
  STOCK_SHAPES,
  WORKHOLDING_OPTIONS,
} from '../web/src/data/calculatorWorkspace.ts';
import {
  buildCalculatorSpeedFeedParams,
  normalizeCalculatorSpeedFeedResult,
} from '../web/src/utils/calculatorSpeedFeedContract.ts';
import {
  buildCuttingParameterOptimization,
  deriveToolReachDefaults,
} from '../web/src/utils/calculatorParameterOptimization.ts';
import { buildCalculatorPrismModePlan } from '../web/src/utils/calculatorPrismMode.ts';
import { buildCalculatorSetupPreview } from '../web/src/utils/calculatorSetupPreview.ts';
import { desiredRaForFinishTarget, getSurfaceFinishPreview } from '../web/src/utils/calculatorSurfaceFinish.ts';
import { buildInsertOptionsForTool, selectPreferredToolForToolpath, toolSupportsToolpath } from '../web/src/utils/calculatorTooling.ts';
import { resolveMachineConfigurationOptions, resolveMachineSelectionOptions } from '../web/src/utils/machineConfigurationOptions.ts';
import { classifyToolpathType, filterToolpathsForLicense, getToolpathDefaults, licenseOptionsFor } from '../web/src/pages/CalculatorPage.tsx';

type AuditMode = 'mill' | 'lathe';

const DEFAULT_CASE_COUNT = 10_000;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_MATERIAL_GROUPS = ['steel', 'tool_steel', 'stainless', 'aluminum', 'titanium', 'superalloy', 'exotic_alloy'];
const DEFAULT_MODES: AuditMode[] = ['mill', 'lathe'];
const TOOL_STEEL_GRADE_HINTS = ['h13', 'h11', 'a2', 'd2', 's7', 'o1', 'o2', 'm2', 'm4', 'p20', 'dc53', 'skd11', '1.2344', '1.2363'];
const MODE_STOCK_SHAPES: Record<AuditMode, string[]> = { mill: ['plate', 'round', 'tube'], lathe: ['round', 'tube'] };
const MODE_WORKHOLDING_IDS: Record<AuditMode, string[]> = {
  mill: ['vise-soft-jaw', 'fixture-plate', 'rotary-trunnion', 'collet-chuck'],
  lathe: ['collet-chuck', 'three-jaw-chuck', 'soft-jaw-chuck', 'between-centers', 'steady-rest', 'sub-spindle-support'],
};
const MODE_STABILITY_IDS: Record<AuditMode, string[]> = { mill: ['production-stable', 'aggressive-rigid', 'detail-control', 'index-ready'], lathe: ['production-stable', 'aggressive-rigid', 'detail-control'] };

function normalizeAuditTurretTypeId(value: string | undefined): string {
  const normalized = (value ?? '').trim().toLowerCase();
  if (/vdi\s*-?\s*20/.test(normalized)) return 'vdi20';
  if (/vdi\s*-?\s*25/.test(normalized)) return 'vdi25';
  if (/vdi\s*-?\s*30/.test(normalized)) return 'vdi30';
  if (/vdi\s*-?\s*40/.test(normalized)) return 'vdi40';
  if (/vdi\s*-?\s*50/.test(normalized)) return 'vdi50';
  if (/vdi\s*-?\s*60/.test(normalized)) return 'vdi60';
  if (/vdi\s*-?\s*80/.test(normalized)) return 'vdi80';
  if (/bmt\s*-?\s*45/.test(normalized)) return 'bmt45';
  if (/bmt\s*-?\s*55/.test(normalized)) return 'bmt55';
  if (/bmt\s*-?\s*65/.test(normalized)) return 'bmt65';
  if (/dual[\s_-]*bmt|\bbmt\b/.test(normalized)) return 'bmt-standard';
  if (/wedge|disc|bot/.test(normalized)) return 'turret-standard';
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeAuditSpindleInterfaceId(value: string | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();
  if (/(cat\s*40).*?(big\+|big plus)|(big\+|big plus).*?(cat\s*40)/i.test(normalized)) return 'cat40-big-plus';
  if (/cat\s*40/i.test(normalized)) return 'cat40';
  if (/cat\s*50/i.test(normalized)) return 'cat50';
  if (/bt\s*30/i.test(normalized)) return 'bt30';
  if (/bt\s*40/i.test(normalized)) return 'bt40';
  if (/bt\s*50/i.test(normalized)) return 'bt50';
  if (/hsk[\s_-]*a\s*63/i.test(normalized)) return 'hsk-a63';
  if (/hsk[\s_-]*e\s*25/i.test(normalized)) return 'hsk-e25';
  if (/hsk[\s_-]*e\s*32/i.test(normalized)) return 'hsk-e32';
  if (/sk\s*40/i.test(normalized)) return 'sk40';
  if (/sk\s*50/i.test(normalized)) return 'sk50';
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function isBmtTurningFallbackCandidate(tool: any) {
  const geometry = String(tool?.geometryClass ?? '').toLowerCase();
  const operation = String(tool?.operation ?? '').toLowerCase();
  const signature = `${tool?.id ?? ''} ${tool?.label ?? ''} ${tool?.description ?? ''}`.toLowerCase();
  return (
    geometry === 'roughing-insert'
    || geometry === 'finishing-insert'
    || geometry === 'grooving-insert'
    || geometry === 'threading-insert'
    || geometry === 'boring-bar'
    || operation.startsWith('turn')
    || operation === 'grooving'
    || operation === 'boring'
    || signature.includes('bore')
  );
}

function isTurretStandardLiveToolFallbackCandidate(tool: any) {
  const geometry = String(tool?.geometryClass ?? '').toLowerCase();
  const operation = String(tool?.operation ?? '').toLowerCase();
  const signature = `${tool?.id ?? ''} ${tool?.label ?? ''} ${tool?.description ?? ''}`.toLowerCase();
  return (
    geometry === 'drill'
    || geometry === 'tap'
    || geometry === 'reamer'
    || geometry === 'live-tool-endmill'
    || operation === 'drilling'
    || operation === 'boring'
    || operation === 'milling'
    || signature.includes('turn-drill')
    || signature.includes('live tool')
    || signature.includes('milling head')
  );
}

function isMillDrillFallbackCandidate(tool: any) {
  const geometry = String(tool?.geometryClass ?? '').toLowerCase();
  const operation = String(tool?.operation ?? '').toLowerCase();
  return geometry === 'drill' || geometry === 'tap' || geometry === 'reamer' || operation === 'drilling';
}

function isMillBoringFallbackCandidate(tool: any) {
  const geometry = String(tool?.geometryClass ?? '').toLowerCase();
  const signature = `${tool?.id ?? ''} ${tool?.label ?? ''}`.toLowerCase();
  return geometry === 'boring-bar' || signature.includes('bore');
}

function isMillFaceFallbackCandidate(tool: any) {
  const geometry = String(tool?.geometryClass ?? '').toLowerCase();
  const signature = `${tool?.id ?? ''} ${tool?.label ?? ''}`.toLowerCase();
  return geometry === 'face-mill' || signature.includes('face');
}

function buildAuditMillHolderFallbacks(machine: any, tool: any) {
  const spindleConnectionTypeId = normalizeAuditSpindleInterfaceId(
    machine?.toolingLayout?.spindleConnectionTypeId
    ?? machine?.toolingLayout?.interfaceId
    ?? machine?.toolingLayout?.interface,
  );
  if (!spindleConnectionTypeId) return [];
  const interfaceLabel = machine?.toolingLayout?.spindleConnectionLabel
    ?? machine?.toolingLayout?.interface
    ?? spindleConnectionTypeId.toUpperCase();

  if (isMillFaceFallbackCandidate(tool)) {
    return [{
      id: `generic-${spindleConnectionTypeId}-face-arbor`,
      label: `${interfaceLabel} shell mill arbor`,
      detail: `Fallback face-mill arbor package for ${interfaceLabel} magazines when the live holder registry omits the interface family.`,
      mode: 'mill',
      brandId: 'generic',
      brandLabel: 'Generic',
      holderStyleId: 'machine-standard',
      holderStyleIds: ['machine-standard'],
      compatibleLayoutKinds: ['magazine'],
      compatibleSpindleConnectionTypeIds: [spindleConnectionTypeId],
      source: 'fallback',
    }];
  }

  if (isMillDrillFallbackCandidate(tool)) {
    return [{
      id: `generic-${spindleConnectionTypeId}-drill-chuck`,
      label: `${interfaceLabel} hydraulic drill chuck`,
      detail: `Fallback drill / tap holder package for ${interfaceLabel} spindle interfaces when the live holder registry omits the interface family.`,
      mode: 'mill',
      brandId: 'generic',
      brandLabel: 'Generic',
      holderStyleId: 'hydraulic',
      holderStyleIds: ['machine-standard', 'hydraulic'],
      compatibleLayoutKinds: ['magazine'],
      compatibleSpindleConnectionTypeIds: [spindleConnectionTypeId],
      source: 'fallback',
    }];
  }

  if (isMillBoringFallbackCandidate(tool)) {
    return [{
      id: `generic-${spindleConnectionTypeId}-boring`,
      label: `${interfaceLabel} boring head adapter`,
      detail: `Fallback boring package for ${interfaceLabel} spindle interfaces when the live holder registry omits the interface family.`,
      mode: 'mill',
      brandId: 'generic',
      brandLabel: 'Generic',
      holderStyleId: 'machine-standard',
      holderStyleIds: ['machine-standard'],
      compatibleLayoutKinds: ['magazine'],
      compatibleSpindleConnectionTypeIds: [spindleConnectionTypeId],
      source: 'fallback',
    }];
  }

  return [{
    id: `generic-${spindleConnectionTypeId}-endmill`,
    label: `${interfaceLabel} hydraulic endmill chuck`,
    detail: `Fallback endmill holder package for ${interfaceLabel} spindle interfaces when the live holder registry omits the interface family.`,
    mode: 'mill',
    brandId: 'generic',
    brandLabel: 'Generic',
    holderStyleId: 'hydraulic',
    holderStyleIds: ['machine-standard', 'hydraulic'],
    compatibleLayoutKinds: ['magazine'],
    compatibleSpindleConnectionTypeIds: [spindleConnectionTypeId],
    source: 'fallback',
  }];
}

function buildAuditHolderFallbacks(mode: AuditMode, machine: any, tool: any) {
  if (mode === 'mill') {
    return buildAuditMillHolderFallbacks(machine, tool);
  }
  const turretTypeId = normalizeAuditTurretTypeId(machine?.toolingLayout?.turretTypeId);
  const interfaceLabel = machine?.toolingLayout?.turretTypeLabel
    ?? machine?.toolingLayout?.interface
    ?? 'Turret standard';
  const layoutKind = machine?.toolingLayout?.kind;
  const hasMillingHead = Boolean(machine?.toolingLayout?.hasMillingHead);
  const liveTooling = Boolean(machine?.toolingLayout?.liveTooling);

  if ((layoutKind === 'gang' || turretTypeId === 'gang-tooling') && isTurretStandardLiveToolFallbackCandidate(tool) && liveTooling) {
    return [
      {
        id: 'generic-swiss-live-tool',
        label: 'Swiss live-tool spindle package',
        detail: 'Fallback live-tool package for Swiss gang tooling when the live holder registry omits the live spindle interface.',
        mode: 'lathe',
        brandId: 'generic',
        brandLabel: 'Generic',
        holderStyleId: 'live-tooling',
        holderStyleIds: ['machine-standard', 'live-tooling'],
        compatibleLayoutKinds: ['gang'],
        compatibleTurretTypeIds: ['gang-tooling'],
        requiresLiveTooling: true,
        source: 'fallback',
      },
    ];
  }

  if (layoutKind === 'gang' || turretTypeId === 'gang-tooling') {
    return [
      {
        id: 'generic-swiss-turning',
        label: 'Swiss gang turning block',
        detail: 'Fallback turning block for Swiss gang tooling when the live holder registry omits the gang holder family.',
        mode: 'lathe',
        brandId: 'generic',
        brandLabel: 'Generic',
        holderStyleId: 'machine-standard',
        holderStyleIds: ['machine-standard'],
        compatibleLayoutKinds: ['gang'],
        compatibleTurretTypeIds: ['gang-tooling'],
        source: 'fallback',
      },
    ];
  }

  if (['capto-c3', 'capto-c4', 'capto-c5', 'capto-c6', 'capto-c8', 'psc32', 'psc40', 'psc50', 'psc63', 'psc80', 'hsk-t63', 'hsk-t80', 'hsk-t100'].includes(turretTypeId) || hasMillingHead) {
    if (isTurretStandardLiveToolFallbackCandidate(tool)) {
      return [
        {
          id: `generic-${turretTypeId || 'milling-head'}-live`,
          label: `${interfaceLabel} live milling head`,
          detail: `Fallback live-tool milling-head package for ${interfaceLabel} multitask machines when the live holder registry omits the driven interface.`,
          mode: 'lathe',
          brandId: 'generic',
          brandLabel: 'Generic',
          holderStyleId: 'milling-head',
          holderStyleIds: ['machine-standard', 'live-tooling', 'milling-head'],
          compatibleLayoutKinds: ['turret'],
          compatibleTurretTypeIds: turretTypeId ? [turretTypeId] : undefined,
          requiresLiveTooling: true,
          requiresMillingHead: true,
          source: 'fallback',
        },
      ];
    }
    return [
      {
        id: `generic-${turretTypeId || 'milling-head'}-turn`,
        label: `${interfaceLabel} multitask turning block`,
        detail: `Fallback turning package for ${interfaceLabel} multitask machines when the live holder registry omits the turning block family.`,
        mode: 'lathe',
        brandId: 'generic',
        brandLabel: 'Generic',
        holderStyleId: 'machine-standard',
        holderStyleIds: ['machine-standard', 'milling-head'],
        compatibleLayoutKinds: ['turret'],
        compatibleTurretTypeIds: turretTypeId ? [turretTypeId] : undefined,
        source: 'fallback',
      },
    ];
  }

  if (mode !== 'lathe' || !['bmt45', 'bmt55', 'bmt65', 'bmt-standard'].includes(turretTypeId) || !isBmtTurningFallbackCandidate(tool)) {
    if (mode !== 'lathe' || !['turret-standard', 'bot', ''].includes(turretTypeId)) {
      if (['vdi20', 'vdi25', 'vdi30', 'vdi40', 'vdi50', 'vdi60', 'vdi80'].includes(turretTypeId)) {
        if (isTurretStandardLiveToolFallbackCandidate(tool) && liveTooling) {
          return [
            {
              id: `generic-${turretTypeId}-live-tool`,
              label: `${interfaceLabel} live-tool holder`,
              detail: `Fallback driven-tool package for ${interfaceLabel} turrets when the live holder registry omits the live-tool family.`,
              mode: 'lathe',
              brandId: 'generic',
              brandLabel: 'Generic',
              holderStyleId: 'live-tooling',
              holderStyleIds: ['machine-standard', 'live-tooling'],
              compatibleLayoutKinds: ['turret'],
              compatibleTurretTypeIds: [turretTypeId],
              requiresLiveTooling: true,
              source: 'fallback',
            },
          ];
        }
        return [
          {
            id: `generic-${turretTypeId}-turning`,
            label: `${interfaceLabel} turning holder block`,
            detail: `Fallback turning holder package for ${interfaceLabel} turrets when the live holder registry omits the OD / boring family.`,
            mode: 'lathe',
            brandId: 'generic',
            brandLabel: 'Generic',
            holderStyleId: 'rigid-turning',
            holderStyleIds: ['machine-standard', 'rigid-turning'],
            compatibleLayoutKinds: ['turret'],
            compatibleTurretTypeIds: [turretTypeId],
            source: 'fallback',
          },
        ];
      }
      return [];
    }
    if (hasMillingHead && isTurretStandardLiveToolFallbackCandidate(tool)) {
      return [
        {
          id: 'generic-vtl-milling-head',
          label: 'Vertical turn-mill head package',
          detail: 'Fallback live-tool holder package for VTL/VTM milling-head work when the source registry omits the head interface.',
          mode: 'lathe',
          brandId: 'generic',
          brandLabel: 'Generic',
          holderStyleId: 'milling-head',
          holderStyleIds: ['milling-head'],
          compatibleLayoutKinds: ['turret'],
          compatibleTurretTypeIds: ['turret-standard'],
          requiresLiveTooling: true,
          requiresMillingHead: true,
          source: 'fallback',
        },
      ];
    }
    if (isTurretStandardLiveToolFallbackCandidate(tool) && liveTooling) {
      return [
        {
          id: 'generic-turret-live-tool',
          label: 'Turret live-tool package',
          detail: 'Fallback live-tool holder package for standard turrets when the live holder registry omits the driven-tool family.',
          mode: 'lathe',
          brandId: 'generic',
          brandLabel: 'Generic',
          holderStyleId: 'live-tooling',
          holderStyleIds: ['machine-standard', 'live-tooling'],
          compatibleLayoutKinds: ['turret'],
          compatibleTurretTypeIds: ['turret-standard', 'bot'],
          requiresLiveTooling: true,
          source: 'fallback',
        },
      ];
    }
    if (!isBmtTurningFallbackCandidate(tool)) {
      return [];
    }
    return [
      {
        id: 'generic-vtl-turn',
        label: 'Vertical turning ram package',
        detail: 'Fallback turning holder package for VTL/VTM machines when the source registry omits the turning ram interface.',
        mode: 'lathe',
        brandId: 'generic',
        brandLabel: 'Generic',
        holderStyleId: 'machine-standard',
        holderStyleIds: ['machine-standard'],
          compatibleLayoutKinds: ['turret'],
          compatibleTurretTypeIds: ['turret-standard', 'bot'],
          source: 'fallback',
        },
      ];
  }
  return [
    {
      id: `sandvik-${turretTypeId}-turn`,
      label: turretTypeId === 'bmt-standard' ? 'BMT turning package' : 'BMT turning package',
      detail: 'Fallback turning holder package used when the live holder database does not enumerate a static BMT OD block row.',
      mode: 'lathe',
      brandId: 'sandvik',
      brandLabel: 'Sandvik',
      holderStyleId: 'machine-standard',
      holderStyleIds: ['machine-standard'],
      compatibleLayoutKinds: ['turret'],
      compatibleTurretTypeIds: ['bmt45', 'bmt55', 'bmt65', 'bmt-standard'],
      source: 'fallback',
    },
  ];
}

function parseArgs(argv: string[]) {
  const parsed = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const value = argv[i + 1]?.startsWith('--') ? '' : (argv[i + 1] ?? '');
    parsed.set(token.slice(2), value);
    if (value) i += 1;
  }
  const intArg = (name: string, fallback: number, min: number, max: number) => {
    const parsedInt = Number.parseInt(parsed.get(name) ?? '', 10);
    if (!Number.isFinite(parsedInt)) return fallback;
    return Math.max(min, Math.min(max, parsedInt));
  };
  const listArg = (name: string) => (parsed.get(name) ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const requestedModes = listArg('modes').filter((value): value is AuditMode => value === 'mill' || value === 'lathe');
  return {
    count: intArg('count', DEFAULT_CASE_COUNT, 1, 100_000),
    concurrency: intArg('concurrency', DEFAULT_CONCURRENCY, 1, 32),
    shardIndex: intArg('shard-index', 0, 0, 999),
    shardCount: intArg('shard-count', 1, 1, 1_000),
    baseUrl: parsed.get('base-url') || DEFAULT_BASE_URL,
    outDir: parsed.get('outdir') || path.join('H:/PRISM/output/calculator-audit', new Date().toISOString().replace(/[:.]/g, '-')),
    modes: requestedModes.length ? requestedModes : DEFAULT_MODES,
    manufacturers: listArg('manufacturers'),
    materialGroups: listArg('material-groups'),
    materialIds: listArg('material-ids'),
  };
}

function installFetchBase(baseUrl: string) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) return originalFetch(`${baseUrl}${input}`, init);
    if (input instanceof URL && input.pathname.startsWith('/')) return originalFetch(new URL(input.pathname + input.search, baseUrl), init);
    return originalFetch(input as RequestInfo | URL, init);
  }) as typeof globalThis.fetch;
}

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

const stablePick = <T>(items: T[], seed: number) => items[seed % items.length];
const cleanText = (value: unknown) => String(value ?? '').trim().toLowerCase();

function canonicalMaterialKey(material: any) {
  const signature = `${material.id} ${material.name} ${material.subcategoryLabel ?? ''} ${material.conditionLabel ?? ''}`.toLowerCase();
  const hinted = TOOL_STEEL_GRADE_HINTS.find((hint) => signature.includes(hint));
  if (hinted) {
    const condition = cleanText(material.conditionLabel).replace(/[^a-z0-9]+/g, '-');
    return condition ? `${hinted}__${condition}` : hinted;
  }
  return `${cleanText(material.name).replace(/[^a-z0-9]+/g, '-') || material.id}__${cleanText(material.conditionLabel).replace(/[^a-z0-9]+/g, '-')}`;
}

function dedupeMaterials(materials: any[]) {
  const score = (material: any) => Number(Boolean(material.baseSfm)) + Number(Boolean(material.hardness)) + Number(Boolean(material.conditionLabel)) + Number(Boolean(material.idealCoolant)) + Number(TOOL_STEEL_GRADE_HINTS.some((hint) => `${material.id} ${material.name}`.toLowerCase().includes(hint))) * 2;
  const deduped = new Map<string, any>();
  for (const material of materials) {
    const key = canonicalMaterialKey(material);
    const current = deduped.get(key);
    if (!current || score(material) > score(current)) deduped.set(key, material);
  }
  return [...deduped.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function selectAuditMaterials(materials: any[], materialGroups: string[], materialIds: string[]) {
  const activeGroups = materialGroups.length ? materialGroups : DEFAULT_MATERIAL_GROUPS;
  const requestedIds = new Set(materialIds);
  return dedupeMaterials(
    materials.filter((material) => {
      const validBaseline = Number.isFinite(material.baseSfm) && material.baseSfm > 0 && material.idealCoolant.length > 0;
      if (!validBaseline) return false;
      if (requestedIds.size > 0) return requestedIds.has(String(material.id).toLowerCase());
      return activeGroups.includes(String(material.group).toLowerCase());
    }),
  );
}

function selectAuditMachines(machines: any[], manufacturers: string[]) {
  const eligibleMachines = machines.filter((machine) => {
    const signature = [
      machine.id,
      machine.machineTypeId,
      machine.machineTypeLabel,
      machine.family,
      machine.axes,
      machine.envelope,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !/\b(rotary[_ -]?table|floor[_ -]?rotary[_ -]?table|swivel[_ -]?head[_ -]?rotary[_ -]?table|c[_ -]?rotary[_ -]?table)\b/.test(signature);
  });
  if (manufacturers.length === 0) return eligibleMachines;
  const allowed = new Set(manufacturers);
  return eligibleMachines.filter((machine) => allowed.has(String(machine.manufacturer).toLowerCase()));
}

function buildToolpathEntries(mode: AuditMode) {
  const entries: any[] = [];
  for (const programming of PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === mode)) {
    for (const licenseTier of licenseOptionsFor(programming)) {
      for (const toolpath of filterToolpathsForLicense(programming, programming.toolpaths, licenseTier.id)) {
        entries.push({
          mode,
          programmingId: programming.id,
          programmingLabel: programming.label,
          licenseTierId: licenseTier.id,
          toolpath,
          toolpathType: classifyToolpathType(toolpath),
          defaults: getToolpathDefaults(toolpath, mode),
        });
      }
    }
  }
  return entries;
}

function machineSupportsToolpath(mode: AuditMode, machine: any, toolpath: any) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  if (mode === 'mill') {
    if (/swarf|simultaneous|5-axis|5x|multi-axis|variable contour/i.test(signature)) return machine.machineTypeId.includes('_5');
    return true;
  }
  if (/swiss/i.test(signature)) return machine.machineTypeId === 'lathe_swiss';
  if (/live|mill-turn/i.test(signature)) return Boolean(machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead);
  if (/sync/i.test(signature)) return machine.machineTypeId === 'lathe_multitask' || machine.machineTypeId === 'lathe_subspindle' || machine.machineTypeId === 'lathe_swiss';
  return true;
}

function isIndexableTool(tool: any) {
  const signature = `${tool.bodyType ?? ''} ${tool.geometryClass ?? ''} ${tool.family ?? ''} ${tool.label}`.toLowerCase();
  return tool.bodyType === 'indexable' || (tool.insertCount ?? 0) > 0 || /insert|face-mill|face mill|boring bar|roughing-insert|finishing-insert|grooving-insert|threading-insert/.test(signature);
}

function chooseToolForScenario(tools: any[], toolpath: any, token: number) {
  const solid = tools.filter((tool) => !isIndexableTool(tool));
  const indexable = tools.filter((tool) => isIndexableTool(tool));
  const pool = token % 4 === 0 && solid.length ? solid : token % 4 === 1 && indexable.length ? indexable : tools;
  return selectPreferredToolForToolpath(pool, toolpath) ?? selectPreferredToolForToolpath(tools, toolpath) ?? stablePick(pool, token);
}

function chooseCoolantId(available: string[], material: any, token: number) {
  if (!available.length) return 'flood';
  const signature = `${material.idealCoolant} ${material.name}`.toLowerCase();
  const preference = [signature.includes('through') ? 'tsc' : '', signature.includes('air') ? 'through_air' : '', signature.includes('air') ? 'air' : '', signature.includes('mist') ? 'mist' : '', signature.includes('flood') ? 'flood' : ''].filter(Boolean);
  const preferred = preference.find((candidate) => available.includes(candidate));
  return preferred && token % 2 === 0 ? preferred : stablePick(available, token);
}

function buildMachineConfigRefs(machines: any[]) {
  const refs: any[] = [];
  for (const machine of machines) {
    const configs = resolveMachineConfigurationOptions(machine);
    const sourceConfigs = configs.length ? configs : [{ id: `${machine.id}__default`, controllerOptions: machine.controllerOptions, spindleOptions: machine.spindleOptions, controllerCapabilityOptions: machine.controllerCapabilityOptions ?? [], coolantOptionIds: machine.coolantOptionIds }];
    for (const config of sourceConfigs) {
      const controllers = config.controllerOptions.length ? config.controllerOptions : machine.controllerOptions;
      const spindles = config.spindleOptions.length ? config.spindleOptions : machine.spindleOptions;
      for (const controller of controllers) {
        for (const spindle of spindles) {
          const resolved = resolveMachineSelectionOptions(machine, controller.id, spindle.id, machine.mode);
          refs.push({
            key: `${machine.id}__${config.id}__${controller.id}__${spindle.id}`,
            machine,
            configurationId: config.id,
            controllerOption: controller,
            spindleOption: spindle,
            controllerCapabilityOptions: resolved.controllerCapabilityOptions,
            coolantOptionIds: resolved.coolantOptionIds.length ? resolved.coolantOptionIds : machine.coolantOptionIds,
          });
        }
      }
    }
  }
  return refs;
}

function buildAuditUnits(configRefs: any[], materials: any[]) {
  const sortedMaterials = [...materials].sort((left, right) => canonicalMaterialKey(left).localeCompare(canonicalMaterialKey(right)));
  const sortConfigs = (items: any[]) => [...items].sort((left, right) => {
    const leftHash = hashString(left.key);
    const rightHash = hashString(right.key);
    if (leftHash !== rightHash) return leftHash - rightHash;
    return left.key.localeCompare(right.key);
  });
  const millConfigs = sortConfigs(configRefs.filter((config) => config.machine.mode === 'mill'));
  const latheConfigs = sortConfigs(configRefs.filter((config) => config.machine.mode === 'lathe'));
  const otherConfigs = sortConfigs(configRefs.filter((config) => config.machine.mode !== 'mill' && config.machine.mode !== 'lathe'));
  const interleavedConfigs: any[] = [];
  const maxLength = Math.max(millConfigs.length, latheConfigs.length, otherConfigs.length);
  for (let index = 0; index < maxLength; index += 1) {
    if (millConfigs[index]) interleavedConfigs.push(millConfigs[index]);
    if (latheConfigs[index]) interleavedConfigs.push(latheConfigs[index]);
    if (otherConfigs[index]) interleavedConfigs.push(otherConfigs[index]);
  }
  return interleavedConfigs.map((config, index) => ({
    key: config.key,
    config,
    cursor: 0,
    seed: hashString(`${config.key}__${index}`),
    materialOffset: sortedMaterials.length ? hashString(`${config.key}__materials`) % sortedMaterials.length : 0,
  }));
}

function buildCompatibleToolMap(mode: AuditMode, tools: any[], toolpathEntries: any[]) {
  const map = new Map<string, any[]>();
  for (const entry of toolpathEntries) {
    map.set(entry.toolpath.id, tools.filter((tool) => tool.mode === mode && toolSupportsToolpath(tool, entry.toolpath)));
  }
  return map;
}

async function resolveHolderPackages(mode: AuditMode, machine: any, tool: any, cache: Map<string, Promise<any[]>>) {
  const toolingLayout = machine.toolingLayout;
  const key = JSON.stringify({
    mode,
    layoutKind: toolingLayout?.kind ?? '',
    spindleConnectionTypeId: toolingLayout?.spindleConnectionTypeId ?? '',
    turretTypeId: toolingLayout?.turretTypeId ?? '',
    liveTooling: Boolean(toolingLayout?.liveTooling),
    hasMillingHead: Boolean(toolingLayout?.hasMillingHead),
    turretCount: toolingLayout?.turretCount ?? 0,
    toolId: tool.id,
    toolOperation: tool.operation,
    toolGeometryClass: tool.geometryClass,
  });
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = fetchToolHolderCatalog({
    mode,
    layoutKind: toolingLayout?.kind,
    spindleConnectionTypeId: toolingLayout?.spindleConnectionTypeId,
    turretTypeId: toolingLayout?.turretTypeId,
    liveTooling: toolingLayout?.liveTooling,
    hasMillingHead: toolingLayout?.hasMillingHead,
    turretCount: toolingLayout?.turretCount,
    toolId: tool.id,
    toolOperation: tool.operation,
    toolGeometryClass: tool.geometryClass,
    limit: 60,
  }).then((packages) => (packages.length ? packages : buildAuditHolderFallbacks(mode, machine, tool)));
  cache.set(key, promise);
  return promise;
}

function chooseStockShape(mode: AuditMode, token: number) {
  const available = MODE_STOCK_SHAPES[mode].filter((id) => STOCK_SHAPES.some((option) => option.id === id));
  return stablePick(available, token);
}

function chooseWorkholdingId(mode: AuditMode, token: number) {
  const available = MODE_WORKHOLDING_IDS[mode].filter((id) => WORKHOLDING_OPTIONS.some((option) => option.id === id));
  return stablePick(available, token);
}

function chooseStabilityId(mode: AuditMode, token: number) {
  return stablePick(MODE_STABILITY_IDS[mode], token);
}

function isThreadingAuditPath(signature: string) {
  return /thread/.test(signature);
}

function chooseFinishTarget(entry: any, token: number) {
  const signature = `${entry.toolpathType.id} ${entry.toolpath.label} ${entry.toolpath.path}`.toLowerCase();
  if (isThreadingAuditPath(signature)) return token % 3 === 0 ? 'prove-out' : 'general';
  if (/finish|parallel|scallop|flow|swarf|profile/.test(signature)) return token % 2 === 0 ? 'tight-finish' : 'general';
  if (/rough|adaptive|dynamic|pocket|face|slot/.test(signature)) return token % 3 === 0 ? 'high-removal' : 'general';
  return token % 4 === 0 ? 'prove-out' : 'general';
}

function buildStockDimensions(mode: AuditMode, stockShape: string, toolDiameterMm: number, token: number) {
  const scalar = mode === 'lathe' ? 1.2 : 1;
  const x = round(Math.max(toolDiameterMm * (6 + (token % 5) * 1.5) * scalar, mode === 'lathe' ? 24 : 40), 2);
  const y = round(Math.max(toolDiameterMm * (4 + ((token + 2) % 4) * 1.25) * scalar, mode === 'lathe' ? 24 : 28), 2);
  const z = round(Math.max(toolDiameterMm * (stockShape === 'plate' ? 2.4 : stockShape === 'tube' ? 3.2 : 4.8), mode === 'lathe' ? 60 : 22), 2);
  return { x, y, z };
}

async function buildScenario(unit: any, materials: any[], toolpathEntriesByMode: Record<AuditMode, any[]>, toolMapByMode: Record<AuditMode, Map<string, any[]>>, holderCache: Map<string, Promise<any[]>>) {
  const mode = unit.config.machine.mode as AuditMode;
  const entries = toolpathEntriesByMode[mode];
  if (!entries.length || materials.length === 0) return null;
  for (let attempt = 0; attempt < entries.length; attempt += 1) {
    const token = unit.seed + unit.cursor + attempt;
    const material = materials[(unit.materialOffset + unit.cursor + attempt) % materials.length];
    const entry = entries[(unit.seed + unit.cursor + attempt) % entries.length];
    if (!machineSupportsToolpath(mode, unit.config.machine, entry.toolpath)) continue;
    const compatibleTools = toolMapByMode[mode].get(entry.toolpath.id) ?? [];
    if (!compatibleTools.length) continue;
    const tool = chooseToolForScenario(compatibleTools, entry.toolpath, token);
    const finishTarget = chooseFinishTarget(entry, token);
    const toolDiameterMm = Math.max(tool.defaultDiameter, mode === 'lathe' ? 1.2 : 3);
    const defaults = entry.defaults ?? { docMm: mode === 'lathe' ? 1.5 : 0.2, wocMm: mode === 'lathe' ? 0.4 : 0.25, isAbsolute: true };
    const currentDocMm = round(defaults.isAbsolute ? defaults.docMm : toolDiameterMm * defaults.docMm, 3);
    const currentWocMm = round(defaults.isAbsolute ? defaults.wocMm : toolDiameterMm * defaults.wocMm, 3);
    const stockShape = chooseStockShape(mode, token);
    const stock = buildStockDimensions(mode, stockShape, toolDiameterMm, token);
    const holderPackages = await resolveHolderPackages(mode, unit.config.machine, tool, holderCache);
    const coolantId = chooseCoolantId(unit.config.coolantOptionIds, material, token);
    const holderPackage = holderPackages.length ? stablePick(holderPackages, token) : null;
    const reachDefaults = deriveToolReachDefaults(tool, toolDiameterMm, mode);
    const stabilityId = chooseStabilityId(mode, token);
    return {
      mode,
      machine: unit.config.machine,
      config: unit.config,
      material,
      tool,
      entry,
      stockShape,
      stock,
      coolantId,
      holderPackage,
      insertOption: buildInsertOptionsForTool({ tool, material }).at(0) ?? null,
      enabledControllerCapabilityIds: unit.config.controllerCapabilityOptions?.length ? (token % 2 === 0 ? unit.config.controllerCapabilityOptions.map((option: any) => option.id) : unit.config.controllerCapabilityOptions.filter((option: any) => option.defaultEnabled).map((option: any) => option.id)) : [],
      workholdingId: chooseWorkholdingId(mode, token),
      stabilityId,
      finishTarget,
      desiredRaUm: desiredRaForFinishTarget(finishTarget),
      toolDiameterMm,
      currentDocMm,
      currentWocMm,
      optimization: buildCuttingParameterOptimization({
        machineMode: mode,
        machine: unit.config.machine,
        material,
        tool,
        toolpath: entry.toolpath,
        operationId: entry.toolpath.operationId,
        toolpathTypeId: entry.toolpathType.id,
        holderStyleId: holderPackage?.holderStyleId ?? 'machine-standard',
        stabilityId,
        coolantId,
        toolDiameterMm,
        currentDocMm,
        currentWocMm,
        currentLocMm: reachDefaults.fluteLengthMm,
        currentStickoutMm: reachDefaults.stickoutMm,
        stockZMm: stock.z,
      }),
    };
  }
  return null;
}

function buildScenarioKey(scenario: any) {
  return [scenario.mode, scenario.machine.id, scenario.config.controllerOption.id, scenario.config.spindleOption.id, scenario.material.id, scenario.tool.id, scenario.holderPackage?.id ?? 'no-holder', scenario.entry.programmingId, scenario.entry.licenseTierId, scenario.entry.toolpath.id, scenario.coolantId, scenario.workholdingId, scenario.stockShape, scenario.stabilityId, scenario.finishTarget].join('__');
}

function buildComparisonKey(scenario: any) {
  return [scenario.mode, scenario.machine.id, scenario.config.controllerOption.id, scenario.config.spindleOption.id, scenario.tool.id, scenario.holderPackage?.id ?? 'no-holder', scenario.entry.toolpath.id, scenario.coolantId, scenario.finishTarget, scenario.optimization.recommendedDocMm.toFixed(2), scenario.currentWocMm.toFixed(2)].join('__');
}

function isLiveToolLathePath(signature: string) {
  return [
    'live tool',
    'live-tool',
    'live tooling',
    'live-tooling',
    'live milling',
    'mill-turn',
    'mill/turn',
    'driven tool',
    'driven-tool',
    'c/y',
    'c-axis',
    'y-axis',
    'milling head',
    'cross milling',
  ].some((keyword) => signature.includes(keyword));
}

function detectAnomalies(scenario: any, live: any, finishPreview: any, setupPreview: any) {
  const codes: string[] = [];
  const details: string[] = [];
  const toolSignature = `${scenario.tool.geometryClass ?? ''} ${scenario.tool.label}`.toLowerCase();
  const pathSignature = `${scenario.entry.toolpath.label} ${scenario.entry.toolpath.path} ${scenario.entry.toolpath.operationId}`.toLowerCase();
  const machineSignature = `${scenario.machine.id} ${scenario.machine.model} ${scenario.machine.machineTypeId}`.toLowerCase();
  const toolpathTypeId = String(scenario.entry?.toolpathType?.id ?? '');
  const threadingPath = toolpathTypeId === 'threading' || isThreadingAuditPath(pathSignature);
  const namedFinishPath = /finish|parallel|flow|scallop|swarf/.test(pathSignature);
  const finishCriticalPath =
    !threadingPath && (
      ['surface_finish', 'multiaxis', 'finishing', 'turning_finish', 'live_milling'].includes(toolpathTypeId)
    || namedFinishPath
    || (toolpathTypeId === 'profiling' && scenario.finishTarget === 'tight-finish')
    || scenario.finishTarget === 'tight-finish'
    );
  const supportedSetupFail = (setupPreview.risks ?? []).some((risk: any) => (
    risk?.severity === 'fail'
    && /(stickout|deflection|interface|mismatch|rpm|exceed|too aggressive|too deep|too wide|limit|overload|axis|coolant)/i.test(
      `${risk?.id ?? ''} ${risk?.title ?? ''} ${risk?.detail ?? ''}`,
    )
  ));
  const add = (condition: boolean, code: string, detail: string) => { if (condition) { codes.push(code); details.push(detail); } };
  add(!Number.isFinite(live.rpm) || (live.rpm ?? 0) <= 0, 'missing-rpm', 'Live result returned no usable spindle speed.');
  add(!Number.isFinite(live.feedRate) || (live.feedRate ?? 0) <= 0, 'missing-feed', 'Live result returned no usable feed rate.');
  add(!Number.isFinite(live.powerKw) || (live.powerKw ?? 0) <= 0, 'missing-power', 'Live result returned no usable spindle power.');
  add(!Number.isFinite(live.ra) || (live.ra ?? 0) <= 0, 'missing-ra', 'Live result returned no usable surface finish.');
  add((live.confidence ?? 0) < 0.2, 'low-confidence', 'Solve confidence is materially low.');
  add(finishPreview.verdict === 'unlikely' && finishCriticalPath, 'finish-unlikely', 'Generated finish view says the requested finish is unlikely on a finish-critical path.');
  add(setupPreview.severity === 'fail' && !supportedSetupFail, 'unexpected-setup-fail', 'Setup preview failed without a clear physical or compatibility reason.');
  add(!scenario.holderPackage, 'no-holder-package', 'No compatible tool holder package was available.');
  add(scenario.mode === 'lathe' && (scenario.machine.toolingLayout?.kind === 'turret' || scenario.machine.toolingLayout?.kind === 'multitask') && !scenario.holderPackage, 'lathe-holder-filter-empty', 'Lathe or multitask machine normalized into a holderless state.');
  add(scenario.mode === 'lathe' && scenario.machine.manufacturer.toLowerCase() === 'okuma' && !(scenario.config.controllerCapabilityOptions?.length), 'okuma-lathe-controller-capabilities-missing', 'Okuma lathe or multitask controller capability packages are missing.');
  add(machineSignature.includes('m460v-5ax') && !/15000|15,000/.test(`${scenario.config.spindleOption.label} ${scenario.config.spindleOption.detail ?? ''}`), 'm460-spindle-mismatch', 'GENOS M460V-5AX spindle package drifted away from the audited 15k Big Plus posture.');
  add(/rough|adaptive|featureflow/.test(pathSignature) && !/z-level|zlevel|steep|flowline|parallel|scallop|surface|finish/.test(pathSignature) && /ball-endmill|ball end/i.test(toolSignature), 'roughing-ball-tool-mismatch', 'A roughing path selected a ball finisher-style tool.');
  add(scenario.mode === 'lathe' && /thread/.test(pathSignature) && !/thread/.test(toolSignature), 'threading-tool-mismatch', 'A lathe threading path did not select a threading tool.');
  add(scenario.mode === 'lathe' && /finish|profile/.test(pathSignature) && !isLiveToolLathePath(pathSignature) && /live-tool-endmill|endmill|milling head/.test(toolSignature), 'lathe-finish-live-tool-mismatch', 'A standard lathe finish path selected a live-tool milling cutter.');
  add(scenario.mode === 'mill' && /engrave/.test(pathSignature) && !/chamfer|engrave/.test(toolSignature), 'engrave-tool-mismatch', 'An engraving path did not select a chamfer or engraving cutter.');
  return { codes, details };
}

function buildMaterialEquivalenceSummary(results: any[]) {
  const groups = new Map<string, Map<string, Set<string>>>();
  for (const result of results) {
    if (result.error) continue;
    const signature = [result.rpm?.toFixed(3) ?? 'na', result.feedRate?.toFixed(3) ?? 'na', result.powerKw?.toFixed(3) ?? 'na', result.ra?.toFixed(3) ?? 'na', result.toolLife?.toFixed(3) ?? 'na'].join('|');
    const byResult = groups.get(result.comparisonKey) ?? new Map<string, Set<string>>();
    const materials = byResult.get(signature) ?? new Set<string>();
    materials.add(result.materialLabel);
    byResult.set(signature, materials);
    groups.set(result.comparisonKey, byResult);
  }
  return [...groups.entries()].flatMap(([comparisonKey, byResult]) => [...byResult.entries()].filter(([, materials]) => materials.size >= 3).map(([resultSignature, materials]) => ({ comparisonKey, resultSignature, materials: [...materials].sort() }))).slice(0, 30);
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) break;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.shardIndex >= args.shardCount) {
    throw new Error(`shard-index (${args.shardIndex}) must be smaller than shard-count (${args.shardCount}).`);
  }
  installFetchBase(args.baseUrl);
  await mkdir(args.outDir, { recursive: true });

  const [millMachines, latheMachines, allMaterials, millTools, latheTools] = await Promise.all([
    args.modes.includes('mill') ? fetchMachineCatalog('mill') : Promise.resolve([]),
    args.modes.includes('lathe') ? fetchMachineCatalog('lathe') : Promise.resolve([]),
    fetchMaterialCatalog(),
    args.modes.includes('mill') ? fetchToolCatalog('mill') : Promise.resolve([]),
    args.modes.includes('lathe') ? fetchToolCatalog('lathe') : Promise.resolve([]),
  ]);

  const selectedMachinesByMode = {
    mill: selectAuditMachines(millMachines, args.manufacturers),
    lathe: selectAuditMachines(latheMachines, args.manufacturers),
  };
  const selectedMaterials = selectAuditMaterials(allMaterials, args.materialGroups, args.materialIds);
  const machineConfigRefs = [
    ...buildMachineConfigRefs(selectedMachinesByMode.mill),
    ...buildMachineConfigRefs(selectedMachinesByMode.lathe),
  ];
  const toolpathEntriesByMode = {
    mill: args.modes.includes('mill') ? buildToolpathEntries('mill') : [],
    lathe: args.modes.includes('lathe') ? buildToolpathEntries('lathe') : [],
  };
  const toolMapByMode = {
    mill: buildCompatibleToolMap('mill', millTools, toolpathEntriesByMode.mill),
    lathe: buildCompatibleToolMap('lathe', latheTools, toolpathEntriesByMode.lathe),
  };
  const holderCache = new Map<string, Promise<any[]>>();
  if (machineConfigRefs.length === 0) {
    throw new Error(`No machine packages matched the requested modes/manufacturers: modes=${args.modes.join(',')} manufacturers=${args.manufacturers.join(',') || 'all'}.`);
  }
  if (selectedMaterials.length === 0) {
    throw new Error(`No materials matched the requested groups/ids: groups=${(args.materialGroups.length ? args.materialGroups : DEFAULT_MATERIAL_GROUPS).join(',')} ids=${args.materialIds.join(',') || 'all'}.`);
  }
  const units = buildAuditUnits(machineConfigRefs, selectedMaterials);
  const scenarios: any[] = [];
  let candidateIndex = 0;

  while (scenarios.length < args.count) {
    let addedThisRound = 0;
    for (const unit of units) {
      const scenario = await buildScenario(unit, selectedMaterials, toolpathEntriesByMode as Record<AuditMode, any[]>, toolMapByMode as Record<AuditMode, Map<string, any[]>>, holderCache);
      unit.cursor += 1;
      if (!scenario) continue;
      const belongsToShard = candidateIndex % args.shardCount === args.shardIndex;
      candidateIndex += 1;
      if (!belongsToShard) continue;
      scenarios.push(scenario);
      addedThisRound += 1;
      if (scenarios.length >= args.count) break;
    }
    if (!addedThisRound) throw new Error('Unable to build additional valid calculator scenarios for the requested audit count.');
  }

  const results: any[] = new Array(scenarios.length);
  await runPool(scenarios, args.concurrency, async (scenario, index) => {
    try {
      const liveResponse = await sfQuick(buildCalculatorSpeedFeedParams({
        machineMode: scenario.mode,
        machine: scenario.machine,
        controllerOption: scenario.config.controllerOption,
        spindleOption: scenario.config.spindleOption,
        enabledControllerCapabilityIds: scenario.enabledControllerCapabilityIds,
        enabledMachineCoolantIds: scenario.config.coolantOptionIds,
        material: scenario.material,
        tool: scenario.tool,
        insertOption: scenario.insertOption,
        holderPackage: scenario.holderPackage,
        operationId: scenario.entry.toolpath.operationId,
        toolpathTypeId: scenario.entry.toolpathType.id,
        toolpath: scenario.entry.toolpath,
        programming: { id: scenario.entry.programmingId, label: scenario.entry.programmingLabel, vendor: scenario.entry.programmingLabel },
        toolDiameterMm: scenario.toolDiameterMm,
        docMm: scenario.optimization.recommendedDocMm,
        wocMm: scenario.currentWocMm,
        flutes: scenario.tool.defaultFlutes,
        toolStickoutMm: scenario.optimization.recommendedStickoutMm,
        fluteLengthMm: scenario.optimization.recommendedLocMm,
        stockShape: scenario.stockShape,
        stockXm: scenario.stock.x,
        stockYm: scenario.stock.y,
        stockZm: scenario.stock.z,
        coolantId: scenario.coolantId,
        workholdingId: scenario.workholdingId,
        workholdingCategoryId: scenario.mode === 'lathe' ? 'chucking' : 'fixture',
        stabilityId: scenario.stabilityId,
        desiredRaUm: scenario.desiredRaUm,
        finishTarget: scenario.finishTarget,
      }));
      const live = normalizeCalculatorSpeedFeedResult(liveResponse);
      const finishPreview = getSurfaceFinishPreview({
        machineMode: scenario.mode,
        machine: scenario.machine,
        material: scenario.material,
        tool: scenario.tool,
        toolpath: scenario.entry.toolpath,
        toolpathTypeId: scenario.entry.toolpathType.id,
        programmingLabel: scenario.entry.programmingLabel,
        coolantId: scenario.coolantId,
        finishTarget: scenario.finishTarget,
        desiredRaUm: scenario.desiredRaUm,
        toolDiameterMm: scenario.toolDiameterMm,
        docMm: scenario.optimization.recommendedDocMm,
        wocMm: scenario.currentWocMm,
        toolStickoutMm: scenario.optimization.recommendedStickoutMm,
        fluteLengthMm: scenario.optimization.recommendedLocMm,
        defaults: scenario.entry.defaults,
        actualFeedPerToothMm: live.feedPerTooth,
        actualFeedRateMmPerMin: live.feedRate,
        actualRpm: live.rpm,
        actualRaUm: live.ra,
        holderStyleId: scenario.holderPackage?.holderStyleId,
        stabilityId: scenario.stabilityId,
      });
      const setupPreview = buildCalculatorSetupPreview({
        machineMode: scenario.mode,
        machine: scenario.machine,
        spindleOption: scenario.config.spindleOption,
        holderPackage: scenario.holderPackage,
        tool: scenario.tool,
        material: scenario.material,
        toolpath: scenario.entry.toolpath,
        toolDiameterMm: scenario.toolDiameterMm,
        docMm: scenario.optimization.recommendedDocMm,
        wocMm: scenario.currentWocMm,
        stockXMm: scenario.stock.x,
        stockYMm: scenario.stock.y,
        stockZMm: scenario.stock.z,
        toolStickoutMmOverride: scenario.optimization.recommendedStickoutMm,
        fluteLengthMmOverride: scenario.optimization.recommendedLocMm,
        coolantId: scenario.coolantId,
        liveRpm: live.rpm,
        warnings: live.warnings,
      });
      const prismMode = buildCalculatorPrismModePlan({
        machineMode: scenario.mode,
        machine: scenario.machine,
        material: scenario.material,
        tool: scenario.tool,
        toolpath: scenario.entry.toolpath,
        toolpathTypeId: scenario.entry.toolpathType.id,
        programmingLabel: scenario.entry.programmingLabel,
        finishTarget: scenario.finishTarget,
        stockShape: scenario.stockShape,
        stockSource: 'audit-stock',
        currentSetupSource: 'recommended',
        currentCoolantId: scenario.coolantId,
        availableCoolantOptions: scenario.config.coolantOptionIds.map((id: string) => COOLANT_OPTIONS.find((option) => option.id === id)).filter(Boolean),
        toolDiameterMm: scenario.toolDiameterMm,
        docMm: scenario.optimization.recommendedDocMm,
        wocMm: scenario.currentWocMm,
        compatibleHolderPackages: scenario.holderPackage ? [scenario.holderPackage] : [],
        currentHolderStyleId: scenario.holderPackage?.holderStyleId ?? 'machine-standard',
        currentHolderPackageId: scenario.holderPackage?.id ?? 'no-holder',
        recommendedFeatureIds: [],
        currentFeatureIds: [],
        controllerCapabilityOptions: scenario.config.controllerCapabilityOptions,
        currentControllerCapabilityIds: scenario.enabledControllerCapabilityIds,
        defaultMachineProfile: null,
        inventoryWorkspace: null,
        result: { ra: live.ra, toolLife: live.toolLife, powerKw: live.powerKw, mrr: live.mrr, confidence: live.confidence },
        purchasingHrefBase: '/operating-system/purchasing',
      });
      const anomalies = detectAnomalies(scenario, live, finishPreview, setupPreview);
      results[index] = {
        caseId: index + 1,
        scenarioKey: buildScenarioKey(scenario),
        comparisonKey: buildComparisonKey(scenario),
        mode: scenario.mode,
        machineId: scenario.machine.id,
        machineLabel: `${scenario.machine.manufacturer} ${scenario.machine.model}`,
        machineTypeId: scenario.machine.machineTypeId,
        controllerId: scenario.config.controllerOption.id,
        spindleId: scenario.config.spindleOption.id,
        materialId: scenario.material.id,
        materialLabel: scenario.material.name,
        toolId: scenario.tool.id,
        toolLabel: scenario.tool.label,
        toolBodyType: scenario.tool.bodyType,
        holderPackageId: scenario.holderPackage?.id ?? null,
        holderStyleId: scenario.holderPackage?.holderStyleId ?? null,
        programmingId: scenario.entry.programmingId,
        licenseTierId: scenario.entry.licenseTierId,
        toolpathId: scenario.entry.toolpath.id,
        toolpathLabel: scenario.entry.toolpath.label,
        toolpathTypeId: scenario.entry.toolpathType.id,
        coolantId: scenario.coolantId,
        workholdingId: scenario.workholdingId,
        stockShape: scenario.stockShape,
        stabilityId: scenario.stabilityId,
        finishTarget: scenario.finishTarget,
        desiredRaUm: scenario.desiredRaUm,
        docMm: scenario.currentDocMm,
        wocMm: scenario.currentWocMm,
        optimizedDocMm: scenario.optimization.recommendedDocMm,
        optimizedLocMm: scenario.optimization.recommendedLocMm,
        optimizedStickoutMm: scenario.optimization.recommendedStickoutMm,
        rpm: live.rpm,
        feedRate: live.feedRate,
        powerKw: live.powerKw,
        torqueNm: live.torqueNm,
        toolLife: live.toolLife,
        ra: live.ra,
        confidence: live.confidence,
        formulasCount: live.formulas.length,
        warningsCount: live.warnings.length,
        recommendationsCount: live.recommendations.length,
        setupSeverity: setupPreview.severity,
        setupRiskCount: setupPreview.risks.length,
        finishVerdict: finishPreview.verdict,
        finishExpectedRaUm: finishPreview.expectedRaUm,
        prismConfidence: prismMode.confidenceScore,
        prismSetupDeltaCount: prismMode.setupDeltaCount,
        anomalyCodes: anomalies.codes,
        anomalyDetails: anomalies.details,
      };
    } catch (error) {
      results[index] = {
        caseId: index + 1,
        scenarioKey: buildScenarioKey(scenario),
        comparisonKey: buildComparisonKey(scenario),
        mode: scenario.mode,
        machineId: scenario.machine.id,
        machineLabel: `${scenario.machine.manufacturer} ${scenario.machine.model}`,
        machineTypeId: scenario.machine.machineTypeId,
        controllerId: scenario.config.controllerOption.id,
        spindleId: scenario.config.spindleOption.id,
        materialId: scenario.material.id,
        materialLabel: scenario.material.name,
        toolId: scenario.tool.id,
        toolLabel: scenario.tool.label,
        programmingId: scenario.entry.programmingId,
        licenseTierId: scenario.entry.licenseTierId,
        toolpathId: scenario.entry.toolpath.id,
        toolpathLabel: scenario.entry.toolpath.label,
        toolpathTypeId: scenario.entry.toolpathType.id,
        coolantId: scenario.coolantId,
        workholdingId: scenario.workholdingId,
        stockShape: scenario.stockShape,
        stabilityId: scenario.stabilityId,
        finishTarget: scenario.finishTarget,
        desiredRaUm: scenario.desiredRaUm,
        docMm: scenario.currentDocMm,
        wocMm: scenario.currentWocMm,
        optimizedDocMm: scenario.optimization.recommendedDocMm,
        optimizedLocMm: scenario.optimization.recommendedLocMm,
        optimizedStickoutMm: scenario.optimization.recommendedStickoutMm,
        formulasCount: 0,
        warningsCount: 0,
        recommendationsCount: 0,
        setupSeverity: 'error',
        setupRiskCount: 0,
        finishVerdict: 'error',
        finishExpectedRaUm: Number.NaN,
        prismConfidence: 0,
        prismSetupDeltaCount: 0,
        anomalyCodes: ['request-error'],
        anomalyDetails: [error instanceof Error ? error.message : String(error)],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const validResults = results.filter(Boolean);
  const anomalyCounts = new Map<string, number>();
  const machineAnomalies = new Map<string, number>();
  const toolpathAnomalies = new Map<string, number>();
  const holderIds = new Set<string>();
  for (const result of validResults) {
    if (result.holderPackageId) holderIds.add(result.holderPackageId);
    if (result.anomalyCodes.length) {
      machineAnomalies.set(result.machineId, (machineAnomalies.get(result.machineId) ?? 0) + result.anomalyCodes.length);
      toolpathAnomalies.set(result.toolpathId, (toolpathAnomalies.get(result.toolpathId) ?? 0) + result.anomalyCodes.length);
    }
    for (const code of result.anomalyCodes) anomalyCounts.set(code, (anomalyCounts.get(code) ?? 0) + 1);
  }

  const summary = {
    requestedCaseCount: args.count,
    shardIndex: args.shardIndex,
    shardCount: args.shardCount,
    requestedModes: args.modes,
    manufacturerFilter: args.manufacturers,
    materialGroups: args.materialGroups.length ? args.materialGroups : DEFAULT_MATERIAL_GROUPS,
    materialIds: args.materialIds,
    completedCaseCount: validResults.length,
    successfulCaseCount: validResults.filter((result) => !result.error).length,
    failedCaseCount: validResults.filter((result) => Boolean(result.error)).length,
    modes: { mill: validResults.filter((result) => result.mode === 'mill').length, lathe: validResults.filter((result) => result.mode === 'lathe').length },
    machineCount: new Set(validResults.map((result) => result.machineId)).size,
    materialCount: new Set(validResults.map((result) => result.materialId)).size,
    toolCount: new Set(validResults.map((result) => result.toolId)).size,
    holderPackageCount: holderIds.size,
    programmingPackageCount: new Set(validResults.map((result) => result.programmingId)).size,
    toolpathCount: new Set(validResults.map((result) => result.toolpathId)).size,
    anomalyCounts: Object.fromEntries([...anomalyCounts.entries()].sort((left, right) => right[1] - left[1])),
    topMachinesByAnomaly: [...machineAnomalies.entries()].sort((left, right) => right[1] - left[1]).slice(0, 15).map(([machineId, count]) => ({ machineId, count })),
    topToolpathsByAnomaly: [...toolpathAnomalies.entries()].sort((left, right) => right[1] - left[1]).slice(0, 15).map(([toolpathId, count]) => ({ toolpathId, count })),
    suspiciousMaterialEquivalence: buildMaterialEquivalenceSummary(validResults.filter((result) => !result.error)),
    invalidCasesSample: validResults.filter((result) => result.anomalyCodes.length > 0).slice(0, 40),
  };

  await writeFile(path.join(args.outDir, 'calculator-live-audit-results.json'), JSON.stringify(validResults, null, 2), 'utf8');
  await writeFile(path.join(args.outDir, 'calculator-live-audit-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  await writeFile(path.join(args.outDir, 'calculator-live-audit-summary.md'), ['# Calculator Live Audit', '', `- Requested cases: ${summary.requestedCaseCount}`, `- Shard index: ${summary.shardIndex}`, `- Shard count: ${summary.shardCount}`, `- Completed cases: ${summary.completedCaseCount}`, `- Successful cases: ${summary.successfulCaseCount}`, `- Failed cases: ${summary.failedCaseCount}`, `- Mill cases: ${summary.modes.mill}`, `- Lathe cases: ${summary.modes.lathe}`, `- Machines covered: ${summary.machineCount}`, `- Materials covered: ${summary.materialCount}`, `- Tools covered: ${summary.toolCount}`, `- Holder packages covered: ${summary.holderPackageCount}`, `- Programming packages covered: ${summary.programmingPackageCount}`, `- Toolpaths covered: ${summary.toolpathCount}`, '', '## Top Anomalies', ...Object.entries(summary.anomalyCounts).slice(0, 20).map(([code, count]) => `- ${code}: ${count}`), '', '## Suspicious Material Equivalence', ...summary.suspiciousMaterialEquivalence.map((entry: any) => `- ${entry.comparisonKey}: ${entry.materials.join(', ')} => ${entry.resultSignature}`), ''].join('\n'), 'utf8');

  console.log(JSON.stringify({ outDir: args.outDir, summary }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
