# PRISM ATTENTION FOCUS
## Cognitive Skill for Smart Context Prioritization
### Level 1 Cognitive | Part of Cognitive Enhancement v7.0
### Version 1.0.0 | 2026-01-30

---

# OVERVIEW

## Purpose
Intelligently prioritize and focus on relevant context within large codebases.
When working with the 986,621-line PRISM monolith or any large system,
this skill ensures Claude focuses on the most relevant information for
the current task while managing limited context window effectively.

## Level
**L1 Cognitive** - Loads for quality assessment, manages context efficiency

## Triggers
- Large file/codebase loaded
- Query received requiring context search
- Output generation requiring prioritization
- Context window approaching limits
- Cross-reference navigation needed

## Output
**A(x)** - Attention Quality Score (0.0 to 1.0)
- 1.0 = Perfect focus on relevant content, optimal context usage
- 0.7-0.99 = Good focus, minor irrelevant content included
- 0.3-0.69 = Scattered focus, needs refinement
- 0.0-0.29 = Poor focus, mostly irrelevant content

## Integration
```
Context Budget Management:
  A(x) informs how much context to load
  Higher A(x) = more efficient context usage
  Lower A(x) = wasted context on irrelevant content
  
Ω(x) Integration:
  A(x) contributes 0.08 weight to master equation
```

---

# HOOKS

## ATTN-001: Context Loaded - Compute Relevance
```
Trigger: context:loaded
Action: Compute relevance scores for all loaded content
Fires: When any file, module, or data is loaded into context

Process:
1. Parse loaded content into sections/chunks
2. Extract keywords and concepts from each chunk
3. Compare against current task requirements
4. Compute relevance score per chunk
5. Rank chunks by relevance
6. Flag low-relevance chunks for potential removal

Output: {
  total_chunks: number,
  high_relevance: number,    // score > 0.7
  medium_relevance: number,  // score 0.4-0.7
  low_relevance: number,     // score < 0.4
  recommendations: string[], // what to keep/remove
  A_x_initial: number
}
```

## ATTN-002: Query Received - Focus Sections
```
Trigger: query:received
Action: Identify which sections of context are most relevant to query
Fires: On every user query or task request

Process:
1. Parse query for key concepts, entities, operations
2. Match concepts against loaded context sections
3. Compute query-context similarity scores
4. Identify primary focus sections (top 20%)
5. Identify secondary support sections (next 30%)
6. Flag irrelevant sections (bottom 50%)

Output: {
  query_concepts: string[],
  focus_sections: Section[],
  support_sections: Section[],
  irrelevant_sections: Section[],
  suggested_context_slice: Range
}
```

## ATTN-003: Output Generating - Prioritize Info
```
Trigger: output:generating
Action: Prioritize information to include in response
Fires: Before generating any output

Process:
1. Assess what information is needed for response
2. Rank available information by importance
3. Apply priority queue for inclusion
4. Check for completeness (all required info present?)
5. Verify no critical info is being omitted
6. Compute final A(x) score

Output: {
  required_info: InfoItem[],
  included_info: InfoItem[],
  omitted_info: InfoItem[],
  completeness: number,
  A_x_final: number
}
```

---

# RELEVANCE SCORING ALGORITHM

## Core Relevance Computation

```javascript
function computeRelevance(content, taskContext) {
  const scores = {
    keyword: 0,
    semantic: 0,
    recency: 0,
    dependency: 0,
    crossRef: 0
  };
  
  // 1. Keyword matching (0-1)
  scores.keyword = keywordMatch(content, taskContext.keywords);
  
  // 2. Semantic similarity (0-1)
  scores.semantic = semanticSimilarity(content, taskContext.description);
  
  // 3. Recency weighting (0-1)
  scores.recency = recencyScore(content.lastModified, taskContext.timeframe);
  
  // 4. Dependency importance (0-1)
  scores.dependency = dependencyScore(content, taskContext.targetModules);
  
  // 5. Cross-reference amplification (0-2, can boost above 1)
  scores.crossRef = crossReferenceBoost(content, taskContext.relatedItems);
  
  // Weighted combination
  const weights = {
    keyword: 0.25,
    semantic: 0.30,
    recency: 0.10,
    dependency: 0.20,
    crossRef: 0.15
  };
  
  let relevance = 0;
  for (const [key, weight] of Object.entries(weights)) {
    relevance += scores[key] * weight;
  }
  
  // Normalize and clamp
  return Math.min(1, Math.max(0, relevance));
}
```

