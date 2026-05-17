# JULIETT PLAN v1.1 — SCRUTINY DELTAS

> Generated 2026-05-17T04:00Z · juliett (`claude-de04081e`) · 10-agent Boris peer-review of plan v1
> Read alongside: `JULIETT-CONSOLIDATED-WORK-PLAN-2026-05-17.md` (v1, the plan being reviewed)
> This file applies as DELTA — kills, rescopes, additions, re-sequences, re-assignments.

---

## EXECUTIVE FINDING (the biggest single error in v1)

**v1 is ~40-55% PRISM-app contamination + ~6-10% already-shipped work.** After both filters, the real backend-dev queue is **~30-40 items**, not ~80. The user's directive "high-roi backend-dev BEFORE anything PRISM-app related" was violated by weaving Category 9 bridge layer + domain wiring across every slot in parallel with backend-dev work.

**Operational rule that should have been in v1 (now mandatory for v1.1):**
> An engine wired into `devDispatcher` / `contextDispatcher` / `hookDispatcher` / `localDispatcher` / `memoryDispatcher` = **backend-dev**. An engine wired into `camDispatcher` / `millDispatcher` / `edmDispatcher` / `ppDispatcher` / `machineLiveDispatcher` / `intelligenceDispatcher` / `businessDispatcher` = **PRISM-app**. Mechanical work feel doesn't matter; the consumer determines the classification.

A `PRISM-APP-QUEUE.md` sibling file should hold the deferred operator-facing work. It does not exist; v1 has no formal home for items removed by the contamination filter.

---

## P0 KILL LIST — items to remove from plan v1 entirely

### Already shipped (8 items)

| Item | Shipped where | Evidence |
|------|---------------|----------|
| U-F2-R1 | commit `66aa07afa4` 2026-05-16 — line 169 reads `if (!prompt \|\| prompt.length < 25)` | `/`-skip removed |
| U-DEV-TOOL-LEVERAGE-RANK | commit `37feea659a` | "aggregator over 4 META tools (closes final F3 missing)" |
| U-HOOK-FIRE-RANK | commit `317465aac8` | "empirical hook fire-rate ranker" |
| U-DEV-TOOL-LEVERAGE-SKILL | commit `57f0ceb47a` | `/dev-tool-leverage` skill shipped |
| F7 / `stop-memory-size-watchdog` wiring | U-OBS-B1 wired Stop[1].hooks[0] in both C:+H: settings.json | grep verified |
| `audit-viz-first-inject` wiring | re-spliced settings.json:771 | grep verified |
| `post-ship-distill` wiring | re-spliced same commit | per CLAUDE.md regression |
| `c-to-h-mirror` wiring | INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01 by claude-b6c4b196 | per CLAUDE.md |

### PRISM-app contamination (whole Cat 9 + 16 deep-integration)

Move to `state/shared/specs/PRISM-APP-QUEUE.md` (operator-facing work, deferred after backend-dev backlog clears):

**All 6 SFC bridges** (U-BRIDGE-SFC-FUSION/HYPERMILL/MASTERCAM/ESPRIT/INVENTORHSM/SOLIDWORKS) — Strategy/Feature/Cycle params feeding vendor CAM. Output = operator's toolpath.

**U-BRIDGE-MASTERPOST-CAM** — Post-processor → CAM = G-code emission, the operator deliverable. `ppDispatcher` has 801 actions — that IS the operator surface.

**U-BRIDGE-CAD-CAM-HANDOFF** — "Autonomous CAD→CAM" IS the PRISM app itself, not the toolchain.

**U-BRIDGE-SHOPFLOOR-LEARN** — MTConnect telemetry → learning. Operator infrastructure.

**U-BRIDGE-LEARN-SFC + U-BRIDGE-LEARN-CAM** — learning → SFC/CAM strategy selectors. Transitively operator-facing.

