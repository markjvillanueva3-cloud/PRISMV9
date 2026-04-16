import fs from 'node:fs/promises';
import path from 'node:path';

import {
  fetchMachineCatalog,
  fetchMaterialCatalog,
  fetchProgrammingCatalog,
  fetchToolCatalog,
  fetchToolHolderCatalog,
  type HolderPackageOption,
} from '../src/api/calculatorData.ts';
import { buildCalculatorSpeedFeedParams } from '../src/utils/calculatorSpeedFeedContract.ts';
import {
  toolSupportsToolpath,
  type MachineCatalogItem,
  type MachineMode,
  type MaterialCatalogItem,
  type ProgrammingEnvironmentOption,
  type ToolCatalogItem,
} from '../src/data/calculatorWorkspace.ts';

const BASE_URL = process.env.PRISM_SPEEDFEED_URL ?? 'http://127.0.0.1:3001/api/v1/speed-feed';
const OUT_DIR = path.resolve('H:/PRISM/output');
const NOW = new Date();
const DATE_STAMP = NOW.toISOString().slice(0, 10);

type ConventionalMode = Extract<MachineMode, 'mill' | 'lathe'>;
type ProgrammingToolpath = ProgrammingEnvironmentOption['toolpaths'][number];

type QuickValue = {
  cutting_speed_mpm?: number;
  spindle_rpm?: number;
  feed_rate_mmmin?: number;
  mrr_cm3min?: number;
  power_kw?: number;
  tool_life_min?: number;
  surface_finish_Ra_um?: number;
  deflection_um?: number;
  overall_confidence?: number;
  resolved_cam_strategy?: {
    strategy_name?: { value?: string; source?: string };
    is_adaptive?: { value?: boolean };
    ae_pct?: { value?: number };
  };
  safety_checks?: Array<{ name?: string; passed?: boolean }>;
  limiting_factors?: Array<{ severity?: string }>;
};

type EndpointSummary = {
  total: number;
  success: number;
  failed: number;
};

type ModeSummary = {
  quick: EndpointSummary;
  orchestrate: EndpointSummary;
  optimize: EndpointSummary;
};

type ComparisonAggregate = {
  compared: number;
  betterMrr: number;
  betterToolLife: number;
  betterFinish: number;
  saferOrEqual: number;
  avgDeltaMrrPct: number;
  avgDeltaToolLifePct: number;
  avgDeltaRaPct: number;
};

type AuditContext = {
  mode: MachineMode;
  machine: MachineCatalogItem;
  material: MaterialCatalogItem;
  programming: ProgrammingEnvironmentOption;
  toolpath: ProgrammingToolpath;
  tool: ToolCatalogItem;
  holderPackage: HolderPackageOption | null;
};

type ContextResult = {
  mode: MachineMode;
  machineId: string;
  materialId: string;
  programmingId: string;
  toolpathId: string;
  toolId: string;
  quickOk: boolean;
  orchestrateOk?: boolean;
  optimizeOk?: boolean;
  quickError?: string;
  quickStrategy?: string;
  quickStrategySource?: string;
  quickConfidence?: number;
  quickMrr?: number;
  quickRa?: number;
  quickToolLife?: number;
  conventionalComparison?: {
    deltaMrrPct: number | null;
    deltaToolLifePct: number | null;
    deltaRaPct: number | null;
    betterMrr: boolean;
    betterToolLife: boolean;
    betterFinish: boolean;
    saferOrEqual: boolean;
  };
};

