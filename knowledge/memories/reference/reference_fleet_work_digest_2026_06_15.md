---
name: fleet-work-digest-2026-06-15
description: "BUILT (golf, 2026-06-15, operator: 'utilize obsidian vault to improve context for all chat slots -- know what all other chats built/completed/working-on WITHOUT losing tokens'). FLEET-WORK-DIGEST = one compact ~320-token cross-fleet digest of what every chat slot is working on NOW + has shipped in 24h, injected at SessionStart + on a fleet-keyword UserPromptSubmit gate (0 tokens on normal turns), vs reading 26 x ~215-line consolidated handoffs (~150k tokens). aggregate-once (scripts/fleet-work-digest.mjs build, imports chat-slots getStatus() + git-logs each slot branch for [SCOPE]/U-ID subjects) -> inject-compact (.claude/hooks/fleet-work-digest-inject.mjs SessionStart+keyword) -> regen-throttled (.claude/hooks/fleet-work-digest-stop.mjs, 5min stamp, detached, rides fleet Stop stream) -> drill-down-on-demand (slot-query.mjs <slot>). Commits ec55dc0abb (feature) + c4dd828c26 (security fix). Knobs: PRISM_FLEET_WORK_DIGEST_{DISABLE,INJECT_DISABLE,WINDOW_H,MAXUNITS,STALE_MIN}. Digest artifact gitignored (regen state); scripts/hooks durable. 52 tests, 3-of-3 PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.578Z
aliases: reference_fleet_work_digest_2026_06_15
---


**Built (2026-06-15, slot golf).** Operator asked whether the Obsidian vault could give every chat slot awareness of what all OTHER chats have built/completed/are-working-on, token-efficiently. Answer: PRISM already had ~70% of the substrate (fleet-status.mjs live activity, per-slot consolidated handoffs @215 lines each, galaxy MASTER-DIGEST per-domain); the missing piece was ONE compact per-turn-cheap digest. Built it.

## Architecture (aggregate-once -> inject-compact -> drill-down)
- **scripts/fleet-work-digest.mjs** (`build`/`print`/`--json`): imports `.claude/helpers/chat-slots.mjs` `getStatus()` for live per-slot {status,topic,activity,branch}, then `git log <slot-branch> --since=<window>` per slot -> parses shipped `[SCOPE]/U-ID` unit-ids (reverts excluded). Emits `state/shared/FLEET-WORK-DIGEST.md` (~35 lines: 1 line/active slot `NAME [LIVE] now: <topic> | shipped N/24h: U-A,U-B | last: <subj>`; idle slots collapsed to a name list). Pure helpers (parseUnitId/trunc/isActiveSlot/buildSlotLine/composeDigest/resolveBranch/buildModel/isSafeBranch) + injectable `io.git`. 33 node:test.
- **.claude/hooks/fleet-work-digest-stop.mjs**: throttled (5min stamp) detached regen riding the fleet Stop stream (mirrors fleet-task-health-stop) -> ~0 per-turn cost, 26 simultaneous Stops collapse to 1 rebuild.
- **.claude/hooks/fleet-work-digest-inject.mjs**: injects the ~320-token digest at SessionStart (always) + UserPromptSubmit ONLY when `isFleetQuery()` matches (so normal turns pay 0 tokens). 23 gate tests.
- Wired into C:+H: settings.json (SessionStart/UserPromptSubmit/Stop, byte-identical, .bak-fleet-work-digest backup). Digest .gitignored (regen machine-specific state).
- **Drill-down stays opt-in:** the digest footer points at `node scripts/slot-query.mjs <slot>` for one slot's full detail -- deep context is one command away, never standing cost.

## Token math (the operator's "WITHOUT losing tokens" constraint)
~320 tokens injected at SessionStart + on keyword, vs 26 x 215-line handoffs (~150k tokens). Generation amortized to the throttled background Stop hook.

## Two scrutiny-caught bugs (lessons)
1. **`\b`-as-backspace in a `new RegExp(template)` (per-file arm B).** The UserPromptSubmit keyword gate's per-slot arm was built via `new RegExp(\`...\\b...\`)`, but through the JSON->heredoc write layers the `\\b` (needed so the STRING contains `\b` = regex word-boundary) got reduced to `\b` = the U+0008 BACKSPACE char -> the regex matched nothing real. Fix: make it a regex LITERAL `/\bwhat .../i` (where on-disk `\b` is correctly a word-boundary), inlining the NATO names. LESSON: when writing a `.mjs` via shell heredoc, a `new RegExp` template's `\b`/`\d`/`\w` need DOUBLE backslash in source AND survive the heredoc/JSON layer -- prefer a regex literal (single backslash, no layering) when the pattern is static.
2. **git OPTION-INJECTION -> arbitrary file write (3-of-3 arm C P1).** `gitSubjects`/`gitLastSubject` passed `branch` (from UNVALIDATED chat-slots.json `state.branch`) as a positional `git log <rev>` arg. A crafted branch `--output=/tmp/x` is parsed by git as an OPTION -> arbitrary file write, firing in every chat's detached Stop regen. Can't use a `--` separator (that turns the rev into a pathspec, breaking the feature). Fix: `isSafeBranch(b)=/^[A-Za-z0-9][\w./-]*$/` (plain branch name, no leading `-`/metachars) applied at resolveBranch (malicious -> slot/<name> fallback) AND both git boundaries (unsafe -> []/null without invoking git). LESSON: any value reaching `execFileSync("git",[..., userish, ...])` as a positional REVISION must be charset-whitelisted against leading-`-` -- execFileSync stops SHELL injection but NOT git OPTION injection.

## Also-fixed P1 (per-file): NATO keyword over-fire (token-leak)
The gate's per-slot arm originally matched a bare NATO name (`what is uniform`/`what is alpha`) -> injected ~320 tokens on ordinary prompts (uniform=distribution, alpha=alpha-channel, victor.ts, mike=microphone). Fix: require a fleet-WORK verb within 30 chars after the slot name (`what is oscar DOING` matches; `what is uniform` does not). 23-case regression test incl. the bare-NATO negatives.

Siblings: [[reference_fleet_task_health_ms0_2026_05_17]] (the Stop-hook-regen pattern mirrored), [[feedback_golf_owns_reaper]], [[reference_galaxy_context_federation_viz_roost_2026_06_01]] (the galaxy MASTER-DIGEST this complements -- that is per-DOMAIN, this is per-CHAT-current-work). Drill-down: [[feedback_slot_query_by_name_and_recency]].
