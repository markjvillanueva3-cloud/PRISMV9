# PRISM MEMORY AUGMENTATION
## Cognitive Skill for Long-Term Context Persistence
### Level 1 Cognitive | Part of Cognitive Enhancement v7.0
### Version 1.0.0 | 2026-01-30

---

# OVERVIEW

## Purpose
Maintain long-term memory across sessions and manage context overflow.
Claude's context window is limited; this skill enables persistent memory
of important patterns, decisions, and state across conversations, ensuring
continuity and preventing loss of critical information.

## Level
**L1 Cognitive** - Loads for quality assessment, manages session continuity

## Triggers
- Session start (load relevant memories)
- Pattern learned (encode for future retrieval)
- Context overflow imminent (compress and persist)
- Cross-session reference needed
- State file operations

## Output
**M(x)** - Memory Quality Score (0.0 to 1.0)
- 1.0 = Perfect memory continuity, all relevant context preserved
- 0.7-0.99 = Good memory, minor gaps in recall
- 0.3-0.69 = Partial memory, significant information lost
- 0.0-0.29 = Poor memory, critical context missing

## Integration
```
Session Management Integration:
  M(x) informs how well we maintain continuity
  Higher M(x) = smoother session transitions
  Lower M(x) = need to rebuild context
  
Ω(x) Integration:
  M(x) contributes 0.05 weight to master equation
```

---

# HOOKS

## MEM-001: Session Start - Load Memories
```
Trigger: session:start
Action: Load relevant memories from persistent storage
Fires: At beginning of every session

Process:
1. Read CURRENT_STATE.json for session context
2. Identify relevant memory categories for task
3. Load high-priority memories first
4. Compute relevance scores for loaded memories
5. Prune low-relevance memories if space constrained
6. Build working memory context

Output: {
  memories_loaded: number,
  categories: string[],
  relevance_scores: Map<string, number>,
  context_tokens_used: number,
  M_x_initial: number
}
```

## MEM-002: Pattern Learned - Encode Memory
```
Trigger: pattern:learned
Action: Encode new pattern into persistent memory
Fires: When important pattern, decision, or insight discovered

Process:
1. Identify what was learned (pattern, decision, fact)
2. Classify memory type (procedural, factual, episodic)
3. Compute importance score
4. Encode with metadata (timestamp, context, confidence)
5. Store in appropriate memory category
6. Update memory index

Output: {
  memory_id: string,
  type: "procedural" | "factual" | "episodic",
  importance: number,
  encoded_at: timestamp,
  retrieval_cues: string[]
}
```

## MEM-003: Context Overflow - Compress and Persist
```
Trigger: context:overflow
Action: Compress current context and persist critical elements
Fires: When context window approaching limits (🟡 YELLOW zone)

Process:
1. Assess current context usage
2. Identify critical elements that must be preserved
3. Compress non-critical information (summarize)
4. Persist critical elements to CURRENT_STATE.json
5. Generate quick-resume instructions
6. Free context space for continued operation

Output: {
  original_tokens: number,
  compressed_tokens: number,
  compression_ratio: number,
  persisted_items: string[],
  quick_resume: string,
  M_x_preserved: number
}
```

---

# MEMORY ENCODING SCHEMA

## Memory Record Structure

```javascript
const MemoryRecord = {
  // Identification
  id: "MEM-{category}-{timestamp}-{hash}",
  version: "1.0",
  
  // Classification
  type: "procedural" | "factual" | "episodic" | "semantic",
  category: string,  // e.g., "materials", "debugging", "user_preferences"
  subcategory: string,
  
  // Content
  content: {
    summary: string,           // Brief description (< 100 chars)
    details: string | object,  // Full content
    context: string,           // When/why this was learned
    source: string             // Where this came from
  },
  
  // Metadata
  metadata: {
    created: timestamp,
    lastAccessed: timestamp,
    accessCount: number,
    importance: number,        // 0-1
    confidence: number,        // 0-1
    decay: number,             // Current decay factor
    tags: string[]
  },
  
  // Retrieval
  retrieval: {
    cues: string[],            // Keywords that trigger this memory
    associations: string[],    // Related memory IDs
    embedding: number[]        // Semantic embedding (optional)
  }
};
```

## Memory Categories