function machineSupportsToolpath(
  mode: ConventionalMode,
  machine: MachineCatalogItem,
  toolpath: ProgrammingToolpath,
) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  if (mode === 'mill') {
    if (/swarf|simultaneous|5-axis|5x|multi-axis|multiaxis|variable contour/.test(signature)) {
      return machine.machineTypeId.includes('5') || /5|trt/i.test(machine.axes);
    }
    if (/horizontal/.test(signature)) {
      return /horizontal/i.test(machine.machineTypeLabel) || machine.taxonomy?.orientation === 'horizontal';
    }
    return true;
  }

  if (/swiss/.test(signature)) {
    return machine.machineTypeId === 'lathe_swiss' || machine.taxonomy?.axisClass === 'swiss';
  }
  if (/live|mill-turn|milling/.test(signature)) {
    return Boolean(machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead);
  }
  if (/sync|sub spindle|sub-spindle/.test(signature)) {
    return Boolean(machine.toolingLayout?.hasSubSpindle) || machine.machineTypeId === 'lathe_multitask';
  }
  return true;
}

function supportsMachineTooling(tool: ToolCatalogItem, machine: MachineCatalogItem) {
  if (!tool.requiresLiveTooling) return true;
  return Boolean(machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead);
}

function pickRepresentativeMaterials(mode: MachineMode, materials: MaterialCatalogItem[]) {
  if (mode === 'edm' || mode === 'wire_edm' || mode === 'laser' || mode === 'waterjet') {
    return materials.filter((material) => material.group === 'nontraditional').slice(0, 2);
  }

  const preferredGroups = [
    'steel',
    'tool_steel',
    'stainless',
    'cast',
    'aluminum',
    'titanium',
    'superalloy',
    'copper',
  ];

  const selections: MaterialCatalogItem[] = [];
  for (const group of preferredGroups) {
    const material = materials.find((candidate) => candidate.group === group);
    if (material) selections.push(material);
  }
  return selections;
}

function compatibleMachines(mode: MachineMode, machines: MachineCatalogItem[], toolpath: ProgrammingToolpath, tool: ToolCatalogItem) {
  return machines.filter((machine) => {
    if (machine.mode !== mode) return false;
    if (!supportsMachineTooling(tool, machine)) return false;
    if (mode === 'mill' || mode === 'lathe') {
      return machineSupportsToolpath(mode, machine, toolpath);
    }
    return true;
  });
}

function compatibleTools(mode: MachineMode, tools: ToolCatalogItem[], toolpath: ProgrammingToolpath) {
  return tools.filter((tool) => tool.mode === mode && toolSupportsToolpath(tool, toolpath));
}

function toolDiameterFor(tool: ToolCatalogItem, mode: MachineMode) {
  if (tool.defaultDiameter > 0) return tool.defaultDiameter;
  if (tool.shankDiameterMm && tool.shankDiameterMm > 0) return tool.shankDiameterMm;
  if (tool.cornerRadiusMm && tool.cornerRadiusMm > 0) return Math.max(tool.cornerRadiusMm * 6, 1);
  if (tool.noseRadiusMm && tool.noseRadiusMm > 0) return Math.max(tool.noseRadiusMm * 8, 1);
  if (mode === 'wire_edm') return 0.25;
  if (mode === 'edm') return 6;
  if (mode === 'laser') return 1.2;
  if (mode === 'waterjet') return 0.9;
  if (mode === 'lathe') return 12;
  return 10;
}

function docFor(mode: MachineMode, tool: ToolCatalogItem, diameterMm: number, toolpath: ProgrammingToolpath) {
  if (mode === 'wire_edm' || mode === 'laser' || mode === 'waterjet') return 1;
  if (mode === 'edm') return Math.max(diameterMm * 0.6, 2);
  if (/finish|parallel|scallop|flow|swarf|skim/i.test(toolpath.label)) return Math.max(diameterMm * 0.08, 0.2);
  if (/drill|tap|ream/i.test(tool.operation)) return Math.max(diameterMm * 1.2, 3);
  return Math.max(diameterMm, 1);
}

function wocFor(mode: MachineMode, diameterMm: number, toolpath: ProgrammingToolpath) {
  if (mode === 'wire_edm' || mode === 'laser' || mode === 'waterjet') return 0.2;
  if (mode === 'edm') return Math.max(diameterMm * 0.25, 0.5);
  if (/adaptive|dynamic|trochoid|vortex|waveform|volumill|imachining/i.test(`${toolpath.id} ${toolpath.label} ${toolpath.path}`)) {
    return Math.max(diameterMm * 0.1, 0.2);
  }
  if (/finish|parallel|scallop|flow|swarf|skim/i.test(toolpath.label)) return Math.max(diameterMm * 0.05, 0.05);
  if (/slot/i.test(toolpath.label)) return Math.max(diameterMm * 0.75, 0.3);
  return Math.max(diameterMm * 0.3, 0.2);
}