## Keyword Extraction and Weighting

```javascript
function keywordMatch(content, targetKeywords) {
  // Extract keywords from content
  const contentKeywords = extractKeywords(content);
  
  // Weight keywords by importance
  const keywordWeights = {
    // Domain-specific high-value keywords
    'material': 2.0,
    'speed': 2.0,
    'feed': 2.0,
    'tool': 1.8,
    'force': 1.8,
    'temperature': 1.7,
    'machine': 1.6,
    'spindle': 1.5,
    'controller': 1.5,
    'algorithm': 1.4,
    'calculation': 1.4,
    'database': 1.3,
    'engine': 1.3,
    // Technical keywords
    'function': 1.2,
    'class': 1.2,
    'module': 1.2,
    'export': 1.1,
    'import': 1.1,
    // Default
    'default': 1.0
  };
  
  let matchScore = 0;
  let maxPossible = 0;
  
  for (const keyword of targetKeywords) {
    const weight = keywordWeights[keyword.toLowerCase()] || keywordWeights.default;
    maxPossible += weight;
    
    if (contentKeywords.has(keyword.toLowerCase())) {
      matchScore += weight;
    }
  }
  
  return maxPossible > 0 ? matchScore / maxPossible : 0;
}

function extractKeywords(text) {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once'
  ]);
  
  // Extract words, filter stop words, normalize
  const words = text.toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  return new Set(words);
}
```

## Semantic Similarity Computation

```javascript
function semanticSimilarity(content, description) {
  // Simple TF-IDF based similarity
  // In production, would use embeddings
  
  const contentTerms = tokenize(content);
  const descTerms = tokenize(description);
  
  // Build term frequency vectors
  const contentTF = computeTF(contentTerms);
  const descTF = computeTF(descTerms);
  
  // Compute cosine similarity
  return cosineSimilarity(contentTF, descTF);
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function computeTF(terms) {
  const tf = new Map();
  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }
  // Normalize
  const max = Math.max(...tf.values());
  for (const [term, count] of tf) {
    tf.set(term, count / max);
  }
  return tf;
}

function cosineSimilarity(tfA, tfB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  const allTerms = new Set([...tfA.keys(), ...tfB.keys()]);
  
  for (const term of allTerms) {
    const a = tfA.get(term) || 0;
    const b = tfB.get(term) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

## Recency Weighting

```javascript
function recencyScore(lastModified, timeframe) {
  // More recent = more relevant (for active development)
  const now = Date.now();
  const age = now - new Date(lastModified).getTime();
  const ageInDays = age / (1000 * 60 * 60 * 24);
  
  // Decay function based on timeframe
  const decayRates = {
    'immediate': { halfLife: 1 },    // Today's work
    'recent': { halfLife: 7 },       // This week
    'moderate': { halfLife: 30 },    // This month
    'historical': { halfLife: 365 }  // This year
  };
  
  const rate = decayRates[timeframe] || decayRates.moderate;
  
  // Exponential decay
  return Math.exp(-0.693 * ageInDays / rate.halfLife);
}
```

## Dependency-Based Importance Scoring

```javascript
function dependencyScore(content, targetModules) {
  // Higher score if content is dependency of target modules
  
  const contentId = content.moduleId || content.name;
  let score = 0;
  
  for (const target of targetModules) {
    // Direct dependency
    if (target.dependencies?.includes(contentId)) {
      score += 0.5;
    }
    
    // Reverse dependency (content depends on target)
    if (content.dependencies?.includes(target.id)) {
      score += 0.3;
    }
    
    // Shared dependencies (sibling relationship)
    const sharedDeps = countSharedDependencies(content, target);
    score += sharedDeps * 0.1;
  }
  
  return Math.min(1, score);
}

