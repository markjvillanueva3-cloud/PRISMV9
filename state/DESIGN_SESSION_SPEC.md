# DESIGN_SESSION_SPEC.md
## R3-MS4.5-T1: `design_session` Action Specification

### Overview
The `design_session` action is added to `prism_dev` dispatcher. It loads structured planning context for a given roadmap phase/topic, enabling Claude Code sessions to bootstrap with the right architectural context without manual file reads.

### Problem
Each new session spends 5-15 tool calls reading CURRENT_POSITION.md, PHASE docs, ENGINE files, and test results before productive work begins. `design_session` consolidates this into a single MCP call that returns exactly the context needed for a given topic.

### Input Schema
```typescript
{
  action: "design_session",
  params: {
    // Required: What phase are we working on?
    phase: string,           // e.g. "R3", "R2", "R4"

    // Required: What topic/milestone within the phase?
    topic: string,           // e.g. "MS4.5", "MS5", "InferenceChainEngine"

    // Optional: Constraints or focus areas
    constraints?: string[],  // e.g. ["no-api-calls", "pure-computation", "must-pass-ralph"]

    // Optional: What kind of session is this?
    session_type?: "planning" | "implementation" | "review" | "debugging",
    // default: "planning"

    // Optional: Include file contents or just references?
    include_sources?: boolean,  // default: false (just paths + summaries)
  }
}
```

### Output Schema
```typescript
{
  session_id: string,          // Unique session ID (timestamp-based)
  phase: string,               // Echo back
  topic: string,               // Echo back

  // Current position context
  position: {
    current_phase: string,     // From CURRENT_POSITION.md
    last_commit: string,       // Latest commit hash + message
    build_status: string,      // Last known build status
    test_summary: string,      // e.g. "90/90 R3 + 150/150 R2"
  },

  // Relevant roadmap section
  roadmap: {
    milestone: string,         // Milestone name
    tasks: Array<{
      id: string,              // e.g. "MS4.5-T1"
      description: string,     // Task description
      status: string,          // "pending" | "in_progress" | "complete"
      gate: string,            // "YOLO" | "GATED"
      executor: string,        // "Chat" | "Code"
      model: string,           // "opus" | "sonnet" | "haiku"
    }>,
    dependencies: string[],    // What must be done first
    provides: string[],        // What this unblocks
  },

  // Relevant files for this topic
  files: {
    read: string[],            // Files to read (engines, dispatchers)
    write: string[],           // Files to create/modify
    test: string[],            // Test files to run
  },

  // Architecture context
  architecture: {
    patterns: string[],        // Relevant architecture patterns
    constraints: string[],     // Hard constraints (e.g. "pure computation", "zero imports")
    decisions: string[],       // Relevant past decisions from ADRs
  },

  // Previous decisions for this topic (if any)
  decision_history: Array<{
    timestamp: string,
    decision: string,
    rationale: string,
  }>,

  // Recommended next steps
  next_steps: string[],
}
```

### State File Format
Decisions made during a design session are written to:
`state/design-sessions/{session_id}.json`

```typescript
{
  session_id: string,
  created_at: string,        // ISO timestamp
  phase: string,
  topic: string,
  decisions: Array<{
    timestamp: string,
    decision: string,
    rationale: string,
    confidence: number,      // 0.0-1.0
  }>,
  status: "active" | "completed" | "abandoned",
}
```

### Implementation Notes

1. **Data Sources**: The action reads from:
   - `data/docs/roadmap/CURRENT_POSITION.md` — current state
   - `data/docs/roadmap/PHASE_{phase}_v19.md` — phase roadmap
   - `data/docs/roadmap/RALPH_AUDIT_LOG.md` — validation history
   - `state/design-sessions/` — prior design sessions for this topic
   - Git log (last 5 commits) — recent activity

2. **Parsing Strategy**:
   - CURRENT_POSITION.md is structured markdown — parse key fields with regex
   - PHASE docs use the `TASK: MS*-T*` code blocks — extract task metadata
   - Match tasks by milestone prefix (e.g. "MS4.5" matches "MS4.5-T1", "MS4.5-T2", etc.)

3. **Integration with devDispatcher**:
   - Add "design_session" to the ACTIONS const
   - Case handler parses phase+topic, loads context, returns structured JSON
   - On first call: creates session file; subsequent calls append decisions

4. **File Map Resolution**: Use `FILE_MAP.json` to resolve topic→files mappings

5. **Size Budget**: Response should be <2000 tokens for planning sessions. Use `include_sources: true` only when implementation context is needed.

### Usage Patterns

```
# Start a planning session
prism_dev design_session phase=R3 topic=MS4.5 session_type=planning

# Get implementation context with source contents
prism_dev design_session phase=R3 topic=MS4.5-T2 session_type=implementation include_sources=true

# Review session with constraints
prism_dev design_session phase=R3 topic=MS5 session_type=review constraints=["ralph-gate","omega-threshold"]
```

### Registration Checklist
- [x] Input schema defined
- [x] Output schema defined
- [x] State file format defined
- [x] Data sources identified
- [x] Integration point (devDispatcher) specified
- [x] Size budget specified
