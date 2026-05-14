import { describe, expect, it, vi } from 'vitest';
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
  buildInsertOptionsForTool,
  inferToolBodyType,
  selectPreferredToolForToolpath,
} from '../utils/calculatorTooling';
import { INVENTORY_OPERATIONS_WORKSPACE } from '../features/operating-system/inventoryOperationsFixtures';
import {
  buildToolpathTypeOptions,
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  licenseOptionsFor,
  resolveProgrammingSelectionState,
} from '../features/machine-workspace/programmingAuthorityContract';
import {
  HOLDER_PACKAGE_LIBRARY,
  holderPackageMatchesMachine,
  holderPackageMatchesTool,
} from '../pages/CalculatorPage';
import { resolveMachineSelectionOptions } from '../utils/machineConfigurationOptions';
import { buildCoolantStrategyRecommendation } from '../utils/calculatorCoolantStrategy';
import { buildCalculatorPrismModePlan } from '../utils/calculatorPrismMode';
import { buildCalculatorSetupPreview } from '../utils/calculatorSetupPreview';
import { getSurfaceFinishPreview } from '../utils/calculatorSurfaceFinish';

type ConventionalMode = Extract<MachineMode, 'mill' | 'lathe'>;
type NontraditionalMode = Extract<MachineMode, 'edm' | 'wire_edm' | 'laser' | 'waterjet'>;
type ToolpathOption = (typeof PROGRAMMING_ENVIRONMENTS)[number]['toolpaths'][number];