```javascript
const MEMORY_CATEGORIES = {
  // PROCEDURAL: How to do things
  procedural: {
    description: "Step-by-step procedures and workflows",
    examples: ["How to extract modules", "Debugging protocols", "File operations"],
    priority: 0.85,
    retention: "long"
  },
  
  // FACTUAL: Static facts
  factual: {
    description: "Facts, specifications, constants",
    examples: ["Material properties", "Machine specs", "API contracts"],
    priority: 0.80,
    retention: "permanent"
  },
  
  // EPISODIC: Specific events
  episodic: {
    description: "Specific events and their outcomes",
    examples: ["Session logs", "Errors encountered", "Decisions made"],
    priority: 0.70,
    retention: "medium"
  },
  
  // SEMANTIC: Conceptual understanding
  semantic: {
    description: "Conceptual relationships and meanings",
    examples: ["Causal relationships", "Domain concepts", "User preferences"],
    priority: 0.75,
    retention: "long"
  },
  
  // WORKING: Current session context
  working: {
    description: "Active context for current task",
    examples: ["Current file", "Current task", "Recent decisions"],
    priority: 0.95,
    retention: "session"
  }
};
```

## Importance Scoring

```javascript
function computeImportance(memory, context) {
  let importance = 0.5; // Base importance
  
  // Factor 1: Recency (newer = more important for working memory)
  const ageHours = (Date.now() - memory.metadata.created) / (1000 * 60 * 60);
  const recencyBoost = Math.exp(-ageHours / 168); // Half-life of 1 week
  importance += recencyBoost * 0.15;
  
  // Factor 2: Access frequency (more accessed = more important)
  const accessBoost = Math.min(0.2, memory.metadata.accessCount * 0.02);
  importance += accessBoost;
  
  // Factor 3: Category priority
  const categoryPriority = MEMORY_CATEGORIES[memory.category]?.priority || 0.5;
  importance += (categoryPriority - 0.5) * 0.3;
  
  // Factor 4: Relevance to current context
  if (context.currentTask) {
    const relevance = computeRelevance(memory, context.currentTask);
    importance += relevance * 0.25;
  }
  
  // Factor 5: Safety-critical flag
  if (memory.metadata.tags?.includes('safety-critical')) {
    importance += 0.3;
  }
  
  return Math.min(1, Math.max(0, importance));
}
```

---

# RETRIEVAL ALGORITHM

## Similarity-Based Retrieval

```javascript
function retrieveMemories(query, options = {}) {
  const {
    maxResults = 10,
    minRelevance = 0.3,
    categories = null,  // null = all categories
    recencyWeight = 0.3
  } = options;
  
  // Get all candidate memories
  let candidates = getAllMemories();
  
  // Filter by category if specified
  if (categories) {
    candidates = candidates.filter(m => categories.includes(m.category));
  }
  
  // Compute relevance scores
  const scored = candidates.map(memory => ({
    memory,
    relevance: computeRelevanceScore(memory, query),
    recency: computeRecencyScore(memory),
    combined: 0
  }));
  
  // Combine scores
  for (const item of scored) {
    item.combined = item.relevance * (1 - recencyWeight) + 
                    item.recency * recencyWeight;
  }
  
  // Filter and sort
  return scored
    .filter(item => item.combined >= minRelevance)
    .sort((a, b) => b.combined - a.combined)
    .slice(0, maxResults)
    .map(item => ({
      ...item.memory,
      _relevance: item.relevance,
      _recency: item.recency,
      _score: item.combined
    }));
}

function computeRelevanceScore(memory, query) {
  let score = 0;
  
  // Cue matching (exact keyword match)
  const queryCues = extractCues(query);
  const matchedCues = memory.retrieval.cues.filter(c => 
    queryCues.some(q => c.toLowerCase().includes(q.toLowerCase()))
  );
  score += matchedCues.length / Math.max(queryCues.length, 1) * 0.4;
  
  // Content similarity (TF-IDF or embedding)
  const contentSim = computeTextSimilarity(
    memory.content.summary + ' ' + JSON.stringify(memory.content.details),
    query
  );
  score += contentSim * 0.4;
  
  // Tag matching
  const queryTags = extractTags(query);
  const matchedTags = memory.metadata.tags?.filter(t =>
    queryTags.includes(t)
  ) || [];
  score += matchedTags.length * 0.1;
  
  // Association boost (connected memories)
  // (Would be implemented with full memory graph)
  
  return Math.min(1, score);
}

function computeRecencyScore(memory) {
  const ageMs = Date.now() - memory.metadata.lastAccessed;
  const ageHours = ageMs / (1000 * 60 * 60);
  
  // Exponential decay with 24-hour half-life for recency
  return Math.exp(-0.693 * ageHours / 24);
}
```

