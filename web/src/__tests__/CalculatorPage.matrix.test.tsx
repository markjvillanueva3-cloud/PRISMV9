// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  MACHINE_CATALOG,
  MATERIAL_CATALOG,
  PROGRAMMING_ENVIRONMENTS,
  TOOL_CATALOG,
  coolantOptionsForMode,
  toolSupportsToolpath,
  type MachineCatalogItem,
  type MachineMode,
} from '../data/calculatorWorkspace';
import {
  buildToolpathTypeOptions,
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  licenseOptionsFor,
  resolveProgrammingSelectionState,
} from '../pages/CalculatorPage';
import { getSurfaceFinishPreview, SURFACE_FINISH_PRESETS } from '../utils/calculatorSurfaceFinish';

const REQUIRED_FERROUS_IDS = [
  'h13',
  'a2',
  's7',
  'o2',
  'd2',
  '4140',
  '4140-ph',
  '1018',
  '1020',
  '52100',
  'a36',
  '304',
  '316',
  '17-4ph',
] as const;

const COMMON_BASELINE_FERROUS_IDS = [
  '1045',
  '12l14',
  '4130',
  '4340',
  '8620',
  '303',
  '416',
  '420',
  '15-5ph',
  'p20',
] as const;

type FerrousMode = Extract<MachineMode, 'mill' | 'lathe'>;

interface MatrixRow {
  mode: FerrousMode;
  machineId: string;
  materialId: string;
  programmingId: string;
  licenseTierId: string;
  toolpathId: string;
  toolId: string;
  coolantId: string;
  docMm: number;
  wocMm: number;
}

interface MatrixSummary {
  rows: MatrixRow[];
  perModeCount: Record<FerrousMode, number>;
  perMaterialCount: Map<string, number>;
  perToolpathCount: Map<string, number>;
}

let matrixCache: MatrixSummary | null = null;

function chooseCoolant(machine: MachineCatalogItem, idealCoolant: string) {
  const lower = idealCoolant.toLowerCase();
  const preferenceOrder = [
    lower.includes('tsc') ? 'tsc' : null,
    lower.includes('through') ? 'tsc' : null,
    lower.includes('flood') ? 'flood' : null,
    lower.includes('mist') ? 'mist' : null,
    lower.includes('air') ? 'air' : null,
  ].filter((value): value is string => Boolean(value));

  return preferenceOrder.find((candidate) => machine.coolantOptionIds.includes(candidate as never)) ?? machine.coolantOptionIds[0];
}

function machineSupportsToolpath(mode: FerrousMode, machine: MachineCatalogItem, toolpath: { label: string; path: string }) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  if (mode === 'mill') {
    if (/swarf|simultaneous|5-axis|5x|multi-axis|variable contour/i.test(signature)) {
      return machine.machineTypeId.includes('_5');
    }
    return true;
  }

  if (/swiss/i.test(signature)) {
    return machine.machineTypeId === 'lathe_swiss';
  }
  if (/live|mill-turn/i.test(signature)) {
    return Boolean(machine.toolingLayout?.liveTooling);
  }
  if (/sync/i.test(signature)) {
    return machine.machineTypeId === 'lathe_multitask' || machine.machineTypeId === 'lathe_subspindle' || machine.machineTypeId === 'lathe_swiss';
  }
  return true;
}