**U-BRIDGE-ERP-SCHED + U-BRIDGE-ERP-QUOTE** — ERP integration. Sales/operator surface.

**U-BRIDGE-OPERATOR-GATES** — name says it.

**Category 9 wiring rows (operator-facing domains, ≥11 the original filter missed):** Hyper(7), Milling(7), Mill(4), Mastercam(5), WET(7), Wire(6), Electrode(4), Okuma(4), Turning(11), Swiss(6), Shop(9), Tool(9), Fusion(7), Machine(17). Plus already-flagged Lathe(89) + Mobile(5) + Print(6).

**Net Category-9 deferral: ~190+442 LongTail engines** = ~632 of the original 836. Plus all 16 deep-integration. Plus 14 deferred-pending bridges. Total moved to PRISM-APP-QUEUE: **~660 items**.

### Doctrine-violating wire-for-wiring-sake (per charlie's `feedback_dont_wire_for_wiring_sake_2026_05_16.md`)

| Item | Why kill | Replacement |
|------|----------|-------------|
| U-MEMORY-CONSOLIDATION-WIRE | "no consumer" — wiring an engine with no caller is the exact pattern the doctrine forbids | Name a real Stop hook that triggers consolidation; if none exists, leave cold |
| U-MEMORY-GRAPH-WIRE | same | same |
| U-TRIBAL-ENGINE-WIRE | "referenced only in validation rule" — validation reference is not a consumer | Name a real consumer (e.g., `tribal-by-domain-inject.mjs`) or drop |
| U-INTENT-WIRE | engine was deliberately WIRE-EXEMPT, tests-only. Reversing the decision without a NEW consumer = doctrine violation | KILL unless a `prism_session:classify_intent` *caller* exists |
| U-OLLAMA-13-WIRE (en bloc) | exact pattern that produced the YOLO-25 incident | Replace with `U-OLLAMA-TRIAGE-13` — per-hook 7-point vetting; only survivors get wired |

### Karpathy P0 violations (over-engineered or scope-bundled)

| Item | Violation | Action |
|------|-----------|--------|
| U-F4-MODEL-ROUTER | `model-router` skill already exists in global skill list; new build is R2/R8 violation | Read existing skill first; if gap real, 20-line patch — else KILL |
| U-F6-CONTEXT-AUDIT | measurement-tool-for-a-tool when both unbuilt | Ship F1 with 1-line grep metric first; defer F6 until F1 ships |
| U-MS1-ENVELOPE + U-MS1-REFRESH-CRON | formalizes lane WHILE doing the consolidation; cron + auto-commit + delta-report is 3 concerns bundled | Drop MS1 envelope; run consolidate-roadmaps.mjs manually 2-3 weeks; revisit cron only if drift |
| U-B2-SKILL-TRIGGER-AUTO | hard-fails on invented threshold (5 entries) | Advisory-only (warn, never fail), OR drop |
| U-A6-WIRING-AUDIT-STOP-GATE | hard-fails Stop on a known-12/14-false-positive auditor | Advisory-first; promote to blocker only after false-positive rate <10% (tied to U-AAM04-FOLLOWUP completion) |

**Net items killed from v1: ~25 individual + ~660 Category-9.** Plan size after KILL: ~55 backend-dev items (or fewer after RESCOPE).

---

## P0 RESCOPE LIST — keep but narrow scope

