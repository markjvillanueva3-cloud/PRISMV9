import { describe, expect, it } from 'vitest';

import { buildCoolantStrategyRecommendation } from '../utils/calculatorCoolantStrategy';
import { MATERIAL_CATALOG, TOOL_CATALOG, coolantOptionsForMode } from '../data/calculatorWorkspace';

describe('buildCoolantStrategyRecommendation', () => {
  it('prefers air-led roughing for carbide roughing in steel when the machine supports it', () => {
    const recommendation = buildCoolantStrategyRecommendation({
      machineMode: 'mill',
      material: MATERIAL_CATALOG.find((item) => item.id === '4140'),
      tool: TOOL_CATALOG.find((item) => item.id === 'adaptive-endmill'),
      toolpath: {
        label: 'Dynamic Mill',
        path: 'Adaptive roughing pocket path',
        operationId: 'roughing',
      },
      finishTarget: 'high-removal',
      currentCoolantId: 'flood',
      availableCoolantOptions: coolantOptionsForMode('mill').filter((option) => ['flood', 'through_air', 'air'].includes(option.id)),
      toolDiameterMm: 12.7,
      docMm: 10,
      wocMm: 3.8,
    });

    expect(recommendation.recommendedId).toBe('through_air');
    expect(recommendation.rationale).toMatch(/Carbide roughing in steels/i);
  });

  it('prefers through-spindle coolant for stainless drilling when the machine can deliver it', () => {
    const recommendation = buildCoolantStrategyRecommendation({
      machineMode: 'mill',
      material: MATERIAL_CATALOG.find((item) => item.id === '304'),
      tool: TOOL_CATALOG.find((item) => item.id === 'carbide-drill'),
      toolpath: {
        label: 'Deep drill',
        path: 'Peck drilling path',
        operationId: 'drilling',
      },
      finishTarget: 'general',
      currentCoolantId: 'flood',
      availableCoolantOptions: coolantOptionsForMode('mill').filter((option) => ['flood', 'tsc', 'mist'].includes(option.id)),
      toolDiameterMm: 8,
      docMm: 30,
      wocMm: 8,
    });

    expect(recommendation.recommendedId).toBe('tsc');
    expect(recommendation.rationale).toMatch(/Drilling and deep centerline work/i);
  });

  it('falls back to the best supported liquid strategy when dry-air roughing is preferred but unavailable', () => {
    const recommendation = buildCoolantStrategyRecommendation({
      machineMode: 'mill',
      material: MATERIAL_CATALOG.find((item) => item.id === '4140'),
      tool: TOOL_CATALOG.find((item) => item.id === 'adaptive-endmill'),
      toolpath: {
        label: 'FeatureFlow Adaptive Roughing',
        path: 'PRISM > Mill > FeatureFlow Adaptive Roughing',
        operationId: 'roughing',
      },
      finishTarget: 'high-removal',
      currentCoolantId: 'flood',
      availableCoolantOptions: coolantOptionsForMode('mill').filter((option) => ['flood', 'tsc'].includes(option.id)),
      toolDiameterMm: 16,
      docMm: 12,
      wocMm: 5,
    });

    expect(recommendation.recommendedId).toBe('flood');
    expect(recommendation.tradeoff).toMatch(/cannot support a dry(?:\/| or )air posture/i);
  });

  it('prefers liquid-first coolant on grooving and parting tools even in steel', () => {
    const recommendation = buildCoolantStrategyRecommendation({
      machineMode: 'lathe',
      material: MATERIAL_CATALOG.find((item) => item.id === '4140'),
      tool: TOOL_CATALOG.find((item) => item.id === 'turn-groove'),
      toolpath: {
        label: 'Lathe Cutoff',
        path: 'Turning > Groove / Cutoff',
        operationId: 'grooving',
      },
      finishTarget: 'general',
      currentCoolantId: 'air',
      availableCoolantOptions: coolantOptionsForMode('lathe').filter((option) => ['tsc', 'flood', 'air'].includes(option.id)),
      toolDiameterMm: 3,
      docMm: 3,
      wocMm: 3,
    });

    expect(recommendation.recommendedId).toBe('tsc');
    expect(recommendation.rationale).toMatch(/Grooving and parting/i);
  });

  it('prefers through-coolant or flood for tapping style work', () => {
    const recommendation = buildCoolantStrategyRecommendation({
      machineMode: 'mill',
      material: MATERIAL_CATALOG.find((item) => item.id === '17-4ph'),
      tool: {
        family: 'Rigid Tap',
        label: 'M10 spiral-flute tap',
        description: 'Blind-hole tapping for stainless and PH grades.',
        geometryClass: 'threading-insert',
        toolMaterialClass: 'carbide',
        bodyType: 'solid',
        coolantThrough: true,
      },
      toolpath: {
        label: 'Rigid Tap',
        path: 'Mill > Holemaking > Tap',
        operationId: 'finishing',
      },
      finishTarget: 'general',
      currentCoolantId: 'mist',
      availableCoolantOptions: coolantOptionsForMode('mill').filter((option) => ['tsc', 'flood', 'mist'].includes(option.id)),
      toolDiameterMm: 8.5,
      docMm: 18,
      wocMm: 8.5,
    });

    expect(recommendation.recommendedId).toBe('tsc');
    expect(recommendation.rationale).toMatch(/Tapping and single-point threading/i);
  });
});
