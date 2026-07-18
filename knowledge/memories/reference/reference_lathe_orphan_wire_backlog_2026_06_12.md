---
name: reference_lathe_orphan_wire_backlog_2026_06_12
description: "Sierra helped the whiskey/lathe galaxy by replicating slot:bravo's cross-galaxy HELP pattern = the ORPHAN-WIRE PLAYBOOK (discover dark engines -> durable ROI-ranked wire queue -> wire each into its natural dispatcher -> doc-reflect the galaxy brain). Produced state/shared/specs/LATHE-ORPHAN-WIRE-QUEUE-2026-06-12.md (slot/sierra 7002ac7374), the lathe analog of bravo's SFC orphan-wire queue (U-SFC-ORPHAN-QUEUE 1987aed3f6). CORRECTED FINDING (R13 complete census): only 2 GENUINE orphans (SwissChannelFileEmitterEngine + SwissTypeDecisionEngine = U-BRIDGE-WIRE-SWISS); 251/253 lathe/turning engines ARE dispatcher-referenced. The workflow's '~20 orphans' was FALSE -- its discovery agent only grepped 4 dispatchers and missed calcDispatcher/threadDispatcher/cncOpsDispatcher/turningProgramDispatcher where they're really wired (TurningForceEngine -> real calcDispatcher.ts:8635 Kienzle handler). Real lathe gap is handler QUALITY (LUW02 coverage-gaming name-drops + dead actions + clobbered lathe_introspect router), NOT dark engines. Handed to whiskey via chat bus; wiring needs the TS build + shared tree."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.639Z
aliases: reference_lathe_orphan_wire_backlog_2026_06_12
---


# Lathe orphan-wire backlog -- sierra helps whiskey via bravo's pattern (2026-06-12)

Operator directive: "follow bravo's lead and start helping whiskey/lathe galaxy. read entire
sessions with bravo from the past few days so you gain context on what its doing for
foxtrot/milling."

## Bravo's cross-galaxy HELP pattern (the reusable ORPHAN-WIRE PLAYBOOK)
Extracted from bravo's own commit history (slot-query bravo + git show). When bravo helps another
galaxy (mill/foxtrot, SFC/oscar) it runs ONE repeatable playbook:
1. **DISCOVER dark engines** -- four signals in parallel: `ghost.unwired-engine` system-viz nodes;
   zero-dispatcher grep (PascalCase basename substring on `import("...<Base>.js")`, NOT a `\b`
   singleton-name grep which false-flags); FALSE `// WIRE-EXEMPT` tags (phantom consumers =
   comments / `surfaces_into` metadata strings / reverse refs, no real caller); DATA orphans
   (engine reachable only transitively via a bridge to a *different* dispatcher = not wired for the
   target galaxy).
2. **Durable ROI-ranked QUEUE** -- `state/shared/specs/<GALAXY>-ORPHAN-WIRE-QUEUE-<date>.md`; per
   row: unit id, engine+path, wire-state, natural dispatcher + proposed actions, ROI rationale,
   effort; status lifecycle CONFIRMED_TRUE_ORPHAN -> SHIPPED <commit>.
3. **WIRE each** -- enum entry (`<galaxy>_<noun>_<verb>` + inline comment citing unit/slot/date/
   R12-safety) + lazy import + case block with R12 guards (fail loud, `*_found` on nullable) +
   round-trip-THROUGH-the-dispatcher test (happy + PARITY[dispatcher==direct] + boundary + missing-
   param + >=2 adversarial). Evidence: U-SFC-RANKER-WIRE 9aa9ce20f2, U-SFC-OUTCOME-FOLDBACK-WIRE
   e436c2fc3f, U-MILL-HM-FIXTURE b4bdf8f699 (DATA orphan, 8 actions, 13/13).
4. **DOC-REFLECT** the verified `N/TOTAL wired` count into the galaxy MEMORY.md/CLAUDE.md
   (43feea586e mill galaxy-brain link-in).

