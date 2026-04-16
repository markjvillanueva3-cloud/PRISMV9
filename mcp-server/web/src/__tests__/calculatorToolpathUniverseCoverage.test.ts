import { describe, expect, it } from 'vitest';
import {
  MACHINE_CATALOG,
  MATERIAL_CATALOG,
  PROGRAMMING_ENVIRONMENTS,
  TOOL_CATALOG,
  toolSupportsToolpath,
  type MachineCatalogItem,
  type MachineMode,
  type MaterialCatalogItem,
  type ToolCatalogItem,
} from '../data/calculatorWorkspace';
import {
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  licenseOptionsFor,
} from '../features/machine-workspace/programmingAuthorityContract';
import {
  HOLDER_PACKAGE_LIBRARY,
  holderPackageMatchesMachine,
} from '../pages/CalculatorPage';
import { buildCalculatorSetupPreview } from '../utils/calculatorSetupPreview';
import { buildCoolantStrategyRecommendation } from '../utils/calculatorCoolantStrategy';
import { buildCalculatorPrismModePlan } from '../utils/calculatorPrismMode';
import { buildCuttingParameterOptimization, deriveToolReachDefaults } from '../utils/calculatorParameterOptimization';
import { INVENTORY_OPERATIONS_WORKSPACE } from '../features/operating-system/inventoryOperationsFixtures';

type ConventionalMode = Extract<MachineMode, 'mill' | 'lathe'>;
type NontraditionalMode = Extract<MachineMode, 'edm' | 'wire_edm' | 'laser' | 'waterjet'>;
type ProgrammingToolpath = (typeof PROGRAMMING_ENVIRONMENTS)[number]['toolpaths'][number];

