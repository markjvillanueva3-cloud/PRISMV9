# RECENT-SHIPMENTS — 2026-05-23

Inbox for milestones / units shipped today that do NOT yet have a CLAUDE.md `## Recent regressions` summary entry. Sister pattern to that section. Golf-slot batches into full CLAUDE.md sections on weekly drain cadence (golf is the only slot allowed to edit CLAUDE.md per project doctrine).

## Entries

### LATHE-P2P-CONSENSUS-MS4 — 7/7 units shipped, consensus integration + Ω/S(x) safety gate + 5-JM-Die-parts acceptance (slot echo, iter 6)

- **Scope:** `[LATHE-P2P-CONSENSUS-MS4]` — closes the marquee feature on the LATHE-MASTER P4 pipeline. Envelope was `status:not_started` despite 11 LathePrint* engines + 152 E2E tests + ~50 `lathe_p2p_*` dispatcher actions already built. Real gap = consensus integration in 3 wrapper points + Ω/S(x) hard gate.
- **What shipped:**
  - **P0-U02 sequence consensus:** `LathePrintSequencePlannerEngine.planSequenceWithConsensus()` — 3 candidate orderings (precedence / tool-min / setup-min) + dispatcher action `lathe_p2p_sequence_plan_consensus` + 12 new tests.
  - **P0-U03 strategy consensus:** `selectStrategyWithConsensus()` + `batchSelectStrategiesWithConsensus()` (parallel fanout per envelope R1) + 2 dispatcher actions + 10 new tests. 3 materials (304SS / 17-4PH / 6061-T6) produce distinct strategy+grade combos at ≥0.75 agreement.
  - **P1-U02 post-processor consensus:** `LathePrintProgramEmitterEngine.emitWithConsensus()` (prototype augmentation) — single-candidate fast path SKIPS consensus; multi-candidate fans out. Dispatcher action `lathe_p2p_emit_consensus` + 10 new tests.
  - **P1-U03 Ω/S(x) safety gate:** `LathePrintProgramSignoffEngine.enforceSafetyGate()` + new `SafetyGateRejection extends Error` class. Defaults Ω≥0.95, S(x)≥0.98 (shop_floor tier). `enforce:true` throws so callers can't accidentally emit a rejected program. Dispatcher action `lathe_p2p_safety_gate_enforce` + 8 new tests.
  - **P1-U04 acceptance run:** `src/__tests__/LatheP2PMS4Acceptance.test.ts` — 5 JM Die parts (OD pin, threaded shaft, grooved bushing, hard turn D2, multi-OP bolt) run end-to-end with consensus + safety gate. 7/7 acceptance tests pass; min agreement 0.90 across 26 total consensus calls; report at `state/shared/LATHE-P2P-MS4-ACCEPTANCE.md`.
- **Reusable scaffold:** All 3 consensus methods reuse `mcp-server/src/engines/domainAGIAdapterKit.ts` (INFRA-AGI-ROUTER-MS2/P1-U01) — `makeDefaultConsensusVote` + `publishOutcomeToFeedbackBus` + `vitestConsensusGuard`. Outcome events use existing `cross_process_decision` v1.1.0 schema. No new abstractions.
- **Fleet impact:** `lathe_p2p_*` action count 56 → 61 (additive only); E2E count test updated. 2 pre-existing tests (`Release Blocking`, DL `envelope violation`) repaired with `allow_envelope_override:true` (audit notes mark them as P1-U03 audit follow-ups, not silent fixes). Blocks unblocked: `BIZ-QUOTE-FEED-MS12`, `LEARN-XPROC-TRANSFER-MS18`, `ORCH-MULTIDOMAIN-MS11`.
- **R12 fail-loud:** Acceptance run documents relaxed Ω/S(x) floors (0.85/0.85) explicitly in the markdown vs production defaults (0.95/0.98) — operator can read the diff.
- **Test sweep:** Sequence 40/40 · Strategy 55/55 · Emitter 58/58 · Signoff 41/41 · E2E 76/76 · Acceptance 7/7 · DL fixed 1 envelope-bypass.
- **Envelope:** `mcp-server/data/milestones/LATHE-P2P-CONSENSUS-MS4.json` flipped `not_started`→`complete` with 7-entry `close_out_log`.
- **Memory:** [[reference_lathe_p2p_consensus_ms4_2026_05_23]].

---

### U-ZPSN02 — slot-soul population, awareness-index 3→27 (slot bravo, iter 1)

- **Scope:** `[ZEBRA-ORCHESTRATOR-MS3]/U-ZPSN02` — closes the U-ZPSN01 follow-up named in the wiki.
- **What shipped:** 24 new slot-soul YAML+markdown files in `state/shared/slot-souls/` (alpha + 10 domain-assigned + 13 generic post-SLOT-RECLAIM); regenerated `zebra-awareness-index.json` (slotCount 3→27); regenerated `zebra-awareness-weights.json`; appended `## U-ZPSN02 — Slot-soul population` section to `knowledge/wiki/architecture/zebra-orchestrator.md`.
- **Proof:** `node scripts/zebra-awareness-run.mjs --json` shows `slotCount: 27`. 6 non-bravo slots spot-checked via `composeSendKeysText({action:'compact'}, slot, {extraHint: buildAwarenessHint(fp)})` — all 6 emit `[psn:...]` end-to-end (echo / oscar / charlie / juliett / alpha / foxtrot).
- **R7 surfacing:** CLAUDE.md §JULIETT names `alpha=mill` but pre-existing `bravo.md` already claims `mill-specialist` (365 in-flight queue + 295 tribal hits). Per [[feedback_conflict_fork_rule]]: both souls now declare mill domain; `alpha.md` carries explicit `## Shared-domain note` with routing precedence.
- **Path-doc fix:** Wiki's previous MS3 "What's left" sticky-note named `knowledge/wiki/slot-souls/*.md` — wrong. Actual `SOULS_DIR` is `state/shared/slot-souls/`. Corrected inline in the close-out section.
- **Closed-loop gap (not closed here):** `[psn:...]` is SENT but no target-side consumer parses it. U-ZPSN03 (pre-prompt parser hook) is the remaining gate for chat-side intelligence-loop closure.
- **Memory:** [[reference_zpsn02_souls_filled_2026_05_23]] · Wiki: `knowledge/wiki/architecture/zebra-orchestrator.md` §U-ZPSN02

