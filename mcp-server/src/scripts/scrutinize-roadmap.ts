/**
 * PRISM RGS -- Roadmap Scrutinizer
 *
 * Implements the 12-category gap analysis and adaptive improvement loop
 * for validating RGS-format roadmaps. Each checker is a pure function
 * that returns an array of gaps. The orchestrator runs all checkers in
 * an adaptive loop, auto-fixing what it can, until convergence or the
 * max-pass safety cap is reached.
 *
 * Checkers:
 *   1. checkSchemaCompleteness   -- mandatory fields present and non-placeholder
 *   2. checkToolValidity         -- tool names match known dispatcher prefixes
 *   3. checkSkillValidity        -- skill IDs match known skill registry
 *   4. checkDependencyIntegrity  -- no missing targets or cycles
 *   5. checkRoleModelAlignment   -- role codes map to expected models
 *   6. checkExitConditionQuality -- conditions are concrete, not vague
 *   7. checkStepSpecificity      -- steps are imperative and actionable
 *   8. checkDeliverableCoverage  -- deliverables present and cross-referenced
 *   9. checkIndexFlags           -- indexing booleans match deliverable content
 *  10. checkSequenceOptimization -- flag parallelizable consecutive units
 *  11. checkGateCoverage         -- phase gates have required fields
 *  12. checkRollbackCoverage     -- rollback instructions are specific
 *
 * Orchestrator:
 *   scrutinizeRoadmap()  -- adaptive loop with scoring + auto-fix
 *   scoreGaps()          -- weighted severity scoring
 *   autoFixGaps()        -- apply auto-fixable patches to a roadmap clone
 *
 * @module scripts/scrutinize-roadmap
 */

import { z } from 'zod';
import {
  RoadmapEnvelope,
  RoadmapPhase,
  RoadmapUnit,
  RoadmapStep,
  RoadmapDeliverable,
  RoadmapGate,
  ScrutinyConfig,
  ScrutinyLog,
  ScrutinyPass,
  Gap,
  GapCategory,
  GapSeverity,
} from '../schemas/roadmapSchema.js';

// ─── Inferred Types ──────────────────────────────────────────────

type Envelope = z.infer<typeof RoadmapEnvelope>;
type Unit = z.infer<typeof RoadmapUnit>;
type Phase = z.infer<typeof RoadmapPhase>;
type Step = z.infer<typeof RoadmapStep>;
type Deliverable = z.infer<typeof RoadmapDeliverable>;
type Gate = z.infer<typeof RoadmapGate>;
type GapItem = z.infer<typeof Gap>;
type SConfig = z.infer<typeof ScrutinyConfig>;
type SLog = z.infer<typeof ScrutinyLog>;
type SPass = z.infer<typeof ScrutinyPass>;

// ─── Constants ───────────────────────────────────────────────────

/** 32 recognized PRISM dispatcher prefixes. */
const DEFAULT_KNOWN_TOOL_PREFIXES: string[] = [
  'prism_omega', 'prism_ralph', 'prism_dev', 'prism_sp',
  'prism_guard', 'prism_session', 'prism_skill_script', 'prism_knowledge',
  'prism_hook', 'prism_validate', 'prism_intelligence', 'prism_prompt',
  'prism_mfg', 'prism_memory', 'prism_health', 'prism_metrics',
  'prism_cost', 'prism_cadence', 'prism_config', 'prism_state',
  'prism_model', 'prism_safety', 'prism_cli', 'prism_tool',
  'prism_admin', 'prism_checkpoint', 'prism_auth', 'prism_telemetry',
  'prism_circuit', 'prism_rate', 'prism_audit', 'prism_cache',
  'prism_debug',
];

/** Additional standalone tool names accepted as valid. */
const STANDALONE_VALID_TOOLS: string[] = [
  'Desktop Commander',
];

/** Default known skill IDs. */
const DEFAULT_KNOWN_SKILLS: string[] = [
  'prism-roadmap-schema',
  'prism-roadmap-generator',
  'prism-roadmap-atomizer',
  'prism-roadmap-scrutinizer',
  'prism-cnc-fundamentals',
  'prism-session-management',
  'prism-omega-scoring',
  'prism-ralph-grading',
  'prism-tool-authoring',
  'prism-skill-authoring',
  'prism-hook-authoring',
  'prism-command-authoring',
  'prism-mfg-intelligence',
  'prism-safety-validation',
  'prism-memory-management',
  'prism-cost-estimation',
  'prism-health-monitoring',
];