## Context-Aware Retrieval

```javascript
function retrieveForContext(context) {
  const memories = [];
  
  // 1. Task-relevant memories
  if (context.currentTask) {
    const taskMemories = retrieveMemories(context.currentTask.description, {
      maxResults: 5,
      categories: ['procedural', 'factual']
    });
    memories.push(...taskMemories);
  }
  
  // 2. Recent session memories
  const recentMemories = retrieveMemories('', {
    maxResults: 3,
    categories: ['episodic', 'working'],
    recencyWeight: 0.8
  });
  memories.push(...recentMemories);
  
  // 3. User preference memories
  const preferenceMemories = retrieveMemories('user preference', {
    maxResults: 2,
    categories: ['semantic']
  });
  memories.push(...preferenceMemories);
  
  // 4. Safety-critical memories (always include)
  const safetyMemories = getAllMemories().filter(m =>
    m.metadata.tags?.includes('safety-critical')
  );
  memories.push(...safetyMemories);
  
  // Deduplicate and sort by importance
  const unique = [...new Map(memories.map(m => [m.id, m])).values()];
  return unique.sort((a, b) => 
    computeImportance(b, context) - computeImportance(a, context)
  );
}
```

---

# CONSOLIDATION STRATEGY

## Memory Consolidation Process

```javascript
async function consolidateMemories() {
  // Run periodically or when memory store exceeds threshold
  
  const allMemories = getAllMemories();
  const consolidationActions = [];
  
  // 1. Merge similar memories
  const clusters = clusterSimilarMemories(allMemories);
  for (const cluster of clusters) {
    if (cluster.length > 1) {
      const merged = mergeMemories(cluster);
      consolidationActions.push({
        action: 'merge',
        from: cluster.map(m => m.id),
        to: merged.id
      });
    }
  }
  
  // 2. Decay old, unused memories
  for (const memory of allMemories) {
    const age = Date.now() - memory.metadata.lastAccessed;
    const ageWeeks = age / (1000 * 60 * 60 * 24 * 7);
    
    // Apply decay based on retention policy
    const retention = MEMORY_CATEGORIES[memory.category]?.retention;
    let decayRate;
    switch (retention) {
      case 'permanent': decayRate = 0; break;
      case 'long': decayRate = 0.01; break;
      case 'medium': decayRate = 0.05; break;
      case 'session': decayRate = 0.2; break;
      default: decayRate = 0.02;
    }
    
    memory.metadata.decay = Math.min(1, (memory.metadata.decay || 0) + 
                                      decayRate * ageWeeks);
    
    // Mark for deletion if fully decayed and not safety-critical
    if (memory.metadata.decay >= 1 && 
        !memory.metadata.tags?.includes('safety-critical')) {
      consolidationActions.push({
        action: 'delete',
        memory: memory.id,
        reason: 'fully_decayed'
      });
    }
  }
  
  // 3. Archive old episodic memories
  const episodicMemories = allMemories.filter(m => m.type === 'episodic');
  const oldEpisodic = episodicMemories.filter(m => {
    const age = Date.now() - memory.metadata.created;
    return age > 30 * 24 * 60 * 60 * 1000; // > 30 days
  });
  
  if (oldEpisodic.length > 50) {
    // Summarize and archive
    const summary = summarizeMemories(oldEpisodic);
    consolidationActions.push({
      action: 'archive',
      memories: oldEpisodic.map(m => m.id),
      summary: summary.id
    });
  }
  
  return consolidationActions;
}

function mergeMemories(memories) {
  // Create merged memory from cluster
  const merged = {
    id: generateMemoryId('merged'),
    type: memories[0].type,
    category: memories[0].category,
    content: {
      summary: memories.map(m => m.content.summary).join('; '),
      details: mergeDetails(memories.map(m => m.content.details)),
      context: 'Merged from ' + memories.length + ' similar memories',
      source: 'consolidation'
    },
    metadata: {
      created: Math.min(...memories.map(m => m.metadata.created)),
      lastAccessed: Math.max(...memories.map(m => m.metadata.lastAccessed)),
      accessCount: memories.reduce((sum, m) => sum + m.metadata.accessCount, 0),
      importance: Math.max(...memories.map(m => m.metadata.importance)),
      confidence: average(memories.map(m => m.metadata.confidence)),
      decay: Math.min(...memories.map(m => m.metadata.decay || 0)),
      tags: [...new Set(memories.flatMap(m => m.metadata.tags || []))]
    },
    retrieval: {
      cues: [...new Set(memories.flatMap(m => m.retrieval.cues))],
      associations: [...new Set(memories.flatMap(m => m.retrieval.associations))]
    }
  };
  
  return merged;
}
```

