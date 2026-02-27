---
name: prism-memory-augmentation
description: |
  Session continuity for M(x) score. 5 memory types with retrieval algorithms.
---

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

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**REMEMBER WHAT MATTERS. FORGET WHAT DOESN'T.**
**prism-memory-augmentation v1.0.0 | Cognitive Level 1 | M(x) Provider**
