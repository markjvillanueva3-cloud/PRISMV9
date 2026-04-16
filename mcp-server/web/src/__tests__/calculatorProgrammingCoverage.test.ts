import { describe, expect, it } from 'vitest';
import { PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';
import { classifyToolpathType, getToolpathDefaults } from '../pages/CalculatorPage';

function environmentById(id: string) {
  const environment = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === id);
  expect(environment, `Expected programming environment ${id} to exist in the calculator workspace`).toBeDefined();
  return environment!;
}

function toolpathByLabel(environmentId: string, label: string) {
  const environment = environmentById(environmentId);
  const toolpath = environment.toolpaths.find((item) => item.label === label);
  expect(toolpath, `Expected ${environmentId} to expose toolpath ${label}`).toBeDefined();
  return toolpath!;
}

describe('calculator programming coverage', () => {
  it('surfaces the expanded CAM package set inside the calculator workspace fallback catalog', () => {
    const ids = new Set(PROGRAMMING_ENVIRONMENTS.map((item) => item.id));

    expect(PROGRAMMING_ENVIRONMENTS.length).toBeGreaterThan(80);

    [
      'camworks-mill',
      'camworks-lathe',
      'camworks-wire',
      'catia-lathe',
      'bobcad-lathe',
      'bobcad-wire',
      'edgecam-wire',
      'nx-wire',
      'solidcam-wire',
      'sprutcam-mill',
      'sprutcam-lathe',
      'sprutcam-wire',
      'surfcam-mill',
      'surfcam-lathe',
      'surfcam-wire',
      'tebis-lathe',
      'tebis-wire',
      'topsolid-wire',
    ].forEach((id) => {
      expect(ids.has(id), `Expected ${id} in the calculator programming catalog`).toBe(true);
    });
  });

  it('classifies and defaults the newly surfaced thread, tap, ream, and chamfer strategies logically', () => {
    const threadMill = toolpathByLabel('mastercam-mill', 'Thread Milling');
    const tapping = toolpathByLabel('mastercam-mill', 'Tapping');
    const reaming = toolpathByLabel('fusion360-mill', 'Reaming');
    const chamfer = toolpathByLabel('mastercam-mill', 'Chamfer / Deburr');
    const liveTap = toolpathByLabel('mastercam-lathe', 'Live Tool Tapping');
    const highFeed = toolpathByLabel('mastercam-mill', 'High Feed Milling');
    const helicalBore = toolpathByLabel('mastercam-mill', 'Helical Bore');
    const geodesic = toolpathByLabel('fusion360-mill', 'Geodesic Finishing');
    const waterline = toolpathByLabel('nx-mill', 'Constant Z / Waterline');
    const driveCurve = toolpathByLabel('nx-mill', 'Drive Curve 5-Axis');
    const waveFinishTurn = toolpathByLabel('mastercam-lathe', 'Wave Finish Turn');

    expect(classifyToolpathType(threadMill).id).toBe('threading');
    expect(classifyToolpathType(tapping).id).toBe('threading');
    expect(classifyToolpathType(reaming).id).toBe('drilling');
    expect(classifyToolpathType(chamfer).id).toBe('engraving');
    expect(classifyToolpathType(liveTap).id).toBe('threading');
    expect(classifyToolpathType(highFeed).id).toBe('roughing');
    expect(classifyToolpathType(helicalBore).id).toBe('pocketing');
    expect(classifyToolpathType(geodesic).id).toBe('surface_finish');
    expect(classifyToolpathType(waterline).id).toBe('surface_finish');
    expect(classifyToolpathType(driveCurve).id).toBe('multiaxis');
    expect(classifyToolpathType(waveFinishTurn).id).toBe('turning_finish');

    expect(getToolpathDefaults(threadMill, 'mill')).toMatchObject({
      isAbsolute: false,
      entryStyle: 'balanced',
      finishTarget: 'tight-finish',
    });
    expect(getToolpathDefaults(reaming, 'mill')).toMatchObject({
      isAbsolute: false,
      entryStyle: 'balanced',
      finishTarget: 'tight-finish',
    });
    expect(getToolpathDefaults(chamfer, 'mill')).toMatchObject({
      isAbsolute: false,
      finishTarget: 'tight-finish',
    });
    expect(getToolpathDefaults(liveTap, 'lathe')).toMatchObject({
      isAbsolute: false,
      entryStyle: 'balanced',
      finishTarget: 'general',
    });
    expect(getToolpathDefaults(highFeed, 'mill')).toMatchObject({
      isAbsolute: false,
      entryStyle: 'balanced',
      finishTarget: 'high-removal',
    });
    expect(getToolpathDefaults(helicalBore, 'mill')).toMatchObject({
      isAbsolute: false,
      entryStyle: 'helix-ramp',
      finishTarget: 'general',
    });
    expect(getToolpathDefaults(geodesic, 'mill')).toMatchObject({
      isAbsolute: false,
      finishTarget: 'tight-finish',
    });
    expect(getToolpathDefaults(waveFinishTurn, 'lathe')).toMatchObject({
      isAbsolute: true,
      finishTarget: 'tight-finish',
    });
  });

  it('keeps the new wire packages on the expanded real cutting lanes', () => {
    ['camworks-wire', 'nx-wire', 'solidcam-wire', 'sprutcam-wire', 'surfcam-wire', 'tebis-wire', 'topsolid-wire']
      .map(environmentById)
      .forEach((environment) => {
        expect(environment.toolpaths.map((toolpath) => toolpath.label)).toEqual(expect.arrayContaining([
          '2-Axis Profile',
          '4-Axis Taper / Ruled Cut',
          'Variable Taper',
          'Wire Roughing',
          'Multi-Cut Skim',
          'No-Core / Coreless Cut',
          'Tabbed Slug Control',
          'Land / Relief Cut',
          'Rotary Wire',
          'Submerged Precision Cut',
          'Flushing Optimized Profile',
          'Punch / Die Profile',
        ]));
        expect(environment.toolpaths.length).toBeGreaterThanOrEqual(12);
      });
  });
});
