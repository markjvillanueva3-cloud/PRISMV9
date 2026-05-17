---
unit_id: U-MEMORY-COMPRESS-V2
milestone: JULIETT-12CHAT-ALLOCATION-MS0
owner_slot: mike
wave: W1
cost: S
status: pending
peer_claims_check_at: 2026-05-17T00:00:00Z
tool_plan_ref: pending-rgs-build
depends_on: []
unblocks: [U-AUTO-MEMORY-WRITE, fleet-wide-MEMORY-recall]
roi_score: 9.0
generated_at: 2026-05-17
generator_version: hand-written-v1
---

# U-MEMORY-COMPRESS-V2

## Goal
Re-compress `C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` (currently at **97.7% of 24576-byte truncation ceiling — 570B from fleet-wide recall loss**) AND wire a HARD PreToolUse:Edit gate (paired sibling unit U-MEMORY-GROWTH-GATE) to prevent re-growth.

**Acceptance:** `MEMORY.md` ≤ 22000 bytes (≤ 90% of ceiling); every index entry ≤ 200 chars per global CLAUDE.md schema; per-memory `<slug>.md` files unchanged; PreToolUse:Edit gate blocks writes when bytes ≥ 22000 AND diff does not REDUCE.

## Activate (do-not-build)
- `H:/prism/scripts/memory-size-watch.mjs` — exit 0/1/2; baseline `state/shared/memory-size-history.jsonl` (mike shipped this U-OBS-B1, 2026-05-17 per CLAUDE.md Recent regressions)
- `H:/prism/.claude/hooks/stop-memory-size-watchdog.mjs` — WIRED 2026-05-17 mike, Stop T3 advisory ONLY (CONFIRMED watchdog gap: it warns post-write, never blocks)
- `MEMORY.md` 2026-05-16 U-MEMORY-COMPRESS entry (73KB → ~22KB; one-shot, no durable gate)
- [[feedback_reflect_all_changes_post_update]] — index entry ≤ 200 chars rule

## Build (net-new)
1. `scripts/memory-compress-v2.mjs` — programmatic compress; preserves all `<slug>.md` pointers; emits diff for human-verify before write (advisory, never auto-flips). Walks `## Indexed memories` section; per-line: if > 200 chars, truncate at sentence boundary OR drop verbose qualifiers; preserve `[<title>](<slug>.md) — ` skeleton.
2. `H:/prism/.claude/hooks/pretool-memory-size-gate.mjs` — PreToolUse:Edit gate on `MEMORY.md`; HARD-BLOCK when `currentBytes ≥ 22000` UNLESS diff REDUCES bytes OR `PRISM_MEMORY_APPEND_OK=1` env set. Reuse `memory-size-watch.mjs::computeBytes()` helper.

## Files-touched
- `H:/prism/scripts/memory-compress-v2.mjs` (Write, new)
- `H:/prism/scripts/memory-compress-v2.test.mjs` (Write, new)
- `H:/prism/.claude/hooks/pretool-memory-size-gate.mjs` (Write, new)
- `H:/prism/.claude/hooks/pretool-memory-size-gate.test.mjs` (Write, new)
- `C:/Users/wompu/.claude/settings.json` (Edit; add PreToolUse:Edit matcher `MEMORY.md` arm)
- `H:/.claude/settings.json` (cp manually after C: edit)
- `C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` (run compressor → write — **PEER LOCK CHECK FIRST**; claude-a61bbf34 had it claimed at iter-3 start)

## Pre-flight
1. Claim slot + unit: `node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot mike --chatId <id> --unitId JULIETT-12CHAT-ALLOCATION-MS0::U-MEMORY-COMPRESS-V2`
2. **HARD GATE**: query chat-bus for active claim on `C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md`; if peer-locked, wait OR coordinate
3. `Read MEMORY.md` (full); `wc -c MEMORY.md` (verify 23000-24576 byte range)
4. `Bash node scripts/memory-size-watch.mjs --json` (confirm watchdog reports critical)

## Test plan
- compress-v2 idempotency: run twice on compressed file → no diff
- compress-v2 pointer preservation: every `[name](file.md)` link in original survives in compressed
- compress-v2 max line length: every line under `## Indexed memories` ≤ 200 chars
- pretool-gate hard-block: simulate Edit at 23000 bytes WITH +100 byte append → blocks with reason
- pretool-gate pass-through: simulate Edit at 23000 bytes WITH -200 byte trim → allows (reduces)
- pretool-gate knob: `PRISM_MEMORY_APPEND_OK=1` → bypass allowed (logged)
- Watchdog regression: existing `stop-memory-size-watchdog.mjs` still fires post-edit advisory (no regression)
- Real bytes: post-compress `wc -c MEMORY.md` ≤ 22000

## Wiring
- Append to `C:/Users/wompu/.claude/settings.json` PreToolUse array:
  ```json
  { "matcher": "Edit|MultiEdit", "hooks": [{ "type": "command", "command": "node H:/prism/.claude/hooks/pretool-memory-size-gate.mjs", "timeout": 3000 }] }
  ```
- Mirror to `H:/.claude/settings.json`

## Test-shipped-criteria
- `wc -c C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` < 22000
- `node scripts/memory-size-watch.mjs --json | jq '.status'` == `"fresh"` (not "warn", not "critical")
- `node --test H:/prism/.claude/hooks/pretool-memory-size-gate.test.mjs` all pass
- SessionStart in any chat: no "truncation" warning emitted by Anthropic harness on MEMORY.md load

## Rollback
- Compressor pure-additive; rollback by `git revert` of MEMORY.md only (preserves the per-memory `<slug>.md` files untouched)
- Hook revert: remove settings.json arm + `git revert` hook .mjs (knob: `PRISM_MEMORY_GROWTH_GATE_DISABLE=1` also disables)

## References
- 2026-05-16 U-MEMORY-COMPRESS (one-shot, no watchdog) — CLAUDE.md Recent regressions
- 2026-05-17 U-OBS-B1 watchdog (advisory only) — same source
- [[reference_audit_token_context_memory_2026_05_16]] — META scripts for memory-size-watch + audit-hook-stack-cost
- V1 allocation §2 W1 row + §3 mike assignment
- A1 ALERT: V2 watchdog ALREADY SHIPPED — only compress script is net-new + the hard-block gate
- A8 NEW UNIT: U-MEMORY-GROWTH-GATE (paired sibling; ships together)
