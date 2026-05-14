import { describe, expect, it } from 'vitest';
import {
  buildCuttingParameterOptimization,
  deriveToolReachDefaults,
} from '../utils/calculatorParameterOptimization';
import { MACHINE_CATALOG, MATERIAL_CATALOG, TOOL_CATALOG } from '../data/calculatorWorkspace';

describe('calculatorParameterOptimization', () => {
  it('keeps recommended flute length and stickout in a logical order', () => {
    const tool = TOOL_CATALOG.find((item) => item.id === 'finisher');
    const defaults = deriveToolReachDefaults(tool, 9.525, 'mill');

    expect(defaults.fluteLengthMm).toBeGreaterThan(9.525);
    expect(defaults.stickoutMm).toBeGreaterThan(defaults.fluteLengthMm);
  });

  it('respects published flute and overall length on small cutters instead of inflating reach from stock thickness', () => {
    const smallRougher = {
      id: 'small-rougher',
      label: '3 mm variable rougher',
      defaultDiameter: 3,
      fluteLengthMm: 8,
      overallLengthMm: 18,
      maxApMm: 8,
      geometryClass: 'variable-helix-endmill',
      toolMaterialClass: 'carbide',
      operation: 'roughing',
    } as const;
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'a2');
    const defaults = deriveToolReachDefaults(smallRougher, 3, 'mill');
    const optimized = buildCuttingParameterOptimization({
      machineMode: 'mill',
      machine,
      material,
      tool: smallRougher,
      toolpathTypeId: 'roughing',
      operationId: 'roughing',
      holderStyleId: 'machine-standard',
      stabilityId: 'aggressive-rigid',
      coolantId: 'tsc',
      toolDiameterMm: 3,
      currentDocMm: 3,
      currentWocMm: 1.5,
      currentLocMm: defaults.fluteLengthMm,
      currentStickoutMm: defaults.stickoutMm,
      stockZMm: 40,
    });

    expect(defaults.fluteLengthMm).toBeLessThanOrEqual(8);
    expect(defaults.stickoutMm).toBeLessThanOrEqual(18);
    expect(optimized.recommendedLocMm).toBeLessThanOrEqual(8.2);
    expect(optimized.recommendedStickoutMm).toBeLessThanOrEqual(18.2);
    expect(optimized.recommendedStickoutMm).toBeGreaterThan(optimized.recommendedLocMm);
  });

  it('pushes roughing deeper than finishing for the same machine and material', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'h13');
    const tool = TOOL_CATALOG.find((item) => item.id === 'finisher');

    const finishing = buildCuttingParameterOptimization({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpathTypeId: 'surface_finish',
      operationId: 'finishing',
      holderStyleId: 'shrink-fit',
      stabilityId: 'detail-control',
      coolantId: 'tsc',
      toolDiameterMm: 9.525,
      currentDocMm: 0.4,
      currentWocMm: 0.6,
      currentLocMm: 22,
      currentStickoutMm: 44,
      stockZMm: 18,
    });

    const roughing = buildCuttingParameterOptimization({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpathTypeId: 'roughing',
      operationId: 'roughing',
      holderStyleId: 'machine-standard',
      stabilityId: 'aggressive-rigid',
      coolantId: 'tsc',
      toolDiameterMm: 9.525,
      currentDocMm: 2,
      currentWocMm: 1,
      currentLocMm: 24,
      currentStickoutMm: 46,
      stockZMm: 18,
    });

    expect(roughing.recommendedDocMm).toBeGreaterThan(finishing.recommendedDocMm);
    expect(roughing.recommendedLocMm).toBeGreaterThanOrEqual(roughing.recommendedDocMm);
    expect(finishing.recommendedStickoutMm).toBeGreaterThan(finishing.recommendedLocMm);
  });
});
