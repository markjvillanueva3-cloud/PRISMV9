import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  fetchMachineCatalog,
  fetchMaterialCatalog,
  fetchToolCatalog,
  fetchToolHolderCatalog,
} from '../src/api/calculatorData.ts';
import {
  PROGRAMMING_ENVIRONMENTS,
  type MachineCatalogItem,
  type MachineMode,
  type MaterialCatalogItem,
  type ProgrammingEnvironmentOption,
  type ToolCatalogItem,
  toolSupportsToolpath,
} from '../src/data/calculatorWorkspace.ts';
import {
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  holderPackageMatchesMachine,
  licenseOptionsFor,
} from '../src/pages/CalculatorPage.tsx';
import { buildCalculatorSpeedFeedParams } from '../src/utils/calculatorSpeedFeedContract.ts';
import { deriveToolReachDefaults } from '../src/utils/calculatorParameterOptimization.ts';

type ConventionalMode = Extract<MachineMode, 'mill' | 'lathe'>;

type SweepScenario = {
  mode: ConventionalMode;
  programming: ProgrammingEnvironmentOption;
  toolpath: ProgrammingEnvironmentOption['toolpaths'][number];
  machine: MachineCatalogItem;
  tool: ToolCatalogItem;
  material: MaterialCatalogItem;
  holderPackageId: string | null;
  coolantId: string;
};

type SweepCheck = {
  route: 'quick' | 'orchestrate' | 'optimize';
  ok: boolean;
  status?: number;
  summary?: string;
  strategyName?: string;
  strategySource?: string;
  isAdaptive?: boolean;
  confidence?: number;
  cycleTimeSec?: number | null;
  anomalies: string[];
};

type SweepRecord = {
  scenario: {
    mode: ConventionalMode;
    programmingId: string;
    licenseId: string;
    toolpathId: string;
    machineId: string;
    materialId: string;
    toolId: string;
  };
  checks: SweepCheck[];
};

type CatalogBundle = {
  machines: Record<ConventionalMode, MachineCatalogItem[]>;
  materials: MaterialCatalogItem[];
  tools: Record<ConventionalMode, ToolCatalogItem[]>;
};

function machineSupportsToolpath(
  mode: ConventionalMode,
  machine: MachineCatalogItem,
  toolpath: ProgrammingEnvironmentOption['toolpaths'][number],
) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  if (mode === 'mill') {
    if (/swarf|simultaneous|5-axis|5x|multi-axis|multiaxis|variable contour/i.test(signature)) {
      return machine.machineTypeId.includes('5') || /5|trt/i.test(machine.axes);
    }
    if (/horizontal/i.test(signature)) {
      return /horizontal/i.test(machine.machineTypeLabel) || machine.taxonomy?.orientation === 'horizontal';
    }
    return true;
  }

  if (/swiss/i.test(signature)) {
    return machine.machineTypeId === 'lathe_swiss' || machine.taxonomy?.axisClass === 'swiss';
  }
  if (/live|mill-turn|milling|live milling/i.test(signature)) {
    return Boolean(machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead);
  }
  if (/sync|sub spindle|sub-spindle/i.test(signature)) {
    return Boolean(machine.toolingLayout?.hasSubSpindle) || machine.machineTypeId === 'lathe_multitask';
  }
  return true;
}

function supportsMachineTooling(tool: ToolCatalogItem, machine: MachineCatalogItem) {
  if (!tool.requiresLiveTooling) return true;
  return Boolean(machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead);
}

function pickMaterials(mode: ConventionalMode, materials: MaterialCatalogItem[]) {
  const orderedIds =
    mode === 'mill'
      ? ['4140', '304', '6061']
      : ['4140', '303', '6061'];
  return orderedIds
    .map((id) => materials.find((material) => material.id === id))
    .filter((material): material is MaterialCatalogItem => Boolean(material));
}

function pickTools(
  mode: ConventionalMode,
  toolpath: ProgrammingEnvironmentOption['toolpaths'][number],
  tools: ToolCatalogItem[],
) {
  return tools
    .filter((tool) => tool.mode === mode && toolSupportsToolpath(tool, toolpath))
    .slice(0, 2);
}

