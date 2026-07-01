import { describe, expect, it } from 'vitest';

import { buildCalculatorPrismModePlan, buildPurchaseRecommendationsFromToolRoi } from '../utils/calculatorPrismMode';
import { MACHINE_CATALOG, MATERIAL_CATALOG, TOOL_CATALOG, coolantOptionsForMode } from '../data/calculatorWorkspace';
import type { HolderPackageOption } from '../api/calculatorData';
import type { ToolRoiAnalysisResult } from '../api/speedfeed';

const millHolderPackages: HolderPackageOption[] = [
  {
    id: 'sandvik-shell-arbor',
    label: 'CAT40 shell mill arbor',
    detail: 'Face-milling arbor package for CAT40 machines.',
    mode: 'mill',
    brandId: 'sandvik',
    brandLabel: 'Sandvik',
    holderStyleId: 'machine-standard',
    holderStyleIds: ['machine-standard'],
    toolId: 'face-mill',
    spindleInterface: 'CAT40',
    compatibleLayoutKinds: ['magazine'],
    compatibleSpindleConnectionTypeIds: ['cat40'],
    source: 'fallback',
  },
  {
    id: 'haimer-shrink-mill',
    label: 'Shrink-fit finishing package',
    detail: 'Balanced shrink-fit package for finishing.',
    mode: 'mill',
    brandId: 'haimer',
    brandLabel: 'HAIMER',
    holderStyleId: 'shrink-fit',
    holderStyleIds: ['shrink-fit'],
    toolId: 'finisher',
    spindleInterface: 'CAT40 Big+',
    compatibleLayoutKinds: ['magazine'],
    compatibleSpindleConnectionTypeIds: ['cat40-big-plus'],
    source: 'database',
  },
];

