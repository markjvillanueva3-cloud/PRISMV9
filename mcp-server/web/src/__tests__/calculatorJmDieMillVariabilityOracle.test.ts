import { describe, expect, it } from 'vitest';
import type {
  MachineCatalogItem,
  ProgrammingToolpathOption,
  ToolCatalogItem,
} from '../data/calculatorWorkspace';
import { HOLDER_PACKAGE_LIBRARY } from '../data/calculatorHolderLibrary';
import {
  MACHINE_CATALOG,
  MATERIAL_CATALOG,
  PROGRAMMING_ENVIRONMENTS,
  TOOL_CATALOG,
  toolSupportsToolpath,
} from '../data/calculatorWorkspace';
import {
  holderPackageMatchesMachine,
  holderPackageMatchesTool,
} from '../pages/CalculatorPage';
import {
  buildCalculatorSpeedFeedParams,
  normalizeCalculatorSpeedFeedResult,
} from '../utils/calculatorSpeedFeedContract';

const TARGET_MACHINE_IDS = [
  'haas-vf2',
  'hurco-vm30i',
  'haas-om-2',
  'roku-roku-hc658ii',
  'okuma-m460v-5ax',
] as const;

type TargetMachineId = (typeof TARGET_MACHINE_IDS)[number];

function machineById(id: TargetMachineId) {
  const machine = MACHINE_CATALOG.find((item) => item.id === id);
  if (!machine) throw new Error(`Missing machine fixture ${id}`);
  return machine;
}

function materialById(id: string) {
  const material = MATERIAL_CATALOG.find((item) => item.id === id);
  if (!material) throw new Error(`Missing material fixture ${id}`);
  return material;
}

function toolById(id: string) {
  const tool = TOOL_CATALOG.find((item) => item.id === id);
  if (!tool) throw new Error(`Missing tool fixture ${id}`);
  return tool;
}

function holderById(id: string) {
  const holder = HOLDER_PACKAGE_LIBRARY.find((item) => item.id === id);
  if (!holder) throw new Error(`Missing holder fixture ${id}`);
  return holder;
}

function programmingById(id: string) {
  const programming = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === id);
  if (!programming) throw new Error(`Missing programming fixture ${id}`);
  return programming;
}

function toolpathById(programmingId: string, toolpathId: string) {
  const programming = programmingById(programmingId);
  const toolpath = programming.toolpaths.find((item) => item.id === toolpathId);
  if (!toolpath) throw new Error(`Missing toolpath fixture ${programmingId}/${toolpathId}`);
  return toolpath;
}

function machineSupportsToolpath(machine: MachineCatalogItem, toolpath: ProgrammingToolpathOption) {
  const signature = `${toolpath.label} ${toolpath.path}`.toLowerCase();
  if (/swarf|simultaneous|5-axis|5x|multi-axis|multiaxis|variable contour/.test(signature)) {
    return machine.machineTypeId.includes('5') || /5|trt/i.test(machine.axes);
  }
  if (/horizontal/.test(signature)) {
    return /horizontal/i.test(machine.machineTypeLabel) || machine.taxonomy?.orientation === 'horizontal';
  }
  return true;
}

function expectTargetMachine(id: TargetMachineId, expected: {
  model: string;
  rpm: number;
  spindleConnectionTypeId: string;
  stations: number;
}) {
  const machine = machineById(id);
  expect(machine.mode).toBe('mill');
  expect(machine.model).toBe(expected.model);
  expect(machine.spindleRpm).toBe(expected.rpm);
  expect(machine.toolingLayout?.spindleConnectionTypeId).toBe(expected.spindleConnectionTypeId);
  expect(machine.toolingLayout?.stations).toBe(expected.stations);
  return machine;
}

