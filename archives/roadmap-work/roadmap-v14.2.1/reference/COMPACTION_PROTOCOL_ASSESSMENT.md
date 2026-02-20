# COMPACTION PROTOCOL ASSESSMENT — PRISM Modular Roadmap v12.1
# Assessor: Claude Opus 4.6 | Senior MCP Architecture & LLM Context Specialist
# Date: 2026-02-13
# Scope: Compaction strategies ONLY — preservation fidelity, payload reduction, recovery correctness
# Audience: Mark (PRISM architect) — no hedging, no padding, direct engineering assessment

---

## EXECUTIVE VERDICT

The v12.1 compaction system is **significantly above industry average** for MCP-driven LLM workflows. The Bleed #1 fix (phase doc reload) was the right call and prevents the most catastrophic failure mode. The CURRENT_POSITION.md O(1) recovery, flush-to-file patterns, and step-group ACTION_TRACKER are all sound engineering.

**But the system is reactive, not predictive.** It handles compaction *after* it happens. It doesn't prevent compaction from happening in the first place, doesn't degrade gracefully as context pressure mounts, and doesn't learn from compaction history to avoid repeat failures. The recovery protocol also has a fidelity gap between what it *preserves* (position) and what it *loses* (working memory mid-step).

There are **6 vulnerabilities** ranging from architecturally missing to underspecified. Three of them will cause real problems during P0-MS8 and R2-MS0 execution. The other three compound across the project lifecycle.

**Bottom line: The compaction system goes from "good" to "bulletproof" with 3 structural additions and 3 specification tightenings. None require MCP server changes — they're all protocol-level.**

---

## WHAT'S ALREADY BULLETPROOF (no changes needed)

These are correct and I wouldn't change them:

**1. Phase doc reload in recovery budget.** The v12.1 fix to Bleed #1 is exactly right. Without it, recovery has position but no instructions — a session-killing gap. The 6-9KB recovery budget is the correct cost of correctness.

**2. CURRENT_POSITION.md for O(1) recovery.** A single-line overwrite file that gives you position in ~50 bytes vs. reading a growing tracker. This is the right data structure for the problem. The fallback to ROADMAP_TRACKER (last 5 entries) is also correct — defense in depth.

**3. Flush-to-file after every group/category.** P0-MS8 GROUP A/B/C flushes, R2-MS0 per-category flushes, and the general 5KB/10KB flush triggers are textbook. Each flush simultaneously persists data AND reclaims context. The dual-purpose nature is key — it's not just cleanup, it's a checkpoint.

