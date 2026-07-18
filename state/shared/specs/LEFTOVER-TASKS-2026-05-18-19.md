# LEFTOVER TASKS — 2026-05-18 → 2026-05-19 window

**Compiled by:** `claude-30dbe35a` (slot alpha, /checkin-alpha work-order)
**Compiled at:** 2026-05-20T02:45Z
**Scope:** all work *identified but not closed* in the 36-48h window 2026-05-18 00:00 → 2026-05-19 23:59 CDT.

> **Source-roll-up:** per-slot leftover specs (bravo+charlie+foxtrot+juliett — already compiled by their owning chats) + 52 `running` loop-states whose last tick falls in the window + 50 commits via `git log --since` + 9 dated audit specs + `CLOSE-OUT-DEFERRED.md` + `CLOSE-OUT-CANDIDATES.md` (silent-close-out-debt block). Per the silent-close-out-drift class ([[reference_silent_close_out_drift_2026_05_17]]), `running` status on a loop-state file is **not** proof of in-flight work — most were /compact-superseded; flagged below.
>
> **R12 honesty:** this is an *inventory*, not a triage. Every line still needs the per-iter `git log -S "<U-ID>"` verification (per [[feedback_verify_actual_contract_not_proxy]]) before pickup — a peer slot may have already shipped it since the source spec was written.

---

## 0. Headline counts

| Surface | Count |
|---|---:|
| Distinct `[SCOPE]` families touched in window | 21 |
| Commits in window (deduped by hash) | 50 |
| Distinct `/U-…` ids shipped in window | 21 |
| `running` loops with last-tick in window | **52** |
| Per-slot leftover specs already compiled this morning | 4 (bravo, charlie, foxtrot, juliett) |
| Dated audit specs in window | 9 |
| CLOSE-OUT-DEFERRED entries (cumulative) | 17 |
| Silent-close-out-debt milestones (envelope-complete, MILESTONE_PROGRESS.shipped=0) | 51 (319 hidden-shipped units) |
| **Net unique leftover pickup candidates after dedup** | **≈ 60-80** (P1 column below) |

---

## 1. Already-compiled per-slot leftover queues (read these FIRST before re-deriving)

The following are canonical for their owning slot — do not re-compile if claiming that slot:

| Slot | Spec | Top finding |
|---|---|---|
| **bravo** | [[BRAVO-TRIAGE-2026-05-19]] | 10 genuinely pending units; ~30 of 40 consolidated-open-threads are templated-RESUME false positives (silent-close-out-drift class). |
| **charlie** | [[CHARLIE-LEFTOVERS-2026-05-19]] | 2 pre-prepped wire-unwired units (U-WIRE-WASTE-DETECTOR, U-WIRE-TOOL-CALL-THROTTLE) at P1; 8-unit P2 backend-dev queue (OBSIDIAN-INTELLIGENCE-MS3 + COMMAND-KERNEL-MS0). |
| **foxtrot** | [[FOXTROT-TASKS-PENDING-2026-05-19]] | 1 deferred doc-reflection (U-CK26), 1 ready pickup (U-VOICE-CAPTURE phase-1), 3+ large P2 tribal-wire units. |
| **juliett** | [[JULIETT-OPEN-TASKS-2026-05-19]] | **87 units in runtime queue** (1 shipped + ~86 unset), 5 docker units (U-DOCKER-MCP-DISPATCHER first), 4 GAP-HERMES units, 15 top-of-queue speed-feed units. |

Slots **without** a published leftover spec for this window (need a `/checkin-<slot> compile leftover tasks` pass): **alpha**, **delta**, **echo**, **golf** (hygiene), **hotel**, **india**, **kilo**, **lima**, **mike**.

---

## 2. Running loops as of 2026-05-19 (last-tick in window) — 52 entries

> Treat `running` as a hint, not ground truth. Most are /compact-superseded but never `loop-state.mjs end`-marked (see [[feedback_autonomous_loop_drift_discipline]]). The ones with high iter + recent last-tick (2026-05-19 late) are the most likely truly-live.