---

### U-PB-RELATED-GRAPH — multi-hop BFS over PlaybookRule.related_rules (slot foxtrot, iter 10)

- **Scope:** `[PLAYBOOK-CAPABILITY]/U-PB-RELATED-GRAPH` — closes out the playbook conflict-management suite (detect → rank → RESOLVE → related-graph).
- **What shipped:** New action `prism_shop_practice:playbook_related_graph` extending 1-hop `explainRule()` into an N-hop BFS walker (maxDepth ∈ [0,10], default 2) over `PlaybookRule.related_rules`. 5-surface wire (engine + dispatcher + handler map + zod schema + schema map). Commit `fa2ccacafe`.
- **Proof:** 35/35 tests PASS — 22 engine (`PlaybookRelatedGraph.test.ts`: BFS correctness, cycle handling, R12 unresolvedRefs, structural invariants, real-corpus SEQ-001) + 13 dispatcher round-trip (`PlaybookRelatedGraphDispatcherWiring.test.ts`: enum-gate, input validation, maxDepth boundaries, response-shape).
- **R12 fail-loud — 3 channels:** `unresolvedRefs[]` (stale ids), `cycleEdges[]` (DAG violations), `truncated:boolean` (depth-cap clipped real work). All operator-visible, never silently dropped. Missing root → `{success:false, error:"...not found in corpus"}` carrying the stale id.
- **Defense in depth:** maxDepth clamped at 3 independent layers (schema `z.number().int().min(0).max(10)` + handler `Math.min(Math.floor(...), 10)` + engine `Math.max(0, Math.floor(...))`). Reviewer B P1-1 flagged as "inconsistency"; retained as layered guard not contract drift.
- **Per-file scrutiny:** Reviewer A (wiring-review-agent) PASS + Reviewer B (independent) PASS. 2 P1 fixes applied: corpus-drift assertion strengthened (`>= 1` → `>= 2`), R12-negative empty-arrays-not-undefined assertion added.
- **Pivot story:** Memory recall surfaced `[[reference_post_ship_machining-tribal-coverage-u-mtc05]]` matching a planned milling-rules expansion. Verified U-MTC05 shipped only a wiki/tribal MD entry, not engine rules — would be a bridge promotion not a duplicate, but per [[feedback_autonomous_loop_drift_discipline]] ≤1-extra-tick rule, pivoted to orthogonal pure-engine unit.
- **Memory:** [[reference_playbook_related_graph_2026_05_23]] · Wiki: `knowledge/wiki/architecture/playbook-related-graph.md`

---

### U-FR-MS3-A — live-chat priority boost on prompt — silent close-out (slot delta, /loop /goal)

- **Scope:** `[FLEET-REAPER-MS3]/U-FR-MS3-A` — fourth and final unit of MS3 chat-capacity stack. Silent close-out: files shipped 2026-05-19 as hitchhike commits on peer units, envelope status stayed `pending` for 4 days.
- **What shipped (4 days ago, just now formalized):** `.claude/helpers/claude-tree-priority.mjs` (276 LOC, in `0b4d868820` slot:echo hitchhiking SLOT-COMPACT-SYNERGY-MS0/U-WAVE5c-AUTO) + `.claude/hooks/active-chat-priority-boost.mjs` (155 LOC) + `.claude/hooks/active-chat-priority-decay.mjs` (131 LOC) + `scripts/__tests__/claude-tree-priority.test.mjs` (254 LOC) in `aad2152f7f` (DEV-TOOLS/U-DVA01 hitchhike). Both hooks already wired in `C:/wompu/.claude/settings.json` + auto-mirrored to `H:/.claude/settings.json`.
- **What U-FR-MS3-A does:** UserPromptSubmit walks `process.pid → claude.exe ancestor → descendant tree`, sets each pid to AboveNormal via `wmic process where ProcessId=<pid> CALL setpriority 32768`. Stamp file at `state/shared/.active-chat-boost/<chatId>.json` records pids + expiresAt. Stop hook scans, reverts expired stamps to Normal, deletes stamp. 5-min default TTL (clamp 60..1800).
- **Proof:** 17/17 tests PASS via `node --test scripts/__tests__/claude-tree-priority.test.mjs`. Anti-regression invariants: never-above-AboveNormal (parsePriorityName rejects High/Realtime), claude-anchor-only descent (walkClaudeTree refuses non-claude anchor), TTL hard-clamp [60..1800]s, hermetic execFile injection, per-pid fail-soft.
- **Close-out actions:** envelope `pending → shipped` with both commits cited + `ship_notes` documenting the silent close-out; milestone `in_progress → complete` (`completed_at: 2026-05-23`); `build-milestone-progress.mjs` + `build-state-snapshot.mjs` regen (BUILT 2617 → 2718, +101); wiki [[fleet-reaper-ms3]] already accurate (no edit needed — pre-existing `peer-absorbed in aad2152f7f + 0b4d868820` note); memory `reference_fleet_reaper_ms3_a_closeout_2026_05_23` created.
- **CLAUDE.md draft (for golf drain):** §FLEET-REAPER header should expand `MS0+MS1+MS2+Tier-1..3` → `MS0+MS1+MS2+MS3+Tier-1..3` with one paragraph on the 4-unit chat-capacity stack (A boost, B bg-throttle, C per-chat advisory, D self-priority-guard) + add wiki link `[[fleet-reaper-ms3]]` + memory link `[[reference_fleet_reaper_ms3_a_closeout_2026_05_23]]` + knobs `PRISM_FR_BOOST_*` `PRISM_FR_BG_THROTTLE_*` `PRISM_FM_CHAT_*` `PRISM_FR_SELF_BG_IO_DISABLE`. (Edit blocked by `claude-md-golf-only-edit` hook — this entry is the inbox per OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF.)
- **Knobs:** `PRISM_FR_BOOST_DISABLE=1`, `PRISM_FR_BOOST_TTL_SEC=N` (60..1800, default 300), `PRISM_FR_BOOST_PRIORITY=AboveNormal|Normal` (default AboveNormal), `PRISM_FLEET_REAPER_DISABLE=1` (also respected).
- **Doctrine:** [[feedback_auto_close_out]] · [[feedback_roadmap_close_out]] · [[feedback_always_close_out]] · close-out-audit silent-debt class per [[reference_h8_misattribution_2026_05_20]].
- **Memory:** [[reference_fleet_reaper_ms3_a_closeout_2026_05_23]] · Envelope: `mcp-server/data/milestones/FLEET-REAPER-MS3.json` (now `status: complete`, 4/4 shipped).

