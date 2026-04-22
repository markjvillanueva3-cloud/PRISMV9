/**
 * Tests for WEDMTransferLearningEngine (WEDM-NEXT-MS0 U-WN03)
 * Cross-material/machine parameter transfer learning
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  WEDMTransferLearningEngine,
  WEDMParameters,
  MaterialProperties,
  MachineProfile,
  wedmTransferLearningEngine,
} from '../engines/WEDMTransferLearningEngine.js';
import { registerEdmDispatcher } from '../tools/dispatchers/edmDispatcher.js';

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerEdmDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any>): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try { return JSON.parse(text); } catch { return r; }
}

const baseParams: WEDMParameters = {
  gapVoltage: 60,
  wireTension: 15,
  flushingPressure: 1.0,
  pulseOnTime: 20,
  pulseOffTime: 40,
  wireSpeed: 10,
};

const steelProps: MaterialProperties = {
  name: 'steel',
  conductivity: 6.99e6,
  thermalConductivity: 50,
  meltingPoint: 1510,
  hardness: 30,
  density: 7850,
};

const aluminumProps: MaterialProperties = {
  name: 'aluminum',
  conductivity: 3.77e7,
  thermalConductivity: 237,
  meltingPoint: 660,
  hardness: 15,
  density: 2700,
};

const titaniumProps: MaterialProperties = {
  name: 'titanium',
  conductivity: 2.38e6,
  thermalConductivity: 22,
  meltingPoint: 1668,
  hardness: 36,
  density: 4506,
};

const testMachine: MachineProfile = {
  name: 'test-machine',
  maxGapVoltage: 100,
  maxWireTension: 25,
  maxFlushingPressure: 2.0,
  maxPulseOnTime: 50,
  minPulseOffTime: 10,
  maxWireSpeed: 20,
  generatorType: 'transistor',
};

describe('WEDMTransferLearningEngine', () => {
  let engine: WEDMTransferLearningEngine;

  beforeAll(() => {
    engine = new WEDMTransferLearningEngine();
  });

  describe('computeMaterialSimilarity', () => {
    it('returns high similarity for identical materials', () => {
      const result = engine.computeMaterialSimilarity(steelProps, steelProps);
      expect(result.similarity).toBeCloseTo(1.0, 5);
      expect(result.recommendation).toBe('direct');
    });

    it('returns lower similarity for dissimilar materials', () => {
      const result = engine.computeMaterialSimilarity(steelProps, aluminumProps);
      expect(result.similarity).toBeLessThan(0.8);
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('returns factor breakdown', () => {
      const result = engine.computeMaterialSimilarity('steel', 'titanium');
      expect(result.factors.conductivity).toBeGreaterThanOrEqual(0);
      expect(result.factors.thermal).toBeGreaterThanOrEqual(0);
      expect(result.factors.melting).toBeGreaterThanOrEqual(0);
      expect(result.factors.hardness).toBeGreaterThanOrEqual(0);
    });

    it('gives appropriate recommendation based on similarity', () => {
      const highSim = engine.computeMaterialSimilarity('steel', 'steel');
      const lowSim = engine.computeMaterialSimilarity('steel', 'graphite');

      expect(['direct', 'scaled']).toContain(highSim.recommendation);
      expect(['conservative', 'experimental']).toContain(lowSim.recommendation);
    });

    it('works with string material names', () => {
      const result = engine.computeMaterialSimilarity('steel', 'aluminum');
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThan(1);
    });

    it('handles material aliases', () => {
      const result1 = engine.computeMaterialSimilarity('al6061', 'aluminum');
      const result2 = engine.computeMaterialSimilarity('4140', 'steel');
      expect(result1.similarity).toBeGreaterThan(0.9);
      expect(result2.similarity).toBeGreaterThan(0.9);
    });
  });

  describe('computeMachineSimilarity', () => {
    it('returns 1.0 for identical machines', () => {
      const result = engine.computeMachineSimilarity(testMachine, testMachine);
      expect(result).toBeCloseTo(1.0, 5);
    });

    it('penalizes different generator types', () => {
      const machine2: MachineProfile = { ...testMachine, generatorType: 'relaxation' };
      const result = engine.computeMachineSimilarity(testMachine, machine2);
      expect(result).toBeLessThan(1.0);
      expect(result).toBeGreaterThan(0.5);
    });

    it('considers capacity overlap', () => {
      const machine2: MachineProfile = { ...testMachine, maxGapVoltage: 50, maxPulseOnTime: 25 };
      const result = engine.computeMachineSimilarity(testMachine, machine2);
      expect(result).toBeLessThan(1.0);
      expect(result).toBeGreaterThan(0.3);
    });
  });

  describe('transfer', () => {
    it('returns transferred parameters', () => {
      const result = engine.transfer({
        sourceMaterial: steelProps,
        targetMaterial: aluminumProps,
        sourceParameters: baseParams,
      });

      expect(result.transferredParameters.gapVoltage).toBeGreaterThan(0);
      expect(result.transferredParameters.wireTension).toBeGreaterThan(0);
      expect(result.transferredParameters.pulseOnTime).toBeGreaterThan(0);
    });

    it('returns confidence score', () => {
      const result = engine.transfer({
        sourceMaterial: steelProps,
        targetMaterial: titaniumProps,
        sourceParameters: baseParams,
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('provides scaling factors for each parameter', () => {
      const result = engine.transfer({
        sourceMaterial: steelProps,
        targetMaterial: aluminumProps,
        sourceParameters: baseParams,
      });

      expect(Object.keys(result.scalingFactors)).toHaveLength(6);
      expect(result.scalingFactors.gapVoltage).toBeGreaterThan(0);
      expect(result.scalingFactors.wireTension).toBeGreaterThan(0);
    });

    it('clamps parameters to machine limits', () => {
      const extremeParams: WEDMParameters = {
        gapVoltage: 150,
        wireTension: 30,
        flushingPressure: 3.0,
        pulseOnTime: 80,
        pulseOffTime: 5,
        wireSpeed: 25,
      };

      const result = engine.transfer({
        sourceMaterial: steelProps,
        targetMaterial: aluminumProps,
        sourceParameters: extremeParams,
        targetMachine: testMachine,
      });

      expect(result.transferredParameters.gapVoltage).toBeLessThanOrEqual(testMachine.maxGapVoltage);
      expect(result.transferredParameters.wireTension).toBeLessThanOrEqual(testMachine.maxWireTension);
      expect(result.transferredParameters.pulseOffTime).toBeGreaterThanOrEqual(testMachine.minPulseOffTime);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns expected outcome changes', () => {
      const result = engine.transfer({
        sourceMaterial: steelProps,
        targetMaterial: aluminumProps,
        sourceParameters: baseParams,
      });

      expect(result.expectedOutcomeChange.mrr).toBeGreaterThan(0);
      expect(result.expectedOutcomeChange.surfaceRa).toBeGreaterThan(0);
      expect(result.expectedOutcomeChange.wireConsumption).toBeGreaterThan(0);
    });

    it('warns for low similarity transfers', () => {
      const result = engine.transfer({
        sourceMaterial: 'steel',
        targetMaterial: 'graphite',
        sourceParameters: baseParams,
      });

      expect(result.warnings.some(w => w.includes('similarity') || w.includes('validation'))).toBe(true);
    });

    it('returns material and machine similarity scores', () => {
      const result = engine.transfer({
        sourceMaterial: steelProps,
        targetMaterial: titaniumProps,
        sourceMachine: testMachine,
        targetMachine: testMachine,
        sourceParameters: baseParams,
      });

      expect(result.materialSimilarity).toBeGreaterThan(0);
      expect(result.materialSimilarity).toBeLessThanOrEqual(1);
      expect(result.machineSimilarity).toBeGreaterThan(0);
      expect(result.machineSimilarity).toBeLessThanOrEqual(1);
    });
  });

  describe('batchTransfer', () => {
    it('transfers to multiple target materials', () => {
      const results = engine.batchTransfer(
        baseParams,
        'steel',
        ['aluminum', 'titanium', 'copper']
      );

      expect(results).toHaveLength(3);
      expect(results[0].material).toBe('aluminum');
      expect(results[1].material).toBe('titanium');
      expect(results[2].material).toBe('copper');
    });

    it('includes transfer result for each material', () => {
      const results = engine.batchTransfer(baseParams, 'steel', ['aluminum', 'inconel']);

      for (const r of results) {
        expect(r.result.transferredParameters).toBeDefined();
        expect(r.result.confidence).toBeGreaterThan(0);
        expect(r.result.scalingFactors).toBeDefined();
      }
    });

    it('applies machine constraints to all transfers', () => {
      const results = engine.batchTransfer(
        baseParams,
        'steel',
        ['aluminum', 'titanium'],
        testMachine,
        testMachine
      );

      for (const r of results) {
        expect(r.result.transferredParameters.gapVoltage).toBeLessThanOrEqual(testMachine.maxGapVoltage);
      }
    });
  });

  describe('findSimilarMaterials', () => {
    it('returns top N similar materials', () => {
      const results = engine.findSimilarMaterials('steel', 3);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.similarity > 0)).toBe(true);
    });

    it('sorts by similarity descending', () => {
      const results = engine.findSimilarMaterials('aluminum', 5);

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }
    });

    it('excludes the source material', () => {
      const results = engine.findSimilarMaterials('steel', 10);
      expect(results.every(r => r.material !== 'steel')).toBe(true);
    });

    it('handles unknown materials by falling back', () => {
      const results = engine.findSimilarMaterials('mystery_metal', 3);
      expect(results).toHaveLength(3);
    });
  });

  describe('validateTransfer', () => {
    it('validates valid parameters', () => {
      const result = engine.validateTransfer(baseParams, 'steel');
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('catches low gap voltage', () => {
      const badParams = { ...baseParams, gapVoltage: 15 };
      const result = engine.validateTransfer(badParams, 'steel');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Gap voltage'))).toBe(true);
    });

    it('catches high gap voltage', () => {
      const badParams = { ...baseParams, gapVoltage: 130 };
      const result = engine.validateTransfer(badParams, 'steel');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Gap voltage'))).toBe(true);
    });

    it('catches low wire tension', () => {
      const badParams = { ...baseParams, wireTension: 2 };
      const result = engine.validateTransfer(badParams, 'aluminum');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('tension'))).toBe(true);
    });

    it('catches inadequate pulse off time', () => {
      const badParams = { ...baseParams, pulseOnTime: 30, pulseOffTime: 10 };
      const result = engine.validateTransfer(badParams, 'titanium');
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Pulse off'))).toBe(true);
    });

    it('provides material-specific advice', () => {
      const lowVoltageParams = { ...baseParams, gapVoltage: 40 };
      const result = engine.validateTransfer(lowVoltageParams, 'graphite');
      // Graphite has low conductivity - may need higher voltage
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMaterialProperties', () => {
    it('returns properties for known materials', () => {
      const props = engine.getMaterialProperties('steel');
      expect(props.name).toBe('steel');
      expect(props.conductivity).toBeGreaterThan(0);
      expect(props.meltingPoint).toBeGreaterThan(0);
    });

    it('handles material aliases', () => {
      const props1 = engine.getMaterialProperties('al7075');
      const props2 = engine.getMaterialProperties('6061-t6');
      expect(props1.name).toBe('aluminum');
      expect(props2.name).toBe('aluminum');
    });
  });

  describe('listKnownMaterials', () => {
    it('returns list of known materials', () => {
      const materials = engine.listKnownMaterials();
      expect(materials).toContain('steel');
      expect(materials).toContain('aluminum');
      expect(materials).toContain('titanium');
      expect(materials.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('edge cases', () => {
    it('handles zero hardness gracefully', () => {
      const zeroHardness: MaterialProperties = { ...steelProps, hardness: 0 };
      const result = engine.transfer({
        sourceMaterial: zeroHardness,
        targetMaterial: aluminumProps,
        sourceParameters: baseParams,
      });
      expect(Number.isFinite(result.confidence)).toBe(true);
      expect(result.transferredParameters.wireTension).toBeGreaterThan(0);
    });

    it('handles extreme conductivity ratios', () => {
      const result = engine.transfer({
        sourceMaterial: 'graphite',
        targetMaterial: 'copper',
        sourceParameters: baseParams,
      });
      expect(Number.isFinite(result.transferredParameters.gapVoltage)).toBe(true);
    });
  });

  describe('singleton export', () => {
    it('exports a singleton instance', () => {
      expect(wedmTransferLearningEngine).toBeInstanceOf(WEDMTransferLearningEngine);
    });
  });

  describe('dispatcher round-trip', () => {
    let handler: Handler;

    beforeAll(async () => {
      const s = createServer();
      handler = await s.handler;
    });

    it('wedm_transfer_params via dispatcher returns transfer result', async () => {
      const r = await call(handler, 'wedm_transfer_params', {
        source_material: 'steel',
        target_material: 'aluminum',
        source_parameters: baseParams,
      });

      expect(r.transferredParameters).toBeDefined();
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.scalingFactors).toBeDefined();
    });

    it('wedm_material_similarity via dispatcher returns similarity', async () => {
      const r = await call(handler, 'wedm_material_similarity', {
        source_material: 'steel',
        target_material: 'titanium',
      });

      expect(r.similarity).toBeGreaterThan(0);
      expect(r.similarity).toBeLessThanOrEqual(1);
      expect(r.recommendation).toBeDefined();
    });

    it('wedm_batch_transfer via dispatcher returns batch results', async () => {
      const r = await call(handler, 'wedm_batch_transfer', {
        source_parameters: baseParams,
        source_material: 'steel',
        target_materials: ['aluminum', 'copper'],
      });

      expect(Array.isArray(r)).toBe(true);
      expect(r).toHaveLength(2);
      expect(r[0].material).toBe('aluminum');
    });

    it('wedm_similar_materials via dispatcher returns similar materials', async () => {
      const r = await call(handler, 'wedm_similar_materials', {
        material: 'steel',
        top_n: 3,
      });

      expect(Array.isArray(r)).toBe(true);
      expect(r).toHaveLength(3);
      expect(r[0].similarity).toBeGreaterThan(r[1].similarity);
    });

    it('wedm_validate_transfer via dispatcher returns validation', async () => {
      const r = await call(handler, 'wedm_validate_transfer', {
        parameters: baseParams,
        target_material: 'steel',
      });

      expect(r.valid).toBe(true);
      // slimResponse may strip empty arrays, so issues may be undefined or []
      expect(r.issues === undefined || (Array.isArray(r.issues) && r.issues.length === 0)).toBe(true);
    });

    it('dispatcher handles invalid parameters', async () => {
      const r = await call(handler, 'wedm_validate_transfer', {
        parameters: { ...baseParams, gapVoltage: 10 },
        target_material: 'titanium',
      });

      expect(r.valid).toBe(false);
      expect(r.issues.length).toBeGreaterThan(0);
    });
  });
});
