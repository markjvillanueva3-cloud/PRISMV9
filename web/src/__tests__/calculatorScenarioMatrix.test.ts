// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  MACHINE_CATALOG,
  MATERIAL_CATALOG,
  MATERIAL_GROUPS,
  PROGRAMMING_ENVIRONMENTS,
  TOOL_CATALOG,
} from '../data/calculatorWorkspace';
import {
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  licenseOptionsFor,
  selectPreferredToolForToolpath,
  toolSupportsToolpath,
} from '../pages/CalculatorPage';

const FERROUS_GROUP_IDS = new Set(['steel', 'tool_steel', 'stainless']);
const NON_FERROUS_GROUP_IDS = new Set(['aluminum', 'titanium', 'superalloy', 'exotic_alloy']);
const REQUIRED_COMMON_FERROUS_IDS = [
  'h13',
  'a2',
  's7',
  'o2',
  'd2',
  '4140',
  '4140-ph',
  '1018',
  '1020',
  '1045',
  '52100',
  'a36',
  '304',
  '316',
  '17-4ph',
];
const REQUIRED_NON_FERROUS_AND_EXOTIC_IDS = [
  '6061',
  '7075',
  'ti64',
  'cp-ti-g2',
  'in718',
  'hastelloy-c276',
  'zirconium-702',
  'nitinol-55',
];

function collectModeMatrix(mode: 'mill' | 'lathe', materialGroupIds: Set<string>) {
  const materials = MATERIAL_CATALOG.filter((item) => materialGroupIds.has(item.group));
  const machines = MACHINE_CATALOG.filter((item) => item.mode === mode);
  const tools = TOOL_CATALOG.filter((item) => item.mode === mode);
  const programmingPackages = PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === mode);
  const failures: string[] = [];
  let scenarioCount = 0;
  let licensedToolpathCount = 0;

  for (const machine of machines) {
    if (machine.controllerOptions.length === 0) failures.push(`${mode}:${machine.id}:missing-controller-options`);
    if (machine.spindleOptions.length === 0) failures.push(`${mode}:${machine.id}:missing-spindle-options`);
    if (machine.coolantOptionIds.length === 0) failures.push(`${mode}:${machine.id}:missing-coolant-options`);
  }

  for (const programming of programmingPackages) {
    const licenseTiers = licenseOptionsFor(programming);
    if (licenseTiers.length === 0) {
      failures.push(`${mode}:${programming.id}:missing-license-tier`);
      continue;
    }

    for (const licenseTier of licenseTiers) {
      const licensedToolpaths = filterToolpathsForLicense(programming, programming.toolpaths, licenseTier.id);
      if (licensedToolpaths.length === 0) {
        failures.push(`${mode}:${programming.id}:${licenseTier.id}:missing-toolpaths`);
        continue;
      }

      for (const toolpath of licensedToolpaths) {
        licensedToolpathCount += 1;

        const classified = classifyToolpathType(toolpath);
        if (!classified.id || !classified.label) {
          failures.push(`${mode}:${programming.id}:${toolpath.id}:unclassified-toolpath`);
        }

        const defaults = getToolpathDefaults(toolpath, mode);
        if (!defaults) {
          failures.push(`${mode}:${programming.id}:${toolpath.id}:missing-defaults`);
          continue;
        }

        if (defaults.docMm <= 0 || defaults.wocMm <= 0) {
          failures.push(`${mode}:${programming.id}:${toolpath.id}:nonpositive-defaults`);
        }

        const compatibleTools = tools.filter((tool) => toolSupportsToolpath(tool, toolpath));
        if (compatibleTools.length === 0) {
          failures.push(`${mode}:${programming.id}:${toolpath.id}:missing-compatible-tool`);
          continue;
        }

        const preferredTool = selectPreferredToolForToolpath(tools, toolpath);
        if (!preferredTool) {
          failures.push(`${mode}:${programming.id}:${toolpath.id}:missing-preferred-tool`);
          continue;
        }

        if (!compatibleTools.some((tool) => tool.id === preferredTool.id)) {
          failures.push(`${mode}:${programming.id}:${toolpath.id}:preferred-tool-not-compatible`);
        }

        for (const material of materials) {
          if (material.baseSfm <= 0 || !material.idealCoolant) {
            failures.push(`${mode}:${material.id}:invalid-material-baseline`);
            continue;
          }

          for (const machine of machines) {
            for (const tool of compatibleTools) {
              scenarioCount += 1;
              if (!tool.supportedOperations?.length && !tool.operation) {
                failures.push(`${mode}:${tool.id}:missing-operation-support`);
              }
              if (!toolSupportsToolpath(tool, toolpath)) {
                failures.push(`${mode}:${tool.id}:${toolpath.id}:tool-compatibility-regressed`);
              }
            }
          }
        }
      }
    }
  }

  return {
    failures: Array.from(new Set(failures)),
    licensedToolpathCount,
    machineCount: machines.length,
    materialCount: materials.length,
    programmingCount: programmingPackages.length,
    scenarioCount,
    toolCount: tools.length,
  };
}