function buildRepresentativeScenarios(bundle: CatalogBundle) {
  const scenarios: Array<SweepScenario & { licenseId: string }> = [];

  for (const programming of PROGRAMMING_ENVIRONMENTS) {
    if (programming.mode !== 'mill' && programming.mode !== 'lathe') continue;
    const mode = programming.mode;
    const materials = pickMaterials(mode, bundle.materials);
    const machines = bundle.machines[mode];
    const tools = bundle.tools[mode];

    for (const license of licenseOptionsFor(programming)) {
      for (const toolpath of filterToolpathsForLicense(programming, programming.toolpaths, license.id)) {
        const compatibleTools = pickTools(mode, toolpath, tools);
        if (!compatibleTools.length) continue;

        const compatibleMachines = machines
          .filter((machine) => machineSupportsToolpath(mode, machine, toolpath))
          .filter((machine) => compatibleTools.some((tool) => supportsMachineTooling(tool, machine)))
          .slice(0, 2);

        for (const machine of compatibleMachines) {
          for (const tool of compatibleTools) {
            if (!supportsMachineTooling(tool, machine)) continue;
            for (const material of materials) {
              scenarios.push({
                mode,
                programming,
                toolpath,
                machine,
                tool,
                material,
                holderPackageId: null,
                coolantId: machine.coolantOptionIds[0] ?? 'flood',
                licenseId: license.id,
              });
            }
          }
        }
      }
    }
  }

  return scenarios;
}

function expectedAdaptive(toolpath: ProgrammingEnvironmentOption['toolpaths'][number]) {
  return /adaptive|dynamic|trochoid|vortex|waveform|volumill|imachining|optirough|peel/i
    .test(`${toolpath.label} ${toolpath.path} ${toolpath.id}`);
}

function expectedFinish(toolpath: ProgrammingEnvironmentOption['toolpaths'][number]) {
  return /parallel|scallop|flow|swarf|finish|skim/i.test(`${toolpath.label} ${toolpath.path}`);
}

function summarizeValue(raw: unknown) {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const value = (raw as { value?: unknown }).value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    }
    return value ?? null;
  }
  return null;
}

async function buildRequest(
  scenario: SweepScenario,
  holderCache: Map<string, Awaited<ReturnType<typeof fetchToolHolderCatalog>>>,
) {
  const defaults = getToolpathDefaults(scenario.toolpath, scenario.mode);
  const toolDiameterMm = Math.max(scenario.tool.defaultDiameter, 0.2);
  const docMm = defaults
    ? (defaults.isAbsolute ? defaults.docMm : Number((toolDiameterMm * defaults.docMm).toFixed(3)))
    : Math.max(toolDiameterMm * 0.75, 0.5);
  const wocMm = defaults
    ? (defaults.isAbsolute ? defaults.wocMm : Number((toolDiameterMm * defaults.wocMm).toFixed(3)))
    : Math.max(toolDiameterMm * 0.1, 0.05);
  const reachDefaults = deriveToolReachDefaults(scenario.tool, toolDiameterMm, scenario.mode);

  const holderKey = JSON.stringify({
    mode: scenario.mode,
    machineId: scenario.machine.id,
    spindleInterfaceId: scenario.machine.toolingLayout?.spindleConnectionTypeId ?? null,
    turretTypeId: scenario.machine.toolingLayout?.turretTypeId ?? null,
    liveTooling: scenario.machine.toolingLayout?.liveTooling ?? false,
    millingHead: scenario.machine.toolingLayout?.hasMillingHead ?? false,
    turretCount: scenario.machine.toolingLayout?.turretCount ?? null,
    interfaceId: scenario.machine.toolingLayout?.interfaceId ?? null,
  });
  let holderPackages = holderCache.get(holderKey);
  if (!holderPackages) {
    holderPackages = await fetchToolHolderCatalog({
      machineMode: scenario.mode,
      spindleInterfaceIds: scenario.machine.toolingLayout?.spindleConnectionTypeId
        ? [scenario.machine.toolingLayout.spindleConnectionTypeId]
        : undefined,
      turretTypeIds: scenario.machine.toolingLayout?.turretTypeId
        ? [scenario.machine.toolingLayout.turretTypeId]
        : undefined,
      hasLiveTooling: scenario.machine.toolingLayout?.liveTooling,
      hasMillingHead: scenario.machine.toolingLayout?.hasMillingHead,
      turretCount: scenario.machine.toolingLayout?.turretCount,
      machineId: scenario.machine.id,
      holderInterfaceIds: scenario.machine.toolingLayout?.interfaceId
        ? [scenario.machine.toolingLayout.interfaceId]
        : undefined,
    });
    holderCache.set(holderKey, holderPackages);
  }
  const holderPackage = holderPackages.find((candidate) => holderPackageMatchesMachine(candidate, scenario.machine)) ?? null;

  return buildCalculatorSpeedFeedParams({
    machineMode: scenario.mode,
    operationId: scenario.toolpath.operationId,
    toolpathTypeId: classifyToolpathType(scenario.toolpath).id,
    machine: scenario.machine,
    material: scenario.material,
    tool: scenario.tool,
    insertOption: null,
    programming: scenario.programming,
    toolpath: scenario.toolpath,
    spindleOption: scenario.machine.spindleOptions?.[0] ?? null,
    setupOption: null,
    holderPackage,
    coolantId: scenario.coolantId,
    enabledMachineCoolantIds: scenario.machine.coolantOptionIds,
    workholdingPreset: null,
    workholdingId: null,
    workholdingCategoryId: null,
    stabilityId: 'balanced',
    stockXm: scenario.mode === 'mill' ? 100 : 120,
    stockYm: scenario.mode === 'mill' ? 60 : 40,
    stockZm: scenario.mode === 'mill' ? 25 : 40,
    docMm: Math.max(docMm, 0.1),
    wocMm: Math.max(wocMm, 0.05),
    toolDiameterMm,
    fluteLengthMm: reachDefaults.fluteLengthMm,
    toolStickoutMm: reachDefaults.stickoutMm,
    desiredRaUm: expectedFinish(scenario.toolpath) ? 0.8 : 3.2,
  });
}