function countSharedDependencies(a, b) {
  if (!a.dependencies || !b.dependencies) return 0;
  const setA = new Set(a.dependencies);
  return b.dependencies.filter(d => setA.has(d)).length;
}
```

## Cross-Reference Amplification

```javascript
function crossReferenceBoost(content, relatedItems) {
  // Amplify relevance if content is referenced by multiple related items
  
  let referenceCount = 0;
  const contentId = content.moduleId || content.name;
  
  for (const item of relatedItems) {
    // Check if item references this content
    if (item.references?.includes(contentId)) {
      referenceCount++;
    }
    // Check code references
    if (item.code?.includes(contentId)) {
      referenceCount++;
    }
  }
  
  // Logarithmic scaling to prevent runaway amplification
  // 0 refs = 1.0, 1 ref = 1.3, 2 refs = 1.5, 5 refs = 1.7, 10 refs = 2.0
  return 1 + 0.3 * Math.log2(1 + referenceCount);
}
```

---

# CONTEXT WINDOW OPTIMIZATION

## Strategy Overview

```javascript
const CONTEXT_STRATEGY = {
  // Maximum context budget (approximate tokens)
  maxTokens: 100000,
  
  // Allocation percentages
  allocation: {
    currentTask: 0.40,      // 40% for current task content
    dependencies: 0.25,     // 25% for dependencies
    reference: 0.20,        // 20% for reference material
    history: 0.10,          // 10% for conversation history
    buffer: 0.05            // 5% safety buffer
  },
  
  // Minimum relevance thresholds for inclusion
  thresholds: {
    mustInclude: 0.8,       // Always include if above
    shouldInclude: 0.5,     // Include if space allows
    mayInclude: 0.3,        // Include only if plenty of space
    exclude: 0.0            // Never include below this
  }
};
```

## Priority Queue for Information Retrieval

```javascript
class AttentionPriorityQueue {
  constructor() {
    this.items = [];
  }
  
  enqueue(item, relevance, category) {
    const priority = this.computePriority(relevance, category);
    
    this.items.push({
      item,
      relevance,
      category,
      priority,
      tokens: estimateTokens(item)
    });
    
    // Sort by priority (highest first)
    this.items.sort((a, b) => b.priority - a.priority);
  }
  
  computePriority(relevance, category) {
    // Category multipliers
    const categoryMultipliers = {
      'critical_safety': 2.0,    // Safety-critical content
      'direct_answer': 1.8,      // Directly answers query
      'supporting': 1.4,         // Supports the answer
      'context': 1.2,            // Provides context
      'reference': 1.0,          // Reference material
      'historical': 0.8          // Historical context
    };
    
    const multiplier = categoryMultipliers[category] || 1.0;
    return relevance * multiplier;
  }
  
  getTopItems(tokenBudget) {
    const selected = [];
    let usedTokens = 0;
    
    for (const item of this.items) {
      if (usedTokens + item.tokens <= tokenBudget) {
        selected.push(item);
        usedTokens += item.tokens;
      } else if (item.priority >= 1.5) {
        // Force include critical items even if over budget
        selected.push(item);
        usedTokens += item.tokens;
      }
    }
    
    return { selected, usedTokens };
  }
}

function estimateTokens(content) {
  // Rough estimation: ~4 characters per token
  if (typeof content === 'string') {
    return Math.ceil(content.length / 4);
  }
  return Math.ceil(JSON.stringify(content).length / 4);
}
```

## Attention Decay Function

```javascript
function attentionDecay(initialRelevance, distanceFromFocus) {
  // Relevance decays as content is further from focus point
  // Uses Gaussian-like decay
  
  const sigma = 10; // Decay rate parameter
  const decay = Math.exp(-(distanceFromFocus ** 2) / (2 * sigma ** 2));
  
  return initialRelevance * decay;
}