function machineSupportsToolpath(mode: ConventionalMode, machine: MachineCatalogItem, toolpath: ProgrammingToolpath) {
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

function findMachine(mode: MachineMode, toolpath: ProgrammingToolpath, tool?: ToolCatalogItem) {
  return MACHINE_CATALOG.find((machine) => {
    if (machine.mode !== mode) return false;
    if (tool && !supportsMachineTooling(tool, machine)) return false;
    if (mode === 'mill' || mode === 'lathe') {
      return machineSupportsToolpath(mode, machine, toolpath);
    }
    return true;
  });
}

function findTool(mode: MachineMode, toolpath: ProgrammingToolpath) {
  return TOOL_CATALOG.find((tool) => tool.mode === mode && toolSupportsToolpath(tool, toolpath));
}

function pickMaterial(mode: MachineMode) {
  if (mode === 'edm' || mode === 'wire_edm' || mode === 'laser' || mode === 'waterjet') {
    return MATERIAL_CATALOG.find((material) => material.group === 'nontraditional') ?? MATERIAL_CATALOG[0];
  }
  return MATERIAL_CATALOG.find((material) => material.group === 'steel')
    ?? MATERIAL_CATALOG.find((material) => material.group !== 'nontraditional')
    ?? MATERIAL_CATALOG[0];
}

function compatibleHolderPackages(machine: MachineCatalogItem, tool: ToolCatalogItem) {
  return HOLDER_PACKAGE_LIBRARY.filter((holder) =>
    holder.mode === machine.mode
    && holderPackageMatchesMachine(holder, machine)
    && (!holder.toolId || holder.toolId === tool.id),
  );
}

function expectFinitePositive(value: number, label: string) {
  expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
  expect(value, `${label} should be positive`).toBeGreaterThan(0);
}

describe('calculator toolpath universe coverage', () => {
  it('keeps every licensed toolpath attached to a legal machine/tool/material lane with valid defaults and planning output', () => {
    let validatedLicensedContexts = 0;

    for (const programming of PROGRAMMING_ENVIRONMENTS) {
      for (const license of licenseOptionsFor(programming)) {
        const licensedToolpaths = filterToolpathsForLicense(programming, programming.toolpaths, license.id);
        expect(licensedToolpaths.length, `${programming.id}:${license.id} should expose at least one toolpath`).toBeGreaterThan(0);

        for (const toolpath of licensedToolpaths) {
          const type = classifyToolpathType(toolpath);
          expect(type.id, `${programming.id}:${toolpath.id} should classify into a toolpath family`).not.toBe('');

          const tool = findTool(programming.mode, toolpath);
          expect(tool, `${programming.id}:${toolpath.id} should have a compatible tool`).toBeDefined();
          if (!tool) continue;

          const machine = findMachine(programming.mode, toolpath, tool);
          expect(machine, `${programming.id}:${toolpath.id} should have a compatible machine`).toBeDefined();
          if (!machine) continue;

          const material = pickMaterial(programming.mode);
          expect(material, `${programming.id}:${toolpath.id} should have a representative material`).toBeDefined();
          if (!material) continue;

          const defaults = getToolpathDefaults(toolpath, programming.mode);
          expect(defaults, `${programming.id}:${toolpath.id} should produce defaults`).not.toBeNull();
          if (!defaults) continue;

          const toolDiameterMm = Math.max(tool.defaultDiameter, 0.2);
          const docMm = defaults.isAbsolute ? defaults.docMm : Number((toolDiameterMm * defaults.docMm).toFixed(3));
          const wocMm = defaults.isAbsolute ? defaults.wocMm : Number((toolDiameterMm * defaults.wocMm).toFixed(3));

          if (programming.mode === 'mill' || programming.mode === 'lathe') {
            expectFinitePositive(docMm, `${programming.id}:${toolpath.id}:doc`);
            expectFinitePositive(wocMm, `${programming.id}:${toolpath.id}:woc`);

            const reachDefaults = deriveToolReachDefaults(tool, toolDiameterMm, programming.mode);
            const optimized = buildCuttingParameterOptimization({
              machineMode: programming.mode,
              machine,
              material,
              tool,
              toolpath,
              toolpathTypeId: type.id,
              operationId: toolpath.operationId,
              holderStyleId: 'machine-standard',
              stabilityId: 'balanced',
              coolantId: machine.coolantOptionIds[0] ?? 'flood',
              toolDiameterMm,
              currentDocMm: docMm,
              currentWocMm: wocMm,
              currentLocMm: reachDefaults.fluteLengthMm,
              currentStickoutMm: reachDefaults.stickoutMm,
              stockZMm: Math.max(docMm * 4, toolDiameterMm * 2),
            });

            expectFinitePositive(optimized.recommendedDocMm, `${programming.id}:${toolpath.id}:recommendedDoc`);
            expectFinitePositive(optimized.recommendedLocMm, `${programming.id}:${toolpath.id}:recommendedLoc`);
            expectFinitePositive(optimized.recommendedStickoutMm, `${programming.id}:${toolpath.id}:recommendedStickout`);
            expect(optimized.recommendedStickoutMm).toBeGreaterThanOrEqual(optimized.recommendedLocMm);
          }

          const coolantRecommendation = buildCoolantStrategyRecommendation({
            machineMode: programming.mode,
            material,
            tool,
            toolpath,
            finishTarget:
              /finish/i.test(toolpath.label) || type.id === 'finishing' || type.id === 'turning_finish'
                ? 'tight-finish'
                : /rough/i.test(toolpath.label) || type.id === 'roughing' || type.id === 'turning_rough'
                  ? 'high-removal'
                  : 'general',
            currentCoolantId: machine.coolantOptionIds[0],
            availableCoolantOptions: machine.coolantOptionIds.map((id) => ({ id, label: id })),
            toolDiameterMm,
            docMm: Math.max(docMm, 0.1),
            wocMm: Math.max(wocMm, 0.05),
          });
          expect(machine.coolantOptionIds.includes(coolantRecommendation.recommendedId)).toBe(true);

          const holders = compatibleHolderPackages(machine, tool);
          const setupPreview = buildCalculatorSetupPreview({
            machineMode: programming.mode,
            machine,
            spindleOption: { label: machine.spindleLabel },
            holderPackage: holders[0] ?? null,
            tool,
            material,
            toolpath,
            toolDiameterMm,
            docMm: Math.max(docMm, 0.1),
            wocMm: Math.max(wocMm, 0.05),
            stockXMm: Math.max(toolDiameterMm * 6, 12),
            stockYMm: Math.max(toolDiameterMm * 4, 10),
            stockZMm: Math.max(docMm * 4, toolDiameterMm * 2, 8),
            coolantId: coolantRecommendation.recommendedId,
            coolantRecommendation,
          });

          expect(Number.isFinite(setupPreview.dimensions.toolCutDiameterMm)).toBe(true);
          expect(setupPreview.dimensions.toolCutDiameterMm).toBeGreaterThan(0);
          expect(Array.isArray(setupPreview.risks)).toBe(true);

          const prismPlan = buildCalculatorPrismModePlan({
            machineMode: programming.mode,
            machine,
            material,
            tool,
            toolpath,
            toolpathTypeId: type.id,
            programmingLabel: programming.label,
            finishTarget:
              type.id === 'finishing' || type.id === 'surface_finish' || type.id === 'turning_finish'
                ? 'tight-finish'
                : type.id === 'roughing' || type.id === 'turning_rough'
                  ? 'high-removal'
                  : 'general',
            stockShape: 'block',
            stockSource: 'shop-rack',
            currentSetupSource: 'recommended',
            currentCoolantId: machine.coolantOptionIds[0] ?? coolantRecommendation.recommendedId,
            availableCoolantOptions: machine.coolantOptionIds.map((id) => ({ id, label: id, detail: id })),
            toolDiameterMm,
            docMm: Math.max(docMm, 0.1),
            wocMm: Math.max(wocMm, 0.05),
            compatibleHolderPackages: holders,
            currentHolderStyleId: holders[0]?.holderStyleIds?.[0] ?? 'machine-standard',
            currentHolderPackageId: holders[0]?.id ?? '',
            recommendedFeatureIds: [],
            currentFeatureIds: [],
            controllerCapabilityOptions: machine.controllerCapabilityOptions ?? [],
            currentControllerCapabilityIds: [],
            defaultMachineProfile: null,
            inventoryWorkspace: INVENTORY_OPERATIONS_WORKSPACE,
            result: {
              confidence: 0.82,
              ra: type.id.includes('finish') || type.id === 'skim' ? 0.8 : 2.4,
              toolLife: 28,
              powerKw: programming.mode === 'mill' || programming.mode === 'lathe' ? 6.5 : undefined,
              mrr: programming.mode === 'mill' || programming.mode === 'lathe' ? 24 : undefined,
            },
            purchasingHrefBase: '/purchasing',
          });

          expect(prismPlan.summary).toContain(machine.model);
          expect(prismPlan.summary).toContain(toolpath.label);
          validatedLicensedContexts += 1;
        }
      }
    }

    const expectedLicensedContexts = PROGRAMMING_ENVIRONMENTS.reduce(
      (sum, programming) =>
        sum + licenseOptionsFor(programming).reduce(
          (licenseSum, license) => licenseSum + filterToolpathsForLicense(programming, programming.toolpaths, license.id).length,
          0,
        ),
      0,
    );

    expect(validatedLicensedContexts).toBe(expectedLicensedContexts);
    expect(validatedLicensedContexts).toBeGreaterThan(80);
  });
});
