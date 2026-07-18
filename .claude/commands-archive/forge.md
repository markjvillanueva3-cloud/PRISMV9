---
name: forge
description: Forge — Brainstorm → Plan → Iterate Pipeline
---

---
effort: high
maxTurns: 30
---

# Forge — Brainstorm → Plan → Iterate Pipeline

You are running the full ideation-to-execution pipeline. This command chains `/smart`, `/rgs`, and `/ralph-loop` into a single flow that takes a rough idea and forges it into a polished, executed milestone.

---

## 🪨 ATOMIC-FIRST CROSS-REFERENCE (auto-injected 2026-05-08)

**For master-roadmap synthesis or any tier-spanning work, prefer `/forge4`.** It binds the live `state/shared/system-viz/system-graph.json` as the dependency oracle and enforces tier ordering (T0 atomic → T1 engines → T2 dispatchers → T3 transport → T4 frontend → T5 personas) via the canonical `meta.roadmap.phases` skeleton.

This v1 still works for self-contained internal refactors with no tier crossings. For any roadmap-touching work, **prepend** this preflight before Phase 0 below:

```bash
node H:/prism/scripts/generate-system-viz.mjs                          # regenerate graph (~5s)
node H:/prism/scripts/system-viz-query.mjs build-order                 # canonical atomic-first phase order
node H:/prism/scripts/system-viz-query.mjs roadmap-candidates --json   # roadmap-shaped candidate list
```

Read `H:/prism/state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md` for the full Atomic-First Build Principle. Cross-versions: `/forge` (~4%) → `/forge2` (~15%) → `/forge3` (~40%) → `/forge4` (~50%, atomic-first hard rules).

---

## Args: $ARGUMENTS
- A brief description of what to build, fix, or improve
- Example: `/forge add 5-axis compensation to the safety chain`
- Example: `/forge optimize session startup token cost`
- Example: `/forge create a dashboard for roadmap progress`

## EXHAUSTIVE SCIENCE LAW (HARD RULE)
- **Exhaust ALL mathematical, statistical, and scientific possibilities** before concluding any analysis or implementation.
- Consider every applicable model, formula, algorithm, and combination — including novel cross-domain approaches.
- "Already covered" claims REQUIRE citing the SPECIFIC existing engine/formula/algorithm by name.
- Check live PRISM inventory and dispatcher maps for existing coverage before building new.
- **Completeness > Speed.** A missed mathematical model is a permanent capability gap.


## Phase 0: Self-Awareness Protocol (MANDATORY)
**See: `_self-awareness-protocol.md` for full details**

Before ANY task execution, auto-load system awareness:
```
1. Run the PRISM kernel / self-awareness helper to refresh live inventory
2. Use prism_session:dispatcher_map_compact + prism_session:action_search to find the best existing MCP route
3. Run /dedup using prism_dev:copilot_check_duplication before creating anything new
4. Use AI routing only after duplicate and route discovery are clear
5. Check shared session state and recent builds before expanding scope
```

**AI System Routing:**
| Task | System |
|------|--------|
| Physics validation | Docker: physics-agent |
| Engine building | Opus (local) |
| ML inference | Ollama: codellama/deepseek |
| Batch >100 files | Docker: batch-processor |

**Output before proceeding:**
```
SELF-AWARENESS LOADED
Inventory:    [X] engines, [Y] dispatchers, [Z] actions
Best Route:   [dispatcher/action or command bridge path]
Duplicates:   [CLEAR | BLOCKED]
```

## Phase 0B: Load System Map
Use the PRISM kernel, `prism_session:dispatcher_map_compact`, and `prism_session:action_search` before broad shell exploration. Fall back to digests only when the route map is still ambiguous.

## Phase 1: Smart Analysis (`/smart` protocol)
Analyze the brief across complexity, domain, and effort dimensions:
1. **Complexity**: SIMPLE / MODERATE / COMPLEX
2. **Domain**: Which PRISM domains does this touch? (engines, dispatchers, safety, infrastructure, UI, etc.)
3. **Roles**: Select appropriate roles (TypeScript Engineer, Manufacturing Expert, Systems Architect, etc.)
4. **Model**: Select OPUS / SONNET / HAIKU based on complexity
5. **Effort**: HIGH / MEDIUM / LOW

Output the SMART CONFIG header, then proceed.

## Phase 2: Brainstorm (`/rgs brainstorm` protocol)
With the smart configuration active:
1. Read `H:/prism/state/CURRENT_POSITION.md` for current system state
2. Read `H:/prism/mcp-server/data/roadmap-index.json` for roadmap context
3. Explore the codebase areas relevant to the brief
4. Brainstorm the implementation approach:
   - What exists that can be leveraged?
   - What needs to be built from scratch?
   - What are the risks and dependencies?
   - How many units/sessions will this take?