### 2A. High-confidence live (last-tick ≥ 2026-05-19 15:00 CDT)
| sid | iter/tgt | task |
|---|---|---|
| `6437979f` | 1/12 | AUTOINVOKE-HITRATE-MS0 (build skill+memory auto-invoke hit-rate) |
| `da2a4f78` | 9/20 | COMMAND-KERNEL-MS0/U-CK09 hand-tune lifecycle → thin psk clients |
| `ec095dfd` | 2/20 | vision-ocr-tier-for-scanned-prints |
| `f09b33aa` | 5/20 | foxtrot tasks compile + complete (this is the source of FOXTROT-TASKS-PENDING) |
| `a237a122` | 5/20 | lima leftover units — high-ROI first |
| `bf3268c7` | 5/20 | wire WasteDetector + ToolCallThrottle + COMMAND-KERNEL (charlie) |
| `f851db05` | 0/20 | find+close high-ROI synergy gaps (claude-code/mcp/system-viz/obsidian/wiki) |
| `claude-d…` | 1/20 | echo /loop wire-unwired/backend-dev units |
| `5a2d6313` | 0/20 | bravo queue completion — high-ROI first |
| `9aab2d98` | 5/20 | india tasks compile from last night |
| `ddda9e7c` | 3/20 | bravo compile + clear (this is the source of BRAVO-TRIAGE) |

### 2B. Likely-stale running loops from earlier in window (last-tick 2026-05-18 or 2026-05-19 ≤ 14:00)
| sid | iter/tgt | task |
|---|---|---|
| `c0eb54b9` | 15/30 | upgrade JM Die lathe programs using system-viz + obsidian + wiki + tribal |
| `9c7dcf3e` | 3/8 | hotel queue — high-ROI/backend-first |
| `00a9c6dc` | 3/8 | wire unwired engines |
| `b7530614` | 2/30 | compile alpha-relevant work ahead of RGS (alpha queue compile — predecessor of this current chat) |
| `78d985bc` | 3/20 | Train CAD AI + produce drawing templates from existing CAD/prints |
| `df944902` | 9/50 | bravo compile → queue → complete units |
| `58b92d2e` | 0/20 | wire lathe tribal knowledge into lathe AI |
| `e91338dc` | 0/20 | high-ROI knowledge-injection skills + PRISM app features |
| `68aad091` | 11/10 | golf-redistributed work — INFRA-CONSENSUS-WIRE-MS0/U-P0-U…  *(iter ≥ target — confirm closed)* |
| `571d4bdd` | 1/30 | MCP scaling 15-chat/5-10-agents + mike+golf task compilation |
| `3f96bb5e` | 2/20 | Ollama+Obsidian upgrades — BACKEND-DEV-LOOP iter5+ |
| `be5e37e8` | 13/60 | train CAD/CAM AI: print→CAD→CAM, start Fusion360 |
| `9033b60c` | 8/20 | bravo task queue — reorient + complete + continue |
| `b23a56ef` | 7/20 | reorient + complete + git tree organization |
| `689b3203` | 1/20 | complete alpha task queue (domain=mill) |
| `2bb41e8a` | 0/20 | hotel ERP-bridge queue |
| `a613d591` | 1/20 | delta cad task queue |
| `5cdd4c01` | 0/20 | kilo expand obsidian wiki + prism safe |
| `5b5817ea` | 1/20 | foxtrot task queue reorient |
| `2b50a95c` | 0/20 | india NIM activation — U-NIM-MIGRATE queue |
| `f429615a` | 0/20 | juliett reorient + queue completion |
| `b36c6085` | 0/20 | kilo reorient + docker + leftover pickup |
| `732a6b5a` | 2/20 | drastically improve obsidian wiki + injection |
| `claude-c…` | 3/20 | octopus multi-LLM review bridge (Codex/Ollama/Grok) |
| `e4d781f4` | 4/10 | hunt + fix bugs/conflicts/errors (isolated slot/alpha) |
| `claude-0…`, `claude-8…`, `926109c5` | 0/20 | fix tsc errors and wire unwired engines (THREE concurrent loops on same task — coalesce) |
| `cdc4a2c4` | 5/11 | COMMAND-KERNEL-MS0 — 11 remaining units in logical order |
| `51013954` | 4/20 | india post-domain queue (FEATURE-GAP + wiring) |
| `35ac1d3c` | 4/20 | lima — work all 1606 queue units |
| `9876118b` | 5/20 | nvidia nim working + synergized with prism os/obsidian/system-viz |
| `148fd42f` | 5/10 | build kilo incomplete-task inventory in logical order |
| `a574347e` | 0/20 | bravo + juliett task queue for bravo |
| `claude-3…` | 0/20 | delta queue |
| `4f9091a6` | 6/20 | juliett — complete all speed-feed units |
| `73d86100` | 0/20 | resume crashed bravo: COMMAND-KERNEL-MS0 + bravo task queue |
| `cdfb103c` | 9/50 | lima compile + queue + complete units |
| `5b5817ea`, `f09b33aa` | dup | foxtrot loops — consolidate to the live `f09b33aa` |

