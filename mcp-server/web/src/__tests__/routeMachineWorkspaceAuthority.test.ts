import { describe, expect, it } from 'vitest';
import type { ShopMachineControllerRegistryEntry } from '../api/shopProfile';
import {
  buildLatheRouteWorkspaceContextFromCatalog,
  buildWireEdmRouteWorkspaceContextFromRegistry,
} from '../features/machine-workspace/MachineIntakeNormalizer';
import { PROGRAM_RELEASE_CATALOG } from '../features/operating-system/programReleaseFixtures';

describe('routeMachineWorkspaceAuthority', () => {
  it('builds the routed lathe workspace from the shared Program Release catalog', () => {
    const context = buildLatheRouteWorkspaceContextFromCatalog(PROGRAM_RELEASE_CATALOG);

    expect(context.mode).toBe('lathe');
    expect(context.machineId).toBe('st20-turn');
    expect(context.machineLabel).toBe('Haas ST-20Y');
    expect(context.controllerLabel).toBe('Haas NGC');
    expect(context.programReleasePath).toContain('source=lathe-upload');
    expect(context.programReleasePath).toContain('machineId=st20-turn');
    expect(context.selectorAuthorityNote).toContain('lathe family');
    expect(context.programmingAuthority?.environmentLabel).toBe('Fusion 360');
    expect(context.programmingAuthority?.licenseLabel).toBe('Live-tooling seat');
  });

  it('builds the routed wire EDM workspace from the canonical JM Die registry', () => {
    const registry: ShopMachineControllerRegistryEntry[] = [
      {
        machine_id: 'LATHE-01',
        machine_name: 'Okuma LB3000',
        machine_type: 'Lathe',
        controller_family: 'Okuma',
        controller_model: 'OSP-P300LA',
        shop_controller: 'okuma-osp-p300la',
        machine_rate_per_hour: 145,
        canonical_test_machine: false,
        program_release_ready: true,
        machine_source_root: 'H:/PRISM/JM DIE/Machines/LATHE-01',
        controller_source_root: 'H:/PRISM/JM DIE/Controllers/Okuma',
      },
      {
        machine_id: 'WEDM-01',
        machine_name: 'Sodick ALN600G',
        machine_type: 'Wire EDM',
        controller_family: 'Sodick',
        controller_model: 'LN2W',
        shop_controller: 'sodick-ln2w',
        post_processor: 'Sodick LN2W',
        machine_rate_per_hour: 95,
        canonical_test_machine: true,
        program_release_ready: true,
        machine_source_root: 'H:/PRISM/JM DIE/Machines/WEDM-01',
        controller_source_root: 'H:/PRISM/JM DIE/Controllers/Sodick',
      },
    ];

    const context = buildWireEdmRouteWorkspaceContextFromRegistry(registry);

    expect(context.mode).toBe('wire_edm');
    expect(context.machineId).toBe('WEDM-01');
    expect(context.machineLabel).toBe('Sodick ALN600G');
    expect(context.controllerId).toBe('sodick-ln2w');
    expect(context.controllerLabel).toBe('Sodick LN2W');
    expect(context.programReleasePath).toContain('machineFamilyId=wire-edm');
    expect(context.selectorAuthorityNote).toContain('canonical JM Die wire EDM registry entry');
    expect(context.programmingAuthority?.environmentLabel).toBe('Cimatron');
    expect(context.programmingAuthority?.licenseLabel).toBe('Taper + skim');
  });

  it('keeps the wire route honest when the canonical registry is still empty', () => {
    const context = buildWireEdmRouteWorkspaceContextFromRegistry([]);

    expect(context.machineId).toBe('wire-edm-route');
    expect(context.selectorAuthorityNote).toContain('staged fallback');
    expect(context.programmingAuthority?.environmentLabel).toBe('Cimatron');
  });
});
