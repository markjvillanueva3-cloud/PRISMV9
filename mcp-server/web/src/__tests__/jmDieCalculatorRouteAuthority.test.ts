import { describe, expect, it } from 'vitest';
import { buildJMDieCalculatorRouteAuthority } from '../utils/jmDieCalculatorRouteAuthority';

describe('buildJMDieCalculatorRouteAuthority', () => {
  it('pins common mill calculator setups onto the shared 3-axis JM Die release spine', () => {
    const authority = buildJMDieCalculatorRouteAuthority({
      machineMode: 'mill',
      machine: {
        id: 'haas-vf2ss',
        manufacturer: 'Haas',
        model: 'VF-2SS',
        machineTypeId: 'mill_vertical_3',
      },
      material: {
        name: '6061-T6',
        group: 'aluminum',
      },
    });

    expect(authority.routeSelection.machineId).toBe('vf2-3x');
    expect(authority.routeSelection.machineFamilyId).toBe('3-axis');
    expect(authority.routeSelection.machineManufacturer).toBe('haas');
    expect(authority.routeSelection.toolingPackageId).toBe('alu-velocity');
    expect(authority.routeSelection.stockId).toBe('6061-plate');
    expect(authority.routeSelection.partClassId).toBe('prismatic-bracket');
    expect(authority.toolpathSupported).toBe(true);
  });

  it('keeps turning setups on the shared JM Die lathe release spine', () => {
    const authority = buildJMDieCalculatorRouteAuthority({
      machineMode: 'lathe',
      machine: {
        id: 'haas-st20y',
        manufacturer: 'Haas',
        model: 'ST-20Y',
        machineTypeId: 'lathe_y_axis',
      },
      material: {
        name: '17-4PH',
        group: 'stainless',
      },
    });

    expect(authority.routeSelection.machineId).toBe('st20-turn');
    expect(authority.routeSelection.machineFamilyId).toBe('lathe');
    expect(authority.routeSelection.toolholderId).toBe('capto-turn');
    expect(authority.routeSelection.fixtureId).toBe('softjaw-collet');
    expect(authority.routeSelection.stockId).toBe('174-round');
    expect(authority.toolpathSupported).toBe(true);
  });

  it('keeps wire EDM toolpath continuity fail-closed while preserving release routing', () => {
    const authority = buildJMDieCalculatorRouteAuthority({
      machineMode: 'wire_edm',
      machine: {
        id: 'fanuc-c600ib',
        manufacturer: 'FANUC',
        model: 'C600iB',
        machineTypeId: 'wire_edm_wire',
      },
      material: {
        name: 'D2 Plate',
        group: 'tool_steel',
      },
    });

    expect(authority.routeSelection.machineId).toBe('aln600g-wire');
    expect(authority.routeSelection.machineFamilyId).toBe('wire-edm');
    expect(authority.routeSelection.cadSourceId).toBe('neutral-compare');
    expect(authority.toolpathSupported).toBe(false);
    expect(authority.toolpathNote).toMatch(/Toolpath Advisor is not yet wired for the routed Wire EDM posture/i);
  });

  it('keeps sinker EDM explicit about its pending routed release contract', () => {
    const authority = buildJMDieCalculatorRouteAuthority({
      machineMode: 'edm',
      machine: {
        id: 'makino-edge3',
        manufacturer: 'Makino',
        model: 'EDGE3',
        machineTypeId: 'edm_sinker',
      },
      material: {
        name: 'POCO EDM-3',
        group: 'nontraditional',
      },
    });

    expect(authority.routeSelection.machineId).toBeNull();
    expect(authority.routeSelection.machineFamilyId).toBe('sinker-edm');
    expect(authority.toolpathSupported).toBe(false);
    expect(authority.releaseNote).toMatch(/does not publish a canonical sinker EDM machine row/i);
  });
});
