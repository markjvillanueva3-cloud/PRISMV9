---
title: SESSIONSTART + USERPROMPTSUBMIT hook audit — 40 + 28 hook value classification
date: 2026-05-19
authoring_session: claude-cedef311 (slot=golf)
spec_status: ADVISORY
supersedes_partial: state/shared/specs/ANALYSIS-HANDOFF-SYSTEM-2026-05-11.md (P0 row "32 SessionStart hooks all emit additionalContext")
mustHumanVerify: true
related:
  - knowledge/wiki/architecture/specs/spec-analysis-handoff-system-2026-05-11.md
  - knowledge/memories/reference/reference_precompact_hook_autowrite_2026_05_15.md
---

# SessionStart + UserPromptSubmit hook audit — 2026-05-19

## TL;DR (vs the 2026-05-11 spec)

The 2026-05-11 analysis predicted **~100KB additionalContext** per SessionStart × 32 hooks. **Today (2026-05-19) the live measurement is ~14KB across 40 SessionStart hooks** — the bloat is real but ~7× smaller than the spec estimated. The diagnosis pattern is still correct (file-readers re-injecting on every /compact resume), but the magnitude has improved. The real amplifier is **UserPromptSubmit hooks firing on every prompt** (~5-10KB/turn in realistic conditions, compounded across the session).

This audit classifies all 68 hooks (40 SessionStart + 28 UserPromptSubmit) into KEEP / KEEP-LITE / MOVE-TO-CRON / REPLACE / OBSOLETE / FIX-NEEDED.

## Measurement methodology

```bash
# Fake harness payload, run each hook, measure additionalContext length
node -e "...spawnSync each hook with stdin={session_id, prompt}, parse stdout, sum .hookSpecificOutput.additionalContext.length..."
```

Caveats:
- Synthetic stdin lacks live chat state (no slot binding, no active claims, no real prompt context). Some hooks short-circuit silently when they detect synthetic mode — their real-world emit is larger.
- Measured at slot=golf, cwd=`H:/prism`, with this session's actual session_id. Other slots may emit different volumes.
- Per-prompt UserPromptSubmit total compounds over the session — 100 prompts × 2KB measured = 200KB, but real-world likely 500KB-1MB.

## Already-fixed in this audit (live edits)

| Setting | Before | After | Reason |
|---------|--------|-------|--------|
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 95 | 80 | 95% pushed compact to ~950k tokens — too late. 80% gives 200k headroom for SessionStart re-injection. |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 85000 | 48000 | 8.5%/turn allowed one bad turn to blow compact threshold. 4.8% cap forces self-compaction. |
| `heartbeat-keepalive` timeout | 8ms | 8000ms | Documented 2026-05-18 regression — 8ms typo broke fleet-wide chat-slot heartbeats. Hook never ran (node startup alone takes >100ms). |
| `slot-worktree-cwd-advisory.mjs` | — | NEW + WIRED | UserPromptSubmit T3, fires after slot-bind-enforce. Emits LOUD cd-command advisory when chat slot is bound but cwd is shared main tree or wrong worktree. Closes the "slot worktrees exist but no chat uses them" gap. |

## SessionStart hook classification (40 entries — measured injection in bytes)

Legend: **KEEP** = load-bearing, leave alone · **KEEP-LITE** = small/cheap, no action · **MOVE-TO-CRON** = file-reader, content already on disk, drop in-context inject in favor of 1-line pointer · **REPLACE** = newer feature subsumes this · **OBSOLETE** = unused integration, dead code · **FIX-NEEDED** = currently broken or degraded · **CRITICAL** = removing breaks the harness

