---
session: claude-cdc4a2c4
slot: echo
generated_at: 2026-05-17
purpose: All tasks left incomplete by prior echo chats — reconstructed from handoffs + cross-referenced against MILESTONE_PROGRESS + git log
advisoryOnly: true
mustHumanVerify: true
---

# Echo slot — incomplete-task inventory

Reconstructed by reading every `HANDOFF-*-echo-*.md` (20 files) + `chat-slot-history/<chatId>.json` (8 echo-bound chatIds: 098ac2aa, 0c5d9bee, 2081f435, 9412073a, 9876118b, a2b1b5ca, a61bbf34, a7f31142, dacc6809 + this chat) + cross-referenced against `state/shared/MILESTONE_PROGRESS.json`, milestone envelopes, and recent commits.

## Tier 1 — ACTIVE, autonomous-safe (pick from these)

### 1. `MS-PRINT-PROGRAM-LOOP` — 14 units pending (Tracks A/B/C)
Origin: `claude-2081f435` (4 handoffs), continued by `claude-098ac2aa`. Status: `in_progress_real`. Track D shipped 5/5; A/B/C untouched.

- **Track A** (5 pending) — parametric template engines:
  - `[A1] U-FAMILY-PARAM-EXTRACT` — per family extract 8-15 driving parameters (turning analogue of .xlsm 34-dim)
  - `[A2] MS-RES-XLSM-ENGINE core` — decode vbaProject.bin, reverse 34-dim→geometry math for 11 die templates
  - `[A3] MachineDomainTemplateLibraryEngine` (NEW) — parametric program-skeleton registry
  - `[A5] proven_generate_program` — bridge adapted-recipe → TurningProgramAssembler / MillingPrintToProgram
  - `[A6] DieCavityBatchProgramEngine` (NEW) — parts CSV → parametric instantiation → batch .MIN
- **Track B** (3 pending) — re-optimization:
  - `[B8] Wire optimizer engines to all logical dispatchers` (MillProgramOptimizer + LatheProgramOptimizer to prism_cam/prism_mill)
  - `[B9] ArchiveReoptimizationBatchEngine` — JM-Die batch re-optimize (depends on C5 + D5)
  - `[B10] U-CLEAN-TRAINING-SET + re-opt review loop` — designate re-opt programs as CLEAN LoRA corpus
- **Track C** (6 pending, **Revenue-Day-1-eligible per §R10.5**):
  - `[C1] U-LATHE-MIN-DIALECT-POST` — Okuma OSP .MIN dialect post (G85/G87, NSTRT/NBAR, T010101, part-counter macro)
  - `[C3] Wire prism_machining_kb into TurningProgramAssemblerEngine`
  - `[C4] LatheKnowledgeDirectProgrammerEngine` (NEW front door — NL → .MIN, no CAD step)
  - `[C5] LatheNLPartParserEngine` (a) + U-NC-MINING-CALIBRATE (b) — lathe-tuned NL parser + 16,558 .MIN S/F mining
  - `[C6] LatheMachineDomainKnowledgeProfileEngine` (NEW) — per-machine turret/cycle/dialect profile
  - `[C7] U-LATHE-DIRECT-SAFETY-GATE` — every emitted .MIN runs LATHE-HARDENED safety pipeline + mistake-detector

Recommended start: **Track C first** (revenue-eligible). Has dependency chain — start C3 (KB wiring) → C5 (parser) → C4 (front door).

### 2. `SYSTEM-VIZ-BRAIN-MS0` — 1 unit pending, **OPERATOR-GATED, NOT AUTONOMOUS**
Origin: `claude-9876118b` + `claude-a61bbf34`. 25/26 shipped (96.2%).

- `U-P5-COORD-SQLITE-LIVE-SWAP` — swap work-claim.mjs from `WORK_CLAIMS.json` to live SQLite. Cutover plan delivered at `state/shared/specs/U-P5-COORD-SQLITE-LIVE-SWAP-CUTOVER-PLAN-2026-05-17.md` (3-of-3 PASS, commit 3177ae8236). HIGH BLAST RADIUS — 11 live peers; do NOT do autonomously.

### 3. `CLEANUP-MS0` — 1 unit pending
Origin: `claude-a61bbf34` (echo-cleanup-ms0 handoff).

- `U-CLEANUP-B9` (not_started) — model-drift eval suite (10 frozen known-bug commits + expected verdicts in `state/shared/`)

### 4. `DEV-TOOL-CONFLICT-AUDIT` — 6 Track-J/K units pending
Origin: `claude-dacc6809`. F1 shipped (`dd735c1871`, `4ad4bb334a`). META detector: `scripts/dev-tool-conflict-detector.mjs`.