**Action for 2B:** the chat owning each slot should call `loop-state.mjs end --sessionId <sid> --status pre-empted` next time it picks up that slot, then start a fresh loop ([[feedback_autonomous_loop_drift_discipline]]).

---

## 3. Window-shipped units (50 commits) — for **dedup** against new pickup

> Before claiming any of the §4 pending units, grep this list (or run `git log --grep='<U-ID>' --since='2026-05-18'`) to confirm the unit didn't ship.

Distinct `[SCOPE]` families that landed work in window:
`[AI-TRAINING-FIRST-MS0]` · `[AWARENESS-READINESS]` · `[BACKEND-DEV-LOOP]` · `[BRIDGE-WIRING]` · `[CLOSE-OUT]` · `[COMMAND-KERNEL-MS0]` · `[DELTA]` · `[DEVTOOLS]` · `[DOCKER-MCP-WIRE-MS0]` · `[DOCTRINE]` · `[FLEET-REAPER-FIX]` · `[FLEET-REAPER-MS3]` · `[FLEET-RESILIENCE-MS0]` · `[FLEET-WATCHDOG-FIX]` · `[GOLF]` · `[INFRA-CONSENSUS-WIRE-MS0]` · `[JULIETT]` · `[LIMA]` · `[SLOT-CHARLIE]` · `[SLOT-COMPACT-SYNERGY-MS0]` · `[SLOT-ECHO]` · `[SLOT-RECLAIM]` · `[SYSTEM-SYNERGY-AUDIT]` · `[TESTFIX]` · `[WIRE-UNWIRED-MS0]`

