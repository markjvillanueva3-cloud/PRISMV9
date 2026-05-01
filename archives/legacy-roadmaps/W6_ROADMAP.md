# W6: Workflow-Aware Recovery & Dev Capability — TOP PRIORITY
**Created:** 2026-02-11 Session 58
**Status:** W6.1 + W6.2 COMPLETE — W6.3 or W5 NEXT
**Priority:** HIGHEST — This blocks productive work every session

## Problem Statement
Compaction recovery detects context loss but fails to resume work correctly.
The user has to repeatedly say "check your logs and continue" because:
1. Recovery context is call-log-aware, not workflow-aware
2. ACTION_TRACKER pending items are stale (pointing at completed work)
3. RECENT_ACTIONS captures *what tools were called* but not *why* or *what's next*
4. Todo system anchors on stale tasks, pulling recovery toward wrong work

## W6.1: Workflow State Machine + Session Journal ✅ COMPLETE
**Goal:** When compaction hits mid-task, recovery knows exactly which step to resume AND has my reasoning trail.
**Status:** ✅ BUILT + AUDITED — needs restart to go live

### Components Built:
1. **workflow_tracker.py** (416L) — 7 workflow templates, full CLI, state machine
2. **SESSION_JOURNAL.jsonl** — Every tool call logged, _notes captured, auto-rotates at 200 entries
3. **reasoning_trail in recovery** — Compaction hijack reads last 15 journal entries, shows my own notes
4. **Stale phase fallback fixed** — recovery_context.phase reads CURRENT_STATE.json, not hardcoded "W2"
5. **wip_capture fixed** — dispatcher sends correct subcommand (capture-task), passes params through
6. **WIP reminder** — every 8 calls, _context nudges me to use _notes param
7. **4 MCP actions** — workflow_start/advance/status/complete in sessionDispatcher

### Key Files:
- `C:\PRISM\scripts\core\workflow_tracker.py` — state machine (416 lines)
- `C:\PRISM\state\WORKFLOW_STATE.json` — active workflow state
- `C:\PRISM\state\SESSION_JOURNAL.jsonl` — tool call + notes log
- `sessionDispatcher.ts` L49-52 (enum), L760-768 (wip_capture fix), L831-866 (workflow handlers)
- `cadenceExecutor.ts` L1875-1889 (deriveNextAction Priority 0)
- `autoHookWrapper.ts` L510-534 (_notes capture), L1456-1479 (ctx override), L1533-1555 (reasoning_trail in recovery)

### How to use _notes (CRITICAL for recovery quality):
```
// Every tool call can carry reasoning — zero extra calls, survives compaction
prism_data material_search {query: "aluminum", _notes: "checking if registry loads >1 to verify W5 pipeline fix"}
prism_dev file_read {path: "MaterialRegistry.ts", _notes: "found load() never called — this is the W5 bug"}
```

### Design
- `WORKFLOW_STATE.json` in C:\PRISM\state\ tracks active workflow
- Schema: `{ workflow_id, workflow_type, total_steps, current_step, steps: [{id, name, status, intent, files_touched}], started_at, last_step_at }`
- Workflow types: `session_boot`, `bug_fix`, `feature_implement`, `build_verify`, `validation`, `code_search_edit`, `refactor`
- Each step completion writes to state file BEFORE moving to next step
- Compaction recovery reads WORKFLOW_STATE.json and says "Resume step N of M: [exact instruction]"

### Workflow Templates (stored in data/docs/gsd/WORKFLOWS.md or JSON)

#### 1. Session Boot (2 calls target, currently ~6)
```
Step 1: prism_dev→session_boot (loads state+GSD+integrity+scripts+resume)
Step 2: prism_context→todo_update (anchors current task)
```
Recovery: "You just booted. Read quick_resume and start working."

#### 2. Bug Fix Workflow (7 steps)
```
Step 1: IDENTIFY — Read error/report, understand the bug
Step 2: LOCATE — prism_dev→code_search or DC file search to find relevant code
Step 3: READ — Read the specific file(s) and understand current logic
Step 4: PLAN — State the fix approach (if >50 lines, get approval)
Step 5: EDIT — Apply the fix via edit_block/str_replace
Step 6: BUILD — npm run build, verify clean
Step 7: VERIFY — Test the fix works (smoke test, manual call, or ralph scrutinize)
```
Recovery at step 4: "You identified bug X in file Y. You planned fix Z. Execute the edit."

#### 3. Feature Implementation (8 steps)
```
Step 1: BRAINSTORM — prism_sp→brainstorm (understand problem space)
Step 2: PLAN — prism_sp→plan (concrete steps with approval)
Step 3: SCAFFOLD — Create new files/types if needed
Step 4: IMPLEMENT — Write the core logic
Step 5: WIRE — Connect to dispatcher/cadence/hooks
Step 6: BUILD — npm run build, verify clean
Step 7: VALIDATE — prism_ralph→scrutinize or →loop
Step 8: DOCUMENT — Update ACTION_TRACKER, roadmap, memories
```
Recovery at step 5: "Feature X core logic done in file Y. Wire it into dispatcher Z."