## Forgetting Curve Implementation

```javascript
function applyForgettingCurve(memory) {
  // Ebbinghaus forgetting curve: R = e^(-t/S)
  // R = retention, t = time, S = stability
  
  const timeSinceAccess = Date.now() - memory.metadata.lastAccessed;
  const timeHours = timeSinceAccess / (1000 * 60 * 60);
  
  // Stability increases with each access (spaced repetition effect)
  const baseStability = 24; // hours
  const accessBonus = memory.metadata.accessCount * 12; // hours per access
  const stability = baseStability + accessBonus;
  
  // Compute retention
  const retention = Math.exp(-timeHours / stability);
  
  return {
    retention,
    stability,
    timeHours,
    shouldRefresh: retention < 0.5 && memory.metadata.importance > 0.7
  };
}
```

---

# CONTEXT OVERFLOW HANDLING

## Compression Strategy

```javascript
async function handleContextOverflow(currentContext, targetReduction) {
  // Called when approaching context limits
  
  const compressionPlan = {
    originalTokens: currentContext.tokenCount,
    targetTokens: currentContext.tokenCount - targetReduction,
    actions: []
  };
  
  // Priority order for compression:
  // 1. Remove duplicate information
  // 2. Summarize verbose explanations
  // 3. Compress historical context
  // 4. Archive completed task details
  // 5. Persist and remove reference material
  
  let freedTokens = 0;
  
  // Step 1: Remove duplicates
  const duplicates = findDuplicateContent(currentContext);
  for (const dup of duplicates) {
    compressionPlan.actions.push({
      type: 'remove_duplicate',
      content: dup.summary,
      tokens: dup.tokens
    });
    freedTokens += dup.tokens;
  }
  
  if (freedTokens >= targetReduction) {
    return executeCompressionPlan(compressionPlan);
  }
  
  // Step 2: Summarize verbose sections
  const verbose = findVerboseSections(currentContext);
  for (const section of verbose) {
    if (freedTokens >= targetReduction) break;
    
    const summary = await summarize(section.content);
    const savedTokens = section.tokens - estimateTokens(summary);
    
    compressionPlan.actions.push({
      type: 'summarize',
      original: section.id,
      summary: summary,
      tokens_saved: savedTokens
    });
    freedTokens += savedTokens;
  }
  
  // Step 3: Archive to state file
  const archivable = findArchivableContent(currentContext);
  for (const item of archivable) {
    if (freedTokens >= targetReduction) break;
    
    // Persist to CURRENT_STATE.json
    await persistToState(item);
    
    compressionPlan.actions.push({
      type: 'archive',
      content: item.summary,
      persisted_to: 'CURRENT_STATE.json',
      tokens_freed: item.tokens
    });
    freedTokens += item.tokens;
  }
  
  compressionPlan.freedTokens = freedTokens;
  compressionPlan.finalTokens = currentContext.tokenCount - freedTokens;
  
  return executeCompressionPlan(compressionPlan);
}
```

## Priority Memory Protection