/** Expected role -> model mapping from the RGS role matrix. */
const ROLE_MODEL_MAP: Record<string, string> = {
  R1: 'opus',
  R2: 'sonnet',
  R3: 'sonnet',
  R4: 'opus',
  R5: 'opus',
  R6: 'sonnet',
  R7: 'opus',
  R8: 'haiku',
};

/** Words that indicate vague exit conditions. */
const VAGUE_CONDITION_WORDS: string[] = [
  'good', 'proper', 'appropriate', 'nice', 'decent', 'reasonable',
];

/** Passive/hedge words that weaken step instructions. */
const HEDGE_WORDS: string[] = [
  'consider', 'think about', 'maybe', 'possibly', 'might want to',
];

/** Placeholder sentinel values. */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^TBD$/i,
  /^TODO$/i,
  /^placeholder$/i,
  /^N\/A$/i,
  /^xxx$/i,
  /^\[.*\]$/,
];

/** Severity weights for scoring. */
const SEVERITY_WEIGHTS: Record<z.infer<typeof GapSeverity>, number> = {
  CRITICAL: 3,
  MAJOR: 2,
  MINOR: 1,
  INFO: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────

let _gapCounter = 0;

/** Generate a unique gap ID. */
function nextGapId(): string {
  _gapCounter += 1;
  return `GAP-${String(_gapCounter).padStart(4, '0')}`;
}

/** Reset the gap counter (call at the start of each scrutiny run). */
function resetGapCounter(): void {
  _gapCounter = 0;
}

/** Create a GapItem with standard defaults. */
function makeGap(
  category: z.infer<typeof GapCategory>,
  severity: z.infer<typeof GapSeverity>,
  location: string,
  description: string,
  suggestion?: string,
): GapItem {
  return {
    id: nextGapId(),
    category,
    severity,
    location,
    description,
    suggestion,
    resolved: false,
  };
}

/** Check if a string value is empty or a placeholder. */
function isEmptyOrPlaceholder(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return true;
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }
  }
  return false;
}

/** Collect all units from all phases in a roadmap. */
function allUnits(roadmap: Envelope): Unit[] {
  const units: Unit[] = [];
  for (const phase of roadmap.phases) {
    for (const unit of phase.units) {
      units.push(unit);
    }
  }
  return units;
}

/** Count total units in a roadmap. */
function totalUnitCount(roadmap: Envelope): number {
  let count = 0;
  for (const phase of roadmap.phases) {
    count += phase.units.length;
  }
  return count;
}

// ─── Checker 1: Schema Completeness ──────────────────────────────

/**
 * Check that all mandatory fields on every unit are non-empty and
 * not placeholder values.
 *
 * Mandatory fields: id, title, phase, sequence, role, role_name,
 * model, effort, steps (non-empty array), deliverables (non-empty
 * array), entry_conditions, exit_conditions, rollback.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps found.
 */
