import { describe, expect, it } from 'vitest';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import {
  buildToolpathAdvisorSelectorAuthority,
  readProgramReleaseRouteSelection,
  resolveProgramReleaseSelectorState,
  resolveToolpathAdvisorReleaseContext,
} from '../features/machine-workspace/selectorAuthorityContract';

describe('selectorAuthorityContract', () => {
  it('reads route selections from the Program Release query string', () => {
    expect(
      readProgramReleaseRouteSelection('?machineId=st20-turn&toolholderId=capto-turn&stockId=174-round'),
    ).toMatchObject({
      machineId: 'st20-turn',
      toolholderId: 'capto-turn',
      stockId: '174-round',
    });
  });

  it('prefers exact JM Die release spine seeds when a lathe route is active', () => {
    const catalog = {
      ...PROGRAM_RELEASE_CATALOG,
      toolholders: [
        ...PROGRAM_RELEASE_CATALOG.toolholders,
        {
          id: 'th-jmd-vdi30-turning-baseline',
          label: 'JM Die VDI30 turning baseline',
          style: 'VDI30',
          gageLength: 'Short turning baseline',
          rigidity: 'High',
          note: 'Canonical JM Die lathe baseline.',
        },
      ],
      toolingPackages: [
        ...PROGRAM_RELEASE_CATALOG.toolingPackages,
        {
          id: 'tp-jmd-lathe-production',
          label: 'JM Die lathe production package',
          coverage: 'Turning rough + finish + threading',
          note: 'Canonical JM Die lathe tooling package.',
          packageCost: 420,
        },
      ],
      stockProfiles: [
        ...PROGRAM_RELEASE_CATALOG.stockProfiles,
        {
          id: 'stk-jmd-m2-round',
          label: 'JM Die M2 round',
          material: 'M2 tool steel',
          size: '1.50 in x 12 in',
          source: 'JM Die rack',
          marketPrice: 88,
          logisticsCost: 0,
          volatility: 'Low',
        },
      ],
    };

    const resolved = resolveProgramReleaseSelectorState({
      catalog,
      routeSelection: readProgramReleaseRouteSelection('?machineId=st20-turn&partClassId=turned-shaft'),
      current: {},
    });

    expect(resolved.machineId).toBe('st20-turn');
    expect(resolved.toolholderId).toBe('th-jmd-vdi30-turning-baseline');
    expect(resolved.toolingPackageId).toBe('tp-jmd-lathe-production');
    expect(resolved.stockId).toBe('stk-jmd-m2-round');
    expect(resolved.authorityNote).toContain('Route authority pinned Haas ST-20Y');
    expect(resolved.authorityNote).toContain('JM Die VDI30 turning baseline');
  });

  it('matches family-routed machine posture when the route only specifies a machine family', () => {
    const resolved = resolveProgramReleaseSelectorState({
      catalog: PROGRAM_RELEASE_CATALOG,
      routeSelection: readProgramReleaseRouteSelection('?machineFamilyId=lathe&partClassId=turned-shaft'),
      current: {},
    });

    expect(resolved.machineId).toBe('st20-turn');
    expect(resolved.authorityNote).toContain('lathe family');
  });

  it('matches manufacturer-routed machine posture when the shared catalog carries manufacturer metadata', () => {
    const catalog = {
      ...PROGRAM_RELEASE_CATALOG,
      machines: PROGRAM_RELEASE_CATALOG.machines.map((machine) => (
        machine.id === 'st20-turn'
          ? {
              ...machine,
              manufacturer: 'JM Lathe Works',
              label: 'JM Die turning cell',
              controller: 'Turning control',
            }
          : {
              ...machine,
              manufacturer: 'Other Works',
            }
      )),
    };

    const resolved = resolveProgramReleaseSelectorState({
      catalog,
      routeSelection: readProgramReleaseRouteSelection('?machineManufacturer=jm-lathe-works&partClassId=turned-shaft'),
      current: {},
    });

    expect(resolved.machineId).toBe('st20-turn');
    expect(resolved.authorityNote).toContain('jm-lathe-works manufacturer posture');
  });

  it('builds Toolpath Advisor authority from the shared Program Release catalog', () => {
    const authority = buildToolpathAdvisorSelectorAuthority(PROGRAM_RELEASE_CATALOG);

    expect(authority.defaultAxis).toBe('3-axis');
    expect(authority.defaultMaterial).toBe('steel');
    expect(authority.machineOptions.find((option) => option.value === 'lathe')?.machineId).toBe('st20-turn');
    expect(authority.materialOptions.find((option) => option.value === 'stainless')?.stockId).toBe('174-round');
    expect(authority.authorityNote).toContain('shared Program Release catalog');
  });

  it('resolves a release spine for the selected Toolpath Advisor posture', () => {
    const context = resolveToolpathAdvisorReleaseContext(PROGRAM_RELEASE_CATALOG, 'lathe', 'stainless');

    expect(context.machineId).toBe('st20-turn');
    expect(context.toolholderLabel).toBe('Capto C6 turn/mill holder');
    expect(context.stockLabel).toBe('17-4 round bar');
    expect(context.authorityNote).toContain('Shared release spine');
  });
});
