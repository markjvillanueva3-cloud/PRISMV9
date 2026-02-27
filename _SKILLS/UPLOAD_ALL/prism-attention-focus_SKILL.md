---
name: prism-attention-focus
description: |
  Context prioritization for A(x) score. Manages 100K token context window efficiently.
---

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

# VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-30 | Initial creation as part of Cognitive Enhancement v7.0 |

---

**FOCUS ON WHAT MATTERS. IGNORE THE NOISE.**
**prism-attention-focus v1.0.0 | Cognitive Level 1 | A(x) Provider**