| # | Hook | Inj | Class | Verdict |
|--:|------|----:|-------|---------|
| 1 | stress-harness-emit | 0 | KEEP-LITE | telemetry, silent emit |
| 2 | session-id-pin | 0 | KEEP-CRITICAL | foundational — pins harness session_id from stdin (load-bearing for slot-bind-enforce + chat-state-isolator) |
| 3 | session-start-terminal-pin | 0 | KEEP-CRITICAL | terminal-window-id pinning; closes /compact slot-drift class (per CLAUDE.md SESSION CONTINUITY STACK) |
| 4 | settings-mirror-guard | 0 | KEEP-LITE | C:↔H: sanity check; silent unless drift |
| 5 | portable-node-guard | 0 | KEEP-CRITICAL | required for all subsequent .mjs hooks to find node |
| 6 | verify-hook-refs | 0 | KEEP-LITE | hook integrity check |
| 7 | portable-python-guard | 0 | KEEP-LITE | conditional |
| 8 | multi-computer-awareness | 0 | KEEP-LITE | C:↔H: identity probe |
| 9 | ollama-autostart | 0 | KEEP | starts Ollama daemon if down |
| 10 | nim-autostart | 0 | KEEP | starts NIM if configured (per reference_nvidia_nim_local_setup_2026_05_18 — live on work PC) |
| 11 | plugin-path-fixer | 0 | KEEP-LITE | path resolution |
| 12 | git-health-guard | ~150 | KEEP-LITE | small diagnostic; useful pre-flight |
| 13 | git-sync-fetch | ~200 | KEEP | git fetch + divergence detect (saved this very session — surfaced 332-ahead/1-behind) |
| 14 | dotclaude-junctions-guard | 0 | KEEP-LITE | junction integrity |
| 15 | roadmap-resume | 72 | KEEP-LITE | small footer pointing at active milestone |
| 16 | session-start-goal-inject | 0 | KEEP-LITE | conditional /goal context |
| 17 | inventory-check-guard | 0 | KEEP-LITE | silent unless drift |
| 18 | expert-role-inject | 351 | KEEP-LITE | static expert prompt (immutable doctrine) |
| 19 | ai-command-awareness | 2064 | **MOVE-TO-CRON** | enumerates slash commands; static content, could be a 1-line pointer ("commands live at .claude/commands/, run /<name>") |
| 20 | ai-deep-intelligence | **4417** | **MOVE-TO-CRON** | biggest emitter — injects deep-awareness; redundant with master-index-precheck-inject which fires per-prompt |
| 21 | claude-brief-inject | **4067** | **MOVE-TO-CRON** | injects CLAUDE-BRIEF.md content; file already on disk + cron-regenerated; replace inject with 1-line pointer + age |
| 22 | build-state-inject | 952 | **MOVE-TO-CRON** | injects BUILD_STATE.md headline; file on disk, regenerated by post-commit cron; pointer suffices |
| 23 | awareness-snapshot-inject | 1043 | **MOVE-TO-CRON** | injects AWARENESS-SNAPSHOT.md headline; same pattern — file already on disk |
| 24 | blueprint-join-index-stale-check | 0 | KEEP-LITE | silent unless stale |
| 25 | gsd-inject | 289 | KEEP-LITE | small doctrine reminder |
| 26 | linear-roadmap-sync | 0 | **VERIFY** | silent in synthetic; check Linear creds — likely OBSOLETE if Linear not connected |
| 27 | supabase-state-sync | 0 | **VERIFY** | silent in synthetic; check Supabase URL — `SUPABASE_PROJECT_URL: ""` in settings → OBSOLETE today |
| 28 | tier1-context-pack | 156 | KEEP-LITE | small context pack |
| 29 | output-cache-inject | 141 | KEEP-LITE | small cache pointer |
| 30 | settings-baseline-snapshot | 0 | KEEP-LITE | drift detection |
| 31 | cognitive-budget-allocator | 0 | KEEP | budget tracking |
| 32 | curiosity-explorer | 89 | **VERIFY** | unclear value — name suggests experimental; needs grep to verify still-loved |
| 33 | chat-state-isolator | 43 | KEEP-CRITICAL | emits `**Chat Isolation:** <id>` line — load-bearing for slot-bind-enforce fallback path |
| 34 | session-handoff-load | 181 | KEEP-CRITICAL | reads per-chat HANDOFF-<id>-<topic>.md and emits RESUME directive |
| 35 | session-start-zombie-reap | 0 | KEEP | zombie process reaper, surfaced via stderr only |
| 36 | agent-worktree-stale-unlock | 0 | KEEP-LITE | infra |
| 37 | coordination-startup-banner | 0 | KEEP-LITE | banner |
| 38 | golf-slot-reaper-guardian | 0 | KEEP per doctrine | golf-owns-reaper (2026-05-16); silent on non-golf slots |
| 39 | session-start-auto-resume [compact] | 0 | KEEP-CRITICAL | post-/compact RESUME inject; load-bearing per [[reference_session_continuity_stack_2026_05_15]] |
| 40 | session-start-auto-resume [clear] | 0 | KEEP-CRITICAL | post-/clear RESUME inject |