describe('buildCalculatorPrismModePlan', () => {
  it('prefers a crib-first setup when inventory signals match the active machine, tool, and holder package', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss');
    const material = MATERIAL_CATALOG.find((item) => item.id === '4140');
    const tool = TOOL_CATALOG.find((item) => item.id === 'face-mill');

    const plan = buildCalculatorPrismModePlan({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath: {
        id: 'mc-face',
        label: 'Face milling',
        path: 'Machine standard face path',
        operationId: 'face_milling',
      },
      toolpathTypeId: 'facing',
      programmingLabel: 'Mastercam',
      finishTarget: 'general',
      stockShape: 'plate',
      stockSource: 'shop-rack',
      currentSetupSource: 'recommended',
      currentCoolantId: 'flood',
      availableCoolantOptions: coolantOptionsForMode('mill'),
      compatibleHolderPackages: millHolderPackages,
      currentHolderStyleId: 'machine-standard',
      currentHolderPackageId: 'sandvik-shell-arbor',
      recommendedFeatureIds: ['through-spindle-coolant'],
      currentFeatureIds: [],
      controllerCapabilityOptions: [],
      currentControllerCapabilityIds: [],
      inventoryWorkspace: {
        summary: 'Live crib mirrors the VF-2SS face-milling package.',
        shellNote: 'Crib is current.',
        documentTemplates: [],
        receivingQueue: [],
        departmentRoutes: [],
        checkoutQueue: [
          {
            id: 'face-mill-crib',
            toolId: 'face-mill',
            label: '3 in face mill',
            category: 'Milling cutter',
            location: 'Tool crib A-04',
            priceLabel: '$310',
            status: 'ready',
            note: 'CAT40 shell mill arbor staged and ready for VF-2SS work.',
          },
        ],
        usagePulses: [
          {
            id: 'vf2-face',
            label: 'Face mill active on 4140 plate',
            machine: 'Haas VF-2SS',
            operator: 'Avery Stone',
            state: 'In cycle',
            indexedEdges: 1,
            maxEdges: 6,
            costPerPart: '$0.82 / part',
            nextAction: 'Keep shell arbor staged.',
          },
        ],
        formulaNotes: [],
      },
      result: {
        confidence: 0.88,
        mrr: 22,
        toolLife: 56,
        ra: 2.4,
      },
      purchasingHrefBase: '/purchasing?origin=calculator',
    });

    expect(plan.recommendedSetup.setupSource).toBe('shop-crib');
    expect(plan.recommendedSetup.holderPackageId).toBe('sandvik-shell-arbor');
    expect(plan.inventoryCoverageScore).toBeGreaterThanOrEqual(75);
    expect(plan.purchaseRecommendations).toHaveLength(3);
    expect(plan.purchaseRecommendations[0]?.title).toMatch(/standard|budget|premium/i);
  });

  it('leans new-package and ranks the budget path first when live crib evidence is thin', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'd2');
    const tool = TOOL_CATALOG.find((item) => item.id === 'finisher');

    const plan = buildCalculatorPrismModePlan({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath: {
        id: 'mc-parallel',
        label: 'Surface Finish Parallel',
        path: 'Fine parallel finish',
        operationId: 'finishing',
      },
      toolpathTypeId: 'surface_finish',
      programmingLabel: 'Fusion 360',
      finishTarget: 'tight-finish',
      stockShape: 'plate',
      stockSource: 'purchased',
      currentSetupSource: 'recommended',
      currentCoolantId: 'flood',
      availableCoolantOptions: coolantOptionsForMode('mill').filter((option) => ['flood', 'tsc', 'through_air'].includes(option.id)),
      compatibleHolderPackages: [millHolderPackages[1]!],
      currentHolderStyleId: 'machine-standard',
      currentHolderPackageId: 'haimer-shrink-mill',
      recommendedFeatureIds: ['through-spindle-coolant'],
      currentFeatureIds: [],
      controllerCapabilityOptions: [
        {
          id: 'high-speed-mode',
          label: 'High-speed machining mode',
          detail: 'Smoothing and high-speed motion tuning.',
          checkTip: 'Verify the option is enabled.',
          defaultEnabled: true,
        },
      ],
      currentControllerCapabilityIds: [],
      inventoryWorkspace: null,
      result: {
        confidence: 0.52,
        mrr: 6,
        toolLife: 18,
        ra: 1.1,
      },
      purchasingHrefBase: '/purchasing?origin=calculator',
    });

    expect(plan.recommendedSetup.setupSource).toBe('new-package');
    expect(plan.recommendedSetup.coolantId).toBe('tsc');
    expect(plan.purchaseRecommendations[0]?.title).toMatch(/premium/i);
    expect(plan.purchaseRecommendations.map((recommendation) => recommendation.title)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/budget/i),
        expect.stringMatching(/standard/i),
        expect.stringMatching(/premium/i),
      ]),
    );
    expect(plan.confidenceScore).toBeLessThan(80);
    expect(plan.signals.find((signal) => signal.id === 'material')?.detail).toMatch(/Mold Steel/i);
    expect(plan.signals.find((signal) => signal.id === 'material')?.detail).toMatch(/ISO H/i);
    expect(plan.evidence.some((item) => /Preferred coolant posture: Flood or TSC/i.test(item))).toBe(true);
  });

  it('pushes PRISM mode toward air-led roughing for steel carbide roughing when the machine supports it', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === '4140');
    const tool = TOOL_CATALOG.find((item) => item.id === 'adaptive-endmill');

    const plan = buildCalculatorPrismModePlan({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath: {
        id: 'mc-dynamic-mill',
        label: 'Dynamic Mill',
        path: 'High-engagement adaptive roughing',
        operationId: 'roughing',
      },
      toolpathTypeId: 'roughing',
      programmingLabel: 'Mastercam',
      finishTarget: 'high-removal',
      stockShape: 'plate',
      stockSource: 'shop-rack',
      currentSetupSource: 'recommended',
      currentCoolantId: 'flood',
      availableCoolantOptions: coolantOptionsForMode('mill').filter((option) => ['flood', 'through_air', 'air', 'tsc'].includes(option.id)),
      toolDiameterMm: 12.7,
      docMm: 10,
      wocMm: 3.8,
      compatibleHolderPackages: millHolderPackages,
      currentHolderStyleId: 'machine-standard',
      currentHolderPackageId: 'sandvik-shell-arbor',
      recommendedFeatureIds: [],
      currentFeatureIds: [],
      controllerCapabilityOptions: [],
      currentControllerCapabilityIds: [],
      inventoryWorkspace: null,
      result: {
        confidence: 0.74,
        mrr: 30,
        toolLife: 32,
        ra: 4.5,
      },
      purchasingHrefBase: '/purchasing?origin=calculator',
    });

    expect(plan.recommendedSetup.coolantId).toBe('through_air');
    expect(plan.signals.find((signal) => signal.id === 'coolant')?.detail).toMatch(/Carbide roughing in steels/i);
  });

  it('can translate live ROI engine output into ranked PRISM purchase cards', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'd2');
    const tool = TOOL_CATALOG.find((item) => item.id === 'ball-endmill');

    const live = buildPurchaseRecommendationsFromToolRoi(
      {
        machineMode: 'mill',
        machine,
        material,
        tool,
        toolpath: {
          id: 'mc-swarf',
          label: 'Swarf',
          path: '5-axis swarf finishing',
          operationId: 'finishing',
        },
        toolpathTypeId: 'surface_finish',
        programmingLabel: 'Fusion 360',
        finishTarget: 'tight-finish',
        stockShape: 'plate',
        stockSource: 'purchased',
        currentSetupSource: 'recommended',
        currentCoolantId: 'tsc',
        availableCoolantOptions: coolantOptionsForMode('mill'),
        compatibleHolderPackages: [millHolderPackages[1]!],
        currentHolderStyleId: 'shrink-fit',
        currentHolderPackageId: 'haimer-shrink-mill',
        recommendedFeatureIds: ['through-spindle-coolant'],
        currentFeatureIds: ['through-spindle-coolant'],
        controllerCapabilityOptions: [],
        currentControllerCapabilityIds: [],
        inventoryWorkspace: null,
        result: {
          confidence: 0.82,
          mrr: 8,
          toolLife: 22,
          ra: 0.8,
        },
        purchasingHrefBase: '/purchasing?origin=calculator',
      },
      {
        crib_recommendation: null,
        budget_recommendation: {
          tool: { id: 'b', name: 'Economy finisher', diameter_mm: 12.7, material: 'carbide', coating: 'TiN', price: 85 },
          cost_per_part: { value: 4.2, unit: '$/part', uncertainty: 0.04, source: 'budget' },
          rationale: 'Lowest upfront cost, but shorter life.',
        },
        standard_recommendation: {
          tool: { id: 's', name: 'Balanced finisher', diameter_mm: 12.7, material: 'carbide', coating: 'AlTiN', price: 165 },
          cost_per_part: { value: 3.3, unit: '$/part', uncertainty: 0.03, source: 'standard' },
          rationale: 'Best balance for sustained production.',
        },
        premium_recommendation: {
          tool: { id: 'p', name: 'Premium 5-axis finisher', diameter_mm: 12.7, material: 'carbide', coating: 'nACRo', price: 310 },
          cost_per_part: { value: 2.9, unit: '$/part', uncertainty: 0.02, source: 'premium' },
          rationale: 'Best finish confidence in hard tool steel.',
        },
        roi_vs_current: {
          savings_per_part: { value: 1.4, unit: '$/part', uncertainty: 0.02, source: 'compare' },
          roi_parts: { value: 222, unit: 'parts', uncertainty: 1, source: 'compare' },
          payback_description: 'Premium path pays back quickly.',
        },
        total_cost_breakdown: {
          current_total_per_part: { value: 4.8, unit: '$/part', uncertainty: 0.03, source: 'current' },
          best_total_per_part: { value: 2.9, unit: '$/part', uncertainty: 0.02, source: 'best' },
          annual_savings: { value: 9500, unit: '$/year', uncertainty: 100, source: 'annual' },
        },
        warnings: ['Premium tier offsets price with better tool life.'],
      } satisfies ToolRoiAnalysisResult,
      88,
    );

    expect(live.sourceLabel).toMatch(/roi engine live/i);
    expect(live.recommendations).toHaveLength(3);
    expect(live.recommendations[0]?.title).toMatch(/premium/i);
    expect(live.recommendations[0]?.roiStrength).toMatch(/annual savings/i);
    expect(live.recommendations[0]?.detail).toMatch(/D2 Tool Steel/i);
    expect(live.note).toMatch(/D2 Tool Steel/i);
    expect(live.warnings).toContain('Premium tier offsets price with better tool life.');
  });
});
