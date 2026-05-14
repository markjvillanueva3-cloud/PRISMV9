import { describe, expect, it } from 'vitest';
import { buildJMDieCalculatorPostWorkflowState } from '../utils/jmDieCalculatorPostWorkflowState';
import { buildJMDieCalculatorRouteAuthority } from '../utils/jmDieCalculatorRouteAuthority';

describe('buildJMDieCalculatorPostWorkflowState', () => {
  it('builds routed lathe workspace state for calculator post workflow continuity', () => {
    const routeAuthority = buildJMDieCalculatorRouteAuthority({
      machineMode: 'lathe',
      machine: {
        id: 'haas-st20y',
        manufacturer: 'Haas',
        model: 'Haas ST-20Y',
        machineTypeId: 'turning_lathe',
      },
      material: {
        name: '17-4 PH',
        group: 'stainless',
      },
    });

    const state = buildJMDieCalculatorPostWorkflowState({
      machineMode: 'lathe',
      machine: {
        id: 'haas-st20y',
        manufacturer: 'Haas',
        model: 'Haas ST-20Y',
        machineTypeLabel: 'Turning center',
        family: 'Turning',
        axes: 'X / Z / C / Y',
      },
      material: {
        id: '17-4-ph',
        name: '17-4 PH',
        group: 'stainless',
      },
      controllerOption: {
        id: 'haas_ngc',
        label: 'Haas NGC',
      },
      holderStyle: 'capto-c6',
      stockDiameterMm: 38,
      stockLengthMm: 120,
      stockThicknessMm: 38,
      targetRaUm: 1.6,
      programReleasePath: '/print-to-cnc?machineId=st20-turn',
      routeAuthority,
      programmingAuthority: {
        badge: 'JM Die seeded programming',
        summary: 'JM Die seeded packages loaded for this routed posture.',
        posture: 'fallback-staged',
        note: 'JM Die seeded turning package is active.',
      },
      programming: {
        id: 'fusion_360',
        label: 'Fusion 360',
        vendor: 'Autodesk',
        badge: 'Fusion package',
        summary: 'Turning-ready package',
      },
      licenseLabel: 'Manufacturing Extension',
      toolpathTypeLabel: 'Turning',
      toolpath: {
        label: 'Turning Profile',
        operationId: 'turning_profile',
      },
    });

    expect(state.machinePosture).toBe('lathe');
    expect(state.workspaceContext?.mode).toBe('lathe');
    expect(state.workspaceContext?.machineId).toBe('st20-turn');
    expect(state.workspaceContext?.controllerLabel).toBe('Haas NGC');
    expect(state.workspaceContext?.programmingAuthority?.environmentLabel).toBe('Fusion 360');
    expect(state.unsupportedReason).toBeUndefined();
  });

  it('keeps wire edm post workflow fail-closed while still carrying routed authority', () => {
    const routeAuthority = buildJMDieCalculatorRouteAuthority({
      machineMode: 'wire_edm',
      machine: {
        id: 'sodick-aln600g',
        manufacturer: 'Sodick',
        model: 'Sodick ALN600G',
        machineTypeId: 'wire_edm',
      },
      material: {
        name: 'D2',
        group: 'tool steel',
      },
    });

    const state = buildJMDieCalculatorPostWorkflowState({
      machineMode: 'wire_edm',
      machine: {
        id: 'sodick-aln600g',
        manufacturer: 'Sodick',
        model: 'Sodick ALN600G',
        machineTypeLabel: 'Wire EDM',
        family: 'EDM',
        axes: 'X / Y / U / V',
      },
      material: {
        id: 'd2',
        name: 'D2',
        group: 'tool steel',
      },
      controllerOption: {
        id: 'sodick',
        label: 'Sodick LN2W',
      },
      holderStyle: 'fine-wire',
      stockDiameterMm: 0,
      stockLengthMm: 80,
      stockThicknessMm: 24,
      targetRaUm: 1.1,
      programReleasePath: '/print-to-cnc?machineId=aln600g-wire',
      routeAuthority,
      programmingAuthority: {
        badge: 'JM Die curated programming',
        summary: 'JM Die curated wire packages are active.',
        posture: 'curated-service',
        note: 'JM Die curated wire package is active.',
      },
      programming: {
        id: 'cimatron',
        label: 'Cimatron',
        vendor: 'Cimatron',
        badge: 'Wire package',
        summary: 'Wire package',
      },
      licenseLabel: 'Wire Expert',
      toolpathTypeLabel: 'Wire Profile',
      toolpath: {
        label: 'Wire Profile',
        operationId: 'wire_profile',
      },
    });

    expect(state.workspaceContext?.mode).toBe('wire_edm');
    expect(state.workspaceContext?.machineId).toBe('aln600g-wire');
    expect(state.unsupportedReason).toContain('routed wire EDM posture');
  });
});
