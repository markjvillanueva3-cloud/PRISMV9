/**
 * Tests for WEDMMLParameterOptimizerEngine (WEDM-NEXT-MS0 U-WN01)
 * Bayesian optimization for Wire EDM cutting parameters
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  WEDMMLParameterOptimizerEngine,
  WEDMObservation,
  WEDMOptimizationObjective
} from '../engines/WEDMMLParameterOptimizerEngine.js';
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

describe('WEDMMLParameterOptimizerEngine', () => {
  let engine: WEDMMLParameterOptimizerEngine;

  beforeEach(() => {
    engine = new WEDMMLParameterOptimizerEngine();
  });

  describe('initializeOptimization', () => {
    it('creates session with valid initial suggestion', () => {
      const result = engine.initializeOptimization({
        material: 'steel', thickness: 25, objective: { type: 'mrr' }
      });

      expect(result.sessionId.length).toBeGreaterThan(10);
      expect(result.initialSuggestion.suggestedParameters.gapVoltage).toBeGreaterThanOrEqual(40);
      expect(result.initialSuggestion.suggestedParameters.gapVoltage).toBeLessThanOrEqual(80);
      expect(result.initialSuggestion.suggestedParameters.wireTension).toBeGreaterThanOrEqual(5);
      expect(result.initialSuggestion.suggestedParameters.wireTension).toBeLessThanOrEqual(25);
      expect(result.initialSuggestion.iteration).toBe(1);
      expect(result.initialSuggestion.explorationRatio).toBeGreaterThan(0);
      expect(result.initialSuggestion.predictedOutcomes.mrr.mean).toBeGreaterThan(0);
    });

    it('respects custom bounds', () => {
      const result = engine.initializeOptimization({
        material: 'aluminum', thickness: 10, objective: { type: 'surface_quality' },
        bounds: { gapVoltage: { min: 50, max: 60 } }
      });

      expect(result.initialSuggestion.suggestedParameters.gapVoltage).toBeGreaterThanOrEqual(50);
      expect(result.initialSuggestion.suggestedParameters.gapVoltage).toBeLessThanOrEqual(60);
    });

    it('incorporates prior observations', () => {
      const priorObs: WEDMObservation[] = [{
        parameters: { gapVoltage: 60, wireTension: 15, flushingPressure: 1.0, pulseOnTime: 20, pulseOffTime: 40, wireSpeed: 10 },
        outcomes: { mrr: 35, surfaceRa: 1.2, wireConsumption: 50, energyConsumption: 5, wireBreakOccurred: false },
        timestamp: new Date().toISOString(), material: 'steel', thickness: 25
      }];

      const result = engine.initializeOptimization({
        material: 'steel', thickness: 25, objective: { type: 'mrr' }, priorObservations: priorObs
      });

      expect(engine.getSessionStatus(result.sessionId)?.observationCount).toBe(1);
    });
  });

  describe('addObservation', () => {
    it('updates model and returns new suggestion', () => {
      const { sessionId } = engine.initializeOptimization({
        material: 'steel', thickness: 25, objective: { type: 'mrr' }
      });

      const observation: WEDMObservation = {
        parameters: { gapVoltage: 55, wireTension: 12, flushingPressure: 1.2, pulseOnTime: 15, pulseOffTime: 35, wireSpeed: 8 },
        outcomes: { mrr: 28, surfaceRa: 1.5, wireConsumption: 45, energyConsumption: 4.5, wireBreakOccurred: false },
        timestamp: new Date().toISOString(), material: 'steel', thickness: 25
      };

      const result = engine.addObservation(sessionId, observation);
      expect(result.iteration).toBe(2);
      expect(result.suggestedParameters.gapVoltage).toBeGreaterThanOrEqual(40);
      expect(result.predictedOutcomes.mrr.mean).toBeGreaterThan(0);
    });

    it('throws for invalid session', () => {
      expect(() => engine.addObservation('invalid-id', {} as WEDMObservation))
        .toThrow('Session invalid-id not found');
    });

    it('penalizes wire break observations - best excludes breaks', () => {
      const { sessionId } = engine.initializeOptimization({
        material: 'steel', thickness: 25, objective: { type: 'mrr' }
      });

      engine.addObservation(sessionId, {
        parameters: { gapVoltage: 55, wireTension: 12, flushingPressure: 1.2, pulseOnTime: 15, pulseOffTime: 35, wireSpeed: 8 },
        outcomes: { mrr: 30, surfaceRa: 1.5, wireConsumption: 45, energyConsumption: 4.5, wireBreakOccurred: false },
        timestamp: new Date().toISOString(), material: 'steel', thickness: 25
      });

      engine.addObservation(sessionId, {
        parameters: { gapVoltage: 75, wireTension: 22, flushingPressure: 0.5, pulseOnTime: 45, pulseOffTime: 20, wireSpeed: 14 },
        outcomes: { mrr: 50, surfaceRa: 3.0, wireConsumption: 80, energyConsumption: 8, wireBreakOccurred: true },
        timestamp: new Date().toISOString(), material: 'steel', thickness: 25
      });

      const status = engine.getSessionStatus(sessionId);
      expect(status?.bestObservation?.outcomes.wireBreakOccurred).toBe(false);
    });
  });

  describe('multi-objective optimization', () => {
    it('balances MRR and surface quality with constraints', () => {
      const objective: WEDMOptimizationObjective = {
        type: 'multi',
        weights: { mrr: 0.5, surfaceRa: 0.5 },
        constraints: { maxRa: 2.0 }
      };

      const { initialSuggestion } = engine.initializeOptimization({
        material: 'steel', thickness: 25, objective
      });

      expect(initialSuggestion.predictedOutcomes.mrr.mean).toBeGreaterThan(0);
      expect(initialSuggestion.predictedOutcomes.surfaceRa.mean).toBeGreaterThan(0);
      expect(initialSuggestion.predictedOutcomes.wireBreakRisk).toBeGreaterThanOrEqual(0);
      expect(initialSuggestion.predictedOutcomes.wireBreakRisk).toBeLessThanOrEqual(1);
    });
  });

  describe('convergence', () => {
    it('reduces exploration ratio over iterations', () => {
      const { sessionId } = engine.initializeOptimization({
        material: 'steel', thickness: 25, objective: { type: 'mrr' }
      });

      const baseObs: WEDMObservation = {
        parameters: { gapVoltage: 60, wireTension: 15, flushingPressure: 1.0, pulseOnTime: 20, pulseOffTime: 40, wireSpeed: 10 },
        outcomes: { mrr: 32, surfaceRa: 1.3, wireConsumption: 48, energyConsumption: 5, wireBreakOccurred: false },
        timestamp: new Date().toISOString(), material: 'steel', thickness: 25
      };

      let prevExploration = 1.0;
      for (let i = 0; i < 10; i++) {
        const result = engine.addObservation(sessionId, {
          ...baseObs,
          parameters: { ...baseObs.parameters, gapVoltage: 55 + Math.random() * 10 }
        });
        expect(result.explorationRatio).toBeLessThanOrEqual(prevExploration + 0.01);
        prevExploration = result.explorationRatio;
      }
      expect(prevExploration).toBeLessThan(0.9);
    });
  });

  describe('material factors - variability coverage', () => {
    it('predicts higher MRR for aluminum vs titanium', () => {
      const al = engine.initializeOptimization({ material: 'aluminum', thickness: 25, objective: { type: 'mrr' } });
      const ti = engine.initializeOptimization({ material: 'titanium', thickness: 25, objective: { type: 'mrr' } });

      expect(al.initialSuggestion.predictedOutcomes.mrr.mean)
        .toBeGreaterThan(ti.initialSuggestion.predictedOutcomes.mrr.mean);
    });

    it('handles carbide material correctly', () => {
      const r = engine.initializeOptimization({ material: 'carbide', thickness: 10, objective: { type: 'mrr' } });
      expect(r.initialSuggestion.predictedOutcomes.mrr.mean).toBeGreaterThan(0);
      expect(Number.isFinite(r.initialSuggestion.predictedOutcomes.mrr.mean)).toBe(true);
    });

    it('handles inconel material correctly', () => {
      const r = engine.initializeOptimization({ material: 'inconel 718', thickness: 15, objective: { type: 'surface_quality' } });
      expect(r.initialSuggestion.predictedOutcomes.surfaceRa.mean).toBeGreaterThan(0);
    });
  });

  describe('session management', () => {
    it('returns status for valid session', () => {
      const { sessionId } = engine.initializeOptimization({ material: 'steel', thickness: 25, objective: { type: 'mrr' } });
      const status = engine.getSessionStatus(sessionId);
      expect(status?.iteration).toBe(1);
      expect(status?.observationCount).toBe(0);
      expect(status?.convergenceMetric).toBeCloseTo(1.0, 5);
    });

    it('returns null for invalid session', () => {
      expect(engine.getSessionStatus('nonexistent')).toBeNull();
    });

    it('closes session successfully', () => {
      const { sessionId } = engine.initializeOptimization({ material: 'steel', thickness: 25, objective: { type: 'mrr' } });
      expect(engine.closeSession(sessionId)).toBe(true);
      expect(engine.getSessionStatus(sessionId)).toBeNull();
      expect(engine.closeSession(sessionId)).toBe(false);
    });
  });

  describe('edge cases and adversarial inputs', () => {
    it('handles very thin material (0.1mm)', () => {
      const { initialSuggestion } = engine.initializeOptimization({ material: 'steel', thickness: 0.1, objective: { type: 'mrr' } });
      expect(Number.isFinite(initialSuggestion.predictedOutcomes.mrr.mean)).toBe(true);
      expect(initialSuggestion.predictedOutcomes.mrr.mean).toBeGreaterThan(0);
    });

    it('handles very thick material (200mm)', () => {
      const { initialSuggestion } = engine.initializeOptimization({ material: 'steel', thickness: 200, objective: { type: 'mrr' } });
      expect(Number.isFinite(initialSuggestion.predictedOutcomes.mrr.mean)).toBe(true);
    });

    it('handles unknown material gracefully', () => {
      const { initialSuggestion } = engine.initializeOptimization({ material: 'unobtainium', thickness: 25, objective: { type: 'mrr' } });
      expect(initialSuggestion.predictedOutcomes.mrr.mean).toBeGreaterThan(0);
    });

    it('handles extreme parameter bounds', () => {
      const { initialSuggestion } = engine.initializeOptimization({
        material: 'steel', thickness: 100, objective: { type: 'mrr' },
        bounds: { pulseOnTime: { min: 1, max: 2 }, pulseOffTime: { min: 99, max: 100 } }
      });
      expect(initialSuggestion.suggestedParameters.pulseOnTime).toBeGreaterThanOrEqual(1);
      expect(initialSuggestion.suggestedParameters.pulseOnTime).toBeLessThanOrEqual(2);
    });

    it('handles empty string material', () => {
      const { initialSuggestion } = engine.initializeOptimization({ material: '', thickness: 25, objective: { type: 'mrr' } });
      expect(Number.isFinite(initialSuggestion.predictedOutcomes.mrr.mean)).toBe(true);
    });
  });

  describe('dispatcher round-trip', () => {
    let handler: Handler;

    beforeAll(async () => {
      const s = createServer();
      handler = await s.handler;
    });

    it('wedm_ml_optimize_init via dispatcher returns session', async () => {
      const r = await call(handler, 'wedm_ml_optimize_init', {
        material: 'steel', thickness: 25, objective: { type: 'mrr' }
      });
      expect(r.sessionId.length).toBeGreaterThan(10);
      expect(r.initialSuggestion.suggestedParameters.gapVoltage).toBeGreaterThanOrEqual(40);
    });

    it('wedm_ml_optimize_status via dispatcher', async () => {
      const init = await call(handler, 'wedm_ml_optimize_init', {
        material: 'aluminum', thickness: 15, objective: { type: 'surface_quality' }
      });
      const status = await call(handler, 'wedm_ml_optimize_status', { session_id: init.sessionId });
      expect(status.iteration).toBe(1);
      expect(status.observationCount).toBe(0);
    });

    it('wedm_ml_optimize_close via dispatcher', async () => {
      const init = await call(handler, 'wedm_ml_optimize_init', {
        material: 'copper', thickness: 20, objective: { type: 'wire_consumption' }
      });
      const closed = await call(handler, 'wedm_ml_optimize_close', { session_id: init.sessionId });
      expect(closed.closed).toBe(true);
    });

    it('dispatcher handles missing session gracefully', async () => {
      // Use a valid UUID format that doesn't correspond to any actual session
      const r = await call(handler, 'wedm_ml_optimize_status', { session_id: '00000000-0000-0000-0000-000000000000' });
      expect(r).toBeNull();
    });
  });
});
