---
name: learning-from-mistakes
description: MISTAKE-LEARNING-LOOP — auto-flag and capture lessons from mistakes, errors, bugs, fixes, regressions, P0/P1/HOSTILE/EXPLOITABLE/footgun/false-positive events
status: shipped
shipped_at: 2026-05-16
shipped_by: claude-a2b1b5ca slot hotel
milestone: OBSIDIAN-INTELLIGENCE-MS3 (meta-infra companion to G3)
related:
  - feedback_always_capture_lessons
  - reference_e1_ideablock_extractor_2026_05_15
  - feedback_scrutiny_gate_finds_hostile_payload_class
  - feedback_read_tool_strips_control_chars
  - feedback_conflict_fork_rule
---

# MISTAKE-LEARNING-LOOP

A 4-piece auto-capture loop so PRISM sessions systematically learn from mistakes, errors, bugs, fixes, regressions, false-positives, P0/P1 findings, hostile-input bypasses, footguns, and "got burned" moments — instead of those lessons evaporating with the session.

## Origin

User directive (2026-05-15, hotel slot, before /compact):

> "update the skill, script hook, stop hook, claude.md, obsidian and memories and wiki to ensure we learn from mistakes, errors, bugs, fixes. flag those key words and other keywords so we learn from mistakes"

Three lessons in the same session that motivated this:
- `[[feedback_read_tool_strips_control_chars]]` — Read-tool rendering trap (reviewer false-positive on U+001F)
- `[[feedback_scrutiny_gate_finds_hostile_payload_class]]` — 2-arm per-file gate catches what single-reviewer misses
- `[[reference_e1_ideablock_extractor_2026_05_15]]` — full IdeaBlock scrutiny record

Each was hand-captured. The loop systematizes that habit.

## Architecture

Four artifacts, all strictly additive over existing hooks:

| Surface | What it does | Tier |
|---------|--------------|------|
| `scripts/scan-for-learning-keywords.mjs` | scans last N commits + working diff for ~30 keyword patterns; dedups against memory/wiki corpus; emits a punch list (CLI + JSON). | meta tool |
| `.claude/hooks/mistake-keyword-flag.mjs` | PostToolUse advisory — when Bash/Edit/Write/MultiEdit tool output contains a hot keyword (P0/HOSTILE/FAIL/regression/hijack/footgun/false-positive/...), injects a one-block nudge to capture. Per-keyword cooldown 600 s. Pure-function units exported for tests. | T2 |
| `.claude/hooks/stop-learning-capture-prompt.mjs` | Stop hook — at session end, runs the scanner and surfaces uncaptured top-5 hits as advisory `additionalContext`. Throttle 900 s. Non-blocking. | T3 |
| `.claude/commands/learn-from-mistake.md` | `/learn-from-mistake` skill — manual capture entry point. Writes a structured memo (feedback / reference / project) with required `Why:` + `How to apply:` + `Related:` sections. | skill |

## Keyword catalog

Severity hierarchy: `critical` > `warn` > `info`.

| Category | Examples | Severity |
|----------|----------|----------|
| critical | `P0`, `HOSTILE`, `EXPLOITABLE`, `VULNERABLE`, `corrupted` | critical / warn |
| regression | `regression`, `hijack(ed)`, `broke(n)`, `crash(ed)` | warn / info |
| error | `TypeError`, `ReferenceError`, `error(ed)`, `exception` | info |
| bug | `footgun`, `antipattern`, `trap`, `pitfall` | warn / info |
| fix | `fix(ed)`, `patch(ed)`, `remediat(ed)` | info |
| mistake | `mistake`, `oops`, `got burned`, `wrong` | warn / info |
| learn | `lesson learned`, `in hindsight`, `next time`, `false-positive`, `false-negative` | warn / info |

Adjust min severity globally via `PRISM_MISTAKE_FLAG_MIN_SEVERITY` (default `warn`).

## Dedup logic

A hit is considered "already captured" when ANY of:

1. The commit SHA referenced in the hit's context already appears in any memo file in `C:/Users/wompu/.claude/projects/H--prism/memory/`.
2. A distinctive 12+ char token from the context matches existing memo content (fuzzy — signal > noise).
3. `MEMORY.md` already indexes a related slug.

Result: the punch list ONLY surfaces hits with no matching memo. False-negatives possible (signal > perfection); false-positives bounded by per-keyword cap of 5 hits + cooldown.

## When the loop fires

| Trigger | Surface | Throttle |
|---------|---------|----------|
| Bash output contains `P0` | `mistake-keyword-flag.mjs` PostToolUse | 600 s per keyword |
| Edit/Write content contains `HOSTILE` | same | same |
| `git log` shows uncaptured `regression` | scanner (CLI or hook) | 900 s for Stop hook |
| Session ends with uncaptured `FAIL` | `stop-learning-capture-prompt.mjs` | 900 s |
| Operator notices a lesson | `/learn-from-mistake` skill (manual) | none |

