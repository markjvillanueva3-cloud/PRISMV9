---
name: reference-precompact-hook-autowrite-2026-05-15
description: "/compact now auto-generates a precompact handoff via a strictly-gated precompact-hook source. Slot-prefixed topic, fixed-size padding. Shipped 2026-05-15 commit 5c4778b59."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.857Z
aliases: reference_precompact_hook_autowrite_2026_05_15
---


# /compact → auto-precompact handoff (shipped 2026-05-15, commit 5c4778b59)

Solves: the 2026-05-06 handoff-writer ban (`[[feedback_handoff_writers]]`) created a side effect — when a chat ran `/compact` WITHOUT first invoking `/precompact` manually, the PreCompact hooks all skipped the handoff write and the next session had no real RESUME directive. User directive 2026-05-15: "make compact slash command auto generate the precompact."

## What changed

| File | Change |
|---|---|
| `.claude/helpers/per-agent-handoff.mjs` | Accepts `--source precompact-hook` with strict validation (resume ≥30 chars, non-placeholder, no fresh live-chat RESUME within 5min) |
| `.claude/helpers/precompact-handoff.mjs` | When `getExistingResume()` returns null, the hook now synthesizes a RESUME via `generateSmartResume()` and writes it with `--source precompact-hook`, slot-prefixed topic, padded to fixed size |
| `padFileToBytes(filePath, targetBytes)` | New exported helper. Pads to exact `PRISM_PRECOMPACT_HANDOFF_PAD_BYTES` (default 4096) via HTML-comment block (invisible to markdown + RESUME extractor) |

## Doctrine update

`[[feedback_handoff_writers]]` is NOT lifted — the ban remains. `precompact-hook` is a strictly-validated exception, not a general lift. Hooks STILL can't write generic stubs because:

1. Resume must be ≥30 chars AND not in the placeholder denylist (`compacting`, `true`, `unknown`, etc.)
2. If a fresh live-chat handoff exists (<5min), the hook write is rejected with `rejectedBy: "fresh-live-chat-resume-exists"` — live-chat always wins
3. The synthesized RESUME pulls from CURRENT_POSITION, roadmap claims, recent commits — real session state

## Knobs

| Env | Default | Purpose |
|---|---|---|
| `PRISM_PRECOMPACT_HANDOFF_PAD_BYTES` | 4096 | Target size for padded handoffs |
| `PRISM_PRECOMPACT_HANDOFF_PAD_DISABLE` | unset | Skip padding entirely |

## Why fixed-size handoffs

User asked "if we make handoffs the exact same size everytime, would that make it truly autonomous?" Honest answer: YES it helps, but it's not the trigger.

- **What makes the loop autonomous**: PreCompact hook reliably synthesizes a real RESUME → SessionStart:compact auto-injects via `session-start-auto-resume.mjs` → terminal-pin re-binds slot → fresh chat picks up where prior left off.
- **What fixed-size adds**: deterministic byte budget for the survival path; predictable headroom between the HARD threshold (900K tokens) and the 1M context cap; auditability.
- **What NOT to do**: disable autocompact entirely. Hitting the 1M wall with no autocompact = session dies. Push `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` to 95-98 at most, never off.

## Tests

- `.claude/helpers/precompact-pad.test.mjs` — 13 node:test cases, all pass
- `.claude/helpers/precompact-hook-source.test.mjs` — 11 cases written, deferred to test-runner agent (currently spawns the helper which uses prod handoffs dir; needs env-isolated `HANDOFFS_DIR` override before running in CI)

## Related

- `[[feedback_handoff_writers]]` — original 2026-05-06 ban (supersedes-with-exception)
- `[[feedback_handoff_topic_naming]]` — slot-prefix matches checkin slot binding
- `[[reference_session_continuity_stack_2026_05_15]]` — the broader auto-resume mechanism
- `[[feedback_conflict_fork_rule]]` — companion shared-tree pattern


## Related
[[skills/compact|/compact]] • [[skills/precompact|/precompact]] • [[skills/helpers|/helpers]] • [[skills/per-agent-handoff|/per-agent-handoff]] • [[skills/precompact-handoff|/precompact-handoff]] • [[skills/precompact-pad|/precompact-pad]] • [[skills/precompact-hook-source|/precompact-hook-source]]