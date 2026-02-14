# PRISM ULTIMATE MCP ROADMAP — ACTIVATION & USAGE INSTRUCTIONS
# This file tells Claude how to find, load, and execute the modular roadmap system.
# Place this file at: C:\PRISM\mcp-server\data\docs\roadmap\ROADMAP_INSTRUCTIONS.md
# Version: 1.0 (aligned with ROADMAP_MODULES v13.8)

---

## TRIGGER PHRASES

The following phrases from the human activate roadmap execution mode:

| Phrase | Action |
|--------|--------|
| "work on the ultimate mcp roadmap" | Full boot → load position → execute next MS |
| "continue" | Recovery mode → find where you left off → resume |
| "finish" | Recovery mode (same as "continue") |
| "roadmap status" | Read CURRENT_POSITION.md + ROADMAP_TRACKER.md → report position |
| "what phase are we on" | Quick position check → report current phase and MS |

---

## FILE LOCATIONS

All roadmap documents live at:
```
C:\PRISM\mcp-server\data\docs\roadmap\
```

### Document Map
```
roadmap/
├── PRISM_MASTER_INDEX.md          ← Load FIRST every session (~3K tokens)
├── PRISM_PROTOCOLS_CORE.md        ← Load SECOND every session (~5K tokens)
├── PRISM_PROTOCOLS_REFERENCE.md   ← On-demand sections only (~250 tokens each)
├── PHASE_P0_ACTIVATION.md         ← Load during P0 only (~8K tokens)
├── PHASE_R1_REGISTRY.md           ← Load during R1 only (~6K tokens)
├── PHASE_R2_SAFETY.md             ← Load during R2 only (~5K tokens)
├── PHASE_R3_CAMPAIGNS.md          ← Stub → expand at R3 start (~1K)
├── PHASE_R4_ENTERPRISE.md         ← Stub → expand at R4 start (~1K)
├── PHASE_R5_VISUAL.md             ← Stub → expand at R5 start (~1K)
├── PHASE_R6_PRODUCTION.md         ← Stub → expand at R6 start (~1K)
├── PHASE_TEMPLATE.md              ← Template for expanding stubs
├── DEPLOYMENT_GUIDE.md            ← First-time setup + migration guide
├── TOOL_UTILIZATION_AUDIT_v13_2.md← Reference: tool gap analysis
├── PRISM_INFRASTRUCTURE_AUDIT_v13_7_IA3.md ← Reference: latest audit
└── reference/
    ├── TOKEN_OPTIMIZATION_AUDIT_v12.md
    ├── ROADMAP_MODULES_AUDIT.md
    ├── COMPACTION_PROTOCOL_ASSESSMENT.md
    └── MONOLITH_vs_MODULAR_COMPARISON.md
```

### State Files (created during execution)
```
C:\PRISM\mcp-server\data\docs\
├── CURRENT_POSITION.md            ← O(1) position recovery (overwritten each step)
├── ROADMAP_TRACKER.md             ← Append-only completion log (audit trail)
├── ACTION_TRACKER.md              ← Step-group sub-checkpoints
├── PHASE_FINDINGS.md              ← Inter-phase knowledge transfer
├── P0_DISPATCHER_BASELINE.md      ← P0 output: dispatcher test results
├── OPUS_CONFIG_BASELINE.md        ← P0 output: Opus 4.6 config audit
├── SYSTEM_ACTIVATION_REPORT.md    ← P0 output: full system status
└── QUARANTINE_LOG.md              ← Suspect data quarantine record
```

---

## HOW TO START (first time ever)

1. Ensure roadmap files are at `C:\PRISM\mcp-server\data\docs\roadmap\`
2. Human says: **"work on the ultimate mcp roadmap"**
3. Claude executes this sequence:

```
STEP 1: Load PRISM_MASTER_INDEX.md (roadmap index — WHERE AM I?)
  → prism_doc action=read name=roadmap/PRISM_MASTER_INDEX.md

STEP 2: Check position
  → prism_doc action=read name=CURRENT_POSITION.md
  → If missing: you are at P0-MS0 (beginning)

STEP 3: Load PRISM_PROTOCOLS_CORE.md (HOW DO I OPERATE?)
  → prism_doc action=read name=roadmap/PRISM_PROTOCOLS_CORE.md

STEP 4: Execute Boot Protocol from PRISM_PROTOCOLS_CORE.md
  → prism_dev action=session_boot
  → prism_context action=todo_update
  → prism_dev action=health (verify system is alive)

STEP 5: Load the ONE phase doc matching your position
  → prism_doc action=read name=roadmap/PHASE_P0_ACTIVATION.md (if at P0)