## Capture protocol (the part that makes it compounding)

Every captured memo MUST encode:

1. **Summary** (h1 + `description:` frontmatter)
2. **Why:** — the concrete incident (commit SHA, error text, false-positive trace) so future-you can verify it's still real
3. **How to apply:** — the actionable rule, when it kicks in
4. **Related:** — `[[other-memo-slug]]` cross-links to memory + wiki + CLAUDE.md sections

Anything missing the `Why:` or `How to apply:` lines is a memo-as-noise — the system flags it via existing memo-quality tooling.

## Knobs (env vars)

| Knob | Default | Purpose |
|------|---------|---------|
| `PRISM_LEARNING_SCAN_DISABLE` | unset | `=1` disables the scanner entirely |
| `PRISM_LEARNING_SCAN_WINDOW_COMMITS` | `20` | how many recent commits to scan |
| `PRISM_LEARNING_SCAN_MEMORY_DIR` | `C:/Users/wompu/.claude/projects/H--prism/memory` | override for tests |
| `PRISM_MISTAKE_FLAG_DISABLE` | unset | silence the PostToolUse advisory |
| `PRISM_MISTAKE_FLAG_MIN_SEVERITY` | `warn` | `critical` for only the loudest events |
| `PRISM_MISTAKE_FLAG_COOLDOWN_SEC` | `600` | per-keyword cooldown |
| `PRISM_STOP_LEARNING_DISABLE` | unset | disable the Stop advisory |
| `PRISM_STOP_LEARNING_THROTTLE_SEC` | `900` | minimum gap between Stop fires |
| `PRISM_STOP_LEARNING_WINDOW_COMMITS` | `10` | scanner window for Stop fires |
| `PRISM_STOP_LEARNING_MAX_HITS` | `5` | max hits to surface per fire |

## Tests

- `scripts/scan-for-learning-keywords.test.mjs` — 20 node:test cases ✓
- `.claude/hooks/mistake-keyword-flag.test.mjs` — 19 cases ✓
- `.claude/hooks/stop-learning-capture-prompt.test.mjs` — 14 cases ✓

All pure-function exports (scanText, findFirstHit, isOnCooldown, extractScanText, isThrottled, renderAdvisory) covered with adversarial inputs (empty, null, unicode, multi-word phrases, cooldown edges, defensive shape variance).

## Safety properties

- **Never blocks** — both hooks emit advisory `additionalContext` only; `continue: true` always.
- **Bounded output** — scanner caps per-keyword hits at 5; Stop surface caps at `MAX_HITS` (default 5).
- **Throttled** — per-keyword 600 s on PostToolUse, 900 s on Stop. Prevents fire-storm on tight loops.
- **Fail-silent** — every file/git read uses try/catch; missing scanner / corrupt cooldown file → silent no-op.
- **Disabled-by-knob** — every layer has a `PRISM_*_DISABLE=1` kill switch.
- **Pure-function units** — `scanText`, `findFirstHit`, `isOnCooldown`, `renderAdvisory` all pure; testable without git/disk.

## Wiring path

PostToolUse hook entry (in `C:/Users/wompu/.claude/settings.json`, matcher `Bash|Edit|Write|MultiEdit`):
```json
{
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mistake-keyword-flag.mjs",
  "timeout": 2500
}
```

Stop hook entry (after `post-ship-distill` in the Stop chain, timeout 3000ms):
```json
{
  "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-learning-capture-prompt.mjs",
  "timeout": 3000
}
```

Wiring is intentionally NOT auto-applied by this ship — operator chooses when to arm via a one-line settings.json edit (auto-mirrored to H: by the c-to-h-mirror hook). All three artifacts function standalone via CLI / direct invocation regardless of harness wiring.

## Related

- [[feedback_always_capture_lessons]] — the standing rule this loop systematizes
- [[reference_e1_ideablock_extractor_2026_05_15]] — example of a captured reference memo
- [[feedback_scrutiny_gate_finds_hostile_payload_class]] — example of a captured feedback memo
- [[feedback_read_tool_strips_control_chars]] — example of a tool-quirk capture
- [[feedback_conflict_fork_rule]] — example of an operational pattern capture
- CLAUDE.md §LEARN-FROM-MISTAKES PROTOCOL — doctrine pointer

## Why this is worth shipping

Mark loses ~30 min per session to re-deriving lessons that already exist somewhere in the vault but failed to surface because they weren't captured at the moment they were learned. The compound across a year of sessions is significant. The loop's job is *capture-friction reduction* — making the right thing (write a one-screen memo) the easy thing (the system literally injects "write a memo about this" mid-session).
