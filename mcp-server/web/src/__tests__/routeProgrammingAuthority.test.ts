import { describe, expect, it } from 'vitest';
import { PROGRAMMING_ENVIRONMENTS } from '../data/calculatorWorkspace';
import {
  buildMachineWorkspaceProgrammingAuthority,
  inferProgrammingModeFromMachineSignature,
} from '../features/machine-workspace/routeProgrammingAuthority';
import { buildJMDieProgrammingCatalogAuthority } from '../utils/jmDieCalculatorProgrammingAuthority';

describe('routeProgrammingAuthority', () => {
  it('infers lathe programming posture from a routed live-tool lathe signature', () => {
    expect(
      inferProgrammingModeFromMachineSignature({
        machineFamilyId: 'lathe',
        machineLabel: 'Haas ST-20Y',
        machineKinematics: 'Lathe with Y-axis and live tooling',
        controllerLabel: 'Haas NGC',
      }),
    ).toBe('lathe');
  });

  it('builds a JM Die-seeded lathe programming posture from the shared programming catalog', () => {
    const authority = buildMachineWorkspaceProgrammingAuthority({
      mode: 'lathe',
      machineFamilyId: 'lathe',
      machineLabel: 'Haas ST-20Y',
      machineKinematics: 'Lathe with Y-axis and live tooling',
      controllerLabel: 'Haas NGC',
    });

    expect(authority?.badge).toBe('JM Die seeded programming');
    expect(authority?.environmentLabel).toBe('Fusion 360');
    expect(authority?.licenseLabel).toBe('Live-tooling seat');
    expect(authority?.summary).toContain('JM Die seeded packages loaded');
  });

  it('carries curated-service authority through the shared route helper', () => {
    const wireItems = PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === 'wire_edm');
    const authority = buildMachineWorkspaceProgrammingAuthority({
      mode: 'wire_edm',
      machineFamilyId: 'wire-edm',
      machineLabel: 'Sodick ALN600G',
      machineKinematics: 'Wire EDM',
      controllerLabel: 'Sodick LN2W',
      programmingCatalogState: {
        items: wireItems,
        authority: buildJMDieProgrammingCatalogAuthority({
          mode: 'wire_edm',
          items: wireItems,
          seedCandidates: PROGRAMMING_ENVIRONMENTS.filter((item) => item.mode === 'wire_edm'),
          liveCount: 0,
          fallbackCount: wireItems.length,
          stage: 'curated-service',
        }),
      },
    });

    expect(authority?.badge).toBe('JM Die curated programming');
    expect(authority?.environmentLabel).toBe('Cimatron');
    expect(authority?.licenseLabel).toBe('Taper + skim');
    expect(authority?.toolpathLabel).toBe('Wire Profile');
    expect(authority?.posture).toBe('curated-service');
  });
});