function stockFor(mode: MachineMode, docMm: number, diameterMm: number) {
  if (mode === 'lathe') {
    return { stockXm: Math.max(diameterMm * 8, 80), stockYm: Math.max(diameterMm * 3, 30), stockZm: Math.max(diameterMm * 3, 30) };
  }
  if (mode === 'wire_edm' || mode === 'laser' || mode === 'waterjet') {
    return { stockXm: 120, stockYm: 80, stockZm: Math.max(docMm * 6, 8) };
  }
  return {
    stockXm: Math.max(diameterMm * 8, 80),
    stockYm: Math.max(diameterMm * 5, 50),
    stockZm: Math.max(docMm * 5, diameterMm * 2, 20),
  };
}

function finishTarget(toolpath: ProgrammingToolpath) {
  const signature = `${toolpath.id} ${toolpath.label} ${toolpath.path}`.toLowerCase();
  if (/finish|parallel|scallop|flow|swarf|skim/.test(signature)) return 'tight-finish' as const;
  if (/rough|adaptive|dynamic|trochoid|vortex|waveform|volumill|imachining/.test(signature)) return 'high-removal' as const;
  return 'general' as const;
}

async function callEndpoint<T>(endpoint: 'quick' | 'orchestrate' | 'optimize', payload: Record<string, unknown>, objectives?: string[]) {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint === 'optimize' ? { ...payload, objectives: objectives ?? ['productivity', 'tool_life', 'surface_finish'] } : payload),
  });
  const json = await response.json();
  return json as T;
}

function pctDelta(value: number | undefined, baseline: number | undefined) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || !baseline) return null;
  return Number((((value - baseline) / baseline) * 100).toFixed(3));
}

function safetySeverityCount(value: QuickValue | undefined) {
  return (value?.limiting_factors ?? []).filter((item) => item?.severity === 'critical').length;
}