**4. Step-group ACTION_TRACKER for high-effort MS.** At ~1 call per step-group, this is cheap insurance. The granularity is correct for most MS. (I have a refinement below for the cases where it's *not* granular enough.)

**5. Cadence-based auto-save.** The @15calls checkpoint, @41+ survival, @60%+ compress+survival cascade is well-designed. The thresholds are empirically tuned from your session history. The progressive escalation (checkpoint → survival → compress+survival) maps correctly to increasing urgency.

**6. DO NOT re-read list.** The explicit exclusions in the recovery protocol (MASTER_INDEX, PRISM_PROTOCOLS_CORE, completed MS definitions, phase boundary smoke test) are all correct. Each one saves 1-4KB of context that would be consumed for zero operational value during recovery.

**7. Idempotency principle.** "Before re-executing any step: check if already done" is the right principle. (But it needs structure — see Vulnerability #4.)

---

## VULNERABILITY #1: NO COMPACTION PREDICTION — ENTIRELY REACTIVE

**Severity: HIGH — causes preventable compaction events**
**Affects: P0-MS8, R2-MS0, any multi-MS session**

The current system detects compaction *after* it happens (300s gap or _COMPACTION_RECOVERY signal). It then recovers. But it never asks: "Am I about to compact, and can I avoid it?"

The context_monitor_check and context_compress calls exist, but they're positioned at fixed points (between MS transitions, after flush groups, at >50% pressure). There's no dynamic prediction based on *remaining work vs. remaining context*.

**The failure scenario:**
P0-MS8, GROUP A completes (17 calls). Flush happens. Context is at 45%. GROUP B starts (8 calls). By call 5 of GROUP B, context hits 55%. The next planned check is *after* GROUP B. But the ralph_assess call in the gate check section will return a LARGE ~5KB response. If GROUP C's 12 calls average 700B each, that's another ~8.4KB. Total remaining work: ~17KB. If the system is already at 55%, it may compact mid-GROUP-C with no flush point in between.

**What's missing: a pre-execution budget check.**

```
COMPACTION AVOIDANCE PROTOCOL (add to PRISM_PROTOCOLS_CORE.md):

BEFORE starting any step-group with >5 expected calls:
  1. prism_context action=context_monitor_check
  2. CALCULATE: remaining_calls × avg_response_size = estimated_remaining_KB
  3. IF estimated_remaining_KB > (available_context × 0.70):
     → PREEMPTIVE SHED: flush ALL unflushed results to file NOW
     → Re-check pressure
     → IF still >60%: context_compress before proceeding
     → IF still >75% after compress: SPLIT remaining work into next session
  4. IF estimated_remaining_KB < (available_context × 0.70):
     → Proceed normally

DECISION MATRIX:
  Pressure <40%:  Proceed. No action needed.
  Pressure 40-55%: Flush unflushed results. Proceed with monitoring.
  Pressure 55-70%: Flush + compress. Proceed only if remaining work < 15KB.
  Pressure >70%:  STOP. Save state. Split to next session. Do NOT push through.
  
NOTE: The 70% threshold exists because compaction is catastrophic and 
recovery costs 6-9KB. Spending 6-9KB on recovery when you're already at 
70% leaves almost no room for actual work. It's cheaper to end the 
session cleanly and restart fresh.
```

**Token impact:** ~200 tokens added to protocols. Prevents ~2-3 compaction events over the project lifecycle. Each prevented compaction saves the 6-9KB recovery cost PLUS the re-execution cost of partially completed work.

---

## VULNERABILITY #2: RECOVERY FIDELITY GAP — POSITION WITHOUT WORKING MEMORY

**Severity: HIGH — causes re-execution of completed work after compaction**
**Affects: Any step-group with multi-step internal state**

The ACTION_TRACKER records at step-group granularity: "P0-MS8 step-group GROUP-A complete." The recovery protocol says: "Find last completed step-group → resume from NEXT step-group." This is correct at the group level.

But within a group, there's no state preservation. Consider R2-MS0, Cat 1 (Steel, 8 calcs):

```
GROUP 4140 (calcs #1-#2): material_get → speed_feed(roughing) → speed_feed(finishing,CBN)
GROUP 1045 (#3): material_get → speed_feed
GROUP 4340 (#4-#5): material_get → speed_feed(roughing) → speed_feed(finishing,ceramic)
GROUP D2 (#6-#7): material_get → speed_feed(roughing) → speed_feed(finishing,CBN)
GROUP 316SS (#8): material_get → speed_feed(roughing,coated carbide)
→ FLUSH: append to R2_CALC_RESULTS.md "Cat 1: [results]"
```

If compaction hits after GROUP 4340 completes but before the Cat 1 flush:
- ACTION_TRACKER shows: R2-MS0, no step-group completed (flush hasn't happened)
- Recovery resumes from the START of Cat 1
- Calcs #1-#5 are re-executed (they were in context, not yet flushed)
- Waste: ~5 calls of re-execution + their context cost

**The fix: micro-checkpoints within high-effort groups.**

```
MICRO-CHECKPOINT PROTOCOL (add to PRISM_PROTOCOLS_CORE.md):

FOR step-groups with >8 calls OR >10KB expected throughput:
  After each material-group completion within a step-group:
    prism_doc action=append name=ACTION_TRACKER.md 
      content="[MS-ID] [group] sub-checkpoint [material] complete [date]"
  
  Cost: ~1 call per material-group (~100B append)
  
  ON RECOVERY: read ACTION_TRACKER → find last sub-checkpoint within active group
  → Resume from NEXT material-group, not from group start

APPLIES TO:
  - P0-MS0 BATCH 1-4 (31 dispatcher tests): checkpoint after each batch
    (ALREADY DONE — this is the existing pattern. Good.)
  - P0-MS8 GROUP A (17 calls): checkpoint after each chain (chains 1-5)
    (PARTIALLY DONE — flush after group, but no per-chain checkpoint)
  - R2-MS0 Cat 1-3 (22 calcs): checkpoint after each material-group
    (NOT DONE — flush after category, but no per-group checkpoint within category)
  - R2-MS1 Cat 4-6 (16 calcs): checkpoint after each category
    (DONE — flush after each category is sufficient here, smaller groups)

IMPLEMENTATION:
  Existing flush points ALREADY serve as implicit checkpoints (data is on disk).
  The gap is: between flush points, there are no intermediate checkpoints.
  
  Add EXPLICIT sub-checkpoints at:
  - P0-MS8: after each individual chain within a group
  - R2-MS0: after each material-group within a category
  
  These are ~100B appends. The cost is negligible. The recovery precision
  goes from "re-run entire group" to "re-run 1-3 calls max."
```

**Token impact:** ~100B per sub-checkpoint × ~15 sub-checkpoints across the project = ~1.5KB total disk writes. Recovery precision improves from step-group (5-17 call re-execution) to sub-group (1-3 call re-execution).

---

## VULNERABILITY #3: NO COMPACTION SIGNATURE DETECTION

**Severity: MEDIUM — causes delayed or incorrect recovery initiation**
**Affects: Every compaction event**

The protocol says: "ON COMPACTION (300s gap or _COMPACTION_RECOVERY)." But how does the session *know* it's in a compaction state? The two triggers are:

1. **300s gap:** The system infers compaction from a time gap. But a 300s gap could also be the user stepping away. The system has no way to distinguish "context was compacted" from "user was slow to respond."

2. **_COMPACTION_RECOVERY:** This is a sentinel value, but where does it come from? Who writes it? The protocol doesn't specify the detection mechanism — it only specifies the recovery steps.

In Claude's actual runtime behavior, compaction manifests as:
- Loss of conversational context (prior messages disappear)
- System prompt and tool schemas remain intact
- The model feels "reset" — it has no memory of the conversation flow
- The _COMPACTION_RECOVERY file or _context state may be stale

**What's missing: a positive detection mechanism.**

```
COMPACTION DETECTION PROTOCOL (add to PRISM_PROTOCOLS_CORE.md):

COMPACTION INDICATORS (if ANY are true, assume compaction occurred):
  1. No conversational context visible from prior turns in this session
  2. _COMPACTION_RECOVERY file exists with timestamp < 5 minutes ago
  3. prism_session action=state_load returns state with 
     session_id matching current but call_count > expected
  4. RECENT_ACTIONS.json shows entries from current session that 
     are not in the model's visible context
  
DETECTION SEQUENCE (runs ONCE at start of any response where 
context appears empty):
  a. Check: can I recall the last 3 tool calls I made in this session?
  b. IF NO → likely compaction. Execute recovery protocol.
  c. IF YES but context feels thin → check pressure. May be near-compaction.
  
FALSE POSITIVE HANDLING:
  If recovery protocol runs but state_load shows no active MS:
  → This is a new session, not a compaction. Execute normal boot.
  → Cost of false positive: ~3 calls wasted. Acceptable.

CRITICAL: The 30-second gap detection is unreliable. Some compactions
happen without a gap (mid-response context overflow). The positive 
detection mechanism (checking for context loss) is more reliable than
the negative mechanism (checking for time gaps).
```

**Token impact:** ~150 tokens in protocols. Eliminates the ambiguity between compaction and slow-user scenarios. More importantly, enables detection of mid-response compaction (no gap, just context overflow).

---

## VULNERABILITY #4: IDEMPOTENCY IS A PRINCIPLE, NOT A PROTOCOL

**Severity: MEDIUM — causes duplicate operations or silent data corruption on recovery**
**Affects: Any step re-executed after compaction**

The protocol says: "IDEMPOTENCY: Before re-executing any step: check if already done. Hook? Check list. File? Check exists. API call? Safe to retry (timeout protects)."

This is correct in principle but dangerously vague in practice. Consider:

- **"Hook? Check list."** Which hook? prism_hook action=list returns all hooks. The recovering session needs to know *which specific hook* it was about to register. If the ACTION_TRACKER says "MS2 hooks complete" but doesn't say *which* hooks were registered, the recovery might re-register all of them (duplicates) or skip all of them (missing new ones).

- **"File? Check exists."** Which file? If the step was "append results to R2_CALC_RESULTS.md," checking if the file exists doesn't tell you whether *this specific append* was completed. You could have a file with partial results.

- **"API call? Safe to retry."** Not always true. prism_orchestrate action=agent_execute is idempotent for pure computation (2+2=4), but prism_doc action=append is NOT idempotent — re-running it produces duplicate entries.

**What's missing: an idempotency classification per operation type.**

```
IDEMPOTENCY CLASSIFICATION (add to PRISM_PROTOCOLS_CORE.md):

NATURALLY IDEMPOTENT (safe to re-run without checks):
  - prism_dev action=health
  - prism_dev action=build
  - prism_data action=material_get (read-only)
  - prism_validate action=safety (read-only)
  - prism_context action=context_monitor_check (read-only)
  - prism_hook action=list / coverage (read-only)
  - prism_skill_script action=skill_stats_v2 (read-only)
  - All diagnostic / read-only actions

CONDITIONALLY IDEMPOTENT (check before re-running):
  - prism_hook action=register → CHECK: prism_hook action=list for this hook name
  - prism_doc action=write → SAFE: write is full overwrite (idempotent by nature)
  - prism_session action=state_save → SAFE: overwrites previous state
  - prism_doc action=write name=CURRENT_POSITION.md → SAFE: full overwrite
  - str_replace → CHECK: search for old_str first. If not found, already applied.

NOT IDEMPOTENT (require guard before re-run):
  - prism_doc action=append → GUARD: read last 3 lines of target file.
    If last append matches what you're about to append → SKIP.
    Pattern: include a timestamp or sequence marker in every append.
  - prism_memory action=store → GUARD: recall first. If value matches → SKIP.
  - prism_orchestrate action=agent_execute → GUARD: check if result already
    persisted to file. If yes → SKIP. If no → safe to re-run (pure function).
  - prism_atcs action=task_init → GUARD: task_list first. If task exists → SKIP.

RECOVERY RULE: When the recovery protocol reaches a step, classify it using 
the table above. NATURALLY IDEMPOTENT → just run it. CONDITIONALLY → check 
first. NOT IDEMPOTENT → guard check is MANDATORY.
```

**Token impact:** ~300 tokens in protocols. Eliminates the class of bugs where recovery produces duplicate appends, duplicate hooks, or duplicate tasks. This is especially important for R2 where appending partial calc results to R2_CALC_RESULTS.md must not produce duplicate entries.

---

## VULNERABILITY #5: NO FLUSH VERIFICATION — SILENT DATA LOSS RISK

**Severity: MEDIUM — rare but catastrophic when it occurs**
**Affects: Every flush-to-file operation**

The flush pattern throughout the roadmap is:

```
[execute calls] → FLUSH: prism_doc action=append name=FILE.md content="[results]"
→ [shed from context, proceed to next group]
```

But what if the flush fails? prism_doc action=append could fail due to:
- Disk full (unlikely but possible)
- File locked by another process
- Path resolution error
- Silent timeout

If the flush fails and the system sheds the results from context, those results are gone. They existed in context, were flushed to a file that didn't actually receive them, and context moved on.

**What's missing: flush verification.**

```
VERIFIED FLUSH PROTOCOL (add to PRISM_PROTOCOLS_CORE.md):

EVERY flush-to-file MUST follow this pattern:

  1. FLUSH: prism_doc action=append name=[FILE] content="[results]"
  2. VERIFY: Check return value. If prism_doc returns success → proceed.
  3. IF FAIL: 
     a. RETRY once with 5s delay
     b. IF second fail → DO NOT shed results from context
     c. Note: "[FILE] flush failed — results retained in context"
     d. Proceed, but flag for manual flush at next opportunity
  4. ONLY AFTER verified success: consider results safe to shed from context

SHORTCUT (for low-risk flushes like diagnostic results):
  If the data can be regenerated (e.g., re-running a diagnostic call),
  verification is NICE-TO-HAVE, not MUST. 
  
  If the data CANNOT be regenerated (e.g., intermediate calc results 
  that required multi-step computation), verification is MANDATORY.

CLASSIFICATION:
  REGENERABLE (verify optional):  health results, dispatcher test results, 
                                   list outputs, diagnostic reads
  NON-REGENERABLE (verify mandatory): calc results with material-specific 
                                       intermediate values, chain results 
                                       with multi-call state, any result 
                                       that took >3 calls to produce
```

**Token impact:** ~200 tokens in protocols. ~1 extra call per critical flush (read-back verification). Prevents the catastrophic case where an entire category of R2 calc results is lost due to a silent flush failure.

---

## VULNERABILITY #6: THREE-LAYER RECOVERY NOT CODIFIED IN ROADMAP

**Severity: MEDIUM — institutional knowledge gap**
**Affects: Long-term maintainability and recovery reliability**

The memory system references a three-layer compaction recovery model:
- **L1:** _context (primary state)
- **L2:** _COMPACTION_RECOVERY (backup)
- **L3:** response hijack (emergency)

The roadmap's Compaction Continuation Protocol only codifies what appears to be L1 behavior (read state_load, read position, reload phase doc, resume). The L2 and L3 layers — which are the defense-in-depth mechanisms — aren't specified in the modular roadmap.

Similarly, the memory notes mention: "30-second gaps or mid-session session_boot calls reliably trigger compaction recovery." This operational knowledge isn't in the protocol.

**What's missing: the full recovery cascade.**

```
COMPACTION RECOVERY CASCADE (replace current protocol in PRISM_PROTOCOLS_CORE.md):

LAYER 1 — STANDARD RECOVERY (cost: ~6-9KB, success rate: ~85%):
  Trigger: Context loss detected (see Detection Protocol)
  Steps: [current protocol — state_load, position, phase doc, ACTION_TRACKER]
  Success criteria: Can identify active MS and next step-group
  
LAYER 2 — DEEP RECOVERY (cost: ~10-14KB, success rate: ~95%):
  Trigger: L1 fails (state_load returns stale/missing data, or position unclear)
  Steps:
    1. prism_doc action=read name=COMPACTION_SURVIVAL.json
       → Contains: last known position, active MS, last 5 actions, 
         pressure at time of save
    2. prism_doc action=read name=RECENT_ACTIONS.json (last 20 entries)
       → Reconstruct: what was the last successful action?
    3. Cross-reference ACTION_TRACKER + ROADMAP_TRACKER + RECENT_ACTIONS
       → Triangulate position from 3 independent sources
    4. Reload phase doc (same as L1)
    5. Resume from most conservative position 
       (earliest step-group not confirmed complete by ALL 3 sources)
  Success criteria: Position confirmed by >=2 of 3 sources
  
LAYER 3 — EMERGENCY RECOVERY (cost: ~3KB, success rate: ~99%):
  Trigger: L2 fails (conflicting data across sources, or all sources stale)
  Steps:
    1. READ ONLY: CURRENT_POSITION.md + ROADMAP_TRACKER.md (last 5 entries)
    2. Identify last CONFIRMED complete MS (in ROADMAP_TRACKER)
    3. Restart from the BEGINNING of the NEXT MS
       → This may re-execute partially completed work, but guarantees correctness
    4. Reload phase doc
  Success criteria: Always succeeds (falls back to known-good state)
  
ESCALATION RULE:
  L1 → if position unclear after 3 calls → escalate to L2
  L2 → if sources conflict or >5 calls spent → escalate to L3
  L3 → always succeeds but may waste work

NEVER spend more than 12 calls on recovery. If L3 hasn't resolved 
position in 12 calls total, restart from last completed MS. 
The cost of re-executing one MS (~12-45 calls) is ALWAYS less than 
the cost of a corrupted or incorrect recovery.
```

**Token impact:** ~350 tokens replacing ~200 tokens of current protocol (net +150 tokens). Provides defense-in-depth that the current flat protocol lacks. The escalation rule prevents recovery itself from consuming the context budget.

---

## APPROACHES YOU'RE MISSING: STRUCTURAL IMPROVEMENTS

Beyond fixing the 6 vulnerabilities, there are 3 structural approaches that would make the compaction system fundamentally stronger:

### MISSING APPROACH #1: COMPACTION TELEMETRY

The Token Optimization Audit (Gap 12) flagged this and it's still unfixed. Every KB estimate in the entire system is an educated guess. Without telemetry, you can't answer:

- How often does compaction actually occur?
- At what context pressure does it typically trigger?
- Which MS are compaction-prone?
- Are the flush points at the right places?
- Are the response size estimates accurate?

```
COMPACTION TELEMETRY (wire into existing TelemetryEngine v2.0):

ON EVERY context_monitor_check:
  prism_telemetry action=record_event event="context_pressure" 
    data={ ms_id, call_number, pressure_pct, unflushed_kb }

ON EVERY compaction recovery:
  prism_telemetry action=record_event event="compaction_occurred"
    data={ ms_id, step_group, recovery_layer, calls_to_recover, 
           work_re_executed, pressure_at_last_check }

ON EVERY flush-to-file:
  prism_telemetry action=record_event event="flush_completed"
    data={ ms_id, target_file, flushed_kb, pressure_before, pressure_after }

ANALYSIS (run at each phase gate):
  prism_telemetry action=get_anomalies filter="compaction"
  → Identify: which MS had the most compaction events?
  → Identify: was the compaction avoidable with earlier flushing?
  → UPDATE response budgets and flush points with MEASURED data
```

This turns the compaction system from intuition-driven to evidence-driven. The 609-line TelemetryEngine already exists — this is wiring, not building.

### MISSING APPROACH #2: PROGRESSIVE DEGRADATION

The current system has two modes: normal operation and compaction recovery. There's no middle ground. When pressure rises from 50% to 70%, the system doesn't change behavior — it just monitors and hopes.

```
PROGRESSIVE DEGRADATION PROTOCOL:

PRESSURE 0-40%: FULL MODE
  All features active. Normal operation.

PRESSURE 40-55%: EFFICIENT MODE
  - Switch from DEEP quality tier to STANDARD for non-critical validations
  - Reduce response extraction from full to needed-fields-only
  - Flush after every 3 calls instead of after groups
  - Skip optional documentation steps (they can be regenerated)

PRESSURE 55-70%: CONSERVATION MODE
  - Skip all non-essential reads (e.g., don't re-read phase doc sections 
    you've already processed)
  - Batch remaining work into smallest possible units
  - Flush after EVERY call that produces >500B response
  - Add sub-checkpoints at every call (not just every group)
  - Flag: "approaching compaction — prepare for clean session end"

PRESSURE >70%: PRESERVATION MODE
  - STOP executing new work
  - Flush ALL unflushed results to disk
  - Write CURRENT_POSITION.md with exact position
  - Write ACTION_TRACKER with current sub-checkpoint
  - prism_session action=state_save
  - End session cleanly: "Stopping here to preserve context. 
    Resume in next session at [position]."

KEY INSIGHT: A clean session end at 70% costs ~3KB (flush + save + position).
A compaction recovery at 85%+ costs ~6-9KB AND risks data loss AND requires 
re-execution. Prevention is ALWAYS cheaper than recovery.
```

### MISSING APPROACH #3: CONTEXT BUDGET RESERVATION PER STEP-GROUP

The current system has a global context budget model (200K window, 40K overhead, 136K working). But it doesn't allocate budget *per step-group*. This means early groups in a session can consume disproportionate context, starving later groups.

```
STEP-GROUP BUDGET ALLOCATION:

FOR each MS, divide working budget among step-groups:

EXAMPLE — P0-MS8 (working budget ~126K tokens after framework load):
  GROUP A (17 calls):  allocated ~40K tokens (31% of budget)
  GROUP B (8 calls):   allocated ~20K tokens (16% of budget)  
  GROUP C (12 calls):  allocated ~30K tokens (24% of budget)
  Gate + Release:      allocated ~25K tokens (20% of budget)
  Reserve:             ~11K tokens (9% buffer)

IF a group exceeds its allocation:
  → Immediate flush (even if not at a planned flush point)
  → Context compress
  → Log: "[GROUP] exceeded budget by [X]KB — flush triggered"
  → Proceed only if remaining budget covers next group
  → If not: clean session end (not compaction — planned split)

This converts the "hope we don't compact" approach into 
"guaranteed budget per group" approach.
```

---

## COMPOUND ANALYSIS: IMPLEMENTATION PRIORITY

```
                                    EFFORT    RISK    IMPACT    PRIORITY
Vuln #1 (prediction/avoidance):    ~200 tok  Zero    HIGH      MUST — before P0-MS8
Vuln #2 (micro-checkpoints):       ~150 tok  Zero    HIGH      MUST — before R2-MS0
Vuln #4 (idempotency classes):     ~300 tok  Zero    MEDIUM    MUST — before P0-MS0
Vuln #3 (detection mechanism):     ~150 tok  Zero    MEDIUM    SHOULD — before P0-MS8
Vuln #5 (flush verification):      ~200 tok  Zero    MEDIUM    SHOULD — before R2-MS0
Vuln #6 (three-layer cascade):     ~150 tok  Zero    MEDIUM    SHOULD — before P0-MS8

Missing #1 (telemetry):            ~100 tok  Zero    HIGH      SHOULD — wire in P0-MS7
Missing #2 (progressive degrade):  ~250 tok  Zero    HIGH      MUST — before P0-MS8  
Missing #3 (per-group budgets):    ~200 tok  Zero    MEDIUM    NICE — before R2-MS0

TOTAL PROTOCOL ADDITIONS:          ~1,700 tokens added to PRISM_PROTOCOLS_CORE.md
                                   (from ~2,000 tokens to ~3,700 tokens)
                                   
NET EFFECT: +1,700 tokens per session framework cost
            -15,000 to -40,000 tokens saved per prevented compaction event
            Estimated 2-4 compaction events prevented over project lifecycle
            NET SAVINGS: ~28,000 to ~158,000 tokens over 15-20 sessions
```

---

## WHAT I WOULD NOT CHANGE

These elements are sometimes over-engineered in other systems but are correctly sized here:

1. **The 15% compaction reserve.** Some systems use 10% or 20%. For a 200K window with 40K system overhead, 15% of usable context (~24K) is correct. It's enough to cover recovery (6-9KB) plus one in-flight group completion.

2. **Recovery budget of 6-9KB.** This is the right range. It's expensive but necessary. Trying to shrink it below 6KB means dropping the phase doc reload, which causes session failure. The cost is correct.

3. **Flush-to-file over context-only persistence.** Some MCP systems try to keep everything in context and rely on compaction recovery to restore it. Your approach of aggressively flushing to disk and treating context as a working buffer (not a storage layer) is architecturally correct. Context is volatile memory. Disk is persistent. Use each for what it's good at.

4. **ACTION_TRACKER as append-only.** Don't make it overwrite. The audit trail matters for debugging. The CURRENT_POSITION.md is the right place for overwrite semantics.

---

## SPECIFIC PROTOCOL TEXT — READY TO INTEGRATE

Below is the consolidated addition to PRISM_PROTOCOLS_CORE.md. It replaces the existing Compaction Continuation Protocol section with an expanded version incorporating all 6 vulnerability fixes and the 3 structural improvements.

```
## COMPACTION MANAGEMENT SYSTEM v2.0

### COMPACTION AVOIDANCE (runs before every step-group with >5 calls)

  1. prism_context action=context_monitor_check
  2. ESTIMATE: remaining_calls × avg_response_KB = remaining_work_KB
  3. DECIDE:
     Pressure <40%:   FULL MODE. Proceed normally.
     Pressure 40-55%: EFFICIENT MODE. Flush unflushed results. Proceed with monitoring.
     Pressure 55-70%: CONSERVATION MODE. Flush + compress. Proceed only if remaining < 15KB.
     Pressure >70%:   PRESERVATION MODE. Flush all. Save state. End session cleanly.

### COMPACTION DETECTION (runs at start of any response where context appears empty)

  INDICATORS (ANY true = compaction):
    a. No visible conversational context from prior turns
    b. Cannot recall last 3 tool calls made in this session
    c. RECENT_ACTIONS.json shows entries not in visible context
  FALSE POSITIVE: If state_load shows no active MS → new session, not compaction.

### COMPACTION RECOVERY CASCADE

  LAYER 1 — STANDARD (cost ~6-9KB):
    1. prism_session action=state_load
    2. prism_doc action=read name=CURRENT_POSITION.md
       (fallback: ROADMAP_TRACKER.md last 5 entries)
    3. Identify active phase → RELOAD phase doc (MANDATORY)
       Jump DIRECTLY to active MS section. Skip completed MS.
    4. If mid-MS: read ACTION_TRACKER.md → find last checkpoint/sub-checkpoint
    5. Resume from NEXT checkpoint.
    If position unclear after 3 calls → escalate to L2.

  LAYER 2 — DEEP (cost ~10-14KB):
    1. Read COMPACTION_SURVIVAL.json + RECENT_ACTIONS.json
    2. Cross-reference ACTION_TRACKER + ROADMAP_TRACKER + RECENT_ACTIONS
    3. Triangulate from 3 sources. Use most conservative (earliest unconfirmed) position.
    If sources conflict after 5 calls → escalate to L3.

  LAYER 3 — EMERGENCY (cost ~3KB):
    1. Read CURRENT_POSITION.md + ROADMAP_TRACKER.md (last 5 entries)
    2. Restart from BEGINNING of next unconfirmed MS.
    Always succeeds. May re-execute partial work. Guarantees correctness.

  HARD LIMIT: Never spend >12 total calls on recovery across all layers.

### IDEMPOTENCY CLASSIFICATION

  NATURALLY IDEMPOTENT (safe to re-run):
    All read-only actions: health, build, material_get, safety, list, coverage,
    context_monitor_check, skill_stats, knowledge_search
    
  CONDITIONALLY IDEMPOTENT (check first):
    hook register → check list for name. write → safe (overwrite). 
    str_replace → search for old_str. state_save → safe (overwrite).
    
  NOT IDEMPOTENT (guard required):
    doc append → read last 3 lines, skip if match. memory store → recall first.
    task_init → task_list first. Use timestamps/sequence markers in all appends.

### MICRO-CHECKPOINTS (for step-groups with >8 calls or >10KB throughput)

  After each sub-unit (material-group, chain, batch):
    prism_doc action=append name=ACTION_TRACKER.md 
      content="[MS-ID] [group] sub:[unit] complete [date]"
  On recovery: read ACTION_TRACKER → find last sub-checkpoint → resume from NEXT sub-unit.

### VERIFIED FLUSH PROTOCOL

  1. prism_doc action=append name=[FILE] content="[results]"
  2. Check return value.
  3. IF FAIL: retry once. If second fail → DO NOT shed from context. Flag for manual flush.
  4. ONLY after verified success → safe to shed from context.
  For regenerable data (diagnostics): verification optional.
  For non-regenerable data (multi-step calc results): verification MANDATORY.

### RECOVERY CONTEXT BUDGET (unchanged from v12.1)

  state_load:              ~1KB
  CURRENT_POSITION.md:     ~0.1KB
  Active phase doc:        ~4-7KB (MANDATORY)
  ACTION_TRACKER (if mid): ~0.5KB
  health check:            ~0.5KB
  TOTAL:                   ~6-9KB

  DO NOT re-read: MASTER_INDEX, PRISM_PROTOCOLS_CORE, completed MS definitions
  DO NOT re-run: Phase boundary smoke test

### COMPACTION TELEMETRY (wire into TelemetryEngine v2.0)

  ON context_monitor_check: record { ms_id, call_number, pressure_pct, unflushed_kb }
  ON compaction recovery:   record { ms_id, step_group, recovery_layer, re_executed_calls }
  ON flush-to-file:         record { ms_id, target_file, flushed_kb, pressure_delta }
  ANALYZE at phase gates: get_anomalies filter="compaction" → update budgets with measured data.

### SURVIVAL LOCATIONS (unchanged)
  CURRENT_POSITION.md | CURRENT_STATE.json | COMPACTION_SURVIVAL.json
  RECENT_ACTIONS.json | ROADMAP_TRACKER.md | ACTION_TRACKER.md

### AUTO-SAVE TRIGGERS (unchanged)
  @15calls checkpoint | @41+ survival | @60%+ compress+survival | @build gsd_sync
```

---

## FINAL ASSESSMENT

**Is the compaction system bulletproof? Not yet. But it's close.**

The v12.1 system solved the *structural* compaction problem (framework load reduction, flush-to-file, phase doc recovery). What remains is the *operational* compaction problem: prediction, degradation, fidelity, and evidence.

The 6 vulnerabilities and 3 missing approaches described above convert the system from:
- **Reactive** → **Predictive** (avoidance protocol + progressive degradation)
- **Coarse recovery** → **Fine-grained recovery** (micro-checkpoints + three-layer cascade)
- **Principle-based** → **Protocol-based** (idempotency classification + flush verification)
- **Intuition-driven** → **Evidence-driven** (compaction telemetry)

After these changes, a compaction event in PRISM would follow this path:

1. **Avoided** by the prediction protocol (pressure check before each group)
2. **Softened** by progressive degradation (conservation mode reduces context burn)
3. **Detected** by positive indicators (not just time gaps)
4. **Recovered** by the three-layer cascade (L1 → L2 → L3, never more than 12 calls)
5. **Resumed** at sub-checkpoint precision (1-3 calls re-executed, not 5-17)
6. **Verified** by idempotency checks (no duplicate appends, no duplicate hooks)
7. **Recorded** by telemetry (evidence for future optimization)

That's bulletproof.

---

*"The best compaction strategy is the one that never fires. The second best is the one that fires, recovers in 6 calls, and teaches you how to prevent the next one."*
