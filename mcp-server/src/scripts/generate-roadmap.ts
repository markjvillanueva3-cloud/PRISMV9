/**
 * PRISM RGS -- Roadmap Generation Pipeline
 *
 * Programmatic entry point for the 7-stage roadmap generation process.
 * Each stage transforms the input progressively from a raw text brief
 * into a fully validated RoadmapEnvelope with markdown output and
 * position tracking.
 *
 * Stages:
 *   1. analyzeBrief       -- parse raw text into a StructuredBrief
 *   2. auditCodebase      -- discover reusable assets (stub for now)
 *   3. estimateScope       -- derive phase/unit counts from complexity
 *   4. decomposePhases    -- build phase skeletons by category
 *   5. populateUnits      -- expand skeletons into full RoadmapPhase[]
 *   6. resolveDependencies -- topological sort, assign sequences
 *   7. formatOutput       -- render markdown + position.json
 *
 * Orchestrator: generateRoadmap() chains all stages and returns a
 * GenerationResult.
 *
 * @module scripts/generate-roadmap
 */

import { z } from 'zod';
import {
  RoadmapEnvelope,
  RoadmapPhase,
  RoadmapUnit,
  RoadmapGate,
  RoleCode,
  ModelSpec,
  DeliverableType,
  createEmptyUnit,
  createEmptyPhase,
  validateRoadmap,
  validateUnit,
  validatePhase,
} from '../schemas/roadmapSchema.js';

// ─── Stage 1 Types ────────────────────────────────────────────────

/** Structured representation of a raw text brief after parsing. */
export interface StructuredBrief {
  goal: string;
  scope: string;
  constraints: string[];
  domain: 'manufacturing' | 'infrastructure' | 'tooling' | 'meta' | 'product';
  urgency: 'low' | 'normal' | 'high' | 'critical';
  complexity: 'S' | 'M' | 'L' | 'XL';
  category:
    | 'new_feature'
    | 'refactor'
    | 'integration'
    | 'infrastructure'
    | 'documentation'
    | 'meta_system';
}

// ─── Stage 2 Types ────────────────────────────────────────────────

/** Audit of existing codebase assets relevant to the brief. */
export interface CodebaseAudit {
  existing_skills: { id: string; relevance: string }[];
  existing_scripts: { name: string; relevance: string }[];
  existing_hooks: { name: string; relevance: string }[];
  related_dispatchers: { name: string; actions: string[] }[];
  related_engines: { name: string; purpose: string }[];
  reusable_patterns: { pattern: string; location: string }[];
}

// ─── Stage 3 Types ────────────────────────────────────────────────

/** Numeric scope estimate derived from complexity + audit. */
export interface ScopeEstimate {
  phases_count: number;
  units_count: number;
  sessions_estimate: string;
  new_skills_needed: number;
  new_scripts_needed: number;
  new_hooks_needed: number;
  files_to_create: number;
  files_to_modify: number;
  estimated_total_tokens: number;
}

// ─── Stage 4 Types ────────────────────────────────────────────────

/** Lightweight skeleton describing a phase before unit expansion. */
export interface PhaseSkeleton {
  id: string;
  title: string;
  description: string;
  sessions: string;
  primary_role: z.infer<typeof RoleCode>;
  primary_model: string;
  dependency_phases: string[];
  unit_hints: string[];
}

// ─── Pipeline Result ──────────────────────────────────────────────

/** Final output of the generation pipeline. */
export interface GenerationResult {
  success: boolean;
  envelope?: z.infer<typeof RoadmapEnvelope>;
  markdown?: string;
  position?: object;
  errors?: string[];
  stage_failed?: number;
}

// ─── Internal Constants ───────────────────────────────────────────

/** Keyword sets for domain classification. */
const DOMAIN_KEYWORDS: Record<StructuredBrief['domain'], string[]> = {
  manufacturing: [
    'cnc', 'machining', 'toolpath', 'g-code', 'gcode', 'speed', 'feed',
    'cutting', 'spindle', 'lathe', 'mill', 'turning', 'drill', 'bore',
    'fixture', 'workholding', 'coolant', 'chip', 'insert', 'carbide',
    'surface finish', 'tolerance', 'roughing', 'finishing', 'cam',
  ],
  meta: [
    'schema', 'pipeline', 'roadmap', 'generation', 'scrutiny', 'rgs',
    'envelope', 'dispatcher', 'engine', 'registry', 'framework',
    'architecture', 'meta', 'system design', 'orchestrat',
  ],
  infrastructure: [
    'deploy', 'ci', 'cd', 'docker', 'server', 'database', 'cloud',
    'monitor', 'logging', 'backup', 'infra', 'devops', 'terraform',
  ],
  tooling: [
    'tool', 'mcp', 'plugin', 'extension', 'cli', 'command', 'hook',
    'skill', 'script', 'utility', 'helper', 'sdk',
  ],
  product: [
    'user', 'feature', 'ui', 'ux', 'dashboard', 'report', 'workflow',
    'notification', 'api', 'endpoint', 'frontend', 'interface',
  ],
};