async function callRoute(route: 'quick' | 'orchestrate' | 'optimize', body: Record<string, unknown>) {
  const response = await fetch(`http://127.0.0.1:3001/api/v1/speed-feed/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

function analyzeResponse(
  route: 'quick' | 'orchestrate' | 'optimize',
  scenario: SweepScenario,
  payload: { status: number; json: any },
) {
  const anomalies: string[] = [];
  const resultRoot = payload.json?.result?.value ?? payload.json?.result ?? payload.json;
  const optimizeResolvedCam = route === 'optimize'
    ? resultRoot?.pareto_front?.[0]?.result?.resolved_cam_strategy ?? null
    : null;
  const resolvedCam = resultRoot?.resolved_cam_strategy ?? optimizeResolvedCam ?? null;
  const strategyName = resolvedCam?.strategy_name?.value ?? resolvedCam?.strategy_name ?? null;
  const strategySource = resolvedCam?.strategy_name?.source ?? null;
  const isAdaptive = resolvedCam?.is_adaptive?.value ?? resolvedCam?.is_adaptive ?? null;
  const confidence = resultRoot?.overall_confidence ?? payload.json?.result?.confidence ?? null;
  const cycleTimeSec =
    summarizeValue(resultRoot?.cycle_time_sec)
    ?? summarizeValue(resultRoot?.cycle_time_seconds)
    ?? summarizeValue(resultRoot?.runtime_sec);

  if (payload.status !== 200) {
    anomalies.push(`http_${payload.status}`);
  }

  if (route !== 'optimize') {
    const rpm = summarizeValue(resultRoot?.spindle_rpm);
    const feed = summarizeValue(resultRoot?.feed_rate_mmmin);
    const ra = summarizeValue(resultRoot?.surface_finish_Ra_um);
    if (!(typeof rpm === 'number' && Number.isFinite(rpm) && rpm > 0)) anomalies.push('invalid_rpm');
    if (!(typeof feed === 'number' && Number.isFinite(feed) && feed > 0)) anomalies.push('invalid_feed');
    if (!(typeof ra === 'number' && Number.isFinite(ra) && ra > 0)) anomalies.push('invalid_surface_finish');
  }

  if (route !== 'optimize' && expectedAdaptive(scenario.toolpath) && isAdaptive !== true) {
    anomalies.push(`adaptive_path_not_adaptive:${String(strategyName)}`);
  }

  if (expectedFinish(scenario.toolpath) && typeof cycleTimeSec === 'number' && cycleTimeSec <= 0) {
    anomalies.push('invalid_cycle_time');
  }

  if (typeof confidence === 'number' && (confidence < 0 || confidence > 1)) {
    anomalies.push('invalid_confidence_range');
  }

  return {
    route,
    ok: anomalies.length === 0,
    status: payload.status,
    summary: route === 'optimize'
      ? `strategy=${String(strategyName ?? 'n/a')}`
      : `strategy=${String(strategyName ?? 'n/a')} confidence=${String(confidence ?? 'n/a')}`,
    strategyName: strategyName ?? undefined,
    strategySource: strategySource ?? undefined,
    isAdaptive: typeof isAdaptive === 'boolean' ? isAdaptive : undefined,
    confidence: typeof confidence === 'number' ? confidence : undefined,
    cycleTimeSec: typeof cycleTimeSec === 'number' ? cycleTimeSec : null,
    anomalies,
  } satisfies SweepCheck;
}

async function loadBundle(): Promise<CatalogBundle> {
  const [millMachines, latheMachines, materials, millTools, latheTools] = await Promise.all([
    fetchMachineCatalog('mill'),
    fetchMachineCatalog('lathe'),
    fetchMaterialCatalog(),
    fetchToolCatalog('mill'),
    fetchToolCatalog('lathe'),
  ]);

  return {
    machines: {
      mill: millMachines,
      lathe: latheMachines,
    },
    materials,
    tools: {
      mill: millTools,
      lathe: latheTools,
    },
  };
}

async function main() {
  const bundle = await loadBundle();
  const scenarios = buildRepresentativeScenarios(bundle);
  const holderCache = new Map<string, Awaited<ReturnType<typeof fetchToolHolderCatalog>>>();
  const records: SweepRecord[] = [];
  let quickCalls = 0;
  let orchestrateCalls = 0;
  let optimizeCalls = 0;

  for (const scenarioWithLicense of scenarios) {
    const { licenseId, ...scenario } = scenarioWithLicense;
    const params = await buildRequest(scenario, holderCache);
    const checks: SweepCheck[] = [];

    const quick = await callRoute('quick', params as Record<string, unknown>);
    quickCalls += 1;
    checks.push(analyzeResponse('quick', scenario, quick));

    const orchestrate = await callRoute('orchestrate', params as Record<string, unknown>);
    orchestrateCalls += 1;
    checks.push(analyzeResponse('orchestrate', scenario, orchestrate));

    if (quickCalls % 3 === 0) {
      const optimize = await callRoute('optimize', {
        ...params,
        objectives: ['productivity', 'surface_finish', 'tool_life'],
      });
      optimizeCalls += 1;
      checks.push(analyzeResponse('optimize', scenario, optimize));
    }

    records.push({
      scenario: {
        mode: scenario.mode,
        programmingId: scenario.programming.id,
        licenseId,
        toolpathId: scenario.toolpath.id,
        machineId: scenario.machine.id,
        materialId: scenario.material.id,
        toolId: scenario.tool.id,
      },
      checks,
    });

    if (records.length % 50 === 0) {
      console.log(JSON.stringify({
        progress: `${records.length}/${scenarios.length}`,
        quickCalls,
        orchestrateCalls,
        optimizeCalls,
      }));
    }
  }

  const anomalies = records.flatMap((record) =>
    record.checks
      .filter((check) => check.anomalies.length > 0)
      .map((check) => ({
        ...record.scenario,
        route: check.route,
        anomalies: check.anomalies,
        strategyName: check.strategyName ?? null,
        strategySource: check.strategySource ?? null,
      })),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    endpointBase: 'http://127.0.0.1:3001/api/v1/speed-feed',
    scenarioCount: records.length,
    quickCalls,
    orchestrateCalls,
    optimizeCalls,
    totalRouteCalls: quickCalls + orchestrateCalls + optimizeCalls,
    anomalyCount: anomalies.length,
    anomalies,
  };

  const outputDir = path.resolve('H:/PRISM/output');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'calculator-live-variability-sweep-2026-04-08.json');
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({ outputPath, ...report }, null, 2));
}

await main();
