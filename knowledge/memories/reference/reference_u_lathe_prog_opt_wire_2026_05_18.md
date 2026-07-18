---
name: reference-u-lathe-prog-opt-wire-2026-05-18
description: 2026-05-18 kilo — closed wire-up gap on LatheProgramOptimizerEngine; lathe_program_optimize + lathe_program_estimate now callable via turning dispatcher (shipped 1a9c3374e6)
aliases: reference_u_lathe_prog_opt_wire_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.237Z
---


2026-05-18, slot kilo (claude-c0eb54b9), `/checkin-kilo /goal upgrade existing JM Die lathe programs ... /loop [5m] /goal`. After CAMX-MS0.3 batch wrapped, user redirected to lathe-program upgrade. R8 dedup-preflight found the right engine ALREADY built — `LatheProgramOptimizerEngine` (1512 LOC, line-by-line G-code analyzer + upgrader written specifically for JM Die "amateur to production" programs, with Kienzle/Taylor physics validation and JM_DIE_MAX_RPM/SAFE_CUTOFF_FEEDS/MIN_FINISH_FEED tables). Only `analyzeProgram` was exposed via dispatcher (`lathe_program_analyze`, BATCH3); the two upgrade surfaces — `generateOptimizedProgram` and `estimateImprovements` — had been built and unit-tested but were unreachable from any chat/skill/external MCP client.

**What shipped** (commit `1a9c3374e6`): 2 new turning-dispatcher actions wiring the existing engine methods. Strict BATCH3 sibling pattern (R11): `z.string().min(1)` on `content`, optional `file_path`, lazy import inside the case, action-name-prefixed type-guard throw, result assigned raw (the outer `slimResponse(result)` already handles MCP response shape uniformly).
- `lathe_program_optimize`  → `latheProgramOptimizerEngine.generateOptimizedProgram(content, file_path?)` returning `OptimizedProgram` (original + optimized + changes[] + metrics + patches)
- `lathe_program_estimate`  → `latheProgramOptimizerEngine.estimateImprovements(content, file_path?)` returning `ImprovementEstimate` (currentScore + projectedScore + cycleTimeReduction% + toolLifeImprovement% + topIssues[])

**Anti-regression**: new `U-LATHE-PROG-OPT-WIRE.test.ts` (17/17 PASS) — schema presence + safeParse rejection of invalid input + dispatcher-source grep (enum entry AND case label per action) + method-routing assertion with NEGATIVE-sibling guard (catches the cross-wire copy-paste class — assert the case slice contains `generateOptimizedProgram` AND does NOT contain `analyzeProgram(`/`estimateImprovements(`). Engine round-trip against 3 real JM Die Okuma fixtures (BRICO-132.min, A-6266.min, hex-pins-mark.min) with do-no-harm invariant (`optimizedScore >= originalScore`) and consistency invariant (`estimate.currentScore == optimize.originalScore`). Pre-existing engine test: 58/59 PASS — the 1 failing `Taylor equation tool life` test predates this commit and is unrelated (no engine code touched).

**Reviewer outcome**: per-file 2-reviewer scrutiny gate — Arm A (wiring-review-agent) verified ACTIONS enum + switch case + schema map + lazy-import + sibling-pattern conformance + test anti-regression guards — PASS with no P0/P1/P2/P3. Arm B (independent reviewer) PASS with 1 P2 + 3 P3 (P2: dispatcher.md convention says return `{success:true,data:...}` but BATCH3+BATCH4 sibling block in this dispatcher returns unwrapped — per R11 we matched sibling; P3 notes: positive review of test-design choices around 600-char case-slice + occurrences-≥2 guard + cache-clear between consistency calls).

**Why**: the engine had everything except the MCP surface — without the wire, no chat or skill or external client could invoke the upgrader. This is the "engine built but unreachable" class. R8 dedup-preflight was load-bearing — I almost built a parallel parser+upgrader before checking. The duplicated work would have been ~1500 LOC of redundant code violating the doctrine.

**How to apply**: (1) Engines often ship with PARTIAL dispatcher exposure — one method wired, others orphaned (the "wire-trio gap"). Check `grep -n "engineName\." dispatchers/*Dispatcher.ts` against the engine's public method list before assuming the wire is complete. (2) When wiring a SECOND method on an already-partially-wired engine, copy the existing sibling case BLOCK byte-identical, then swap the method name + action name. R11 conformance trumps re-deriving "the right" pattern. (3) The negative-sibling test guard (assert the case slice does NOT contain the sibling method) is the right pattern to catch the cross-wire bug class that just hit ARM B's check this session.

**Cross-chat commit absorption**: this commit absorbed peer FEATURE-GAP-AUDIT-MS0 working-tree hunks (`live_tool_plan` + `lathe_tribal_*`) that were uncommitted in the shared `H:/prism` tree at commit time — same class as [[reference_cross_chat_commit_misattribution_2026_05_18]] and [[reference_git_index_saturation_camx11_2026_05_18]]. Work preserved at HEAD; banner is U-LATHE-PROG-OPT-WIRE but those peer hunks ship under this SHA. The slot-worktree migration ([[reference_slot_worktree_activation_2026_05_16]]) is the structural fix; not done this session.

Related: [[feedback_box_programs_amateur]] (the original directive that produced the LatheProgramOptimizerEngine in the first place) · [[feedback_prioritize_devtools_backend]] (this wire-up is a devtools unit — pays on every downstream chat/skill/client) · [[reference_cross_chat_commit_misattribution_2026_05_18]] · [[feedback_copy_never_move]] (engine emits a new `.optimized` field, never overwrites `.original`).