/** Keyword sets for complexity estimation. */
const COMPLEXITY_SIGNALS: Record<StructuredBrief['complexity'], string[]> = {
  S: ['simple', 'single', 'small', 'quick', 'minor', 'trivial', 'one file', 'patch'],
  M: ['multi', 'several', 'moderate', 'component', 'module', 'add', 'extend'],
  L: ['system', 'large', 'overhaul', 'redesign', 'cross-cutting', 'wide', 'many'],
  XL: ['platform', 'entire', 'complete', 'full rewrite', 'all modules', 'ecosystem'],
};

/** Keyword sets for category classification. */
const CATEGORY_KEYWORDS: Record<StructuredBrief['category'], string[]> = {
  meta_system: ['roadmap', 'pipeline', 'schema', 'generation', 'scrutiny', 'rgs', 'meta'],
  refactor: ['refactor', 'clean', 'reorganize', 'restructure', 'simplify', 'migrate'],
  integration: ['integrate', 'connect', 'bridge', 'sync', 'import', 'export', 'adapter'],
  infrastructure: ['deploy', 'ci', 'cd', 'infra', 'monitor', 'docker', 'cloud'],
  documentation: ['doc', 'readme', 'guide', 'tutorial', 'wiki', 'reference'],
  new_feature: ['new', 'create', 'build', 'implement', 'add', 'feature', 'develop'],
};

/** Role matrix: code -> human-readable name, default model, effort. */
const ROLE_MATRIX: Record<
  z.infer<typeof RoleCode>,
  { name: string; model: string; effort: number }
> = {
  R1: { name: 'Architect', model: 'opus-4.6', effort: 95 },
  R2: { name: 'Implementer', model: 'sonnet-4.6', effort: 80 },
  R3: { name: 'Tester', model: 'sonnet-4.6', effort: 75 },
  R4: { name: 'Reviewer', model: 'opus-4.6', effort: 90 },
  R5: { name: 'DevOps', model: 'sonnet-4.6', effort: 80 },
  R6: { name: 'Doc Writer', model: 'haiku-3.6', effort: 60 },
  R7: { name: 'Scrutinizer', model: 'opus-4.6', effort: 95 },
  R8: { name: 'Coordinator', model: 'opus-4.6', effort: 85 },
};

/** Phase templates per category. Each entry: [suffix, title, role, description prefix]. */
const PHASE_TEMPLATES: Record<
  StructuredBrief['category'],
  [string, string, z.infer<typeof RoleCode>, string][]
> = {
  meta_system: [
    ['schema', 'Schema Definition', 'R1', 'Define schemas and data structures'],
    ['impl', 'Core Implementation', 'R2', 'Implement core logic and pipeline stages'],
    ['test', 'Testing and Validation', 'R3', 'Write tests and validate behavior'],
    ['integ', 'Integration and Wiring', 'R2', 'Wire into existing systems and registries'],
  ],
  new_feature: [
    ['design', 'Design', 'R1', 'Architect the feature and define interfaces'],
    ['impl', 'Implementation', 'R2', 'Build the feature components'],
    ['test', 'Testing', 'R3', 'Validate feature behavior with tests'],
    ['integ', 'Integration', 'R2', 'Integrate feature into the platform'],
  ],
  refactor: [
    ['audit', 'Audit', 'R4', 'Audit existing code and identify targets'],
    ['refactor', 'Refactoring', 'R2', 'Apply refactoring transformations'],
    ['valid', 'Validation', 'R3', 'Verify behavior preservation'],
  ],
  integration: [
    ['design', 'Integration Design', 'R1', 'Design integration points and adapters'],
    ['impl', 'Adapter Implementation', 'R2', 'Build adapters and bridges'],
    ['test', 'Integration Testing', 'R3', 'End-to-end integration tests'],
  ],
  infrastructure: [
    ['plan', 'Infrastructure Planning', 'R5', 'Plan infrastructure changes'],
    ['impl', 'Infrastructure Implementation', 'R5', 'Apply infrastructure changes'],
    ['valid', 'Smoke Testing', 'R3', 'Validate infrastructure works end-to-end'],
  ],
  documentation: [
    ['audit', 'Content Audit', 'R6', 'Audit existing documentation gaps'],
    ['write', 'Documentation Writing', 'R6', 'Write and structure documentation'],
    ['review', 'Review', 'R4', 'Review documentation for accuracy and clarity'],
  ],
};

