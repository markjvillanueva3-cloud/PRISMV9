---
name: scrutiny-replay
title: Scrutiny Replay — Re-emit a Past Session's Reviewer Prompts
description: Read a previous entry from `mcp-server/data/state/SCRUTINY_LEDGER.json` and re-emit its `opusReviewerPrompt` (arm A) + `opusReviewerPromptB` (arm B) so the operator (or a subagent) can re-dispatch the same review against fresh context. Useful for reviewer drift detection, post-mortems on a passed-but-buggy commit, or replaying a stale ledger entry after a tool/agent upgrade.
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "scrutiny replay|re-run scrutiny|replay reviewer|scrutiny audit|scrutiny ledger drift|redo scrutiny"
    score: 0.80
    action: suggest

pipeline_integrations:
  - pipeline: forge-audit             # /forge-audit layer-5
    phase: layer-5-scrutiny-drift
    trigger: "audit of stale or drifted scrutiny verdicts"
    action: invoke
  - pipeline: scrutinize              # /scrutinize standalone
    phase: post-mortem
    trigger: "operator wants to re-run review on a past session"
    action: invoke
  - pipeline: handoff                 # /handoff
    phase: pre-write
    trigger: "embed scrutiny verdict in handoff narrative — replay if stale"
    action: invoke-if-stale

loop_contract:
  max_iterations: 1                # single-shot replay; the actual reviewer dispatch is operator-driven
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: all-pass
  state_signal: replayed_prompt
  rollback_on_runaway: false
  done_signals:
    - '{"done": true, "verdict": "REPLAY_EMITTED", "session_id": "<id>", "previous_verdict": "<v>"}'
    - '{"done": true, "verdict": "NOT_FOUND", "session_id": "<id>"}'

impact:
  upstream:
    - mcp-server/data/state/SCRUTINY_LEDGER.json (canonical session→verdict ledger)
    - .claude/scripts/scrutiny-3way.mjs (the orchestrator this skill complements)
    - operator manual invocation
    - /forge-audit layer-5 (drift detection)
  downstream:
    - operator dispatches reviewer agents with the replayed prompts
    - new ledger entries (same sessionId, marked --notes "replay <ts>")
    - never mutates the original ledger entry — replays append fresh marks
  bounded: true
  reversible: true  # read-only on the ledger; the operator's reviewer dispatch is the only mutation surface
composes_with:
  - "/forge-audit"
  - "/handoff"
  - "/scrutiny-batch"
---
# /scrutiny-replay — Re-emit a Past Session's Reviewer Prompts

> **Goal:** the scrutiny ledger has dozens of historical entries — some passed, some failed, some ancient. When you want to ask "would these reviewers still verdict this PASS today?" you need to re-dispatch them with the same prompt. Today this is a manual `git show` + copy-paste game.
>
> This skill reads `SCRUTINY_LEDGER.json` for a given `session_id` (or shorthand: `--last`, `--head`, `--target=<sha>`), reconstructs the `opusReviewerPrompt` + `opusReviewerPromptB` strings that `scrutiny-3way.mjs` originally generated, and emits them ready for the operator (or a subagent) to dispatch.
>
> **Built for:** the recurring "this PASS was issued 3 days ago; the code has drifted, but the ledger still says PASS" situation. Surfaces the replay path so re-verification is one command instead of five manual steps.

## When to use

- Reviewer drift audit (a chat shipped a passed-but-buggy commit; want to know whether the reviewer would still PASS today)
- After a `scrutiny-3way.mjs` upgrade (new reviewer arms, new diff filtering — verify old verdicts hold)
- Inside `/forge-audit` layer-5 (drift detection sweep)
- Post-mortem on a regression: replay the scrutiny that "should have caught it"
- After resolving an `index.lock` collision that overwrote a freshly-marked ledger entry

## When NOT to use

