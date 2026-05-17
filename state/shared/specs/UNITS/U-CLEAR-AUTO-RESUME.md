---
unit_id: U-CLEAR-AUTO-RESUME
milestone: JULIETT-12CHAT-ALLOCATION-MS0
owner_slot: alpha
wave: W0
cost: S
status: pending
peer_claims_check_at: 2026-05-17T00:00:00Z
tool_plan_ref: pending-rgs-build
depends_on: []
unblocks: [U-CLEAR-BYPASS-COMPOSITE, all-/clear-pickup-fleet-wide]
roi_score: 9.5
generated_at: 2026-05-17
generator_version: hand-written-v1
---

# U-CLEAR-AUTO-RESUME

## Goal
Wire the `clear` SessionStart matcher to `session-start-auto-resume.mjs` so `/clear` sessions get the same auto-resume injection that `/compact` sessions do today. **S8-CRITICAL discovery (iter-3): the hook code ALREADY accepts `source==="clear"` at line 234, but `C:/Users/wompu/.claude/settings.json` only wires the `compact` matcher arm.** Without this wire, /clear is strictly worse than /compact, defeating the CLEAR-NOT-COMPACT doctrine.

**Acceptance:** after `/clear` in any NATO slot, the next prompt sees the handoff RESUME directive in `additionalContext` (same as post-`/compact` today).

## Activate (do-not-build)
- `H:/prism/.claude/hooks/session-start-auto-resume.mjs` — code already handles `source==="clear"` (line 234 per S8 finding). NO code change needed.
- `H:/prism/.claude/hooks/session-start-terminal-pin.mjs` — already fires on all SS sources (matcher `""`); model for composite if needed.
- `H:/prism/.claude/helpers/per-agent-handoff.mjs` — read API already used by auto-resume.

## Build (net-new)
ZERO net-new code. Pure wiring change.

## Files-touched
- `C:/Users/wompu/.claude/settings.json` — add SessionStart matcher arm `"clear"` next to existing `"compact"` arm (line ~242-251 per S8 finding). EITHER add separate `{ matcher: "clear", hooks: [...] }` OR collapse to `{ matcher: "compact|clear", hooks: [...] }` (test the regex form first — Claude harness may not support OR in matcher).
- `H:/.claude/settings.json` — manual `cp` after C: edit (c-to-h-mirror does NOT fire on Bash node-writes per [[reference_precompact_bare_node_enoent_2026_05_16]]).

## Pre-flight
1. `node H:/prism/.claude/helpers/slot-task-claim.mjs claim --slot alpha --chatId <id> --unitId JULIETT-12CHAT-ALLOCATION-MS0::U-CLEAR-AUTO-RESUME`
2. **DO NOT EDIT IF PEER CLAIM EXISTS** — check chat-bus: `session-start-auto-resume.mjs` was claimed by claude-339c8ff7 in current cycle (per iter-3 SessionStart chat-bus). Wait for claim release OR fork to sibling worktree.
3. `Read .claude/hooks/session-start-auto-resume.mjs` line 234 — verify `source` parameter usage is what S8 described.
4. `Bash grep -n "clear" C:/Users/wompu/.claude/settings.json` — confirm zero `"clear"` matcher arms exist today.

## Test plan
- Manual: `/clear` in alpha slot → new chat shows RESUME directive injection in SessionStart context.
- Negative: `/clear` with `PRISM_AUTO_RESUME_DISABLE=1` → no injection (knob still works).
- Stale handoff: handoff age > 240min → hint surfaced instead of full resume (existing behavior preserved).
- Regression: `/compact` continues to fire auto-resume (no regression on existing path).
- Both settings.json byte-equal after edit (mirror discipline per [[feedback_settings_wiring_drift_2026_05_16]]).

## Wiring
The unit IS the wiring. See Files-touched.

## Test-shipped-criteria
- `grep '"clear"' C:/Users/wompu/.claude/settings.json` returns ≥1 match in SessionStart array
- `grep '"clear"' H:/.claude/settings.json` returns ≥1 match (mirror)
- Smoke test: `echo '{"session_id":"test","source":"clear"}' | node H:/prism/.claude/hooks/session-start-auto-resume.mjs` returns `additionalContext` (or fall-through silent if no handoff)

## Rollback
- Remove the added `"clear"` matcher arm from both settings.json copies (atomic node-script JSON write to avoid handcraft errors)
- Knob `PRISM_AUTO_RESUME_DISABLE=1` fully disables auto-resume on all SS sources (existing knob)

## References
- [[reference_session_continuity_stack_2026_05_15]] — auto-resume + terminal-pin + compact-boundary
- [[reference_precompact_hook_autowrite_2026_05_15]] — handoff write contract
- [[feedback_settings_wiring_drift_2026_05_16]] — verify BOTH settings.json after harness-config edits
- S8 synergy report (iter-3 commit) — CRITICAL discovery that code is ready, wire is missing
- V1 allocation §1 (CLEAR-NOT-COMPACT DOCTRINE) + §2 (W0 row)