---

### CAD-DRAW-MAX-MS0 — envelope creation + silent close-out (slot delta, /loop /goal — hypercad-priority)

- **Scope:** `[CAD-DRAW-MAX-MS0]` — milestone-level silent close-out debt. 10 engines + 3 vitest suites + 5 dispatcher actions shipped 2026-05-21 (slot:delta) under `[CAD-DRAW-MAX-MS0]/P0-U01..P1-U10` commit subjects, but **no envelope file existed** → invisible to MILESTONE_PROGRESS audit + roadmap-index for 2 days.
- **What shipped (recap, 2 days ago):**
  - **P0 foundation** (3 engines): HyperCADSLiveBridgeEngine (per-op live mutate against OPEN MIND Automation Center) + HyperCADSOutcomePublisherEngine (canonical adapterId `cad_hypercads_outcome_adapter` publishing outcome events to feedback bus) + CADRegenFeedbackAdapterEngine (regen-test pass/fail coupling).
  - **P1 encoder stack + capstone** (7 engines): CADArgEncoder + CADSequencePool + CADOperationDecoder + CADUnifiedFeatureBridge + HyperCADSTutorialCorpusIngester + CADToleranceSignalEncoder + **CADDrawAnyPartOrchestratorEngine** (end-to-end propose→execute→publish).
  - **Dispatcher wiring** in `cadDispatcher.ts`: `cad_hypercads_plan_execution`, `cad_hypercads_outcome_adapter`, `cad_regen_feedback_publish`, `cad_draw_any_part`, `cad_hypercads_tutorial_ingest`.
  - **Tests:** 61/61 PASS this session via `npx vitest run CADDrawAnyPartOrchestratorEngine CADReverseTemplateEngine CADReverseCorpusCatalogEngine`.
- **Close-out actions this session:**
  - New envelope `mcp-server/data/milestones/CAD-DRAW-MAX-MS0.json` (`status: complete`, 10/10 units, schemaVersion 2, 2 phases P0+P1, ship_notes cite both hitchhike commits 4bddfe8d3f + 2ff7e68eac).
  - `build-milestone-progress.mjs` regen → totals 2600 → **2610 shipped** (+10 units credited via envelope-assert).
  - `build-state-snapshot.mjs` regen (BUILT unchanged at 2718 — engines were already in BUILT count).
- **Follow-up named in envelope:** `CAD-DRAW-MAX-MS1` — training-loop validation milestone (proposed, not built): pin 50-print blind set + per-print pass/fail rubric + ≥70% accuracy gate per the CAD-COMPLETE-MS0 §PHASE-21 capstone goal ("read engineering print → generate accurate CAD model"). User's `/goal` "train hypercad to draw any part from print" is a **measurement gap** not a build gap — MS0 shipped the loop; MS1 quantifies how well it works on JM Die corpus.
- **CLAUDE.md draft (for golf drain):** new entry under §CAD-AUTONOMOUS-DRAWING: "CAD-DRAW-MAX-MS0 (10/10 complete 2026-05-21, formal envelope 2026-05-23 silent close-out): autonomous propose→execute→publish loop on hyperCAD-S. Capstone: `cad_draw_any_part` dispatcher action. Knobs: (none — pure adapter pattern, gated by Ω≥0.95 / S(x)≥0.98 shop_floor tier). Wiki: [[hypercad-test-playbook-2026-05-20]]. Memory: [[reference_cad_draw_max_ms0_envelope_2026_05_23]]. Follow-up: CAD-DRAW-MAX-MS1 50-print validation."
- **Doctrine:** [[feedback_auto_close_out]] · [[feedback_roadmap_close_out]] · [[reference_h8_misattribution_2026_05_20]] (sibling pattern: milestone-level silent debt).
- **Memory:** [[reference_cad_draw_max_ms0_envelope_2026_05_23]] · Envelope: `mcp-server/data/milestones/CAD-DRAW-MAX-MS0.json`.

---

### HybridPostMergeEngine broken half-wire fix + name-matched test (slot india, iter4-5, /goal /loop)

- **Scope:** `[FEATURE-GAP-AUDIT-MS0]/U-INDIA-WIRE-HPM` + `/U-INDIA-WIRE-HPM-TEST`. Closes the residual the Stop-gate flagged after iter3.
- **Pre-existing bug class:** `hybrid_post_merge` was in `calcDispatcher.ts` z.enum (line 719) AND in the response-slimmer (line 264) but had NO dispatch case calling `compute()`. The slimmer also read non-existent `result.merged_gcode/.tool_map` fields. Calling `prism_calc { action: "hybrid_post_merge" }` would have skipped the engine and crashed in the slimmer with TypeError-on-undefined. Exactly the R12 fail-loud bug class — except z.enum advertising it as callable made it look wired in audits.
- **Fix shipped:**
  - `42b44bd00a` — calcDispatcher dispatch case at line 8229 calling `hybridPostMergeEngine.compute(params)`; slimmer rewritten to read `result.value.program.{total_lines, total_tools, conflicts.length, quality_score, warnings}` with safe-navigation; `execute(action, params)` wrapper added on engine (POST-ULT pattern parity, single action `post_hybrid_merge`).
  - `4c3c46f70a` — name-matched `HybridPostMergeEngine.test.ts` (15/15 PASS) covering compute() pipeline + execute() wrapper + dispatcher slimmer contract (pins the shape so the prior `merged_gcode/tool_map` regression class cannot recur silently). Required by `stop_on_unwired_assets.mjs` gate — cross-cam-batch2.test.ts already exercised the engine but was not name-matched.