- `F11` — cross-lock `regen-viz.mjs` subprocess write + `system-viz-add-node.mjs` atomic-rename (DEFERRED — needs shared PID-lock convention)
- `U-ROADMAP-INDEX-WRITER-CONSOLIDATE` (F4) — atomic-write the 3 non-atomic writers of `roadmap-index.json` (`reconcile-milestones.mjs`, `register-devtools-roadmap-envelopes.mjs`, `register-revenue-roadmap-envelopes.mjs`)
- `U-ERROR-MEMORY-CANONICAL-WRITER` (F2) — designate canonical writer for `error-memory.json` (latent race if any orphan hook gets wired)
- `U-SKILL-USAGE-CANONICAL-WRITER` (F3) — same for `skill-usage-stats.json`
- `U-SKILL-ARCHIVE-FORGE-RGS-BAK` (F5) — move `forge..forge6` + `rgs..rgs5` + `.fullcopy-bak-*` to `_archive/` (~250KB skill text the LLM never needs)
- `U-SKILL-MIRROR-RECONCILE` (F5) — 64 H:/ vs H:/prism/ skill mirrors with large size deltas

### 5. `MS-PRINT-PROGRAM-LOOP` (echo-work iter 2 continuation)
Origin: `claude-098ac2aa` (most recent). U-PRECOMMIT-PATHSPEC-ONLY shipped `22418a618a`.

- **`slot-queue.mjs --pick` BROKEN** — returns already-shipped unit; MILESTONE_PROGRESS sees it as 1954/5200. Investigate picker shipped-detection bug FIRST.
- After picker fix: `U-GAP-CAM-ADAPTIVE-CLEARING` (v8.89 monolith re-modularize) OR split `U-WIRE-BACKLOG-CAM` (~26 unwired engines) into per-engine sub-units.

## Tier 2 — REFERENCED BUT NOT TRACKED IN ENVELOPES (status unknown / orphan)

Origin: 9 handoffs ending with the generic "Next: INFRA-CONSENSUS-WIRE-MS0, INFRA-AGI-ROUTER-MS2, L8-P0-MS2" tail. The first two are `completed_real`; only `L8-P0-MS2` remains `in_progress_real` — **content unknown until envelope is read**.

- `L8-P0-MS2` — status `in_progress_real`, no echo handoff describes the work.

## Tier 3 — RECENTLY CLOSED (subtracted — not punch-list)

These appeared in echo handoffs but the milestones are now `completed_real`. Listed for traceability:

- `SLOT-WORKTREE-MS0` (15/16 → completed; U-P3-DEFAULT-ON either shipped or absorbed)
- `COORD-MS0` (10/12 → completed_real; U-COORD09/12 shipped)
- `INFRA-CONSENSUS-WIRE-MS0`, `INFRA-AGI-ROUTER-MS2` (completed_real)
- `OBSIDIAN-PRISM-OS-MS0` (closed; 8 orphans wired)
- `SLASH-CMD-FIDELITY-MS0/U-SCF02` (shipped 228d3d963)
- `CHAT-ORCHESTRATOR-MS0/U-CHO01/02/04` (shipped 85703afab6, 5ece125d8b, 7b1a19655c)
- `RGS-TOOL-AUTOINVOKE-MS1/U-INTEG-FIX-P0` (shipped e7e2dbf1b — 10 P0 bugs landed)
- `KNOWLEDGE-CONVERSION-MS0/U-KC-C2` (shipped 05152dff62)
- `SLOT-DRIFT-FIX-MS0/U-SDF18` (shipped 1904c4cf7b)
- `WIRE-UNWIRED-MS0/U-WIRE-NPQ` (shipped f8fb276f45)
- `MS-PRINT-PROGRAM-LOOP Track D` 5/5 (D1 a045840af, D2 188e07729, D3 b0266be5d, D4 81ead2a7b, D5-BRIDGE 601b9547b+ce43d04b8)
- `RGS-TOOL-AUTOINVOKE-MS1` Phase 2 (`e7e2dbf1b` post-ship audit punch-list)

## Recommended next action (echo)

1. **Investigate `slot-queue.mjs --pick` bug** (from `claude-098ac2aa` handoff) — the picker is returning already-shipped units. This blocks autonomous progress on all of Tier 1.
2. After picker fix: Pick from **MS-PRINT-PROGRAM-LOOP Track C** (revenue-eligible) — start with `C3` (KB wiring is the dependency for C4/C5).
3. **DO NOT** attempt `U-P5-COORD-SQLITE-LIVE-SWAP` autonomously — operator-gated.
4. **DO NOT** invent new milestones — 11 ms still have units pending.

## Provenance

Read sources:
- 20 echo-bound handoff files in `state/shared/handoffs/`
- 8 historic echo chatIds in `state/shared/chat-slot-history/`
- `state/shared/MILESTONE_PROGRESS.json`
- `mcp-server/data/milestones/{MS-PRINT-PROGRAM-LOOP,SYSTEM-VIZ-BRAIN-MS0,CLEANUP-MS0}.json`
- Git log since 14 days, filtered for echo unit-ids