// Example: Content relevance by distance from query match
function computeContextRelevance(content, queryMatchPosition) {
  const sections = splitIntoSections(content);
  
  return sections.map((section, index) => {
    const distance = Math.abs(index - queryMatchPosition);
    const baseRelevance = section.initialRelevance || 0.5;
    
    return {
      section,
      relevance: attentionDecay(baseRelevance, distance),
      distance
    };
  });
}
```

---

# A(x) COMPUTATION FORMULA

## Main Computation

```javascript
function computeAx(attentionResults) {
  // Factors contributing to attention quality
  const factors = {
    focusAccuracy: 0,     // Did we focus on right content?
    contextEfficiency: 0, // How efficiently did we use context?
    completeness: 0,      // Did we include all necessary info?
    noiseLevel: 0         // How much irrelevant content included?
  };
  
  // 1. Focus Accuracy (0-1)
  // Ratio of high-relevance content accessed vs available
  factors.focusAccuracy = attentionResults.highRelevanceAccessed / 
                          attentionResults.highRelevanceAvailable;
  
  // 2. Context Efficiency (0-1)
  // Tokens used for relevant content / total tokens used
  factors.contextEfficiency = attentionResults.relevantTokens / 
                              attentionResults.totalTokensUsed;
  
  // 3. Completeness (0-1)
  // Required information included / total required
  factors.completeness = attentionResults.requiredInfoIncluded / 
                         attentionResults.totalRequiredInfo;
  
  // 4. Noise Level (0-1, inverted - lower is better)
  // 1 - (irrelevant content / total content)
  factors.noiseLevel = 1 - (attentionResults.irrelevantIncluded / 
                            attentionResults.totalIncluded);
  
  // Weighted combination
  const weights = {
    focusAccuracy: 0.30,
    contextEfficiency: 0.25,
    completeness: 0.30,
    noiseLevel: 0.15
  };
  
  let Ax = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    Ax += (factors[factor] || 0) * weight;
  }
  
  return Math.min(1, Math.max(0, Ax));
}
```

## Integration with Context Budget

```javascript
function integrateAxWithBudget(Ax, budgetStatus) {
  // A(x) affects how aggressively we prune context
  
  if (budgetStatus.usagePercent > 90) {
    // Critical - must prune aggressively
    // Only keep items with relevance > 0.7
    return {
      action: 'AGGRESSIVE_PRUNE',
      threshold: 0.7,
      message: 'Context critical - keeping only high-relevance items'
    };
  }
  
  if (budgetStatus.usagePercent > 70) {
    // Warning - prune moderately
    return {
      action: 'MODERATE_PRUNE',
      threshold: 0.5,
      message: 'Context high - pruning low-relevance items'
    };
  }
  
  if (Ax < 0.5) {
    // Poor attention quality - need to refocus
    return {
      action: 'REFOCUS',
      threshold: 0.4,
      message: 'Attention scattered - refocusing on task-relevant content'
    };
  }
  
  // Normal operation
  return {
    action: 'NORMAL',
    threshold: 0.3,
    message: 'Context healthy - normal operation'
  };
}
```

---

# INTEGRATION POINTS

## With Context Budget Management (Buffer Zones)

```
Buffer Zone Integration:
🟢 GREEN (0-8 calls):
  - Load full relevant context
  - A(x) threshold: 0.3 (include more content)
  
🟡 YELLOW (9-14 calls):
  - Start pruning low-relevance content
  - A(x) threshold: 0.5 (be more selective)
  - Pre-save critical context to state file
  
🔴 RED (15-18 calls):
  - Aggressive pruning
  - A(x) threshold: 0.7 (only high-relevance)
  - Save all work before potential compaction
  
⚫ CRITICAL (19+ calls):
  - Emergency mode
  - Only safety-critical content retained
  - ATTN-003 forces minimal output
```

## With Master Equation (prism-master-equation)

```
A(x) is a component in Ω(x):
Ω(x) = 0.20·R + 0.15·C + 0.10·P + 0.25·S + 0.05·L + 0.08·A + 0.05·M + 0.07·K + 0.05·D

A(x) weight: 0.08 (8% of total quality score)

Effect on overall quality:
- High A(x) (>0.8): Efficient context usage, good focus
- Medium A(x) (0.5-0.8): Acceptable, some wasted context
- Low A(x) (<0.5): Poor focus, context inefficiency warning
```

## With Session Management (prism-session-master)

```
Session Continuity:
1. ATTN-001 runs on session start to assess loaded context
2. ATTN-002 runs on each user query
3. ATTN-003 runs before response generation
4. Low A(x) triggers context reorganization
5. State file stores attention priorities for resume
```

---

# EXAMPLE SCENARIOS

## Scenario 1: Large Codebase Search

```
CONTEXT:
- 986,621 line monolith loaded
- User asks: "Find the Kienzle cutting force calculation"

ATTN-001 FIRES (context:loaded):
- Parses monolith into 831 modules
- Initial relevance scan:
  - physics_engines/: HIGH (contains force calculations)
  - ui_components/: LOW (not relevant)
  - database_schemas/: MEDIUM (may define force parameters)

ATTN-002 FIRES (query:received):
- Query concepts: ["Kienzle", "cutting force", "calculation"]
- Focus sections identified:
  - PRISM_PHYSICS_ENGINE.js (relevance: 0.95)
  - CUTTING_FORCE_MODULE.js (relevance: 0.92)
  - MATERIAL_PROPERTIES.js (relevance: 0.78)
- Irrelevant sections flagged: 750+ modules

ATTN-003 FIRES (output:generating):
- Required info: Kienzle formula, parameters, usage
- Included: 3 highly relevant modules (~5,000 lines)
- Omitted: 981,000+ irrelevant lines
- A(x) = 0.94 (excellent focus)