Notable ships (commit-verified, NOT pending):
- AWARENESS-READINESS (`1694bec82f`) — built ∩ wired surfacing
- SLOT-RECLAIM (`ed5c49044b` + wiki `500b2b9907`) — post-/compact force-reclaim
- DOCKER-MCP-WIRE-MS0/U-DOCKER-*, U-MODELS-*, U-CATALOG-* — juliett's Docker block
- FLEET-REAPER-MS3 (`c30889550e`, `5d410e09d6`, `97d60775ec`, `51b2d04a10`) — per-chat-tree compact advisory + reaper-self CPU priority guard + HTML twin + chat-capacity design
- FLEET-RESILIENCE-MS0 (`a942538d72`) — U-FR-TRIGG…
- FLEET-WATCHDOG-FIX (`571608afa1`) — U-WD-ASCII
- COMMAND-KERNEL-MS0/U-CK09 (`eb2697ac01`, `fbf6509209`, `017fb8dfc7`) — 3-of-3 PASS lifecycle hand-tune
- COMMAND-KERNEL-MS0/U-CK15 (per BRAVO-TRIAGE, `f3dad18253`) — command-frontmatter populator
- COMMAND-KERNEL-MS0/U-CK26 (`202b2ae892`, `1656d055a6`) — producer build spec + doc-reflection
- INFRA-CONSENSUS-WIRE-MS0/P0-U03 (`ac907e31c4`), P0-U04 (`86337a35ce`), DELTA P0-U… (`b39248edee`), CLOSE-OUT (`8a5c7f6cfc`)
- WIRE-UNWIRED-MS0/U-WIRE-TOOL-CA… (multiple `c49df07fed`, `9a31d03a90`, `5e1a711452`, `2ed91ab127`, `9aeb5031b4`, `9f0a3c2ff2`)
- BRIDGE-WIRING/U-WIRE-TRILOBE-ELE… (`b6da645f4c`)
- LIMA BACKEND-DEV-LOOP — U-LIMA-A1-OLLA… (`cd17a3a62c`), U-LIMA-A4-EXTR… (`ef1a44f4a4`), U-LIMA-A5-SKIL… (`b69e66732f`)
- SLOT-COMPACT-SYNERGY-MS0 — multiple U-WAVE… ships (`7e91a892b7`, `b343b6bfd7`, `e0b116c5ae`, `85e282fe59`, `9445b05e2e`, `67dab70068`, `defdf07c00`, `ba04aff4c1`)
- AI-TRAINING-FIRST-MS0/U-AITRAIN… (`75e6ad694e`)
- DEVTOOLS (`e09856ae1d`) — claude.bat shadow-wrapper
- TESTFIX (`33f1229ead`) — ConsensusCoordi… rename
- SYSTEM-SYNERGY-AUDIT/U-HANDOFF-… (`79a9462921`)
- DOCTRINE/U-BRIDGE-RECONCILE-MIS… (`a302a99fec`)
- CLOSE-OUT/MILESTONE-PROGRESS-RE… (`a98c55ce07`, `37df4c78e3`) + OLLAMA-EXPAND-MS0-ENVELOPE (`c020ebb7b6`)

---

## 4. CONSOLIDATED LEFTOVER QUEUE — pickup order (highest-leverage first)

Per [[feedback_prioritize_devtools_backend]] backend-dev units stay P0 over revenue/UI; per [[feedback_ai_training_first_before_revenue]] AI-training units beat revenue too.

### 4A. P0 — backend-dev wirings + critical fixes (start here)

1. **U-WIRE-WASTE-DETECTOR** *(charlie carryover)* — `WasteDetectorEngine` exists, 0 dispatcher refs; op-discriminator wire into `devDispatcher.ts`.
2. **U-WIRE-TOOL-CALL-THROTTLE** *(charlie carryover)* — `ToolCallThrottleEngine` exists, 0 dispatcher refs; same pattern.
3. **U-DOCKER-MCP-DISPATCHER** *(juliett carryover, top of docker block)* — unblocks 6 CAM bridges in PRISM-APP-QUEUE.
4. **U-DOCKER-MODELS-FALLBACK** — resilience when Ollama wedges.
5. **U-DOCKER-CATALOG-AUDIT** — surfaces upstream MCP servers PRISM could call instead of build (R8 dedup-preflight at stack level).
6. **U-VOICE-CAPTURE** *(foxtrot)* — Whisper local bridge for tribal-knowledge ingest, phase-1 watcher only.
7. **U-CK11, U-CK28, U-CK29** *(charlie P2 / charlie loop bf3268c7)* — COMMAND-KERNEL-MS0 per-category scrutiny + skill-tier loop + outcome→memory.
8. **A1 / U-DOCKER-HOOK-BROKER** *(charlie P2, OBSIDIAN-INTELLIGENCE-MS3)* — persistent prism-hooks container holds 50+ hooks warm.
9. **A2 / U-REREAD-SIGNAL-FINISH** *(charlie P2)* — wire Write/Edit/MultiEdit matcher to recall counter.
10. **U-MULTI-AGENT-COST-TELEMETRY / COST-CASCADE-MS0** *(bravo)* — hotel shipped `/two_pass` cascade engine (`0d9d79bc89`); multi-agent telemetry leg may still be open.

