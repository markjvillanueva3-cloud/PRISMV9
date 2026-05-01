# ATCS + Manus Merge — Deep Dive Gap Analysis
## PRISM Autonomous Execution Architecture Brainstorm
**Date:** 2026-02-07 | **Session:** 49 | **Author:** Claude + Mark

---

## 1. EXECUTIVE DISCOVERY

After reading every line of both dispatchers, I found something critical:

**We don't need Manus at all.**

Here's why:
- `manusDispatcher.ts` (148 lines) is a thin REST client to `open.manus.ai`
- `MANUS_MCP_API_KEY` is **NOT configured** in `.env`
- The Manus API is an external dependency we don't control
- Meanwhile, we ALREADY have:
  - `AgentExecutor.ts` (819 lines) — full agent lifecycle with **real Anthropic API calls**
  - `SwarmExecutor.ts` (954 lines) — 8 coordination patterns (parallel, consensus, map_reduce, etc.)
  - `AgentRegistry` — 64 agents across 3 tiers (18 OPUS, 37 SONNET, 9 HAIKU)
  - `ANTHROPIC_API_KEY` — **IS configured and working**
  - `parallelAPICalls()` utility — concurrent Claude API calls with proper error handling

**The real merge is: ATCS state machine + AgentExecutor/SwarmExecutor execution**

This keeps everything in-house, uses existing infrastructure, and avoids external dependencies.

---

## 2. ARCHITECTURE OVERVIEW

### Current State
```
ATCS (State Machine)          Manus (External API)         Orchestration (Internal API)
├── task_init                  ├── create_task ──→ Manus.ai  ├── agent_execute ──→ Claude API ✅
├── task_resume                ├── task_status               ├── agent_parallel ──→ Claude API ✅
├── queue_next                 ├── task_result               ├── swarm_execute ──→ Claude API ✅
├── unit_complete              ├── cancel_task               ├── swarm_consensus
├── batch_validate             ├── web_research              ├── swarm_pipeline
├── checkpoint                 ├── code_sandbox              └── 8 swarm patterns
├── replan                     └── hook_trigger/list/chain
├── assemble
└── stub_scan

File System State ✅           No API Key ❌                 API Key Working ✅
Quality Gates ✅               No Quality ❌                 No State Machine ❌
No Execution ❌                Has Execution ❌              Has Execution ✅
```

### Proposed State
```
prism_autonomous (New Dispatcher #24)
├── ATCS State Machine (filesystem, manifests, queues)
├── AgentExecutor Bridge (dispatches units → Claude API calls)
├── Quality Pipeline (stub scan → acceptance → Ralph → omega)
├── Monitoring (real-time status, cost tracking, rate limiting)
└── Safety Gates (escalation, circuit breaker, human-in-loop)
```

---

## 3. GAP INVENTORY — 23 GAPS IDENTIFIED

### Category A: Execution Bridge (Gaps 1-5)

**GAP 1: No Auto-Dispatch Mechanism**
- ATCS `queue_next` returns units but relies on the CONVERSATION to do the work
- Need: A function that takes a WorkUnit, crafts a prompt, sends it to AgentExecutor, returns result
- Complexity: Medium — the bridge function is straightforward, prompt engineering is the hard part
- Code location: New `AutonomousExecutor.ts` engine or added to `atcsDispatcher.ts`

**GAP 2: Agent-to-Unit Mapping**
- ATCS work units have { type, description } — agents have { system_prompt, capabilities }
- Need: A mapping layer that selects the right agent(s) for each unit type
- Example: unit.type="material_verification" → agent="materials_expert" (OPUS tier)
- Example: unit.type="formula_validation" → agent="precision_validator" + "math_checker" (swarm consensus)
- Complexity: Medium — need a routing table or smart matcher

**GAP 3: Result Collection Bridge**  
- Agent output (JSON from Claude API) needs to flow into `unit_complete(task_id, unit_id, output)`
- Need: Auto-parsing of agent responses into structured unit output format
- Risk: Agent may return markdown, freeform text, or malformed JSON
- Solution: Response schema enforcement + fallback parsing + stub scan on result

**GAP 4: Prompt Engineering for Work Units**
- Each unit needs a well-crafted prompt including:
  - Unit description and acceptance criteria
  - Relevant domain context (material data, machine specs, formulas)
  - Quality requirements (zero tolerance policy text)
  - Output schema specification
  - Examples of good vs bad output