**SessionStart totals:** measured 13,865 bytes / ~14KB across 17 sampled emitters. Top-5 emitters (ai-deep-intelligence 4417, claude-brief-inject 4067, ai-command-awareness 2064, awareness-snapshot-inject 1043, build-state-inject 952) = 12,543B = **90% of total injection** in 5 hooks.

## UserPromptSubmit hook classification (28 entries — measured injection per turn)

| # | Hook | Inj | Class | Notes |
|--:|------|----:|-------|-------|
| 1 | rename-window-intercept | 0 | KEEP-LITE | conditional |
| 2 | stress-harness-emit | 0 | KEEP-LITE | telemetry |
| 3 | checkin-args-surface | 0 | KEEP-LITE | /checkin slot inference |
| 4 | skill-auto-trigger | 0 | KEEP-LITE | per-prompt skill recommendation |
| 5 | close-out-audit-suggest | 0 | KEEP-LITE | keyword-gated |
| 6 | prompt-context-inject | 204 | KEEP-LITE | small context shim |
| 7 | master-index-precheck-inject | 0 | KEEP-CRITICAL | the search-first surface; per CLAUDE.md "do NOT wire into bundle, keep individual" |
| 8 | audit-viz-first-inject | **1112** | **REVIEW** | top-3 system-viz hits per prompt — high per-turn cost (~150KB over 150 prompts) |
| 9 | ollama-auto-router | 0 | KEEP-LITE | offload routing |
| 10 | session-id-pin | 0 | KEEP-CRITICAL | mirrors SessionStart pin |
| 11 | slot-bind-enforce | 0 | KEEP-CRITICAL | deterministic slot claim from stdin session_id |
| 12 | slot-worktree-cwd-advisory | 0 | NEW (this session) | wired after slot-bind-enforce |
| 13 | session-reorient-inject | 0 | KEEP-LITE | conditional |
| 14 | stale-state-warn | 0 | KEEP-LITE | conditional |
| 15 | prompt-rewriter-ollama | 0 | KEEP if useful | offload candidate; verify hit rate |
| 16 | local-compute-intent | 0 | KEEP-LITE | route decision |
| 17 | ollama-task-offloader | 0 | KEEP | hint consumer |
| 18 | ollama-pipeline-injector | 0 | KEEP-LITE | pipeline route map (silent unless trigger) |
| 19 | ollama-prewarm-on-pipeline | 0 | KEEP-LITE | model prewarm |
| 20 | ollama-route-check-inject | 0 | KEEP-LITE | route check |
| 21 | comprehensive-build-enforce | 0 | KEEP-CRITICAL | blocks stub/partial work |
| 22 | token-budget-gate | 0 | KEEP-LITE | gate |
| 23 | critical-memory-compact-nudge | 0 | KEEP | fires only at critical mem |
| 24 | auto-consensus-userprompt | 226 | KEEP-LITE | small consensus block |
| 25 | loop-iteration-inject | 0 | KEEP-LITE | /loop-keyword-gated |
| 26 | pick-prefresh-inject | 0 | KEEP-LITE | /pick-keyword-gated |
| 27 | goal-prereq-inject | 0 | KEEP-LITE | /goal-keyword-gated |
| 28 | heartbeat-keepalive | 0 | **FIXED THIS SESSION** | timeout 8→8000ms |
| 29 | golf-slot-reaper-guardian | 291 | KEEP per doctrine | golf-owns-reaper; idempotent fast-path noop on healthy reaper |