function machineSupportsToolpath(mode: ConventionalMode, machine: MachineCatalogItem, toolpath: ToolpathOption) {
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

function normalizeInterfaceFamily(input?: string | null) {
  const text = input?.toLowerCase() ?? '';
  if (!text) return '';
  if (/iso[ -]?20/.test(text)) return 'iso20';
  if (/(cat|bt|ct)[ -]?40|big[ +]?plus.*40|40 taper/.test(text)) return 'cat40';
  if (/(cat|bt|ct)[ -]?50|big[ +]?plus.*50|50 taper/.test(text)) return 'cat50';
  if (/(bt|big[ +]?plus)[ -]?30|30 taper/.test(text)) return 'bt30';
  if (/hsk[ -]?[ce][ -]?40/.test(text) || /hsk[ -]?40/.test(text)) return 'hsk40';
  if (/hsk[ -]?63/.test(text)) return 'hsk63';
  if (/hsk[ -]?100/.test(text)) return 'hsk100';
  if (/capto.*c6|c6 capto/.test(text)) return 'capto-c6';
  if (/capto.*c8|c8 capto/.test(text)) return 'capto-c8';
  if (/vdi[ -]?40/.test(text)) return 'vdi40';
  if (/vdi[ -]?50/.test(text)) return 'vdi50';
  if (/bmt[ -]?65/.test(text)) return 'bmt65';
  return '';
}

function holderSupportsTool(
  holder: (typeof HOLDER_PACKAGE_LIBRARY)[number],
  tool: ToolCatalogItem,
) {
  if (!holderPackageMatchesTool(holder, tool)) return false;
  if (holder.toolId && holder.toolId !== tool.id) return false;
  const holderInterface = normalizeInterfaceFamily(holder.toolInterface ?? holder.spindleInterface);
  const toolInterface = normalizeInterfaceFamily(tool.holderInterface);
  if (holderInterface && toolInterface && holderInterface !== toolInterface) return false;
  if (tool.bodyType === 'indexable' && holder.holderStyleIds?.includes('shrink-fit')) return false;
  return true;
}

function chooseRepresentativeCoolant(
  machine: MachineCatalogItem,
  material: MaterialCatalogItem,
  tool: ToolCatalogItem,
  toolpath: ToolpathOption,
) {
  const recommendation = buildCoolantStrategyRecommendation({
    machineMode: machine.mode,
    material,
    tool,
    toolpath,
    finishTarget:
      /finish/i.test(toolpath.label) || toolpath.operationId === 'turning_finish'
        ? 'tight-finish'
        : /rough/i.test(toolpath.label) || toolpath.operationId === 'turning_rough'
          ? 'high-removal'
          : 'general',
    currentCoolantId: machine.coolantOptionIds[0],
    availableCoolantOptions: machine.coolantOptionIds.map((id) => ({ id, label: id })),
    toolDiameterMm: tool.defaultDiameter,
    docMm: tool.defaultDiameter * 0.25,
    wocMm: tool.defaultDiameter * 0.12,
  });

  expect(machine.coolantOptionIds.includes(recommendation.recommendedId)).toBe(true);
  return recommendation;
}

function buildDefaults(toolpath: ToolpathOption, mode: ConventionalMode, tool: ToolCatalogItem) {
  const defaults = getToolpathDefaults(toolpath, mode);
  expect(defaults).not.toBeNull();
  const docMm = defaults?.isAbsolute ? defaults.docMm : Number((tool.defaultDiameter * (defaults?.docMm ?? 0)).toFixed(2));
  const wocMm = defaults?.isAbsolute ? defaults.wocMm : Number((tool.defaultDiameter * (defaults?.wocMm ?? 0)).toFixed(2));
  expect(docMm).toBeGreaterThan(0);
  expect(wocMm).toBeGreaterThan(0);
  return { defaults, docMm, wocMm };
}

function conventionalMaterials() {
  return MATERIAL_CATALOG.filter((material) => material.group !== 'nontraditional');
}

function priorityConventionalMaterials() {
  return MATERIAL_CATALOG.filter((material) =>
    ['steel', 'tool_steel', 'stainless', 'aluminum'].includes(material.group),
  );
}

function priorityWireMaterials() {
  return MATERIAL_CATALOG.filter((material) =>
    ['steel', 'tool_steel', 'stainless', 'aluminum', 'superalloy'].includes(material.group),
  );
}

function findRepresentativeMachineForTool(mode: ConventionalMode, tool: ToolCatalogItem, toolpath: ToolpathOption) {
  return MACHINE_CATALOG.find((machine) =>
    machine.mode === mode
    && machineSupportsToolpath(mode, machine, toolpath)
    && supportsMachineTooling(tool, machine),
  );
}

function findCompatibleHolders(machine: MachineCatalogItem, tool: ToolCatalogItem) {
  return HOLDER_PACKAGE_LIBRARY.filter((holder) =>
    holder.mode === machine.mode
    && holderPackageMatchesMachine(holder, machine)
    && holderSupportsTool(holder, tool),
  );
}

function collectLicensedProgramLanes(mode: ConventionalMode, machine?: MachineCatalogItem) {
  return PROGRAMMING_ENVIRONMENTS
    .filter((programming) => programming.mode === mode)
    .flatMap((programming) =>
      licenseOptionsFor(programming).flatMap((license) =>
        filterToolpathsForLicense(programming, programming.toolpaths, license.id, machine).map((toolpath) => ({
          licenseTierId: license.id,
          programming,
          toolpath,
        })),
      ),
    );
}

function chooseDiverseCompatibleTools(machine: MachineCatalogItem, toolpath: ToolpathOption) {
  const compatibleTools = TOOL_CATALOG.filter((tool) =>
    tool.mode === machine.mode
    && toolSupportsToolpath(tool, toolpath)
    && supportsMachineTooling(tool, machine)
    && findCompatibleHolders(machine, tool).length > 0,
  );
  const distinctTools: ToolCatalogItem[] = [];
  const signatures = new Set<string>();

  compatibleTools.forEach((tool) => {
    const signature = tool.geometryClass ?? tool.bodyType ?? tool.family ?? tool.operation;
    if (!signatures.has(signature) || distinctTools.length === 0) {
      distinctTools.push(tool);
      signatures.add(signature);
    }
  });

  return distinctTools.slice(0, 3);
}

type HolderPackageOption = (typeof HOLDER_PACKAGE_LIBRARY)[number];

interface RepresentativeLaneContext {
  defaults: ReturnType<typeof getToolpathDefaults>;
  docMm: number;
  holder: HolderPackageOption;
  holders: HolderPackageOption[];
  machine: MachineCatalogItem;
  programming: (typeof PROGRAMMING_ENVIRONMENTS)[number];
  tool: ToolCatalogItem;
  toolpath: ToolpathOption;
  toolpathTypeId: string;
  wocMm: number;
}

function buildRepresentativeLaneContexts(mode: ConventionalMode): RepresentativeLaneContext[] {
  return PROGRAMMING_ENVIRONMENTS
    .filter((programming) => programming.mode === mode)
    .flatMap((programming) =>
      programming.toolpaths.flatMap((toolpath) => {
        const compatibleTool = TOOL_CATALOG.find((tool) => tool.mode === mode && toolSupportsToolpath(tool, toolpath));
        if (!compatibleTool) return [];

        const machine = findRepresentativeMachineForTool(mode, compatibleTool, toolpath);
        if (!machine) return [];

        const holders = findCompatibleHolders(machine, compatibleTool);
        if (!holders.length) return [];

        const { defaults, docMm, wocMm } = buildDefaults(toolpath, mode, compatibleTool);
        return [{
          defaults,
          docMm,
          holder: holders[0],
          holders,
          machine,
          programming,
          tool: compatibleTool,
          toolpath,
          toolpathTypeId: classifyToolpathType(toolpath).id,
          wocMm,
        }];
      }),
    );
}

function buildVariabilityLaneContexts(machine: MachineCatalogItem, mode: ConventionalMode): RepresentativeLaneContext[] {
  return collectLicensedProgramLanes(mode, machine).flatMap(({ programming, toolpath }) => {
    if (!machineSupportsToolpath(mode, machine, toolpath)) {
      return [];
    }

    const toolpathTypeId = classifyToolpathType(toolpath).id;
    const diverseTools = chooseDiverseCompatibleTools(machine, toolpath);
    expect(diverseTools.length).toBeGreaterThan(0);

    return diverseTools.flatMap((tool) => {
      const holders = findCompatibleHolders(machine, tool);
      expect(holders.length).toBeGreaterThan(0);
      if (!holders.length) return [];

      const { defaults, docMm, wocMm } = buildDefaults(toolpath, mode, tool);
      return [{
        defaults,
        docMm,
        holder: holders[0],
        holders,
        machine,
        programming,
        tool,
        toolpath,
        toolpathTypeId,
        wocMm,
      }];
    });
  });
}

describe('calculator catalog coverage hardening', () => {
  it('keeps every machine mode and machine type attached to non-empty programming packages and licensed toolpath families', () => {
    const expectedMinimumFamilies: Record<MachineMode, number> = {
      mill: 5,
      lathe: 5,
      edm: 2,
      wire_edm: 2,
      laser: 2,
      waterjet: 2,
    };

    (['mill', 'lathe', 'edm', 'wire_edm', 'laser', 'waterjet'] as const).forEach((mode) => {
      const machines = MACHINE_CATALOG.filter((machine) => machine.mode === mode);
      const machineTypeIds = new Set(machines.map((machine) => machine.machineTypeId));
      const environments = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === mode);

      expect(machines.length).toBeGreaterThan(0);
      expect(machineTypeIds.size).toBeGreaterThan(0);
      expect(environments.length).toBeGreaterThan(0);

      const allLicensedToolpaths = environments.flatMap((programming) =>
        licenseOptionsFor(programming).flatMap((license) =>
          filterToolpathsForLicense(programming, programming.toolpaths, license.id),
        ),
      );

      expect(allLicensedToolpaths.length).toBeGreaterThan(0);
      expect(new Set(allLicensedToolpaths.map((toolpath) => toolpath.id)).size).toBeGreaterThan(0);

      const families = new Set(allLicensedToolpaths.map((toolpath) => classifyToolpathType(toolpath).id));
      expect(families.size).toBeGreaterThanOrEqual(expectedMinimumFamilies[mode]);

      environments.forEach((programming) => {
        const licenses = licenseOptionsFor(programming);
        expect(licenses.length).toBeGreaterThan(0);
        licenses.forEach((license) => {
          const licensedToolpaths = filterToolpathsForLicense(programming, programming.toolpaths, license.id);
          expect(licensedToolpaths.length).toBeGreaterThan(0);
        });
      });

      machineTypeIds.forEach((machineTypeId) => {
        const machinesOfType = machines.filter((machine) => machine.machineTypeId === machineTypeId);
        expect(machinesOfType.length).toBeGreaterThan(0);
        expect(allLicensedToolpaths.length).toBeGreaterThan(0);
      });
    });
  });

  it('keeps every turning-family machine on legal selector paths with family-aware gating', () => {
    const turningMachines = MACHINE_CATALOG.filter((machine) => machine.mode === 'lathe');

    expect(turningMachines.length).toBeGreaterThan(0);

    turningMachines.forEach((machine) => {
      const selection = resolveMachineSelectionOptions(machine, '', '', 'lathe');
      expect(selection.configurationOptions.length).toBeGreaterThan(0);
      expect(selection.controllerOptions.length).toBeGreaterThan(0);
      expect(selection.spindleOptions.length).toBeGreaterThan(0);
      expect(selection.coolantOptionIds.length).toBeGreaterThan(0);

      const lanes = collectLicensedProgramLanes('lathe', machine);
      const laneIds = new Set(lanes.map(({ toolpath }) => classifyToolpathType(toolpath).id));

      expect(lanes.length).toBeGreaterThan(0);
      expect(laneIds.has('turning_rough')).toBe(true);
      expect(laneIds.has('turning_finish')).toBe(true);

      const liveTooling =
        Boolean(machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead)
        || /live-tool|y-axis|mill-turn/i.test(`${machine.machineTypeId} ${machine.machineTypeLabel} ${machine.family}`);
      const swissCapability =
        machine.machineTypeId === 'lathe_swiss'
        || machine.toolingLayout?.kind === 'gang'
        || /swiss/i.test(`${machine.machineTypeId} ${machine.machineTypeLabel} ${machine.family}`);
      const subSpindleCapability =
        Boolean(machine.toolingLayout?.hasSubSpindle)
        || machine.machineTypeId === 'lathe_subspindle'
        || /sub-spindle|dual-spindle|transfer/i.test(`${machine.machineTypeId} ${machine.machineTypeLabel} ${machine.family}`);

      if (liveTooling) {
        expect(laneIds.has('live_milling')).toBe(true);
      } else {
        expect(laneIds.has('live_milling')).toBe(false);
      }

      if (swissCapability) {
        expect(laneIds.has('swiss_sync')).toBe(true);
      } else {
        expect(laneIds.has('swiss_sync')).toBe(false);
      }

      if (subSpindleCapability) {
        expect(lanes.some(({ toolpath }) => /sync|transfer|pickoff/i.test(`${toolpath.label} ${toolpath.path}`))).toBe(true);
      }
    });
  });

  it('keeps the visible Okuma calculator seats representative of the deeper catalog and legal CAM/tooling lanes', () => {
    const okumaMachines = MACHINE_CATALOG.filter((machine) => machine.manufacturer === 'Okuma');
    const priorityMaterials = priorityConventionalMaterials();
    const coveredProgrammingIds = new Set<string>();
    const expectedProgrammingIds = new Set<string>();
    let validatedContexts = 0;
    let sawSolid = false;
    let sawIndexable = false;
    let sawInsert = false;

    expect(okumaMachines).toHaveLength(3);
    expect(okumaMachines.some((machine) => machine.id === 'okuma-m460v-5ax' && machine.machineTypeId === 'mill_vertical_5')).toBe(true);
    expect(okumaMachines.some((machine) => machine.id === 'okuma-genos-l3000' && machine.machineTypeId === 'lathe_2axis')).toBe(true);
    expect(okumaMachines.some((machine) => machine.id === 'okuma-multus-u3000' && machine.machineTypeId === 'lathe_multitask')).toBe(true);

    okumaMachines.forEach((machine) => {
      const mode = machine.mode as ConventionalMode;
      const selection = resolveMachineSelectionOptions(machine, '', '', mode);
      expect(selection.configurationOptions.length).toBeGreaterThan(0);
      expect(selection.controllerOptions.length).toBeGreaterThan(0);
      expect(selection.spindleOptions.length).toBeGreaterThan(0);
      expect(selection.coolantOptionIds.length).toBeGreaterThan(0);

      const lanes = collectLicensedProgramLanes(mode, machine);
      const laneIds = new Set(lanes.map(({ toolpath }) => classifyToolpathType(toolpath).id));
      PROGRAMMING_ENVIRONMENTS
        .filter((programming) => programming.mode === mode)
        .forEach((programming) => expectedProgrammingIds.add(programming.id));

      expect(lanes.length).toBeGreaterThan(0);
      expect(laneIds.size).toBeGreaterThan(0);
      expect(expectedProgrammingIds.size).toBeGreaterThan(0);

      lanes.forEach(({ programming, toolpath }) => {
        coveredProgrammingIds.add(programming.id);

        const diverseTools = chooseDiverseCompatibleTools(machine, toolpath);
        expect(diverseTools.length).toBeGreaterThan(0);

        diverseTools.forEach((tool) => {
          const bodyType = inferToolBodyType(tool);
          if (bodyType === 'solid') sawSolid = true;
          if (bodyType === 'indexable') sawIndexable = true;
          if (tool.geometryClass?.endsWith('-insert') || /insert/i.test(tool.family)) {
            sawInsert = true;
          }
        });

        const tool = diverseTools[0];
        expect(tool).toBeDefined();
        if (!tool) return;

        const holders = findCompatibleHolders(machine, tool);
        expect(holders.length).toBeGreaterThan(0);

        const { defaults, docMm, wocMm } = buildDefaults(toolpath, mode, tool);
        const finishTarget =
          /finish/i.test(toolpath.label) || toolpath.operationId === 'turning_finish'
            ? 'tight-finish'
            : /rough/i.test(toolpath.label) || toolpath.operationId === 'turning_rough'
              ? 'high-removal'
              : 'general';

        priorityMaterials.forEach((material) => {
          const coolantRecommendation = chooseRepresentativeCoolant(machine, material, tool, toolpath);
          const finishPreview = getSurfaceFinishPreview({
            machineMode: mode,
            machine,
            material,
            tool,
            toolpath,
            toolpathTypeId: classifyToolpathType(toolpath).id,
            programmingLabel: programming.label,
            coolantId: coolantRecommendation.recommendedId,
            finishTarget,
            desiredRaUm: 1.6,
            toolDiameterMm: tool.defaultDiameter,
            docMm,
            wocMm,
            defaults,
          });

          expect(finishPreview.expectedMinRaUm).toBeGreaterThan(0);
          expect(finishPreview.expectedMaxRaUm).toBeGreaterThanOrEqual(finishPreview.expectedMinRaUm);

          const preview = buildCalculatorSetupPreview({
            machineMode: mode,
            machine,
            spindleOption: machine.spindleOptions[0],
            holderPackage: holders[0],
            tool,
            material,
            toolpath,
            toolDiameterMm: tool.defaultDiameter,
            docMm,
            wocMm,
            stockXMm: 120,
            stockYMm: 80,
            stockZMm: 36,
            coolantId: coolantRecommendation.recommendedId,
            coolantRecommendation,
          });

          expect(preview.machineSummary).toContain(machine.model);
          expect(preview.holderSummary).toContain(holders[0].label);
          expect(preview.toolSummary).toContain(tool.label);

          const prismPlan = buildCalculatorPrismModePlan({
            machineMode: machine.mode,
            machine,
            material,
            tool,
            toolpath,
            toolpathTypeId: classifyToolpathType(toolpath).id,
            programmingLabel: programming.label,
            finishTarget,
            stockShape: machine.mode === 'lathe' ? 'round' : 'block',
            stockSource: 'shop-rack',
            currentSetupSource: 'recommended',
            currentCoolantId: coolantRecommendation.recommendedId,
            availableCoolantOptions: machine.coolantOptionIds.map((id) => ({ id, label: id, detail: id })),
            toolDiameterMm: tool.defaultDiameter,
            docMm,
            wocMm,
            compatibleHolderPackages: holders,
            currentHolderStyleId: holders[0].holderStyleId ?? 'machine-standard',
            currentHolderPackageId: holders[0].id,
            recommendedFeatureIds: [],
            currentFeatureIds: [],
            controllerCapabilityOptions: machine.controllerCapabilityOptions ?? [],
            currentControllerCapabilityIds: [],
            defaultMachineProfile: null,
            inventoryWorkspace: INVENTORY_OPERATIONS_WORKSPACE,
            result: {
              ra: finishPreview.expectedRaUm,
              confidence: 0.82,
              toolLife: 32,
              powerKw: 5.6,
              mrr: 24,
            },
            purchasingHrefBase: '/purchasing',
          });

          expect(prismPlan.summary).toContain(machine.model);
          expect(prismPlan.summary).toContain(material.name);
          expect(prismPlan.summary).toContain(toolpath.label);
          validatedContexts += 1;
        });
      });
    });

    expectedProgrammingIds.forEach((programmingId) => {
      expect(coveredProgrammingIds.has(programmingId)).toBe(true);
    });

    expect(sawSolid).toBe(true);
    expect(sawIndexable).toBe(true);
    expect(sawInsert).toBe(true);
    expect(validatedContexts).toBeGreaterThan(40);
  }, 45000);

  it('keeps edm, wire edm, laser, and waterjet packages attached to legal programming and tooling lanes', () => {
    (['edm', 'wire_edm', 'laser', 'waterjet'] as const satisfies NontraditionalMode[]).forEach((mode) => {
      const machine = MACHINE_CATALOG.find((candidate) => candidate.mode === mode);
      const tool = TOOL_CATALOG.find((candidate) => candidate.mode === mode);
      const environments = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === mode);

      expect(machine).toBeDefined();
      expect(tool).toBeDefined();
      expect(environments.length).toBeGreaterThan(0);

      const selection = resolveMachineSelectionOptions(machine!, '', '', mode);
      expect(selection.configurationOptions.length).toBeGreaterThan(0);
      expect(selection.controllerOptions.length).toBeGreaterThan(0);
      expect(selection.coolantOptionIds.length).toBeGreaterThan(0);

      let validatedToolpaths = 0;

      environments.forEach((programming) => {
        licenseOptionsFor(programming).forEach((license) => {
          const toolpaths = filterToolpathsForLicense(programming, programming.toolpaths, license.id);
          expect(toolpaths.length).toBeGreaterThan(0);

          toolpaths.forEach((toolpath) => {
            expect(toolSupportsToolpath(tool!, toolpath)).toBe(true);
            expect(classifyToolpathType(toolpath).id).not.toBe('');
            expect(getToolpathDefaults(toolpath, mode)).not.toBeNull();

            const prismPlan = buildCalculatorPrismModePlan({
              machineMode: mode,
              machine: machine!,
              material: MATERIAL_CATALOG.find((material) => material.group === 'nontraditional') ?? MATERIAL_CATALOG[0],
              tool: tool!,
              toolpath,
              toolpathTypeId: classifyToolpathType(toolpath).id,
              programmingLabel: programming.label,
              finishTarget: 'general',
              stockShape: 'block',
              stockSource: 'shop-rack',
              currentSetupSource: 'recommended',
              currentCoolantId: machine!.coolantOptionIds[0],
              availableCoolantOptions: machine!.coolantOptionIds.map((id) => ({ id, label: id, detail: id })),
              toolDiameterMm: tool!.defaultDiameter,
              docMm: Math.max(0.1, tool!.defaultDiameter * 0.1),
              wocMm: Math.max(0.05, tool!.defaultDiameter * 0.05),
              compatibleHolderPackages: [],
              currentHolderStyleId: 'machine-standard',
              currentHolderPackageId: '',
              recommendedFeatureIds: [],
              currentFeatureIds: [],
              controllerCapabilityOptions: machine!.controllerCapabilityOptions ?? [],
              currentControllerCapabilityIds: [],
              defaultMachineProfile: null,
              inventoryWorkspace: INVENTORY_OPERATIONS_WORKSPACE,
              result: {
                confidence: 0.78,
                toolLife: 45,
                powerKw: 3.2,
                mrr: 6.5,
              },
              purchasingHrefBase: '/purchasing',
            });

            expect(prismPlan.summary).toContain(machine!.model);
            expect(prismPlan.summary).toContain(toolpath.label);
            validatedToolpaths += 1;
          });
        });
      });

      expect(validatedToolpaths).toBeGreaterThanOrEqual(20);
    });
  }, 120000);

  it('retains representative source machines for the major nontraditional supplier lanes', () => {
    const expectations = [
      { id: 'makino-edge3', mode: 'edm', machineTypeId: 'edm_sinker', manufacturer: 'Makino', toolingKind: 'electrode' },
      { id: 'fanuc-c600ib', mode: 'wire_edm', machineTypeId: 'wire_edm_wire', manufacturer: 'FANUC', toolingKind: 'wire' },
      { id: 'trulaser-3030', mode: 'laser', machineTypeId: 'laser_fiber', manufacturer: 'TRUMPF', toolingKind: 'laser' },
      { id: 'omax-55100', mode: 'waterjet', machineTypeId: 'waterjet_abrasive', manufacturer: 'OMAX', toolingKind: 'waterjet' },
    ] as const;

    expectations.forEach((expected) => {
      const machine = MACHINE_CATALOG.find((candidate) => candidate.id === expected.id);

      expect(machine).toBeDefined();
      expect(machine?.mode).toBe(expected.mode);
      expect(machine?.machineTypeId).toBe(expected.machineTypeId);
      expect(machine?.manufacturer).toBe(expected.manufacturer);
      expect(machine?.toolingLayout?.kind).toBe(expected.toolingKind);
    });
  });

  it('keeps Haas mill and lathe CAM seats categorized and selectable on Haas-legal machines', async () => {
    await vi.resetModules();

    const {
      MACHINE_CATALOG: freshMachineCatalog,
      PROGRAMMING_ENVIRONMENTS: freshProgrammingEnvironments,
    } = await import('../data/calculatorWorkspace');
    const {
      classifyToolpathType: freshClassifyToolpathType,
      filterToolpathsForLicense: freshFilterToolpathsForLicense,
      licenseOptionsFor: freshLicenseOptionsFor,
    } = await import('../pages/CalculatorPage');
    const { resolveMachineSelectionOptions: freshResolveMachineSelectionOptions } = await import('../utils/machineConfigurationOptions');

    const haasMill = freshMachineCatalog.find((machine) => machine.id === 'haas-vf2ss');
    const haasLathe = freshMachineCatalog.find((machine) => machine.id === 'haas-st20y');

    expect(haasMill).toBeDefined();
    expect(haasLathe).toBeDefined();

    const scenarios = [
      {
        machine: haasMill!,
        mode: 'mill' as ConventionalMode,
        requiredCategories: ['roughing', 'drilling'],
        anyOfCategories: ['pocketing', 'profiling', 'finishing', 'surface_finish'],
      },
      {
        machine: haasLathe!,
        mode: 'lathe' as ConventionalMode,
        requiredCategories: ['turning_rough', 'turning_finish', 'grooving', 'boring', 'drilling', 'live_milling'],
      },
    ];

    scenarios.forEach(({ machine, mode, requiredCategories, anyOfCategories }) => {
      const selection = freshResolveMachineSelectionOptions(machine, '', '', mode);
      expect(selection.configurationOptions.length).toBeGreaterThan(0);
      expect(selection.controllerOptions.length).toBeGreaterThan(0);
      expect(selection.spindleOptions.length).toBeGreaterThan(0);
      expect(selection.coolantOptionIds.length).toBeGreaterThan(0);

      const licensedToolpaths = freshProgrammingEnvironments
        .filter((programming) => programming.mode === mode)
        .flatMap((programming) =>
          freshLicenseOptionsFor(programming).flatMap((license) =>
            freshFilterToolpathsForLicense(programming, programming.toolpaths, license.id, machine).map((toolpath) => ({
              programming,
              toolpath,
            })),
          ),
        );

      const categories = new Set(licensedToolpaths.map(({ toolpath }) => freshClassifyToolpathType(toolpath).id));
      const programmingIds = new Set(licensedToolpaths.map(({ programming }) => programming.id));

      expect(licensedToolpaths.length).toBeGreaterThan(0);
      expect(programmingIds.size).toBeGreaterThan(0);

      requiredCategories.forEach((category) => {
        expect(categories.has(category)).toBe(true);
      });

      if (anyOfCategories) {
        expect(anyOfCategories.some((category) => categories.has(category))).toBe(true);
      }
    });
  });

  it('sweeps every mill and lathe machine package against every supported toolpath and finds a legal tooling lane', () => {
    let validatedMachineToolpaths = 0;

    (['mill', 'lathe'] as const).forEach((mode) => {
      const machines = MACHINE_CATALOG.filter((machine) => machine.mode === mode);
      const tools = TOOL_CATALOG.filter((tool) => tool.mode === mode);
      const toolpaths = PROGRAMMING_ENVIRONMENTS
        .filter((programming) => programming.mode === mode)
        .flatMap((programming) =>
          licenseOptionsFor(programming).flatMap((license) =>
            filterToolpathsForLicense(programming, programming.toolpaths, license.id),
          ),
        );

      machines.forEach((machine) => {
        const selection = resolveMachineSelectionOptions(machine, '', '', mode);
        expect(selection.configurationOptions.length).toBeGreaterThan(0);
        expect(selection.controllerOptions.length).toBeGreaterThan(0);
        expect(selection.spindleOptions.length).toBeGreaterThan(0);
        expect(selection.coolantOptionIds.length).toBeGreaterThan(0);

        toolpaths.forEach((toolpath) => {
          if (!machineSupportsToolpath(mode, machine, toolpath)) {
            return;
          }

          const compatibleTools = tools.filter((tool) => toolSupportsToolpath(tool, toolpath) && supportsMachineTooling(tool, machine));
          expect(compatibleTools.length).toBeGreaterThan(0);

          const hasHolderPath = compatibleTools.some((tool) => findCompatibleHolders(machine, tool).length > 0);
          expect(hasHolderPath).toBe(true);
          validatedMachineToolpaths += 1;
        });
      });
    });

    expect(validatedMachineToolpaths).toBeGreaterThan(3000);
  });

  it('sweeps every material and hardness variant through representative mill and lathe lanes with coherent math and contextual guidance', () => {
    const materials = conventionalMaterials();
    let validatedContexts = 0;

    (['mill', 'lathe'] as const).forEach((mode) => {
      const representativeContexts = buildRepresentativeLaneContexts(mode);
      expect(representativeContexts.length).toBeGreaterThan(0);

      materials.forEach((material) => {
        representativeContexts.forEach(({ defaults, docMm, holder, holders, machine, programming, tool, toolpath, toolpathTypeId, wocMm }) => {
          const coolantRecommendation = chooseRepresentativeCoolant(machine, material, tool, toolpath);
          const finishPreview = getSurfaceFinishPreview({
            machineMode: mode,
            machine,
            material,
            tool,
            toolpath,
            toolpathTypeId,
            programmingLabel: programming.label,
            coolantId: coolantRecommendation.recommendedId,
            finishTarget:
              /finish/i.test(toolpath.label) || toolpath.operationId === 'turning_finish'
                ? 'tight-finish'
                : /rough/i.test(toolpath.label) || toolpath.operationId === 'turning_rough'
                  ? 'high-removal'
                  : 'general',
            desiredRaUm: 1.6,
            toolDiameterMm: tool.defaultDiameter,
            docMm,
            wocMm,
            defaults,
          });

          expect(finishPreview.expectedMinRaUm).toBeGreaterThan(0);
          expect(finishPreview.expectedMaxRaUm).toBeGreaterThanOrEqual(finishPreview.expectedMinRaUm);

          const preview = buildCalculatorSetupPreview({
            machineMode: mode,
            machine,
            spindleOption: machine.spindleOptions[0],
            holderPackage: holder,
            tool,
            material,
            toolpath,
            toolDiameterMm: tool.defaultDiameter,
            docMm,
            wocMm,
            stockXMm: 120,
            stockYMm: 80,
            stockZMm: 36,
            coolantId: coolantRecommendation.recommendedId,
            coolantRecommendation,
          });

          expect(preview.machineSummary).toContain(machine.model);
          expect(preview.holderSummary).toContain(holder.label);
          expect(preview.toolSummary).toContain(tool.label);

          const prismPlan = buildCalculatorPrismModePlan({
            machineMode: mode,
            machine,
            material,
            tool,
            toolpath,
            toolpathTypeId,
            programmingLabel: programming.label,
            finishTarget:
              /finish/i.test(toolpath.label) || toolpath.operationId === 'turning_finish'
                ? 'tight-finish'
                : /rough/i.test(toolpath.label) || toolpath.operationId === 'turning_rough'
                  ? 'high-removal'
                  : 'general',
            stockShape: mode === 'lathe' ? 'round' : 'block',
            stockSource: 'shop-rack',
            currentSetupSource: 'recommended',
            currentCoolantId: coolantRecommendation.recommendedId,
            availableCoolantOptions: machine.coolantOptionIds.map((id) => ({ id, label: id, detail: id })),
            toolDiameterMm: tool.defaultDiameter,
            docMm,
            wocMm,
            compatibleHolderPackages: holders,
            currentHolderStyleId: holder.holderStyleId ?? 'machine-standard',
            currentHolderPackageId: holder.id,
            recommendedFeatureIds: [],
            currentFeatureIds: [],
            controllerCapabilityOptions: machine.controllerCapabilityOptions ?? [],
            currentControllerCapabilityIds: [],
            defaultMachineProfile: null,
            inventoryWorkspace: INVENTORY_OPERATIONS_WORKSPACE,
            result: {
              ra: finishPreview.expectedRaUm,
              confidence: 0.82,
              toolLife: 32,
              powerKw: 5.6,
              mrr: 24,
            },
            purchasingHrefBase: '/purchasing',
          });

          expect(prismPlan.summary).toContain(machine.model);
          expect(prismPlan.summary).toContain(material.name);
          expect(prismPlan.summary).toContain(toolpath.label);
          expect(prismPlan.detail).toContain(material.name);
          expect(prismPlan.detail).toContain(toolpath.label);
          expect(prismPlan.evidence.some((item) => item.includes(toolpath.label))).toBe(true);
          expect(prismPlan.purchaseRecommendations.length).toBeGreaterThanOrEqual(3);
          prismPlan.purchaseRecommendations.forEach((recommendation) => {
            expect(
              recommendation.detail.includes(machine.model)
              || recommendation.detail.includes(tool.label)
              || recommendation.detail.includes(material.name),
            ).toBe(true);
          });

          validatedContexts += 1;
        });
      });
    });

    expect(validatedContexts).toBeGreaterThan(8000);
  }, 120000);

  it('sweeps every mill and lathe tool plus every holder package through at least one legal contextual setup', () => {
    const materials = conventionalMaterials();
    let validatedTools = 0;
    let validatedHolders = 0;
    const coverableHolders = HOLDER_PACKAGE_LIBRARY.filter((holder) =>
      (holder.mode === 'mill' || holder.mode === 'lathe')
      && MACHINE_CATALOG.some((candidate) => candidate.mode === holder.mode && holderPackageMatchesMachine(holder, candidate)),
    );

    TOOL_CATALOG.filter((tool) => tool.mode === 'mill' || tool.mode === 'lathe').forEach((tool) => {
      const mode = tool.mode as ConventionalMode;
      const compatiblePath = PROGRAMMING_ENVIRONMENTS
        .filter((programming) => programming.mode === mode)
        .flatMap((programming) => programming.toolpaths)
        .find((toolpath) => toolSupportsToolpath(tool, toolpath));
      expect(compatiblePath).toBeDefined();

      const machine = compatiblePath ? findRepresentativeMachineForTool(mode, tool, compatiblePath) : undefined;
      expect(machine).toBeDefined();

      const holders = machine ? findCompatibleHolders(machine, tool) : [];
      expect(holders.length).toBeGreaterThan(0);
      validatedTools += 1;
    });

    coverableHolders.forEach((holder) => {
      const mode = holder.mode as ConventionalMode;
      const machine = MACHINE_CATALOG.find((candidate) => candidate.mode === mode && holderPackageMatchesMachine(holder, candidate));
      expect(machine).toBeDefined();
      if (!machine) return;

      const tool = TOOL_CATALOG.find((candidate) =>
        candidate.mode === mode
        && supportsMachineTooling(candidate, machine)
        && holderSupportsTool(holder, candidate),
      );
      expect(tool).toBeDefined();
      if (!tool) return;

      const toolpath = PROGRAMMING_ENVIRONMENTS
        .filter((programming) => programming.mode === mode)
        .flatMap((programming) => programming.toolpaths)
        .find((candidate) => machineSupportsToolpath(mode, machine, candidate) && toolSupportsToolpath(tool, candidate));
      expect(toolpath).toBeDefined();
      if (!toolpath) return;

      const material = materials.find((candidate) => candidate.group !== 'nontraditional');
      expect(material).toBeDefined();
      if (!material) return;

      const { docMm, wocMm } = buildDefaults(toolpath, mode, tool);
      const coolantRecommendation = chooseRepresentativeCoolant(machine, material, tool, toolpath);
      const preview = buildCalculatorSetupPreview({
        machineMode: mode,
        machine,
        spindleOption: machine.spindleOptions[0],
        holderPackage: holder,
        tool,
        material,
        toolpath,
        toolDiameterMm: tool.defaultDiameter,
        docMm,
        wocMm,
        coolantId: coolantRecommendation.recommendedId,
        coolantRecommendation,
      });

      expect(preview.holderSummary).toContain(holder.label);
      expect(preview.toolSummary).toContain(tool.label);
      validatedHolders += 1;
    });

    expect(validatedTools).toBeGreaterThanOrEqual(TOOL_CATALOG.filter((tool) => tool.mode === 'mill' || tool.mode === 'lathe').length);
    expect(validatedHolders).toBeGreaterThanOrEqual(coverableHolders.length);
  });

  it('runs a max-variability sweep across every mill and lathe machine package', () => {
    const materials = conventionalMaterials();
    const summaries = new Map<
      string,
      {
        contexts: number;
        coolants: Set<string>;
        holderIds: Set<string>;
        materialIds: Set<string>;
        programmingIds: Set<string>;
        toolIds: Set<string>;
        toolpathTypes: Set<string>;
      }
    >();
    let totalContexts = 0;

    (['mill', 'lathe'] as const).forEach((mode) => {
      const machines = MACHINE_CATALOG.filter((machine) => machine.mode === mode);

      machines.forEach((machine) => {
        const laneContexts = buildVariabilityLaneContexts(machine, mode);
        const selection = resolveMachineSelectionOptions(machine, '', '', mode);
        expect(selection.configurationOptions.length).toBeGreaterThan(0);
        expect(selection.controllerOptions.length).toBeGreaterThan(0);
        expect(selection.spindleOptions.length).toBeGreaterThan(0);
        expect(selection.coolantOptionIds.length).toBeGreaterThan(0);
        expect(laneContexts.length).toBeGreaterThan(0);

        const summary = {
          contexts: 0,
          coolants: new Set<string>(),
          holderIds: new Set<string>(),
          materialIds: new Set<string>(),
          programmingIds: new Set<string>(),
          toolIds: new Set<string>(),
          toolpathTypes: new Set<string>(),
        };

        materials.forEach((material) => {
          let materialContexts = 0;

          laneContexts.forEach(({ defaults, docMm, holder, programming, tool, toolpath, toolpathTypeId, wocMm }) => {
              const coolantRecommendation = chooseRepresentativeCoolant(machine, material, tool, toolpath);
              const finishPreview = getSurfaceFinishPreview({
                machineMode: mode,
                machine,
                material,
                tool,
                toolpath,
                toolpathTypeId,
                programmingLabel: programming.label,
                coolantId: coolantRecommendation.recommendedId,
                finishTarget:
                  /finish/i.test(toolpath.label) || toolpath.operationId === 'turning_finish'
                    ? 'tight-finish'
                    : /rough/i.test(toolpath.label) || toolpath.operationId === 'turning_rough'
                      ? 'high-removal'
                      : 'general',
                desiredRaUm: mode === 'mill' ? 1.6 : 3.2,
                toolDiameterMm: tool.defaultDiameter,
                docMm,
                wocMm,
                defaults,
              });
              expect(finishPreview.expectedMinRaUm).toBeGreaterThan(0);
              expect(finishPreview.expectedMaxRaUm).toBeGreaterThanOrEqual(finishPreview.expectedMinRaUm);

              const setupPreview = buildCalculatorSetupPreview({
                machineMode: mode,
                machine,
                spindleOption: selection.spindleOptions[0],
                holderPackage: holder,
                tool,
                material,
                toolpath,
                toolDiameterMm: tool.defaultDiameter,
                docMm,
                wocMm,
                stockXMm: 120,
                stockYMm: 80,
                stockZMm: 36,
                coolantId: coolantRecommendation.recommendedId,
                coolantRecommendation,
              });
              expect(setupPreview.machineSummary).toContain(machine.model);
              expect(setupPreview.holderSummary).toContain(holder.label);
              expect(setupPreview.toolSummary).toContain(tool.label);

              summary.contexts += 1;
              summary.coolants.add(coolantRecommendation.recommendedId);
              summary.holderIds.add(holder.id);
              summary.materialIds.add(material.id);
              summary.programmingIds.add(programming.id);
              summary.toolIds.add(tool.id);
              summary.toolpathTypes.add(toolpathTypeId);
              materialContexts += 1;
              totalContexts += 1;
          });

          expect(materialContexts).toBeGreaterThan(0);
        });

        expect(summary.materialIds.size).toBe(materials.length);
        expect(summary.programmingIds.size).toBeGreaterThanOrEqual(mode === 'mill' ? 6 : 4);
        expect(summary.toolIds.size).toBeGreaterThanOrEqual(mode === 'mill' ? 4 : 3);
        expect(summary.toolpathTypes.has(mode === 'mill' ? 'roughing' : 'turning_rough')).toBe(true);
        expect(summary.toolpathTypes.size).toBeGreaterThanOrEqual(mode === 'mill' ? 4 : 3);
        expect(summary.holderIds.size).toBeGreaterThanOrEqual(1);
        expect(summary.contexts).toBeGreaterThan(mode === 'mill' ? 120 : 90);

        if (machine.machineTypeId.includes('_5')) {
          expect(summary.toolpathTypes.has('multiaxis')).toBe(true);
        }
        if (machine.toolingLayout?.liveTooling || machine.toolingLayout?.hasMillingHead) {
          expect(summary.toolpathTypes.has('live_milling')).toBe(true);
        }

        summaries.set(machine.id, summary);
      });
    });

    expect(summaries.size).toBe(MACHINE_CATALOG.filter((machine) => machine.mode === 'mill' || machine.mode === 'lathe').length);
    expect(totalContexts).toBeGreaterThan(2500);
  }, 600000);

  it('keeps the visible mill catalog covered across all six mill families with representative major suppliers', () => {
    const millMachines = MACHINE_CATALOG.filter((machine) => machine.mode === 'mill');
    const families = new Map<string, Set<string>>();

    millMachines.forEach((machine) => {
      const existing = families.get(machine.machineTypeId) ?? new Set<string>();
      existing.add(machine.manufacturer);
      families.set(machine.machineTypeId, existing);

      const selection = resolveMachineSelectionOptions(machine, '', '', 'mill');
      expect(selection.configurationOptions.length).toBeGreaterThan(0);
      expect(selection.controllerOptions.length).toBeGreaterThan(0);
      expect(selection.spindleOptions.length).toBeGreaterThan(0);
      expect(selection.coolantOptionIds.length).toBeGreaterThan(0);
    });

    expect(families.has('mill_vertical_3')).toBe(true);
    expect(families.has('mill_vertical_4')).toBe(true);
    expect(families.has('mill_horizontal_3')).toBe(true);
    expect(families.has('mill_vertical_5')).toBe(true);
    expect(families.has('mill_horizontal_4')).toBe(true);
    expect(families.has('mill_horizontal_5')).toBe(true);

    expect([...(families.get('mill_vertical_3') ?? [])]).toEqual(expect.arrayContaining(['Haas', 'Hurco', 'Mazak']));
    expect([...(families.get('mill_vertical_4') ?? [])]).toEqual(expect.arrayContaining(['Haas']));
    expect([...(families.get('mill_horizontal_3') ?? [])]).toEqual(expect.arrayContaining(['Kuraki']));
    expect([...(families.get('mill_vertical_5') ?? [])]).toEqual(expect.arrayContaining(['Hurco', 'Okuma']));
    expect([...(families.get('mill_horizontal_4') ?? [])]).toEqual(expect.arrayContaining(['Makino']));
    expect([...(families.get('mill_horizontal_5') ?? [])]).toEqual(expect.arrayContaining(['Makino']));
  });

  it('keeps every visible wire machine, holder, and programming lane on legal setup paths across priority materials', () => {
    const wireMachines = MACHINE_CATALOG.filter((machine) => machine.mode === 'wire_edm');
    const wirePrograms = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === 'wire_edm');
    const wireHolders = HOLDER_PACKAGE_LIBRARY.filter((holder) => holder.mode === 'wire_edm');
    const wireMaterials = priorityWireMaterials();
    let validatedContexts = 0;
    let materialCursor = 0;

    expect(wireMachines.map((machine) => machine.manufacturer)).toEqual(expect.arrayContaining(['FANUC']));
    expect(wireHolders.map((holder) => holder.brandId)).toEqual(expect.arrayContaining(['fanuc', 'makino']));
    expect(wireMaterials.map((material) => material.group)).toEqual(
      expect.arrayContaining(['steel', 'tool_steel', 'stainless', 'aluminum', 'superalloy']),
    );

    wireMachines.forEach((machine) => {
      const selection = resolveMachineSelectionOptions(machine, '', '', 'wire_edm');
      const compatibleHolders = wireHolders.filter((holder) => holderPackageMatchesMachine(holder, machine));
      const seenToolpathTypes = new Set<string>();
      const seenMaterialGroups = new Set<MaterialCatalogItem['group']>();
      const seenProgrammingIds = new Set<string>();

      expect(selection.configurationOptions.length).toBeGreaterThan(0);
      expect(selection.controllerOptions.length).toBeGreaterThan(0);
      expect(selection.spindleOptions.length).toBeGreaterThan(0);
      expect(selection.coolantOptionIds.length).toBeGreaterThan(0);
      expect(compatibleHolders.length).toBeGreaterThan(0);

      wirePrograms.forEach((programming, programmingIndex) => {
        const licenses = licenseOptionsFor(programming);
        expect(licenses.length).toBeGreaterThan(0);

        licenses.forEach((license) => {
          const toolpaths = filterToolpathsForLicense(programming, programming.toolpaths, license.id, machine);
          expect(toolpaths.length).toBeGreaterThan(0);

          toolpaths.forEach((toolpath, toolpathIndex) => {
            const compatibleTools = TOOL_CATALOG.filter((tool) =>
              tool.mode === 'wire_edm' && toolSupportsToolpath(tool, toolpath),
            );
            const tool = compatibleTools[(programmingIndex + toolpathIndex) % compatibleTools.length];
            const holder = compatibleHolders[(programmingIndex + toolpathIndex) % compatibleHolders.length];
            const material = wireMaterials[materialCursor % wireMaterials.length];
            const preview = buildCalculatorSetupPreview({
              machineMode: 'wire_edm',
              machine,
              spindleOption: selection.spindleOptions[0],
              holderPackage: holder,
              tool,
              material,
              toolpath,
              toolDiameterMm: tool.defaultDiameter,
              docMm: tool.defaultDiameter,
              wocMm: tool.defaultDiameter,
              stockXMm: 40,
              stockYMm: 40,
              stockZMm: 30,
              coolantId: selection.coolantOptionIds[0],
            });

            expect(compatibleTools.length).toBeGreaterThan(0);
            expect(preview.machineSummary).toContain(machine.model);
            expect(preview.holderSummary).toContain(holder.label);
            expect(preview.toolSummary).toContain(tool.label);

            seenProgrammingIds.add(programming.id);
            seenToolpathTypes.add(classifyToolpathType(toolpath).id);
            seenMaterialGroups.add(material.group);
            materialCursor += 1;
            validatedContexts += 1;
          });
        });
      });

      expect(seenProgrammingIds.size).toBeGreaterThanOrEqual(wirePrograms.length);
      expect(seenToolpathTypes.has('wire_profile')).toBe(true);
      expect(seenToolpathTypes.has('skim')).toBe(true);
      expect(seenMaterialGroups).toEqual(new Set(wireMaterials.map((material) => material.group)));
    });

    expect(validatedContexts).toBeGreaterThanOrEqual(50);
  });

  it('keeps live-tool mill-turn paths selectable on the live-tooling seat without dragging Swiss-only sync paths into that seat', () => {
    const prismLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'prism-lathe');
    const gibbsLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'gibbscam-lathe');
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
    const liveToolLathe = MACHINE_CATALOG.find((machine) => machine.id === 'okuma-multus-u3000');
    const swissLathe = MACHINE_CATALOG.find((machine) => machine.id === 'citizen-l20');

    expect(prismLathe).toBeDefined();
    expect(gibbsLathe).toBeDefined();
    expect(espritLathe).toBeDefined();
    expect(liveToolLathe).toBeDefined();
    expect(swissLathe).toBeDefined();

    const prismLiveTooling = filterToolpathsForLicense(prismLathe!, prismLathe!.toolpaths, 'live-tooling', liveToolLathe!);
    const gibbsLiveTooling = filterToolpathsForLicense(gibbsLathe!, gibbsLathe!.toolpaths, 'live-tooling', liveToolLathe!);
    const espritLiveTooling = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'live-tooling', liveToolLathe!);
    const espritSwissSync = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'swiss-sync', swissLathe!);

    expect(prismLiveTooling.map((toolpath) => toolpath.id)).toEqual(expect.arrayContaining([
      'prism-syncguard-rough',
      'prism-live-handshake',
    ]));
    expect(gibbsLiveTooling.map((toolpath) => toolpath.id)).toContain('gibbs-millturn');
    expect(espritLiveTooling.map((toolpath) => toolpath.id)).toContain('esprit-live-tool');
    expect(espritLiveTooling.map((toolpath) => toolpath.id)).not.toContain('esprit-swiss-sync');
    expect(espritSwissSync.map((toolpath) => toolpath.id)).toContain('esprit-swiss-sync');
    expect(buildToolpathTypeOptions(gibbsLiveTooling).map((type) => type.id)).toContain('live_milling');
  });

  it('keeps every Okuma mill and lathe lane covered with the intended tool-body families across steel, tool steel, aluminum, and stainless', () => {
    const okumaMachines = MACHINE_CATALOG.filter((machine) => machine.manufacturer === 'Okuma');
    const prioritizedMaterials = [
      MATERIAL_CATALOG.find((material) => material.group === 'steel'),
      MATERIAL_CATALOG.find((material) => material.group === 'tool_steel'),
      MATERIAL_CATALOG.find((material) => material.group === 'aluminum'),
      MATERIAL_CATALOG.find((material) => material.group === 'stainless'),
    ].filter((material): material is MaterialCatalogItem => Boolean(material));

    const expectedIsoByGroup: Record<MaterialCatalogItem['group'], string> = {
      steel: 'P',
      tool_steel: 'H',
      stainless: 'M',
      cast: 'K',
      aluminum: 'N',
      copper: 'N',
      titanium: 'S',
      superalloy: 'S',
      exotic_alloy: 'S',
      polymer_composite: 'N',
      graphite_ceramic: 'H',
      nontraditional: 'P',
    };

    expect(okumaMachines.length).toBeGreaterThan(0);
    expect(prioritizedMaterials).toHaveLength(4);

    okumaMachines.forEach((machine) => {
      const programmingEnvironments = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === machine.mode);
      const seenProgrammingIds = new Set<string>();
      const seenGeometryClasses = new Set<string>();
      const seenBodyTypes = new Set<string>();
      const seenMaterialGroups = new Set<MaterialCatalogItem['group']>();
      let checkedToolpaths = 0;

      programmingEnvironments.forEach((programming, programmingIndex) => {
        programming.toolpaths.forEach((toolpath, toolpathIndex) => {
          if (!machineSupportsToolpath(machine.mode as ConventionalMode, machine, toolpath)) {
            return;
          }

          const compatibleTools = TOOL_CATALOG.filter((tool) =>
            tool.mode === machine.mode
            && toolSupportsToolpath(tool, toolpath)
            && supportsMachineTooling(tool, machine),
          );

          expect(compatibleTools.length).toBeGreaterThan(0);
          compatibleTools.forEach((tool) => {
            seenGeometryClasses.add(tool.geometryClass ?? '');
            seenBodyTypes.add(inferToolBodyType(tool));
          });

          const preferredTool = selectPreferredToolForToolpath(compatibleTools, toolpath);
          expect(preferredTool).toBeDefined();
          if (!preferredTool) return;

          const material = prioritizedMaterials[(programmingIndex + toolpathIndex) % prioritizedMaterials.length];
          const insertOptions = buildInsertOptionsForTool({
            tool: preferredTool,
            material,
            toolpath,
            machine,
          });

          seenProgrammingIds.add(programming.id);
          seenMaterialGroups.add(material.group);
          checkedToolpaths += 1;

          if (inferToolBodyType(preferredTool) === 'indexable') {
            expect(insertOptions.length).toBeGreaterThan(0);
            expect(insertOptions[0]?.recommended).toBe(true);
            expect(insertOptions[0]?.insertGrade.startsWith(expectedIsoByGroup[material.group])).toBe(true);
          } else {
            expect(insertOptions).toHaveLength(0);
          }
        });
      });

      expect(seenProgrammingIds).toEqual(new Set(programmingEnvironments.map((programming) => programming.id)));
      expect(seenMaterialGroups).toEqual(new Set(prioritizedMaterials.map((material) => material.group)));
      expect(checkedToolpaths).toBeGreaterThan(0);

      if (machine.id === 'okuma-m460v-5ax') {
        expect(seenBodyTypes.has('solid')).toBe(true);
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('face-mill')).toBe(true);
        expect(seenGeometryClasses.has('variable-helix-endmill')).toBe(true);
        expect(seenGeometryClasses.has('ball-endmill')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(false);
      }

      if (machine.id === 'okuma-genos-l3000') {
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('roughing-insert')).toBe(true);
        expect(seenGeometryClasses.has('finishing-insert')).toBe(true);
        expect(seenGeometryClasses.has('grooving-insert')).toBe(true);
        expect(seenGeometryClasses.has('threading-insert')).toBe(true);
        expect(seenGeometryClasses.has('boring-bar')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(false);
      }

      if (machine.id === 'okuma-multus-u3000') {
        expect(seenBodyTypes.has('solid')).toBe(true);
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('roughing-insert')).toBe(true);
        expect(seenGeometryClasses.has('finishing-insert')).toBe(true);
        expect(seenGeometryClasses.has('grooving-insert')).toBe(true);
        expect(seenGeometryClasses.has('threading-insert')).toBe(true);
        expect(seenGeometryClasses.has('boring-bar')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(true);

        const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
        const liveToolPath = espritLathe?.toolpaths.find((toolpath) => toolpath.id === 'esprit-live-tool');
        expect(liveToolPath).toBeDefined();
        if (liveToolPath) {
          const liveTool = TOOL_CATALOG.find((tool) => tool.id === 'live-tool-endmill');
          expect(liveTool).toBeDefined();
          expect(toolSupportsToolpath(liveTool!, liveToolPath)).toBe(true);
          const livePreferred = selectPreferredToolForToolpath(
            TOOL_CATALOG.filter((tool) =>
              tool.mode === 'lathe'
              && toolSupportsToolpath(tool, liveToolPath)
              && supportsMachineTooling(tool, machine),
            ),
            liveToolPath,
          );
          expect(livePreferred?.id).toBe('live-tool-endmill');
        }
      }
    });
  });

  it('keeps every visible Haas mill and lathe lane covered with legal toolpaths and the intended tooling families across steel, tool steel, aluminum, and stainless', () => {
    const haasMachines = MACHINE_CATALOG.filter((machine) => machine.manufacturer === 'Haas');
    const prioritizedMaterials = [
      MATERIAL_CATALOG.find((material) => material.group === 'steel'),
      MATERIAL_CATALOG.find((material) => material.group === 'tool_steel'),
      MATERIAL_CATALOG.find((material) => material.group === 'aluminum'),
      MATERIAL_CATALOG.find((material) => material.group === 'stainless'),
    ].filter((material): material is MaterialCatalogItem => Boolean(material));

    const expectedIsoByGroup: Record<MaterialCatalogItem['group'], string> = {
      steel: 'P',
      tool_steel: 'H',
      stainless: 'M',
      cast: 'K',
      aluminum: 'N',
      copper: 'N',
      titanium: 'S',
      superalloy: 'S',
      exotic_alloy: 'S',
      polymer_composite: 'N',
      graphite_ceramic: 'H',
      nontraditional: 'P',
    };

    expect(haasMachines).toHaveLength(5);
    expect(haasMachines.map((machine) => machine.id).sort()).toEqual([
      'haas-om-2',
      'haas-st20y',
      'haas-vf2',
      'haas-vf2ss',
      'haas-vf4-trt210',
    ]);
    expect(prioritizedMaterials).toHaveLength(4);

    haasMachines.forEach((machine) => {
      const programmingEnvironments = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === machine.mode);
      const expectedProgrammingIds = new Set(
        programmingEnvironments
          .filter((programming) =>
            programming.toolpaths.some((toolpath) => machineSupportsToolpath(machine.mode as ConventionalMode, machine, toolpath)),
          )
          .map((programming) => programming.id),
      );
      const seenProgrammingIds = new Set<string>();
      const seenGeometryClasses = new Set<string>();
      const seenBodyTypes = new Set<string>();
      const seenMaterialGroups = new Set<MaterialCatalogItem['group']>();
      let checkedToolpaths = 0;

      programmingEnvironments.forEach((programming, programmingIndex) => {
        programming.toolpaths.forEach((toolpath, toolpathIndex) => {
          if (!machineSupportsToolpath(machine.mode as ConventionalMode, machine, toolpath)) {
            return;
          }

          const compatibleTools = TOOL_CATALOG.filter((tool) =>
            tool.mode === machine.mode
            && toolSupportsToolpath(tool, toolpath)
            && supportsMachineTooling(tool, machine),
          );

          expect(compatibleTools.length).toBeGreaterThan(0);
          compatibleTools.forEach((tool) => {
            seenGeometryClasses.add(tool.geometryClass ?? '');
            seenBodyTypes.add(inferToolBodyType(tool));
          });

          const preferredTool = selectPreferredToolForToolpath(compatibleTools, toolpath);
          expect(preferredTool).toBeDefined();
          if (!preferredTool) return;

          const material = prioritizedMaterials[(programmingIndex + toolpathIndex) % prioritizedMaterials.length];
          const insertOptions = buildInsertOptionsForTool({
            tool: preferredTool,
            material,
            toolpath,
            machine,
          });

          seenProgrammingIds.add(programming.id);
          seenMaterialGroups.add(material.group);
          checkedToolpaths += 1;

          if (inferToolBodyType(preferredTool) === 'indexable') {
            expect(insertOptions.length).toBeGreaterThan(0);
            expect(insertOptions[0]?.recommended).toBe(true);
            expect(insertOptions[0]?.insertGrade.startsWith(expectedIsoByGroup[material.group])).toBe(true);
          } else {
            expect(insertOptions).toHaveLength(0);
          }
        });
      });

      expect(seenProgrammingIds).toEqual(expectedProgrammingIds);
      expect(seenMaterialGroups).toEqual(new Set(prioritizedMaterials.map((material) => material.group)));
      expect(checkedToolpaths).toBeGreaterThan(0);

      if (machine.id === 'haas-vf2' || machine.id === 'haas-vf2ss' || machine.id === 'haas-vf4-trt210') {
        expect(seenBodyTypes.has('solid')).toBe(true);
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('face-mill')).toBe(true);
        expect(seenGeometryClasses.has('variable-helix-endmill')).toBe(true);
        expect(seenGeometryClasses.has('ball-endmill')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(false);
        expect(seenGeometryClasses.has('roughing-insert')).toBe(false);
      }

      if (machine.id === 'haas-st20y') {
        expect(seenBodyTypes.has('solid')).toBe(true);
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('roughing-insert')).toBe(true);
        expect(seenGeometryClasses.has('finishing-insert')).toBe(true);
        expect(seenGeometryClasses.has('grooving-insert')).toBe(true);
        expect(seenGeometryClasses.has('threading-insert')).toBe(true);
        expect(seenGeometryClasses.has('boring-bar')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(true);
      }
    });
  });

  it('keeps every visible Hurco mill and lathe lane covered with legal toolpaths and the intended tooling families across steel, tool steel, aluminum, and stainless', () => {
    const hurcoMachines = MACHINE_CATALOG.filter((machine) => machine.manufacturer === 'Hurco');
    const prioritizedMaterials = [
      MATERIAL_CATALOG.find((material) => material.group === 'steel'),
      MATERIAL_CATALOG.find((material) => material.group === 'tool_steel'),
      MATERIAL_CATALOG.find((material) => material.group === 'aluminum'),
      MATERIAL_CATALOG.find((material) => material.group === 'stainless'),
    ].filter((material): material is MaterialCatalogItem => Boolean(material));

    const expectedIsoByGroup: Record<MaterialCatalogItem['group'], string> = {
      steel: 'P',
      tool_steel: 'H',
      stainless: 'M',
      cast: 'K',
      aluminum: 'N',
      copper: 'N',
      titanium: 'S',
      superalloy: 'S',
      exotic_alloy: 'S',
      polymer_composite: 'N',
      graphite_ceramic: 'H',
      nontraditional: 'P',
    };

    expect(hurcoMachines).toHaveLength(4);
    expect(hurcoMachines.map((machine) => machine.id).sort()).toEqual([
      'hurco-tm10i',
      'hurco-vc500i',
      'hurco-vm30i',
      'hurco-vmx30i',
    ]);
    expect(prioritizedMaterials).toHaveLength(4);

    hurcoMachines.forEach((machine) => {
      const programmingEnvironments = PROGRAMMING_ENVIRONMENTS.filter((programming) => programming.mode === machine.mode);
      const expectedProgrammingIds = new Set(
        programmingEnvironments
          .filter((programming) =>
            programming.toolpaths.some((toolpath) => machineSupportsToolpath(machine.mode as ConventionalMode, machine, toolpath)),
          )
          .map((programming) => programming.id),
      );
      const seenProgrammingIds = new Set<string>();
      const seenGeometryClasses = new Set<string>();
      const seenBodyTypes = new Set<string>();
      const seenMaterialGroups = new Set<MaterialCatalogItem['group']>();
      let checkedToolpaths = 0;

      programmingEnvironments.forEach((programming, programmingIndex) => {
        programming.toolpaths.forEach((toolpath, toolpathIndex) => {
          if (!machineSupportsToolpath(machine.mode as ConventionalMode, machine, toolpath)) {
            return;
          }

          const compatibleTools = TOOL_CATALOG.filter((tool) =>
            tool.mode === machine.mode
            && toolSupportsToolpath(tool, toolpath)
            && supportsMachineTooling(tool, machine),
          );

          expect(compatibleTools.length).toBeGreaterThan(0);
          compatibleTools.forEach((tool) => {
            seenGeometryClasses.add(tool.geometryClass ?? '');
            seenBodyTypes.add(inferToolBodyType(tool));
          });

          const preferredTool = selectPreferredToolForToolpath(compatibleTools, toolpath);
          expect(preferredTool).toBeDefined();
          if (!preferredTool) return;

          const material = prioritizedMaterials[(programmingIndex + toolpathIndex) % prioritizedMaterials.length];
          const insertOptions = buildInsertOptionsForTool({
            tool: preferredTool,
            material,
            toolpath,
            machine,
          });

          seenProgrammingIds.add(programming.id);
          seenMaterialGroups.add(material.group);
          checkedToolpaths += 1;

          if (inferToolBodyType(preferredTool) === 'indexable') {
            expect(insertOptions.length).toBeGreaterThan(0);
            expect(insertOptions[0]?.recommended).toBe(true);
            expect(insertOptions[0]?.insertGrade.startsWith(expectedIsoByGroup[material.group])).toBe(true);
          } else {
            expect(insertOptions).toHaveLength(0);
          }
        });
      });

      expect(seenProgrammingIds).toEqual(expectedProgrammingIds);
      expect(seenMaterialGroups).toEqual(new Set(prioritizedMaterials.map((material) => material.group)));
      expect(checkedToolpaths).toBeGreaterThan(0);

      if (machine.id === 'hurco-vmx30i' || machine.id === 'hurco-vc500i' || machine.id === 'hurco-vm30i') {
        expect(seenBodyTypes.has('solid')).toBe(true);
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('face-mill')).toBe(true);
        expect(seenGeometryClasses.has('variable-helix-endmill')).toBe(true);
        expect(seenGeometryClasses.has('ball-endmill')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(false);
        expect(seenGeometryClasses.has('roughing-insert')).toBe(false);
      }

      if (machine.id === 'hurco-tm10i') {
        expect(seenBodyTypes.has('solid')).toBe(true);
        expect(seenBodyTypes.has('indexable')).toBe(true);
        expect(seenGeometryClasses.has('roughing-insert')).toBe(true);
        expect(seenGeometryClasses.has('finishing-insert')).toBe(true);
        expect(seenGeometryClasses.has('grooving-insert')).toBe(true);
        expect(seenGeometryClasses.has('threading-insert')).toBe(true);
        expect(seenGeometryClasses.has('boring-bar')).toBe(true);
        expect(seenGeometryClasses.has('drill')).toBe(true);
        expect(seenGeometryClasses.has('live-tool-endmill')).toBe(false);
      }
    });
  });

  it('blocks live-tool and Swiss-only paths on conventional lathes that lack those machine capabilities', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
    const conventionalLathe = MACHINE_CATALOG.find((machine) => machine.id === 'dnsolutions-puma-v8300');
    const swissLathe = MACHINE_CATALOG.find((machine) => machine.id === 'citizen-l20');

    expect(espritLathe).toBeDefined();
    expect(conventionalLathe).toBeDefined();
    expect(swissLathe).toBeDefined();

    const conventionalLiveTooling = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'live-tooling', conventionalLathe!);
    const swissSync = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'swiss-sync', swissLathe!);

    expect(conventionalLiveTooling.map((toolpath) => toolpath.id)).not.toContain('esprit-live-tool');
    expect(conventionalLiveTooling.map((toolpath) => toolpath.id)).not.toContain('esprit-swiss-sync');
    expect(swissSync.map((toolpath) => toolpath.id)).toContain('esprit-swiss-sync');
  });

  it('keeps mill-turn and Swiss toolpaths available only on machines that can actually run them', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
    const millTurnMachine = MACHINE_CATALOG.find((machine) => machine.id === 'okuma-multus-u3000');
    const swissMachine = MACHINE_CATALOG.find((machine) => machine.id === 'citizen-l20');
    const conventionalLathe = MACHINE_CATALOG.find((machine) => machine.id === 'dnsolutions-puma-v8300');

    expect(espritLathe).toBeDefined();
    expect(millTurnMachine).toBeDefined();
    expect(swissMachine).toBeDefined();
    expect(conventionalLathe).toBeDefined();

    const millTurnPaths = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'live-tooling', millTurnMachine!);
    const swissPaths = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'swiss-sync', swissMachine!);
    const blockedMillTurn = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'live-tooling', conventionalLathe!);

    expect(millTurnPaths.map((toolpath) => toolpath.id)).toContain('esprit-live-tool');
    expect(swissPaths.map((toolpath) => toolpath.id)).toContain('esprit-swiss-sync');
    expect(blockedMillTurn.map((toolpath) => toolpath.id)).not.toContain('esprit-live-tool');
    expect(blockedMillTurn.map((toolpath) => toolpath.id)).not.toContain('esprit-swiss-sync');
  });

  it('resolves machine-aware defaults for multitask and Swiss selections instead of relying only on the CAM seat', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
    const millTurnMachine = MACHINE_CATALOG.find((machine) => machine.id === 'okuma-multus-u3000');
    const swissMachine = MACHINE_CATALOG.find((machine) => machine.id === 'citizen-l20');
    const conventionalLathe = MACHINE_CATALOG.find((machine) => machine.id === 'dnsolutions-puma-v8300');

    expect(espritLathe).toBeDefined();
    expect(millTurnMachine).toBeDefined();
    expect(swissMachine).toBeDefined();
    expect(conventionalLathe).toBeDefined();

    const millTurnSelection = resolveProgrammingSelectionState({
      programming: espritLathe!,
      machine: millTurnMachine!,
      requestedLicenseTierId: 'live-tooling',
      requestedToolpathTypeId: 'live_milling',
      requestedToolpathId: 'esprit-live-tool',
    });
    const swissSelection = resolveProgrammingSelectionState({
      programming: espritLathe!,
      machine: swissMachine!,
      requestedLicenseTierId: 'swiss-sync',
      requestedToolpathTypeId: 'swiss_sync',
      requestedToolpathId: 'esprit-swiss-sync',
    });
    const blockedSelection = resolveProgrammingSelectionState({
      programming: espritLathe!,
      machine: conventionalLathe!,
      requestedLicenseTierId: 'live-tooling',
      requestedToolpathTypeId: 'live_milling',
      requestedToolpathId: 'esprit-live-tool',
    });

    expect(millTurnSelection.toolpathId).toBe('esprit-live-tool');
    expect(millTurnSelection.toolpathTypeId).toBe('live_milling');
    expect(swissSelection.toolpathId).toBe('esprit-swiss-sync');
    expect(swissSelection.toolpathTypeId).toBe('swiss_sync');
    expect(blockedSelection.toolpathId).not.toBe('esprit-live-tool');
    expect(blockedSelection.toolpathId).not.toBe('esprit-swiss-sync');
    expect(blockedSelection.toolpathTypeId).not.toBe('live_milling');
    expect(blockedSelection.toolpathTypeId).not.toBe('swiss_sync');
  });
});
