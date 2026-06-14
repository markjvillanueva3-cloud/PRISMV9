---
name: reference-dev-velocity-autotrigger
description: "DEV-VELOCITY-AUTOTRIGGER-MS0 milestone — 13 units shipped 2026-05-12..13 — 11 new skills + 2 hook changes + 2 scripts + skill-auto-trigger orchestrator + CLAUDE.md auto-regen splicer. How to use each, how they fire, how to disable."
aliases: reference_dev_velocity_autotrigger
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.089Z
---


# DEV-VELOCITY-AUTOTRIGGER-MS0 — built 2026-05-12..13

13-unit milestone built in one autonomous push. Goal: stop bleeding tokens on the recurring dev-velocity friction points (multi-file scrutiny dispatch, archive sweeps, BOM stripping on .ps1 saves, git history bloat, telemetry-driven hook tuning, dispatcher coverage gaps, peer-file isolation, pre-commit lane checks, scrutiny replays, envelope drift, route-suggest false positives, mid-session git locks, wiring sprints). Each surface is a new slash command + (where relevant) an auto-trigger orchestrator that suggests it when keywords match the prompt.

## The 11 new skills (`.claude/commands/`)

Each ships with structured frontmatter: `triggers:` (keyword → score → suggest), `pipeline_integrations:` (forge/rgs/roadmap/forge-audit/close-out phase trigger), `loop_contract:` (max_iterations + break_when + done_signals), `impact:` (upstream/downstream/bounded/reversible).

| Skill | Phase | Purpose |
|-------|-------|---------|
| `/scrutiny-batch` | A.1 | Bundle 2-reviewer dispatch across N files in ONE tool block. Eliminates serial per-file scrutiny. |
| `/quick-archive` | A.2 | One-command bucket archive (HS-06 Phase 3 follow-up). Per-file try/catch for NTFS, `--restore` accepts wikiName/invokeName/basename. |
| `/encoding-guard` (skill+hook) | A.3 | PreEdit BOM stash + PostEdit BOM restore for .ps1/.psm1/.bat/.cmd/.reg. Eliminates HS-14 (PS5.1 em-dash mis-decode). JSONL append-only sidecar at `state/shared/encoding-guard-events.jsonl`. |
| `/big-blob-hunt` | A.4 | Scan git history for blobs >threshold. Classifies (MODEL_BINARY / AUTO_GEN_STATE / LEGACY_DUMP / TEST_FIXTURE) + lfs-migrate/filter-repo/gc recommendations. Feeds U-GC-02 blast-radius. |
| `/skill-recall-tune` | A.5 | Reads `archived-skill-suggest` telemetry → computes P25/P50/P75/P95 of BM25 scores → recommends calibrated `PRISM_ARCHIVED_SKILL_MIN_SCORE`. Weekly cron via `PRISM_CRON_PRIMARY`. |
| `/dispatcher-coverage` | B.1 | Pivots `ENGINE_WIRING_INDEX.json` on the dispatcher axis (engines-per-dispatcher, listed-actions, density). Companion to `/coverage-by-domain` (engine-name axis). `--diff=<ref>` shows delta. |
| `/peer-file-isolation` | B.2 | Conflict matrix of staged/modified files vs peer chat-bus claims (`state/shared/chat-bus/claims/*.json`). Per-row recommendation (wait/post-proposing/fork-to-worktree/escalate-via-main-tree). `--post-proposing="<msg>"` posts the CLAIMED message. |
| `/staged-sanity` | B.3 | PreToolUse:Bash on `git commit` — lane-check what's about to land. Sized scope, peer-claim overlap, ownership mismatch, magic-number suppression. |
| `/scrutiny-replay` | B.4 | Re-emits `opusReviewerPrompt` + `opusReviewerPromptB` from past `SCRUTINY_LEDGER.json` entries. Reviewer-drift audits, post-mortems on passed-but-buggy commits, post-schema-upgrade replays. `--auto-dispatch`, `--filter=verdict:fail|age:>30d|arm:opus,claude`. |
| `/envelope-drift-fix` | B.5 | Detects drift via `MILESTONE_PROGRESS.json` → applies `/envelope-sync` patch → runs `/close-out` 4-surface update → single aggregate commit. Loop contract max 5. Classifies stale-completed (NEVER auto-fixed) vs shipped-not-flipped (auto-fixable forward direction). |
| `/wire-unwired` | D.1 | Umbrella for wiring sprints. Orchestrates `/dispatcher-coverage` → `/forge-wiring` → `/wiring-batch` → `/unwired-review` in one invocation. Per-domain classifier via `state/shared/DISPATCHER_HOME_MAP.json`. Loop contract max 5, rollback if 3 iterations don't decrease unwired count. |

## The 3 hook changes (`.claude/hooks/`)