5. Present 2-3 approach options with tradeoffs
6. Pick the best approach (or ask if genuinely ambiguous)

## Phase 2B: Toolkit Selection (index-driven)
After brainstorming identifies the domain and approach, pre-load relevant tools to avoid wasteful mid-execution searches.

**Lookup Protocol:**
1. **Map the brief's domain** to PRISM subsystems using keyword matching:
   - force/cutting/chip → `force` domain; thermal/heat → `thermal`; safety/S(x) → `safety`; tool/wear → `tool_life`; surface/roughness → `surface`; stability/chatter → `stability`; optimization → `optimization`; quality/SPC → `quality`; material/alloy → `material`; gcode/toolpath → `geometry`; controller → `control`

2. **Select relevant skills** (from the 54 available):
   - Always: `/test`, `/scrutinize`, `/check-dsl`
   - By domain: safety → `/safety-audit`, `/forge-safety`; engines → `/algorithm-inspect`, `/formula-browse`; dispatchers → `/action-search`; materials → `/material-lookup`; hooks → `/hook-browse`; registries → `/registry-browse`
   - By task type: creating → `/addtomatrix`, `/forge-wiring`; debugging → `/forge-debug`, `/trace`; performance → `/forge-perf`; cleanup → `/de-sloppify`; verification → `/verify-loop`

3. **Select relevant engines/algorithms** from MASTER_INDEX:
   - Read `H:/prism/mcp-server/MASTER_INDEX_COMPACT.md` — extract entries matching the domain
   - List the 3-8 most relevant engines/algorithms with file paths

4. **Select relevant formulas** (if domain is physics/manufacturing):
   - List formula IDs from FormulaRegistry that the implementation will need

5. **Select relevant dispatchers**:
   - Identify which dispatcher(s) own the target domain's actions

**Output a compact Toolkit Card:**
```
TOOLKIT — [forge brief summary]
================================
Skills:       /safety-audit, /algorithm-inspect, /test, /scrutinize
Engines:      [relevant engine names] ([N] relevant)
Formulas:     [relevant formula IDs] ([N] relevant)
Dispatchers:  [dispatcher names with action counts]
Scripts:      [relevant scripts or "none"]
Key Files:    [3-5 primary files to create/modify]
```

Reference this toolkit throughout Phases 3-4 to avoid re-searching for components.

## Phase 3: Generate Milestone (`/rgs generate` protocol)
Transform the brainstorm into a formal RGS milestone:
1. Create milestone envelope JSON conforming to `roadmapSchema.ts`
2. Populate all units with:
   - Clear steps with tool references
   - Entry/exit conditions
   - Deliverables
   - Dependencies
3. Write envelope to `H:/prism/mcp-server/data/milestones/{ID}.json`
4. Add entry to `roadmap-index.json`
5. Run scrutinization (12 checks, target >= 0.92)

## Phase 4: Execute with Ralph Loop (`/ralph-loop` protocol)
Begin executing the milestone with iterative refinement:
1. Claim the first unit via TaskClaimService
2. Execute the unit's steps
3. After each unit, run a Ralph-style quality loop:
   - **Review**: Does the output meet exit conditions?
   - **Assess**: Are there quality issues or gaps?
   - **Loop**: If issues found, fix them before proceeding
   - **Proceed**: Move to next unit only when current is solid
   - **Harden**: Run build + tests after each unit
4. Update envelope and index as units complete
5. Continue until milestone is complete or session budget is exhausted

## Progress Tracking
After each phase, report:
```
FORGE PROGRESS
==============
Phase 1 (Smart):     COMPLETE — [config summary]
Phase 2 (Brainstorm): COMPLETE — [approach selected]
Phase 3 (Generate):  COMPLETE — [milestone-id] created ([N] units)
Phase 4 (Execute):   IN PROGRESS — [X]/[Y] units done

Current Unit: [unit-id] — [title]
Ralph Iteration: [N]
Build: [PASS/FAIL]
```

## Session Budget Awareness
If you're running low on context:
1. Run `/compact quick` to save handoff state before context is lost
2. Complete the current unit cleanly (or finish current step)
3. Ship it (`/ship` protocol — includes `/remember` for key findings)
4. Report what's done and what remains
5. Next session: `/startup` → `/handoff read` → `/pick-task [next-unit-id]`

## End State
When the milestone is complete (or session ends):
```
FORGE COMPLETE
==============
Milestone: [ID] — [title]
Units:     [X]/[Y] complete
Duration:  [N] phases executed
Quality:   Scrutiny score [X.XX]
Build:     PASS
Tests:     [N] passing

Deliverables:
  - [list of what was created/modified]

Next: /forge [next idea] or /pick-task for remaining work
```
