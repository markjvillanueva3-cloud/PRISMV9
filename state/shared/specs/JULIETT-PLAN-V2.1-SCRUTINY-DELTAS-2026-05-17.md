# JULIETT PLAN V2.1 — Scrutiny Deltas (10-agent pass)

> Generated 2026-05-17 by juliett after `/compact` resume.
> Source: 10 parallel scrutiny agents (A1-A10), each on a focused axis.
> Applies on top of `JULIETT-CONSOLIDATED-WORK-PLAN-V2.md`.
> User work order: "find more gaps, enhancements and obsolete current setups. /system-viz was updated so utilize it and obsidian brain".

---

## TOP-LINE VERDICT

PRISM has **invested heavily in detection infrastructure** (40+ Recent regressions, 6 detectors planned, 1076 tribal citations) but the **write-back loops are unshipped, unwired, or silently broken**. Operators are still the integration point. **3 Stage-2 forward-feedback loops named in V2 are 0/3 built.** Adoption gap on SLOT-WORKTREE-MS0 is 1/13. Docu-claimed hooks are zero-fire across the board.

The **biggest new finding** (cross-cuts every axis): **most of what user asked for is already on disk but unwired or unused** — the activate-before-build doctrine is correct but needs an enforcement layer.

---

## P0 — ACT THIS STAGE (15 findings, all blockers for Stage 2+)

### CATEGORY 1: MEMORY.md / Doctrine emergency
- **P0-1** [A3-F1] **MEMORY.md re-tripped to 97.7%** (24006/24576 bytes, 570B from truncation). U-OBS-B2 compression overshot. Watchdog wired U-OBS-B1 but did NOT gate growth. Re-run U-MEMORY-COMPRESS + investigate watchdog gap.
- **P0-2** [A3-F2] **MEMORY.md "Primary Roadmap" points to deleted file** `sleepy-chasing-prism.md`. Contradicts project CLAUDE.md (says `PRISM-UNIFIED-ROADMAP-v2.md`). DELETE or replace pointer.
- **P0-3** [A3-F3] **Frozen counts in MEMORY.md drifted ≥30%** vs live `PRISM-INVENTORY-LATEST.md`: engines +97, actions +520, algorithms 17→53 (-64% wrong), source hooks -52%, tests +336. Either auto-regen from live OR delete numbers.

### CATEGORY 2: Hook wiring drift (telemetry vs reality)
- **P0-4** [A1-F1] **501/511 hooks on disk are zero-fire in 7d** (~98%). 136 of 151 wired commands map to zero-fire. Apply [[feedback_never_delete_only_disable]] — disable in batches.
- **P0-5** [A1-F2] **8 duplicate hook wirings** — `stress-harness-emit` wired 4×, others 2×. Same hook fires N times per event. Consolidate to 1 entry each.
- **P0-6** [A1-F3] **Canonical hooks zero-fire** (master-index-precheck-inject, awareness-snapshot-inject, build-state-inject, scrutinize-before-stop, dedup-auto-invoke, ai-feature-recommend, error-pattern-capture, audit-viz-first-inject, post-ship-distill, fleet-reaper-stop, golf-slot-reaper-guardian, c-to-h-mirror, +10 more). CLAUDE.md asserts all auto-fire. **Either telemetry broken OR wiring drift recurred** — investigate per-hook ledger-emit path.

### CATEGORY 3: Injection chain gaps (user-requested enhancements)
- **P0-7** [A5-F1] **5 documented inject hooks NOT WIRED**: wiki-precheck-inject (21.6KB), memory-relevance-inject (5.3KB), tribal-by-domain-inject (10KB), chat-bus-inject (10.6KB), discipline-expert-inject (40.7KB). Either wire OR remove the doctrine claims.
- **P0-8** [A5-F2] **NO `system-viz-delta-inject.mjs`** — user explicit request "/system-viz was updated so utilize it". Build it (read graph mtime, surface diff since SessionStart).
- **P0-9** [A5-F3] **NO `obsidian-recent-writes-inject.mjs`** — user explicit request "utilize obsidian brain". Build it (scan `knowledge/wiki/**` + `C:/.../memory/` for files mtime <4h matching prompt keywords).