| Item | v1 scope | v1.1 scope | Why |
|------|----------|------------|-----|
| U-MEMORY-WATCH-WIRE | "wire to /loop --interval 1d" | **U-MEMORY-WATCH-LOOP-BIND** — only the schedule registration; the watchdog Stop hook is already shipped (U-OBS-B1) | 0.5h not 3h+ |
| U-DRIFT-GATE-VERIFY (alpha) | "verify drift-gate-only mode" | **U-DRIFT-GATE-TEST** — invoke `regen-viz.mjs --drift-gate-only` against deliberately-stale graph, assert exit-1 | 30min, not an unscoped verification |
| U-DSL-COVERAGE-AUDIT (alpha) | "audit dead DSL codes" | read-only audit script + dead-code report, ~1h | scope explicit |
| U-OLLAMA-13-WIRE | wire 13 hooks | **U-OLLAMA-WIRE-AUDIT** — triage each hook against doctrine 7-point check; survivors wired individually | actual count = 14; many overlap; reviewer-second-opinion is T0 BLOCKER tier — no blanket wiring |
| U-OLLAMA-REVIEWER-WIRE | wire as T0 blocker | ship with `PRISM_OLLAMA_REVIEWER_DRY_RUN=1` advisory-only first; accumulate 1 week telemetry; promote to blocker only if precision ≥0.9 | never wire a T0 blocker on day 1 |
| U-TRIBAL-CONSOLIDATE-CRON | wire to cron | verify reader exists for the consolidated output FIRST; if reader is dead, fix reader before cron | doctrine #4 (named consumer) |
| U-ERROR-LEARN-5-WIRE | (still HOLD) | check `error-pattern-promote` wire status FIRST (verify YOLO-25 not reverted); only ship remaining 4 if the promote hook is still live | doctrine cascade |
| U-DOCKER-RECOVERY | recovery hook + /checkin alert | SPLIT: (a) `/checkin` Docker-down alert (1-line surface read), (b) `U-DOCKER-RCA` root-cause unit, (c) recovery only after RCA names known-safe restart conditions | otherwise restart loop |
| U-F2-R5 | auto-execute Ollama for 5 categories | add fail-loud Ollama fallback (on error → Claude AND emit advisory; don't silently keep) | Karpathy R12 |
| U-OLLAMA-COST-ROUTER-UNIFY | integrate cost-router into auto-router | DEFER until R2/R4/R5 ship and offload rate measured; may be moot at 30%+ | R3 not asked for |
| U-NEG-SAMPLE-STRATIFIED | unblock NN-GRAPH tier-5 | demand 1-line answer: "what real-user task is unblocked by tier-5 GNN classifying ghost nodes?" If none → defer | R4 goal-driven |
| Cron-binding pattern | 4 separate items binding scripts to /loop --interval 1d | **U-CRON-BATCH-REGISTER** — one unit that takes the script list and binds all | stops the pattern recurring |
| Category 9 (whole) | itemized per-domain table | DELETE table; replace with single line "post-gate, see fresh validate-unwired-signal report"; gate output gives the REAL number | invites slots to skip the gate |

---

## P0 ADD LIST — net new units the plan missed

### Prerequisite infrastructure (6 — must ship before downstream)

| ID | Title | Slot | Estimate | Blocks |
|----|-------|------|----------|--------|
| **U-LOOP-DURABLE-INTERVAL** | Windows scheduled-task wrapper for /loop intervals (mirror `install-fleet-reaper-task.ps1` S4U pattern). Without this, /loop dies with session — exact gap that produced original silent regressions | bravo | 1d | U-MEMORY-WATCH-LOOP-BIND, U-SYNERGY-WATCH-WIRE, U-MS1-REFRESH-CRON (if kept) |
| **U-OLLAMA-HOOK-SMOKE-HARNESS** | Fixture-driven invoker; pipes synthetic stdin to each hook; asserts `{continue:true}`; measures latency | foxtrot | 1-2d | U-OLLAMA-WIRE-AUDIT, U-OLLAMA-REVIEWER-WIRE |
| **U-DOCKER-RCA** | Log harvest from Windows event log + dockerd --debug + WSL2 state; classify failure modes; emit triage doc | foxtrot | 4-8h | U-DOCKER-RECOVERY |
| **U-DOC-SURFACE-SPEC** | Class → required-surfaces matrix (engine → CLAUDE.md OR wiki; hook → settings.json; skill → frontmatter; dispatcher → DISPATCHER_DIGEST). Without it, U-B1 is theatre | echo | 2-4h | U-B1-DOC-BACKFLOW-WATCH |
| **U-STOP-CHAIN-INVENTORY** | Read current Stop chain slot allocation; ensure space for B1, A6, B4 before claiming numbers | kilo | 30min | U-A6, U-B1, U-B2, U-B4 |
| **U-CRON-BATCH-REGISTER** | One unit registers all PRISM scheduled tasks (memory-watch, synergy-watch, MS1-refresh if kept, fleet-reaper); avoids 4-slot install-task collisions | bravo | 1d | All cron-binding items |

### Forward-feedback loops (3 — user-directive items v1 missed)

The user said "constant updating as we build new tools so they're utilized" — v1 answered with backward-checking hooks (B1, B4). Forward-loops are missing:

| ID | Title | Slot | Why |
|----|-------|------|-----|
| **U-NEW-TOOL-AUTO-WIRE** | Stop hook detects new `.claude/commands/*.md` OR `scripts/*.mjs` and auto-appends to `_skill-triggers.jsonl`, `system-graph.json` next regen, broadcasts to chat-bus | echo | Forward-side of B1; the actual "constant updating" the user asked for |
| **U-AUTO-MEMORY-WRITE** | Stop hook detects repeated error/fix pattern (≥3× across sessions); auto-drafts `feedback_<pattern>.md` for operator approval | bravo | "automatic memory generation" directive |
| **U-DOCTRINE-OBSOLESCENCE-SWEEP** | `scripts/audit-stale-doctrine.mjs` — score CLAUDE.md sections, skill bodies, wiki entries, tribal canonical entries by (last-touched + last-referenced + invocation-telemetry); quarterly archive list | echo | "obsolete setup" sweep directive |

### Hot-path missed (5 from system-viz scrutiny)

| ID | Title | Slot | Evidence |
|----|-------|------|----------|
| **U-AWARENESS-CONTRADICTION** | AWARENESS-SNAPSHOT.md reports 12,129 orphans; node-staleness-rank.mjs reports 0 / classifierDegenerate. TWO classifiers, opposite answers, both injected into every chat. | alpha | direct contradiction; deeper than U-UTIL-CLASSIFIER-FIX |
| **U-AWARENESS-MILESTONE-DRIFT-INVERSION** | Snapshot shows MF-MS1, MF-MS2, ACP-MS0, HOOKS-AUTOMATION-V2-MS0, HTML-PRIMARY-MS0 "claimed completed / derived not_started_real (0/N shipped)" — envelopes lie OR derivation broken | echo | different bug class than U-DRIFT-FIX (30 envelope-pending-but-shipped) |
| **U-FOLD-DEBT-CRON-VERIFY** | `.newly-built-fold-debt.json` says `pendingCount:0 status:skipped` but BUILD_STATE shows 1348 engines without wiki entries. Detector broken or scoped wrong | alpha | factor-of-1348 reporting gap |
| **U-L5-STUB-HEAVY-OTHER** | Top hub: `L5/stub_heavy Other (in 265 · out 2429)` — 265 things depend on a STUB | hotel | hot-path stub serving as central infra |
| **U-HERMES-CLARIFY** | scout #7 found no PRISM Hermes implementation; user said "Hermes" with no further direction | juliett | 1-line operator question; currently silent gap |

### Telemetry multipliers (4 — defer to v1.2 if budget tight, but high leverage)

| ID | Title | Slot |
|----|-------|------|
| **U-CHAT-COST-DASHBOARD** | Per-chat token/$ per slot per day; identifies which slot burning budget on what class | bravo |
| **U-HOOK-FIRE-COST** | Cost of each hook's injection (tokens × fire rate × model price) | foxtrot |
| **U-SKILL-INVOCATION-TELEMETRY** | Which ~440 skills actually invoked per week vs zero → prunable | foxtrot |
| **U-PARALLEL-TOOL-CALL-LINTER** | Stop hook scans transcript for sequential tool calls that could've been parallel | echo |

---

## P0 RE-SEQUENCE LIST — dependency-violation fixes

| Slot | v1 order (wrong) | v1.1 order (right) | Why |
|------|------------------|--------------------|-----|
| **alpha** | #1 classifier-fix, #2 stop-force-loop, #3 validate-rerun | #1 stop-force-loop-1line (5min), #2 **validate-rerun (5min, unblocks 11 slots)**, #3 classifier-fix | Gate is a 5-min publish op; alpha shouldn't gate 11 slots on its multi-hour classifier work |
| **foxtrot** | F2-R5 listed before OLLAMA-CLASSIFIER-DIAG | DIAG → R5 hard sequence (no parallel) | R5 auto-executes via the SAME OFFLOADABLE_PATTERNS that DIAG says is broken |
| **echo** | B1 #1, A6 #5 | A6 #1, B1 #2 (piggybacks A6's Stop-chain-severity framework) | A6 establishes the framework |
| **R2/R4/R5** | listed as 3 sequential items | lock as single foxtrot lane, no sub-agent fan-out | all three edit same file lines |

---

## P0 RE-ASSIGN LIST — wrong-slot + load balance

| Item | v1 slot | v1.1 slot | Why |
|------|---------|-----------|-----|
| U-INTENT-WIRE (KILL per doctrine but if kept) | hotel | bravo | hotel's actual lane = CAD/voice; bravo owns session-services |
| U-OBSIDIAN-VAULT-AUDIT | charlie | echo | pairs with U-A4-WIKI-BACKFLOW-WATCH already echo-owned |
| U-MEMORY-CONSOLIDATION-WIRE / U-MEMORY-GRAPH-WIRE (KILL but if kept) | charlie | bravo | bravo lane = memory; charlie = obsidian/doctrine; ALSO: delta owns memoryDispatcher.ts file claim — charlie cannot edit |
| U-F1-SPLIT | foxtrot (paired with echo F6) | echo solo | F4-cleanup; eliminates inter-slot coord cost; foxtrot already overloaded |
| 5 CAD/SFC bridges | hotel | lima (when claimed) OR PRISM-APP-QUEUE | hotel = voice-capture; CAD bridges = lane switch; lima empty currently |
| U-A6-WIRING-AUDIT-STOP-GATE | kilo + echo "race" | **kilo sole owner** | one item, one owner |
| U-BRIDGE-PRISM-APP-FILTER | alpha + mike | **alpha sole** (mike consulted on Mobile/Print subset) | one owner |
| U-BRIDGE-CAD-CAM-HANDOFF | hotel + lima joint | SPLIT into `-CAD-SIDE` (hotel) + `-CAM-SIDE` (lima) with interface contract | (or PRISM-APP-QUEUE since this IS the app) |
| U-PROSE-TO-ENVELOPE | lima + echo (asymmetric: lima knows, echo doesn't) | **echo sole** | echo has drift/audit lane |
| U-ORPHAN-HOOK-TRIAGE | mike + kilo paired | **mike sole**, kilo consulted | one owner |
| 3 deep-integration "NEW SLOT" bridges (SHOPFLOOR-LEARN, ERP-SCHED, ERP-QUOTE, OPERATOR-GATES) | unassigned | PRISM-APP-QUEUE | all operator-facing per Axis #5 |

**Lima emptiness alert (P0):** chat-slots.json shows `lima: null` — 12 plan items (76 Category-9 engines) have NO live owner. Until claimed, lima's entire queue is dead-letter. **Foxtrot cannot absorb the overflow** (already overloaded 14→8 target). Either operator claims lima OR lima items defer/distribute.

**F2-R1 status correction:** Headline #5 in v1 reads "R1 fix shipped today by claude-773c6214". Axis 2 says claude-773c6214 still holds active claim. Reconciled: **the line change is in code (commit 66aa07afa4), the chat (kilo) is still iterating on follow-up work**. Update headline: "F2-R1 line change shipped (66aa07afa4); claim active for follow-up — coordinate before R2/R4/R5".

---

## P0 PLAN-WIDE DOCTRINE ADDITIONS

Add these as standing rules to plan v1.1 (and back-flow to CLAUDE.md):

1. **Dispatcher-target classification rule** (the PRISM-app filter): an engine wired into `devDispatcher`/`contextDispatcher`/`hookDispatcher`/`localDispatcher`/`memoryDispatcher` = backend-dev. Wired into `camDispatcher`/`millDispatcher`/`edmDispatcher`/`ppDispatcher`/`machineLiveDispatcher`/`intelligenceDispatcher`/`businessDispatcher` = PRISM-app. NO exceptions.

2. **One item = one slot owner.** Cross-cutting deps via chat-bus, not split assignment. The "pair with X if X claims first" + "joint with X" patterns are coordination liabilities. The shared chat bus + slot-task-claim per-slot lock system already provides the primitive — use it.

3. **Wire-on-demonstrated-need.** Per charlie's `feedback_dont_wire_for_wiring_sake_2026_05_16.md` — every wire-existing item requires a 7-point doctrine pass before dispatch. Items naming "engine X has no consumer" auto-fail.

4. **Pre-plan hygiene:** any consolidation plan must `git log --since=<plan-start-date> --oneline | grep -iE "<each-unit-prefix>"` and pre-subtract shipped commits BEFORE writing. v1 missed 8 already-shipped items because this wasn't done.

5. **PRISM-APP-QUEUE.md is mandatory.** Without a formal deferral home, operator-facing items rot or silently re-enter via next plan generation.

---

## SPLIT-INTO-TWO-FILES VERIFICATION (Axis 10 fixes)

| Item | Action |
|------|--------|
| U-C1-DANGLING-REMOVE | Alias-pointer to U-DANGLING-REFS-REMOVE; don't ledger as two units |
| U-LOOP-ABANDONED-PICKUP | Assign explicit operator-decision slot (juliett — operator picks one of 3 abandoned sessions per response) |
| Verify commands too vague | Tighten 5 (U-MEMORY-WATCH-WIRE, U-OLLAMA-CLASSIFIER-DIAG, U-DEV-TOOL-LEVERAGE-SKILL, U-BRIDGE-VALIDATE-RERUN, U-INTENT-WIRE) — see Axis 10 P2 table |

---

## REVISED PLAN SIZE

| Layer | v1 count | v1.1 count after KILL+RESCOPE |
|-------|----------|-------------------------------|
| Already-shipped removals | 0 | -8 |
| PRISM-app contamination → PRISM-APP-QUEUE | 0 | -22 individual + ~660 Cat-9 |
| Doctrine-violating wire-for-wiring-sake | 0 | -5 individual + 1 en-bloc (-13 hooks) |
| Karpathy violations | 0 | -5 |
| Net backend-dev items KEPT | ~80 | ~30 |
| NET NEW prerequisites | 0 | +6 |
| NET NEW forward-feedback loops | 0 | +3 |
| NET NEW hot-path missed | 0 | +5 |
| NET NEW telemetry (optional v1.2) | 0 | +4 |
| **v1.1 backend-dev queue total** | **~80** | **~44 actionable + ~660 in PRISM-APP-QUEUE** |

---

## SEQUENCING (v1.1 OVERALL)

**Stage 0 (prerequisites, ship in 1-2 sessions):** U-LOOP-DURABLE-INTERVAL, U-OLLAMA-HOOK-SMOKE-HARNESS, U-DOCKER-RCA, U-DOC-SURFACE-SPEC, U-STOP-CHAIN-INVENTORY, U-CRON-BATCH-REGISTER.

**Stage 1 (P0 cheap fixes, ship same session):** U-STOP-FORCE-LOOP-1LINE (5min), U-UTIL-CLASSIFIER-FIX, U-BRIDGE-VALIDATE-RERUN (5min publish), U-TRIBAL-EMBED-SYMLINK, U-MEMORY-RELEVANCE-FIX, U-DANGLING-REFS-REMOVE (after golf releases settings.json claim), U-BUNDLE-CHILD-FIX, U-C9B-DIGEST-PARSER-FIX, U-AWARENESS-CONTRADICTION.

**Stage 2 (doctrine + meta layer):** U-A6-WIRING-AUDIT-STOP-GATE (advisory mode), U-B1-DOC-BACKFLOW-WATCH, U-NEW-TOOL-AUTO-WIRE, U-AUTO-MEMORY-WRITE, U-DOCTRINE-OBSOLESCENCE-SWEEP, U-B4-MEMORY-INDEX-VALIDATOR, U-B3-CLAUDE-MD-DRIFT, U-A3-CLAUDE-MD-COLLAPSE, U-A4-WIKI-BACKFLOW-WATCH.

**Stage 3 (token economy):** U-DOCKER-RECOVERY (after RCA), U-OLLAMA-CLASSIFIER-DIAG, U-F2-R2 → R4 → R5 (sequential, single file), U-F2-R1 follow-up if needed, U-F1-SPLIT (echo solo), U-MEMORY-WATCH-LOOP-BIND, U-SYNERGY-WATCH-WIRE.

**Stage 4 (knowledge hygiene):** U-WIKI-BOOTSTRAP-RUN, U-OBSIDIAN-VAULT-AUDIT, U-TRIBAL-CONSOLIDATE-CRON (if reader exists), U-C7-INGEST-GATE, U-MISC-TRIAGE, U-ORPHAN-HOOK-TRIAGE, U-DRIFT-FIX (30 milestones), U-AWARENESS-MILESTONE-DRIFT-INVERSION, U-FOLD-DEBT-CRON-VERIFY.

**Stage 5 (NN unblock, if goal-driven):** U-NEG-SAMPLE-STRATIFIED (only after answering "what user-task does tier-5 GNN unblock?")

**Stage 6 (after backend-dev queue clears):** PRISM-APP-QUEUE picks up. Operator decides when to flip the switch.

---

## OPEN QUESTIONS FOR OPERATOR

These need an answer before v1.1 dispatches:

1. **Hermes** — build PRISM Hermes, or use external? (U-HERMES-CLARIFY)
2. **Lima slot** — operator claim, or distribute the 12 items to other slots?
3. **PRISM-APP-QUEUE timing** — ship backend-dev queue fully first, OR allow some operator-facing work in parallel (which contradicts "backend-dev BEFORE")?
4. **MS1 envelope** — formalize roadmap-consolidation as a milestone (v1 plan), OR treat as continuous ops lane (Axis #7 recommendation)?
5. **NN-GRAPH deploy goal** — what user task is unblocked by tier-5 GNN classifying ghost nodes? If none, deprioritize.

---

## NEXT JULIETT ACTIONS

1. Apply this v1.1 delta against v1 master plan (operator decision: write v2 file OR back-edit v1)
2. Create `state/shared/specs/PRISM-APP-QUEUE.md` with the ~660 deferred items
3. Operator answers the 5 open questions above
4. Spawn the 6 net-new prerequisite units (Stage 0) for slot dispatch
5. /schedule 24h re-audit against shipped commits

---

## SCRUTINY AGENT MANIFEST

10 parallel `reviewer` subagents covered: Karpathy discipline (#1), peer-claim conflicts (#2), doctrine-shift impact (#3), bridge-layer noise (#4), PRISM-app contamination (#5 — biggest finding), slot load balance (#6), missed/wrong dependencies (#7), already-shipped contamination (#8), hidden multipliers (#9), self-consistency (#10). All returned. 0 unresolved disagreements. Findings merged into this delta.