// ─── Stage 1: Analyze Brief ───────────────────────────────────────

/**
 * Parse a raw text brief into a StructuredBrief.
 *
 * Extracts goal, scope, and constraints from the text. Classifies
 * domain, complexity, urgency, and category using keyword matching.
 *
 * @param brief - Raw text brief (must be >= 10 characters).
 * @returns Parsed StructuredBrief.
 * @throws Error if brief is shorter than 10 characters.
 */
export function analyzeBrief(brief: string): StructuredBrief {
  if (brief.length < 10) {
    throw new Error(
      `Brief too short (${brief.length} chars). Minimum 10 characters required.`,
    );
  }

  const lower = brief.toLowerCase();
  const sentences = brief
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Goal: first sentence or first 200 chars
  const goal = sentences[0] ?? brief.slice(0, 200);

  // Scope: second sentence or repeat goal
  const scope = sentences[1] ?? goal;

  // Constraints: lines starting with "- " or "* " or containing "must", "require", "constraint"
  const constraints: string[] = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      /\b(must|require|constraint|limit|cannot|should not)\b/i.test(trimmed)
    ) {
      constraints.push(trimmed);
    }
  }

  // Domain classification: score each domain by keyword hits
  const domain = classifyByKeywords(lower, DOMAIN_KEYWORDS, 'manufacturing');

  // Complexity estimation
  const complexity = classifyByKeywords(lower, COMPLEXITY_SIGNALS, 'M');

  // Category classification
  const category = classifyByKeywords(lower, CATEGORY_KEYWORDS, 'new_feature');

  // Urgency: keyword-based
  let urgency: StructuredBrief['urgency'] = 'normal';
  if (/\b(critical|urgent|asap|emergency|blocking)\b/i.test(lower)) {
    urgency = 'critical';
  } else if (/\b(high priority|important|soon|needed)\b/i.test(lower)) {
    urgency = 'high';
  } else if (/\b(low priority|whenever|nice to have|optional)\b/i.test(lower)) {
    urgency = 'low';
  }

  return { goal, scope, constraints, domain, urgency, complexity, category };
}

/**
 * Score each key in a keyword map against the input text and return
 * the key with the highest hit count, or the fallback if no hits.
 */