```javascript
const PROTECTED_MEMORY_TYPES = [
  // Always keep these in context
  {
    type: 'safety_critical',
    condition: m => m.metadata.tags?.includes('safety-critical'),
    reason: 'Safety-critical information must never be forgotten'
  },
  {
    type: 'current_task',
    condition: m => m.category === 'working' && m.metadata.importance > 0.8,
    reason: 'Current task context essential for continuity'
  },
  {
    type: 'user_corrections',
    condition: m => m.metadata.tags?.includes('user-correction'),
    reason: 'User corrections must be remembered to avoid repeating errors'
  },
  {
    type: 'blocking_issues',
    condition: m => m.metadata.tags?.includes('blocker'),
    reason: 'Blocking issues must remain visible'
  }
];

function isProtectedMemory(memory) {
  return PROTECTED_MEMORY_TYPES.some(p => p.condition(memory));
}

function getProtectionReason(memory) {
  const protection = PROTECTED_MEMORY_TYPES.find(p => p.condition(memory));
  return protection?.reason || null;
}
```

---

# CROSS-SESSION STATE PERSISTENCE

## State File Integration

```javascript
const STATE_SCHEMA = {
  // Core session state
  session: {
    id: string,
    started: timestamp,
    status: "active" | "paused" | "complete",
    phase: string
  },
  
  // Task state
  currentTask: {
    id: string,
    description: string,
    status: "pending" | "in_progress" | "blocked" | "complete",
    progress: number,  // 0-100
    checkpoints: Checkpoint[],
    nextSteps: string[]
  },
  
  // Memory state
  memory: {
    workingMemory: MemoryRecord[],  // Active context
    recentlyAccessed: string[],     // Memory IDs
    pendingConsolidation: string[], // Memories to consolidate
    lastConsolidation: timestamp
  },
  
  // Quick resume
  quickResume: string,  // Human-readable summary for next session
  
  // Cognitive metrics
  cognitiveMetrics: {
    Omega_x: number,
    R_x: number,
    C_x: number,
    P_x: number,
    S_x: number,
    L_x: number,
    A_x: number,
    M_x: number,
    K_x: number,
    D_x: number
  }
};

async function persistState(state) {
  const statePath = 'C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json';
  
  // Validate before write
  if (!validateStateSchema(state)) {
    throw new Error('Invalid state schema');
  }
  
  // Add timestamp
  state.lastUpdated = new Date().toISOString();
  
  // Write atomically (read, modify, write)
  await writeFileAtomic(statePath, JSON.stringify(state, null, 2));
  
  // Also update memory index
  await updateMemoryIndex(state.memory);
  
  return { success: true, path: statePath };
}

async function loadState() {
  const statePath = 'C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json';
  
  try {
    const content = await readFile(statePath);
    const state = JSON.parse(content);
    
    // Validate
    if (!validateStateSchema(state)) {
      console.warn('State file has invalid schema, using defaults');
      return getDefaultState();
    }
    
    return state;
  } catch (error) {
    console.warn('Could not load state file:', error.message);
    return getDefaultState();
  }
}
```

## Quick Resume Generation

```javascript
function generateQuickResume(state, completedWork, nextSteps) {
  const parts = [];
  
  // What was done
  if (completedWork.length > 0) {
    parts.push(`Completed: ${completedWork.join(', ')}`);
  }
  
  // Current status
  if (state.currentTask) {
    parts.push(`Task: ${state.currentTask.description} (${state.currentTask.progress}%)`);
  }
  
  // Key decisions made
  const decisions = state.memory?.workingMemory
    ?.filter(m => m.metadata.tags?.includes('decision'))
    ?.map(m => m.content.summary) || [];
  if (decisions.length > 0) {
    parts.push(`Decisions: ${decisions.join('; ')}`);
  }
  
  // Blockers
  const blockers = state.memory?.workingMemory
    ?.filter(m => m.metadata.tags?.includes('blocker'))
    ?.map(m => m.content.summary) || [];
  if (blockers.length > 0) {
    parts.push(`Blockers: ${blockers.join('; ')}`);
  }
  
  // Next steps
  if (nextSteps.length > 0) {
    parts.push(`Next: ${nextSteps.slice(0, 3).join(', ')}`);
  }
  
  return parts.join('. ');
}
```

---

# M(x) COMPUTATION FORMULA

## Main Computation