type VariabilityLane = {
  name: string;
  machineId: TargetMachineId;
  materialId: string;
  toolId: string;
  holderId: string;
  programmingId: string;
  toolpathId: string;
  toolDiameterMm: number;
  docMm: number;
  wocMm: number;
  flutes: number;
  enabledMachineCoolantIds: string[];
  coolantId: string;
  toolStickoutMm: number;
  fluteLengthMm: number;
  expectedSpindleTaper: string;
  expectedPowerKw: number;
  expectedTorqueNm?: number;
  expectedRpm: number;
  expectedMachineType: string;
};

const variabilityLanes: VariabilityLane[] = [
  {
    name: 'Haas VF-2 CAT40 adaptive roughing in 4140 PH',
    machineId: 'haas-vf2',
    materialId: '4140-ph',
    toolId: 'adaptive-endmill',
    holderId: 'haimer-hydraulic-rough',
    programmingId: 'mastercam-mill',
    toolpathId: 'mc-dynamic-mill',
    toolDiameterMm: 12.7,
    docMm: 6.35,
    wocMm: 1.27,
    flutes: 5,
    enabledMachineCoolantIds: ['flood'],
    coolantId: 'flood',
    toolStickoutMm: 38,
    fluteLengthMm: 25,
    expectedSpindleTaper: 'CAT40',
    expectedPowerKw: 22.4,
    expectedTorqueNm: 122,
    expectedRpm: 8100,
    expectedMachineType: 'vertical_mill',
  },
  {
    name: 'Hurco VM30i CAT40 Big+ full-width slotting in 304',
    machineId: 'hurco-vm30i',
    materialId: '304',
    toolId: 'slot-endmill',
    holderId: 'regofix-er-collet',
    programmingId: 'mastercam-mill',
    toolpathId: 'mc-slot',
    toolDiameterMm: 9.525,
    docMm: 4,
    wocMm: 9.525,
    flutes: 4,
    enabledMachineCoolantIds: ['flood', 'tsc'],
    coolantId: 'tsc',
    toolStickoutMm: 32,
    fluteLengthMm: 20,
    expectedSpindleTaper: 'CAT40',
    expectedPowerKw: 15,
    expectedTorqueNm: 135.6,
    expectedRpm: 12000,
    expectedMachineType: 'vertical_mill',
  },
  {
    name: 'Haas OM-2 ISO20 micro engraving in 6061',
    machineId: 'haas-om-2',
    materialId: '6061',
    toolId: 'micro-endmill',
    holderId: 'haas-iso20-micro-collet',
    programmingId: 'conversational-mill',
    toolpathId: 'conv-mill-engrave',
    toolDiameterMm: 0.5,
    docMm: 0.02,
    wocMm: 0.05,
    flutes: 2,
    enabledMachineCoolantIds: ['air', 'mist'],
    coolantId: 'air',
    toolStickoutMm: 8,
    fluteLengthMm: 1.5,
    expectedSpindleTaper: 'ISO20',
    expectedPowerKw: 2.2,
    expectedRpm: 30000,
    expectedMachineType: 'vertical_mill',
  },
  {
    name: 'Roku-Roku HC 658-II HSK-C40 graphite electrode finishing',
    machineId: 'roku-roku-hc658ii',
    materialId: 'edm-graphite',
    toolId: 'micro-endmill',
    holderId: 'rokuroku-hsk-c40-micro-collet',
    programmingId: 'prism-mill',
    toolpathId: 'prism-surfaceweave-finish',
    toolDiameterMm: 0.5,
    docMm: 0.03,
    wocMm: 0.04,
    flutes: 2,
    enabledMachineCoolantIds: ['air'],
    coolantId: 'air',
    toolStickoutMm: 7,
    fluteLengthMm: 1.5,
    expectedSpindleTaper: 'HSK-C40',
    expectedPowerKw: 6.3,
    expectedRpm: 32000,
    expectedMachineType: 'vertical_mill',
  },
  {
    name: 'Okuma M460V-5AX CAT40 Big+ swarf finishing in H13',
    machineId: 'okuma-m460v-5ax',
    materialId: 'h13',
    toolId: 'ball-endmill',
    holderId: 'regofix-er-collet',
    programmingId: 'hypermill-mill',
    toolpathId: 'hm-5x-swarf',
    toolDiameterMm: 12.7,
    docMm: 0.4,
    wocMm: 0.7,
    flutes: 4,
    enabledMachineCoolantIds: ['flood', 'tsc', 'through_air'],
    coolantId: 'tsc',
    toolStickoutMm: 52,
    fluteLengthMm: 26,
    expectedSpindleTaper: 'CAT40',
    expectedPowerKw: 22,
    expectedTorqueNm: 88,
    expectedRpm: 15000,
    expectedMachineType: '5axis',
  },
];