RESULT:
- Context efficiency: 99.5% reduction in loaded content
- Found exact function in PRISM_PHYSICS_ENGINE.js line 45,892
- Response generated with precise, relevant information
```

## Scenario 2: Context Window Pressure

```
CONTEXT:
- Multiple files loaded for refactoring task
- Context at 85% capacity
- New query requires additional context

ATTN-001 FIRES:
- Current context: 85,000 tokens used
- Budget: 100,000 tokens
- Available: 15,000 tokens

ATTN-002 FIRES:
- New query needs ~20,000 tokens of new content
- Must prune 5,000+ tokens from current context

ATTENTION DECISION:
1. Rank all loaded content by current relevance
2. Identify lowest 10% by relevance
3. Prune items with relevance < 0.4
4. Load new high-relevance content

PRUNING EXECUTED:
- Removed: 3 low-relevance reference files (8,000 tokens)
- Added: New query-relevant content (18,000 tokens)
- Final: 95,000 tokens (95% capacity)
- A(x) = 0.82 (good, with efficiency trade-off)

RESULT:
- Successfully accommodated new context
- Maintained focus on task-relevant content
- Warning issued about context pressure
```

## Scenario 3: Scattered Focus Recovery

```
CONTEXT:
- User has been asking varied questions
- Context accumulated from multiple domains
- A(x) dropped to 0.35 (scattered)

ATTN-001 ASSESSMENT:
- 40% of context: materials data (various)
- 25% of context: machine specs (various)
- 20% of context: code snippets (mixed)
- 15% of context: documentation (scattered)
- Coherence: LOW

ATTN-002 FIRES (new focused query):
- "Help me optimize speed/feed for 4140 steel"
- Only 15% of current context is relevant

REFOCUS ACTION:
1. Save essential cross-cutting info to state
2. Clear low-relevance accumulated content
3. Load focused context:
   - 4140 steel material properties
   - Speed/feed calculation engine
   - Relevant machine capabilities
4. Rebuild context around new focus

POST-REFOCUS:
- A(x) improved: 0.35 → 0.88
- Context usage: 95,000 → 45,000 tokens (53% freed)
- Focus: Single coherent task context
- Ready for efficient response generation
```

---

# CONFIGURATION

## Adjustable Parameters

```javascript
const ATTENTION_CONFIG = {
  // Relevance thresholds
  relevance: {
    high: 0.7,
    medium: 0.4,
    low: 0.2
  },
  
  // Context allocation
  allocation: {
    primary: 0.50,    // Primary task content
    support: 0.30,    // Supporting context
    reference: 0.15,  // Reference material
    buffer: 0.05      // Safety buffer
  },
  
  // Decay parameters
  decay: {
    temporal_half_life: 7,  // Days for recency decay
    distance_sigma: 10      // Sections for distance decay
  },
  
  // A(x) thresholds
  Ax_thresholds: {
    excellent: 0.85,
    good: 0.70,
    acceptable: 0.50,
    poor: 0.30
  },
  
  // Auto-refocus trigger
  autoRefocus: {
    enabled: true,
    threshold: 0.40,  // Refocus if A(x) drops below
    cooldown: 5       // Minimum queries between refocus
  }
};
```

---

# ANTI-REGRESSION VERIFICATION

## MS-2 Checklist: All 18 Items Complete

- [x] 1. Create skill directory structure
- [x] 2. Write skill header (purpose, level, triggers)
- [x] 3. Define ATTN-001 hook (context:loaded → compute relevance)
- [x] 4. Define ATTN-002 hook (query:received → focus sections)
- [x] 5. Define ATTN-003 hook (output:generating → prioritize info)
- [x] 6. Relevance scoring algorithm
- [x] 7. Keyword extraction and weighting
- [x] 8. Semantic similarity computation
- [x] 9. Recency weighting (newer = more relevant)
- [x] 10. Dependency-based importance scoring
- [x] 11. Cross-reference importance amplification
- [x] 12. Context window optimization strategy
- [x] 13. Priority queue for information retrieval
- [x] 14. Attention decay function (time-based)
- [x] 15. A(x) computation formula
- [x] 16. Integration with context budget management
- [x] 17. Example attention focus scenarios (3 scenarios)
- [x] 18. Anti-regression verification

---

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**FOCUS ON WHAT MATTERS. IGNORE THE NOISE.**
**prism-attention-focus v1.0.0 | Cognitive Level 1 | A(x) Provider**
