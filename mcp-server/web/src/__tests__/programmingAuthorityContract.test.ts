import { describe, expect, it } from 'vitest';
import { MACHINE_CATALOG, PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';
import {
  buildProgrammingSelectionContext,
  buildToolpathTypeOptions,
  classifyToolpathType,
  filterToolpathsForLicense,
  getToolpathDefaults,
  resolveProgrammingSelectionState,
} from '../features/machine-workspace/programmingAuthorityContract';

describe('programmingAuthorityContract', () => {
  it('keeps live-tool and Swiss selections pinned only on machines that can actually run them', () => {
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

    expect(millTurnSelection).toMatchObject({
      licenseTierId: 'live-tooling',
      toolpathTypeId: 'live_milling',
      toolpathId: 'esprit-live-tool',
    });
    expect(swissSelection).toMatchObject({
      licenseTierId: 'swiss-sync',
      toolpathTypeId: 'swiss_sync',
      toolpathId: 'esprit-swiss-sync',
    });
    expect(blockedSelection.licenseTierId).toBe('live-tooling');
    expect(blockedSelection.toolpathTypeId).not.toBe('live_milling');
    expect(blockedSelection.toolpathId).not.toBe('esprit-live-tool');
  });

  it('builds a normalized programming selection context for blocked conventional lathes', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
    const conventionalLathe = MACHINE_CATALOG.find((machine) => machine.id === 'dnsolutions-puma-v8300');

    expect(espritLathe).toBeDefined();
    expect(conventionalLathe).toBeDefined();

    const context = buildProgrammingSelectionContext({
      programming: espritLathe!,
      machine: conventionalLathe!,
      requestedLicenseTierId: 'live-tooling',
      requestedToolpathTypeId: 'live_milling',
      requestedToolpathId: 'esprit-live-tool',
    });

    expect(context.licenseTierId).toBe('live-tooling');
    expect(context.toolpathTypeId).not.toBe('live_milling');
    expect(context.toolpathId).not.toBe('esprit-live-tool');
    expect(context.licenseOptions.map((option) => option.id)).toContain('live-tooling');
    expect(context.selectedToolpath?.id).toBe(context.toolpathId);
    expect(context.filteredToolpathOptions.map((toolpath) => toolpath.id)).toContain(context.toolpathId);
  });

  it('classifies and defaults live-tool lathe paths from the shared contract', () => {
    const espritLathe = PROGRAMMING_ENVIRONMENTS.find((programming) => programming.id === 'esprit-lathe');
    const millTurnMachine = MACHINE_CATALOG.find((machine) => machine.id === 'okuma-multus-u3000');

    expect(espritLathe).toBeDefined();
    expect(millTurnMachine).toBeDefined();

    const liveToolpaths = filterToolpathsForLicense(espritLathe!, espritLathe!.toolpaths, 'live-tooling', millTurnMachine!);
    const liveToolpath = liveToolpaths.find((toolpath) => toolpath.id === 'esprit-live-tool');

    expect(liveToolpath).toBeDefined();
    expect(classifyToolpathType(liveToolpath!)).toMatchObject({ id: 'live_milling', label: 'Live-tool milling' });
    expect(buildToolpathTypeOptions(liveToolpaths).map((option) => option.id)).toContain('live_milling');
    expect(getToolpathDefaults(liveToolpath!, 'lathe')).toMatchObject({
      docMm: 0.75,
      wocMm: 0.2,
      isAbsolute: false,
      finishTarget: 'general',
    });
  });
});