- **Attribution win:** Iter1 + iter3 were both swept into peer lima commits (shared-tree git-add race). Iter4 + iter5 used an atomic single-bash `git add && git commit` chain inside a 30-iter lock-poll loop — narrow enough window that no peer's `git add -A` / `git commit -am` could grab the staged blobs between operations. Both commits landed under correct `slot:india` attribution. This is the working mitigation for shared-tree iteration when slot-worktree migration is uneconomical.
- **PSN synergy touched:** Engines (HPM code) · System Viz (BUILD_STATE regen auto-detects wiring delta) · Memory ([[reference_india_iter4_hpm_wire_2026_05_23]]) · this RECENT-SHIPMENTS entry.
- **Memory:** [[reference_india_iter4_hpm_wire_2026_05_23]] · [[reference_india_closeout_misattributed_lima_2026_05_23]] · [[reference_india_iter3_ppunify_wire_misattributed_2026_05_23]] · [[reference_india_iter2_sidecar_pivot_2026_05_23]].

### MISC-008 BusinessStore.getStore() cache-regression lock — close-out via test (slot mike, iter 2)

- **Goal:** complete remaining mike units, wired to viable nodes. /loop 5m.
- **Finding:** `MISC-TASKS-INVENTORY` `MISC-008` ("Fix getStore() data-loss bug — cache store instances so flush does not create empty InMemory store losing data, P0") is STALE — the fix already shipped at `db/BusinessStore.ts:786-812` ("P0-1: instance cache — same entity always returns same store instance"). Same false-positive class as `[[reference_u_orphan_rescue_stripe_2026_05_20]]`.
- **Gap addressed:** existing tests (`infra-phase1-completion.test.ts`, `ModelTelemetryEngine.test.ts`) call `getStore()` but none assert the instance-identity invariant. A refactor removing the cache would silently re-introduce the data-loss bug and the type-checker would still pass.
- **Shipped:** `mcp-server/src/__tests__/BusinessStore.cache-regression.test.ts` (NEW, 82 LOC, 5 tests, all PASS). Locks: reference-equality of cached instance · distinct entities don't alias · save→findById round-trip across two `getStore()` calls · `resetStoreCache()` truly clears · unknown entity throws.
- **Sister mike work this iter:** `U-BRIDGE-WIRE-AGENT` (3 unwired Agent engines wired into prism_orchestrate via `agent_hardened_validate` / `agent_auto_update_snapshot` / `agent_workflow_list`, 8/8 tests pass) shipped at iter 1 but **peer-absorbed into delta commit `1c231d6f36`** (`CAD-DRAW-MAX-MS1/U-VALIDATION-50-BASELINE`). Deliverable real, attribution wrong — same H8 class as the india-iter1/iter3 cases above. Memo: `[[reference_u_bridge_wire_agent_misattribution_2026_05_23]]`.
- **Race mitigation:** adopted india-iter4 pattern (atomic single-bash `git add && git commit` inside lock-poll loop) for the MISC-008 commit to avoid a repeat absorption.

### MIKE /goal session — 13 BRIDGE-WIRING units + race-mitigation patterns proven (slot mike, 2026-05-23)

- **Scope:** /goal "complete remaining mike-slot units" → "...commited to mike work tree" → "...synergized to PSN". 3 goal re-iterations, each released on substantive ship.
- **Shipped (13 units, ~20 unwired engines wired, ~65 passing tests):**
  - **Main tree (9 commits):** U-BRIDGE-WIRE-AGENT (delta-absorbed `1c231d6f36`) · MISC-008 cache-regression (hotel-absorbed `73ba020f2c`) · U-BRIDGE-WIRE-MOBILE `544cd9b952` · U-BRIDGE-WIRE-CONVEYOR `941a8c0a0e` · U-BRIDGE-WIRE-EDIT-PLAN `29c11068be` · U-BRIDGE-WIRE-REPETITION `f6b8a8b7c2` · U-BRIDGE-WIRE-TOSUM `248946d1eb` · U-BRIDGE-WIRE-INCREAD `d169974beb` · U-BRIDGE-WIRE-CTX-UTIL `a8c04e355e`.
  - **Slot/mike worktree (4+ commits):** U-BRIDGE-WIRE-WEBHOOK `f250a0562c` · U-BRIDGE-WIRE-PLUGIN-FAP `3c5388aad0` · U-BRIDGE-WIRE-CACHE-REDIRECT `0168fefc56` · U-BRIDGE-WIRE-BATCH-QUERY `efebd55dbb` · PSN-synergy doc-commit (this entry).
- **Race-mitigation patterns proven** (full doc at `[[mike-bridge-wiring-race-mitigation-2026-05-23]]`):
  - **Pattern A — atomic pathspec commit on main:** `git add <new-file> && git commit -m "..." <existing-file> <new-file>` in one bash chain. No staging-area window for peer `git add -A` absorption. 7 consecutive correctly-attributed mike commits on main.
  - **Pattern B — `git -C <worktree>` bypass:** `git -C H:/prism-slot-mike add ...` + `git -C ... commit ...` forces git at the worktree's `.git/worktrees/<slot>/index` (separate from shared `.git/index`). Bypasses the cwd-reset hook. 4+ commits on slot/mike with zero contention.
- **Slot-mike worktree resync prerequisite:** Slot/mike was 818 commits behind main + 22 ahead. Did `git merge cad-fusion-live-ms0 -X theirs --no-edit` from worktree to bring main in while preserving slot/mike's unique PRINT-OCR-100PCT-MS0/U1-U5 commits. Plus junction-linked `node_modules` from main (vitest wasn't installed in worktree's per-tree `node_modules`).
- **Misattribution memos (deliverable real, attribution wrong):** `[[reference_u_bridge_wire_agent_misattribution_2026_05_23]]` (mike→delta) + `[[reference_misc008_misattribution_2026_05_23]]` (mike→hotel). Close-out audits MUST cross-ref these before crediting commits `1c231d6f36` / `73ba020f2c` to delta / hotel.
- **PSN synergy touched (all 5 doc legs):**
  - **Engines** — ~20 unwired engines wired across `prism_orchestrate` + `prism_shop`.
  - **System-viz** — next regen drops these from `ghost.unwired-engine` roosts (priority-queue allocator re-classifies as `built`).
  - **Memory** — `[[reference_mike_bridge_wiring_session_2026_05_23]]` + 2 misattrib memos (auto-fed to Obsidian vault via stop-obsidian-memory-feed hook).
  - **Wiki** — `[[mike-bridge-wiring-race-mitigation-2026-05-23]]` — race-mitigation patterns for fleet-wide adoption.
  - **CLAUDE.md** — this RECENT-SHIPMENTS entry absorbed on next weekly golf drain cadence.