### CATEGORY 4: Obsidian / Auto-write pipeline
- **P0-10** [A6-F2] **Memory namespace 33% synced** (276 in C: vs 91 in H:/knowledge/memories/). `memory-mirror-to-vault.mjs` fires forward, doesn't backfill. Build `scripts/bootstrap-h-memories-mirror.mjs --apply` (mirror C:→H: backlog, same pattern as c-to-h bootstrap).
- **P0-11** [A6-F3] **Auto-write pipeline partial** — `post-ship-distill.mjs` writes post-ship memo but NOT a `wiki/architecture/<unit>.md` stub. Doctrine says vault needs wiki entry + memory note + MEMORY.md index per backend-dev unit. Only 1 of 3 surfaces auto-writes. Extend distill hook.
- **P0-12** [A8-F2] **`error-fix-vault-bridge` SHIPPED but NOT FIRING** — `knowledge/error-fixes/` directory does not exist. Smoke-test the hook; if broken, log as new regression.
- **P0-13** [A8-F6] **Tribal-knowledge ingestion REGRESSED** — 30+ `auto-ingested-tips-auto-50XX.md` DELETED in working tree. Determine intent; restore or update CLAUDE.md tribal section.

### CATEGORY 5: System-viz integrity (user said graph was updated)
- **P0-14** [A7-F1] **Graph headline TRIPLE-DRIFT**: live graph `meta.headline=145440n` / CLAUDE-BRIEF says `372731n` / awareness-snapshot says `64161 of 72451`. Three different numbers for same /system-viz. Gate `generate-claude-brief.mjs` on graph mtime.
- **P0-15** [A7-F2] **`built/stub/unwired` classifier IS DEAD CODE** — 100% of nodes (145440/145440) have `n.built===null`. Awareness overlay writes sibling JSON, never merged back into nodes. Recent regression "classifier degenerate" NOT FIXED. Fold overlay into nodes in `merge-augmentations.mjs`.

### CATEGORY 6: Three forward-feedback loops (0/3 — V2 Stage-2 BLOCKERS)
- **P0-16** [A4-F3 + A8-F3/F4/F5] **U-NEW-TOOL-AUTO-WIRE, U-AUTO-MEMORY-WRITE, U-DOCTRINE-OBSOLESCENCE-SWEEP all NOT BUILT.** V2 plan says Stage-2 BLOCKERS — Stage 3+ cannot proceed. SHIP NOW. These ARE backend-dev (Stop/PostToolUse hooks consuming existing ledgers).