function buildLogicalMatrix(): MatrixSummary {
  const rows: MatrixRow[] = [];
  const perMaterialCount = new Map<string, number>();
  const perToolpathCount = new Map<string, number>();
  const perModeCount: Record<FerrousMode, number> = { mill: 0, lathe: 0 };

  const ferrousMaterials = MATERIAL_CATALOG.filter(
    (material) => material.group === 'steel' || material.group === 'tool_steel' || material.group === 'stainless',
  );

  (['mill', 'lathe'] as const).forEach((mode) => {
    const machines = MACHINE_CATALOG.filter((machine) => machine.mode === mode);
    const tools = TOOL_CATALOG.filter((tool) => tool.mode === mode);
    const allowedCoolants = new Set(coolantOptionsForMode(mode).map((option) => option.id));
    const programmingPackages = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === mode);

    programmingPackages.forEach((programming) => {
      const licenseOptions = licenseOptionsFor(programming);

      licenseOptions.forEach((license) => {
        const licensedToolpaths = filterToolpathsForLicense(programming, programming.toolpaths, license.id);
        expect(licensedToolpaths.length).toBeGreaterThan(0);

        const typeOptions = buildToolpathTypeOptions(licensedToolpaths);
        expect(typeOptions[0]?.id).toBe('all');

        licensedToolpaths.forEach((toolpath) => {
          const compatibleMachines = machines.filter((machine) => machineSupportsToolpath(mode, machine, toolpath));
          const compatibleTools = tools.filter((tool) => toolSupportsToolpath(tool, toolpath));

          expect(compatibleMachines.length).toBeGreaterThan(0);
          expect(compatibleTools.length).toBeGreaterThan(0);

          const type = classifyToolpathType(toolpath);
          expect(typeOptions.some((option) => option.id === type.id)).toBe(true);

          const selection = resolveProgrammingSelectionState({
            programming,
            requestedLicenseTierId: license.id,
            requestedToolpathTypeId: type.id,
            requestedToolpathId: toolpath.id,
          });
          expect(selection.licenseTierId).toBe(license.id);
          expect(selection.toolpathId).toBe(toolpath.id);

          const defaults = getToolpathDefaults(toolpath, mode);
          expect(defaults).not.toBeNull();

          compatibleMachines.forEach((machine) => {
            expect(machine.controllerOptions.length).toBeGreaterThan(0);
            expect(machine.spindleOptions.length).toBeGreaterThan(0);
            expect(machine.coolantOptionIds.length).toBeGreaterThan(0);
            machine.coolantOptionIds.forEach((coolant) => expect(allowedCoolants.has(coolant)).toBe(true));

            ferrousMaterials.forEach((material) => {
              expect(material.baseSfm).toBeGreaterThan(0);
              expect(material.idealCoolant.length).toBeGreaterThan(0);

              const coolantId = chooseCoolant(machine, material.idealCoolant);
              expect(machine.coolantOptionIds.includes(coolantId as never)).toBe(true);

              compatibleTools.forEach((tool) => {
                const docMm = defaults?.isAbsolute
                  ? defaults.docMm
                  : Number((tool.defaultDiameter * (defaults?.docMm ?? 0)).toFixed(2));
                const wocMm = defaults?.isAbsolute
                  ? defaults.wocMm
                  : Number((tool.defaultDiameter * (defaults?.wocMm ?? 0)).toFixed(2));

                expect(Number.isFinite(docMm)).toBe(true);
                expect(Number.isFinite(wocMm)).toBe(true);
                expect(docMm).toBeGreaterThan(0);
                expect(wocMm).toBeGreaterThan(0);
                expect(tool.defaultDiameter).toBeGreaterThan(0);
                expect(tool.defaultFlutes).toBeGreaterThan(0);

                rows.push({
                  mode,
                  machineId: machine.id,
                  materialId: material.id,
                  programmingId: programming.id,
                  licenseTierId: license.id,
                  toolpathId: toolpath.id,
                  toolId: tool.id,
                  coolantId,
                  docMm,
                  wocMm,
                });

                perModeCount[mode] += 1;
                perMaterialCount.set(material.id, (perMaterialCount.get(material.id) ?? 0) + 1);
                perToolpathCount.set(toolpath.id, (perToolpathCount.get(toolpath.id) ?? 0) + 1);
              });
            });
          });
        });
      });
    });
  });

  return { rows, perModeCount, perMaterialCount, perToolpathCount };
}

function getLogicalMatrix(): MatrixSummary {
  if (!matrixCache) {
    matrixCache = buildLogicalMatrix();
  }
  return matrixCache;
}