- Need: A prompt template system with dynamic context injection
- Complexity: HIGH — this is where quality lives or dies
- Consider: Should the template be stored per-task in the ATCS task directory?

**GAP 5: Execution Mode Selection**
- Some units are independent → parallel execution via `agent_parallel`
- Some units depend on others → sequential via `agent_pipeline` 
- Some need consensus → swarm with consensus pattern
- ATCS already has `dependency_mode: "independent" | "sequential" | "dag"` in manifest
- Need: Auto-selection of execution strategy based on manifest config
- The DAG mode is particularly tricky — topological sort + parallel where possible

### Category B: Tool & Context Access (Gaps 6-9)

**GAP 6: Agents Cannot Call MCP Tools — CRITICAL**
- Agents executing via Anthropic API are isolated Claude instances
- They CANNOT call prism_data, prism_calc, prism_safety, etc.
- They cannot look up material data, verify formulas, check machine specs
- This is the SINGLE BIGGEST GAP
- Options:
  a) Pre-load all needed context into each agent's prompt (token expensive)
  b) Give agents tool_use via the Anthropic API (agents get tools[] parameter)
  c) Multi-turn agent execution with tool call resolution
  d) Hybrid: pre-load common data, use tools for specific lookups
- Recommendation: Option (b) with curated tool definitions
  - Define a subset of PRISM tools as JSON schemas for agent tool_use
  - Agent makes tool calls → execution engine resolves them against MCP
  - Agent gets tool results → continues reasoning
  - This is essentially building a mini-MCP-client inside the executor
- Complexity: VERY HIGH — essentially building an inner tool loop
- Alternative: Skip tool access entirely, require all context in the prompt
  - Pro: Much simpler
  - Con: Token cost explodes for data-heavy tasks, agents can't verify

**GAP 7: Context Window Management Per Unit**
- Each Claude API call has a context window limit
- For a material verification unit, the agent might need:
  - Material data (127 parameters × N materials)
  - Related formulas
  - Machine compatibility data
  - Historical test results
- Need: Context budget calculator per unit type
- Need: Smart context selection — only include relevant data
- Ties into Gap 6: if agents have tool access, context is smaller

**GAP 8: Knowledge Injection Strategy**
- PRISM has 515 formulas, 2805 materials, 402 machines, 10033 alarms
- An agent verifying material data needs the relevant formula and reference values
- Options:
  a) Full registry dump (impossible — too large)
  b) Pre-computed context packages per unit (feasible for structured tasks)
  c) Agent tool access to registries (ideal but complex, see Gap 6)
  d) Two-pass: first pass identifies needed data, second pass executes with data
- Recommendation: Pre-computed context packages for v1, tool access for v2

**GAP 9: Manufacturing-Specific Prompts**
- Agents need manufacturing domain expertise baked into their prompts
- "Verify this Kienzle coefficient" means nothing to a generic Claude instance
- Need: Domain-specific system prompts per agent category
- The AgentRegistry already has `system_prompt` fields — but are they populated?
- Need to audit and enhance all 64 agent system prompts for autonomous execution

### Category C: Quality & Safety (Gaps 10-14)

**GAP 10: Quality Pipeline Integration**
- Current flow: unit_complete → stub scan → acceptance criteria → done
- Needed flow: unit_complete → stub scan → acceptance → Ralph Loop → Omega → done
- Ralph Loop requires API key (available ✅) but runs as separate calls
- Need: Automatic Ralph invocation within batch_validate
- Currently batch_validate says "call prism_ralph separately" — this needs to be automated

**GAP 11: Safety Escalation Protocol**
- When an agent is uncertain about a safety-critical value, it should NOT guess
- Current ATCS has NEEDS_RESEARCH status — but no automatic escalation
- Need: Safety classifier on agent outputs
  - If output involves force calculations, spindle limits, collision zones → extra validation
  - If agent confidence < threshold → auto-escalate to human review
- Ties into prism_safety dispatcher — should agent outputs be auto-validated?

