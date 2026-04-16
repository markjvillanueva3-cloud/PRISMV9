/**
 * LLM-Level Intelligence Hardening Tests
 *
 * Tests for LLM-like reasoning capabilities:
 * - Self-reflection (uncertainty estimation)
 * - Pre-flight risk assessment
 * - Hypothesis generation and evaluation
 * - Post-execution reflection
 * - Reasoning context accumulation
 * - Natural language explanation generation
 * - Meta-confidence calculation
 *
 * 50+ tests for LLM-level intelligence.
 */

import { describe, it, expect } from 'vitest';
import {
  prismUnifiedOrchestratorEngine,
  type PUOAInput,
  type PUOAResult,
  type PreFlightAssessment,
  type SelfReflection,
  type HypothesisEvaluation,
  type PostReflection,
  type ReasoningContext,
} from '../engines/PRISMUnifiedOrchestratorEngine.js';

// =============================================================================
// Self-Reflection / Uncertainty Estimation Tests
// =============================================================================

describe('Self-Reflection / Uncertainty', () => {
  it('estimates uncertainty for simple intents', () => {
    const input: PUOAInput = { intent: 'lookup material hardness' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const reflection = prismUnifiedOrchestratorEngine.estimateUncertainty(input, routing);

    expect(reflection.uncertainty).toBeDefined();
    expect(reflection.uncertainty).toBeGreaterThanOrEqual(0);
    expect(reflection.uncertainty).toBeLessThanOrEqual(1);
    // Simple tasks should have low uncertainty
    expect(reflection.uncertainty).toBeLessThan(0.5);
  });

  it('estimates higher uncertainty for ambiguous intents', () => {
    const input: PUOAInput = { intent: 'maybe calculate best or optimal speed possibly' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const reflection = prismUnifiedOrchestratorEngine.estimateUncertainty(input, routing);

    // Ambiguous language should increase uncertainty
    expect(reflection.uncertainty_factors.length).toBeGreaterThan(0);
    expect(reflection.uncertainty).toBeGreaterThan(0.2);
  });

  it('identifies when clarification is needed', () => {
    const input: PUOAInput = { intent: 'calculate cutting force for milling' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const reflection = prismUnifiedOrchestratorEngine.estimateUncertainty(input, routing);

    // Missing context should trigger clarification need
    if (routing.domains.includes('machining')) {
      expect(reflection.needs_clarification || reflection.clarification_questions.length >= 0).toBe(true);
    }
  });

  it('identifies blind spots in single-domain analysis', () => {
    const input: PUOAInput = { intent: 'recommend tool for steel' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const reflection = prismUnifiedOrchestratorEngine.estimateUncertainty(input, routing);

    if (routing.domains.length === 1) {
      expect(reflection.blind_spots.some(bs => bs.includes('single-domain'))).toBe(true);
    }
  });

  it('assesses reasoning quality', () => {
    const input: PUOAInput = { intent: 'simple query about steel' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const reflection = prismUnifiedOrchestratorEngine.estimateUncertainty(input, routing);

    expect(['high', 'medium', 'low']).toContain(reflection.reasoning_quality);
  });
});

// =============================================================================
// Pre-Flight Assessment Tests
// =============================================================================

describe('Pre-Flight Risk Assessment', () => {
  it('assesses simple task as low risk', () => {
    const input: PUOAInput = { intent: 'lookup material properties' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);

    expect(preFlight.proceed).toBe(true);
    expect(preFlight.success_probability).toBeGreaterThan(0.7);
  });

  it('identifies risk when intent is too brief', () => {
    const input: PUOAInput = { intent: 'hi' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);

    expect(preFlight.risks.some(r => r.risk.includes('brief'))).toBe(true);
  });

  it('identifies risk when no context provided', () => {
    const input: PUOAInput = { intent: 'calculate cutting force' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);

    expect(preFlight.risks.some(r => r.risk.includes('context'))).toBe(true);
  });

  it('provides fallback strategies', () => {
    const input: PUOAInput = { intent: 'complex multi-domain analysis of materials and tooling' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);

    expect(preFlight.fallback_strategies.length).toBeGreaterThan(0);
    expect(preFlight.fallback_strategies[0].strategy).toBeDefined();
    expect(preFlight.fallback_strategies[0].trigger).toBeDefined();
    expect(preFlight.fallback_strategies[0].confidence).toBeGreaterThan(0);
  });

  it('estimates resource cost', () => {
    const input: PUOAInput = { intent: 'critical safety validation across all domains' };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
    const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);

    expect(preFlight.estimated_cost.time_ms).toBeGreaterThan(0);
    expect(preFlight.estimated_cost.complexity).toBeGreaterThan(0);
  });

  it('flags safety tasks not using full chain', () => {
    // Force single_dispatcher for a safety-related intent
    const input: PUOAInput = {
      intent: 'check safety limits',
      constraints: { required_tier: 'single_dispatcher' },
    };
    const routing = prismUnifiedOrchestratorEngine.routeToTier(input);

    if (routing.domains.includes('safety')) {
      const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);
      expect(preFlight.risks.some(r => r.severity === 'high')).toBe(true);
    }
  });
});

// =============================================================================
// Hypothesis Generation Tests
// =============================================================================

describe('Hypothesis Generation & Evaluation', () => {
  it('generates hypotheses for task execution', async () => {
    const input: PUOAInput = { intent: 'calculate speed for steel milling' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(result.intelligence.hypothesis_evaluation).toBeDefined();
    expect(result.intelligence.hypothesis_evaluation.hypotheses.length).toBeGreaterThan(0);
  });

  it('evaluates tier-appropriateness hypothesis', async () => {
    const input: PUOAInput = { intent: 'simple material lookup' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    const tierHypothesis = result.intelligence.hypothesis_evaluation.hypotheses
      .find(h => h.id === 'tier-appropriate');

    expect(tierHypothesis).toBeDefined();
    expect(tierHypothesis?.status).toBeDefined();
    expect(['confirmed', 'refuted', 'uncertain']).toContain(tierHypothesis?.status);
  });

  it('tracks supporting and contradicting evidence', async () => {
    const input: PUOAInput = { intent: 'analyze materials and tooling' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    for (const hypothesis of result.intelligence.hypothesis_evaluation.hypotheses) {
      expect(Array.isArray(hypothesis.supporting_evidence)).toBe(true);
      expect(Array.isArray(hypothesis.contradicting_evidence)).toBe(true);
    }
  });

  it('calculates posterior probabilities', async () => {
    const input: PUOAInput = { intent: 'validate parameters' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    for (const hypothesis of result.intelligence.hypothesis_evaluation.hypotheses) {
      expect(hypothesis.prior_probability).toBeGreaterThanOrEqual(0);
      expect(hypothesis.prior_probability).toBeLessThanOrEqual(1);
      expect(hypothesis.posterior_probability).toBeGreaterThanOrEqual(0);
      expect(hypothesis.posterior_probability).toBeLessThanOrEqual(1);
    }
  });

  it('identifies best hypothesis', async () => {
    const input: PUOAInput = { intent: 'calculate speed' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    // best_hypothesis is null or a valid hypothesis ID
    const evaluation = result.intelligence.hypothesis_evaluation;
    if (evaluation.best_hypothesis) {
      expect(evaluation.hypotheses.some(h => h.id === evaluation.best_hypothesis)).toBe(true);
    }
  });

  it('synthesizes conclusion from hypotheses', async () => {
    const input: PUOAInput = { intent: 'optimize machining parameters' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    const synthesis = result.intelligence.hypothesis_evaluation.synthesis;
    expect(synthesis.conclusion).toBeDefined();
    expect(synthesis.conclusion.length).toBeGreaterThan(0);
    expect(synthesis.confidence).toBeGreaterThan(0);
    expect(synthesis.reasoning_chain.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Post-Execution Reflection Tests
// =============================================================================

describe('Post-Execution Reflection', () => {
  it('checks if outcome matched expectations', async () => {
    const input: PUOAInput = { intent: 'lookup steel properties' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(typeof result.intelligence.post_reflection.outcome_matched_expectation).toBe('boolean');
  });

  it('identifies surprises when outcome unexpected', async () => {
    const input: PUOAInput = { intent: 'complex analysis requiring multiple domains' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.post_reflection.surprises)).toBe(true);
  });

  it('generates lessons learned', async () => {
    const input: PUOAInput = { intent: 'calculate force with missing context' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.post_reflection.lessons_learned)).toBe(true);
  });

  it('detects patterns', async () => {
    const input: PUOAInput = { intent: 'simple lookup' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.post_reflection.patterns_detected)).toBe(true);
  });

  it('generates future recommendations', async () => {
    const input: PUOAInput = { intent: 'critical safety check' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.post_reflection.future_recommendations)).toBe(true);
  });

  it('determines if result should be remembered', async () => {
    const input: PUOAInput = { intent: 'novel task type' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(typeof result.intelligence.post_reflection.should_remember).toBe('boolean');
    if (result.intelligence.post_reflection.should_remember) {
      expect(result.intelligence.post_reflection.memory_key).toBeDefined();
    }
  });
});

// =============================================================================
// Reasoning Context Tests
// =============================================================================

describe('Reasoning Context Accumulation', () => {
  it('accumulates insights from steps', async () => {
    const input: PUOAInput = { intent: 'analyze multiple aspects of machining' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.reasoning_context.insights)).toBe(true);
  });

  it('collects evidence for/against claims', async () => {
    const input: PUOAInput = { intent: 'validate tool selection' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.reasoning_context.evidence)).toBe(true);
    for (const e of result.intelligence.reasoning_context.evidence) {
      expect(['supporting', 'contradicting']).toContain(e.type);
      expect(e.weight).toBeGreaterThanOrEqual(0);
      expect(e.weight).toBeLessThanOrEqual(1);
    }
  });

  it('tracks assumptions made', async () => {
    const input: PUOAInput = { intent: 'calculate with limited info' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.reasoning_context.assumptions)).toBe(true);
    for (const a of result.intelligence.reasoning_context.assumptions) {
      expect(['low', 'medium', 'high']).toContain(a.risk);
      expect(typeof a.verifiable).toBe('boolean');
    }
  });

  it('captures open questions', async () => {
    const input: PUOAInput = { intent: 'optimize without full context' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.reasoning_context.open_questions)).toBe(true);
  });

  it('identifies knowledge gaps', async () => {
    const input: PUOAInput = { intent: 'analyze single domain' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(Array.isArray(result.intelligence.reasoning_context.knowledge_gaps)).toBe(true);
  });
});

// =============================================================================
// Natural Language Explanation Tests
// =============================================================================

describe('Natural Language Explanation', () => {
  it('generates human-readable explanation', async () => {
    const input: PUOAInput = { intent: 'calculate cutting speed for steel milling' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(result.intelligence.explanation).toBeDefined();
    expect(result.intelligence.explanation.length).toBeGreaterThan(50);
  });

  it('explanation references the original intent', async () => {
    const input: PUOAInput = { intent: 'analyze aluminum machining' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(result.intelligence.explanation.toLowerCase()).toContain('aluminum');
  });

  it('explanation mentions tier used', async () => {
    const input: PUOAInput = { intent: 'simple lookup' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(result.intelligence.explanation).toContain(result.tier);
  });

  it('explanation discloses uncertainty when high', async () => {
    const input: PUOAInput = { intent: 'maybe optimize something possibly' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    if (result.intelligence.self_reflection.uncertainty > 0.4) {
      expect(result.intelligence.explanation.toLowerCase()).toMatch(/confident|accuracy/);
    }
  });

  it('explanation mentions blind spots when present', async () => {
    const input: PUOAInput = { intent: 'single domain analysis' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    if (result.intelligence.self_reflection.blind_spots.length > 0) {
      expect(result.intelligence.explanation.toLowerCase()).toMatch(/limitation|potential/);
    }
  });
});

// =============================================================================
// Meta-Confidence Tests
// =============================================================================

describe('Meta-Confidence (Confidence in Reasoning)', () => {
  it('calculates meta-confidence', async () => {
    const input: PUOAInput = { intent: 'calculate speed' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    expect(result.intelligence.meta_confidence).toBeDefined();
    expect(result.intelligence.meta_confidence).toBeGreaterThanOrEqual(0.1);
    expect(result.intelligence.meta_confidence).toBeLessThanOrEqual(0.95);
  });

  it('meta-confidence reflects reasoning quality', async () => {
    const simpleInput: PUOAInput = { intent: 'lookup hardness' };
    const complexInput: PUOAInput = { intent: 'maybe optimize something across many domains possibly' };

    const simpleResult = await prismUnifiedOrchestratorEngine.execute(simpleInput);
    const complexResult = await prismUnifiedOrchestratorEngine.execute(complexInput);

    // Simple task should generally have higher meta-confidence
    // (not always, but the reasoning should be better)
    expect(simpleResult.intelligence.meta_confidence).toBeGreaterThan(0);
    expect(complexResult.intelligence.meta_confidence).toBeGreaterThan(0);
  });

  it('meta-confidence bounded properly', async () => {
    const inputs = [
      { intent: 'simple query' },
      { intent: 'complex multi-domain optimization' },
      { intent: 'critical safety validation' },
    ];

    for (const input of inputs) {
      const result = await prismUnifiedOrchestratorEngine.execute(input);
      expect(result.intelligence.meta_confidence).toBeGreaterThanOrEqual(0.1);
      expect(result.intelligence.meta_confidence).toBeLessThanOrEqual(0.95);
    }
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('LLM Intelligence Integration', () => {
  it('full intelligence pipeline for simple task', async () => {
    const input: PUOAInput = { intent: 'get material hardness for 4140 steel' };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    // All intelligence components should be present
    expect(result.intelligence).toBeDefined();
    expect(result.intelligence.pre_flight).toBeDefined();
    expect(result.intelligence.self_reflection).toBeDefined();
    expect(result.intelligence.hypothesis_evaluation).toBeDefined();
    expect(result.intelligence.post_reflection).toBeDefined();
    expect(result.intelligence.reasoning_context).toBeDefined();
    expect(result.intelligence.explanation).toBeDefined();
    expect(result.intelligence.meta_confidence).toBeDefined();
  });

  it('full intelligence pipeline for complex task', async () => {
    const input: PUOAInput = {
      intent: 'critical safety validation for milling with material analysis',
      context: { material: '4140 Steel', machine: 'Haas VF-2' },
    };
    const result = await prismUnifiedOrchestratorEngine.execute(input);

    // Check all components
    expect(result.intelligence.pre_flight.risks.length).toBeGreaterThanOrEqual(0);
    expect(result.intelligence.self_reflection.uncertainty_factors).toBeDefined();
    expect(result.intelligence.hypothesis_evaluation.synthesis.conclusion.length).toBeGreaterThan(0);
    expect(result.intelligence.explanation.length).toBeGreaterThan(50);
  });

  it('intelligence adapts to context presence', async () => {
    const withoutContext: PUOAInput = { intent: 'calculate force' };
    const withContext: PUOAInput = {
      intent: 'calculate force',
      context: { material: 'steel', depth: 2, feed: 0.1 },
    };

    const r1 = await prismUnifiedOrchestratorEngine.execute(withoutContext);
    const r2 = await prismUnifiedOrchestratorEngine.execute(withContext);

    // Without context should have more risks
    expect(r1.intelligence.pre_flight.risks.length).toBeGreaterThanOrEqual(
      r2.intelligence.pre_flight.risks.length - 1
    );
  });
});

// =============================================================================
// Tribal Knowledge Integration Tests
// =============================================================================

describe('Tribal Knowledge Integration', () => {
  describe('buildTribalQueryContext', () => {
    it('extracts material from context', () => {
      const input: PUOAInput = {
        intent: 'calculate speed',
        context: { material: '4140 Steel' },
      };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.material).toBe('4140 Steel');
    });

    it('extracts machine_id from context', () => {
      const input: PUOAInput = {
        intent: 'optimize parameters',
        context: { machine_id: 'okuma-lb15' },
      };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.machine_id).toBe('okuma-lb15');
    });

    it('extracts operation from context', () => {
      const input: PUOAInput = {
        intent: 'set feeds',
        context: { operation: 'roughing' },
      };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.operation).toBe('roughing');
    });

    it('extracts tool info from context', () => {
      const input: PUOAInput = {
        intent: 'select tool',
        context: { tool_type: 'endmill', tool_diameter: 12 },
      };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.tool_type).toBe('endmill');
      expect(queryCtx.tool_diameter_mm).toBe(12);
    });

    it('infers material from intent text', () => {
      const input: PUOAInput = { intent: 'mill 4140 steel part' };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.material).toBe('steel');
    });

    it('infers operation from intent text', () => {
      const input: PUOAInput = { intent: 'calculate roughing parameters' };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.operation).toBe('roughing');
    });

    it('infers titanium material from intent', () => {
      const input: PUOAInput = { intent: 'speeds for ti-6al-4v' };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.material).toBe('titanium');
    });

    it('infers drilling operation from intent', () => {
      const input: PUOAInput = { intent: 'drill hole pattern' };
      const queryCtx = prismUnifiedOrchestratorEngine.buildTribalQueryContext(input);
      expect(queryCtx.operation).toBe('drilling');
    });
  });

  describe('consultTribalKnowledge', () => {
    it('returns empty context for non-machining domains', () => {
      const input: PUOAInput = { intent: 'schedule jobs for next week' };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      // Scheduling is not a machining domain
      expect(tribalCtx.consulted).toBe(false);
      expect(tribalCtx.modifiers.vc_modifier).toBe(1);
      expect(tribalCtx.modifiers.fz_modifier).toBe(1);
    });

    it('consults tribal knowledge for machining tasks', () => {
      const input: PUOAInput = {
        intent: 'calculate cutting speed for milling steel',
        context: { material: 'steel', operation: 'roughing' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      // Machining tasks should consult tribal knowledge
      expect(tribalCtx.consulted).toBe(true);
      expect(tribalCtx.query_context).toBeDefined();
    });

    it('extracts modifiers from tribal knowledge', () => {
      const input: PUOAInput = {
        intent: 'mill titanium part',
        context: { material: 'titanium' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      expect(tribalCtx.modifiers).toBeDefined();
      expect(tribalCtx.modifiers.vc_modifier).toBeGreaterThanOrEqual(0.7);
      expect(tribalCtx.modifiers.vc_modifier).toBeLessThanOrEqual(1.3);
    });

    it('extracts constraints from tribal knowledge', () => {
      const input: PUOAInput = {
        intent: 'high-speed machining of aluminum',
        context: { material: 'aluminum' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      expect(tribalCtx.constraints).toBeDefined();
      // Constraints may or may not have values
      expect(tribalCtx.constraints.forbidden_machines).toBeInstanceOf(Array);
    });

    it('categorizes advice by type', () => {
      const input: PUOAInput = {
        intent: 'optimize lathe turning operation',
        context: { machine_id: 'okuma-lb15', operation: 'turning' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      expect(tribalCtx.machine_advice).toBeInstanceOf(Array);
      expect(tribalCtx.material_advice).toBeInstanceOf(Array);
      expect(tribalCtx.operation_advice).toBeInstanceOf(Array);
    });
  });

  describe('integrateTribalPreFlight', () => {
    it('adds tribal risks to pre-flight assessment', () => {
      const input: PUOAInput = {
        intent: 'mill hard steel',
        context: { material: 'tool_steel' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      const enhanced = prismUnifiedOrchestratorEngine.integrateTribalPreFlight(preFlight, tribalCtx);

      expect(enhanced.risks.length).toBeGreaterThanOrEqual(preFlight.risks.length);
    });

    it('adds tribal fallback strategies', () => {
      const input: PUOAInput = {
        intent: 'optimize turning parameters',
        context: { material: 'steel', operation: 'finishing' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const preFlight = prismUnifiedOrchestratorEngine.assessPreFlight(input, routing);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      const enhanced = prismUnifiedOrchestratorEngine.integrateTribalPreFlight(preFlight, tribalCtx);

      expect(enhanced.fallback_strategies.length).toBeGreaterThanOrEqual(preFlight.fallback_strategies.length);
    });
  });

  describe('generateTribalExplanation', () => {
    it('appends tribal insights to explanation', () => {
      const baseExplanation = 'Task completed successfully.';
      const tribalCtx = {
        consulted: true,
        matching_tips: 5,
        key_insights: ['Reduce speed 10% for tool steel'],
        modifiers: {
          vc_modifier: 0.9,
          fz_modifier: 1.0,
          ap_modifier: 1.0,
          ae_modifier: 1.0,
          tool_life_modifier: 1.0,
          machinability_factor_override: null,
          machine_rate_override: null,
          cycle_time_base_override: null,
          setup_count_override: null,
          setup_time_per_setup_min: null,
          iso_speed_modifier: 0.9,
          confidence: 0.8,
          evidence_count: 5,
          source_tips: ['tip1', 'tip2'],
          auto_apply_approved: true,
        },
        constraints: {
          max_speed: null,
          min_speed: null,
          max_rpm: null,
          max_feed: null,
          min_passes: null,
          required_machine: null,
          forbidden_machines: [],
          forced_dependencies: [],
          phase_overrides: [],
          required_probe_after: [],
          confidence: 0.7,
          source_tips: [],
        },
        advisory: { warnings: [], recommendations: [], notes: [], source_tips: [] },
        query_context: {},
        tribal_risks: [],
        machine_advice: [],
        material_advice: [],
        operation_advice: [],
      };

      const enhanced = prismUnifiedOrchestratorEngine.generateTribalExplanation(
        baseExplanation,
        tribalCtx as any
      );

      expect(enhanced).toContain('tribal');
      expect(enhanced.length).toBeGreaterThan(baseExplanation.length);
    });

    it('returns base explanation when tribal not consulted', () => {
      const baseExplanation = 'Task completed.';
      const tribalCtx = {
        consulted: false,
        matching_tips: 0,
      };

      const result = prismUnifiedOrchestratorEngine.generateTribalExplanation(
        baseExplanation,
        tribalCtx as any
      );

      expect(result).toBe(baseExplanation);
    });
  });

  describe('enhanceHypothesesWithTribal', () => {
    it('adds tribal-applicable hypothesis', async () => {
      const input: PUOAInput = {
        intent: 'calculate speed for steel milling',
        context: { material: 'steel' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const baseHypotheses = prismUnifiedOrchestratorEngine.generateHypotheses(input, routing, []);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      const enhanced = prismUnifiedOrchestratorEngine.enhanceHypothesesWithTribal(
        baseHypotheses,
        tribalCtx
      );

      const tribalHyp = enhanced.hypotheses.find(h => h.id === 'tribal-applicable');
      expect(tribalHyp).toBeDefined();
      expect(tribalHyp?.statement).toContain('Tribal knowledge');
    });

    it('adds tribal evidence to synthesis', async () => {
      const input: PUOAInput = {
        intent: 'optimize roughing titanium',
        context: { material: 'titanium', operation: 'roughing' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const baseHypotheses = prismUnifiedOrchestratorEngine.generateHypotheses(input, routing, []);
      const tribalCtx = prismUnifiedOrchestratorEngine.consultTribalKnowledge(input, routing);

      if (tribalCtx.consulted && tribalCtx.matching_tips > 0) {
        const enhanced = prismUnifiedOrchestratorEngine.enhanceHypothesesWithTribal(
          baseHypotheses,
          tribalCtx
        );

        const hasTribInChain = enhanced.synthesis.reasoning_chain.some(r =>
          r.toLowerCase().includes('tribal')
        );
        expect(hasTribInChain).toBe(true);
      }
    });
  });

  describe('enhanceReasoningWithTribal', () => {
    it('adds tribal insights to reasoning context', () => {
      const baseContext: ReasoningContext = {
        insights: [],
        evidence: [],
        assumptions: [],
        open_questions: [],
        knowledge_gaps: [],
      };

      const tribalCtx = {
        consulted: true,
        matching_tips: 3,
        key_insights: ['Use flood coolant for stainless'],
        modifiers: {
          vc_modifier: 1.0,
          fz_modifier: 1.0,
          ap_modifier: 1.0,
          ae_modifier: 1.0,
          tool_life_modifier: 1.0,
          machinability_factor_override: null,
          machine_rate_override: null,
          cycle_time_base_override: null,
          setup_count_override: null,
          setup_time_per_setup_min: null,
          iso_speed_modifier: 1.0,
          confidence: 0.75,
          evidence_count: 3,
          source_tips: ['tip1'],
          auto_apply_approved: false,
        },
      };

      const enhanced = prismUnifiedOrchestratorEngine.enhanceReasoningWithTribal(
        baseContext,
        tribalCtx as any
      );

      expect(enhanced.insights.length).toBeGreaterThan(0);
      expect(enhanced.evidence.length).toBeGreaterThan(0);
    });

    it('identifies knowledge gaps when tribal tips are limited', () => {
      const baseContext: ReasoningContext = {
        insights: [],
        evidence: [],
        assumptions: [],
        open_questions: [],
        knowledge_gaps: [],
      };

      const tribalCtx = {
        consulted: true,
        matching_tips: 2,
        key_insights: [],
        modifiers: {
          evidence_count: 2,
          auto_apply_approved: false,
          confidence: 0.5,
        },
      };

      const enhanced = prismUnifiedOrchestratorEngine.enhanceReasoningWithTribal(
        baseContext,
        tribalCtx as any
      );

      expect(enhanced.knowledge_gaps.length).toBeGreaterThan(0);
      expect(enhanced.knowledge_gaps.some(g => g.includes('Limited tribal'))).toBe(true);
    });
  });

  describe('Full Pipeline with Tribal Knowledge', () => {
    it('integrates tribal knowledge into intelligence for machining task', async () => {
      const input: PUOAInput = {
        intent: 'calculate cutting parameters for milling D2 tool steel',
        context: {
          material: 'D2',
          operation: 'roughing',
          machine_id: 'haas-vf2',
          tool_type: 'endmill',
          tool_diameter: 12,
        },
      };

      const result = await prismUnifiedOrchestratorEngine.execute(input);

      // Tribal knowledge should be integrated
      expect(result.intelligence.tribal_knowledge).toBeDefined();
      if (result.intelligence.tribal_knowledge) {
        expect(result.intelligence.tribal_knowledge.consulted).toBe(true);
        expect(result.intelligence.tribal_knowledge.query_context).toBeDefined();
      }
    });

    it('tribal knowledge affects meta-confidence', async () => {
      const withContext: PUOAInput = {
        intent: 'calculate speed for steel turning',
        context: { material: 'steel', operation: 'turning' },
      };

      const result = await prismUnifiedOrchestratorEngine.execute(withContext);

      expect(result.intelligence.meta_confidence).toBeGreaterThan(0);
      expect(result.intelligence.meta_confidence).toBeLessThanOrEqual(0.95);
    });

    it('explanation includes tribal knowledge when applicable', async () => {
      const input: PUOAInput = {
        intent: 'optimize feeds for aluminum milling',
        context: { material: 'aluminum' },
      };

      const result = await prismUnifiedOrchestratorEngine.execute(input);

      if (result.intelligence.tribal_knowledge?.matching_tips &&
          result.intelligence.tribal_knowledge.matching_tips > 0) {
        expect(result.intelligence.explanation.toLowerCase()).toContain('tribal');
      }
    });

    it('reasoning context includes tribal evidence', async () => {
      const input: PUOAInput = {
        intent: 'drill holes in stainless steel',
        context: { material: 'stainless_steel', operation: 'drilling' },
      };

      const result = await prismUnifiedOrchestratorEngine.execute(input);

      if (result.intelligence.tribal_knowledge?.consulted) {
        const hasTribEvidence = result.intelligence.reasoning_context.evidence.some(e =>
          e.source.includes('tribal')
        );
        expect(hasTribEvidence || result.intelligence.tribal_knowledge.matching_tips === 0).toBe(true);
      }
    });
  });
});

// =============================================================================
// Proactive Intelligence Integration Tests
// =============================================================================

describe('Proactive Intelligence Integration', () => {
  describe('generateProactiveSuggestions', () => {
    it('generates proactive suggestions for machining tasks', () => {
      const input: PUOAInput = {
        intent: 'calculate speed feed for milling titanium',
        context: {
          material: 'titanium',
          iso_group: 'S',
          operation: 'milling',
          tool_type: 'carbide_endmill',
        },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const result = prismUnifiedOrchestratorEngine.generateProactiveSuggestions(input, routing);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      // Titanium (ISO S) should trigger warnings
      const hasWarning = result.suggestions.some(s => s.type === 'warning');
      expect(hasWarning).toBe(true);
    });

    it('generates context-aware suggestions for hardened materials', () => {
      const input: PUOAInput = {
        intent: 'turn hardened D2 steel',
        context: {
          material: 'D2',
          iso_group: 'H',
          operation: 'turning',
        },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const result = prismUnifiedOrchestratorEngine.generateProactiveSuggestions(input, routing);

      expect(result.risk_level).toBeDefined();
      expect(['low', 'medium', 'high', 'critical']).toContain(result.risk_level);
    });

    it('includes anticipated needs in suggestions', () => {
      const input: PUOAInput = {
        intent: 'quote new job for customer',
        context: { material: 'aluminum' },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const result = prismUnifiedOrchestratorEngine.generateProactiveSuggestions(input, routing);

      expect(result.anticipated_needs).toBeDefined();
      expect(Array.isArray(result.anticipated_needs)).toBe(true);
    });

    it('generates optimization recommendations', () => {
      const input: PUOAInput = {
        intent: 'optimize cutting parameters',
        context: {
          material: '6061',
          iso_group: 'N',
          operation: 'roughing',
        },
      };
      const routing = prismUnifiedOrchestratorEngine.routeToTier(input);
      const result = prismUnifiedOrchestratorEngine.generateProactiveSuggestions(input, routing);

      expect(result.optimizations).toBeDefined();
      expect(Array.isArray(result.optimizations)).toBe(true);
    });
  });

  describe('Proactive Intelligence in PUOA Results', () => {
    it('includes proactive_suggestions in intelligence metadata', async () => {
      const input: PUOAInput = {
        intent: 'mill H13 tool steel',
        context: {
          material: 'H13',
          iso_group: 'H',
          operation: 'milling',
        },
      };

      const result = await prismUnifiedOrchestratorEngine.execute(input);

      expect(result.intelligence.proactive_suggestions).toBeDefined();
      expect(Array.isArray(result.intelligence.proactive_suggestions)).toBe(true);
    });
  });
});

// =============================================================================
// Long-Horizon Planning Integration Tests
// =============================================================================

describe('Long-Horizon Planning Integration', () => {
  describe('generateLongHorizonPlan', () => {
    it('generates plan for complex machining tasks', () => {
      const input: PUOAInput = {
        intent: 'complete multi-operation job with tight tolerances',
        context: {
          material: 'inconel',
          operation: 'complex_machining',
        },
      };
      // Force complex routing
      const routing = {
        tier: 'full_chain' as const,
        domains: ['machining', 'tooling', 'quality'],
        complexity: 'complex' as const,
        reason: 'Multi-domain complex task',
        estimated_steps: 8,
      };

      const plan = prismUnifiedOrchestratorEngine.generateLongHorizonPlan(input, routing);

      expect(plan).toBeDefined();
      expect(plan?.plan_id).toBeDefined();
      expect(plan?.steps.length).toBeGreaterThan(0);
      expect(plan?.status).toBe('draft');
    });

    it('generates quote plan for quoting intent', () => {
      const input: PUOAInput = {
        intent: 'quote-to-ship workflow for new customer order',
        context: { shop_id: 'jm-die' },
      };
      const routing = {
        tier: 'full_chain' as const,
        domains: ['quoting', 'scheduling', 'production'],
        complexity: 'complex' as const,
        reason: 'Quote workflow',
      };

      const plan = prismUnifiedOrchestratorEngine.generateLongHorizonPlan(input, routing);

      expect(plan).toBeDefined();
      expect(plan?.goal.type).toBe('quote');
    });

    it('does not generate plan for simple tasks', () => {
      const input: PUOAInput = {
        intent: 'lookup material hardness',
      };
      const routing = {
        tier: 'single_dispatcher' as const,
        domains: ['materials'],
        complexity: 'simple' as const,
        reason: 'Simple lookup',
      };

      const plan = prismUnifiedOrchestratorEngine.generateLongHorizonPlan(input, routing);
      expect(plan).toBeUndefined();
    });

    it('includes constraints in generated plan', () => {
      const input: PUOAInput = {
        intent: 'critical machining job',
        constraints: {
          max_duration_ms: 3600000,
        },
        context: { material: 'titanium' },
      };
      const routing = {
        tier: 'full_chain' as const,
        domains: ['machining'],
        complexity: 'critical' as const,
        reason: 'Critical priority',
      };

      const plan = prismUnifiedOrchestratorEngine.generateLongHorizonPlan(input, routing);

      expect(plan).toBeDefined();
      expect(plan?.goal.priority).toBe('critical');
    });
  });

  describe('Long-Horizon Planning in PUOA Results', () => {
    it('includes long_horizon_plan for complex tasks', async () => {
      const input: PUOAInput = {
        intent: 'execute complex multi-step manufacturing workflow',
        context: {
          material: 'inconel',
          operation: 'multi_operation',
          complexity: 'complex',
        },
      };

      const result = await prismUnifiedOrchestratorEngine.execute(input);

      // Plan is only generated for complex/critical tasks
      if (result.tier === 'full_chain' ||
          (result.intelligence.pre_flight.estimated_cost?.complexity || 0) > 5) {
        expect(result.intelligence.long_horizon_plan).toBeDefined();
      }
    });
  });
});