export function checkSchemaCompleteness(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    // Critical fields
    const criticalFields: [string, unknown][] = [
      ['id', unit.id],
      ['title', unit.title],
      ['role', unit.role],
      ['role_name', unit.role_name],
    ];
    for (const [field, value] of criticalFields) {
      if (isEmptyOrPlaceholder(value)) {
        gaps.push(makeGap(
          'missing_tools',
          'CRITICAL',
          unit.id || '(unknown)',
          `Unit "${unit.id}" has empty or placeholder ${field}: "${value}"`,
          `Provide a concrete value for ${field}`,
        ));
      }
    }

    // Major fields
    if (!unit.steps || unit.steps.length === 0) {
      gaps.push(makeGap(
        'underspecified_steps',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no steps defined`,
        'Add at least one concrete step with an imperative instruction',
      ));
    }
    if (!unit.deliverables || unit.deliverables.length === 0) {
      gaps.push(makeGap(
        'orphaned_deliverables',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no deliverables defined`,
        'Add at least one deliverable with path, type, and description',
      ));
    }
    if (!unit.entry_conditions || unit.entry_conditions.length === 0) {
      gaps.push(makeGap(
        'missing_exit_conditions',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no entry conditions`,
        'Add at least one entry condition',
      ));
    }
    if (!unit.exit_conditions || unit.exit_conditions.length === 0) {
      gaps.push(makeGap(
        'missing_exit_conditions',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no exit conditions`,
        'Add at least one measurable exit condition',
      ));
    }
    if (isEmptyOrPlaceholder(unit.model)) {
      gaps.push(makeGap(
        'role_mismatch',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has empty or placeholder model spec`,
        'Assign a model: opus-4.6, sonnet-4.6, or haiku-3.6',
      ));
    }
    if (isEmptyOrPlaceholder(unit.rollback)) {
      gaps.push(makeGap(
        'missing_rollback',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has empty or placeholder rollback instruction`,
        'Provide a specific rollback command or procedure',
      ));
    }
    if (isEmptyOrPlaceholder(unit.phase)) {
      gaps.push(makeGap(
        'sequence_errors',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has empty or placeholder phase reference`,
        'Assign the unit to a valid phase ID',
      ));
    }
  }

  return gaps;
}

// ─── Checker 2: Tool Validity ────────────────────────────────────

/**
 * Verify that every tool referenced in units matches a known PRISM
 * dispatcher prefix or standalone tool name.
 *
 * @param roadmap - The roadmap envelope to check.
 * @param knownTools - Optional override list of valid tool prefixes.
 * @returns Array of gaps for unknown tools.
 */
export function checkToolValidity(
  roadmap: Envelope,
  knownTools?: string[],
): GapItem[] {
  const gaps: GapItem[] = [];
  const prefixes = knownTools ?? DEFAULT_KNOWN_TOOL_PREFIXES;

  for (const unit of allUnits(roadmap)) {
    for (const toolRef of unit.tools) {
      const toolName = toolRef.tool;
      const isKnownPrefix = prefixes.some((prefix) =>
        toolName.startsWith(prefix),
      );
      const isStandalone = STANDALONE_VALID_TOOLS.some(
        (name) => toolName === name,
      );

      if (!isKnownPrefix && !isStandalone) {
        gaps.push(makeGap(
          'missing_tools',
          'MAJOR',
          unit.id,
          `Unit "${unit.id}" references unknown tool "${toolName}"`,
          `Use a recognized PRISM dispatcher prefix (${prefixes.slice(0, 5).join(', ')}...) or "Desktop Commander"`,
        ));
      }
    }
  }

  return gaps;
}

// ─── Checker 3: Skill Validity ───────────────────────────────────

/**
 * Check that every skill ID referenced in units is recognized.
 *
 * @param roadmap - The roadmap envelope to check.
 * @param knownSkills - Optional override list of valid skill IDs.
 * @returns Array of gaps for unknown skills.
 */
export function checkSkillValidity(
  roadmap: Envelope,
  knownSkills?: string[],
): GapItem[] {
  const gaps: GapItem[] = [];
  const validSkills = new Set(knownSkills ?? DEFAULT_KNOWN_SKILLS);

  for (const unit of allUnits(roadmap)) {
    for (const skillId of unit.skills) {
      if (!validSkills.has(skillId)) {
        gaps.push(makeGap(
          'missing_skills',
          'MAJOR',
          unit.id,
          `Unit "${unit.id}" references unknown skill "${skillId}"`,
          `Register the skill or use one of: ${[...validSkills].slice(0, 5).join(', ')}...`,
        ));
      }
    }
  }

  return gaps;
}

// ─── Checker 4: Dependency Integrity ─────────────────────────────

/**
 * Verify all dependency targets exist and detect cycles using
 * Kahn's algorithm for topological sorting.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for missing targets and cycles.
 */
export function checkDependencyIntegrity(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];
  const units = allUnits(roadmap);
  const unitIds = new Set(units.map((u) => u.id));

  // Check for missing dependency targets
  for (const unit of units) {
    for (const dep of unit.dependencies) {
      if (!unitIds.has(dep)) {
        gaps.push(makeGap(
          'missing_deps',
          'CRITICAL',
          unit.id,
          `Unit "${unit.id}" depends on "${dep}" which does not exist`,
          `Remove the dependency or create unit "${dep}"`,
        ));
      }
    }
  }

  // Topological sort via Kahn's algorithm to detect cycles
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const id of unitIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  for (const unit of units) {
    for (const dep of unit.dependencies) {
      if (unitIds.has(dep)) {
        // Edge: dep -> unit.id (dep must finish before unit)
        adjacency.get(dep)!.push(unit.id);
        inDegree.set(unit.id, (inDegree.get(unit.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  let sortedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    sortedCount += 1;

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedCount !== unitIds.size) {
    const cycleMembers = [...unitIds].filter(
      (id) => (inDegree.get(id) ?? 0) > 0,
    );
    gaps.push(makeGap(
      'sequence_errors',
      'CRITICAL',
      cycleMembers.join(', '),
      `Circular dependency detected among units: ${cycleMembers.join(', ')}`,
      'Break the cycle by removing or redirecting one of the dependency edges',
    ));
  }

  return gaps;
}

// ─── Checker 5: Role-Model Alignment ─────────────────────────────

/**
 * Verify each unit's role code maps to the expected model family.
 *
 * Expected: R1->opus, R2->sonnet, R3->sonnet, R4->opus, R5->opus,
 * R6->sonnet, R7->opus, R8->haiku.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for misaligned role/model pairs.
 */
export function checkRoleModelAlignment(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    const expectedFamily = ROLE_MODEL_MAP[unit.role];
    if (!expectedFamily) continue;

    const modelLower = unit.model.toLowerCase();
    const hasExpected = modelLower.includes(expectedFamily);

    if (!hasExpected) {
      // Determine severity based on mismatch direction
      const isArchitectureWithHaiku =
        (unit.role === 'R1' || unit.role === 'R4' || unit.role === 'R7') &&
        modelLower.includes('haiku');
      const isDocsWithOpus =
        unit.role === 'R6' && modelLower.includes('opus');

      const severity: z.infer<typeof GapSeverity> = isArchitectureWithHaiku
        ? 'MAJOR'
        : isDocsWithOpus
          ? 'MINOR'
          : 'MAJOR';

      gaps.push(makeGap(
        'role_mismatch',
        severity,
        unit.id,
        `Unit "${unit.id}" has role ${unit.role} but model "${unit.model}" (expected ${expectedFamily}-family)`,
        `Change model to ${expectedFamily}-4.6 or reassign role`,
      ));
    }
  }

  return gaps;
}

// ─── Checker 6: Exit Condition Quality ───────────────────────────

/**
 * Verify exit conditions are present, concrete, and not vague.
 * Checks for vague words and requires at least one condition that
 * references a concrete artifact (file path, command, or score).
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for empty, vague, or non-specific conditions.
 */
export function checkExitConditionQuality(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    if (!unit.exit_conditions || unit.exit_conditions.length === 0) {
      gaps.push(makeGap(
        'missing_exit_conditions',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no exit conditions`,
        'Add measurable conditions such as "npx tsc --noEmit passes" or "file X exists"',
      ));
      continue;
    }

    // Check for vague words
    for (const condition of unit.exit_conditions) {
      const condLower = condition.toLowerCase();
      for (const vagueWord of VAGUE_CONDITION_WORDS) {
        if (condLower.includes(vagueWord)) {
          gaps.push(makeGap(
            'missing_exit_conditions',
            'MAJOR',
            unit.id,
            `Unit "${unit.id}" exit condition is vague: "${condition}" (contains "${vagueWord}")`,
            'Replace with a measurable, verifiable condition',
          ));
          break;
        }
      }
    }

    // Check that at least one condition references a concrete artifact
    const concretePattern = /(\.[a-z]{1,5}\b|\/|\\|\.ts|\.js|\.json|\.md|score|pass|fail|exit\s*code|command|npm|npx|tsc|jest|vitest)/i;
    const hasConcrete = unit.exit_conditions.some((c) =>
      concretePattern.test(c),
    );
    if (!hasConcrete) {
      gaps.push(makeGap(
        'missing_exit_conditions',
        'MINOR',
        unit.id,
        `Unit "${unit.id}" exit conditions lack concrete artifact references`,
        'Include at least one condition referencing a file path, command, or score',
      ));
    }
  }

  return gaps;
}