### 4B. P1 — domain-specific carryover

| Slot/domain | Unit cluster | Source |
|---|---|---|
| juliett (speed-feed) | U-DOCKER-SCOUT-SCHEDULED + HUB-PUBLISH, U-GAP-SF-ADVANCED-FEED-OPT, U-GAP-SF-NC-CALIBRATION, U-WIRE-BACKLOG-SF, μS-D30..D33, U-CAMX22, U-CH03 / U-CH12 / U-CH13, U-CW-01 / U-CW-02 / U-CW-06 + 15 more SFC units | JULIETT-OPEN-TASKS-2026-05-19 |
| foxtrot (tribal) | U-WIRE-BACKLOG-TRIBAL (12 unwired tribal engines incl. PlaybookRulesEngine 133KB), U-CAMAGI12 TribalKnowledgeApplicator, U-CAMX13 MachiningPlaybook integration, U-CK26 deferred doc-reflection | FOXTROT-TASKS-PENDING-2026-05-19 |
| bravo (general) | U-HTML-* family (CLAUDE-MD-EDIT, DOCTRINE-UPDATE, COMPANION-GENERATOR, BACKFILL, HPS01, HTML-COMPANION-MS0, HTML-PRIMARY-MS0), U-COORD08-HARDEN, U-AAM01..04 / AUTOCOMPACT-AUTONOMOUS-MS0, U-PTR01/02 / PILLAR-TELEMETRY-RECOVERY-MS0, U-PPL-A5 docu-print-org, U-ALL02/03 / BACKEND-DEVTOOLS-RGS6-AUTO-LEARNING-LOOP-MS0, ACP-MS0 orphan-rescue, OBSIDIAN-PRISM-OS-MS0 orphan-rescue, BLUEPRINT-OCR-TRAINING-MS1 | BRAVO-TRIAGE-2026-05-19 |
| charlie tail | OBSIDIAN-INTELLIGENCE-MS3 B-series (B1 / U-DAILY-CONTEXT-WORKFLOW, B3 / U-QUEUE-PROCESSOR, B6 / U-KNOWLEDGE-DISTILLATION) | CHARLIE-LEFTOVERS-2026-05-19 |
| juliett (hermes) | U-GAP-HERMES-EVAL, U-GAP-SKILL-AUTO-GEN-MS0, U-GAP-HERMES-MULTI-SURFACE-MSG, U-GAP-POST-BUILD-UTILITY-SCAN | JULIETT-OPEN-TASKS-2026-05-19 §1D |

### 4C. P2 — operator-gated / research-complete (do NOT auto-ship)

- **U-LLM-DEV-CORPUS + U-LLM-TRAINER** — bravo shipped 5 LoRA-research units, needs operator greenlight for MVP implementation.
- **SYSTEM-VIZ-BRAIN-MS0/U-P5-COORD-SQLITE-LIVE-SWAP** — operator-gated by design (live swap of WORK_CLAIMS.json → SQLite under live traffic); spec delivered.
- **U-OE-BRIDGE-L2b** — Ollama-PRISM agent bridge, blocked on `:3100/mcp` HTTP transport surface.
- **U-OE-BRIDGE-L3** — full agent loop, deferred for >3B model on this host.
- **U-DOCKER-HUB-PUBLISH** — blocked on operator `docker login` + `docker scout config organization <org>`.

### 4D. Audit + cleanup punch-lists from window