### CATEGORY 7: Fleet coordination crisis
- **P0-17** [A10-F1] **Slot-worktree adoption 1/13** — only `hotel` on slot/* branch. 4 commit-absorption collisions in 24h prove the cost. Routing hooks disarmed fleet-wide. NEW UNIT `U-SLOT-WORKTREE-FORCED-CUTOVER`: `/checkin-<nato>` Step 2c becomes MANDATORY; add Stop-hook listing slots still on shared branch.
- **P0-18** [A10-F3] **GOLF chat is itself CRASHED** — owns reaper post-supersession; was offline 39m ago. Fleet has 8 crashed / 4 stale / 1 active. NEW UNIT `U-GOLF-CRASH-FAILOVER`: when golf crashed AND fleet-reaper task is only live runner, emit ALERT naming next-eligible reaper-owner.
- **P0-19** [A10-F2] **"Activate before build" has no enforcement** — doctrine repeated 3+ times by user; 4 collisions in 24h prove chats still build before searching. NEW UNIT `U-ACTIVATE-BEFORE-BUILD-PRECHECK`: PreToolUse:Write hook running 5 grep commands before new-engine/hook/skill creation. Pattern-match `duplication-hard-block.mjs`.

---

## P1 — STAGE 3+ QUEUE (16 findings)

| ID | Source | Finding |
|----|--------|---------|
| P1-1 | A1-F4 | `error-pattern-promote` 99.8% no-op (1928/1932 below threshold). Recalibrate or pre-filter |
| P1-2 | A1-F5 | `inbox-capture-sharpen` 1380× pure no-op since 2026-05-11. Disable or add prefix-filter |
| P1-3 | A1-F7 | Bundle children invisible to hook-fire auditor — extend `hook-fire-rank` to walk template literals |
| P1-4 | A1-F8 | `precompact-handoff` vs `precompact-auto-trigger` overlap — pick one |
| P1-5 | A2-F1 | Per-slot wrappers 55 actual vs 39 doctrine — regen or archive startup/handoff halves |
| P1-6 | A2-F2 | `lathe` + `lathe-studio` trigger collision; same for wedm/wire-edm-studio |
| P1-7 | A2-F3 | `/rename-chat` documented in available-skills but missing from disk |
| P1-8 | A2-F4 | `forge2..7` + `rgs2..6` versioning sprawl — most are ghosts (no backing files) |
| P1-9 | A2-F5 | 162 user-vs-project skill name collisions — audit + archive |
| P1-10 | A2-F6 | Skill-auto-trigger coverage 16% (36/225 project skills) — backfill frontmatter |
| P1-11 | A2-F9 | `superseded_by:` frontmatter field is doctrine-fictional (0 instances) — add to schema |
| P1-12 | A3-F4 | DEV-VELOCITY auto-regen ledger 1.5 days stale — wire to PostToolUse:commit |
| P1-13 | A4-F4 | RGS-TOOL-AUTOINVOKE-MS1 punchlist file MISSING + 3 P1 units incomplete |
| P1-14 | A4-F6 | Obsidian doc-reflection has no enforcement hook — build `stop-doc-reflection-gate.mjs` |
| P1-15 | A5-F4 | `token-budget-gate` at index 18 AFTER 18 injectors — move to index 0 |
| P1-16 | A5-F5 | Token-budget-telemetry never written (paths broken or missing) |
| P1-17 | A6-F4 | `wiki/log.md` 6.9d stale, `wiki/index.md` 37h stale despite WikiIndexMaintainer wired |
| P1-18 | A6-F5 | OBSIDIAN-INTELLIGENCE-MS3 — E1 IdeaBlockExtractor wiring unverified |
| P1-19 | A7-F3 | `kind:"unknown"` is 74.6% of all nodes — backfill in `expand-system-viz-l12-files.mjs` |
| P1-20 | A7-F4 | Drift detector silently exits 0 on missing `meta.fsCoverage` — should `exit 3` (fail-loud R12) |
| P1-21 | A7-F6 | No "delta since previous" query in `system-viz-query.mjs` — add `delta` action |
| P1-22 | A7-F7 | `system-viz-drift-history.jsonl` cited in CLAUDE.md but does NOT exist — fix or remove |
| P1-23 | A8-F1 | error-learn 5 hooks HOLD pending — release AFTER U-AUTO-MEMORY-WRITE ships |
| P1-24 | A8-F7 | RGS-TOOL-AUTOINVOKE planner sidecar `degraded:true, plans:{}` — diagnose root cause first |
| P1-25 | A9-F1 | 8 PRISM scheduled tasks; 3 likely obsolete (Zombie Reaper v2, Node Orphan Cleaner, Orphan Process Reaper PS) post-MS1 — audit + archive |
| P1-26 | A9-F4 | `PRISM_SCRUTINY_*` knobs may be dead post-3way rewrite — verify reader site |
| P1-27 | A10-F4 | DOCTRINAL CONFLICT: wire-by-default (WIRE-UNWIRED) vs wire-on-demonstrated-need (charlie). NEW UNIT `U-WIRE-DOCTRINE-RESOLUTION` — operator decides; HALT WIRE-UNWIRED-MS0 until then |
| P1-28 | A10-F5 | NEW UNIT `U-CHECKIN-VAULT-INJECT` — `vault-state-inject.mjs` surfaces top-3 vault entries (idea-blocks, canvas anchors, distillations) matching task keywords |

---

## P2 — DEFER / VERIFY-ONLY (8 findings)

| ID | Source | Finding |
|----|--------|---------|
| P2-1 | A1-F6 | `archived-skill-suggest` 28.6% useful — add prompt-length pre-filter |
| P2-2 | A2-F7 | quote/quote-to-ship/shop-quote family overlap |
| P2-3 | A2-F8 | `/handoff` vs `/precompact` semantic overlap — document distinction |
| P2-4 | A3-F5 | CLAUDE.md "21 ollama hooks" — disk has 17 |
| P2-5 | A3-F6 | Alpha vs Golf reaper guardian doctrine — strikethrough alpha section, keep only golf |
| P2-6 | A3-F7 | `H--prism` vs `H--PRISM` directory casing — normalize |
| P2-7 | A3-F8 | CLAUDE-BRIEF.md 1+ day stale — verify SessionStart regen wiring |
| P2-8 | A4-F5 | NN-GRAPH tier-5 silent no-op — add stderr advisory on first call |
| P2-9 | A9-F2 | `PRISM_ALPHA_GUARDIAN_*` knobs documented but superseded |
| P2-10 | A9-F3/F5/F6 | TWID + NNG + AUDIT_FROZEN_TIME knob proliferation — consolidate docs |
| P2-11 | A10-F6 | NN-GRAPH-MS0 deploy DEFERRED with no owner — operator decision (archive or assign) |

---

## RESCOPE / KILL

- **WIRE-UNWIRED-MS0**: HALT pending P1-27 (`U-WIRE-DOCTRINE-RESOLUTION`). Last 24h shipped 8 "wire read-only" units while charlie's `feedback_dont_wire_for_wiring_sake_2026_05_16` doctrine sits unenforced. 96% of 861 pool already proven noise.
- **Stage 0 prereq list** in V2 plan adds 6 units; this scrutiny adds **3 NEW Stage-2 units** (U-SLOT-WORKTREE-FORCED-CUTOVER, U-GOLF-CRASH-FAILOVER, U-ACTIVATE-BEFORE-BUILD-PRECHECK) as Stage-2 BLOCKERS alongside the original 3 forward-feedback loops.

---

## REVISED STAGE-2 GATE (must all ship before Stage 3+)

1. U-NEW-TOOL-AUTO-WIRE (echo)
2. U-AUTO-MEMORY-WRITE (bravo)
3. U-DOCTRINE-OBSOLESCENCE-SWEEP (echo)
4. **NEW**: U-SLOT-WORKTREE-FORCED-CUTOVER (alpha or operator-decision)
5. **NEW**: U-GOLF-CRASH-FAILOVER (alpha — sister to fleet-reaper)
6. **NEW**: U-ACTIVATE-BEFORE-BUILD-PRECHECK (echo)
7. **NEW**: U-CHECKIN-VAULT-INJECT (delta — vault surfacing for `/checkin`)
8. **NEW**: U-MEMORY-COMPRESS-V2 + watchdog-investigate (juliett — emergency)

---

## NEW DOCTRINE FINDINGS

1. **Observation-rich, action-poor** (A8 synthesis): PRISM has 40+ regression detectors, 6 error-pattern hooks, 1076 tribal citations — but the write-back loops are 0/3 built. **Build cadence must shift from detection to action.**
2. **Doctrine update without enforcement = dead-code doctrine** (A10-F2 + A10-F4): every new doctrine ("activate before build", "wire vs hold", "vault per backend unit") needs a paired hook OR the doctrine joins the dead R5-R12 rules.
3. **Single-owner doctrine = single-point-of-failure** (A10-F3): golf-owns-reaper went live same instant the new owner died. NEW doctrine: every single-owner ownership shift needs a failover unit shipped in the same commit.
4. **Already-built-but-inactive is the dominant gap class**: A6 (Obsidian MS3 11/24), A7 (classifier dead code), A8 (error-fix-vault-bridge directory missing), A10-F5 (vault not in /checkin), A10-F6 (NN-GRAPH dormant). The 5826-item ROADMAP-CONSOLIDATED is full of activate-not-build work.

---

## NEXT ITERATION (loop continues until full coverage)

Per user directive "loop until we cover everything I asked for" + V2 handoff:
- **Iter 2**: Verify which P0s are owned by peer slots (chat-bus + slot-task-claim). Spawn 10 more agents only on un-owned axes (A1+A2+A5+A6 highest leverage). Re-check 5 open questions from V2 for operator answer.
- **Iter 3**: After 5 open questions answered, dispatch Stage 0 (6 prereqs) + Stage 2 (8 units including 5 new from V2.1).
- **Termination**: Stages 0-4 complete + SLOT-PICKUPS-ALL regenerated from V2.1 + 24h re-audit registered.

---

## RELATED REFERENCES

- V2 plan: `state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-V2.md`
- V1.1 deltas: `state/shared/specs/JULIETT-PLAN-V1.1-SCRUTINY-DELTAS-2026-05-17.md`
- V1 master: `state/shared/specs/JULIETT-CONSOLIDATED-WORK-PLAN-2026-05-17.md`
- Per-slot queue: `state/shared/specs/SLOT-PICKUPS-ALL.md` (needs Stage-7 regen from V2.1)
- PRISM-app deferred: `state/shared/specs/PRISM-APP-QUEUE.md`
- Doctrines: `[[feedback_never_delete_only_disable]]`, `[[feedback_dont_wire_for_wiring_sake_2026_05_16]]`, `[[feedback_always_capture_lessons]]`, `[[feedback_reflect_all_changes_post_update]]`
