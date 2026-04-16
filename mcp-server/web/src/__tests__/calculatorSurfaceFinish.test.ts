// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  MACHINE_CATALOG,
  MATERIAL_CATALOG,
  PROGRAMMING_ENVIRONMENTS,
  TOOL_CATALOG,
} from '../data/calculatorWorkspace';
import { classifyToolpathType, getToolpathDefaults } from '../features/machine-workspace/programmingAuthorityContract';
import {
  compareSurfaceFinishToTarget,
  desiredRaForFinishTarget,
  getSurfaceFinishPreview,
  recommendFinishTargetForRa,
  SURFACE_FINISH_PRESETS,
} from '../utils/calculatorSurfaceFinish';

function findToolpath(labelPattern: RegExp) {
  const match = PROGRAMMING_ENVIRONMENTS.flatMap((programming) => programming.toolpaths).find((toolpath) =>
    labelPattern.test(toolpath.label),
  );

  expect(match).toBeDefined();
  return match!;
}

function findToolpathByOperation(operationId: string) {
  const match = PROGRAMMING_ENVIRONMENTS
    .flatMap((programming) => programming.toolpaths)
    .find((toolpath) => toolpath.operationId === operationId);

  expect(match).toBeDefined();
  return match!;
}

describe('calculator surface finish preview', () => {
  it('maps the coarse finish postures into realistic Ra anchors', () => {
    expect(desiredRaForFinishTarget('high-removal')).toBe(6.3);
    expect(desiredRaForFinishTarget('general')).toBe(3.2);
    expect(desiredRaForFinishTarget('tight-finish')).toBe(0.8);
    expect(recommendFinishTargetForRa(0.4)).toBe('tight-finish');
    expect(recommendFinishTargetForRa(6.3)).toBe('high-removal');
    expect(SURFACE_FINISH_PRESETS).toHaveLength(6);
  });

  it('treats a 5-axis H13 finishing stack as capable of a tight functional finish', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'h13');
    const tool = TOOL_CATALOG.find((item) => item.id === 'ball-endmill');
    const toolpath = findToolpath(/swarf/i);
    const defaults = getToolpathDefaults(toolpath, 'mill');

    const preview = getSurfaceFinishPreview({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath,
      toolpathTypeId: classifyToolpathType(toolpath).id,
      programmingLabel: 'Fusion 360',
      coolantId: 'tsc',
      finishTarget: 'tight-finish',
      desiredRaUm: 0.8,
      toolDiameterMm: tool?.defaultDiameter ?? 12.7,
      docMm: defaults?.isAbsolute ? defaults.docMm : (tool?.defaultDiameter ?? 12.7) * (defaults?.docMm ?? 0.3),
      wocMm: defaults?.isAbsolute ? defaults.wocMm : (tool?.defaultDiameter ?? 12.7) * (defaults?.wocMm ?? 0.2),
      defaults,
    });

    expect(preview.expectedMaxRaUm).toBeLessThanOrEqual(0.9);
    expect(['ready', 'margin']).toContain(preview.verdict);
    expect(preview.textureLabel).toMatch(/fine|precision/i);
    expect(preview.requestedSurface.laySpacingPx).toBeLessThan(preview.predictedSurface.laySpacingPx + 2);
    expect(preview.predictedSurface.processFamilyLabel).toMatch(/multiaxis/i);
    expect(preview.predictedSurface.referenceBasisLabel).toMatch(/multiaxis blended/i);
    expect(preview.predictedSurface.materialResponseLabel).toMatch(/tool steel/i);
    expect(preview.predictedSurface.imagingPromptSeed).toMatch(/clean-room comparator reference/i);
  });

  it('flags a roughing stack as unrealistic for a very fine Ra target on tool steel', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'd2');
    const tool = TOOL_CATALOG.find((item) => item.id === 'face-mill');
    const toolpath = findToolpath(/dynamic mill|adaptive/i);
    const defaults = getToolpathDefaults(toolpath, 'mill');

    const preview = getSurfaceFinishPreview({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath,
      toolpathTypeId: classifyToolpathType(toolpath).id,
      programmingLabel: 'Mastercam',
      coolantId: 'flood',
      finishTarget: 'high-removal',
      desiredRaUm: 0.4,
      toolDiameterMm: tool?.defaultDiameter ?? 76.2,
      docMm: defaults?.isAbsolute ? defaults.docMm : (tool?.defaultDiameter ?? 76.2) * (defaults?.docMm ?? 1),
      wocMm: defaults?.isAbsolute ? defaults.wocMm : (tool?.defaultDiameter ?? 76.2) * (defaults?.wocMm ?? 0.5),
      defaults,
    });

    expect(preview.expectedMinRaUm).toBeGreaterThan(0.4);
    expect(preview.verdict).toBe('unlikely');
    expect(preview.textureLabel).toMatch(/rough|production/i);
    expect(preview.predictedSurface.laySpacingPx).toBeGreaterThan(preview.requestedSurface.laySpacingPx);
    expect(preview.predictedSurface.glossOpacity).toBeLessThan(preview.requestedSurface.glossOpacity);
    expect(preview.predictedSurface.layFamily).toBe('adaptive');
    expect(preview.predictedSurface.referenceBasisLabel).toMatch(/adaptive rough milled/i);
  });

  it('keeps finish-turning on stainless in a plausible functional-finish band', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-genos-l3000');
    const material = MATERIAL_CATALOG.find((item) => item.id === '17-4ph');
    const tool = TOOL_CATALOG.find((item) => item.id === 'turn-finish');
    const toolpath = findToolpathByOperation('turning_finish');
    const defaults = getToolpathDefaults(toolpath, 'lathe');

    const toolpathTypeId = classifyToolpathType(toolpath).id;

    const preview = getSurfaceFinishPreview({
      machineMode: 'lathe',
      machine,
      material,
      tool,
      toolpath,
      toolpathTypeId,
      programmingLabel: 'ESPRIT',
      coolantId: 'flood',
      finishTarget: 'tight-finish',
      desiredRaUm: 1.6,
      toolDiameterMm: tool?.defaultDiameter ?? 12,
      docMm: defaults?.docMm ?? 0.3,
      wocMm: defaults?.wocMm ?? 0.15,
      defaults,
    });

    expect(toolpathTypeId).toBe('turning_finish');
    expect(preview.expectedMinRaUm).toBeLessThanOrEqual(1.6);
    expect(preview.expectedMaxRaUm).toBeLessThanOrEqual(2.4);
    expect(['ready', 'margin']).toContain(preview.verdict);
    expect(preview.predictedSurface.label).toMatch(/smooth|fine/i);
    expect(['turned', 'axial']).toContain(preview.predictedSurface.layFamily);
    expect(preview.predictedSurface.processFamilyLabel).toMatch(/turned|lathe|groove|bore/i);
    expect(preview.predictedSurface.referenceBasisLabel).toMatch(/turned|bore|groove/i);
  });

  it('classifies turning roughing before generic profile matching so lathe audit paths stay in the right bucket', () => {
    const toolpath = findToolpath(/turning profile roughing|turn profile roughing/i);

    expect(classifyToolpathType(toolpath).id).toBe('turning_rough');
  });

  it('compares live finish results against the requested target clearly', () => {
    expect(compareSurfaceFinishToTarget(0.35, 0.8).status).toBe('beat');
    expect(compareSurfaceFinishToTarget(0.8, 0.8).status).toBe('on-target');
    expect(compareSurfaceFinishToTarget(0.9, 0.8).status).toBe('close');
    expect(compareSurfaceFinishToTarget(1.2, 0.8).status).toBe('miss');
  });

  it('anchors the predicted finish to the live speed-feed result when one is available', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss');
    const material = MATERIAL_CATALOG.find((item) => item.id === '4140-ph');
    const tool = TOOL_CATALOG.find((item) => item.id === 'face-mill');
    const toolpath = findToolpath(/face/i);
    const defaults = getToolpathDefaults(toolpath, 'mill');

    const preview = getSurfaceFinishPreview({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath,
      toolpathTypeId: classifyToolpathType(toolpath).id,
      programmingLabel: 'Mastercam',
      coolantId: 'flood',
      finishTarget: 'general',
      desiredRaUm: 1.6,
      toolDiameterMm: tool?.defaultDiameter ?? 76.2,
      docMm: defaults?.isAbsolute ? defaults.docMm : (tool?.defaultDiameter ?? 76.2) * (defaults?.docMm ?? 0.3),
      wocMm: defaults?.isAbsolute ? defaults.wocMm : (tool?.defaultDiameter ?? 76.2) * (defaults?.wocMm ?? 0.8),
      defaults,
      actualFeedPerToothMm: 0.14,
      actualFeedRateMmPerMin: 1670,
      actualRpm: 1980,
      actualRaUm: 1.05,
      holderStyleId: 'shrink-fit',
      stabilityId: 'detail-control',
    });

    expect(preview.predictionSource).toBe('live-engine-anchor');
    expect(preview.predictionSourceLabel).toMatch(/live engine/i);
    expect(Math.abs(preview.expectedRaUm - 1.05)).toBeLessThan(0.4);
  });

  it('derives a live cut driven Ra from chip load and engagement when the solve does not return Ra directly', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');
    const material = MATERIAL_CATALOG.find((item) => item.id === 'h13');
    const tool = TOOL_CATALOG.find((item) => item.id === 'ball-endmill');
    const toolpath = findToolpath(/parallel|flow|surface/i);
    const defaults = getToolpathDefaults(toolpath, 'mill');

    const preview = getSurfaceFinishPreview({
      machineMode: 'mill',
      machine,
      material,
      tool,
      toolpath,
      toolpathTypeId: classifyToolpathType(toolpath).id,
      programmingLabel: 'hyperMILL',
      coolantId: 'tsc',
      finishTarget: 'tight-finish',
      desiredRaUm: 0.8,
      toolDiameterMm: tool?.defaultDiameter ?? 12.7,
      toolFluteCount: 2,
      docMm: defaults?.isAbsolute ? defaults.docMm : (tool?.defaultDiameter ?? 12.7) * (defaults?.docMm ?? 0.2),
      wocMm: 0.25,
      defaults,
      actualFeedRateMmPerMin: 760,
      actualFeedPerToothMm: 0.032,
      actualRpm: 12000,
      actualCuttingSpeedMpm: 280,
      actualAxialDepthMm: 0.2,
      actualRadialDepthMm: 0.25,
      holderStyleId: 'shrink-fit',
      stabilityId: 'detail-control',
    });

    expect(preview.predictionSource).toBe('live-cut-model');
    expect(preview.predictionSourceLabel).toMatch(/live cut/i);
    expect(preview.liveCalculatedRaUm).toBeDefined();
    expect(preview.liveCalculatedRaUm!).toBeGreaterThan(0.1);
    expect(preview.liveCalculatedRaUm!).toBeLessThan(1.2);
    expect(preview.predictionSourceDetail).toMatch(/chip load|engagement|cut state/i);
  });

  it('keeps threading on the comparator atlas instead of over-anchoring to a generic turning Ra solve', () => {
    const machine = MACHINE_CATALOG.find((item) => item.id === 'okuma-genos-l3000');
    const material = MATERIAL_CATALOG.find((item) => item.id === '4140-ph');
    const tool = TOOL_CATALOG.find((item) => item.id === 'turn-thread');
    const toolpath = findToolpath(/thread/i);
    const defaults = getToolpathDefaults(toolpath, 'lathe');

    const preview = getSurfaceFinishPreview({
      machineMode: 'lathe',
      machine,
      material,
      tool,
      toolpath,
      toolpathTypeId: classifyToolpathType(toolpath).id,
      programmingLabel: 'Fusion 360',
      coolantId: 'flood',
      finishTarget: 'tight-finish',
      desiredRaUm: 0.8,
      toolDiameterMm: tool?.defaultDiameter ?? 16,
      docMm: defaults?.docMm ?? 0.25,
      wocMm: defaults?.wocMm ?? 0.12,
      defaults,
      actualFeedRateMmPerMin: 220,
      actualRpm: 420,
      actualRaUm: 11.52,
      holderStyleId: 'live-tooling',
      stabilityId: 'detail-control',
    });

    expect(preview.predictionSource).toBe('atlas-model');
    expect(preview.predictionSourceLabel).toMatch(/thread comparator|atlas/i);
    expect(preview.predictionSourceDetail).toMatch(/generic turning contract|thread comparator/i);
    expect(['ready', 'stretch']).toContain(preview.verdict);
    expect(preview.predictedSurface.referenceBasisLabel).toMatch(/threaded/i);
  });
});