STEP 6: Execute the current MS steps from the phase doc

STEP 7: On MS completion, record progress
  → prism_doc action=append name=ROADMAP_TRACKER.md content="[MS-ID] COMPLETE [date]"
  → prism_doc action=write name=CURRENT_POSITION.md content="CURRENT: [next-MS] | ..."

STEP 8: Save state
  → prism_session action=state_save
  → prism_context action=todo_update
```

---

## HOW TO RESUME (after compaction or new session)

When human says **"continue"** or **"finish"**:

```
RECOVERY SEQUENCE:

1. CHECK CONTAINER FIRST (most up-to-date state):
   Look for any files in /home/claude/ from a prior session in this conversation.
   If roadmap files exist there → you were mid-session and hit compaction.
   The container state IS the most recent state.

2. IF container has no prior work → read from MCP server state files:
   → prism_doc action=read name=CURRENT_POSITION.md
   → prism_doc action=read name=ROADMAP_TRACKER.md (last 5 entries)
   → prism_doc action=read name=ACTION_TRACKER.md (last 10 lines)

3. DETERMINE POSITION:
   CURRENT_POSITION.md tells you: current MS, last completed step, phase status.
   ACTION_TRACKER.md tells you: sub-step position within an MS.
   ROADMAP_TRACKER.md tells you: all completed MS (audit trail).

4. LOAD PHASE DOC (bounded):
   Load ONLY the active MS section from the phase doc (not the full file).
   Use line ranges if you know the MS location.

5. RESUME:
   Continue from the NEXT step after the last recorded position.
   Check Idempotency Classification before re-running any step.
   DO NOT re-run completed work. DO NOT ask the human what happened.
   Just recover and continue.
```

---

## RULES FOR EXECUTION

1. **NEVER load more than 1 phase doc** unless crossing a phase boundary.
2. **NEVER load the full monolith** (PRISM_MASTER_ROADMAP_v11_6.md). It's archived.
3. **NEVER load PRISM_PROTOCOLS_REFERENCE.md in full** — load only needed sections.
4. **ALWAYS flush non-regenerable results to disk** after each group of calculations.
5. **ALWAYS update CURRENT_POSITION.md** every 5 calls during execution.
6. **ALWAYS save state** at end of session (prism_session action=state_save).
7. **S(x) >= 0.70 is a HARD BLOCK.** Never skip safety validation.
8. **NO PLACEHOLDERS.** Every value must be real, complete, verified.

---

## WHAT IS PRISM (context for new sessions)

PRISM is a safety-critical CNC manufacturing intelligence MCP server with 31 dispatchers,
368 actions, and 37 engines. It recommends cutting parameters, predicts tool life, validates
safety limits, and decodes machine alarms. Mathematical errors cause tool explosions and
operator injuries.

The ROOT PROBLEM being solved: 4 duplicate registry pairs cause subsystems to read different
data files. P0 fixes wiring + configures Opus 4.6, R1 loads data, R2 tests calculations,
R3-R6 hardens for production.

Current phase status is tracked in CURRENT_POSITION.md and PRISM_MASTER_INDEX.md Phase Registry.

---

## PHASE OVERVIEW (quick reference)

| Phase | What It Does | Status |
|-------|-------------|--------|
| P0 | Wire all subsystems + Opus 4.6 config | not-started |
| R1 | Load all registry data >95% | not-started (needs P0) |
| R2 | 50-calc safety test matrix + AI edge cases | not-started (needs R1) |
| R3 | Scale to full material library in batches | not-started (needs R2) |
| R4 | Enterprise compliance + multi-tenant | not-started (needs R2) |
| R5 | Visual dashboard platform | not-started (needs R4) |
| R6 | Production hardening + certification | not-started (needs R3+R4+R5) |

---

## INTEGRATION WITH EXISTING MCP TOOLS

When working on the roadmap, use PRISM MCP dispatchers (prism_*) as the primary tools:
- `prism_dev` — build, health, code_search, file operations
- `prism_doc` — read/write/append roadmap documents
- `prism_session` — state_save, state_load, session_boot
- `prism_context` — context_monitor_check, context_compress, todo_update
- `prism_calc` — safety calculations (speed_feed, cutting_force, tool_life)
- `prism_data` — material_get, alarm_decode, machine data
- `prism_orchestrate` — parallel execution, agent management
- `prism_guard` — pattern_scan, safety validation
- `prism_hook` — hook management and coverage checks

Use Desktop Commander ONLY for non-PRISM files (user uploads, external data).
NEVER use Desktop Commander for PRISM state files (race condition with atomicWrite).