- For fresh scrutiny rounds — use `scrutiny-3way.mjs --session-id <id>` directly (or `/scrutiny-batch` for multi-file runs)
- To MODIFY the original ledger entry (this skill is read+replay only; new marks land as fresh ledger rows)
- For one-arm-only replay (this skill emits BOTH arm A + arm B; to skip an arm, the operator simply doesn't dispatch that one)

## Usage

```
/scrutiny-replay                                       # default: replay the most recent ledger entry
/scrutiny-replay --session-id=<id>                     # specific session
/scrutiny-replay --last                                # alias for default (most recent)
/scrutiny-replay --last=5                              # replay the last 5 entries (emit 5 prompt pairs)
/scrutiny-replay --target=<sha>                        # replay against a specific commit (rebuilds diff fresh)
/scrutiny-replay --filter=verdict:fail                 # replay all FAIL entries (audit which ones still fail)
/scrutiny-replay --filter=age:>30d                     # replay entries older than 30 days (staleness sweep)
/scrutiny-replay --filter=arm:opus,arm:claude          # replay only entries where BOTH arms were marked
/scrutiny-replay --output-json                         # write state/shared/SCRUTINY_REPLAY_REPORT.json
/scrutiny-replay --auto-dispatch                       # ALSO dispatch reviewer agents (per CLAUDE.md scrutiny doctrine)
```

## Protocol

### Step 0 — Resolve parameters
- Validate at least one of `--session-id`, `--last`, `--target`, `--filter` is set (else default to `--last`).
- For `--filter`: support comma-separated tokens, parse as `<key>:<value>` pairs where `<key> ∈ {verdict, age, arm, agent, target-sha}`.

### Step 1 — Load the ledger
```bash
LEDGER=H:/prism/mcp-server/data/state/SCRUTINY_LEDGER.json
```
Read and parse. The shape (verified):
```jsonc
{
  "<session_id>": {
    "createdAt": "<ISO>",
    "targetSha": "<sha or session-diff>",
    "diffSummary": { "filesChanged": <N>, "insertions": <N>, "deletions": <N> },
    "armCodex":   { "verdict": "PASS|FAIL", "markedAt": "<ISO>", "notes": "<...>" },
    "armOpus":    { "verdict": "PASS|FAIL", "markedAt": "<ISO>", "notes": "<...>" },
    "armOpusB"|"claudeReviewed"|"geminiReviewed": { ... },     // arm B (current field name varies; alias-tolerant)
    "opusReviewerPrompt":   "<...full prompt string...>",
    "opusReviewerPromptB":  "<...full prompt string...>",      // may be missing on legacy entries
    "isCleared": <bool>
  },
  ...
}
```
If the file is missing or empty → emit `{"done": true, "verdict": "NOT_FOUND"}` and exit.

### Step 2 — Resolve session list per flags
| Flag | Resolution |
|------|------------|
| `--session-id=<id>` | exact lookup; error if not found |
| `--last` or default | sort by `createdAt desc`, take 1 |
| `--last=N` | sort by `createdAt desc`, take N |
| `--target=<sha>` | filter entries where `targetSha === sha`; if none, fall back to live diff via scrutiny-3way --target |
| `--filter=verdict:fail` | filter where any arm's verdict === "FAIL" |
| `--filter=age:>Nd` | filter where `(now - createdAt) > N days` |
| `--filter=arm:opus` | filter where `armOpus` is present |

### Step 3 — Per-session: reconstruct prompts
For each resolved session:
- If `opusReviewerPrompt` + `opusReviewerPromptB` are present in the ledger entry → emit them directly.
- If MISSING (legacy entry before the prompts were ledger-persisted) → re-run `scrutiny-3way.mjs --session-id <id>` in **prompt-only mode** (`--emit-prompts-only` flag — verify it exists; if not, surface "legacy entry; re-run scrutiny-3way.mjs --session-id manually" and skip).
- If the entry's `targetSha` is `session-diff` and the session's working-tree diff has drifted, surface a WARN: "diff has changed since ledger entry; replay reflects ORIGINAL diff, not current". For `--target=<sha>`, the diff is reproducible.

### Step 4 — Surface replay block
For each session:
```
┌─ /scrutiny-replay ───────────────────────────────────
│ Session:    <id>
│ Created:    <ISO> (<age>)
│ Target:     <sha or session-diff>
│ Diff:       <files> files, <ins>+ / <del>-
│ Previous:   codex=<v>  opus(A)=<v>  claude(B)=<v>     ← from ledger
├──────────────────────────────────────────────────────
│ ARM A — opusReviewerPrompt:
│
│   <full prompt string, one line per literal newline>
│
├──────────────────────────────────────────────────────
│ ARM B — opusReviewerPromptB:
│
│   <full prompt string>
└──────────────────────────────────────────────────────

To dispatch:
  Agent({ subagent_type: 'reviewer', description: 'Replay scrutiny <id> arm A', prompt: <ARM A> })
  Agent({ subagent_type: 'reviewer', description: 'Replay scrutiny <id> arm B', prompt: <ARM B> })

To record new verdicts after dispatch:
  node .claude/scripts/scrutiny-3way.mjs --mark-opus pass --session-id <id> --notes "replay <ts>"
  node .claude/scripts/scrutiny-3way.mjs --mark-claude pass --session-id <id> --notes "replay <ts>"
```

### Step 5 — (if --auto-dispatch)
- Spawn both reviewer agents in parallel via the Agent tool (subagent_type=`reviewer`, isolation per CLAUDE.md scrutiny doctrine).
- Capture their verdicts.
- Record both via `scrutiny-3way.mjs --mark-opus <v>` and `--mark-claude <v>` with `--notes "auto-replay <ts>"`.
- Surface delta from previous verdict (CONFIRMED / DRIFTED).

### Step 6 — (if --output-json)
Write `state/shared/SCRUTINY_REPLAY_REPORT.json` via temp+rename:
```jsonc
{
  "schemaVersion": 1,
  "timestamp": "<ISO>",
  "scope": "<--session-id|--last=N|--filter=...>",
  "replays": [
    {
      "session_id": "<id>",
      "created_at": "<ISO>",
      "age_hours": <N>,
      "target_sha": "<sha>",
      "previous_verdict": { "codex": "<v>", "opus": "<v>", "claude": "<v>" },
      "new_verdict":      { "opus": "<v|pending>", "claude": "<v|pending>" }, // pending if not --auto-dispatch
      "delta":            "CONFIRMED | DRIFTED | PENDING_DISPATCH"
    },
    ...
  ],
  "summary": { "total": <N>, "confirmed": <N>, "drifted": <N>, "pending": <N> }
}
```

### Step 7 — Emit verdict JSON
- `{"done": true, "verdict": "REPLAY_EMITTED", "session_id": "<id>", "previous_verdict": "<v>"}` (single)
- `{"done": true, "verdict": "REPLAY_BATCH", "count": <N>, "summary": {...}}` (multi)
- `{"done": true, "verdict": "NOT_FOUND", "session_id": "<id>"}` (lookup miss)

## Implementation notes

- **Ledger schema tolerance:** the arm-B field name has drifted (`armOpusB` → `claudeReviewed` → legacy `geminiReviewed`) per CLAUDE.md §SCRUTINY GATE. Read all three; treat the first non-empty as authoritative. Surface the field name used in `--output-json` for traceability.
- **Reviewer prompt persistence:** the prompts ARE stored in the ledger by `scrutiny-3way.mjs` per its 2026-05-05 schema bump. Entries older than that are "legacy" — see Step 3's fallback.
- **`--auto-dispatch` safety:** the Agent dispatches are isolated reviewer agents that do NOT modify files. The only mutation is `scrutiny-3way.mjs --mark-*` which appends a new mark to the same session entry. Original verdict is preserved (the script stores a `marks[]` array of history per arm).
- **`--target=<sha>` replay:** uses scrutiny-3way's existing `--target <sha>` flag to regenerate the diff fresh against the named commit. This is the most reproducible mode (session-diff replays can drift).
- **Multi-chat safety:** read-only on the ledger except via `scrutiny-3way.mjs --mark-*`, which already uses the script's lock-aware write path. Concurrent replays from different chats are safe.
- **Performance:** ledger is ~50-200 entries currently; per-session replay <50 ms. `--last=5` round-trip <250 ms. Multi-session `--filter=age:>30d` may surface dozens; default cap N=20 unless `--top=N` overrides.

## What this skill does NOT do

- Does NOT run the Codex CLI arm (replay is reviewer-only; Codex is operator-invoked separately via `node .claude/scripts/scrutiny-3way.mjs --session-id <id>`)
- Does NOT modify the original ledger entry's verdict fields (only appends new marks)
- Does NOT delete ledger entries (use `scrutiny-3way.mjs --purge` if needed; not exposed via this skill)
- Does NOT bypass the Stop hook's 3-of-3 gate — replay is informational; the Stop hook still requires fresh codex + opus + claude marks for a NEW session to clear

## Examples

### Example 1 — replay most recent session
```
/scrutiny-replay
```
Default — emit ARM A + ARM B prompts for the most recent ledger entry.

### Example 2 — staleness sweep
```
/scrutiny-replay --filter=age:>30d --output-json
```
Surfaces every entry >30 days old, with their old verdicts. Operator then triages which to auto-dispatch.

### Example 3 — confirm a passed-but-suspect commit
```
/scrutiny-replay --target=abc1234 --auto-dispatch
```
Re-runs both reviewers against the diff at commit `abc1234` and records new marks. Surfaces CONFIRMED or DRIFTED.

### Example 4 — replay last 3 sessions, no auto-dispatch
```
/scrutiny-replay --last=3
```
Emits 3 prompt pairs. Operator dispatches subagents manually for full control.

### Example 5 — handoff pre-write check
```
/scrutiny-replay --session-id=<this-session> --output-json
# /handoff reads SCRUTINY_REPLAY_REPORT.json and embeds the verdict in the handoff narrative
```

## See also

- `.claude/scripts/scrutiny-3way.mjs` — the orchestrator (this skill is the replay surface over its ledger)
- `mcp-server/data/state/SCRUTINY_LEDGER.json` — canonical ledger
- `.claude/hooks/scrutinize-before-stop.mjs` — the 3-of-3 Stop gate (not bypassed by this skill)
- `.claude/commands/scrutinize.md` — fresh-session scrutiny (companion, not duplicate)
- `.claude/commands/scrutiny-batch.md` — Phase A.1 — bulk parallel reviewer dispatch (this skill is single-session replay)
- `.claude/commands/scrutinize-mark.md` — operator-facing mark recorder (read sibling)
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase B.4 — this skill's milestone
- CLAUDE.md §SCRUTINY GATE — 3-of-3 consensus doctrine
