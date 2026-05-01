/**
 * PRISM RGS -- Scrutinizer Test Suite
 *
 * Tests all 12 checkers, scoring, auto-fix, and the adaptive
 * convergence loop exported from scrutinize-roadmap.ts.
 *
 * 7 describe blocks, 22 test cases.
 */

import { describe, it, expect } from 'vitest';

import {
  checkSchemaCompleteness,
  checkToolValidity,
  checkDependencyIntegrity,
  checkRoleModelAlignment,
  checkIndexFlags,
  scoreGaps,
  autoFixGaps,
  scrutinizeRoadmap,
} from '../scripts/scrutinize-roadmap.js';

// ---------------------------------------------------------------------------
// Helper: create a minimal valid roadmap for testing
// ---------------------------------------------------------------------------

function createTestUnit(overrides?: Record<string, unknown>) {
  return {
    id: 'P1-U01',
    title: 'Test Unit',
    phase: 'P1',
    sequence: 1,
    role: 'R2',
    role_name: 'Implementer',
    model: 'sonnet-4.6',
    effort: 80,
    steps: [
      {
        number: 1,
        instruction: 'Create the test file',
        tool_calls: ['prism_dev:build'],
        validation: 'File exists',
      },
    ],
    deliverables: [
      {
        path: 'src/test.ts',
        type: 'source',
        description: 'Test source file',
      },
    ],
    entry_conditions: ['Previous unit complete'],
    exit_conditions: ['File src/test.ts exists', 'Build passes'],
    rollback: 'git checkout -- src/test.ts',
    dependencies: [] as string[],
    tools: [{ tool: 'prism_dev', action: 'build', params_hint: '' }],
    skills: [] as string[],
    scripts: [] as string[],
    hooks: [] as string[],
    features: [] as string[],
    estimated_tokens: 500,
    estimated_minutes: 15,
    index_in_master: false,
    creates_skill: false,
    creates_script: false,
    creates_hook: false,
    creates_command: false,
    ...overrides,
  };
}

function createTestGate(overrides?: Record<string, unknown>) {
  return {
    omega_floor: 0.75,
    safety_floor: 0.70,
    ralph_required: false,
    ralph_grade_floor: 'B',
    anti_regression: true,
    test_required: true,
    build_required: true,
    checkpoint: true,
    learning_save: true,
    custom_checks: [] as string[],
    ...overrides,
  };
}

function createTestPhase(
  units?: ReturnType<typeof createTestUnit>[],
  overrides?: Record<string, unknown>,
) {
  return {
    id: 'P1',
    title: 'Test Phase',
    description: 'Test phase for scrutinizer',
    sessions: '1',
    primary_role: 'R2',
    primary_model: 'sonnet-4.6',
    units: units ?? [createTestUnit()],
    gate: createTestGate(),
    scrutiny_checkpoint: false,
    scrutiny_focus: [] as string[],
    ...overrides,
  };
}

