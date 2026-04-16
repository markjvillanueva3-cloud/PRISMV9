import { describe, expect, it } from 'vitest';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import { buildProgramReleaseRouteExtras } from '../utils/programReleaseSelectorExtras';

describe('buildProgramReleaseRouteExtras', () => {
  it('stays conservative when the route does not carry a machine id', () => {
    expect(
      buildProgramReleaseRouteExtras({
        catalog: PROGRAM_RELEASE_CATALOG,
        routeSelection: {
          partClassId: 'fixture-plate',
        },
      }),
    ).toEqual({
      partClassId: 'fixture-plate',
    });
  });

  it('expands to a full selector spine when machine and part-class authority are both present', () => {
    expect(
      buildProgramReleaseRouteExtras({
        catalog: PROGRAM_RELEASE_CATALOG,
        routeSelection: {
          machineId: 'st20-turn',
          partClassId: 'turned-shaft',
        },
      }),
    ).toMatchObject({
      machineId: 'st20-turn',
      machineFamilyId: 'lathe',
      machineManufacturer: 'haas',
      partClassId: 'turned-shaft',
      toolholderId: 'capto-turn',
      toolingPackageId: 'alu-velocity',
      fixtureId: 'modular-plate',
      stockId: '174-round',
      cadSourceId: 'fusion-master',
    });
  });

  it('preserves explicit machine metadata when expanding a resolved selector spine', () => {
    expect(
      buildProgramReleaseRouteExtras({
        catalog: PROGRAM_RELEASE_CATALOG,
        routeSelection: {
          machineId: 'vf2-3x',
          machineFamilyId: 'milling-cell',
          machineManufacturer: 'jm-custom',
          partClassId: 'prismatic-bracket',
        },
      }),
    ).toMatchObject({
      machineId: 'vf2-3x',
      machineFamilyId: 'milling-cell',
      machineManufacturer: 'jm-custom',
      partClassId: 'prismatic-bracket',
    });
  });
});
