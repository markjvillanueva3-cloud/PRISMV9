import { describe, it, expect } from 'vitest';
import { toAdvancedSpeedFeedParams } from '../components/sfc/advancedSpeedFeedParams';
import type { MaterialEntry } from '../data/materials';
import type { OperationType } from '../data/operations';
import type { CuttingToolEntry } from '../data/tools';
import type { SfcParams } from '../components/sfc/ParameterPanel';

function mat(over: Partial<MaterialEntry> = {}): MaterialEntry {
  return {
    id: '4140',
    name: '4140 Steel',
    group: 'P',
    groupLabel: 'Steel (P)',
    hardness: 200,
    tensileStrength: 655,
    machinability: 70,
    ...over,
  };
}
function op(over: Partial<OperationType> = {}): OperationType {
  return {
    id: 'face_milling',
    label: 'Face Milling',
    category: 'milling',
    icon: 'x',
    defaults: { tool_diameter: 12, number_of_teeth: 4, depth: 2, width: 6, tool_material: 'Carbide', coolant: 'flood' },
    ...over,
  };
}
function tool(over: Partial<CuttingToolEntry> = {}): CuttingToolEntry {
  return {
    id: 't1',
    name: 'EM-12',
    type: 'endmill',
    manufacturer: 'X',
    substrate: 'Carbide',
    coating: 'AlTiN',
    diameter: 10,
    fluteCount: 3,
    helixAngle: 30,
    maxDoc: 20,
    suitedOperations: [],
    suitedMaterials: [],
    avoidMaterials: [],
    maxRpm: 20000,
    ...over,
  };
}
const params = (over: Partial<SfcParams> = {}): SfcParams => ({
  tool_diameter: 12,
  number_of_teeth: 4,
  depth: 2,
  width: 6,
  tool_material: 'Carbide',
  coolant: 'flood',
  ...over,
});

describe('toAdvancedSpeedFeedParams', () => {
  it('maps a full selection to the flat orchestrate params', () => {
    const r = toAdvancedSpeedFeedParams(mat(), op(), params(), tool());
    expect(r.material).toBe('4140 Steel');
    expect(r.operation).toBe('face_milling');
    expect(r.iso_group).toBe('P');
    expect(r.hardness_hb).toBe(200);
    expect(r.tool_diameter_mm).toBe(12);
    expect(r.flutes).toBe(4);
    expect(r.num_flutes).toBe(4);
    expect(r.axial_depth_mm).toBe(2);
    expect(r.radial_depth_mm).toBe(6);
    expect(r.doc_mm).toBe(2);
    expect(r.woc_mm).toBe(6);
    expect(r.coolant_type).toBe('flood');
    expect(r.tool_material).toBe('Carbide');
    expect(r.tool_coating).toBe('AlTiN');
    expect(r.output_detail).toBe('full');
  });

  it('omits iso_group when the material group is not a canonical ISO letter', () => {
    const r = toAdvancedSpeedFeedParams(mat({ group: 'Steel' }), op(), params());
    expect(r.iso_group ?? 'omitted').toBe('omitted');
  });

  it('passes every canonical ISO group through', () => {
    for (const g of ['P', 'M', 'K', 'N', 'S', 'H'] as const) {
      expect(toAdvancedSpeedFeedParams(mat({ group: g }), op(), params()).iso_group).toBe(g);
    }
  });

  it('omits an unrecognized coolant but passes a valid one', () => {
    expect(toAdvancedSpeedFeedParams(mat(), op(), params({ coolant: 'soluble-oil' })).coolant_type ?? 'omitted').toBe('omitted');
    expect(toAdvancedSpeedFeedParams(mat(), op(), params({ coolant: 'cryogenic' })).coolant_type).toBe('cryogenic');
  });

  it('aliases ParameterPanel coolant tokens that are not exact union members', () => {
    // ParameterPanel emits 'mql' (lowercase) + 'air_blast'; both must still reach the solve.
    expect(toAdvancedSpeedFeedParams(mat(), op(), params({ coolant: 'mql' })).coolant_type).toBe('MQL');
    expect(toAdvancedSpeedFeedParams(mat(), op(), params({ coolant: 'air_blast' })).coolant_type).toBe('dry');
  });

  it('falls back to the tool for diameter/flutes when params are zero/unset', () => {
    const r = toAdvancedSpeedFeedParams(mat(), op(), params({ tool_diameter: 0, number_of_teeth: 0 }), tool({ diameter: 8, fluteCount: 2 }));
    expect(r.tool_diameter_mm).toBe(8);
    expect(r.flutes).toBe(2);
    expect(r.num_flutes).toBe(2);
  });

  it('omits dims/flutes entirely when neither params nor tool supply them (no malformed zero)', () => {
    const r = toAdvancedSpeedFeedParams(mat(), op(), params({ tool_diameter: 0, number_of_teeth: 0, depth: 0, width: 0 }), null);
    expect(r.tool_diameter_mm ?? 'omitted').toBe('omitted');
    expect(r.flutes ?? 'omitted').toBe('omitted');
    expect(r.doc_mm ?? 'omitted').toBe('omitted');
    expect(r.woc_mm ?? 'omitted').toBe('omitted');
  });

  it('omits hardness_hb when material hardness is zero/invalid (adversarial)', () => {
    expect(toAdvancedSpeedFeedParams(mat({ hardness: 0 }), op(), params()).hardness_hb ?? 'omitted').toBe('omitted');
    expect(toAdvancedSpeedFeedParams(mat({ hardness: Number.NaN }), op(), params()).hardness_hb ?? 'omitted').toBe('omitted');
  });

  it('falls back tool_material to the tool substrate when params field is empty', () => {
    const r = toAdvancedSpeedFeedParams(mat(), op(), params({ tool_material: '' }), tool({ substrate: 'Cermet' }));
    expect(r.tool_material).toBe('Cermet');
  });
});
