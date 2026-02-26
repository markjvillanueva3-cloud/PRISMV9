// add_ideas_to_roadmap.js — Insert 8 ideas from Ideas.md into roadmap v18.1
const fs = require('fs');
const filePath = 'C:\\PRISM\\mcp-server\\data\\docs\\roadmap\\PRISM_ROADMAP_v18.1.md';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find insertion points by searching for specific markers
function findLine(pattern, afterLine = 0) {
  for (let i = afterLine; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

const insertions = [];

// ═══════════════════════════════════════════════════
// IDEA 1: Superpowers/Ralph Plugin Audit → R2-MS5
// Insert after R2 Summary table, before the --- separator
// ═══════════════════════════════════════════════════
const r2SummaryEnd = findLine('| **TOTAL** | Chat 60% / Code 40%');
if (r2SummaryEnd > -1) {
  insertions.push({
    line: r2SummaryEnd + 2, // after the empty line following the table
    text: `
### MS5: Skill & Plugin Audit (CODE — Post Phase Gate)
**Target: Strip redundant skills, identify Claude Code plugin overlaps**

#### MS5-T1: Audit Superpowers Skill for Plugin Overlap
\`\`\`
TASK: MS5-T1
  DEPENDS_ON: [MS4-T3]
  EXECUTOR: Code | ARCHETYPE: verifier | MODEL: haiku | EFFORT: LIGHT
  GATE: YOLO | ESTIMATED_CALLS: 8
  LAYER: 2
  READS_FROM: [C:\\PRISM\\skills-consolidated\\prism-sp-*\\SKILL.md, C:\\PRISM\\skills-consolidated\\prism-code-*\\SKILL.md]
  WRITES_TO: [state/SKILL_AUDIT.md]
  PROVIDES: [Audit report identifying redundant vs essential skills → leaner skill set for R3+]
  SKILL_LOAD: [prism-skill-activation, prism-skill-orchestrator]
\`\`\`
**Step-by-step:**
1. Read all prism-sp-* skills (brainstorm, debugging, execution, planning, review, handoff, verification)
2. Read all prism-code-* skills (code-master, code-perfection, code-quality, code-safety, code-review-checklist)
3. For each skill: identify what Claude Code provides natively (LSP, linting, code nav, git)
4. Flag: KEEP (PRISM-specific), STRIP (covered by Claude Code), MERGE (partial overlap)
5. Write SKILL_AUDIT.md with recommendations
6. Do NOT modify skills yet — audit only
**BASH:** \`npx tsx scripts/r2/audit-skills.ts\`

#### MS5-T2: Audit Ralph Loop for Claude Code Integration
\`\`\`
TASK: MS5-T2
  DEPENDS_ON: [MS5-T1]
  EXECUTOR: Chat | MODEL: opus | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 5
  LAYER: 2
  READS_FROM: [src/engines/RalphEngine.ts, state/SKILL_AUDIT.md]
  WRITES_TO: [state/RALPH_AUDIT.md]
  PROVIDES: [Decision on ralph_loop vs Claude Code native validation → R3 validation strategy]
  SKILL_LOAD: [prism-skill-activation, prism-skill-orchestrator]
\`\`\`
**Step-by-step:**
1. Identify what ralph_loop does: iterative validation via Claude API (SCRUTINIZE→IMPROVE→VALIDATE→ASSESS)
2. Check if Claude Code plugins offer equivalent iterative quality loops
3. If no equivalent: KEEP ralph_loop, document why
4. If partial: identify which phases can use native, which need ralph
5. Write RALPH_AUDIT.md with decision
`
  });
}

// ═══════════════════════════════════════════════════
// IDEA 2: design_session action + Server-side inference chains → R3
// Insert after R3's MS3 (batch validation), before MS4
// ═══════════════════════════════════════════════════
const r3ms4 = findLine('### MS4: Build Gate', findLine('## 9. R3'));
if (r3ms4 > -1) {
  insertions.push({
    line: r3ms4,
    text: `### MS3.5: Server-Side Intelligence Patterns (CODE + CHAT)
**Target: Reduce context consumption by moving multi-step reasoning server-side**

#### MS3.5-T1: Design Session Dispatcher Action
\`\`\`
TASK: MS3.5-T1
  DEPENDS_ON: [MS1-T3]
  EXECUTOR: Chat | MODEL: opus | EFFORT: NOVEL
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 4
  READS_FROM: [src/tools/dispatchers/devDispatcher.ts]
  WRITES_TO: [state/DESIGN_SESSION_SPEC.md]
  PROVIDES: [Spec for design_session action → MS3.5-T2 implementation]
  SKILL_LOAD: [prism-architecture-decisions, prism-design-patterns, prism-orchestration]
\`\`\`
**Step-by-step:**
1. Design \`prism_dev→design_session\` action that loads planning context via MCP
2. Accepts: phase, topic, constraints — returns structured planning context
3. Writes decisions to state files, tracks reasoning chain
4. Integrates with /project:roadmap command for Claude Code usage
5. Spec includes: input schema, output schema, state file format

#### MS3.5-T2: Implement Server-Side Inference Chains
\`\`\`
TASK: MS3.5-T2
  DEPENDS_ON: [MS3.5-T1, MS0-T3]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 4
  READS_FROM: [state/DESIGN_SESSION_SPEC.md, src/engines/AgentExecutor.ts]
  WRITES_TO: [src/engines/InferenceChainEngine.ts (NEW)]
  PROVIDES: [Server-side multi-step reasoning → compound actions use this internally]
  SKILL_LOAD: [prism-orchestration, prism-async-patterns, prism-design-patterns]
\`\`\`
**Step-by-step:**
1. Create InferenceChainEngine.ts — orchestrates multi-step reasoning server-side
2. Uses Claude API (already configured) for internal reasoning without context consumption
3. Pattern: action receives query → engine calls API 2-3 times internally → returns summary
4. Wire into IntelligenceEngine for job_plan, what_if, failure_diagnose (complex actions)
5. Add response_level support — chain results stay server-side unless 'full' requested
6. Safety: all internal API calls logged to state/inference-logs/
**BASH:** \`npm run build:fast && npx tsx tests/r3/intelligence-tests.ts\`

`
  });
}

// ═══════════════════════════════════════════════════
// IDEA 3: DB Integrity Monitoring → R4 (Enterprise)
// Insert before R4's MS4 (Build Gate)
// ═══════════════════════════════════════════════════
const r4ms4 = findLine('### MS4:', findLine('## 10. R4'));
if (r4ms4 > -1) {
  insertions.push({
    line: r4ms4,
    text: `### MS3.5: Database Integrity Monitoring
**Target: Continuous validation of registry data quality**

#### MS3.5-T1: Registry Integrity Engine
\`\`\`
TASK: MS3.5-T1
  DEPENDS_ON: [MS2-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 6
  READS_FROM: [data/materials/, data/machines/, data/tools/, data/alarms/]
  WRITES_TO: [src/engines/IntegrityEngine.ts (NEW), state/integrity/]
  PROVIDES: [Automated data quality checks → L9 pipeline validation, L12 ML clean data]
  SKILL_LOAD: [prism-material-validator, prism-material-schema, prism-validation-unified]
\`\`\`
**Step-by-step:**
1. Create IntegrityEngine.ts — validates all 4 registries continuously
2. Checks: referential integrity (toolpath→material+tool refs valid), schema compliance,
   statistical outliers (kc1.1 values >3σ from ISO group mean), coverage gaps
3. Runs as \`prism_validate→registry_integrity\` action
4. Outputs: integrity score per registry, flagged entries, coverage gaps
5. Wire into session_boot for automatic daily digest
**BASH:** \`npm run build:fast && npm run test:critical\`

`
  });
}

// ═══════════════════════════════════════════════════
// IDEA 4: Semantic Caching + Differential State Sync → R6 (Production)
// Insert before R6's MS4 (Build Gate)
// ═══════════════════════════════════════════════════
const r6ms4 = findLine('### MS4:', findLine('## 12. R6'));
if (r6ms4 > -1) {
  insertions.push({
    line: r6ms4,
    text: `### MS3.5: Performance Optimization Patterns
**Target: Semantic caching + differential state sync for production efficiency**

#### MS3.5-T1: Semantic Cache Engine
\`\`\`
TASK: MS3.5-T1
  DEPENDS_ON: [MS2-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 15
  LAYER: 8
  READS_FROM: [src/engines/KnowledgeQueryEngine.ts]
  WRITES_TO: [src/engines/SemanticCacheEngine.ts (NEW)]
  PROVIDES: [Similarity-based query caching → reduced compute, faster responses]
  SKILL_LOAD: [prism-caching-patterns, prism-performance-patterns, prism-cache-selection]
\`\`\`
**Step-by-step:**
1. Create SemanticCacheEngine.ts — caches calculation results by semantic similarity
2. Key insight: "Ti-6Al-4V, 12mm EM, roughing, HAAS VF-2" ≈ "same but VF-3" → cache hit + delta
3. Hash inputs by material group + tool class + operation type (not exact params)
4. Return cached result with adjustment factors for minor param differences
5. Cache invalidation: when calibration coefficients change, flush affected material groups
6. Wire as middleware in calcDispatcher — transparent to callers
**BASH:** \`npm run build:fast && npm run test:critical && npm run test:regression\`

#### MS3.5-T2: Differential State Sync
\`\`\`
TASK: MS3.5-T2
  DEPENDS_ON: [MS3.5-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 10
  LAYER: 8
  READS_FROM: [src/engines/SessionLifecycleEngine.ts, state/HOT_RESUME.md]
  WRITES_TO: [src/engines/SessionLifecycleEngine.ts (enhanced)]
  PROVIDES: [Boot tokens reduced by 60-80% → longer productive sessions in Claude Code]
  SKILL_LOAD: [prism-session-lifecycle, prism-session-recovery, prism-context-pressure]
\`\`\`
**Step-by-step:**
1. Enhance session_boot to compare current state vs last known session snapshot
2. Return ONLY deltas: new completions, changed files, updated benchmarks, new todos
3. Store session fingerprint (hash of key state files) for comparison
4. If fingerprint unchanged: return "No changes since last session" (~20 tokens)
5. If changed: return structured diff (~100-200 tokens instead of ~500-1000)
**BASH:** \`npm run build:fast && npm run test:critical\`

`
  });
}

// ═══════════════════════════════════════════════════
// IDEA 5: Persistent Computation Graphs + Speculative Pre-computation → R10 (ML)
// Insert before R10's MS5 (Build Gate)
// ═══════════════════════════════════════════════════
const r10ms5 = findLine('### MS5:', findLine('## 16. R10'));
if (r10ms5 > -1) {
  insertions.push({
    line: r10ms5,
    text: `### MS4.5: Advanced Computation Patterns
**Target: Computation graphs + speculative pre-computation for real-time intelligence**

#### MS4.5-T1: Persistent Computation Graph
\`\`\`
TASK: MS4.5-T1
  DEPENDS_ON: [MS3-T2]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: GATED | ESTIMATED_CALLS: 20
  LAYER: 12
  READS_FROM: [src/engines/ManufacturingCalculations.ts, src/engines/AdvancedCalculations.ts]
  WRITES_TO: [src/engines/ComputationGraphEngine.ts (NEW)]
  PROVIDES: [Auto-propagating calculation DAG → when inputs change, downstream recalculates automatically]
  SKILL_LOAD: [prism-design-patterns, prism-async-patterns, prism-data-pipeline]
\`\`\`
**Step-by-step:**
1. Create ComputationGraphEngine.ts — DAG of all calculations and dependencies
2. Nodes: material props, tool geometry, cutting params, force, power, life, safety, cost
3. Edges: dependency relationships (Fc depends on kc1.1, ap, ae, fz)
4. When any input changes (e.g., updated kc1.1): auto-propagate downstream
5. Flag any downstream results that now violate S(x)≥0.70
6. Return: "3 toolpaths need review after Ti-6Al-4V kc1.1 update"
**BASH:** \`npm run build:fast && npx tsx tests/r10/ml-tests.ts\`

#### MS4.5-T2: Speculative Pre-Computation
\`\`\`
TASK: MS4.5-T2
  DEPENDS_ON: [MS4.5-T1]
  EXECUTOR: Code | ARCHETYPE: implementer | MODEL: sonnet | EFFORT: STANDARD
  GATE: YOLO | ESTIMATED_CALLS: 15
  LAYER: 12
  READS_FROM: [src/engines/ComputationGraphEngine.ts, src/engines/SemanticCacheEngine.ts]
  WRITES_TO: [src/engines/SpeculativeEngine.ts (NEW)]
  PROVIDES: [Predictive caching → near-instant responses for likely-next queries]
  SKILL_LOAD: [prism-predictive-thinking, prism-caching-patterns, prism-performance-patterns]
\`\`\`
**Step-by-step:**
1. Create SpeculativeEngine.ts — predicts likely next queries based on current work
2. Pattern: user calculates roughing → pre-compute finishing, HSM, adjacent materials
3. Track query patterns via MemGraph cross-session learning
4. Background compute top-3 predicted queries after each action
5. Store in SemanticCache — next call returns from cache if prediction correct
6. Metrics: cache hit rate, prediction accuracy, tokens saved
**BASH:** \`npm run build:fast && npx tsx tests/r10/ml-tests.ts\`

`
  });
}

// Apply insertions in reverse order (bottom-up to preserve line numbers)
insertions.sort((a, b) => b.line - a.line);

for (const ins of insertions) {
  const newLines = ins.text.split('\n');
  lines.splice(ins.line, 0, ...newLines);
  console.log(`Inserted ${newLines.length} lines at L${ins.line}`);
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\nTotal: ${insertions.length} idea blocks inserted`);
console.log('New line count:', lines.length);