async function main() {
  const health = await fetch('http://127.0.0.1:3001/health').then((res) => res.ok).catch(() => false);
  if (!health) {
    throw new Error('PRISM backend on 3001 is not healthy.');
  }

  const [millMachines, latheMachines, edmMachines, wireMachines, laserMachines, waterjetMachines] = await Promise.all([
    fetchMachineCatalog('mill'),
    fetchMachineCatalog('lathe'),
    fetchMachineCatalog('edm'),
    fetchMachineCatalog('wire_edm'),
    fetchMachineCatalog('laser'),
    fetchMachineCatalog('waterjet'),
  ]);
  const [materials, millProgramming, latheProgramming, edmProgramming, wireProgramming, laserProgramming, waterjetProgramming] = await Promise.all([
    fetchMaterialCatalog(),
    fetchProgrammingCatalog('mill'),
    fetchProgrammingCatalog('lathe'),
    fetchProgrammingCatalog('edm'),
    fetchProgrammingCatalog('wire_edm'),
    fetchProgrammingCatalog('laser'),
    fetchProgrammingCatalog('waterjet'),
  ]);
  const [millTools, latheTools, edmTools, wireTools, laserTools, waterjetTools] = await Promise.all([
    fetchToolCatalog('mill'),
    fetchToolCatalog('lathe'),
    fetchToolCatalog('edm'),
    fetchToolCatalog('wire_edm'),
    fetchToolCatalog('laser'),
    fetchToolCatalog('waterjet'),
  ]);

  const machinesByMode: Record<MachineMode, MachineCatalogItem[]> = {
    mill: millMachines,
    lathe: latheMachines,
    edm: edmMachines,
    wire_edm: wireMachines,
    laser: laserMachines,
    waterjet: waterjetMachines,
  };
  const programmingByMode: Record<MachineMode, ProgrammingEnvironmentOption[]> = {
    mill: millProgramming,
    lathe: latheProgramming,
    edm: edmProgramming,
    wire_edm: wireProgramming,
    laser: laserProgramming,
    waterjet: waterjetProgramming,
  };
  const toolsByMode: Record<MachineMode, ToolCatalogItem[]> = {
    mill: millTools,
    lathe: latheTools,
    edm: edmTools,
    wire_edm: wireTools,
    laser: laserTools,
    waterjet: waterjetTools,
  };

  const holderCache = new Map<string, HolderPackageOption[]>();
  const contextResults: ContextResult[] = [];

  const modeSummaries: Record<MachineMode, ModeSummary> = {
    mill: { quick: { total: 0, success: 0, failed: 0 }, orchestrate: { total: 0, success: 0, failed: 0 }, optimize: { total: 0, success: 0, failed: 0 } },
    lathe: { quick: { total: 0, success: 0, failed: 0 }, orchestrate: { total: 0, success: 0, failed: 0 }, optimize: { total: 0, success: 0, failed: 0 } },
    edm: { quick: { total: 0, success: 0, failed: 0 }, orchestrate: { total: 0, success: 0, failed: 0 }, optimize: { total: 0, success: 0, failed: 0 } },
    wire_edm: { quick: { total: 0, success: 0, failed: 0 }, orchestrate: { total: 0, success: 0, failed: 0 }, optimize: { total: 0, success: 0, failed: 0 } },
    laser: { quick: { total: 0, success: 0, failed: 0 }, orchestrate: { total: 0, success: 0, failed: 0 }, optimize: { total: 0, success: 0, failed: 0 } },
    waterjet: { quick: { total: 0, success: 0, failed: 0 }, orchestrate: { total: 0, success: 0, failed: 0 }, optimize: { total: 0, success: 0, failed: 0 } },
  };

  const comparison: ComparisonAggregate = {
    compared: 0,
    betterMrr: 0,
    betterToolLife: 0,
    betterFinish: 0,
    saferOrEqual: 0,
    avgDeltaMrrPct: 0,
    avgDeltaToolLifePct: 0,
    avgDeltaRaPct: 0,
  };
  const mrrDeltas: number[] = [];
  const toolLifeDeltas: number[] = [];
  const raDeltas: number[] = [];

  const representativeContexts = new Map<string, AuditContext>();

  for (const mode of Object.keys(programmingByMode) as MachineMode[]) {
    const materialsForMode = pickRepresentativeMaterials(mode, materials);
    const programmingEnvironments = programmingByMode[mode];
    const tools = toolsByMode[mode];
    const machines = machinesByMode[mode];

    for (const programming of programmingEnvironments) {
      for (const toolpath of programming.toolpaths) {
        const compatibleToolList = compatibleTools(mode, tools, toolpath);
        if (compatibleToolList.length === 0) continue;
        const tool = compatibleToolList[0];
        const candidateMachines = compatibleMachines(mode, machines, toolpath, tool);
        if (candidateMachines.length === 0) continue;

        for (const machine of candidateMachines) {
          const holderKey = `${machine.id}:${tool.id}`;
          let holders = holderCache.get(holderKey);
          if (!holders) {
            holders = await fetchToolHolderCatalog({
              mode,
              layoutKind: machine.toolingLayout?.kind,
              spindleConnectionTypeId: machine.toolingLayout?.spindleConnectionTypeId,
              turretTypeId: machine.toolingLayout?.turretTypeId,
              liveTooling: machine.toolingLayout?.liveTooling,
              hasMillingHead: machine.toolingLayout?.hasMillingHead,
              turretCount: machine.toolingLayout?.turretCount,
              toolId: tool.id,
              toolOperation: tool.operation,
              toolGeometryClass: tool.geometryClass,
            }).catch(() => []);
            holderCache.set(holderKey, holders);
          }
          const holderPackage = holders[0] ?? null;

          for (const material of materialsForMode) {
            const diameterMm = toolDiameterFor(tool, mode);
            const docMm = docFor(mode, tool, diameterMm, toolpath);
            const wocMm = wocFor(mode, diameterMm, toolpath);
            const stock = stockFor(mode, docMm, diameterMm);
            const params = buildCalculatorSpeedFeedParams({
              machineMode: mode,
              operationId: toolpath.operationId,
              machine,
              material,
              tool,
              insertOption: null,
              programming,
              toolpath,
              spindleOption: machine.spindleOptions?.[0] ?? null,
              setupOption: null,
              holderPackage,
              coolantId: machine.coolantOptionIds[0] ?? 'flood',
              enabledMachineCoolantIds: machine.coolantOptionIds,
              workholdingPreset: null,
              workholdingId: null,
              workholdingCategoryId: null,
              stabilityId: 'balanced',
              toolDiameterMm: diameterMm,
              fluteLengthMm: tool.fluteLengthMm ?? Math.max(diameterMm * 2, 12),
              toolStickoutMm: Math.max(tool.overallLengthMm ?? diameterMm * 4, diameterMm * 3),
              desiredRaUm: finishTarget(toolpath) === 'tight-finish' ? 0.8 : finishTarget(toolpath) === 'high-removal' ? 3.2 : 1.6,
              docMm,
              wocMm,
              ...stock,
            } as Parameters<typeof buildCalculatorSpeedFeedParams>[0]);

            const result: ContextResult = {
              mode,
              machineId: machine.id,
              materialId: material.id,
              programmingId: programming.id,
              toolpathId: toolpath.id,
              toolId: tool.id,
              quickOk: false,
            };

            modeSummaries[mode].quick.total += 1;
            try {
              const quickJson = await callEndpoint<{ result?: { value?: QuickValue } }>('quick', params);
              const value = quickJson.result?.value;
              if (!value || !Number.isFinite(value.spindle_rpm) || !Number.isFinite(value.feed_rate_mmmin)) {
                throw new Error('Missing or invalid quick result values');
              }
              result.quickOk = true;
              result.quickStrategy = value.resolved_cam_strategy?.strategy_name?.value;
              result.quickStrategySource = value.resolved_cam_strategy?.strategy_name?.source;
              result.quickConfidence = value.overall_confidence;
              result.quickMrr = value.mrr_cm3min;
              result.quickRa = value.surface_finish_Ra_um;
              result.quickToolLife = value.tool_life_min;
              modeSummaries[mode].quick.success += 1;

              const familyKey = `${mode}:${toolpath.operationId}`;
              if (!representativeContexts.has(familyKey)) {
                representativeContexts.set(familyKey, { mode, machine, material, programming, toolpath, tool, holderPackage });
              }

              if (
                (mode === 'mill' || mode === 'lathe')
                && /adaptive|trochoidal|hsm|hpc/.test(params.strategy ?? '')
              ) {
                const conventionalJson = await callEndpoint<{ result?: { value?: QuickValue } }>('quick', {
                  ...params,
                  strategy: 'conventional',
                  cam_strategy: 'conventional',
                });
                const baseline = conventionalJson.result?.value;
                if (baseline) {
                  const deltaMrrPct = pctDelta(value.mrr_cm3min, baseline.mrr_cm3min);
                  const deltaToolLifePct = pctDelta(value.tool_life_min, baseline.tool_life_min);
                  const deltaRaPct = pctDelta(
                    baseline.surface_finish_Ra_um != null && value.surface_finish_Ra_um != null
                      ? baseline.surface_finish_Ra_um - value.surface_finish_Ra_um
                      : undefined,
                    baseline.surface_finish_Ra_um,
                  );
                  const saferOrEqual = safetySeverityCount(value) <= safetySeverityCount(baseline);
                  result.conventionalComparison = {
                    deltaMrrPct,
                    deltaToolLifePct,
                    deltaRaPct,
                    betterMrr: deltaMrrPct != null && deltaMrrPct > 0,
                    betterToolLife: deltaToolLifePct != null && deltaToolLifePct > 0,
                    betterFinish: deltaRaPct != null && deltaRaPct > 0,
                    saferOrEqual,
                  };
                  comparison.compared += 1;
                  if (result.conventionalComparison.betterMrr) comparison.betterMrr += 1;
                  if (result.conventionalComparison.betterToolLife) comparison.betterToolLife += 1;
                  if (result.conventionalComparison.betterFinish) comparison.betterFinish += 1;
                  if (saferOrEqual) comparison.saferOrEqual += 1;
                  if (deltaMrrPct != null) mrrDeltas.push(deltaMrrPct);
                  if (deltaToolLifePct != null) toolLifeDeltas.push(deltaToolLifePct);
                  if (deltaRaPct != null) raDeltas.push(deltaRaPct);
                }
              }
            } catch (error) {
              modeSummaries[mode].quick.failed += 1;
              result.quickError = error instanceof Error ? error.message : String(error);
            }

            contextResults.push(result);
          }
        }
      }
    }
  }

  for (const context of representativeContexts.values()) {
    const mode = context.mode;
    const diameterMm = toolDiameterFor(context.tool, mode);
    const docMm = docFor(mode, context.tool, diameterMm, context.toolpath);
    const wocMm = wocFor(mode, diameterMm, context.toolpath);
    const stock = stockFor(mode, docMm, diameterMm);
    const params = buildCalculatorSpeedFeedParams({
      machineMode: mode,
      operationId: context.toolpath.operationId,
      machine: context.machine,
      material: context.material,
      tool: context.tool,
      insertOption: null,
      programming: context.programming,
      toolpath: context.toolpath,
      spindleOption: context.machine.spindleOptions?.[0] ?? null,
      setupOption: null,
      holderPackage: context.holderPackage,
      coolantId: context.machine.coolantOptionIds[0] ?? 'flood',
      enabledMachineCoolantIds: context.machine.coolantOptionIds,
      workholdingPreset: null,
      workholdingId: null,
      workholdingCategoryId: null,
      stabilityId: 'balanced',
      toolDiameterMm: diameterMm,
      fluteLengthMm: context.tool.fluteLengthMm ?? Math.max(diameterMm * 2, 12),
      toolStickoutMm: Math.max(context.tool.overallLengthMm ?? diameterMm * 4, diameterMm * 3),
      desiredRaUm: finishTarget(context.toolpath) === 'tight-finish' ? 0.8 : finishTarget(context.toolpath) === 'high-removal' ? 3.2 : 1.6,
      docMm,
      wocMm,
      ...stock,
    } as Parameters<typeof buildCalculatorSpeedFeedParams>[0]);

    modeSummaries[mode].orchestrate.total += 1;
    try {
      const response = await callEndpoint<{ result?: { value?: QuickValue } }>('orchestrate', params);
      if (!response.result?.value) throw new Error('Missing orchestrate result');
      modeSummaries[mode].orchestrate.success += 1;
    } catch {
      modeSummaries[mode].orchestrate.failed += 1;
    }

    modeSummaries[mode].optimize.total += 1;
    try {
      const response = await callEndpoint<{ result?: { value?: { pareto_front?: unknown[]; recommended?: unknown } } }>('optimize', params, ['productivity', 'tool_life', 'surface_finish']);
      const value = response.result?.value;
      const paretoCount = Array.isArray(value?.pareto_front) ? value.pareto_front.length : 0;
      if (!value || (!value.recommended && paretoCount === 0)) {
        throw new Error('Missing optimize result');
      }
      modeSummaries[mode].optimize.success += 1;
    } catch {
      modeSummaries[mode].optimize.failed += 1;
    }
  }

  comparison.avgDeltaMrrPct = mrrDeltas.length ? Number((mrrDeltas.reduce((sum, value) => sum + value, 0) / mrrDeltas.length).toFixed(3)) : 0;
  comparison.avgDeltaToolLifePct = toolLifeDeltas.length ? Number((toolLifeDeltas.reduce((sum, value) => sum + value, 0) / toolLifeDeltas.length).toFixed(3)) : 0;
  comparison.avgDeltaRaPct = raDeltas.length ? Number((raDeltas.reduce((sum, value) => sum + value, 0) / raDeltas.length).toFixed(3)) : 0;

  const failures = contextResults.filter((entry) => !entry.quickOk).slice(0, 50);
  const strategySourceBreakdown = contextResults.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.quickStrategySource ?? 'missing';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const summary = {
    generatedAt: NOW.toISOString(),
    baseUrl: BASE_URL,
    totalContexts: contextResults.length,
    quickSuccess: contextResults.filter((entry) => entry.quickOk).length,
    quickFailures: contextResults.filter((entry) => !entry.quickOk).length,
    representedProgrammingPackages: Object.values(programmingByMode).flat().length,
    representedToolpaths: Object.values(programmingByMode).flatMap((programming) => programming.toolpaths).length,
    representedMachines: Object.values(machinesByMode).flat().length,
    representedMaterials: materials.length,
    representedTools: Object.values(toolsByMode).flat().length,
    modeSummaries,
    comparison,
    strategySourceBreakdown,
    sampleFailures: failures,
  };

  const jsonPath = path.join(OUT_DIR, `calculator-live-launch-audit-${DATE_STAMP}.json`);
  const mdPath = path.join(OUT_DIR, `calculator-live-launch-audit-${DATE_STAMP}.md`);

  const markdown = [
    '# Calculator Live Launch Audit',
    '',
    `- Generated: ${summary.generatedAt}`,
    `- Base URL: ${summary.baseUrl}`,
    `- Quick contexts: ${summary.totalContexts}`,
    `- Quick success: ${summary.quickSuccess}`,
    `- Quick failures: ${summary.quickFailures}`,
    `- Programming packages: ${summary.representedProgrammingPackages}`,
    `- Toolpaths: ${summary.representedToolpaths}`,
    `- Machines: ${summary.representedMachines}`,
    `- Materials: ${summary.representedMaterials}`,
    `- Tools: ${summary.representedTools}`,
    '',
    '## Endpoint Summary',
    '',
    ...Object.entries(summary.modeSummaries).map(([mode, stats]) =>
      `- ${mode}: quick ${stats.quick.success}/${stats.quick.total}, orchestrate ${stats.orchestrate.success}/${stats.orchestrate.total}, optimize ${stats.optimize.success}/${stats.optimize.total}`),
    '',
    '## PRISM vs Conventional Comparison',
    '',
    `- Compared adaptive/HSM-like contexts: ${comparison.compared}`,
    `- Better MRR count: ${comparison.betterMrr}`,
    `- Better tool life count: ${comparison.betterToolLife}`,
    `- Better finish count: ${comparison.betterFinish}`,
    `- Safer-or-equal count: ${comparison.saferOrEqual}`,
    `- Avg MRR delta vs conventional: ${comparison.avgDeltaMrrPct}%`,
    `- Avg tool life delta vs conventional: ${comparison.avgDeltaToolLifePct}%`,
    `- Avg finish delta vs conventional: ${comparison.avgDeltaRaPct}%`,
    '',
    '## Strategy Source Breakdown',
    '',
    ...Object.entries(strategySourceBreakdown).sort((a, b) => b[1] - a[1]).map(([source, count]) => `- ${source}: ${count}`),
    '',
    '## Sample Failures',
    '',
    ...(failures.length
      ? failures.map((failure) =>
          `- ${failure.mode} | ${failure.machineId} | ${failure.materialId} | ${failure.programmingId} | ${failure.toolpathId} | ${failure.toolId} => ${failure.quickError}`)
      : ['- None']),
    '',
  ].join('\n');

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify({ summary, contextResults }, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, `${markdown}\n`, 'utf8');

  console.log(JSON.stringify({ summary, jsonPath, mdPath }, null, 2));
}

await main();
