#!/usr/bin/env node
// tier: T4
/**
 * Extended Thinking Auto-Switch — UserPromptSubmit Hook
 *
 * Automatically recommends extended thinking mode based on:
 * 1. Task complexity scoring (multi-dimensional)
 * 2. Stakes/criticality assessment
 * 3. Reasoning depth requirements
 * 4. Historical patterns (what tasks benefit from deep thinking)
 *
 * Does NOT force extended thinking — surfaces recommendation with rationale.
 * Extended thinking is expensive (more tokens, slower) so we only recommend
 * when the ROI is clear.
 *
 * TRIGGERS FOR EXTENDED THINKING:
 * - Safety-critical calculations (S(x) scoring, collision detection)
 * - Multi-step optimization (chatter, thermal, deflection chains)
 * - Architecture/design decisions (system design, API design)
 * - Cross-domain synthesis (physics + ML, manufacturing + business)
 * - Novel problem solving (no existing pattern/engine matches)
 * - High-stakes decisions (production code, customer-facing)
 *
 * NON-TRIGGERS (stay in standard mode):
 * - Simple lookups (material properties, tool specs)
 * - Well-defined calculations (single formula application)
 * - Routine operations (file editing, test running)
 * - Low-stakes exploration (research, learning)
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const THINKING_LOG_PATH = 'H:/prism/mcp-server/data/state/extended-thinking-log.json';

// ============================================================================
// MULTI-DIMENSIONAL COMPLEXITY SCORING
// ============================================================================

const DIMENSION_WEIGHTS = {
  safety: 3.0,        // Safety-critical tasks get highest weight
  novelty: 2.5,       // Novel problems need more thinking
  depth: 2.5,         // Multi-step reasoning chains
  stakes: 2.0,        // High-stakes decisions
  ambiguity: 1.5,     // Unclear requirements need exploration
  cross_domain: 2.0,  // Cross-disciplinary synthesis
  manufacturing: 2.0, // Manufacturing complexity
  metacognitive: 2.5, // Explicit thinking requests
  uncertainty: 1.5,   // User uncertainty signals
  constraints: 1.5,   // Constraint reasoning
  temporal: 1.0,      // Sequencing/ordering
  quantitative: 1.5,  // Precision requirements
  failure_recovery: 2.0, // Error recovery context
};

const SAFETY_PATTERNS = [
  { pattern: /S\(x\)|safety.*score/i, weight: 1.0, reason: 'Safety scoring' },
  { pattern: /collision|crash|interference/i, weight: 1.0, reason: 'Collision detection' },
  { pattern: /clearance|envelope|limit/i, weight: 0.7, reason: 'Limit checking' },
  { pattern: /CRITICAL|SAFETY|DANGER/i, weight: 1.0, reason: 'Explicit safety flag' },
  { pattern: /spindle.*overload|tool.*break/i, weight: 0.9, reason: 'Equipment protection' },
  { pattern: /tolerance|precision|accuracy/i, weight: 0.6, reason: 'Precision requirements' },
];

const NOVELTY_PATTERNS = [
  { pattern: /never.*before|first.*time|new.*approach/i, weight: 1.0, reason: 'Explicit novelty' },
  { pattern: /creative|innovative|novel|unconventional/i, weight: 0.9, reason: 'Creative request' },
  { pattern: /alternative|different.*way|another.*approach/i, weight: 0.7, reason: 'Alternative seeking' },
  { pattern: /what.*if|explore|brainstorm/i, weight: 0.6, reason: 'Exploration mode' },
  { pattern: /no.*existing|doesn't.*exist|build.*from.*scratch/i, weight: 0.8, reason: 'No prior art' },
];

const DEPTH_PATTERNS = [
  { pattern: /multi.*(step|stage|phase|layer|axis|constraint)/i, weight: 1.0, reason: 'Multi-step process' },
  { pattern: /chain|pipeline|sequence|workflow/i, weight: 0.8, reason: 'Sequential reasoning' },
  { pattern: /depend(s|ency|ent)|cascade|propagate/i, weight: 0.7, reason: 'Dependency analysis' },
  { pattern: /trade.?off|balance|weigh|while.*also|constraint/i, weight: 0.8, reason: 'Tradeoff analysis' },
  { pattern: /optim(ize|al|ization)|minimi(ze|zing)|maximi(ze|zing)/i, weight: 0.9, reason: 'Optimization' },
  { pattern: /architect|design|structure|organize/i, weight: 0.9, reason: 'System design' },
  { pattern: /root.*cause|diagnose|investigate/i, weight: 0.8, reason: 'Root cause analysis' },
  { pattern: /consideration|factor|variable|parameter/i, weight: 0.6, reason: 'Multi-factor analysis' },
  { pattern: /comprehensive|exhaustive|thorough|complete/i, weight: 0.7, reason: 'Thorough analysis needed' },
];

const STAKES_PATTERNS = [
  { pattern: /production|deploy|release|ship/i, weight: 1.0, reason: 'Production impact' },
  { pattern: /customer|client|user.*facing/i, weight: 0.9, reason: 'Customer-facing' },
  { pattern: /irreversible|permanent|cannot.*undo/i, weight: 1.0, reason: 'Irreversible action' },
  { pattern: /data.*loss|corrupt|destroy/i, weight: 1.0, reason: 'Data integrity' },
  { pattern: /cost|expensive|budget|ROI/i, weight: 0.7, reason: 'Financial impact' },
  { pattern: /deadline|urgent|critical.*path/i, weight: 0.6, reason: 'Time pressure' },
];

const AMBIGUITY_PATTERNS = [
  { pattern: /unclear|ambiguous|vague|undefined/i, weight: 1.0, reason: 'Explicit ambiguity' },
  { pattern: /what.*should|how.*should|best.*way/i, weight: 0.7, reason: 'Seeking guidance' },
  { pattern: /or|versus|vs\.?|compare/i, weight: 0.5, reason: 'Comparison needed' },
  { pattern: /depends|it.*depends|context/i, weight: 0.6, reason: 'Context-dependent' },
  { pattern: /\?.*\?|\?$/i, weight: 0.3, reason: 'Question format' },
];

const CROSS_DOMAIN_PATTERNS = [
  { pattern: /physics.*and.*(ml|ai|business)/i, weight: 1.0, reason: 'Physics + AI' },
  { pattern: /manufacturing.*and.*(software|code)/i, weight: 0.9, reason: 'Manufacturing + Software' },
  { pattern: /cross.?domain|interdisciplinary|multi.?disciplin/i, weight: 1.0, reason: 'Cross-domain explicit' },
  { pattern: /scientific.*and.*practical/i, weight: 0.8, reason: 'Theory + Practice' },
  { pattern: /(thermal|force|chatter).*and.*(thermal|force|chatter)/i, weight: 0.7, reason: 'Multi-physics' },
  { pattern: /(chatter|thermal|tool.*life|mrr|deflection).*with.*(chatter|thermal|tool.*life|mrr|deflection|constraint)/i, weight: 0.9, reason: 'Multi-physics coupling' },
  { pattern: /while.*also|simultaneously|concurrent/i, weight: 0.6, reason: 'Simultaneous objectives' },
];

const MANUFACTURING_PATTERNS = [
  { pattern: /5.?axis|five.?axis|multi.?axis/i, weight: 0.9, reason: '5-axis complexity' },
  { pattern: /chatter|vibration|stability/i, weight: 0.8, reason: 'Chatter analysis' },
  { pattern: /thermal|temperature|heat/i, weight: 0.7, reason: 'Thermal analysis' },
  { pattern: /tool.*life|wear|taylor/i, weight: 0.7, reason: 'Tool life analysis' },
  { pattern: /mrr|material.*removal|productivity/i, weight: 0.6, reason: 'MRR optimization' },
  { pattern: /deflection|stiffness/i, weight: 0.7, reason: 'Deflection analysis' },
  { pattern: /surface.*finish|roughness/i, weight: 0.6, reason: 'Surface quality' },
  { pattern: /kienzle|taylor|merchant/i, weight: 0.8, reason: 'Physics models' },
  { pattern: /toolpath|cam|post.?process/i, weight: 0.6, reason: 'CAM complexity' },
];

// Metacognitive signals — user explicitly wants deep thinking
const METACOGNITIVE_PATTERNS = [
  { pattern: /think.*(careful|deep|hard|through)/i, weight: 1.0, reason: 'Explicit deep thinking' },
  { pattern: /cover.*all.*angles|exhaust|thorough/i, weight: 1.0, reason: 'Exhaustive analysis' },
  { pattern: /be.*logical|reason.*through|step.*by.*step/i, weight: 0.9, reason: 'Logical reasoning' },
  { pattern: /consider.*every|all.*possibilities|edge.*case/i, weight: 0.9, reason: 'Comprehensive' },
  { pattern: /don't.*miss|make.*sure|double.*check/i, weight: 0.7, reason: 'Verification needed' },
  { pattern: /why.*and.*how|explain.*reasoning|show.*work/i, weight: 0.8, reason: 'Reasoning transparency' },
  { pattern: /anticipate|foresee|predict.*problem/i, weight: 0.8, reason: 'Forward thinking' },
  { pattern: /critique|devil.*advocate|challenge/i, weight: 0.7, reason: 'Critical analysis' },
  { pattern: /optimal|optimum|best.*possible/i, weight: 0.8, reason: 'Optimality seeking' },
];

// User uncertainty signals — they're unsure, need exploration
const UNCERTAINTY_PATTERNS = [
  { pattern: /i.*think|maybe|perhaps|possibly/i, weight: 0.6, reason: 'User uncertainty' },
  { pattern: /not.*sure|uncertain|unclear.*to.*me/i, weight: 0.8, reason: 'Explicit uncertainty' },
  { pattern: /might.*be|could.*be|seems.*like/i, weight: 0.5, reason: 'Tentative language' },
  { pattern: /correct.*me|am.*i.*right|is.*this.*right/i, weight: 0.7, reason: 'Seeking validation' },
  { pattern: /i.*don't.*know|no.*idea|stumped/i, weight: 0.9, reason: 'Knowledge gap' },
  { pattern: /confus|puzzl|perplex/i, weight: 0.8, reason: 'Confusion expressed' },
];

// Constraint reasoning — negations, restrictions, requirements
const CONSTRAINT_PATTERNS = [
  { pattern: /must.*not|cannot|never.*should/i, weight: 0.9, reason: 'Hard constraints' },
  { pattern: /avoid|prevent|without.*causing/i, weight: 0.8, reason: 'Avoidance constraints' },
  { pattern: /only.*if|unless|except.*when/i, weight: 0.7, reason: 'Conditional logic' },
  { pattern: /at.*least|at.*most|between.*and/i, weight: 0.6, reason: 'Bounded constraints' },
  { pattern: /require|mandatory|essential/i, weight: 0.7, reason: 'Requirements' },
  { pattern: /conflict|contradict|mutually.*exclusive/i, weight: 0.9, reason: 'Conflict resolution' },
  { pattern: /prioriti|rank|order.*of.*importance/i, weight: 0.7, reason: 'Priority ordering' },
];

// Temporal reasoning — sequencing, ordering, causality
const TEMPORAL_PATTERNS = [
  { pattern: /before.*after|first.*then|sequence/i, weight: 0.8, reason: 'Sequencing' },
  { pattern: /cause.*effect|leads.*to|results.*in/i, weight: 0.7, reason: 'Causality' },
  { pattern: /depend.*on.*order|timing.*matter/i, weight: 0.8, reason: 'Order dependence' },
  { pattern: /parallel|concurrent|simultaneous/i, weight: 0.6, reason: 'Concurrency' },
  { pattern: /eventually|finally|ultimately/i, weight: 0.5, reason: 'End state reasoning' },
  { pattern: /trigger|cascade|chain.*reaction/i, weight: 0.7, reason: 'Cascade effects' },
];

// Quantitative precision — specific numbers, tolerances
const QUANTITATIVE_PATTERNS = [
  { pattern: /exactly|\bprecisely\b|specifically/i, weight: 0.7, reason: 'Precision required' },
  { pattern: /\d+\.?\d*\s*(mm|μm|inch|thou)/i, weight: 0.8, reason: 'Dimensional precision' },
  { pattern: /tolerance|±|plus.*minus/i, weight: 0.9, reason: 'Tolerance analysis' },
  { pattern: /percentage|ratio|\d+%/i, weight: 0.5, reason: 'Quantitative targets' },
  { pattern: /measure|calculate|compute.*exact/i, weight: 0.6, reason: 'Exact calculation' },
  { pattern: /uncertainty|error.*margin|confidence/i, weight: 0.8, reason: 'Uncertainty quantification' },
];

// Failure recovery context — retrying, debugging
const FAILURE_RECOVERY_PATTERNS = [
  { pattern: /tried.*but|didn't.*work|failed/i, weight: 0.9, reason: 'Previous failure' },
  { pattern: /again|retry|another.*attempt/i, weight: 0.7, reason: 'Retry context' },
  { pattern: /still.*not|keeps.*failing|won't/i, weight: 0.9, reason: 'Persistent failure' },
  { pattern: /what.*went.*wrong|why.*fail|debug/i, weight: 0.8, reason: 'Failure analysis' },
  { pattern: /error|exception|crash|broke/i, weight: 0.7, reason: 'Error context' },
  { pattern: /fix.*properly|root.*cause|underlying/i, weight: 0.8, reason: 'Deep fix needed' },
];

function scoreDimension(text, patterns) {
  let maxScore = 0;
  let topReason = null;

  for (const { pattern, weight, reason } of patterns) {
    if (pattern.test(text)) {
      if (weight > maxScore) {
        maxScore = weight;
        topReason = reason;
      }
    }
  }

  return { score: maxScore, reason: topReason };
}

function calculateComplexityScore(text) {
  const dimensions = {
    safety: scoreDimension(text, SAFETY_PATTERNS),
    novelty: scoreDimension(text, NOVELTY_PATTERNS),
    depth: scoreDimension(text, DEPTH_PATTERNS),
    stakes: scoreDimension(text, STAKES_PATTERNS),
    ambiguity: scoreDimension(text, AMBIGUITY_PATTERNS),
    cross_domain: scoreDimension(text, CROSS_DOMAIN_PATTERNS),
    manufacturing: scoreDimension(text, MANUFACTURING_PATTERNS),
    metacognitive: scoreDimension(text, METACOGNITIVE_PATTERNS),
    uncertainty: scoreDimension(text, UNCERTAINTY_PATTERNS),
    constraints: scoreDimension(text, CONSTRAINT_PATTERNS),
    temporal: scoreDimension(text, TEMPORAL_PATTERNS),
    quantitative: scoreDimension(text, QUANTITATIVE_PATTERNS),
    failure_recovery: scoreDimension(text, FAILURE_RECOVERY_PATTERNS),
  };

  // Weighted sum
  let totalScore = 0;
  const reasons = [];
  let activeDimensions = 0;

  for (const [dim, data] of Object.entries(dimensions)) {
    const weighted = data.score * DIMENSION_WEIGHTS[dim];
    totalScore += weighted;
    if (data.reason) {
      reasons.push(`${dim}: ${data.reason}`);
      activeDimensions++;
    }
  }

  // COMPOUND BONUS: Multiple dimensions triggering = exponentially harder
  // 3+ dimensions = 25% bonus, 5+ = 50% bonus, 7+ = 75% bonus
  let compoundMultiplier = 1.0;
  if (activeDimensions >= 7) {
    compoundMultiplier = 1.75;
  } else if (activeDimensions >= 5) {
    compoundMultiplier = 1.5;
  } else if (activeDimensions >= 3) {
    compoundMultiplier = 1.25;
  }
  totalScore *= compoundMultiplier;

  // Normalize to 0-10 scale
  // Use a REALISTIC ceiling: typical complex task triggers 4-5 dimensions at ~0.8 weight
  // This makes scores more meaningful (a 2-dimension task can still score 3-4)
  const realisticCeiling = 12.0; // ~4-5 dimensions at good weights
  const normalized = Math.min(10, (totalScore / realisticCeiling) * 10);

  return {
    score: normalized,
    dimensions,
    reasons,
    raw: totalScore,
    activeDimensions,
    compoundMultiplier
  };
}

// ============================================================================
// THINKING MODE DECISION
// ============================================================================

const BASE_THRESHOLDS = {
  extended_high: 5.0,
  extended_medium: 3.0,
  standard: 1.5,
  quick: 0
};

// Session context: check recent decisions for adaptive thresholds
function getAdaptiveThresholds() {
  const thresholds = { ...BASE_THRESHOLDS };

  try {
    if (!existsSync(THINKING_LOG_PATH)) return thresholds;

    const log = JSON.parse(readFileSync(THINKING_LOG_PATH, 'utf8'));
    const recent = (log.decisions || []).slice(-20);

    if (recent.length < 5) return thresholds;

    // Count recent extended thinking decisions
    const extendedCount = recent.filter(d => d.mode === 'extended').length;
    const extendedRatio = extendedCount / recent.length;

    // If we've been recommending extended thinking a lot (>60%), raise thresholds
    // to avoid over-recommending (user might be in a complex phase, that's normal)
    if (extendedRatio > 0.6) {
      thresholds.extended_high = 5.5;
      thresholds.extended_medium = 3.5;
    }

    // If we rarely recommend extended (<20%), lower thresholds to catch more cases
    if (extendedRatio < 0.2) {
      thresholds.extended_high = 4.5;
      thresholds.extended_medium = 2.5;
    }

    // Check for recent failures (if logged) - not implemented yet but hook is ready
    const recentFailures = recent.filter(d => d.outcome === 'failure').length;
    if (recentFailures > 3) {
      // Recent failures suggest we need more thinking
      thresholds.extended_high -= 0.5;
      thresholds.extended_medium -= 0.5;
    }

    return thresholds;
  } catch {
    return thresholds;
  }
}

function decideThinkingMode(score, activeDimensions) {
  const thresholds = getAdaptiveThresholds();
  // Dynamic budget based on active dimensions
  const budgetForHigh = activeDimensions >= 7 ? 32768 : activeDimensions >= 5 ? 24576 : 16384;
  const budgetForMedium = activeDimensions >= 5 ? 12288 : 8192;

  if (score >= thresholds.extended_high) {
    return {
      mode: 'extended',
      confidence: 'high',
      budgetTokens: budgetForHigh,
      rationale: `High complexity (${activeDimensions} dimensions) warrants deep analysis`
    };
  }
  if (score >= thresholds.extended_medium) {
    return {
      mode: 'extended',
      confidence: 'medium',
      budgetTokens: budgetForMedium,
      rationale: `Moderate complexity (${activeDimensions} dimensions) suggests extended thinking`
    };
  }
  if (score >= thresholds.standard) {
    return {
      mode: 'standard',
      confidence: 'high',
      budgetTokens: 0,
      rationale: 'Standard reasoning sufficient for this task'
    };
  }
  return {
    mode: 'quick',
    confidence: 'high',
    budgetTokens: 0,
    rationale: 'Simple task, quick mode appropriate'
  };
}

// ============================================================================
// LOGGING
// ============================================================================

function logDecision(prompt, analysis, decision) {
  try {
    let log = { decisions: [] };
    if (existsSync(THINKING_LOG_PATH)) {
      log = JSON.parse(readFileSync(THINKING_LOG_PATH, 'utf8'));
    }

    log.decisions.push({
      timestamp: new Date().toISOString(),
      promptPreview: prompt.slice(0, 100),
      score: analysis.score,
      activeDimensions: analysis.activeDimensions,
      compoundMultiplier: analysis.compoundMultiplier,
      mode: decision.mode,
      confidence: decision.confidence,
      budgetTokens: decision.budgetTokens,
      reasons: analysis.reasons.slice(0, 5)
    });

    // Keep last 100 decisions
    if (log.decisions.length > 100) {
      log.decisions = log.decisions.slice(-100);
    }

    writeFileSync(THINKING_LOG_PATH, JSON.stringify(log, null, 2));
  } catch {
    // Logging failure is non-critical
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = input.prompt || '';
  if (!prompt || prompt.length < 20) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const analysis = calculateComplexityScore(prompt);
  const decision = decideThinkingMode(analysis.score, analysis.activeDimensions);

  // Log for pattern analysis
  logDecision(prompt, analysis, decision);

  // Only inject context for extended thinking recommendations
  if (decision.mode !== 'extended') {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const parts = [];
  parts.push(`## Extended Thinking Recommended (${decision.confidence})`);
  parts.push(`Score: ${analysis.score.toFixed(1)}/10 | Dimensions: ${analysis.activeDimensions}/13 | Compound: ${analysis.compoundMultiplier}x`);
  parts.push(`Budget: ${(decision.budgetTokens / 1024).toFixed(0)}K tokens`);
  parts.push(`Triggers: ${analysis.reasons.slice(0, 4).join(' | ')}`);
  parts.push(`→ Use DeepAIIntelligenceEngine, ExtendedThinkingBridgeEngine, or PRISMCreativeReasoningEngine`);

  console.log(JSON.stringify({
    continue: true,
    additionalContext: parts.join('\n')
  }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