type CatalogBaseline = {
  machineId: TargetMachineId;
  source: string;
  rpm: number;
  spindleConnectionTypeId: string;
  stations: number;
  peakPowerHp: number;
  continuousPowerKw?: number;
  peakPowerKw: number;
};

const catalogBaselines: CatalogBaseline[] = [
  {
    machineId: 'haas-vf2',
    source: 'Haas VF-2 catalog / HSMAdvisor max-machine envelope',
    rpm: 8100,
    spindleConnectionTypeId: 'cat40',
    stations: 24,
    peakPowerHp: 30,
    peakPowerKw: 22.4,
  },
  {
    machineId: 'hurco-vm30i',
    source: 'Hurco VM30i catalog and local PRISM/HSMAdvisor post defaults',
    rpm: 12000,
    spindleConnectionTypeId: 'cat40-big-plus',
    stations: 24,
    peakPowerHp: 20,
    peakPowerKw: 15,
  },
  {
    machineId: 'haas-om-2',
    source: 'Haas Office Mill supplement / HSMAdvisor max-machine envelope',
    rpm: 30000,
    spindleConnectionTypeId: 'iso20',
    stations: 20,
    peakPowerHp: 5,
    peakPowerKw: 3.7,
    continuousPowerKw: 2.2,
  },
  {
    machineId: 'roku-roku-hc658ii',
    source: 'Roku-Roku HC-658 II HSK-C40 catalog / HSMAdvisor max-machine envelope',
    rpm: 32000,
    spindleConnectionTypeId: 'hsk-c40',
    stations: 30,
    peakPowerHp: 8.4,
    peakPowerKw: 6.3,
  },
  {
    machineId: 'okuma-m460v-5ax',
    source: 'Okuma GENOS M460V-5AX catalog / HSMAdvisor max-machine envelope',
    rpm: 15000,
    spindleConnectionTypeId: 'cat40-big-plus',
    stations: 48,
    peakPowerHp: 29.5,
    peakPowerKw: 22,
  },
];

const expectedCamSystemByProgrammingId: Record<string, string> = {
  'mastercam-mill': 'Mastercam',
  'conversational-mill': 'Manual Programming',
  'prism-mill': 'PRISM',
  'hypermill-mill': 'hyperMILL',
};

function expectWithin(value: number | undefined, [min, max]: [number, number], source: string) {
  expect(value, source).toBeGreaterThanOrEqual(min);
  expect(value, source).toBeLessThanOrEqual(max);
}

function expectedHolderGaugeLengthMm(toolStickoutMm: number, fluteLengthMm: number) {
  return Number(Math.max(toolStickoutMm - fluteLengthMm * 0.55, 8).toFixed(2));
}

function expectedCoolantType(coolantId: string) {
  if (coolantId === 'tsc') return 'through_tool';
  if (coolantId === 'air') return 'dry';
  return coolantId;
}

