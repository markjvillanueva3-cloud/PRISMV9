# HANDOFF — claude-c785ffe4 — dev-velocity-autotrigger-postclose

**Session:** 2026-05-13 close-out
**Branch:** cad-fusion-live-ms0
**Slot:** delta (chat 4)

## RESUME (read this first)

After the regex-fix commit `a70f1c18f` reclassified 1033 hidden-shipped units, next `/pick-unit --slot delta` returns **AI-MAX-MS0/U-AIMAX11** — AI Reasoning Skill Commands. (Was ACP-MS1/P0-U01 in the original handoff; superseded by the regex fix surfacing more shipped units across the lane.)

Pool state after fix: 356 remaining (was 493). Drift cases now visible: 166 (each an envelope-out-of-date with git, triage via `/envelope-drift-fix` — stale-completed NEVER auto-fixed; shipped-not-flipped is the safe direction).

## Milestone shipped this session

**DEV-VELOCITY-AUTOTRIGGER-MS0** (13 units) + post-milestone follow-ups A/B/C/D + ACP-MS0/P0-U05.

## Total session commits

22 on `cad-fusion-live-ms0`.

## Fleet-wide-impact commit this session

`a70f1c18f` — fix build-milestone-progress.mjs regex to also match `[SCOPE]/P0-U05` (phase-unit) form alongside the legacy `[SCOPE]/U-<id>` form. This was the BROKEN_CHAINS class my gap map identified in `92bddb303`. Side-effects:
- Shipped detected: 66 → **1099** (+1033)
- pick-unit pool: 493 → 356
- BUILD_STATE NEEDS_BUILDING: 3472 → 2439
- Drift cases: 2 → **166** (real backlog now visible; was silently hidden)
- ACP-MS0 envelope flipped `not_started` → `completed` (5/5)

## Key deliverables landed

### 11 new skills (`.claude/commands/*.md`)
- `/scrutiny-batch` — parallel reviewer dispatch across N files in one block
- `/quick-archive` — bucket archive (NTFS-safe, `--restore` accepts wikiName/invokeName/basename)
- `/encoding-guard` (skill+hook) — BOM stash/restore for .ps1/.psm1/.bat/.cmd/.reg via JSONL event log
- `/big-blob-hunt` — git history blob scanner with MODEL_BINARY/AUTO_GEN_STATE/LEGACY_DUMP/TEST_FIXTURE classifier
- `/skill-recall-tune` — telemetry-driven `PRISM_ARCHIVED_SKILL_MIN_SCORE` calibrator
- `/dispatcher-coverage` — pivots ENGINE_WIRING_INDEX.json on the dispatcher axis (companion to /coverage-by-domain)
- `/peer-file-isolation` — conflict matrix of staged/modified files vs chat-bus claims; `--post-proposing` posts CLAIMED message
- `/staged-sanity` — pre-commit lane check
- `/scrutiny-replay` — re-emits past SCRUTINY_LEDGER reviewer prompts for re-dispatch
- `/envelope-drift-fix` — orchestrator over /envelope-sync + /close-out; stale-completed never auto-fixed
- `/wire-unwired` — umbrella orchestrating /dispatcher-coverage + /forge-wiring + /wiring-batch + /unwired-review

### 3 hook changes (`.claude/hooks/`)
- `mcp-route-suggest.mjs` — `hasNoDispatcherRoute()` suppresses false-positive nudges on git/.claude/state-shared/scripts
- `git-lock-sweeper.mjs` — PreToolUse:Bash arm with 30s threshold + retry-with-backoff (50/100/200ms) for NTFS EBUSY
- **NEW** `skill-auto-trigger.mjs` (T2) — UserPromptSubmit orchestrator reads `_skill-triggers.jsonl`, surfaces top-K skill suggestions per prompt

### 4 scripts (`scripts/`)
- `extract-skill-triggers.mjs` — walks `.claude/commands/*.md`, emits `knowledge/wiki/architecture/_skill-triggers.jsonl` (idempotent SHA1 fingerprint)
- `regen-claude-md-sections.mjs` — marker-based section regenerator (`<!-- AUTO-GEN: <key> START -->`)
- `produce-automation-gap-map.mjs` — 8-class gap classifier; 20 inline self-tests + 9 pure exports
- (sister test file) `ProduceAutomationGapMap.test.ts` — 30 vitest cases all reference-value assertions

### Generated artifacts
- `state/shared/AUTOMATION_GAP_MAP.md` + `automation-gap-map.json` — 358 hooks-not-wired / 195 scripts-not-invoked / 226 untriggered-skills / 922 engines-unwired
- `state/shared/BIG-BLOB-CANDIDATES.json` + `GIT-TREE-DECISIONS.md` blast-radius — 25 blobs ≥10MB / ~700MB
- `state/shared/ENVELOPE-DRIFT-TRIAGE-2026-05-13.md` — HTML-PRIMARY-MS0 auto-fixed, MF-MS1/MS2 surfaced for manual
- `state/shared/WIRE-UNWIRED-LATHE-PROPOSAL-2026-05-13.md` — 73 unwired Lathe in 4 tiers
- `state/shared/SKILL-AUTO-TRIGGER-SOAK-BASELINE.md` — 11 cold-start fires; 48h calibration recipe

## Knobs to remember

- `PRISM_SKILL_AUTO_TRIGGER_DISABLE=1` — turn off auto-suggest
- `PRISM_SKILL_AUTO_TRIGGER_K=N` — top-K (default 3)
- `PRISM_SKILL_AUTO_TRIGGER_MIN=0..1` — score floor (default 0.65)
- `PRISM_SKILL_AUTO_TRIGGER_VERBOSE=1` — stderr debug
- `PRISM_GIT_LOCK_SWEEPER_VERBOSE=1` — retry diagnostics

## Open threads for next session

1. **ACP-MS1/P0-U01** — 9-class task classifier (next /pick-unit top)
2. **73 unwired Lathe engines** — apply Tier-A (4 engines, ~30 min) next per `WIRE-UNWIRED-LATHE-PROPOSAL-2026-05-13.md`
3. **MF-MS1 + MF-MS2 envelope drifts** — operator manual review (stale-completed direction — doctrine prohibits auto-fix)
4. **`build-milestone-progress.mjs` regex gap** — requires `[SCOPE]/U-<id>` but ACP-MS0 envelope uses `P0-U05` ids; pattern mismatch surfaced as BROKEN_CHAINS in the gap map
5. **Stage-22 wiring** of `extract-skill-triggers.mjs` into `regen-wiki-from-viz.mjs` (deferred from D.3)
6. **48h calibration** of `PRISM_SKILL_AUTO_TRIGGER_MIN` via the soak-baseline recipe

## See also

- `[[reference_dev_velocity_autotrigger]]` — operating manual in C: memory vault
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` — master plan (P0-P13)
- `mcp-server/data/milestones/DEV-VELOCITY-AUTOTRIGGER-MS0.json` — envelope
- `mcp-server/data/milestones/ACP-MS0.json` — 2/5 units shipped (P0-U01, P0-U05)