```javascript
function computeMx(memoryResults) {
  const factors = {
    continuity: 0,      // How well did we maintain session continuity?
    retrieval: 0,       // How effective was memory retrieval?
    preservation: 0,    // How much critical info was preserved?
    compression: 0      // How efficient was compression?
  };
  
  // 1. Continuity Score (0-1)
  // Did we successfully resume from previous session?
  factors.continuity = memoryResults.sessionResumed ? 
    (memoryResults.contextRecovered / memoryResults.contextExpected) : 0;
  
  // 2. Retrieval Score (0-1)
  // Were retrieved memories relevant?
  if (memoryResults.retrievals.length > 0) {
    const relevantRetrievals = memoryResults.retrievals.filter(r => r.wasUseful);
    factors.retrieval = relevantRetrievals.length / memoryResults.retrievals.length;
  } else {
    factors.retrieval = 1; // No retrievals needed = perfect
  }
  
  // 3. Preservation Score (0-1)
  // Was critical information preserved during compression?
  if (memoryResults.compressionOccurred) {
    const criticalPreserved = memoryResults.criticalItems.filter(i => i.preserved);
    factors.preservation = criticalPreserved.length / 
                           memoryResults.criticalItems.length;
  } else {
    factors.preservation = 1; // No compression = nothing lost
  }
  
  // 4. Compression Efficiency (0-1)
  // How much space did we save vs information lost?
  if (memoryResults.compressionOccurred) {
    const spaceRatio = memoryResults.tokensSaved / memoryResults.targetSavings;
    const infoLoss = 1 - factors.preservation;
    factors.compression = Math.max(0, spaceRatio - infoLoss);
  } else {
    factors.compression = 1; // No compression needed
  }
  
  // Weighted combination
  const weights = {
    continuity: 0.35,
    retrieval: 0.25,
    preservation: 0.25,
    compression: 0.15
  };
  
  let Mx = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    Mx += (factors[factor] || 0) * weight;
  }
  
  return Math.min(1, Math.max(0, Mx));
}
```

## Integration with Session Management

```javascript
function integrateMxWithSession(Mx, sessionStatus) {
  // M(x) affects session quality assessment
  
  if (Mx < 0.3) {
    return {
      status: 'DEGRADED',
      message: 'Memory quality low - context may be incomplete',
      recommendation: 'Re-read relevant files, check CURRENT_STATE.json',
      action: 'REBUILD_CONTEXT'
    };
  }
  
  if (Mx < 0.5) {
    return {
      status: 'PARTIAL',
      message: 'Some memory gaps detected',
      recommendation: 'Verify critical information before proceeding',
      action: 'VERIFY_CRITICAL'
    };
  }
  
  if (Mx < 0.7) {
    return {
      status: 'ACCEPTABLE',
      message: 'Memory mostly intact with minor gaps',
      recommendation: 'Proceed with caution, double-check assumptions',
      action: 'PROCEED_CAREFUL'
    };
  }
  
  return {
    status: 'GOOD',
    message: 'Memory continuity maintained',
    recommendation: 'Continue normally',
    action: 'PROCEED'
  };
}
```

---

# INTEGRATION POINTS

## With CURRENT_STATE.json

```
Memory ↔ State File Integration:

SESSION START:
1. MEM-001 fires → reads CURRENT_STATE.json
2. Loads quickResume into working memory
3. Reconstructs task context
4. M(x) measures reconstruction quality

DURING SESSION:
1. MEM-002 fires on important patterns
2. Updates working memory
3. Periodic state file updates

SESSION END / OVERFLOW:
1. MEM-003 fires if approaching limits
2. Compresses and persists to state file
3. Generates quickResume for next session
4. M(x) measures preservation quality
```

## With Master Equation (prism-master-equation)

```
M(x) is a component in Ω(x):
Ω(x) = 0.20·R + 0.15·C + 0.10·P + 0.25·S + 0.05·L + 0.08·A + 0.05·M + 0.07·K + 0.05·D

M(x) weight: 0.05 (5% of total quality score)

Effect on overall quality:
- High M(x) (>0.8): Excellent session continuity
- Medium M(x) (0.5-0.8): Acceptable with minor gaps
- Low M(x) (<0.5): Poor continuity, rebuilding required
```

## With Buffer Zone Management

```
Buffer Zone Integration:

🟢 GREEN (0-8 calls):
  - Normal memory operations
  - M(x) tracking passive

🟡 YELLOW (9-14 calls):
  - MEM-003 prepares for potential overflow
  - Pre-computes compression plan
  - Updates state file proactively

🔴 RED (15-18 calls):
  - MEM-003 executes compression
  - Persists all critical memories
  - Generates comprehensive quickResume

⚫ CRITICAL (19+ calls):
  - Emergency memory dump
  - Maximum compression
  - Only safety-critical memories retained
```