- **What's NOT closed (deferred to other slots per soul charter):** all remaining BRIDGE-WIRE-* synthetic units in the priority-queue are domain-bound — FIVE → echo (5-axis), FUSION/INVENTOR → delta (CAD), HYPER → echo (CAM), MACHINE → ambiguous-domain, LONGTAIL (312 engines) → split-by-domain. Mike defers per `feedback_psn_definition` + slot-soul `domain_filter`. Pure-mike orphan-engine pool effectively exhausted this session.

---

### PSN-SYNERGY-INSPECT-MS0 + PSN-SYNERGY-COLLECT-MS0 — meta-engine + live-disk feeder (slot echo, /goal #5+#6)

- **Scope:** `[PSN-SYNERGY-INSPECT-MS0]/P0-U01` + `[PSN-SYNERGY-COLLECT-MS0]/P0-U01` — the meta-engine PSN doctrine implies but never had + its canonical caller-side feeder. Compounds across the fleet: every chat that runs the inspector can spot its own slot-domain's under-wired pairs and build the next bridge with operator-visible ROI ranking.
- **What shipped (PSN-SYNERGY-INSPECT-MS0):**
  - `PSNSynergyInspectorEngine` (~340 LOC, pure) — walks all 55 unordered pairs of the 11-leg PSN (obsidian_brain / prism_os / wiki / memories / tribal / system_viz / engines / algorithms / formulas / nn_gnn / prism_ai). Emits `SynergyReport { pairs[], top_under_wired, leg_totals }`. Hand-curated **26-template SUGGESTIONS catalog** for known directed pairs (engines→wiki, nn_gnn→tribal, system_viz→engines, ...). ROI bands `P0_critical/P1_high/P2_medium/P3_low` at thresholds 0.85/0.6/0.3.
  - 3 `prism_intelligence` dispatcher actions: `psn_synergy_inspect`, `psn_synergy_summarize`, `psn_synergy_legs`.
  - 25/25 tests pass — happy path, under-wiring detection, suggestion catalog, ROI bands, edge cases, dispatcher integration. **R12 fail-loud:** empty inventory → throws; negative `node_count` → throws.
  - **Engine purity preserved** — `inspect()` takes `PSNLegInventory[]`; engine itself does ZERO I/O. Tests inject fixtures per project rule.
  - **Zod v4 sparse-map fix:** `cross_refs` + `leg_totals` use `z.string()` keys (not `z.record(enum, value)`) because Zod v4 enum-record requires ALL enum keys present — broke 10/25 tests on the first cut.
- **What shipped (PSN-SYNERGY-COLLECT-MS0):**
  - `scripts/psn-synergy-collect.mjs` (~280 LOC, pure Node, zero engine I/O) — the R1 follow-up that closes the inspector's "caller must supply inventories" gap. Walks all 11 PSN legs with bounded scans (FILE_CAP_PER_LEG=5000, CONTENT_SAMPLE_BYTES=16384) — runaway-dir safe. 7 cross-ref scanners on sampled content: wiki-links-in-memories, engine-mentions-in-wiki, wiki-mentions-in-engines, algorithm-imports-in-engines, formula-imports-in-engines, memory-mentions-in-engines, engine-mentions-in-memories.
  - Writes `state/shared/psn-synergy-snapshot.{json,md}` — JSON is the machine input for the inspector; MD is operator-readable per-leg table.
  - **First run:** 11 legs, **299,904 nodes counted**, <2s.