function classifyByKeywords<T extends string>(
  text: string,
  keywordMap: Record<T, string[]>,
  fallback: T,
): T {
  let best: T = fallback;
  let bestScore = 0;

  for (const key of Object.keys(keywordMap) as T[]) {
    let score = 0;
    for (const kw of keywordMap[key]) {
      if (text.includes(kw)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }

  return best;
}

// ─── Stage 2: Audit Codebase ──────────────────────────────────────

/**
 * Audit the existing codebase for assets relevant to the brief.
 *
 * TODO: This is a placeholder. In production this will invoke
 * prism_skill_script:skill_search and file-system scanning via MCP
 * tool calls to discover existing skills, scripts, hooks, dispatchers,
 * engines, and reusable patterns.
 *
 * @param _brief - The structured brief (unused in stub).
 * @returns A CodebaseAudit with empty arrays.
 */
export function auditCodebase(_brief: StructuredBrief): CodebaseAudit {
  // TODO: Enhance to actually search the codebase via prism_skill_script:skill_search
  // and Desktop Commander file search. This stub returns empty arrays because actual
  // codebase search requires MCP tool calls at runtime.
  return {
    existing_skills: [],
    existing_scripts: [],
    existing_hooks: [],
    related_dispatchers: [],
    related_engines: [],
    reusable_patterns: [],
  };
}

// ─── Stage 3: Estimate Scope ──────────────────────────────────────

/** Complexity -> numeric range mapping. */
const SCOPE_RANGES: Record<
  StructuredBrief['complexity'],
  { phasesMin: number; phasesMax: number; unitsMin: number; unitsMax: number }
> = {
  S: { phasesMin: 1, phasesMax: 2, unitsMin: 3, unitsMax: 8 },
  M: { phasesMin: 3, phasesMax: 4, unitsMin: 8, unitsMax: 20 },
  L: { phasesMin: 5, phasesMax: 7, unitsMin: 20, unitsMax: 40 },
  XL: { phasesMin: 8, phasesMax: 12, unitsMin: 40, unitsMax: 80 },
};

/**
 * Estimate the scope of a roadmap from the brief and audit.
 *
 * Maps complexity to phase/unit count ranges, reduces unit count by
 * reusable asset count from the audit, and estimates token cost.
 *
 * @param brief - The structured brief.
 * @param audit - The codebase audit.
 * @returns A ScopeEstimate.
 */
export function estimateScope(
  brief: StructuredBrief,
  audit: CodebaseAudit,
): ScopeEstimate {
  const range = SCOPE_RANGES[brief.complexity];

  // Use midpoint of range as baseline
  let phasesCount = Math.round((range.phasesMin + range.phasesMax) / 2);
  let unitsCount = Math.round((range.unitsMin + range.unitsMax) / 2);

  // Reduce unit count by number of reusable assets found in audit
  const reusableCount =
    audit.existing_skills.length +
    audit.existing_scripts.length +
    audit.existing_hooks.length +
    audit.reusable_patterns.length;
  unitsCount = Math.max(range.unitsMin, unitsCount - reusableCount);

  // Clamp to valid ranges
  phasesCount = clamp(phasesCount, 1, 15);
  unitsCount = clamp(unitsCount, 1, 100);

  // Session estimate: roughly 1 session per 3-5 units
  const sessionsMin = Math.max(1, Math.ceil(unitsCount / 5));
  const sessionsMax = Math.max(sessionsMin, Math.ceil(unitsCount / 3));
  const sessionsEstimate =
    sessionsMin === sessionsMax
      ? `${sessionsMin}`
      : `${sessionsMin}-${sessionsMax}`;

  // Token estimate: 500 tokens base per unit
  const estimatedTotalTokens = unitsCount * 500;

  // Estimate new assets needed (heuristic based on complexity)
  const complexityMultiplier =
    brief.complexity === 'S'
      ? 0.5
      : brief.complexity === 'M'
        ? 1
        : brief.complexity === 'L'
          ? 1.5
          : 2;
  const newSkillsNeeded = Math.round(
    Math.max(0, 2 * complexityMultiplier - audit.existing_skills.length),
  );
  const newScriptsNeeded = Math.round(
    Math.max(0, 2 * complexityMultiplier - audit.existing_scripts.length),
  );
  const newHooksNeeded = Math.round(
    Math.max(0, 1 * complexityMultiplier - audit.existing_hooks.length),
  );

  return {
    phases_count: phasesCount,
    units_count: unitsCount,
    sessions_estimate: sessionsEstimate,
    new_skills_needed: newSkillsNeeded,
    new_scripts_needed: newScriptsNeeded,
    new_hooks_needed: newHooksNeeded,
    files_to_create: Math.round(unitsCount * 0.8),
    files_to_modify: Math.round(unitsCount * 0.4),
    estimated_total_tokens: estimatedTotalTokens,
  };
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Stage 4: Decompose Phases ────────────────────────────────────

/**
 * Create phase skeletons based on the brief category and scope estimate.
 *
 * Selects a template set based on category, then scales the number of
 * phases to match the scope estimate. Each skeleton includes dependency
 * chains and unit hints.
 *
 * @param brief - The structured brief.
 * @param scope - The scope estimate.
 * @returns Array of PhaseSkeleton objects.
 */
export function decomposePhases(
  brief: StructuredBrief,
  scope: ScopeEstimate,
): PhaseSkeleton[] {
  const templates = PHASE_TEMPLATES[brief.category];
  const skeletons: PhaseSkeleton[] = [];

  // Distribute units across phases
  const unitsPerPhase = Math.max(
    1,
    Math.round(scope.units_count / templates.length),
  );

  for (let i = 0; i < templates.length; i++) {
    const [suffix, title, role, descPrefix] = templates[i];
    const phaseId = `P${i + 1}`;
    const roleInfo = ROLE_MATRIX[role];

    // Build unit hints: generic descriptions for what units in this phase do
    const hintCount = i === templates.length - 1
      ? scope.units_count - unitsPerPhase * (templates.length - 1)
      : unitsPerPhase;
    const unitHints: string[] = [];
    for (let u = 0; u < Math.max(1, hintCount); u++) {
      unitHints.push(`${title} task ${u + 1}`);
    }

    // Dependencies: each phase depends on the previous one (linear chain)
    const dependencyPhases: string[] = [];
    if (i > 0) {
      dependencyPhases.push(`P${i}`);
    }

    // Sessions: scale with unit count
    const phaseSessions = Math.max(1, Math.ceil(hintCount / 4));
    const sessionsStr =
      phaseSessions <= 1
        ? '1'
        : `${Math.ceil(phaseSessions / 2)}-${phaseSessions}`;

    skeletons.push({
      id: phaseId,
      title: `${title}`,
      description: `${descPrefix} for: ${brief.goal}`,
      sessions: sessionsStr,
      primary_role: role,
      primary_model: roleInfo.model,
      dependency_phases: dependencyPhases,
      unit_hints: unitHints,
    });
  }

  return skeletons;
}

// ─── Stage 5: Populate Units ──────────────────────────────────────

/**
 * Expand PhaseSkeleton[] into fully populated RoadmapPhase[].
 *
 * For each skeleton, creates RoadmapUnit objects from unit_hints,
 * assigns roles from the role matrix, and attaches quality gates.
 * The actual step-level content is left as a framework for the AI
 * to fill at generation time.
 *
 * @param phases - Array of phase skeletons.
 * @param _audit - Codebase audit (reserved for future asset injection).
 * @returns Array of validated RoadmapPhase objects.
 */
export function populateUnits(
  phases: PhaseSkeleton[],
  _audit: CodebaseAudit,
): z.infer<typeof RoadmapPhase>[] {
  const result: z.infer<typeof RoadmapPhase>[] = [];

  for (const skeleton of phases) {
    const roleInfo = ROLE_MATRIX[skeleton.primary_role];

    // Build units from hints
    const units: z.infer<typeof RoadmapUnit>[] = skeleton.unit_hints.map(
      (hint, idx) => {
        const unitId = `${skeleton.id}-U${String(idx + 1).padStart(2, '0')}`;
        const unit = createEmptyUnit(unitId, hint, skeleton.id, idx);

        // Apply role from phase
        unit.role = skeleton.primary_role;
        unit.role_name = roleInfo.name;
        unit.model = skeleton.primary_model;
        unit.effort = roleInfo.effort;

        // Add default entry/exit conditions
        unit.entry_conditions = [
          idx === 0
            ? `Phase ${skeleton.id} preconditions met`
            : `${skeleton.id}-U${String(idx).padStart(2, '0')} completed`,
        ];
        unit.exit_conditions = [
          `${hint} completed and verified`,
          'No regressions introduced',
        ];

        // Add intra-phase dependency (linear within phase)
        if (idx > 0) {
          unit.dependencies = [
            `${skeleton.id}-U${String(idx).padStart(2, '0')}`,
          ];
        }

        return unit;
      },
    );

    // Build gate for this phase
    const gate: z.infer<typeof RoadmapGate> = {
      omega_floor: 0.75,
      safety_floor: 0.70,
      ralph_required: false,
      ralph_grade_floor: 'B',
      anti_regression: true,
      test_required: true,
      build_required: true,
      checkpoint: true,
      learning_save: true,
      custom_checks: [],
    };

    result.push({
      id: skeleton.id,
      title: skeleton.title,
      description: skeleton.description,
      sessions: skeleton.sessions,
      primary_role: skeleton.primary_role,
      primary_model: skeleton.primary_model,
      units,
      gate,
      scrutiny_checkpoint: false,
      scrutiny_focus: [],
    });
  }

  return result;
}

// ─── Stage 6: Resolve Dependencies ───────────────────────────────

/**
 * Validate and finalize dependency ordering across all phases.
 *
 * Performs a topological sort on phase dependencies to detect circular
 * references, then assigns final sequence numbers to every unit.
 *
 * @param phases - Array of RoadmapPhase objects.
 * @returns The same phases with updated unit sequence numbers.
 * @throws Error if circular dependencies are detected.
 */
export function resolveDependencies(
  phases: z.infer<typeof RoadmapPhase>[],
): z.infer<typeof RoadmapPhase>[] {
  // Build adjacency list from unit dependencies
  const allUnitIds = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const phase of phases) {
    for (const unit of phase.units) {
      allUnitIds.add(unit.id);
      adjacency.set(unit.id, [...unit.dependencies]);
    }
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  for (const id of allUnitIds) {
    inDegree.set(id, 0);
  }
  for (const [, deps] of adjacency) {
    for (const dep of deps) {
      if (inDegree.has(dep)) {
        // dep is depended-upon by someone; that doesn't increase dep's in-degree
        // We need to track: for each node, how many arrows point INTO it
      }
    }
  }
  // Recompute: in-degree[X] = number of units that X depends on? No.
  // In-degree[X] = number of units that list X as a dependency (X must finish first).
  // Actually for topological sort: edge from A -> B means A must come before B.
  // If unit B has dependency A, then edge is A -> B, so in-degree of B increases.
  for (const id of allUnitIds) {
    inDegree.set(id, 0);
  }
  for (const [unitId, deps] of adjacency) {
    // unitId depends on each dep -> edge from dep to unitId
    inDegree.set(unitId, deps.filter((d) => allUnitIds.has(d)).length);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // Find units that depend on current and decrease their in-degree
    for (const [unitId, deps] of adjacency) {
      if (deps.includes(current)) {
        const newDeg = (inDegree.get(unitId) ?? 1) - 1;
        inDegree.set(unitId, newDeg);
        if (newDeg === 0) {
          queue.push(unitId);
        }
      }
    }
  }

  if (sorted.length !== allUnitIds.size) {
    const unsorted = [...allUnitIds].filter((id) => !sorted.includes(id));
    throw new Error(
      `Circular dependency detected among units: ${unsorted.join(', ')}`,
    );
  }

  // Assign global sequence numbers based on topological order
  const sequenceMap = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    sequenceMap.set(sorted[i], i);
  }

  // Update unit sequences
  for (const phase of phases) {
    for (const unit of phase.units) {
      const seq = sequenceMap.get(unit.id);
      if (seq !== undefined) {
        unit.sequence = seq;
      }
    }
  }

  return phases;
}

// ─── Stage 7: Format Output ──────────────────────────────────────

/**
 * Render a RoadmapEnvelope as markdown and generate a position.json object.
 *
 * The markdown follows the PRISM exemplar format with header, deliverables
 * table, role matrix, tool map, dependency graph, and detailed phase/unit
 * sections.
 *
 * @param envelope - The validated RoadmapEnvelope.
 * @returns Object with markdown string and position object.
 */
export function formatOutput(
  envelope: z.infer<typeof RoadmapEnvelope>,
): { markdown: string; position: object } {
  const lines: string[] = [];

  // ── Header ──
  lines.push(`# ${envelope.title}`);
  lines.push('');
  lines.push(`**ID:** ${envelope.id}`);
  lines.push(`**Version:** ${envelope.version}`);
  lines.push(`**Created:** ${envelope.created_at}`);
  lines.push(`**Created by:** ${envelope.created_by}`);
  lines.push(`**Total units:** ${envelope.total_units}`);
  lines.push(`**Estimated sessions:** ${envelope.total_sessions}`);
  lines.push('');
  lines.push('## Brief');
  lines.push('');
  lines.push(envelope.brief);
  lines.push('');

  // ── Role Matrix ──
  if (envelope.role_matrix.length > 0) {
    lines.push('## Role Matrix');
    lines.push('');
    lines.push('| Code | Name | Model | Effort |');
    lines.push('|------|------|-------|--------|');
    for (const role of envelope.role_matrix) {
      lines.push(
        `| ${role.code} | ${role.name} | ${role.model} | ${role.effort} |`,
      );
    }
    lines.push('');
  }

  // ── Tool Map ──
  if (envelope.tool_map.length > 0) {
    lines.push('## Tool Map');
    lines.push('');
    lines.push('| Tool | Phases | Purpose |');
    lines.push('|------|--------|---------|');
    for (const entry of envelope.tool_map) {
      lines.push(
        `| ${entry.tool} | ${entry.phases.join(', ')} | ${entry.purpose ?? ''} |`,
      );
    }
    lines.push('');
  }

  // ── Dependency Graph ──
  if (envelope.dependency_graph) {
    lines.push('## Dependency Graph');
    lines.push('');
    lines.push('```');
    lines.push(envelope.dependency_graph);
    lines.push('```');
    lines.push('');
  }

  // ── Deliverables Index ──
  if (envelope.deliverables_index.length > 0) {
    lines.push('## Deliverables');
    lines.push('');
    lines.push('| Path | Type | Description |');
    lines.push('|------|------|-------------|');
    for (const d of envelope.deliverables_index) {
      lines.push(`| ${d.path} | ${d.type} | ${d.description} |`);
    }
    lines.push('');
  }

  // ── Phases ──
  for (const phase of envelope.phases) {
    lines.push(`## Phase ${phase.id}: ${phase.title}`);
    lines.push('');
    lines.push(`> ${phase.description}`);
    lines.push('');
    lines.push(`- **Sessions:** ${phase.sessions}`);
    lines.push(`- **Primary role:** ${phase.primary_role}`);
    lines.push(`- **Primary model:** ${phase.primary_model}`);
    lines.push('');

    for (const unit of phase.units) {
      lines.push(`### ${unit.id}: ${unit.title}`);
      lines.push('');
      lines.push(`- **Role:** ${unit.role} (${unit.role_name})`);
      lines.push(`- **Model:** ${unit.model}`);
      lines.push(`- **Effort:** ${unit.effort}`);
      lines.push(`- **Sequence:** ${unit.sequence}`);

      if (unit.dependencies.length > 0) {
        lines.push(`- **Dependencies:** ${unit.dependencies.join(', ')}`);
      }

      if (unit.entry_conditions.length > 0) {
        lines.push('');
        lines.push('**Entry conditions:**');
        for (const cond of unit.entry_conditions) {
          lines.push(`- [ ] ${cond}`);
        }
      }

      if (unit.steps.length > 0) {
        lines.push('');
        lines.push('**Steps:**');
        for (const step of unit.steps) {
          lines.push(`${step.number}. ${step.instruction}`);
        }
      }

      if (unit.exit_conditions.length > 0) {
        lines.push('');
        lines.push('**Exit conditions:**');
        for (const cond of unit.exit_conditions) {
          lines.push(`- [ ] ${cond}`);
        }
      }

      if (unit.deliverables.length > 0) {
        lines.push('');
        lines.push('**Deliverables:**');
        for (const d of unit.deliverables) {
          lines.push(`- \`${d.path}\` (${d.type}): ${d.description}`);
        }
      }

      lines.push('');
    }

    // Gate summary
    lines.push(`### Gate: ${phase.id}`);
    lines.push('');
    lines.push(`- Omega floor: ${phase.gate.omega_floor}`);
    lines.push(`- Safety floor: ${phase.gate.safety_floor}`);
    lines.push(`- Test required: ${phase.gate.test_required}`);
    lines.push(`- Build required: ${phase.gate.build_required}`);
    lines.push(`- Anti-regression: ${phase.gate.anti_regression}`);
    lines.push('');
  }

  // ── Position object ──
  const firstPhase = envelope.phases[0];
  const firstUnit = firstPhase?.units[0];

  const position = {
    roadmap_id: envelope.id,
    current_phase: firstPhase?.id ?? 'P1',
    current_unit: firstUnit?.id ?? 'P1-U01',
    status: 'not_started',
    completed_units: [] as string[],
    skipped_units: [] as string[],
    started_at: null as string | null,
    last_updated: new Date().toISOString(),
  };

  return {
    markdown: lines.join('\n'),
    position,
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────

/**
 * Orchestrate the full 7-stage roadmap generation pipeline.
 *
 * Runs each stage sequentially, catches errors at each stage, and
 * returns a GenerationResult indicating success or failure with the
 * stage number where the error occurred.
 *
 * @param brief - Raw text brief describing what to build.
 * @returns GenerationResult with envelope, markdown, position, or errors.
 */
export function generateRoadmap(brief: string): GenerationResult {
  const errors: string[] = [];

  // Stage 1: Analyze brief
  let structured: StructuredBrief;
  try {
    structured = analyzeBrief(brief);
  } catch (err) {
    return {
      success: false,
      errors: [`Stage 1 (analyzeBrief): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 1,
    };
  }

  // Stage 2: Audit codebase
  let audit: CodebaseAudit;
  try {
    audit = auditCodebase(structured);
  } catch (err) {
    return {
      success: false,
      errors: [`Stage 2 (auditCodebase): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 2,
    };
  }

  // Stage 3: Estimate scope
  let scope: ScopeEstimate;
  try {
    scope = estimateScope(structured, audit);
  } catch (err) {
    return {
      success: false,
      errors: [`Stage 3 (estimateScope): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 3,
    };
  }

  // Stage 4: Decompose phases
  let skeletons: PhaseSkeleton[];
  try {
    skeletons = decomposePhases(structured, scope);
  } catch (err) {
    return {
      success: false,
      errors: [`Stage 4 (decomposePhases): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 4,
    };
  }

  // Stage 5: Populate units
  let populatedPhases: z.infer<typeof RoadmapPhase>[];
  try {
    populatedPhases = populateUnits(skeletons, audit);
  } catch (err) {
    return {
      success: false,
      errors: [`Stage 5 (populateUnits): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 5,
    };
  }

  // Stage 6: Resolve dependencies
  let resolvedPhases: z.infer<typeof RoadmapPhase>[];
  try {
    resolvedPhases = resolveDependencies(populatedPhases);
  } catch (err) {
    return {
      success: false,
      errors: [`Stage 6 (resolveDependencies): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 6,
    };
  }

  // Assemble envelope
  const totalUnits = resolvedPhases.reduce(
    (sum, phase) => sum + phase.units.length,
    0,
  );

  // Build role matrix from used roles
  const usedRoles = new Set<z.infer<typeof RoleCode>>();
  for (const phase of resolvedPhases) {
    usedRoles.add(phase.primary_role);
    for (const unit of phase.units) {
      usedRoles.add(unit.role);
    }
  }
  const roleMatrix = [...usedRoles].sort().map((code) => ({
    code,
    name: ROLE_MATRIX[code].name,
    model: ROLE_MATRIX[code].model,
    effort: ROLE_MATRIX[code].effort,
  }));

  // Build dependency graph (ASCII)
  const depLines: string[] = [];
  for (let i = 0; i < resolvedPhases.length; i++) {
    const phase = resolvedPhases[i];
    const arrow = i < resolvedPhases.length - 1 ? ' -->' : '';
    depLines.push(`[${phase.id}: ${phase.title}]${arrow}`);
  }
  const dependencyGraph = depLines.join(' ');

  // Collect all deliverables
  const deliverablesIndex: z.infer<typeof RoadmapEnvelope>['deliverables_index'] = [];
  for (const phase of resolvedPhases) {
    for (const unit of phase.units) {
      for (const d of unit.deliverables) {
        deliverablesIndex.push(d);
      }
    }
  }

  const envelope: z.infer<typeof RoadmapEnvelope> = {
    id: `RM-${Date.now()}`,
    version: '1.0.0',
    title: structured.goal.slice(0, 100),
    brief,
    created_at: new Date().toISOString(),
    created_by: 'claude-opus-4.6',
    phases: resolvedPhases,
    total_units: totalUnits,
    total_sessions: scope.sessions_estimate,
    dependency_graph: dependencyGraph,
    role_matrix: roleMatrix,
    tool_map: [],
    deliverables_index: deliverablesIndex,
    existing_leverage: [],
    scrutiny_config: {
      pass_mode: 'adaptive',
      min_passes: 3,
      max_passes: 7,
      convergence_rule: 'delta < 2',
      escalation_rule: 'if pass 4+ finds CRITICAL, flag for human review',
      scrutinizer_model: 'opus-4.6',
      scrutinizer_effort: 90,
      gap_categories: [
        'missing_tools',
        'missing_deps',
        'missing_exit_conditions',
        'missing_rollback',
        'sequence_errors',
        'role_mismatch',
        'effort_mismatch',
        'missing_indexing',
        'missing_skills',
        'orphaned_deliverables',
        'underspecified_steps',
        'missing_tests',
      ],
      improvement_threshold: 0.92,
    },
  };

  // Validate envelope against schema
  const validation = validateRoadmap(envelope);
  if (!validation.success) {
    const zodErrors = validation.error?.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    ) ?? ['Unknown validation error'];
    errors.push(...zodErrors);
    return {
      success: false,
      envelope,
      errors: [`Stage 7 (validation): ${errors.join('; ')}`],
      stage_failed: 7,
    };
  }

  // Stage 7: Format output
  let markdown: string;
  let position: object;
  try {
    const output = formatOutput(envelope);
    markdown = output.markdown;
    position = output.position;
  } catch (err) {
    return {
      success: false,
      envelope,
      errors: [`Stage 7 (formatOutput): ${err instanceof Error ? err.message : String(err)}`],
      stage_failed: 7,
    };
  }

  return {
    success: true,
    envelope,
    markdown,
    position,
    errors: errors.length > 0 ? errors : undefined,
  };
}