#### 4. Build & Verify (3 steps)
```
Step 1: BUILD — npm run build (gsd_sync auto-fires)
Step 2: CHECK — Verify build output (size, errors, warnings)
Step 3: CHECKPOINT — prism_session→state_save + ACTION_TRACKER update
```
Recovery: "Build succeeded at 3.6MB. Checkpoint and continue."

#### 5. Code Search & Edit (5 steps)
```
Step 1: SEARCH — Find target code (DC search or prism_dev→code_search)
Step 2: READ — Read surrounding context (±20 lines)
Step 3: PLAN — State exact change
Step 4: EDIT — Apply change
Step 5: VERIFY — Re-read to confirm edit applied correctly
```
Recovery at step 3: "Found target at file:line. Planned change: [description]. Apply it."

#### 6. Validation Pipeline (4 steps)
```
Step 1: SAFETY — prism_validate→safety (S(x)≥0.70 gate)
Step 2: SCRUTINIZE — prism_ralph→scrutinize (single validator)
Step 3: FULL — prism_ralph→loop (4-phase validation) [optional]
Step 4: ASSESS — prism_ralph→assess + prism_omega→compute [release only]
```

#### 7. Compaction Recovery (automated, 3 steps)
```
Step 1: READ — WORKFLOW_STATE.json (what workflow, which step)
Step 2: ORIENT — Read the current step's intent + files_touched
Step 3: CONTINUE — Execute from current_step, no re-investigation
```

## W6.2: Fix 4 Dev Capability Bugs ✅ COMPLETE
**Goal:** Remove friction from daily development.

1. **Stale agent model strings** — ✅ NOT A BUG (all 9 agents already use claude-sonnet-4-5-20250929)
2. **script_execute simulation-only** — ✅ Already fixed (recursive loading works, core/ scripts visible)
3. **code_search broken** — ✅ Fixed: added to SAFETY_BYPASS_ACTIONS in ComputationCache.ts L128
4. **ACTION_TRACKER stale items** — ✅ DONE (Session 58, cleared W2.1-W2.4)
5. **Todo stale anchoring** — ✅ Fixed: contextDispatcher.ts todo_read enriched from WORKFLOW_STATE.json

## W6.3: Memory Architecture Migration
**Goal:** Move structured knowledge from Claude project memories to PRISM MCP memory.

### Keep in Claude project memories (~10 lines):
- PRISM identity + purpose + safety criticality
- Boot sequence command
- 6 Laws summary
- Decision tree summary (which dispatcher for what)

### Move to PRISM session_memory.json (structured, queryable):
- Roadmap status and completion dates
- Architectural decisions with file:line references
- Validated patterns and anti-patterns
- Cross-session learnings
- Build history and known issues
- Workflow sequence templates

### Categories:
- `decisions` — architectural choices with rationale
- `patterns` — validated dev patterns
- `file_refs` — important file:line references
- `workflows` — sequence templates
- `roadmap` — phase status and dates
- `bugs` — known issues and workarounds

## Updated Full Roadmap

| Phase | Status | Priority | Description |
|-------|--------|----------|-------------|
| D1-D4 | ✅ DONE | — | Session, Context, Learning, Performance |
| W1 | ✅ DONE | — | File GSD, gsd_sync, doc anti-regression |
| W2+W2.5 | ✅ DONE | — | Core wiring + HSS optimization |
| W3 | ✅ DONE | — | D5 session orchestration |
| W4 | ✅ DONE | — | MCP wrapper assessment + wiring |
| **W6.1** | **✅ COMPLETE** | **P0** | **Workflow state machine + session journal + recovery trail** |
| **W6.2** | **✅ COMPLETE** | **P1** | **Fix 4 dev bugs: cache, todo anchoring, models, scripts** |
| **W6.3** | ⏳ | **P2** | **Memory architecture migration** |
| W5 | ⏳ | P3 | Knowledge recovery (registry loading fix) |
| F5-F8 | PLANNED | P4 | Multi-tenant, NL hooks, protocol bridge, compliance |

## Changelog
- 2026-02-11: Created W6 roadmap (Session 58)
- 2026-02-11: W6.1 BUILT — workflow_tracker.py (416L) + sessionDispatcher wiring (4 actions) + cadenceExecutor deriveNextAction Priority 0 + autoHookWrapper ctx.task/next override from workflow state.
- 2026-02-11: W6.1 AUDITED + ENHANCED — Fixed stale "W2" phase fallback, fixed wip_capture dispatcher bug, added SESSION_JOURNAL.jsonl _notes capture on every tool call, added reasoning_trail to compaction recovery payload, added periodic WIP reminder. All built, needs restart.
- 2026-02-11: W6.2 COMPLETE — Bug 1 not a bug (models current), Bug 2 already fixed (recursive loading), Bug 3 code_search excluded from ComputationCache, Bug 4 todo_read enriched from WORKFLOW_STATE.json. Bug 5 ACTION_TRACKER stale items cleared Session 58.