// ─── Checker 7: Step Specificity ─────────────────────────────────

/**
 * Verify each step instruction is non-empty, starts with a verb,
 * and avoids passive/hedge language.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for vague, empty, or hedging steps.
 */
export function checkStepSpecificity(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    for (const step of unit.steps) {
      if (isEmptyOrPlaceholder(step.instruction)) {
        gaps.push(makeGap(
          'underspecified_steps',
          'MAJOR',
          unit.id,
          `Unit "${unit.id}" step ${step.number} has empty or placeholder instruction`,
          'Write a concrete imperative instruction starting with a verb',
        ));
        continue;
      }

      const instrLower = step.instruction.toLowerCase().trim();

      // Check for hedge words
      for (const hedge of HEDGE_WORDS) {
        if (instrLower.includes(hedge)) {
          gaps.push(makeGap(
            'underspecified_steps',
            'MAJOR',
            unit.id,
            `Unit "${unit.id}" step ${step.number} uses hedge language: "${hedge}"`,
            'Replace with a direct imperative: "Create...", "Run...", "Add..."',
          ));
          break;
        }
      }

      // Check first word is a verb (heuristic: starts with a capital letter
      // or a known verb-like pattern)
      const firstWord = step.instruction.trim().split(/\s+/)[0] ?? '';
      const verbLikePattern = /^(create|add|build|run|write|read|update|delete|remove|verify|check|test|deploy|configure|install|import|export|define|implement|refactor|generate|validate|execute|call|invoke|send|fetch|parse|render|mount|register|wire|connect|set|get|open|close|start|stop|enable|disable|ensure|assert|confirm|copy|move|merge|split|format|lint|compile|review|audit|scan|fix|patch|debug|log|print|document|annotate|index)/i;
      if (!verbLikePattern.test(firstWord)) {
        gaps.push(makeGap(
          'underspecified_steps',
          'MINOR',
          unit.id,
          `Unit "${unit.id}" step ${step.number} may not start with an action verb: "${firstWord}..."`,
          'Start the instruction with an imperative verb like "Create", "Run", "Add"',
        ));
      }

      // Check for missing tool_calls (minor)
      if (!step.tool_calls || step.tool_calls.length === 0) {
        gaps.push(makeGap(
          'underspecified_steps',
          'MINOR',
          unit.id,
          `Unit "${unit.id}" step ${step.number} has no tool_calls specified`,
          'Add relevant PRISM tool calls for traceability',
        ));
      }
    }
  }

  return gaps;
}