- **`mcp-route-suggest.mjs`** (Phase C.1) — smarter classifier. `hasNoDispatcherRoute()` suppresses the "Route first" nudge for git/.claude/state-shared/script-runs (commands with no dispatcher fit). Eliminates the false-positive nudge that was teaching operators to tune the hook out.
- **`git-lock-sweeper.mjs`** (Phase C.2) — dual-mode. Phase 1 Stop/UserPromptSubmit sweep with 5/60 min thresholds (unchanged). Phase 2 PreToolUse:Bash arm with 30s top-lock threshold when command starts with git/gh. Retry-with-backoff (50/100/200ms) for NTFS EBUSY handle races. Wired in bash-bundle.mjs and edit-bundle.mjs SHARED_HOOKS.
- **`skill-auto-trigger.mjs`** (Phase D.2, NEW T2 hook) — UserPromptSubmit orchestrator. Reads `knowledge/wiki/architecture/_skill-triggers.jsonl`, scores prompts against every skill's `triggers:` frontmatter, surfaces top-K (default 3) suggestions. 3-prompt suppression window. Telemetry to `hook-fire-counts.jsonl`. **Wired at `C:\Users\Mark Villanueva\.claude\settings.json` first slot of UserPromptSubmit chain.** Pure suggest-only.

## The 2 scripts (`scripts/`)

- **`extract-skill-triggers.mjs`** (Phase D.3) — walks `.claude/commands/*.md` (project + global), parses YAML frontmatter, emits `knowledge/wiki/architecture/_skill-triggers.jsonl`. SHA1 fingerprint idempotency. Initial run: 10 triggers from this milestone's skills. Schema: `{name, type, manifest, matcher:{type,value}, score, action}`.
- **`regen-claude-md-sections.mjs`** (Phase D.4) — marker-based section regenerator for `CLAUDE.md`. Markers: `<!-- AUTO-GEN: <key> START -->` / `END -->`. Initial keys: `dev-velocity-autotrigger`, `skill-auto-trigger-status`. Atomic temp+rename, idempotent (no-op when content unchanged).

## How to invoke

- **Manual**: `/scrutiny-batch`, `/dispatcher-coverage`, `/peer-file-isolation`, etc. — exact slash names.
- **Auto-trigger**: type a prompt with keywords from any skill's `triggers:` frontmatter — `skill-auto-trigger.mjs` surfaces top-K suggestions as an additionalContext bubble at the start of the next response.

## How to disable

- **All auto-suggestions:** `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1`
- **Per-skill score floor:** `PRISM_SKILL_AUTO_TRIGGER_MIN=<0..1>` (default 0.65)
- **Top-K cap:** `PRISM_SKILL_AUTO_TRIGGER_K=<N>` (default 3)
- **Verbose stderr:** `PRISM_SKILL_AUTO_TRIGGER_VERBOSE=1`
- **git-lock-sweeper PreToolUse arm:** set `PRISM_GIT_LOCK_SWEEPER_VERBOSE=1` to see retries; no clean disable knob — comment it out of `bash-bundle.mjs` if it ever misfires.

## How to extend

- **New skill with triggers:** add `triggers: - event: UserPromptSubmit, matcher: {type:keyword, value:"...|..."}, score: 0.85, action: suggest` to the new skill's frontmatter. Re-run `node scripts/extract-skill-triggers.mjs` to refresh the JSONL.
- **New CLAUDE.md auto-regen section:** add a generator function + register in `GENERATORS` map in `scripts/regen-claude-md-sections.mjs`; insert `<!-- AUTO-GEN: <key> START -->` / `END -->` markers in CLAUDE.md; re-run script.
- **Adjust score floor / top-K:** env-vars above.

## Plan + telemetry

- **Master plan:** `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` (P0-P13, ~520 lines).
- **Trigger ledger:** `knowledge/wiki/architecture/_skill-triggers.jsonl`.
- **Hook telemetry:** `mcp-server/data/state/hook-fire-counts.jsonl` (each `skill-auto-trigger` fire records decision + topK).
- **Last-3-prompts cache:** `state/shared/.skill-auto-trigger-recent.json`.

## Commits

Branch `cad-fusion-live-ms0` 2026-05-12..13:
- A phase: `09a8c2bed` `2c12c0498` `46c8805c3` `707757dfe` (5 skills)
- B phase: `a6e9f043c` `1d1c70202` `04d41edf7` `7cdf1b5eb` `<envelope-drift-fix-sha>` (5 skills)
- C phase: `58aa85d75` `475592b5a` (2 hook changes)
- D phase: `8a387424e` `2fa0178f7` `<d3>` `2b6354b54` (4 units)

Companion to [[reference_harness_hang_prevention]] (auto-trigger surface continues the post-HS dev-velocity track), [[reference_master_index_surface]] (alpha-slot peer milestone OBSIDIAN-PRISM-OS-MS0 from the same overnight session).
