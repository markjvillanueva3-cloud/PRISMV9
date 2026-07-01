---
name: scrutiny-2of2-2026-05-20
description: "2026-05-20 — strict 3-of-3 scrutiny reduced to strict 2-of-2 per user directive (\"update agent review process to only use 2 agents\")"
aliases: reference_scrutiny_2of2_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
---


**Scrutiny gate: 3-of-3 → 2-of-2 — 2026-05-20 (slot:juliett)**

User directive: *"update agent review process to only use 2 agents"*. Surfaced last session before the 1.1M-token cap; executed first turn post-/compact.

**Required arms (down from 3):**
- Arm A — `opusReviewed` — holistic acceptance criteria (`subagent_type: reviewer`)
- Arm B — `claudeReviewed` — independent second pass weighted toward test integrity / dispatcher wiring / inlined constants / scope (`subagent_type: reviewer`)

**Demoted to optional advisory:**
- Arm C — `codexReviewed` slot (the name is preserved for backward compat with pre-2026-05-13 ledger entries; the *invocation* has been a Claude `code-analyzer` since the Codex CLI was retired). Still recorded when supplied via `--mark-analyst`; no longer required by `isCleared()`.

**Files changed (commit: see git log SCRUTINY-2OF2):**
- `H:/prism/.claude/helpers/scrutiny-ledger.mjs` — `isCleared()` returns true on `opusReviewed && claudeArmOk` (drops the AND on `codexReviewed`). Legacy pre-3way fallback unchanged.
- `H:/prism/.claude/scripts/scrutiny-3way.mjs` — nextStep output emits 2-agent dispatch instructions; arm-C demoted to optional in the printed bash commands and consensus tag.
- `H:/prism/CLAUDE.md` — NOT EDITED this turn ([[feedback_golf_owns_reaper|golf-slot]]-only doctrine guard blocked). Update routed through "## Recent regressions" inbox for golf to drain. The §SCRUTINY GATE block will continue to mention 3-of-3 until golf updates it, but the load-bearing `isCleared()` already enforces 2-of-2.

**Backward compat:**
- Pre-2026-05-20 ledger entries with all three flags PASS still clear (`opusReviewed && claudeArmOk` is a subset).
- Pre-3way `selfReviewed && agentReviewed` legacy fallback unchanged.
- Schema: no version bump — fields preserved, only the predicate softened.

**Why:** [[feedback_dont_soften_completeness_gates]] reads as "don't disable build/wiring gates to suppress hangs". Reducing reviewer-count is a *user-directed* doctrine change, not a gate-softening to mask test failures. The remaining 2-of-2 gate still enforces concrete-assertion / dispatcher-wiring / inlined-constant / scope-discipline integrity via arm B's weighted criteria.

**Related:** [[feedback_scrutiny_3of3_readonly]], [[reference_codex_review_arm_2026_05_18]].