**GAP 12: Circuit Breaker / Budget Control**
- Each API call costs money (OPUS ~$15/1M input, $75/1M output tokens)
- A 2805-unit task with 3 retries each = up to 8415 API calls
- At ~2000 tokens average = ~16M tokens ≈ $240-1200 depending on tier
- Need: Budget limits (max cost per task, per batch, per unit)
- Need: Circuit breaker (stop if failure rate > threshold, like 50% in a batch)
- ATCS has REPLAN_FAILURE_THRESHOLD at 30% — good, but needs to stop spending too
- Need: Token usage tracking per task (input_tokens, output_tokens, total_cost)

**GAP 13: Audit Trail Enhancement**
- ATCS has EXECUTION_LOG.md — text-based log
- For autonomous execution, need:
  - Full prompt sent to each agent
  - Full response received
  - Token counts per call
  - Model used per call
  - Latency per call
  - Tool calls made by agents (if tool access enabled)
- Consider: Structured JSON audit log alongside the text log
- Compliance requirement: "If a CNC machine gets bad parameters, we need to trace WHY"

**GAP 14: Anti-Regression on Autonomous Output**
- Autonomous execution could produce output that regresses vs. existing data
- Example: Agent says "Ti-6Al-4V hardness = 300 HRC" when existing data says 341 HRC
- Need: Pre-load existing values as "known good" baselines
- Agent must explain any deviation from baseline
- Consider: Diff-based validation (compare autonomous output vs. existing registry data)

### Category D: Concurrency & Infrastructure (Gaps 15-19)

**GAP 15: Concurrent File System Access**
- ATCS state lives on disk (TASK_MANIFEST.json, WORK_QUEUE.json)
- If multiple agent results arrive simultaneously (from parallel execution), writes could conflict
- Node.js is single-threaded so within one process this is OK
- BUT if we use worker threads or subprocesses, we get real race conditions
- Need: Either sequential result collection, or file-level locking
- Simplest: Process results sequentially even if agents ran in parallel
- The `writeJSON` calls are synchronous (`fs.writeFileSync`) — safe within process

**GAP 16: Rate Limiting & Throttling**
- Anthropic API has rate limits (varies by plan, typically 60-300 RPM)
- Parallel batch execution could exceed limits
- `parallelAPICalls()` in api-config.ts fires all at once with Promise.all
- Need: Request throttling (e.g., max 10 concurrent, 50ms delay between starts)
- Need: Exponential backoff on 429 errors
- AgentExecutor already has retry logic — but does it handle rate limits specifically?

**GAP 17: Background Execution Model**
- MCP tools are synchronous — tool call → result in same turn
- A 20-unit batch takes 20+ API calls, each 5-30 seconds = 100-600 seconds
- This BLOCKS the current conversation for potentially 10 minutes
- Options:
  a) Accept blocking — run batch, return all results (simplest)
  b) Worker thread — Node.js worker_threads for background execution
  c) Subprocess — spawn a separate Node process with the executor
  d) Chunked returns — execute 5 units, return partial status, user says "continue"
  e) Webhook pattern — start execution, return immediately, user polls later
- Recommendation for v1: Option (d) — chunked execution with conversational checkpoint
  - Execute N units per tool call (configurable, default 5)
  - Return partial results + progress
  - User says "continue" → next chunk
  - This aligns with existing ATCS session pattern
- Recommendation for v2: Option (b) — worker thread with status polling
  - prism_autonomous action=execute_background → starts worker
  - prism_autonomous action=status → polls worker state
  - prism_autonomous action=results → gets completed results
  - Need: SharedArrayBuffer or message passing for state sync

**GAP 18: Session Recovery After Failure**
- What if Claude Desktop crashes mid-batch?
- ATCS has checkpoints ✅ and file system state ✅
- But in-flight API calls are lost — agents that were mid-execution won't return
- Need: Write IN_PROGRESS marker with timestamp before each API call
- On resume: Any IN_PROGRESS unit older than timeout → mark FAILED, requeue
- ATCS `task_resume` already handles this pattern somewhat

**GAP 19: Memory/Context Pressure During Autonomous Execution**
- The autoHookWrapper tracks context pressure (🟢🟡🔴⚫ zones)
- Autonomous execution generates LOTS of response data
- Each agent result could be 1-5KB of JSON
- 20 units = 20-100KB of results in one conversation turn
- Need: Results written to disk immediately, NOT accumulated in context
- ATCS already does this (output/ directory) — but the bridge needs to do it too
- The autoHookWrapper's black zone emergency save already handles ATCS tasks ✅

### Category E: Architecture & Integration (Gaps 20-23)