describe('CalculatorPage logical mill/lathe matrix', () => {
  it('exposes the requested common ferrous grades in the real calculator catalog', () => {
    const materialIds = new Set(MATERIAL_CATALOG.map((material) => material.id));
    const missing = REQUIRED_FERROUS_IDS.filter((id) => !materialIds.has(id));
    expect(missing).toEqual([]);
  });

  it('keeps the broader common ferrous baseline available for serious shop coverage', () => {
    const materialIds = new Set(MATERIAL_CATALOG.map((material) => material.id));
    const missing = COMMON_BASELINE_FERROUS_IDS.filter((id) => !materialIds.has(id));
    expect(missing).toEqual([]);
  });

  it('covers distinct mill and lathe tool families for the major operation lanes', () => {
    const millTools = TOOL_CATALOG.filter((tool) => tool.mode === 'mill');
    const latheTools = TOOL_CATALOG.filter((tool) => tool.mode === 'lathe');

    expect(millTools.length).toBeGreaterThanOrEqual(8);
    expect(latheTools.length).toBeGreaterThanOrEqual(6);

    ['face_milling', 'roughing', 'slot_milling', 'shoulder_milling', 'finishing', 'drilling'].forEach((operationId) => {
      expect(millTools.some((tool) => (tool.supportedOperations ?? [tool.operation]).includes(operationId))).toBe(true);
    });

    ['turning_rough', 'turning_finish', 'grooving', 'boring'].forEach((operationId) => {
      expect(latheTools.some((tool) => (tool.supportedOperations ?? [tool.operation]).includes(operationId))).toBe(true);
    });
  });

  it('builds thousands of logical mill/lathe combinations across materials, tooling, and toolpaths', () => {
    const matrix = getLogicalMatrix();

    expect(matrix.rows.length).toBeGreaterThan(10000);
    expect(matrix.perModeCount.mill).toBeGreaterThan(5000);
    expect(matrix.perModeCount.lathe).toBeGreaterThan(2000);

    REQUIRED_FERROUS_IDS.forEach((materialId) => {
      expect(matrix.perMaterialCount.get(materialId)).toBeGreaterThan(0);
    });

    COMMON_BASELINE_FERROUS_IDS.forEach((materialId) => {
      expect(matrix.perMaterialCount.get(materialId)).toBeGreaterThan(0);
    });

    expect(matrix.perToolpathCount.get('mc-dynamic-mill')).toBeGreaterThan(0);
    expect(matrix.perToolpathCount.get('f360-turn-rough')).toBeGreaterThan(0);
    expect(matrix.perToolpathCount.get('prism-featureflow-rough')).toBeGreaterThan(0);
    expect(matrix.perToolpathCount.get('prism-syncguard-rough')).toBeGreaterThan(0);
  }, 45000);

  it('keeps desired-finish forecasting logical across thousands of ferrous calculator combinations', () => {
    const matrix = getLogicalMatrix();
    const previewPresets = SURFACE_FINISH_PRESETS.filter((preset) =>
      ['general-production', 'bearing-seat', 'precision-finish'].includes(preset.id),
    );

    let previewCount = 0;

    matrix.rows.forEach((row, index) => {
      if (index % 2 !== 0) return;

      const machine = MACHINE_CATALOG.find((item) => item.id === row.machineId);
      const material = MATERIAL_CATALOG.find((item) => item.id === row.materialId);
      const tool = TOOL_CATALOG.find((item) => item.id === row.toolId);
      const programming = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === row.programmingId);
      const toolpath = programming?.toolpaths.find((item) => item.id === row.toolpathId);
      const defaults = toolpath ? getToolpathDefaults(toolpath, row.mode) : null;
      const toolpathTypeId = toolpath ? classifyToolpathType(toolpath).id : 'general';

      expect(machine).toBeDefined();
      expect(material).toBeDefined();
      expect(tool).toBeDefined();
      expect(programming).toBeDefined();
      expect(toolpath).toBeDefined();

      previewPresets.forEach((preset) => {
        const preview = getSurfaceFinishPreview({
          machineMode: row.mode,
          machine,
          material,
          tool,
          toolpath,
          toolpathTypeId,
          programmingLabel: programming?.label,
          coolantId: row.coolantId,
          finishTarget: preset.raUm <= 1 ? 'tight-finish' : preset.raUm >= 4.5 ? 'high-removal' : 'general',
          desiredRaUm: preset.raUm,
          toolDiameterMm: tool?.defaultDiameter ?? 12,
          docMm: row.docMm,
          wocMm: row.wocMm,
          defaults,
        });

        expect(preview.expectedMinRaUm).toBeGreaterThan(0);
        expect(preview.expectedMaxRaUm).toBeGreaterThanOrEqual(preview.expectedMinRaUm);
        expect(preview.verdict).toMatch(/ready|stretch|unlikely|margin/);

        if ((toolpathTypeId === 'roughing' || toolpathTypeId === 'turning_rough') && preset.raUm <= 0.4) {
          expect(preview.verdict).not.toBe('ready');
          expect(preview.verdict).not.toBe('margin');
        }

        if ((toolpathTypeId === 'surface_finish' || toolpathTypeId === 'turning_finish' || toolpathTypeId === 'multiaxis') && preset.raUm >= 1.6) {
          expect(preview.verdict).not.toBe('unlikely');
        }

        previewCount += 1;
      });
    });

    expect(previewCount).toBeGreaterThan(15000);
  }, 45000);
});