describe('calculator ferrous scenario matrix', () => {
  it('classifies mill-turn live-tool lathe paths separately from finish turning', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === 'esprit-lathe');
    const liveToolpath = espritLathe?.toolpaths.find((item) => item.id === 'esprit-live-tool');

    expect(liveToolpath).toBeTruthy();
    expect(classifyToolpathType(liveToolpath!).id).toBe('live_milling');
  });

  it('keeps Swiss synchronization paths in their own selector family instead of collapsing them into rough turning', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === 'esprit-lathe');
    const swissSyncToolpath = espritLathe?.toolpaths.find((item) => item.id === 'esprit-swiss-sync');

    expect(swissSyncToolpath).toBeTruthy();
    expect(classifyToolpathType(swissSyncToolpath!).id).toBe('swiss_sync');
  });

  it('includes the requested common tool steel, alloy steel, mild steel, and stainless baselines', () => {
    const groupIds = new Set(MATERIAL_GROUPS.map((item) => item.id));
    expect(groupIds.has('tool_steel')).toBe(true);

    const materialIds = new Set(MATERIAL_CATALOG.map((item) => item.id));
    for (const materialId of REQUIRED_COMMON_FERROUS_IDS) {
      expect(materialIds.has(materialId)).toBe(true);
    }

    expect(MATERIAL_CATALOG.find((item) => item.id === 'h13')?.group).toBe('tool_steel');
    expect(MATERIAL_CATALOG.find((item) => item.id === 'a2')?.group).toBe('tool_steel');
    expect(MATERIAL_CATALOG.find((item) => item.id === 'd2')?.group).toBe('tool_steel');
    expect(MATERIAL_CATALOG.find((item) => item.id === 'p20')?.group).toBe('tool_steel');
  });

  it('includes the common aluminum, titanium, superalloy, and exotic alloy baselines', () => {
    const materialIds = new Set(MATERIAL_CATALOG.map((item) => item.id));
    for (const materialId of REQUIRED_NON_FERROUS_AND_EXOTIC_IDS) {
      expect(materialIds.has(materialId)).toBe(true);
    }

    expect(MATERIAL_CATALOG.find((item) => item.id === '6061')?.group).toBe('aluminum');
    expect(MATERIAL_CATALOG.find((item) => item.id === 'ti64')?.group).toBe('titanium');
    expect(MATERIAL_CATALOG.find((item) => item.id === 'in718')?.group).toBe('superalloy');
    expect(MATERIAL_CATALOG.find((item) => item.id === 'hastelloy-c276')?.group).toBe('superalloy');
  });

  it('validates a large logical mill matrix across ferrous materials, machines, CAM packages, license tiers, toolpaths, and tools', () => {
    const matrix = collectModeMatrix('mill', FERROUS_GROUP_IDS);

    expect(matrix.failures).toEqual([]);
    expect(matrix.materialCount).toBeGreaterThanOrEqual(18);
    expect(matrix.toolCount).toBeGreaterThanOrEqual(8);
    expect(matrix.programmingCount).toBeGreaterThanOrEqual(10);
    expect(matrix.licensedToolpathCount).toBeGreaterThanOrEqual(70);
    expect(matrix.scenarioCount).toBeGreaterThan(12000);
  });

  it('validates a large logical lathe matrix across ferrous materials, machines, CAM packages, license tiers, toolpaths, and tools', () => {
    const matrix = collectModeMatrix('lathe', FERROUS_GROUP_IDS);

    expect(matrix.failures).toEqual([]);
    expect(matrix.materialCount).toBeGreaterThanOrEqual(18);
    expect(matrix.toolCount).toBeGreaterThanOrEqual(7);
    expect(matrix.programmingCount).toBeGreaterThanOrEqual(8);
    expect(matrix.licensedToolpathCount).toBeGreaterThanOrEqual(35);
    expect(matrix.scenarioCount).toBeGreaterThan(7000);
  });

  it('validates representative mill and lathe coverage across aluminum, titanium, superalloy, and exotic materials', () => {
    const millMatrix = collectModeMatrix('mill', NON_FERROUS_GROUP_IDS);
    const latheMatrix = collectModeMatrix('lathe', NON_FERROUS_GROUP_IDS);

    expect(millMatrix.failures).toEqual([]);
    expect(latheMatrix.failures).toEqual([]);
    expect(millMatrix.materialCount).toBeGreaterThanOrEqual(6);
    expect(latheMatrix.materialCount).toBeGreaterThanOrEqual(6);
    expect(millMatrix.scenarioCount).toBeGreaterThan(2500);
    expect(latheMatrix.scenarioCount).toBeGreaterThan(1200);

    for (const materialId of REQUIRED_NON_FERROUS_AND_EXOTIC_IDS) {
      expect(MATERIAL_CATALOG.some((item) => item.id === materialId && NON_FERROUS_GROUP_IDS.has(item.group))).toBe(true);
    }
  });
});
