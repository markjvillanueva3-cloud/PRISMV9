import { describe, expect, it } from 'vitest';
import type { HolderPackageOption } from '../api/calculatorData';
import type { MachineCatalogItem, MaterialCatalogItem, ToolCatalogItem } from '../data/calculatorWorkspace';
import { buildCalculatorSetupPreview } from '../utils/calculatorSetupPreview';

const baseMachine: MachineCatalogItem = {
  id: 'okuma-genos-m460v-5ax',
  mode: 'mill',
  manufacturer: 'Okuma',
  model: 'GENOS M460V-5AX',
  machineTypeId: '5-axis-vertical',
  machineTypeLabel: '5-Axis Vertical',
  family: 'GENOS',
  spindleRpm: 15000,
  powerHp: 30,
  envelope: '762 x 460 x 460 mm',
  axes: '5-axis TRT',
  coolant: 'Flood / TSC / through-air / air blast',
  coolantOptionIds: ['flood', 'tsc', 'through_air', 'air'],
  controllerOptions: [{ id: 'osp-p300ma-h', label: 'OSP-P300MA-H', detail: 'Okuma control' }],
  spindleOptions: [{ id: 'cat40-big-plus-15k', label: '15,000 RPM · CAT 40 Big+', detail: 'Big Plus spindle' }],
  notes: [],
  bestFor: ['5-axis finishing'],
  toolingLayout: {
    kind: 'magazine',
    stations: 60,
    interface: 'CAT 40 Big+',
    spindleConnectionLabel: 'CAT 40 Big+',
    spindleConnectionTypeId: 'cat40',
  },
};

const baseHolder: HolderPackageOption = {
  id: 'big-daishowa-cat40-hydraulic',
  label: 'BIG Daishowa CAT40 Hydraulic Holder',
  detail: 'Hydraulic finish holder',
  mode: 'mill',
  brandId: 'big-daishowa',
  brandLabel: 'BIG Daishowa',
  holderStyleId: 'hydraulic',
  holderStyleIds: ['hydraulic'],
  holderType: 'hydraulic holder',
  spindleInterface: 'CAT 40 Big+',
  toolInterface: 'CAT40',
  compatibleLayoutKinds: ['magazine'],
  compatibleSpindleConnectionTypeIds: ['cat40'],
  coolantThrough: true,
  maxRpm: 16000,
  source: 'database',
};

const baseTool: ToolCatalogItem = {
  id: '12mm-finisher',
  mode: 'mill',
  family: 'Finisher',
  label: '12 mm Variable-Helix Finisher',
  description: 'Variable-helix solid-carbide finisher',
  holder: 'Hydraulic',
  coating: 'AlTiN',
  defaultDiameter: 12,
  defaultFlutes: 5,
  operation: 'finishing',
  bodyType: 'solid',
  holderInterface: 'CAT40',
  maxApMm: 14,
  maxRpm: 18000,
  toolMaterialClass: 'carbide',
  geometryClass: 'variable-helix-endmill',
};

const baseMaterial: MaterialCatalogItem = {
  id: 'h13-48-52',
  group: 'tool_steel',
  groupLabel: 'Tool Steel',
  subcategoryId: 'hot_work',
  subcategoryLabel: 'Hot Work',
  isoGroup: 'H',
  name: 'H13 Tool Steel',
  hardness: '48-52 HRC',
  baseSfm: 220,
  machinability: 'Low',
  chipControl: 'Heat-sensitive',
  note: 'Hot-work tool steel',
  idealCoolant: 'through_air',
};

describe('buildCalculatorSetupPreview', () => {
  it('marks a compatible setup as aligned', () => {
    const preview = buildCalculatorSetupPreview({
      machineMode: 'mill',
      machine: baseMachine,
      spindleOption: baseMachine.spindleOptions[0],
      holderPackage: baseHolder,
      tool: baseTool,
      material: baseMaterial,
      toolpath: {
        label: 'Surface Finish Parallel',
        path: '3D > Parallel',
        operationId: 'finishing',
      },
      toolDiameterMm: 12,
      docMm: 0.6,
      wocMm: 0.4,
      stockXMm: 100,
      stockYMm: 60,
      stockZMm: 25,
      coolantId: 'through_air',
      coolantRecommendation: {
        recommendedId: 'through_air',
        recommendedLabel: 'Through-air',
        alignment: 'aligned',
        materialBaseline: 'through_air',
        rationale: 'Air-led finish posture matches the current setup.',
        tradeoff: '',
        alternatives: ['air'],
        basis: 'Process fit',
      },
    });

    expect(preview.severity).toBe('ready');
    expect(preview.zoneSeverity.tool).toBe('ready');
    expect(preview.statusLabel).toBe('Setup aligned');
  });

  it('flags an interface mismatch as a likely failure', () => {
    const preview = buildCalculatorSetupPreview({
      machineMode: 'mill',
      machine: baseMachine,
      spindleOption: baseMachine.spindleOptions[0],
      holderPackage: {
        ...baseHolder,
        id: 'hsk-holder',
        spindleInterface: 'HSK63A',
        toolInterface: 'HSK63A',
      },
      tool: baseTool,
      material: baseMaterial,
      toolpath: {
        label: '2D Adaptive Clearing',
        path: '2D > Adaptive',
        operationId: 'roughing',
      },
      toolDiameterMm: 12,
      docMm: 18,
      wocMm: 7,
      coolantId: 'flood',
      coolantRecommendation: {
        recommendedId: 'through_air',
        recommendedLabel: 'Through-air',
        alignment: 'tradeoff',
        materialBaseline: 'through_air',
        rationale: 'Carbide roughing in H13 is better air-led than flood-led.',
        tradeoff: 'Flood can thermal-shock the edge.',
        alternatives: ['air', 'mist'],
        basis: 'Material + toolpath fit',
      },
      warnings: ['Axial DOC exceeds the published limit.'],
    });

    expect(preview.severity).toBe('fail');
    expect(preview.zoneSeverity.holder).toBe('fail');
    expect(preview.zoneSeverity.cut).toBe('fail');
    expect(preview.risks.some((risk) => risk.id === 'holder-interface-mismatch')).toBe(true);
  });

  it('keeps FeatureFlow adaptive roughing out of surface finish setup rules', () => {
    const preview = buildCalculatorSetupPreview({
      machineMode: 'mill',
      machine: baseMachine,
      spindleOption: baseMachine.spindleOptions[0],
      holderPackage: baseHolder,
      tool: {
        ...baseTool,
        id: 'adaptive-rougher',
        label: '12 mm Adaptive Rougher',
        description: 'Variable-helix roughing end mill.',
        operation: 'roughing',
        maxApMm: 14,
      },
      material: baseMaterial,
      toolpath: {
        label: 'FeatureFlow Adaptive Roughing',
        path: 'PRISM > FeatureFlow > Adaptive Roughing',
        operationId: 'roughing',
      },
      toolDiameterMm: 12,
      docMm: 8,
      wocMm: 7,
      stockXMm: 100,
      stockYMm: 60,
      stockZMm: 25,
      coolantId: 'through_air',
    });

    expect(preview.risks.some((risk) => risk.id === 'roughing-woc-fail')).toBe(true);
    expect(preview.risks.some((risk) => risk.id === 'finish-woc-fail')).toBe(false);
    expect(preview.risks.some((risk) => risk.id === 'finish-doc-fail')).toBe(false);
  });
});