describe('JM Die mill speed/feed variability oracle', () => {
  it('covers the canonical JM Die mill fallback machines', () => {
    const vf2 = expectTargetMachine('haas-vf2', {
      model: 'VF-2',
      rpm: 8100,
      spindleConnectionTypeId: 'cat40',
      stations: 24,
    });
    expect(vf2.controllerOptions[0]?.label).toMatch(/pre-ngc/i);

    const hurco = expectTargetMachine('hurco-vm30i', {
      model: 'VM30i',
      rpm: 12000,
      spindleConnectionTypeId: 'cat40-big-plus',
      stations: 24,
    });
    expect(hurco.controllerOptions[0]?.label).toMatch(/winmax v10/i);
    expect(hurco.powerHp).toBe(20);
    expect(hurco.spindleOptions[0]?.detail).toMatch(/15\.0 kW/i);
    expect(hurco.spindleOptions[0]?.detail).toMatch(/100 ft-lb/i);

    expectTargetMachine('haas-om-2', {
      model: 'OM-2',
      rpm: 30000,
      spindleConnectionTypeId: 'iso20',
      stations: 20,
    });

    const roku = expectTargetMachine('roku-roku-hc658ii', {
      model: 'HC 658-II',
      rpm: 32000,
      spindleConnectionTypeId: 'hsk-c40',
      stations: 30,
    });
    expect(roku.manufacturer).toBe('Roku-Roku');
    expect(roku.controllerOptions[0]?.label).toMatch(/fanuc/i);

    const okuma = expectTargetMachine('okuma-m460v-5ax', {
      model: 'GENOS M460V-5AX',
      rpm: 15000,
      spindleConnectionTypeId: 'cat40-big-plus',
      stations: 48,
    });
    expect(okuma.machineTypeId).toBe('mill_vertical_5');
    expect(okuma.powerHp).toBe(29.5);
    expect(okuma.spindleOptions[0]?.detail).toMatch(/22 kW/i);
    expect(okuma.spindleOptions[0]?.detail).toMatch(/88 Nm/i);
  });

  it('keeps HSMAdvisor and catalog baselines as envelopes, not exact cutting-result oracles', () => {
    for (const baseline of catalogBaselines) {
      const machine = machineById(baseline.machineId);
      expect(machine.spindleRpm, baseline.source).toBe(baseline.rpm);
      expect(machine.toolingLayout?.spindleConnectionTypeId, baseline.source).toBe(baseline.spindleConnectionTypeId);
      expect(machine.toolingLayout?.stations, baseline.source).toBe(baseline.stations);
      expectWithin(machine.powerHp, [baseline.peakPowerHp * 0.99, baseline.peakPowerHp * 1.01], baseline.source);

      const spindleDetail = machine.spindleOptions[0]?.detail ?? '';
      expect(spindleDetail, baseline.source).toContain(String(baseline.peakPowerKw));
      if (baseline.continuousPowerKw != null) {
        expect(spindleDetail, baseline.source).toContain(String(baseline.continuousPowerKw));
      }
    }
  });

  it('rejects impossible spindle, holder, and tool combinations', () => {
    const machines = TARGET_MACHINE_IDS.map(machineById);
    const om2 = machineById('haas-om-2');
    const roku = machineById('roku-roku-hc658ii');
    const okuma = machineById('okuma-m460v-5ax');
    const vf2 = machineById('haas-vf2');
    const hurco = machineById('hurco-vm30i');
    const faceMill = toolById('face-mill');
    const adaptiveEndmill = toolById('adaptive-endmill');
    const microEndmill = toolById('micro-endmill');

    const cat50Arbor = holderById('sandvik-cat50-shell-arbor');
    const bt30Micro = holderById('haimer-bt30-micro-collet');
    const iso20Micro = holderById('haas-iso20-micro-collet');
    const hskC40Micro = holderById('rokuroku-hsk-c40-micro-collet');
    const bigPlusFinisher = holderById('haimer-bigplus-finishing');
    const cat40Hydraulic = holderById('haimer-hydraulic-rough');
    const hskA63Holder = holderById('regofix-hsk-a63-powrgrip');
    const erCollet = holderById('regofix-er-collet');

    expect(holderPackageMatchesMachine(iso20Micro, om2)).toBe(true);
    expect(holderPackageMatchesMachine(iso20Micro, vf2)).toBe(false);
    expect(holderPackageMatchesMachine(iso20Micro, roku)).toBe(false);
    expect(holderPackageMatchesTool(iso20Micro, microEndmill)).toBe(true);
    expect(holderPackageMatchesTool(iso20Micro, faceMill)).toBe(false);

    expect(holderPackageMatchesMachine(bt30Micro, om2)).toBe(false);
    expect(holderPackageMatchesMachine(bt30Micro, vf2)).toBe(false);
    expect(holderPackageMatchesMachine(bt30Micro, roku)).toBe(false);
    expect(holderPackageMatchesTool(bt30Micro, microEndmill)).toBe(true);
    expect(holderPackageMatchesTool(bt30Micro, faceMill)).toBe(false);

    expect(holderPackageMatchesMachine(hskC40Micro, roku)).toBe(true);
    expect(holderPackageMatchesMachine(hskC40Micro, om2)).toBe(false);
    expect(holderPackageMatchesMachine(hskC40Micro, okuma)).toBe(false);
    expect(holderPackageMatchesTool(hskC40Micro, microEndmill)).toBe(true);
    expect(holderPackageMatchesTool(hskC40Micro, adaptiveEndmill)).toBe(false);

    expect(holderPackageMatchesMachine(bigPlusFinisher, okuma)).toBe(true);
    expect(holderPackageMatchesMachine(bigPlusFinisher, vf2)).toBe(false);
    expect(holderPackageMatchesMachine(bigPlusFinisher, hurco)).toBe(true);

    expect(holderPackageMatchesTool(erCollet, faceMill)).toBe(false);
    expect(holderPackageMatchesTool(cat50Arbor, faceMill)).toBe(true);
    expect(holderPackageMatchesTool(cat50Arbor, adaptiveEndmill)).toBe(false);

    for (const machine of machines) {
      expect(holderPackageMatchesMachine(cat50Arbor, machine)).toBe(false);
      expect(holderPackageMatchesMachine(hskA63Holder, machine)).toBe(false);
    }

    expect(holderPackageMatchesMachine(cat40Hydraulic, vf2)).toBe(true);
    expect(holderPackageMatchesMachine(cat40Hydraulic, hurco)).toBe(true);
    expect(holderPackageMatchesMachine(cat40Hydraulic, okuma)).toBe(true);
    expect(holderPackageMatchesMachine(cat40Hydraulic, om2)).toBe(false);
    expect(holderPackageMatchesMachine(cat40Hydraulic, roku)).toBe(false);
  });

  it('blocks cross-taper leakage and oversize tool shanks across JM Die target mills', () => {
    const hskC40Utility = holderById('rokuroku-hsk-c40-high-speed-collet');
    const hskE40OnlyHolder = {
      ...hskC40Utility,
      id: 'synthetic-hsk-e40-only',
      label: 'Synthetic HSK-E40 only package',
      spindleInterface: 'HSK-E40',
      compatibleSpindleConnectionTypeIds: ['hsk-e40'],
    };
    const holderRecords = new Map<string, (typeof HOLDER_PACKAGE_LIBRARY)[number]>([
      ...HOLDER_PACKAGE_LIBRARY.map((holder) => [holder.id, holder] as const),
      [hskE40OnlyHolder.id, hskE40OnlyHolder],
    ]);
    const holderFrom = (id: string) => {
      const holder = holderRecords.get(id);
      if (!holder) throw new Error(`Missing holder fixture ${id}`);
      return holder;
    };

    const compatibilityMatrix: Array<{
      machineId: TargetMachineId;
      validHolderIds: string[];
      invalidHolderIds: string[];
    }> = [
      {
        machineId: 'haas-vf2',
        validHolderIds: ['haimer-shrink-mill', 'haimer-hydraulic-rough', 'sandvik-shell-arbor', 'regofix-er-collet'],
        invalidHolderIds: ['haimer-bigplus-finishing', 'haas-iso20-micro-collet', 'haas-iso20-er-utility', 'rokuroku-hsk-c40-micro-collet', 'rokuroku-hsk-c40-high-speed-collet', 'synthetic-hsk-e40-only', 'sandvik-cat50-shell-arbor', 'regofix-hsk-a63-powrgrip'],
      },
      {
        machineId: 'hurco-vm30i',
        validHolderIds: ['haimer-shrink-mill', 'haimer-hydraulic-rough', 'sandvik-shell-arbor', 'regofix-er-collet', 'haimer-bigplus-finishing'],
        invalidHolderIds: ['haas-iso20-micro-collet', 'haas-iso20-er-utility', 'rokuroku-hsk-c40-micro-collet', 'rokuroku-hsk-c40-high-speed-collet', 'synthetic-hsk-e40-only', 'sandvik-cat50-shell-arbor', 'regofix-hsk-a63-powrgrip'],
      },
      {
        machineId: 'haas-om-2',
        validHolderIds: ['haas-iso20-micro-collet', 'haas-iso20-er-utility'],
        invalidHolderIds: ['haimer-shrink-mill', 'haimer-hydraulic-rough', 'sandvik-shell-arbor', 'haimer-bigplus-finishing', 'rokuroku-hsk-c40-micro-collet', 'rokuroku-hsk-c40-high-speed-collet', 'synthetic-hsk-e40-only', 'sandvik-cat50-shell-arbor', 'regofix-hsk-a63-powrgrip'],
      },
      {
        machineId: 'roku-roku-hc658ii',
        validHolderIds: ['rokuroku-hsk-c40-micro-collet', 'rokuroku-hsk-c40-high-speed-collet'],
        invalidHolderIds: ['haimer-shrink-mill', 'haimer-hydraulic-rough', 'sandvik-shell-arbor', 'haimer-bigplus-finishing', 'haas-iso20-micro-collet', 'haas-iso20-er-utility', 'synthetic-hsk-e40-only', 'sandvik-cat50-shell-arbor', 'regofix-hsk-a63-powrgrip'],
      },
      {
        machineId: 'okuma-m460v-5ax',
        validHolderIds: ['haimer-shrink-mill', 'haimer-hydraulic-rough', 'sandvik-shell-arbor', 'regofix-er-collet', 'haimer-bigplus-finishing'],
        invalidHolderIds: ['haas-iso20-micro-collet', 'haas-iso20-er-utility', 'rokuroku-hsk-c40-micro-collet', 'rokuroku-hsk-c40-high-speed-collet', 'synthetic-hsk-e40-only', 'sandvik-cat50-shell-arbor', 'regofix-hsk-a63-powrgrip'],
      },
    ];

    compatibilityMatrix.forEach(({ machineId, validHolderIds, invalidHolderIds }) => {
      const machine = machineById(machineId);
      validHolderIds.forEach((holderId) => {
        expect(holderPackageMatchesMachine(holderFrom(holderId), machine), `${machineId} should accept ${holderId}`).toBe(true);
      });
      invalidHolderIds.forEach((holderId) => {
        expect(holderPackageMatchesMachine(holderFrom(holderId), machine), `${machineId} should reject ${holderId}`).toBe(false);
      });
    });

    const faceMill = toolById('face-mill');
    const ballEndmill = toolById('ball-endmill');
    const finisher = toolById('finisher');
    const oversizeSolidTool: ToolCatalogItem = {
      ...finisher,
      id: 'oversize-16mm-solid-endmill',
      label: '16 mm oversize solid end mill',
      defaultDiameter: 16,
    };
    const iso20Utility = holderById('haas-iso20-er-utility');

    expect(holderPackageMatchesTool(iso20Utility, finisher)).toBe(true);
    expect(holderPackageMatchesTool(iso20Utility, ballEndmill)).toBe(true);
    expect(holderPackageMatchesTool(iso20Utility, faceMill)).toBe(false);
    expect(holderPackageMatchesTool(iso20Utility, oversizeSolidTool)).toBe(false);
    expect(holderPackageMatchesTool(hskC40Utility, finisher)).toBe(true);
    expect(holderPackageMatchesTool(hskC40Utility, ballEndmill)).toBe(true);
    expect(holderPackageMatchesTool(hskC40Utility, faceMill)).toBe(false);
    expect(holderPackageMatchesTool(hskC40Utility, oversizeSolidTool)).toBe(false);
  });

  it('keeps 5-axis toolpaths off the 3-axis JM Die mills', () => {
    const swarf = toolpathById('hypermill-mill', 'hm-5x-swarf');
    const dynamicMill = toolpathById('mastercam-mill', 'mc-dynamic-mill');
    const ballEndmill = toolById('ball-endmill');
    const adaptiveEndmill = toolById('adaptive-endmill');

    expect(toolSupportsToolpath(ballEndmill, swarf)).toBe(true);
    expect(machineSupportsToolpath(machineById('okuma-m460v-5ax'), swarf)).toBe(true);

    for (const id of ['haas-vf2', 'hurco-vm30i', 'haas-om-2', 'roku-roku-hc658ii'] as const) {
      expect(machineSupportsToolpath(machineById(id), swarf)).toBe(false);
    }

    expect(toolSupportsToolpath(adaptiveEndmill, dynamicMill)).toBe(true);
    for (const id of TARGET_MACHINE_IDS) {
      expect(machineSupportsToolpath(machineById(id), dynamicMill)).toBe(true);
    }
  });

  it.each(variabilityLanes)('builds a machine-accurate speed/feed payload for $name', (lane) => {
    const machine = machineById(lane.machineId);
    const material = materialById(lane.materialId);
    const tool = toolById(lane.toolId);
    const holder = holderById(lane.holderId);
    const programming = programmingById(lane.programmingId);
    const toolpath = toolpathById(lane.programmingId, lane.toolpathId);

    expect(holderPackageMatchesMachine(holder, machine)).toBe(true);
    expect(holderPackageMatchesTool(holder, tool)).toBe(true);
    expect(toolSupportsToolpath(tool, toolpath)).toBe(true);
    expect(machineSupportsToolpath(machine, toolpath)).toBe(true);

    const params = buildCalculatorSpeedFeedParams({
      machineMode: 'mill',
      machine,
      controllerOption: machine.controllerOptions[0],
      spindleOption: machine.spindleOptions[0],
      enabledControllerCapabilityIds: machine.controllerCapabilityOptions?.map((item) => item.id) ?? [],
      enabledMachineCoolantIds: lane.enabledMachineCoolantIds,
      material,
      tool,
      insertOption: null,
      holderPackage: holder,
      operationId: toolpath.operationId,
      toolpathTypeId: toolpath.operationId,
      toolpath,
      programming: {
        id: programming.id,
        label: programming.label,
        vendor: programming.vendor,
      },
      toolDiameterMm: lane.toolDiameterMm,
      docMm: lane.docMm,
      wocMm: lane.wocMm,
      flutes: lane.flutes,
      toolStickoutMm: lane.toolStickoutMm,
      fluteLengthMm: lane.fluteLengthMm,
      stockShape: 'plate',
      stockXm: 152.4,
      stockYm: 101.6,
      stockZm: 38.1,
      coolantId: lane.coolantId,
      workholdingId: lane.machineId === 'okuma-m460v-5ax' ? 'rotary-trunnion' : 'vise-soft-jaw',
      workholdingCategoryId: lane.machineId === 'okuma-m460v-5ax' ? 'fixture' : 'vise',
      workholdingPreset: lane.machineId === 'okuma-m460v-5ax'
        ? { id: 'trunnion-fixture', label: 'Trunnion fixture' }
        : { id: 'kurt-vise', label: 'Vise soft jaws' },
      stabilityId: 'production-stable',
      desiredRaUm: toolpath.operationId === 'finishing' ? 0.8 : 1.6,
      finishTarget: toolpath.operationId === 'finishing' ? 'precision' : 'general',
    });

    expect(params.machinePackage?.id).toBe(machine.id);
    expect(params.machinePackage?.manufacturer).toBe(machine.manufacturer);
    expect(params.machinePackage?.model).toBe(machine.model);
    expect(params.machine_type).toBe(lane.expectedMachineType);
    expect(params.machine_power_kw).toBeCloseTo(lane.expectedPowerKw, 3);
    if (lane.expectedTorqueNm == null) {
      expect(params.machine_max_torque_nm).toBeUndefined();
    } else {
      expect(params.machine_max_torque_nm).toBeCloseTo(lane.expectedTorqueNm, 3);
    }
    expect(params.machine_max_rpm).toBe(lane.expectedRpm);
    expect(params.spindle_taper).toBe(lane.expectedSpindleTaper);
    expect(params.machinePackage?.spindle?.max_rpm).toBe(lane.expectedRpm);
    expect(params.machinePackage?.spindle?.power_kw).toBeCloseTo(lane.expectedPowerKw, 3);
    if (lane.expectedTorqueNm == null) {
      expect(params.machinePackage?.spindle?.torque_max_nm).toBeUndefined();
    } else {
      expect(params.machinePackage?.spindle?.torque_max_nm).toBeCloseTo(lane.expectedTorqueNm, 3);
    }
    expect(params.machinePackage?.spindle?.taper).toBe(lane.expectedSpindleTaper);
    expect(params.tool_diameter_mm).toBe(lane.toolDiameterMm);
    expect(params.flutes).toBe(lane.flutes);
    expect(params.axial_depth_mm).toBe(lane.docMm);
    expect(params.radial_depth_mm).toBe(lane.wocMm);
    expect(params.radial_depth_pct).toBeCloseTo((lane.wocMm / lane.toolDiameterMm) * 100, 3);
    expect(params.tool_stickout_mm).toBe(lane.toolStickoutMm);
    expect(params.flute_length_mm).toBe(lane.fluteLengthMm);
    expect(params.overhang_ratio).toBeCloseTo(lane.toolStickoutMm / lane.toolDiameterMm, 4);
    expect(params.holder_gauge_length_mm).toBeCloseTo(expectedHolderGaugeLengthMm(lane.toolStickoutMm, lane.fluteLengthMm), 2);
    expect(params.workpiece_length_mm).toBe(152.4);
    expect(params.workpiece_width_mm).toBe(101.6);
    expect(params.workpiece_height_mm).toBe(38.1);
    expect(params.workholding_type).toBe(lane.machineId === 'okuma-m460v-5ax' ? 'fixture' : 'vise');
    expect(params.workholding_stiffness).toBe('high');
    expect(params.coolant_type).toBe(expectedCoolantType(lane.coolantId));
    expect(lane.enabledMachineCoolantIds).toContain(lane.coolantId);
    expect(params.cam_system).toBe(expectedCamSystemByProgrammingId[lane.programmingId]);
    expect(params.cam_strategy).toBe(toolpath.label);
    expect(params.holder_type).toBeDefined();
  });

  it('normalizes fallback math identities when tiny cutting outputs are rounded to zero', () => {
    const normalized = normalizeCalculatorSpeedFeedResult({
      result: {
        value: {
          spindle_rpm: { value: 10000 },
          cutting_speed_mpm: { value: 157.1 },
          feed_rate_mmmin: { value: 240 },
          feed_per_tooth_mm: { value: 0.012 },
          tangential_force_N: { value: 180 },
          power_kw: { value: 0 },
          torque_Nm: { value: 0 },
          surface_finish_Ra_um: { value: 0 },
          resolved_tool: {
            corner_radius_mm: { value: 0.2 },
          },
        },
      },
    });

    const expectedPowerKw = (180 * 157.1) / 60000;
    const expectedTorqueNm = (Number(expectedPowerKw.toFixed(4)) * 30000) / (Math.PI * 10000);
    const expectedRaUm = (0.012 ** 2 * 1000) / (32 * 0.2);

    expect(normalized.powerKw).toBeCloseTo(expectedPowerKw, 4);
    expect(normalized.torqueNm).toBeCloseTo(expectedTorqueNm, 4);
    expect(normalized.ra).toBeCloseTo(expectedRaUm, 4);
  });
});
