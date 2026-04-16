import { describe, expect, it } from 'vitest';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';
import { resolveProgramReleaseMachineRouteSeed } from '../utils/programReleaseRouteMachineResolver';

describe('resolveProgramReleaseMachineRouteSeed', () => {
  it('matches shorthand mill queue machine ids onto the canonical release machine profile', () => {
    expect(resolveProgramReleaseMachineRouteSeed(PROGRAM_RELEASE_CATALOG, ['VF-2'])).toEqual({
      machineId: 'vf2-3x',
      machineFamilyId: '3-axis',
      machineManufacturer: 'haas',
    });
  });

  it('matches shorthand lathe machine names onto the canonical release machine profile', () => {
    expect(resolveProgramReleaseMachineRouteSeed(PROGRAM_RELEASE_CATALOG, ['ST-20'])).toEqual({
      machineId: 'st20-turn',
      machineFamilyId: 'lathe',
      machineManufacturer: 'haas',
    });
  });

  it('matches wire edm queue labels onto the canonical release machine profile', () => {
    expect(resolveProgramReleaseMachineRouteSeed(PROGRAM_RELEASE_CATALOG, ['ALN600G'])).toEqual({
      machineId: 'aln600g-wire',
      machineFamilyId: 'wire-edm',
      machineManufacturer: 'sodick',
    });
  });

  it('returns null when no route hint maps onto the release catalog', () => {
    expect(resolveProgramReleaseMachineRouteSeed(PROGRAM_RELEASE_CATALOG, ['unknown-machine'])).toBeNull();
  });

  it('prefers earlier specific routed hints over later generic controller matches', () => {
    expect(resolveProgramReleaseMachineRouteSeed(PROGRAM_RELEASE_CATALOG, ['Haas ST-20Y', 'Haas NGC'])).toEqual({
      machineId: 'st20-turn',
      machineFamilyId: 'lathe',
      machineManufacturer: 'haas',
    });
  });
});