## What sierra shipped for lathe (the queue = bravo's FIRST move, U-SFC-ORPHAN-QUEUE analog)
- Discovery via Workflow `wf_c1d4e12c-0a9` (5 agents: 4 sonnet read-arms + 1 opus synthesis).
- Spec `state/shared/specs/LATHE-ORPHAN-WIRE-QUEUE-2026-06-12.md` (slot/sierra `7002ac7374`).
- (workflow's INITIAL claim, since CORRECTED) "~20 true-orphan engines" -- see COUNT CORRECTION below;
  the real number is 2.
- **7 STALE WIRE-EXEMPT tags** -- engines that ARE imported+wired in turningDispatcher; the tag is
  false/backwards -> hygiene strip (one batch commit), NOT a wire.
- **Dead actions** registered in the ACTIONS enum with no handler/schema (`lathe_unified_physics_analyze`,
  `lathe_deep_ai_harden_analyze`, 4x `lathe_lora_*`, + schema gaps) -> advertised-but-broken = R12
  violations; complete the handler, don't re-add the enum entry.
- Highest ROI = physics-safety for JM's 7/7 Okuma OSP fleet: G76/G92 thread-method select,
  spindle-torque force, taper geometry.

## Verify-then-build held (the session's standing lesson)
Before publishing, sierra spot-checked the grep-based discovery: 4/4 sampled true-orphans CONFIRMED
(0 turningDispatcher imports + on-disk, real names not phantom); but `taper_turning_calculate` had
**0 occurrences in turningDispatcher.ts** despite being listed as a dead action there -> the
dead-action LOCATIONS are soft. So the spec is a TRIAGE queue with load-bearing `VERIFY` flags
("re-grep each dispatcher before editing the enum"), never a blind wiring list. Pairs with
[[feedback_never_claim_absence_without_deep_search]] + [[reference_sierra_completion_sweep_outcome_2026_06_12]].

## Handoff / lane
Posted to whiskey on `AGENT_CHAT.jsonl` (topic lathe-orphan-wire-backlog) with the top units inline
(the spec is on slot/sierra until B2 merges). Wiring itself needs the TS build (node_modules) + the
shared tree (turningDispatcher.ts is high-contention, 373 actions) -- whiskey's lane; this queue is
the triage handoff. Follow-up: Swiss family (U-BRIDGE-WIRE-SWISS) + milestone-named engines
(LatheOpusReasoning/MetaLearning/QualityGate) were outside the truncated-glob discovery -> need a
full set-difference pass. Roadmap already carries U-WIRE-BACKLOG-LATHE / U-BRIDGE-WIRE-LATHE /
U-BRIDGE-WIRE-SWISS.

## LUW02 clobber -- regression caught by the memory-recall hook (verify-then-build win)
The pre-Write memory-recall surfaced `reference_post_ship_lathe-unwired-wire-ms0-u-luw02`: whiskey
already shipped **LATHE-UNWIRED-WIRE-MS0/U-LUW02 (`3fd0b5b8f9`)** -- a generic `lathe_introspect`
router + `lathe_engine_registry` claiming Lathe coverage 66% -> 100%. This nearly made my backlog
duplicative, so I verified against canonical HEAD: (1) `3fd0b5b8f9` IS an ancestor of HEAD (merged),
but (2) **`lathe_introspect`/`lathe_engine_registry` is GONE from all of `mcp-server/src/`** (0
occurrences; only 2 residual `LUW02` comment markers in turningDispatcher.ts) -- the router was
**clobbered post-merge** by the churning multi-writer tree (same clobber class bravo hit at
43feea586e); and (3) even when present LUW02 was a coverage-SCANNER approach (its own message:
generic slug-route lazy-load + "falls through to defaultMethod" + engine-names referenced so the
scanner credits 43) -- NOT typed per-engine actions. So the Lathe* engines are dark AGAIN (a real
regression: wire-then-lost), AND bravo-style typed wiring is additive over a restored generic router.
Lesson reinforced: the memory-recall hook is a real verify-then-build backstop -- it caught a
near-duplicate before I misled whiskey; a per-engine `import()` grep is blind to a generic slug-router
(and vice-versa), so cross-check BOTH a name grep and the known wiring mechanism. Folded into the spec
(slot/sierra `dbf18f8f93`) + flagged to whiskey on the chat bus as a regression.

## COUNT CORRECTION -- the session's strongest verify-then-build catch (slot/sierra `635f75bd2a`)
The synthesis flagged its own glob as truncated and said "run the FULL set-difference before declaring
complete." I did (R13 comprehensive route) -- and it OVERTURNED the headline: of **253**
`Lathe|Turning|Okuma|Swiss` engines, **251 are dispatcher-referenced; only 2 are genuine orphans**
(`SwissChannelFileEmitterEngine`, `SwissTypeDecisionEngine` = `U-BRIDGE-WIRE-SWISS`). The workflow's
"~20 true orphans" was an artifact of its discovery agent grepping only `turningDispatcher`/`cam`/`cad`/
`aiReasoning` -- it MISSED `calcDispatcher`, `threadDispatcher`, `cncOpsDispatcher`,
`turningProgramDispatcher`, where those engines are really wired (verified: `TurningForceEngine` is a
real `await import("...TurningForceEngine.js")` Kienzle handler at `calcDispatcher.ts:8635`;
`ThreadMethodSelectorEngine`->`threadDispatcher`; `TaperTurningEngine`->`cncOpsDispatcher`). **LESSON
(both directions):** a per-dispatcher import grep UNDER-counts wiring (blind to cross-dispatcher +
generic routers) -> over-reports orphans; a "name.js appears anywhere" grep OVER-counts (credits
LUW02-style name-drops) -> under-reports. Neither single grep is truth. For a real orphan/dead-engine
verdict you must (a) enumerate against ALL dispatchers, AND (b) confirm a real `import()` + handler, not
a comment/registry name-drop. A multi-agent workflow does NOT exempt a finding from this -- I shipped a
wrong-count backlog from a 5-agent workflow and the cheap complete census corrected it. Always run the
exhaustive set-difference before publishing a "what's missing" list. Pairs with
[[feedback_never_claim_absence_without_deep_search]] + [[reference_sierra_completion_sweep_outcome_2026_06_12]].

## DEAD-ACTION audit also clean -- the workflow over-stated BOTH axes (slot/sierra `bedd67fa2b`)
Followed the engine census with a handler-quality audit: every lathe-surface action across
turning/turningProgram/thread/cncOps dispatchers has a real handler -- **0 dormant actions**. turningDispatcher
= 362 `case` handlers (> 354 ACTIONS-array entries, so nothing undeclared-and-dead); threadDispatcher routes
via `CALC_ACTIONS`/`CODE_ACTIONS` Sets + a `THREAD_MILL_ACTIONS` Record + an `if (action==="thread_method_select")`
(NOT switch/case -- a parser that only knows `ACTIONS=[...]`+`case` falsely reads it as 0 actions). So the
workflow's "dead actions" (`lathe_unified_physics_analyze`, `lathe_lora_*`, `taper_turning_calculate`) were
ALSO false, same pattern as the orphan over-count. **FINAL verified lathe state: the galaxy is healthy --
251/253 engines dispatcher-referenced, 0 dormant actions across all routing patterns; the ONLY real wiring gap
is U-BRIDGE-WIRE-SWISS (2 Swiss engines).** Lesson extension: audit EVERY routing pattern (switch-case AND
Set/Record/if) before calling an action dead -- a single-pattern parser under-reports exactly like a
single-dispatcher grep under-reports orphans.