**UserPromptSubmit per-turn:** ~2KB measured synthetic; real-world likely 5-10KB given live state. **Real amplification: audit-viz-first-inject (1112B × 150 prompts ≈ 165KB) is the biggest per-session cost.**

## Recommended action chain (priority order)

### Wave 1 — settings + already-shipped (DONE this session)
- [x] `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 95 → 80
- [x] `CLAUDE_CODE_MAX_OUTPUT_TOKENS`: 85000 → 48000
- [x] `heartbeat-keepalive` timeout: 8 → 8000ms (closes 2026-05-18 fleet-wide regression)
- [x] Wire `slot-worktree-cwd-advisory.mjs` after `slot-bind-enforce.mjs` (UserPromptSubmit T3)

### Wave 2 — file-reader injectors → cron + pointer (5 SessionStart hooks, ~12KB/SessionStart savings)
Convert each of the 5 top SessionStart emitters so they:
1. Regenerate their source file on disk (existing logic — preserve)
2. Replace the in-context inject with a 1-line pointer + freshness timestamp
3. Operator reads on demand via Read tool

Targets in priority order:
- [ ] `ai-deep-intelligence` (4417B) → biggest win
- [ ] `claude-brief-inject` (4067B) → CLAUDE-BRIEF.md already on disk, cron-regenerated
- [ ] `ai-command-awareness` (2064B) → static command surface
- [ ] `awareness-snapshot-inject` (1043B) → AWARENESS-SNAPSHOT.md on disk
- [ ] `build-state-inject` (952B) → BUILD_STATE.md on disk

Estimated savings: **~12KB per SessionStart × ~10 SessionStarts per session = ~120KB / session**.

### Wave 3 — UserPromptSubmit per-turn amplifier
- [ ] `audit-viz-first-inject` (1112B/turn) — gate on intent classification more aggressively; today fires on most prompts. Lower fire rate by 50% saves ~80KB/session.

### Wave 4 — verify-or-retire
- [ ] `linear-roadmap-sync` — Linear creds unset in settings. If unused, retire to `_disabled/` per [[feedback_never_delete_only_disable]].
- [ ] `supabase-state-sync` — `SUPABASE_PROJECT_URL: ""` in settings. Same retire path.
- [ ] `curiosity-explorer` — verify it's still loved; if experimental, mark as such or retire.

### Wave 5 — chat-slot synergy (paired with this audit per user directive)
The slot-worktree-cwd-advisory hook (shipped Wave 1) closes the in-chat advisory gap. Coupling tasks:
- [ ] Document the migration runbook in `/checkin-<nato>` skills (the operator must close + reopen in slot worktree — Claude CLI cannot change cwd mid-session)
- [ ] Extend `slot-worktree-bootstrap.mjs --apply` to also write the chat-slots.json `branch` field on first bootstrap so the lane-routing hooks know to enforce
- [ ] Audit which of the 12 NATO slots in active use actually live in their slot worktree (per `git worktree list` cross-ref with `chat-slots.json:slots.*.branch`) — first measurement: **0/5 active chats today** (alpha, bravo, charlie, delta, golf all on `H:/prism` main with `branch=<none>`)

## Closing note

The 2026-05-11 spec's diagnosis (autocompact + hook re-injection) is the right mental model but the magnitudes have improved over the past year. Today's bigger problem is **UserPromptSubmit per-turn amplification** (compounds across the session) more than SessionStart one-shot injection. Wave 1 settings changes (autocompact threshold + output cap) are the highest-leverage fixes. Wave 2 file-reader conversion is the next-largest mechanical win. Wave 4 retire-or-verify cleans up dead code.

The slot-worktree-cwd-advisory hook is the synergy seam the user asked for: it makes the documented-but-inactive slot enforcement chain visible at every prompt by surfacing the cd-command operators need to actually migrate.