**GAP 20: New Dispatcher vs. Extension**
- Option A: New `prism_autonomous` dispatcher (#24)
  - Pro: Clean separation, focused responsibility
  - Pro: Can evolve independently
  - Con: Another dispatcher to maintain, more KNOWN_RENAMES
  - Actions: auto_execute, auto_status, auto_pause, auto_resume, auto_config
- Option B: Extend ATCS with new actions
  - Pro: Single source of truth for autonomous tasks
  - Pro: Leverages existing state machine
  - Con: ATCS dispatcher grows significantly (already 1153 lines)
  - New actions: auto_execute_batch, auto_configure, auto_status_live
- Option C: Wrapper that coordinates ATCS + Orchestration
  - Pro: No code changes to existing dispatchers
  - Pro: Composable
  - Con: Coordination complexity
- Recommendation: Option A — new dispatcher that imports from ATCS and AgentExecutor
  - ATCS remains the state machine (file I/O, manifests, queues)
  - AgentExecutor remains the execution engine (API calls, retries)
  - New dispatcher is the BRIDGE with autonomous logic

**GAP 21: Swarm Pattern Selection Per Task Type**
- Different tasks benefit from different swarm patterns:
  - Material verification → consensus (multiple agents verify, majority wins)
  - Formula calculation → competition (best accuracy wins)
  - Data extraction → parallel (independent units)
  - Process optimization → collaboration (iterative improvement)
- ATCS manifest needs a `swarm_pattern` field per unit type
- Or: auto-select based on unit characteristics

**GAP 22: Manus Retention Strategy**
- Even though internal execution is better, Manus has unique capabilities:
  - `web_research` — agents that can browse the web for data
  - `code_sandbox` — isolated code execution environment
- For material data verification, web research could find datasheets
- Decision: Keep Manus as an OPTIONAL executor alongside internal agents
- The autonomous dispatcher could support multiple execution backends:
  - `backend: "internal"` → AgentExecutor (default)
  - `backend: "manus"` → Manus API (when configured)
  - `backend: "hybrid"` → Internal for computation, Manus for research

**GAP 23: Testing & Validation Framework**
- How do we test autonomous execution without burning API tokens?
- Need: Mock execution mode (returns synthetic results for testing)
- Need: Dry-run mode (shows what would be dispatched without executing)
- Need: Small-batch pilot (execute 3-5 units to validate quality before full run)
- ATCS batch_size parameter supports this — set batch_size=3 for pilot
- But need a `auto_execute(mode="dry_run")` option

---

## 4. PRIORITY MATRIX

| Gap | Severity | Effort | Blocks Others? | Priority |
|-----|----------|--------|----------------|----------|
| G6: Tool Access | CRITICAL | Very High | Yes (G7,G8) | P0 — Decide approach first |
| G1: Auto-Dispatch | HIGH | Medium | Yes (everything) | P0 |
| G4: Prompt Engineering | HIGH | High | Yes (quality) | P0 |
| G3: Result Collection | HIGH | Low | Yes (G10) | P1 |
| G12: Circuit Breaker | HIGH | Medium | No | P1 |
| G10: Quality Pipeline | HIGH | Medium | No | P1 |
| G17: Background Model | MEDIUM | High | No | P1 |
| G2: Agent Mapping | MEDIUM | Medium | Partial | P2 |
| G11: Safety Escalation | MEDIUM | Medium | No | P2 |
| G13: Audit Trail | MEDIUM | Low | No | P2 |
| G16: Rate Limiting | MEDIUM | Low | No | P2 |
| G15: Concurrency | LOW | Low | No | P3 |
| G14: Anti-Regression | MEDIUM | Medium | No | P2 |
| G5: Execution Mode | MEDIUM | Medium | No | P2 |
| G20: Dispatcher Design | HIGH | Medium | Yes (arch) | P0 |
| G8: Knowledge Injection | MEDIUM | High | No | P2 |
| G9: Mfg Prompts | MEDIUM | High | No | P2 |
| G18: Session Recovery | LOW | Low | No | P3 |
| G19: Context Pressure | LOW | Low | No | P3 |
| G21: Swarm Selection | LOW | Medium | No | P3 |
| G22: Manus Retention | LOW | Low | No | P3 |
| G23: Testing Framework | MEDIUM | Medium | No | P2 |
| G7: Context Per Unit | MEDIUM | Medium | No | P2 |

---

## 5. THE CRITICAL DECISION: Agent Tool Access (Gap 6)

This is the fork in the road. Everything else depends on this choice.

### Option A: "Fat Prompt" — No Tool Access
```
┌─────────────────────────────┐
│ Agent Prompt                │
│ ┌─────────────────────────┐ │
│ │ System: Manufacturing   │ │
│ │ expert, zero tolerance  │ │
│ ├─────────────────────────┤ │
│ │ Context: Pre-loaded     │ │
│ │ • Material data (5KB)   │ │
│ │ • Relevant formulas     │ │
│ │ • Acceptance criteria   │ │
│ │ • Known good values     │ │
│ ├─────────────────────────┤ │
│ │ Task: Verify/compute X  │ │
│ └─────────────────────────┘ │
│         ↓                   │
│   Single API call           │
│         ↓                   │
│   Structured JSON output    │
└─────────────────────────────┘
```
- **Pro**: Simple, fast, predictable token cost
- **Pro**: Each call is self-contained, easy to retry
- **Pro**: No inner tool loop complexity
- **Con**: Must pre-compute ALL needed context (what if we miss something?)
- **Con**: Large prompts for data-heavy units (10-50K tokens)
- **Con**: Agent can't "look things up" — must reason from given context only
- **Best for**: Structured tasks where inputs are known (verification, calculation, extraction)

### Option B: "Agent with Tools" — Claude API tool_use
```
┌───────────────────────────────┐
│ Agent Prompt + Tools[]        │
│ ┌───────────────────────────┐ │
│ │ System: Expert + tools    │ │
│ ├───────────────────────────┤ │
│ │ Tools: [                  │ │
│ │   material_lookup,        │ │
│ │   formula_calculate,      │ │
│ │   safety_check            │ │
│ │ ]                         │ │
│ ├───────────────────────────┤ │
│ │ Task: Verify material X   │ │
│ └───────────────────────────┘ │
│         ↓                     │
│   API call #1: Agent thinks   │
│   → tool_use: material_lookup │
│         ↓                     │
│   Executor resolves tool call │
│   → returns tool result       │
│         ↓                     │
│   API call #2: Agent continues│
│   → final structured output   │
└───────────────────────────────┘
```
- **Pro**: Agents can look up any data they need
- **Pro**: Smaller initial prompts (agent fetches what it needs)
- **Pro**: More intelligent — agent can verify its own work
- **Con**: Multi-turn = higher latency (2-5x per unit)
- **Con**: More tokens total (tool calls + results + reasoning)
- **Con**: Complex inner loop (resolve tool calls, handle errors)
- **Con**: Agent might make unnecessary tool calls (cost spiral)
- **Best for**: Complex, open-ended tasks where needed data isn't known upfront

### Option C: "Hybrid" — Pre-load + Selective Tools
```
Pre-load common context (material basics, task params)
+ Give agent 2-3 targeted tools for edge cases
+ Tool call budget: max 3 tool calls per unit
```
- **Pro**: Best of both worlds
- **Pro**: Controlled cost (tool call budget)
- **Pro**: Works for most task types
- **Con**: Need to decide what to pre-load vs. make tool-accessible
- **Recommendation**: This is the right answer for v1

### My Recommendation: Option C (Hybrid) for v1, Option B for v2

---

## 6. PROPOSED IMPLEMENTATION PLAN

### Phase 1: Foundation (New Dispatcher + Bridge)
**Estimated effort: 1-2 sessions**
1. Create `autonomousDispatcher.ts` (dispatcher #24)
2. Implement core actions:
   - `auto_execute_batch` — take ATCS batch, dispatch to agents, collect results
   - `auto_configure` — set execution parameters (backend, tool budget, batch size)
   - `auto_status` — live progress of executing batch
   - `auto_dry_run` — preview what would be dispatched
3. Build prompt template system for work units
4. Wire up result collection → `unit_complete`
5. Add cost tracking (tokens per unit, per batch, per task)

### Phase 2: Quality & Safety
**Estimated effort: 1-2 sessions**
1. Integrate Ralph Loop into batch_validate (auto-invoke, not manual)
2. Build circuit breaker (budget limit, failure rate limit)
3. Add safety escalation (flag units touching force/speed/collision values)
4. Build anti-regression checker (compare output vs existing data)
5. Structured audit log (JSON per unit, per batch)

### Phase 3: Hybrid Tool Access
**Estimated effort: 2-3 sessions**
1. Define tool schemas for agent tool_use (subset of PRISM tools)
2. Build tool call resolver (agent tool_use → MCP tool execution → result)
3. Implement tool call budget enforcement
4. Add context package builder (pre-compute relevant data per unit type)
5. Test with pilot batch (3-5 units, verify quality)

### Phase 4: Advanced Execution
**Estimated effort: 2-3 sessions**
1. Worker thread background execution model
2. DAG-based dependency resolution with parallel where possible
3. Swarm pattern auto-selection per unit type
4. Manus as optional backend (when API key configured)
5. Testing framework with mock execution mode

---

## 7. WHAT WE ALREADY HAVE (Don't Rebuild)

| Component | Location | Lines | Status |
|-----------|----------|-------|--------|
| ATCS state machine | atcsDispatcher.ts | 1153 | ✅ Complete |
| Agent execution | AgentExecutor.ts | 819 | ✅ Working with API |
| Swarm patterns | SwarmExecutor.ts | 954 | ✅ 8 patterns |
| Agent registry | AgentRegistry.ts + JSON | 632+282 | ✅ 64 agents |
| API configuration | api-config.ts | 137 | ✅ Key configured |
| Parallel API calls | api-config.ts | — | ✅ Promise.all utility |
| ATCS cadence hooks | autoHookWrapper.ts | — | ✅ Auto-resume, emergency save |
| ATCS recon in boot | cadenceExecutor.ts | — | ✅ Shows active tasks |
| Ralph Loop | ralphDispatcher.ts | — | ✅ Real Claude API calls |
| Stub scanner | atcsDispatcher.ts | — | ✅ Zero-tolerance patterns |
| Quality scoring | omegaDispatcher.ts | — | ✅ Ω equation |

**Total existing code we leverage: ~4,000+ lines**
**New code needed for Phase 1: ~400-600 lines**

---

## 8. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API cost explosion | Medium | High | Circuit breaker, budget limits, dry-run mode |
| Agent produces bad manufacturing data | Medium | CRITICAL | Multi-layer validation, safety escalation |
| Rate limit exceeded | Medium | Low | Throttling, exponential backoff |
| Context window overflow | Low | Medium | Pre-computed context packages, selective loading |
| File system corruption on crash | Low | Medium | Checkpoints, atomic writes, recovery protocol |
| Agent hallucination on technical values | High | CRITICAL | Stub scan, reference comparison, consensus voting |
| Token cost makes approach uneconomical | Medium | High | Haiku tier for simple units, smart tier selection |
| Complexity makes system unmaintainable | Medium | Medium | Clean separation of concerns, dispatcher pattern |

---

## 9. OPEN QUESTIONS FOR MARK

1. **Budget**: What's an acceptable per-task API cost? $1? $10? $100?
2. **Speed vs Quality**: For Phase 1, chunked execution (5 units/turn) or attempt background?
3. **Tool Access Priority**: Start with Fat Prompt (simpler) or Hybrid (better quality)?
4. **Agent Tier Strategy**: Use OPUS for everything (expensive, smart) or tier by complexity?
5. **First Use Case**: What task should we pilot with? Materials DB verification? Formula audit?
6. **Manus**: Completely drop Manus for now, or keep as research backend?
7. **Human-in-Loop**: At what point should autonomous execution STOP and ask a human?

---

## 10. BOTTOM LINE

**What this gives us:**
A system where you can say "verify all 2805 materials against their reference datasheets" and walk away. PRISM decomposes it into units, dispatches agents, validates quality, checkpoints progress, handles failures, and presents you with a verified dataset — across multiple sessions if needed.

**What it costs:**
~$50-200 in API tokens for a full materials verification task (depending on tier selection), plus 6-10 development sessions to build properly.

**What it prevents:**
Weeks of manual verification work. More importantly, it catches errors that humans miss because each unit goes through stub scan + acceptance criteria + Ralph Loop + safety validation — every time, without fatigue.

**The math:**
- Manual: 2805 materials × 5 min each = 234 hours = 29 working days
- Autonomous: 2805 materials × 15 sec each = 11.7 hours, unattended
- ROI: 222 hours saved per run, repeatable, auditable, consistent