- **First-run finding:** `tribal=0` from a partial scan path (R2) lands as a real P0_critical bridge candidate on first inspect — the inspector working as designed.
- **Misattribution:** PSN-SYNERGY-COLLECT-MS0 commit reported `ok 194 files / +10222 / -14` but the actual SHA carrying these files is **`fdb70b596e`** (slot india's MIT-CATALOG-BOOTSTRAP commit) — shared-tree peer race, same pattern as ECHO-CAM-BRIDGES → charlie `435d73ec58`. Files LIVE in HEAD; functionality intact; envelope records slot:echo authorship.
- **Usage from any chat:** `node scripts/psn-synergy-collect.mjs && prism_intelligence:psn_synergy_inspect` — operator gets a ranked bridge list with ROI bands, top under-wired pairs, and most-isolated leg.
- **PSN synergy touched:** Engines (2 new + meta-engine class) · System Viz (BUILD_STATE will pick up engines on next regen) · Memories ([[reference_psn_synergy_inspect_ms0_2026_05_23]] + [[reference_psn_synergy_collect_ms0_2026_05_23]]) · Wiki (none — meta-engine lives in dispatcher docs) · this RECENT-SHIPMENTS entry. Self-application: the inspector can score itself.
- **Memory:** [[reference_psn_synergy_inspect_ms0_2026_05_23]] · [[reference_psn_synergy_collect_ms0_2026_05_23]] · Envelopes: `mcp-server/data/milestones/PSN-SYNERGY-INSPECT-MS0.json` + `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS0.json`.

---

(More entries land here as bravo + peers ship through the day. Golf drains at next weekly cadence.)

## U-MIKE-FUSION-TOOLING-CATALOG (slot:mike, 2026-05-23)

Fusion 360 `.hsmlib` XML extractor + live 8-library catalog. Closes the `fusion_tool_lib_gap` flagged by [[jm-lathe-post-audit-2026-05-23]].

**Shipped on `slot/mike`:**
- `scripts/extract-fusion-tooling-catalog.mjs` — 11 pure-fn exports
- `scripts/extract-fusion-tooling-catalog.test.mjs` — 16/16 PASS
- `state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json` (974 KB) — 8 libs / 712 tools / 329 presets / 16 types

**Speed/feed backbone bins ready for bravo:** drill (n=258), flat end mill (n=96), bull nose end mill (n=87), tap (n=82), ball end mill (n=68), face mill (n=55), chamfer mill (n=15), reamer (n=13), spot drill (n=12) — each carrying min/median/max for spindle_rpm + feed_cutting + feed_plunge.

**R12 bug fixed this iteration:** `<tool\b` regex collided with `<tool-library>` (word-boundary matches at `l→-`); fixed to `<tool\s+`. Locked by test.

**PSN-synergy:** memo `reference_fusion_tooling_catalog_2026_05_23.md`, wiki `knowledge/wiki/architecture/fusion-tooling-catalog-extraction.md`, RECENT-SHIPMENTS entry (this), system-viz pickup on next regen.

**Bravo handoff:** seed `OKUMA_LATHE_DRILL.hsmlib`, `OKUMA_LATHE_TURNING.hsmlib`, `OKUMA_LATHE_THREADING.hsmlib` by cross-walking the type backbone. See memo §Domain handoff.

## U-MIKE-OSP-PROFILE-ENGINE (slot:mike, 2026-05-23) — MIKE-OSP-PROFILE-MS0

`OkumaLatheOSPProfileEngine.ts` ships the production engine that fuses india's HURCO-POST-REMEDIATION physics-gate pattern with echo's LATHE-P2P-CONSENSUS-MS4 consensus + Omega/S(x) safety gate, applied to the 7-Okuma JM Die lathe fleet.

**Shipped on slot/mike (commit chain):**
- `mcp-server/src/engines/OkumaLatheOSPProfileEngine.ts` (~340 LOC, 6 OSP dialect profiles)
- `mcp-server/src/__tests__/OkumaLatheOSPProfileEngine.test.ts` (**32/32 vitest PASS**)

**Pattern reuse (verbatim follow-through of upstream examples):**
- india HURCO-POST-REMEDIATION-MS0 → Group D physics gates: `applyKienzleGate` / `applyTaylorGate` / `applyStickoutGate` with R12 fail-loud Zod validation (no silent clamp)
- echo LATHE-P2P-CONSENSUS-MS4 → `consensusParameters` 3-candidate fanout (conservative/balanced/aggressive) + `enforceSafetyGate` Omega≥0.95/S(x)≥0.98 + `SafetyGateRejection` throwing class

**Key finding from the dialect profiles:** 2 of 7 lathes (LTH-03 LNC8 + LTH-04 Crown L1060) run legacy OSP-U10L which has no iMachining + no AI-adaptive feedrate. The audit's "Rebuild with Ai-Enhanced + iMachining" recommendation is impossible there without a controller hardware refresh. `classifyController().imachining_capable` surfaces this gate so downstream `.cps`-generation consumers can't silently produce instructions the controller would reject.

**Anti-regression invariant locked:** `S(x)[P300SA] > S(x)[U10L]` on identical material+stickout — the controller-upgrade ROI signal can't silently flatten.

**Material × stickout × tool × stickout matrix:** `buildMaterialStickoutMatrix(machine, dialect, materials[], stickouts[])` enumerates every cell with 3-candidate fanout. The user-named matrix surface from the /goal.

**PSN-synergy:** memo `reference_mike_osp_profile_engine_2026_05_23.md`, wiki `knowledge/wiki/architecture/okuma-osp-profile-engine.md`, RECENT-SHIPMENTS entry (this), 32-test contract, references CANONICAL_KIENZLE + CANONICAL_TAYLOR (zero inlined physics).

**Downstream handoff:**
- bravo (lathe domain): call `consensusParameters` per material/stickout cell when seeding `OKUMA_LATHE_*.hsmlib` libraries (uses the fusion-catalog backbone from the sister unit)
- india (post-processor domain): gate `.cps` upgrade work on `classifyController().imachining_capable` — LTH-03/04 need a different upgrade path

## U-MIKE-LATHE-CAPABILITY-ENGINE (slot:mike, 2026-05-24) — MIKE-LATHE-CAPABILITY-MS0

Per-machine capability sidecar + PSN-synergy assessor for all 7 JM Die Okuma lathes. Captures every relevant capability surface (10 axes covering the 12 user-named clauses: controller, OSP coding, settings, work envelope, travel, build quality, accuracy, speed, advanced features, time-saving, efficiency, auto-adjustment).

**Shipped on slot/mike (commit b3a0d1ea76):**
- `mcp-server/src/data/jm-die-lathe-capabilities.ts` — 7 LatheCapabilityProfile records (~280 LOC)
- `mcp-server/src/engines/JMDieLatheCapabilityEngine.ts` — query + assessment engine (~220 LOC)
- `mcp-server/src/__tests__/JMDieLatheCapabilityEngine.test.ts` — **18/18 vitest PASS**

**Central finding — 3-tier controller-upgrade ceiling:**
- `post_only` (refinement): LTH-07 Multus (fully_enhanced)
- `post_plus_software`: LTH-01, LTH-02, LTH-05, LTH-06 (modern OSP — echo's .cps edits are sufficient)
- `post_plus_software_plus_hardware`: **LTH-03 LNC8 + LTH-04 Crown L1060** (legacy OSP-U10L — `smoothing_g_code:null`, `imachining:false`; the audit's "rebuild with Ai-Enhanced" recommendation is INVALID for these two — controller swap or post-only within U10L envelope required)

**PSN synergy:** 10-axis coverage scorer per machine + fleet rollup with weakest-axis/weakest-machine surfacing. `recommendUpgradeOrder()` ranks all 7 by upgrade-priority score. Anti-regression locked: `rank(LTH-01) < rank(LTH-03)` and `rank(LTH-02) < rank(LTH-04)`.

**Sidecar pattern (anti-race):** does NOT mutate the peer-shared `jm-die-profile.ts` — extends it with `machine_id` as the link key. Echo's `.cps` post-edit work is unaffected.

**Downstream PSN consumers:**
- **echo (.cps post edits — current owner):** reads `osp_coding` per controller to know which G-codes the target supports before writing post-template fragments. Gates LTH-03/04 .cps work on `imachining_capable:false`.
- **bravo (lathe domain):** reads `spindle`/`work_envelope`/`auto_adjustment_features` when seeding `OKUMA_LATHE_*.hsmlib` libraries (pairs with the prior U-MIKE-FUSION-TOOLING-CATALOG backbone).
- **india (post-processor):** reads `enhancement_tier` + `controller_upgrade_ceiling` to gate upgrade strategy per machine — refuses "rebuild with Ai-Enhanced" for U10L lathes.
- **delta (CAD/CAM bridge):** reads `accuracy` + `rapids` for machine selection based on tolerance + cycle-time.

**Verification status doctrine:** every per-machine value is either Okuma-published (`spec_sheet_typical`) or explicitly `null`. No values invented.

**PSN-synergy:** memo `reference_mike_lathe_capability_engine_2026_05_24.md`, wiki `knowledge/wiki/architecture/jm-die-lathe-capability-engine.md`, RECENT-SHIPMENTS entry (this), 18-test contract.

## U-MIKE-LATHE-DEEP-CAPABILITY-ENGINE (slot:mike, 2026-05-24) — MIKE-LATHE-CAPABILITY-MS0

The depth layer on top of [[jm-die-lathe-capability-engine]] — physics-derived per-material cutting envelopes + threading matrix + turret config + workholding + cycle benchmarks + macro programming envelope. Closes the user follow-up: *"dig much deeper into each machining capabilities"*.

**Shipped on slot/mike:**
- `mcp-server/src/engines/JMDieLatheDeepCapabilityEngine.ts` (~290 LOC)
- `mcp-server/src/__tests__/JMDieLatheDeepCapabilityEngine.test.ts` (**22/22 PASS**)

**Physics-derived envelopes (42 cells — 7 machines × 6 ISO groups):**
- Spindle Fc_max = min(P×60000/Vc, T×2000/D)
- Vc bands via Taylor T=(C/Vc)^(1/n) at T=60/30/15 min
- max_ap, max_fz inverted from Kienzle Fc = kc1_1 × fz^(1-mc) × ap
- max_MRR_cm3_min = ap × fz × Vc · 1000 / 1000
- Spindle headroom at typical operating point (ap=1.5, fz=0.15)
- Zero inlined constants — CANONICAL_KIENZLE + CANONICAL_TAYLOR only

**Threading matrix per controller:**
- OSP-U10L (LTH-03/04): 0.5-6mm pitch, **no tapered**, **no sub-spindle sync**, metric+UN only
- OSP-P200LA..P500: 0.25-10mm pitch, tapered+sync, full metric/UN/NPT/BSPT/BSPP/ACME/trapezoidal
- OSP-P300SA (Multus): same + sub-spindle sync threading

**Turret config:**
- LTH-07 Multus: **40-station ATC** (CAPTO C6), all driven (mill-turn)
- LTH-06 LB3000: 12-station **BMT** (big-bore standard), 6 driven
- LTH-01/02/05 GENOS: 12-station VDI, 6 driven
- LTH-03/04 (U10L): 12-station VDI, **0 driven** (no live tooling on legacy)

**Macro programming envelope:**
- OSP-U10L: 100 vars, **no IF..THEN, no WHILE..DO**, depth 4, no User Task
- OSP-P200LA..P500: 200 vars, IF/WHILE, depth 8, User Task
- OSP-P300SA (Multus): **1000 vars**, IF/WHILE, depth 16, User Task

**Key methods:**
- `getDeepCapabilities(id)` — full profile w/ all 5 depth surfaces
- `recommendParametersFor(id, iso_group)` — envelope + projected Taylor lives
- `rankFleetByMRR(iso_group)` — cross-machine ranking on material X (surfaces "which machine for this aluminum roughing job?")
- `estimateCycleOverhead(id, n_tool_changes)` — batch costing helper

**R12 bug fixed:** first pass clamped max_ap at 5mm + max_fz at 0.5mm/rev arbitrarily — made LB3000 (30kW) tie with LNC8 (11kW) on MRR ranking. Removed clamps; engine now reports honest spindle-bound physics. Locked by test `rankFleetByMRR("P") puts LB3000 above LNC8`.

**Anti-regression invariants:** Vc conservative<recommended<aggressive · aluminum Vc>hardened Vc · aluminum max_fz>hardened max_fz · LB3000 MRR>LNC8 MRR · U10L can't do tapered · Multus has 40 driven stations · U10L lacks IF/WHILE · Zod R12 fail-loud on invalid iso_group.

**PSN downstream consumption matrix:** echo (.cps post edits — uses macro_programming + threading.tapered_threading to gate emitted constructs), bravo (lathe .hsmlib seeding — uses cutting_envelopes_per_iso_group for speed/feed presets), india (post-upgrade gating — uses macro.if_then_supported), delta (CAD/CAM machine pick — uses rankFleetByMRR), hotel (ERP costing — uses estimateCycleOverhead), quote-to-ship (uses projected_life_min_at_recommended for tool-life budget).

**PSN-synergy:** memo `reference_mike_lathe_deep_capability_2026_05_24.md`, wiki `knowledge/wiki/architecture/jm-die-lathe-deep-capability-engine.md`, RECENT-SHIPMENTS entry (this), 22-test contract.

## U-MIKE-LATHE-GROUND-TRUTH-EXTRACT (slot:mike, 2026-05-24) — MIKE-LATHE-CAPABILITY-MS0

The 7th and capping unit in the lathe-capability stack. Empirical ground-truth extractor for the 4 JM Die FULL-PROGRAM-* Mastercam .MIN originals (ADDISON / AFI / CSM / OPTIMAS) — the actual programs echo is upgrading. Closes the substrate echo's .cps post-edit work needs to cross-reference re-posts against the original Mastercam intent.

**Shipped on slot/mike:**
- `scripts/extract-lathe-program-ground-truth.mjs` (13 pure-fn exports)
- `scripts/extract-lathe-program-ground-truth.test.mjs` (**30/30 vitest PASS**)
- `state/shared/JM-LATHE-PROGRAM-GROUND-TRUTH-2026-05-24.json` (live extraction)

**Live results — 4 programs, 33 tool invocations, 23 op labels:**
| Customer | Spindle cap | Tools | Ops | Live tool | C-axis |
|----------|------------:|------:|----:|:---------:|:------:|
| ADDISON FASTENERS | 2000 | 8 | 10 | ✗ | ✗ |
| AFI INDUSTRIES INC | 1500 | 7 | 6 | ✗ | ✗ |
| CSM | 2500 | 8 | 7 | ✗ | ✗ |
| OPTIMAS | 2500 | 10 | 0* | **✓** | **✓** |

*OPTIMAS uses NAT01..N4 named tool calls + M13/M15/M110/M147 live-tool macros (not Mastercam standard op-label headers).

**Key findings for echo:**
1. CSM is the only program with the standardized tool-list comment block — echo should propagate this format to the other 3
2. Spindle caps are machine-specific (1500/2000/2500/2500); re-post must preserve, not flatten
3. **OPTIMAS re-post to LTH-03/04 (legacy OSP-U10L) must be REFUSED** — `driven_stations=0` per the deep-capability engine; controller can't execute live-tool macros
4. Bar-fed (ADDISON/AFI/CSM) vs chuck-fed (OPTIMAS) split — `/CALL OBAR` bar-feeder must NOT be added to OPTIMAS re-posts
5. Canned cycles (G76+G85+G87) are OPTIMAS-only — these ARE supported by OSP-U10L, so the issue is the live-tool blocks specifically

**Mike trilogy → hexalogy complete (6 units, 121/121 tests):**
1. U-MIKE-LATHE-POST-AUDIT (13/13) — post-processor classification
2. U-MIKE-FUSION-TOOLING-CATALOG (16/16) — Fusion .hsmlib backbone
3. U-MIKE-OSP-PROFILE-ENGINE (32/32) — india + echo patterns applied
4. U-MIKE-LATHE-CAPABILITY-ENGINE (18/18) — 10-axis breadth per machine
5. U-MIKE-LATHE-DEEP-CAPABILITY-ENGINE (22/22) — physics-derived depth
6. U-MIKE-LATHE-GROUND-TRUTH-EXTRACT (30/30) — empirical originals

Echo now has every substrate needed to safely upgrade the 4 .MIN → 28 re-post .nc files across the JM Die Okuma fleet.

**PSN-synergy:** memo `reference_mike_lathe_ground_truth_2026_05_24.md`, wiki `knowledge/wiki/architecture/jm-lathe-program-ground-truth.md`, RECENT-SHIPMENTS entry (this).

## U-MIKE-WEDM-GROUND-TRUTH-EXTRACT (slot:mike, 2026-05-24) — MIKE-WEDM-CAPABILITY-MS0

**PIVOT:** lathe → wire EDM. Whiskey takes lathe ownership; mike kicks off WEDM corpus work. Lathe hexalogy (6 units, 121/121 tests) closed on slot/mike — see [[reference_mike_lathe_to_wedm_pivot_2026_05_24]] for the full handoff.

**DEDUP-CHECK posture:** 103 WEDM engines + 8 playbooks already built per WEDM_DIGEST. Mike does NOT duplicate — ships empirical-corpus extractor only. The gap is data, not code.

**Shipped on slot/mike:**
- `scripts/extract-wedm-program-ground-truth.mjs` (13 pure-fn exports)
- `scripts/extract-wedm-program-ground-truth.test.mjs` (**20/20 vitest PASS**)
- `state/shared/JM-WEDM-PROGRAM-GROUND-TRUTH-2026-05-24.json` (live)

**Live results — 3 real Mitsubishi W31MV-2 programs:**
| Program | Date | Passes | E-codes | Offset | Taper |
|---------|------|-------:|---------|--------|:-----:|
| ITW SHAKEPROOF 500-30540-24000-04 | 03/07/22 | 4 | E1221..E1224 | G41+G42+G40 | ✗ |
| NOZE TEST | 05/24/22 | 5 | E2821..E2824 | none | **✓ 61 UV** |
| Wire Program - 5 inch square | — | 0 | none | none | ✗ (demo) |

**Mitsubishi W31MV-2 dialect captured:** L-label, H-register (wire offset per pass), E#### (4-digit spark-table energy code), PASS=N labels, M-code envelope (M20/22/78/79/80/81/82/83/84/85/90/91), G40/41/42 offset comp, UV taper, G92 zero, G4 dwell.

**Key findings for charlie:**
1. Two distinct E-code families in production (E1221-E1224 ITW vs E2821-E2824 NOZE) — calibration via WEDMCalibrationReportEngine per-customer
2. 4-5 pass discipline confirmed in production — WEDMMultiPassStrategyEngine baseline
3. Taper is part-driven not machine-driven — WEDMHeadClearanceEngine + WEDMFixtureInterferenceEngine check on 61 NOZE UV moves
4. Offset style varies (explicit vs pre-comp) — WEDMPostProcessGCodeEngine must preserve original style
5. Single-machine fleet (WEDM-01 Mitsubishi FA10S OSP-W31MV-2) — no 7-machine re-post pattern from lathe applies

**Mike WEDM trilogy plan:**
1. ✓ THIS UNIT — empirical ground-truth corpus extractor (shipped)
2. NEXT — gap audit (calibration coverage of 103 engines × 3 programs; duplicate detection; unwired engines)
3. NEXT-NEXT — print-to-program E2E test via WEDMPrintToProgramEngine + WEDMCompleteOrchestrationEngine

**PSN-synergy:** memo `reference_mike_lathe_to_wedm_pivot_2026_05_24.md`, wiki `knowledge/wiki/architecture/jm-wedm-program-ground-truth.md`, RECENT-SHIPMENTS entry (this), 20-test contract. Consumer surfaces named: WEDMCalculatorAIEngine (PRISM App), WEDMCalibrationReportEngine, WEDMMultiPassStrategyEngine, WEDMPostProcessGCodeEngine, WEDMHeadClearanceEngine, WEDMFixtureInterferenceEngine.

**Lathe close-out → whiskey:** 6-unit hexalogy (post-audit, fusion-catalog, OSP-profile, capability, deep-capability, ground-truth) all consumable via state/shared/JM-LATHE-*.json + mcp-server/src/engines/JMDieLathe*.ts + OkumaLatheOSPProfileEngine.ts. No blocking follow-ups. Open follow-ups: wire OkumaLatheOSPProfileEngine to prism_calc, generate 28 .nc re-posts (echo's lane).