---

# EXAMPLE SCENARIOS

## Scenario 1: Session Resume

```
CONTEXT:
- New session starting
- Previous session ended mid-task
- CURRENT_STATE.json contains partial progress

MEM-001 FIRES (session:start):
- Reads CURRENT_STATE.json
- quickResume: "Materials extraction 60% complete. 
  Completed: Carbon steels (50), Alloy steels (45).
  In progress: Tool steels. Next: Stainless steels."

MEMORY RECONSTRUCTION:
- Loads task context into working memory
- Retrieves relevant procedural memories (extraction workflow)
- Loads material schema from factual memory
- Restores progress counters

M(x) COMPUTATION:
- contextRecovered: 0.92 (most context restored)
- contextExpected: 1.0
- Continuity score: 0.92

RESULT:
- M(x) = 0.88
- Status: GOOD
- Claude resumes from exact checkpoint
- No work is repeated
```

## Scenario 2: Context Overflow

```
CONTEXT:
- Long session with many files loaded
- Context at 92% capacity
- User requests additional file load

MEM-003 FIRES (context:overflow):
- Assesses: Need 15,000 tokens, have 8,000 available
- Target compression: 10,000 tokens

COMPRESSION PLAN:
1. Remove 3 duplicate code sections: 4,000 tokens
2. Summarize verbose explanations: 3,000 tokens
3. Archive completed task details: 5,000 tokens

EXECUTION:
- Duplicates removed: ✓
- Summaries created: ✓
- Archives persisted to state file: ✓
- quickResume updated: ✓

M(x) COMPUTATION:
- criticalItems: 8
- preserved: 8 (100%)
- tokensSaved: 12,000
- targetSavings: 10,000

RESULT:
- M(x) = 0.91
- Compression successful
- All critical information preserved
- Context freed for new content
```

## Scenario 3: Pattern Learning

```
CONTEXT:
- Debugging session discovered important pattern
- Pattern: "FANUC alarms in 1000-series indicate servo issues"

MEM-002 FIRES (pattern:learned):
- Content: "FANUC 1000-series alarms = servo issues"
- Type: factual
- Category: controllers
- Importance: 0.85 (useful for future debugging)

ENCODING:
- Memory ID: MEM-factual-20260130-abc123
- Cues: ["FANUC", "1000", "servo", "alarm"]
- Tags: ["fanuc", "servo", "alarm", "debugging"]

FUTURE RETRIEVAL:
- Query: "Why is my FANUC showing alarm 1025?"
- MEM-001 retrieves this memory
- Relevance: 0.92 (strong cue match)
- Used in response: Yes

M(x) IMPACT:
- Pattern successfully encoded
- Successfully retrieved when needed
- Retrieval score: 1.0 (was useful)
```

---

# ANTI-REGRESSION VERIFICATION

## MS-4 Checklist: All 17 Items Complete

- [x] 1. Create skill directory structure
- [x] 2. Write skill header (purpose, level, triggers)
- [x] 3. Define MEM-001 hook (session:start → load memories)
- [x] 4. Define MEM-002 hook (pattern:learned → encode memory)
- [x] 5. Define MEM-003 hook (context:overflow → compress/persist)
- [x] 6. Memory encoding schema (JSON structure)
- [x] 7. Memory categories (procedural, factual, episodic, semantic, working)
- [x] 8. Importance scoring algorithm
- [x] 9. Retrieval algorithm (similarity + recency)
- [x] 10. Consolidation strategy (merge, decay, archive)
- [x] 11. Forgetting curve implementation
- [x] 12. Context overflow compression strategy
- [x] 13. Priority memory protection
- [x] 14. Cross-session state persistence
- [x] 15. M(x) computation formula
- [x] 16. Integration with CURRENT_STATE.json
- [x] 17. Example memory scenarios (3 scenarios)

---

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**REMEMBER WHAT MATTERS. FORGET WHAT DOESN'T.**
**prism-memory-augmentation v1.0.0 | Cognitive Level 1 | M(x) Provider**