// ─── Checker 8: Deliverable Coverage ─────────────────────────────

/**
 * Verify deliverables are present, have required fields, and are
 * cross-referenced by step instructions.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for missing or orphaned deliverables.
 */
export function checkDeliverableCoverage(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    if (!unit.deliverables || unit.deliverables.length === 0) {
      gaps.push(makeGap(
        'orphaned_deliverables',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no deliverables`,
        'Add at least one deliverable with path, type, and description',
      ));
      continue;
    }

    for (const deliverable of unit.deliverables) {
      if (isEmptyOrPlaceholder(deliverable.path)) {
        gaps.push(makeGap(
          'orphaned_deliverables',
          'MAJOR',
          unit.id,
          `Unit "${unit.id}" has a deliverable with empty path`,
          'Provide the relative file path for the deliverable',
        ));
      }
      if (isEmptyOrPlaceholder(deliverable.description)) {
        gaps.push(makeGap(
          'orphaned_deliverables',
          'MINOR',
          unit.id,
          `Unit "${unit.id}" deliverable "${deliverable.path}" has empty description`,
          'Add a brief description of what this deliverable does',
        ));
      }
    }

    // Cross-reference: extract file paths mentioned in step instructions
    // and check that they appear in the deliverables list
    const deliverablePaths = new Set(
      unit.deliverables.map((d) => d.path),
    );
    const pathPattern = /(?:[\w./-]+\.(?:ts|js|json|md|yaml|yml|sh|mjs|cjs|tsx|jsx))/g;

    for (const step of unit.steps) {
      const matches = step.instruction.match(pathPattern);
      if (matches) {
        for (const match of matches) {
          // Only flag if it looks like a project file (has a slash or starts
          // with src/ or similar) and is not in deliverables
          if (
            (match.includes('/') || match.startsWith('src')) &&
            !deliverablePaths.has(match)
          ) {
            // Check if any deliverable path ends with this match or contains it
            const found = [...deliverablePaths].some(
              (dp) => dp.endsWith(match) || dp.includes(match) || match.includes(dp),
            );
            if (!found) {
              gaps.push(makeGap(
                'orphaned_deliverables',
                'MINOR',
                unit.id,
                `Unit "${unit.id}" step mentions file "${match}" but it is not in deliverables`,
                `Add "${match}" to the deliverables array or correct the reference`,
              ));
            }
          }
        }
      }
    }
  }

  return gaps;
}

// ─── Checker 9: Index Flags ──────────────────────────────────────

/**
 * Verify that boolean index flags (creates_skill, creates_script,
 * creates_hook, creates_command) match the actual deliverable paths.
 * All gaps from this checker are auto-fixable.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of auto-fixable gaps for incorrect index flags.
 */
export function checkIndexFlags(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    const paths = (unit.deliverables ?? []).map((d) =>
      d.path.toLowerCase(),
    );
    const types = (unit.deliverables ?? []).map((d) => d.type);
    const allText = paths.join(' ') + ' ' + types.join(' ');

    // creates_skill
    const hasSkillDeliverable =
      allText.includes('skill') || paths.some((p) => p.includes('SKILL.md'.toLowerCase()));
    if (hasSkillDeliverable && !unit.creates_skill) {
      const gap = makeGap(
        'missing_indexing',
        'MINOR',
        unit.id,
        `Unit "${unit.id}" produces skill deliverables but creates_skill is false`,
        'Set creates_skill to true',
      );
      gaps.push(gap);
    }

    // creates_script
    const hasScriptDeliverable =
      allText.includes('script') || types.includes('script');
    if (hasScriptDeliverable && !unit.creates_script) {
      const gap = makeGap(
        'missing_indexing',
        'MINOR',
        unit.id,
        `Unit "${unit.id}" produces script deliverables but creates_script is false`,
        'Set creates_script to true',
      );
      gaps.push(gap);
    }

    // creates_hook
    const hasHookDeliverable =
      allText.includes('hook') || types.includes('hook');
    if (hasHookDeliverable && !unit.creates_hook) {
      const gap = makeGap(
        'missing_indexing',
        'MINOR',
        unit.id,
        `Unit "${unit.id}" produces hook deliverables but creates_hook is false`,
        'Set creates_hook to true',
      );
      gaps.push(gap);
    }

    // creates_command
    const hasCommandDeliverable =
      allText.includes('command') ||
      types.includes('command') ||
      paths.some((p) => p.includes('.claude/commands'));
    if (hasCommandDeliverable && !unit.creates_command) {
      const gap = makeGap(
        'missing_indexing',
        'MINOR',
        unit.id,
        `Unit "${unit.id}" produces command deliverables but creates_command is false`,
        'Set creates_command to true',
      );
      gaps.push(gap);
    }
  }

  return gaps;
}

// ─── Checker 10: Sequence Optimization ───────────────────────────

/**
 * Within each phase, flag consecutive units that have no
 * interdependencies and could potentially be parallelized.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of minor gaps suggesting parallelization.
 */
export function checkSequenceOptimization(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const phase of roadmap.phases) {
    const phaseUnits = phase.units;
    for (let i = 0; i < phaseUnits.length - 1; i++) {
      const unitA = phaseUnits[i];
      const unitB = phaseUnits[i + 1];

      const bDependsOnA = unitB.dependencies.includes(unitA.id);
      const aDependsOnB = unitA.dependencies.includes(unitB.id);

      if (!bDependsOnA && !aDependsOnB) {
        gaps.push(makeGap(
          'sequence_errors',
          'MINOR',
          `${unitA.id}, ${unitB.id}`,
          `Units "${unitA.id}" and "${unitB.id}" in phase ${phase.id} have no interdependency and may be parallelizable`,
          'Consider marking these units as parallel-eligible or adding an explicit dependency if order matters',
        ));
      }
    }
  }

  return gaps;
}

// ─── Checker 11: Gate Coverage ───────────────────────────────────

/**
 * Verify every phase has a gate with omega_floor > 0, test_required,
 * and build_required fields set.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for missing or incomplete gates.
 */
export function checkGateCoverage(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const phase of roadmap.phases) {
    if (!phase.gate) {
      gaps.push(makeGap(
        'missing_tests',
        'MAJOR',
        phase.id,
        `Phase "${phase.id}" has no quality gate defined`,
        'Add a gate object with omega_floor, test_required, and build_required',
      ));
      continue;
    }

    if (phase.gate.omega_floor <= 0) {
      gaps.push(makeGap(
        'missing_tests',
        'MINOR',
        phase.id,
        `Phase "${phase.id}" gate has omega_floor <= 0 (${phase.gate.omega_floor})`,
        'Set omega_floor to a positive value (recommended: 0.75 or higher)',
      ));
    }

    if (phase.gate.test_required !== true) {
      gaps.push(makeGap(
        'missing_tests',
        'MINOR',
        phase.id,
        `Phase "${phase.id}" gate does not require tests (test_required is not true)`,
        'Set test_required to true',
      ));
    }

    if (phase.gate.build_required !== true) {
      gaps.push(makeGap(
        'missing_tests',
        'MINOR',
        phase.id,
        `Phase "${phase.id}" gate does not require build (build_required is not true)`,
        'Set build_required to true',
      ));
    }
  }

  return gaps;
}

// ─── Checker 12: Rollback Coverage ───────────────────────────────

/** Generic rollback patterns that are too vague to be actionable. */
const VAGUE_ROLLBACK_PATTERNS: RegExp[] = [
  /^undo\s*everything$/i,
  /^revert$/i,
  /^rollback$/i,
  /^undo$/i,
  /^revert\s*changes$/i,
  /^rollback\s*changes$/i,
];

/**
 * Verify every unit has a specific, actionable rollback instruction.
 * Flags missing rollback fields and vague generic rollbacks.
 *
 * @param roadmap - The roadmap envelope to check.
 * @returns Array of gaps for missing or vague rollback instructions.
 */
export function checkRollbackCoverage(roadmap: Envelope): GapItem[] {
  const gaps: GapItem[] = [];

  for (const unit of allUnits(roadmap)) {
    if (isEmptyOrPlaceholder(unit.rollback)) {
      gaps.push(makeGap(
        'missing_rollback',
        'MAJOR',
        unit.id,
        `Unit "${unit.id}" has no rollback instruction`,
        'Add a specific rollback command like "git checkout -- path/to/file"',
      ));
      continue;
    }

    const trimmed = unit.rollback.trim();
    for (const pattern of VAGUE_ROLLBACK_PATTERNS) {
      if (pattern.test(trimmed)) {
        gaps.push(makeGap(
          'missing_rollback',
          'MINOR',
          unit.id,
          `Unit "${unit.id}" has vague rollback: "${trimmed}"`,
          'Specify exact files or commands, e.g. "git checkout -- src/path/file.ts"',
        ));
        break;
      }
    }
  }

  return gaps;
}

// ─── Scoring ─────────────────────────────────────────────────────

/**
 * Compute a quality score from a list of gaps.
 *
 * Score = max(0, 1.0 - (weighted_sum / total_possible)).
 * Weights: CRITICAL=3, MAJOR=2, MINOR=1, INFO=0.
 * total_possible = max(1, total_units * 12) to prevent division by zero.
 *
 * @param gaps - Array of gaps found.
 * @param unitCount - Total number of units in the roadmap (for normalization).
 * @returns Score clamped to [0, 1].
 */
export function scoreGaps(gaps: GapItem[], unitCount: number): number {
  let weightedSum = 0;
  for (const gap of gaps) {
    if (!gap.resolved) {
      weightedSum += SEVERITY_WEIGHTS[gap.severity] ?? 0;
    }
  }

  const totalPossible = Math.max(1, unitCount * 12);
  const score = Math.max(0, 1.0 - weightedSum / totalPossible);
  return Math.min(1, score);
}

// ─── Auto-Fix ────────────────────────────────────────────────────

/** Categories that can be auto-fixed. */
const AUTO_FIXABLE_CATEGORIES: Set<z.infer<typeof GapCategory>> = new Set([
  'missing_indexing',
]);

/**
 * Deep-clone a roadmap and apply auto-fixable gap resolutions.
 *
 * Currently supports:
 *   - INDEX_FLAGS (missing_indexing): sets the correct boolean flags
 *     on units based on their deliverable content.
 *
 * @param roadmap - The original roadmap (not mutated).
 * @param gaps - All gaps found in the current pass.
 * @returns The patched roadmap clone and the list of applied fixes.
 */
export function autoFixGaps(
  roadmap: Envelope,
  gaps: GapItem[],
): { fixed: Envelope; applied: GapItem[] } {
  const fixed: Envelope = JSON.parse(JSON.stringify(roadmap));
  const applied: GapItem[] = [];

  // Build a unit lookup by ID for quick access
  const unitMap = new Map<string, Unit>();
  for (const phase of fixed.phases) {
    for (const unit of phase.units) {
      unitMap.set(unit.id, unit);
    }
  }

  for (const gap of gaps) {
    if (gap.resolved) continue;
    if (!AUTO_FIXABLE_CATEGORIES.has(gap.category)) continue;

    if (gap.category === 'missing_indexing') {
      const unit = unitMap.get(gap.location);
      if (!unit) continue;

      const desc = gap.description.toLowerCase();
      if (desc.includes('creates_skill')) {
        unit.creates_skill = true;
        gap.resolved = true;
        applied.push(gap);
      } else if (desc.includes('creates_script')) {
        unit.creates_script = true;
        gap.resolved = true;
        applied.push(gap);
      } else if (desc.includes('creates_hook')) {
        unit.creates_hook = true;
        gap.resolved = true;
        applied.push(gap);
      } else if (desc.includes('creates_command')) {
        unit.creates_command = true;
        gap.resolved = true;
        applied.push(gap);
      }
    }
  }

  return { fixed, applied };
}

// ─── Orchestrator ────────────────────────────────────────────────

/**
 * Run all 12 checkers against a roadmap and collect gaps.
 *
 * @param roadmap - The roadmap envelope.
 * @param knownTools - Optional tool prefix overrides.
 * @param knownSkills - Optional skill ID overrides.
 * @returns Combined array of all gaps found.
 */
function runAllCheckers(
  roadmap: Envelope,
  knownTools?: string[],
  knownSkills?: string[],
): GapItem[] {
  return [
    ...checkSchemaCompleteness(roadmap),
    ...checkToolValidity(roadmap, knownTools),
    ...checkSkillValidity(roadmap, knownSkills),
    ...checkDependencyIntegrity(roadmap),
    ...checkRoleModelAlignment(roadmap),
    ...checkExitConditionQuality(roadmap),
    ...checkStepSpecificity(roadmap),
    ...checkDeliverableCoverage(roadmap),
    ...checkIndexFlags(roadmap),
    ...checkSequenceOptimization(roadmap),
    ...checkGateCoverage(roadmap),
    ...checkRollbackCoverage(roadmap),
  ];
}

/**
 * Scrutinize a roadmap using the adaptive improvement loop.
 *
 * The loop runs all 12 checkers, scores the result, auto-fixes what
 * it can, and re-runs until convergence or the max-pass safety cap.
 *
 * Default config:
 *   - pass_mode: "adaptive"
 *   - min_passes: 3
 *   - max_passes: 7
 *   - convergence_rule: "delta < 2"
 *   - improvement_threshold: 0.92
 *
 * Convergence is reached when the gap-count delta between consecutive
 * passes is less than 2, after at least min_passes have run, or when
 * the score exceeds the improvement_threshold.
 *
 * If a CRITICAL gap survives past round 4, it is flagged for human
 * review (escalation).
 *
 * @param roadmap - The roadmap envelope to scrutinize.
 * @param config - Optional partial config overrides.
 * @returns A ScrutinyLog-compatible audit trail.
 */
export function scrutinizeRoadmap(
  roadmap: Envelope,
  config?: Partial<SConfig>,
): SLog {
  resetGapCounter();

  const cfg: SConfig = {
    pass_mode: config?.pass_mode ?? 'adaptive',
    min_passes: config?.min_passes ?? 3,
    max_passes: config?.max_passes ?? 7,
    convergence_rule: config?.convergence_rule ?? 'delta < 2',
    escalation_rule:
      config?.escalation_rule ??
      'if pass 4+ finds CRITICAL, flag for human review',
    scrutinizer_model: config?.scrutinizer_model ?? 'opus-4.6',
    scrutinizer_effort: config?.scrutinizer_effort ?? 90,
    gap_categories: config?.gap_categories ?? [
      'missing_tools', 'missing_deps', 'missing_exit_conditions',
      'missing_rollback', 'sequence_errors', 'role_mismatch',
      'effort_mismatch', 'missing_indexing', 'missing_skills',
      'orphaned_deliverables', 'underspecified_steps', 'missing_tests',
    ],
    improvement_threshold: config?.improvement_threshold ?? 0.92,
  };

  const passes: SPass[] = [];
  let currentRoadmap = roadmap;
  let previousGapCount = Infinity;
  let converged = false;
  const unitCount = totalUnitCount(roadmap);

  for (let passNum = 1; passNum <= cfg.max_passes; passNum++) {
    const startedAt = new Date().toISOString();

    // Reset counter each pass so IDs are pass-relative
    resetGapCounter();

    // Run all checkers
    const gaps = runAllCheckers(currentRoadmap);
    const unresolvedGaps = gaps.filter((g) => !g.resolved);
    const score = scoreGaps(gaps, unitCount);

    // Record this pass
    const pass: SPass = {
      pass_number: passNum,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      gaps_found: gaps,
      score,
      total_checks: unitCount * 12,
      converged: false,
    };

    // Check convergence after min_passes
    const delta = Math.abs(previousGapCount - unresolvedGaps.length);
    if (passNum >= cfg.min_passes) {
      if (delta < 2 || score >= cfg.improvement_threshold) {
        pass.converged = true;
        converged = true;
      }
    }

    passes.push(pass);

    // Escalation: flag CRITICAL gaps surviving past round 4
    if (passNum >= 4) {
      const criticals = unresolvedGaps.filter(
        (g) => g.severity === 'CRITICAL',
      );
      if (criticals.length > 0) {
        // Mark them for escalation by appending note to suggestion
        for (const crit of criticals) {
          if (!crit.suggestion) {
            crit.suggestion = '';
          }
          if (!crit.suggestion.includes('[ESCALATED]')) {
            crit.suggestion = `[ESCALATED] ${crit.suggestion}`;
          }
        }
      }
    }

    if (converged) break;

    // Auto-fix what we can and feed the improved roadmap to next pass
    const { fixed, applied } = autoFixGaps(currentRoadmap, gaps);
    if (applied.length > 0) {
      currentRoadmap = fixed;
      // Mark applied gaps as resolved in this pass
      for (const gap of applied) {
        gap.resolved_in_pass = passNum;
      }
    }

    previousGapCount = unresolvedGaps.length;
  }

  // Collect all unresolved gaps from the final pass
  const finalPass = passes[passes.length - 1];
  const finalScore = finalPass?.score ?? 0;
  const unresolvedGaps = finalPass
    ? finalPass.gaps_found.filter((g) => !g.resolved)
    : [];

  return {
    roadmap_id: roadmap.id,
    passes,
    final_score: finalScore,
    passed: finalScore >= cfg.improvement_threshold && unresolvedGaps.every((g) => g.severity !== 'CRITICAL'),
    unresolved_gaps: unresolvedGaps,
  };
}
