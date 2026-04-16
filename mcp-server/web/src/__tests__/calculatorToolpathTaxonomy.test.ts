import { describe, expect, it } from 'vitest';
import { MACHINE_CATALOG, PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';
import {
  buildToolpathTypeOptions,
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  licenseOptionsFor,
} from '../pages/CalculatorPage';

function toolpathById(programmingId: string, toolpathId: string) {
  const programming = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === programmingId);
  expect(programming).toBeDefined();
  const toolpath = programming?.toolpaths.find((item) => item.id === toolpathId);
  expect(toolpath).toBeDefined();
  return { programming: programming!, toolpath: toolpath! };
}

describe('calculator toolpath taxonomy completeness', () => {
  it('keeps Swiss, live-tool, and nontraditional families in the intended taxonomy buckets', () => {
    const swissSync = toolpathById('esprit-lathe', 'esprit-swiss-sync').toolpath;
    const liveTool = toolpathById('prism-lathe', 'prism-live-handshake').toolpath;
    const latheDrill = toolpathById('mastercam-lathe', 'mc-lathe-drill').toolpath;
    const swarf = toolpathById('fusion360-mill', 'f360-swarf').toolpath;
    const wireSkim = toolpathById('mastercam-wire', 'mc-wire-skim').toolpath;
    const laserMark = toolpathById('basic-laser', 'basic-laser-mark').toolpath;
    const waterjetTaper = toolpathById('basic-waterjet', 'basic-wj-taper').toolpath;
    const prismWaterjetTaper = toolpathById('prism-waterjet', 'prism-wj-taperlock').toolpath;

    expect(classifyToolpathType(swissSync).id).toBe('swiss_sync');
    expect(classifyToolpathType(liveTool).id).toBe('live_milling');
    expect(classifyToolpathType(latheDrill).id).toBe('drilling');
    expect(classifyToolpathType(swarf).id).toBe('multiaxis');
    expect(classifyToolpathType(wireSkim).id).toBe('skim');
    expect(classifyToolpathType(laserMark).id).toBe('marking');
    expect(classifyToolpathType(waterjetTaper).id).toBe('taper_control');
    expect(classifyToolpathType(prismWaterjetTaper).id).toBe('taper_control');

    expect(buildToolpathTypeOptions([swissSync]).map((item) => item.id)).toEqual(['all', 'swiss_sync']);
    expect(buildToolpathTypeOptions([liveTool]).map((item) => item.id)).toContain('live_milling');
    expect(buildToolpathTypeOptions([wireSkim]).map((item) => item.id)).toContain('skim');
  });

  it('seeds milling-style DOC and WOC defaults for live-tool mill-turn paths', () => {
    const prismLiveTool = toolpathById('prism-lathe', 'prism-live-handshake').toolpath;
    const espritLiveTool = toolpathById('esprit-lathe', 'esprit-live-tool').toolpath;

    const prismDefaults = getToolpathDefaults(prismLiveTool, 'lathe');
    const espritDefaults = getToolpathDefaults(espritLiveTool, 'lathe');

    expect(prismDefaults).toMatchObject({
      isAbsolute: false,
      entryStyle: 'balanced',
      finishTarget: 'general',
    });
    expect(prismDefaults?.docMm).toBeGreaterThan(0.5);
    expect(prismDefaults?.wocMm).toBeGreaterThan(0.1);

    expect(espritDefaults).toMatchObject({
      isAbsolute: false,
      entryStyle: 'balanced',
      finishTarget: 'general',
    });
    expect(espritDefaults?.docMm).toBeGreaterThan(0.5);
    expect(espritDefaults?.wocMm).toBeGreaterThan(0.1);
  });

  it('keeps Swiss sync and live-tool lathe paths visible under the correct license seats', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === 'esprit-lathe');
    const prismLathe = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === 'prism-lathe');
    const swissMachine = MACHINE_CATALOG.find((item) => item.id === 'citizen-l20');
    const liveToolMachine = MACHINE_CATALOG.find((item) => item.id === 'haas-st20y');

    expect(espritLathe).toBeDefined();
    expect(prismLathe).toBeDefined();
    expect(swissMachine).toBeDefined();
    expect(liveToolMachine).toBeDefined();

    const espritSwissSync = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'swiss-sync', swissMachine);
    const espritLiveTool = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'live-tooling', liveToolMachine);
    const prismLiveTool = filterToolpathsForLicense(prismLathe!, prismLathe!.toolpaths, 'live-tooling', liveToolMachine);
    const latheLicensedPaths = PROGRAMMING_ENVIRONMENTS
      .filter((item) => item.mode === 'lathe')
      .flatMap((item) =>
        licenseOptionsFor(item).flatMap((license) => filterToolpathsForLicense(item, item.toolpaths, license.id, liveToolMachine)),
      );
    const liveToolCategories = buildToolpathTypeOptions(latheLicensedPaths).map((item) => item.id);

    expect(espritSwissSync.map((item) => item.id)).toContain('esprit-swiss-sync');
    expect(espritLiveTool.map((item) => item.id)).toContain('esprit-live-tool');
    expect(prismLiveTool.map((item) => item.id)).toContain('prism-live-handshake');
    expect(espritLiveTool.map((item) => item.id)).not.toContain('esprit-swiss-sync');
    expect(filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'turning-core', swissMachine).map((item) => item.id)).not.toContain('esprit-swiss-sync');
    expect(liveToolCategories).toContain('drilling');

    expect(licenseOptionsFor(espritLathe!).map((item) => item.id)).toEqual([
      'turning-core',
      'live-tooling',
      'swiss-sync',
    ]);
  });

  it('blocks simultaneous 5-axis mill toolpaths on 3-axis and 4-axis machines while keeping them on 5-axis machines', () => {
    const fusionMill = PROGRAMMING_ENVIRONMENTS.find((item) => item.id === 'fusion360-mill');
    const threeAxisMachine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss');
    const fourAxisMachine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf4-trt210');
    const fiveAxisMachine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');

    expect(fusionMill).toBeDefined();
    expect(threeAxisMachine).toBeDefined();
    expect(fourAxisMachine).toBeDefined();
    expect(fiveAxisMachine).toBeDefined();

    const threeAxisPaths = filterToolpathsForLicense(fusionMill!, fusionMill!.toolpaths, 'multiaxis', threeAxisMachine);
    const fourAxisPaths = filterToolpathsForLicense(fusionMill!, fusionMill!.toolpaths, 'multiaxis', fourAxisMachine);
    const fiveAxisPaths = filterToolpathsForLicense(fusionMill!, fusionMill!.toolpaths, 'multiaxis', fiveAxisMachine);

    expect(threeAxisPaths.map((item) => item.id)).not.toContain('f360-swarf');
    expect(fourAxisPaths.map((item) => item.id)).not.toContain('f360-swarf');
    expect(fiveAxisPaths.map((item) => item.id)).toContain('f360-swarf');
  });

  it('allows indexed 4-axis rotary paths on 4-axis and 5-axis machines but blocks them on 3-axis machines', () => {
    const indexedFixture = {
      id: 'synthetic-indexed-rotary',
      label: '4th Axis Rotary Wrap',
      path: 'Synthetic > Mill > Multi-Axis > Rotary Wrap',
      operationId: 'finishing',
    };
    const indexedProgramming = {
      id: 'synthetic-mill',
      mode: 'mill' as const,
      kind: 'cam' as const,
      toolpaths: [indexedFixture],
    };
    const threeAxisMachine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf2ss');
    const fourAxisMachine = MACHINE_CATALOG.find((item) => item.id === 'haas-vf4-trt210');
    const fiveAxisMachine = MACHINE_CATALOG.find((item) => item.id === 'okuma-m460v-5ax');

    expect(threeAxisMachine).toBeDefined();
    expect(fourAxisMachine).toBeDefined();
    expect(fiveAxisMachine).toBeDefined();

    expect(
      filterToolpathsForLicense(indexedProgramming, indexedProgramming.toolpaths, 'multiaxis', threeAxisMachine).map((item) => item.id),
    ).not.toContain('synthetic-indexed-rotary');
    expect(
      filterToolpathsForLicense(indexedProgramming, indexedProgramming.toolpaths, 'multiaxis', fourAxisMachine).map((item) => item.id),
    ).toContain('synthetic-indexed-rotary');
    expect(
      filterToolpathsForLicense(indexedProgramming, indexedProgramming.toolpaths, 'multiaxis', fiveAxisMachine).map((item) => item.id),
    ).toContain('synthetic-indexed-rotary');
  });
});