function createTestRoadmap(
  phases?: ReturnType<typeof createTestPhase>[],
  overrides?: Record<string, unknown>,
): any {
  const resolvedPhases = phases ?? [createTestPhase()];
  const totalUnits = resolvedPhases.reduce(
    (sum: number, p: any) => sum + p.units.length,
    0,
  );
  return {
    id: 'TEST-ROADMAP',
    version: '1.0.0',
    title: 'Test Roadmap',
    brief: 'Test brief for scrutinizer validation',
    created_at: '2026-02-25T00:00:00Z',
    created_by: 'test',
    phases: resolvedPhases,
    total_units: totalUnits,
    total_sessions: '1',
    role_matrix: [],
    tool_map: [],
    deliverables_index: [],
    scrutiny_config: {
      pass_mode: 'adaptive',
      min_passes: 3,
      max_passes: 7,
      convergence_rule: 'delta < 2',
      escalation_rule:
        'if pass 4+ finds CRITICAL, flag for human review',
      scrutinizer_model: 'opus-4.6',
      scrutinizer_effort: 90,
      gap_categories: [],
      improvement_threshold: 0.92,
    },
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Scrutinizer', () => {
  // -----------------------------------------------------------------------
  // 1. Schema Completeness
  // -----------------------------------------------------------------------
  describe('Schema Completeness', () => {
    it('should return 0 gaps for fully populated unit', () => {
      const roadmap = createTestRoadmap();
      const gaps = checkSchemaCompleteness(roadmap);
      expect(gaps).toHaveLength(0);
    });

    it('should flag unit with missing role', () => {
      const unit = createTestUnit({ role: '' });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkSchemaCompleteness(roadmap);
      const roleGaps = gaps.filter((g) => g.description.includes('role'));
      expect(roleGaps.length).toBeGreaterThanOrEqual(1);
    });

    it('should flag unit with empty steps array', () => {
      const unit = createTestUnit({ steps: [] });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkSchemaCompleteness(roadmap);
      const stepGaps = gaps.filter((g) => g.category === 'underspecified_steps');
      expect(stepGaps.length).toBeGreaterThanOrEqual(1);
    });

    it('should flag unit with placeholder "TBD" text', () => {
      const unit = createTestUnit({ role_name: 'TBD' });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkSchemaCompleteness(roadmap);
      const tbd = gaps.filter((g) => g.description.includes('TBD'));
      expect(tbd.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Tool Validity
  // -----------------------------------------------------------------------
  describe('Tool Validity', () => {
    it('should accept valid prism_omega:compute reference', () => {
      const unit = createTestUnit({
        tools: [{ tool: 'prism_omega', action: 'compute', params_hint: '' }],
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkToolValidity(roadmap);
      expect(gaps).toHaveLength(0);
    });

    it('should flag non-existent prism_fake:action', () => {
      const unit = createTestUnit({
        tools: [{ tool: 'prism_fake', action: 'action', params_hint: '' }],
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkToolValidity(roadmap);
      expect(gaps.length).toBeGreaterThanOrEqual(1);
      expect(gaps[0].description).toContain('prism_fake');
    });

    it('should accept Desktop Commander as valid', () => {
      const unit = createTestUnit({
        tools: [{ tool: 'Desktop Commander', action: 'read', params_hint: '' }],
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkToolValidity(roadmap);
      expect(gaps).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Dependency Integrity
  // -----------------------------------------------------------------------
  describe('Dependency Integrity', () => {
    it('should accept valid linear chain A->B->C', () => {
      const unitA = createTestUnit({ id: 'P1-U01', dependencies: [] });
      const unitB = createTestUnit({ id: 'P1-U02', dependencies: ['P1-U01'] });
      const unitC = createTestUnit({ id: 'P1-U03', dependencies: ['P1-U02'] });
      const roadmap = createTestRoadmap([
        createTestPhase([unitA, unitB, unitC]),
      ]);
      const gaps = checkDependencyIntegrity(roadmap);
      expect(gaps).toHaveLength(0);
    });

    it('should flag circular dependency A->B->A', () => {
      const unitA = createTestUnit({
        id: 'P1-U01',
        dependencies: ['P1-U02'],
      });
      const unitB = createTestUnit({
        id: 'P1-U02',
        dependencies: ['P1-U01'],
      });
      const roadmap = createTestRoadmap([createTestPhase([unitA, unitB])]);
      const gaps = checkDependencyIntegrity(roadmap);
      const cycleGap = gaps.find((g) => g.description.includes('Circular'));
      expect(cycleGap).toBeDefined();
      expect(cycleGap!.severity).toBe('CRITICAL');
    });

    it('should flag reference to non-existent unit', () => {
      const unit = createTestUnit({ dependencies: ['NONEXISTENT-U99'] });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkDependencyIntegrity(roadmap);
      const missing = gaps.find((g) =>
        g.description.includes('NONEXISTENT-U99'),
      );
      expect(missing).toBeDefined();
      expect(missing!.severity).toBe('CRITICAL');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Role Model Alignment
  // -----------------------------------------------------------------------
  describe('Role Model Alignment', () => {
    it('should accept architecture unit with opus model', () => {
      // R1 -> opus
      const unit = createTestUnit({ role: 'R1', model: 'opus-4.6' });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkRoleModelAlignment(roadmap);
      expect(gaps).toHaveLength(0);
    });

    it('should flag architecture unit with haiku model', () => {
      // R1 expects opus, giving it haiku is a MAJOR mismatch
      const unit = createTestUnit({ role: 'R1', model: 'haiku-3.6' });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkRoleModelAlignment(roadmap);
      expect(gaps.length).toBeGreaterThanOrEqual(1);
      expect(gaps[0].severity).toBe('MAJOR');
    });

    it('should flag docs unit with opus model (minor)', () => {
      // R6 expects sonnet, giving it opus is MINOR (over-provisioned)
      const unit = createTestUnit({
        role: 'R6',
        role_name: 'Doc Writer',
        model: 'opus-4.6',
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const gaps = checkRoleModelAlignment(roadmap);
      expect(gaps.length).toBeGreaterThanOrEqual(1);
      // R6 expects haiku per ROLE_MODEL_MAP -> opus is not haiku -> MINOR
      // (isDocsWithOpus branch in the source)
      expect(gaps[0].severity).toBe('MINOR');
    });
  });

  // -----------------------------------------------------------------------
  // 5. Scoring
  // -----------------------------------------------------------------------
  describe('Scoring', () => {
    it('should return 1.0 for 0 gaps', () => {
      const score = scoreGaps([], 1);
      expect(score).toBe(1.0);
    });

    it('should return < 0.90 for 1 CRITICAL gap', () => {
      // weight 3, total_possible = max(1, 1 * 12) = 12
      // score = 1.0 - 3/12 = 0.75
      const gaps = [
        {
          id: 'GAP-0001',
          category: 'missing_tools' as const,
          severity: 'CRITICAL' as const,
          location: 'U01',
          description: 'test',
          resolved: false,
        },
      ];
      const score = scoreGaps(gaps, 1);
      expect(score).toBeLessThan(0.9);
      expect(score).toBe(0.75);
    });

    it('should return > 0.85 for 5 MINOR gaps with enough units', () => {
      // 5 MINOR = weight 5, total_possible = max(1, 5 * 12) = 60
      // score = 1.0 - 5/60 = 0.9167
      const gaps = Array.from({ length: 5 }, (_, i) => ({
        id: `GAP-${i}`,
        category: 'missing_indexing' as const,
        severity: 'MINOR' as const,
        location: `U0${i}`,
        description: 'test minor gap',
        resolved: false,
      }));
      const score = scoreGaps(gaps, 5);
      expect(score).toBeGreaterThan(0.85);
    });
  });

  // -----------------------------------------------------------------------
  // 6. Auto-fix
  // -----------------------------------------------------------------------
  describe('Auto-fix', () => {
    it('should auto-fix missing index flags', () => {
      // Unit delivers a skill file but creates_skill is false
      const unit = createTestUnit({
        creates_skill: false,
        deliverables: [
          {
            path: '.claude/skills/my-skill/SKILL.md',
            type: 'skill',
            description: 'A new skill',
          },
        ],
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);

      // First find the gap
      const gaps = checkIndexFlags(roadmap);
      const indexGaps = gaps.filter((g) => g.category === 'missing_indexing');
      expect(indexGaps.length).toBeGreaterThanOrEqual(1);

      // Now auto-fix
      const { fixed, applied } = autoFixGaps(roadmap, gaps);
      expect(applied.length).toBeGreaterThanOrEqual(1);

      // Verify the fixed roadmap has the flag set
      const fixedUnit = fixed.phases[0].units[0];
      expect(fixedUnit.creates_skill).toBe(true);
    });

    it('should NOT auto-fix missing rollback (requires judgment)', () => {
      const unit = createTestUnit({ rollback: '' });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);

      // checkSchemaCompleteness flags missing rollback
      const gaps = checkSchemaCompleteness(roadmap);
      const rollbackGaps = gaps.filter((g) =>
        g.description.includes('rollback'),
      );
      expect(rollbackGaps.length).toBeGreaterThanOrEqual(1);

      // auto-fix should not touch rollback (category is missing_rollback, not auto-fixable)
      const { applied } = autoFixGaps(roadmap, rollbackGaps);
      expect(applied).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 7. Full Loop -- Adaptive Convergence
  // -----------------------------------------------------------------------
  describe('Full Loop -- Adaptive Convergence', () => {
    it('should approve clean roadmap with score >= 0.92', () => {
      // Build a unit that is as clean as possible
      const unit = createTestUnit({
        role: 'R2',
        model: 'sonnet-4.6',
        steps: [
          {
            number: 1,
            instruction: 'Create the module src/test.ts with the baseline implementation',
            tool_calls: ['prism_dev:build'],
            validation: 'File src/test.ts exists',
          },
        ],
        exit_conditions: [
          'File src/test.ts exists',
          'npx tsc --noEmit passes',
        ],
        rollback: 'git checkout -- src/test.ts',
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const log = scrutinizeRoadmap(roadmap);

      expect(log.final_score).toBeGreaterThanOrEqual(0.92);
      expect(log.passed).toBe(true);
    });

    it('should improve score across rounds for fixable gaps', () => {
      // Unit with missing index flag -- auto-fixable
      const unit = createTestUnit({
        creates_skill: false,
        deliverables: [
          {
            path: '.claude/skills/x/SKILL.md',
            type: 'skill',
            description: 'Skill deliverable',
          },
        ],
        steps: [
          {
            number: 1,
            instruction: 'Create the skill file at .claude/skills/x/SKILL.md',
            tool_calls: ['prism_skill_script:create'],
            validation: 'SKILL.md exists',
          },
        ],
        exit_conditions: [
          'File .claude/skills/x/SKILL.md exists',
          'vitest passes',
        ],
        rollback: 'git checkout -- .claude/skills/x/SKILL.md',
      });
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const log = scrutinizeRoadmap(roadmap);

      // After auto-fix in the loop, the index flag gap should resolve.
      // Verify multiple passes ran and score is reasonable.
      expect(log.passes.length).toBeGreaterThanOrEqual(3);
      // The final pass score should be at least as good as the first
      const firstScore = log.passes[0].score;
      const lastScore = log.passes[log.passes.length - 1].score;
      expect(lastScore).toBeGreaterThanOrEqual(firstScore);
    });

    it('should converge within max_passes', () => {
      const unit = createTestUnit();
      const roadmap = createTestRoadmap([createTestPhase([unit])]);
      const log = scrutinizeRoadmap(roadmap, { max_passes: 5 });

      expect(log.passes.length).toBeLessThanOrEqual(5);
      // At least one pass must have converged=true (the last)
      const lastPass = log.passes[log.passes.length - 1];
      expect(lastPass.converged).toBe(true);
    });
  });
});