- **AUTOINVOKE-HITRATE-MS0-PLAN-2026-05-19** — auto-invoke hit-rate build plan, loop `6437979f` iter 1/12 running.
- **SKILL-AUTOINVOKE-COVERAGE-AUDIT-2026-05-19** — open punch list.
- **SESSIONSTART-HOOK-AUDIT-2026-05-19** — open punch list. CLAUDE.md notes "2 of 5 SessionStart file-reader injectors converted to pointer mode (ai-deep-intelligence + claude-brief-inject). Per SESSIONSTART-HOOK-A…" — 3 remaining.
- **DOCKER-MCP-CATALOG-AUDIT-2026-05-19** — Juliett's Docker block audit, drives §4B juliett docker units.
- **OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18** — open punch list.
- **SLOT-WORKTREE-MIGRATION-STATUS-2026-05-19** — partial; per-chat cutover gradual.
- **U-OBF-F4-HOOK-FIRE-AUDIT-PUNCHLIST-2026-05-18** — hook fire-rate audit, **516 zero-fire categorized into 136 wired-silent + 380 unwired-on-disk** (CLAUDE.md regression line: `e467a4ca0`).
- **U-OBF-F4-ARCHIVE-CROSSREF-2026-05-18** — companion archive cross-ref.
- **DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19** — Docker business-account rationale, prerequisite for §4B juliett docker block.

### 4E. CLOSE-OUT-DEFERRED entries still open (from `state/shared/CLOSE-OUT-DEFERRED.md`)

All entries `defer-to-followup` or `partial` — each is its own pickup candidate; older entries (pre-2026-05-18) included for context since the gate is cumulative:

- **U-CAMP01, U-CAMP13, U-CAMP14, U-CAMP15** (CAM-PARITY-AGI-MS0) — cross-CAM parity + wiring + training-loop verification still pending (CAMP13 *re-triaged* to closed-in-commit `57f0ceb47a`).
- **U-CLEANUP-B7** — `peer-audit.md` untracked at audit time; verify owning peer committed.
- **U-CLEANUP-B9** — golf-reviewer-eval slope/floor alerts + xproc_aps_calibrate wiring + prompt-version drift detection.
- **U-CLEANUP-G9** — `pr-ci-watch.ps1` not present, deferred until release process lands.
- **FEATURE-GAP-AUDIT-MS0/U-GAP-CAD-COMPLETE-GEN** — recommendation = create focused **U-GAP-CAD-FEATURE-PRIMITIVES** (Part 4 fillet/pocket/slot generators) rather than re-port 2914 lines.
- **HTML-COMPANION-MS0/U-HTML-CLAUDE-MD-EDIT** — peer-claimed; ready when peer releases CLAUDE.md edit-lock.
- **SYSTEM-VIZ-BRAIN-MS0/U-P5-COORD-SQLITE-LIVE-SWAP** — operator-gated by design (§4C).

### 4F. Silent-close-out debt (319 hidden-shipped units across 51 milestones)

**Not pickup work** — these are envelope-complete milestones whose `MILESTONE_PROGRESS.shipped=0` because pre-2026-05-12 ship commits used non-tagged subjects. Reconciliation = `node scripts/close-out-milestone.mjs --milestone <ID>` (operator-flip), not a re-build. Top 20:

`CAMX-MS22` (+20), `CALC-HARDEN-MS0` (+18), `CAMX-MS19` (+15), `PIPELINE-VAR-MS0` (+15), `CAMX-MS12` (+13), `CAMX-MS18` (+10), `CAMX-MS21` (+10), `CAMX-MS0` (+8), `CAMX-MS15` (+8), `CAMX-MS16` (+8), `CAMX-MS2` (+8), `CAMX-MS20` (+8), `CAMX-MS13` (+6), `CAMX-MS14` (+6), `CAMX-MS17` (+6), `CAMX-V17-P0A` (+6), `HTML-PRIMARY-MS0` (+6), `PP-MOAT-MS0` (+6), `PP-MS0` (+6), `PROD-MS0` (+6).

Plus 31 more smaller-drift milestones — see `state/shared/CLOSE-OUT-CANDIDATES.md` for the full table.

---

## 5. Slots that still owe a `/checkin-<slot>` leftover compile

The following slots **did NOT publish** a per-slot leftover spec for the 5/18-19 window. The chat next claiming each slot should run `compile leftover tasks from last night's sessions`:

- **alpha** (this chat — file replaces that obligation; ALPHA-QUEUE-COMPILED-2026-05-18 is the alpha PREDECESSOR queue but is pre-/compact)
- **delta** — `a613d591` loop running at iter 1/20 since 2026-05-18 13:13; needs delta-tasks compile + close (CAD domain)
- **echo** — `claude-d…` loop running at iter 1/20 since 2026-05-19 16:51
- **golf** — fleet-reaper-MS3 + fleet-watchdog-fix shipped; pending compile of the rest of the FLEET-* family + fleet-task-health follow-ups
- **hotel** — `9c7dcf3e` loop at iter 3/8; "complete hotel queue, high-ROI/backend-first"; ERP-bridge queue from `2bb41e8a` iter 0/20
- **india** — `9aab2d98` (15:00 last-tick) iter 5/20 "complete-india-tasks-from-last-night" + `2b50a95c` NIM activation
- **kilo** — `5cdd4c01` + `b36c6085` + `148fd42f` all running, no published compile
- **lima** — `a237a122` iter 5/20 + `35ac1d3c` iter 4/20 + `cdfb103c` iter 9/50 — three concurrent lima loops, no compile
- **mike** — `571d4bdd` loop "MCP scaling 15-chat/5-10-agents + mike+golf task compilation" — compile-scope but no published artifact yet

---

## 6. Suggested next moves

1. **For this chat (alpha):** treat §4A items 1-2 (U-WIRE-WASTE-DETECTOR + U-WIRE-TOOL-CALL-THROTTLE) as alpha pickup if not peer-claimed; charlie already has them prepped. **Or** stay on the AUTOINVOKE-HITRATE work attached to ec095dfd? No — that's not an alpha loop, leave it. Alpha is the mill domain per `domain partition` (CLAUDE.md §`/checkin-<nato> /loop`).
2. **Fleet hygiene** (one-shot, single chat): walk §2B and call `loop-state.mjs end --status pre-empted` on the 30+ stale running loops; reduces the false-positive noise in this very inventory.
3. **Per-slot compiles** (§5): the 9 slots without specs should each do a `/checkin-<slot> compile leftover tasks from 5/18-5/19` pass to surface their own queues.
4. **Silent-close-out reconciliation** (§4F): `node scripts/close-out-milestone.mjs --milestone CAMX-MS22` (and the rest of the top-20). Pure data fix, no build.
5. **R8 dedup-preflight** before any P0 pickup: `git log -S "<UnitName>" --since="2026-05-18"` to catch peer-already-shipped (per [[feedback_verify_actual_contract_not_proxy]]).

---

## See also

- [[BRAVO-TRIAGE-2026-05-19]] · [[CHARLIE-LEFTOVERS-2026-05-19]] · [[FOXTROT-TASKS-PENDING-2026-05-19]] · [[JULIETT-OPEN-TASKS-2026-05-19]]
- [[DOCKER-BUSINESS-USAGE-ASSESSMENT-2026-05-19]] · [[DOCKER-MCP-CATALOG-AUDIT-2026-05-19]] · [[AUTOINVOKE-HITRATE-MS0-PLAN-2026-05-19]]
- [[SKILL-AUTOINVOKE-COVERAGE-AUDIT-2026-05-19]] · [[SESSIONSTART-HOOK-AUDIT-2026-05-19]] · [[OLLAMA-OBSIDIAN-ROUTING-AUDIT-2026-05-18]]
- [[U-OBF-F4-HOOK-FIRE-AUDIT-PUNCHLIST-2026-05-18]] · [[SLOT-WORKTREE-MIGRATION-STATUS-2026-05-19]]
- `state/shared/CLOSE-OUT-DEFERRED.md` · `state/shared/CLOSE-OUT-CANDIDATES.md` · `state/shared/loop-state/`
- [[feedback_autonomous_loop_drift_discipline]] (close stale loops before re-claiming) · [[reference_silent_close_out_drift_2026_05_17]] (debt-class definition)
