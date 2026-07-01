---
name: reference_autoresume_stale_window_f5_2026_06_08
description: "F5 context-retention fix (commit c83ca9be64): session-start-auto-resume.mjs staleness threshold 4h→12h (240→720 min) + boot-path STALE-hint parity. Fixes silent resume-loss on >4h gaps (new-PC GPU/OCR bakes routinely exceed 4h)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.474Z
aliases: reference_autoresume_stale_window_f5_2026_06_08
---


**F5 — silent resume-loss fix (2026-06-08, slot:alpha, commit `c83ca9be64`).** Surfaced by ultracode workflow `w9brtuij1`'s context-retention lane (the only lane that survived — 4 lanes incl both obsidian lanes failed to API rate-limiting, pending re-run).

## What
`.claude/hooks/session-start-auto-resume.mjs`, two silent-context-loss fixes:
1. **`DEFAULT_MAX_AGE_MIN` 240→720** (4h→12h). The new PC runs long GPU/OCR bakes that routinely exceed 4h, so a valid handoff was dropped as "stale" → the next session resumed with NO prior context (silent loss). 12h covers a realistic overnight-bake gap while still rejecting truly-dead handoffs. Knob `PRISM_AUTO_RESUME_MAX_AGE_MIN` still overrides.
2. **Boot-path STALE-hint parity.** The boot path (`source==="startup"` + `PRISM_BOOT_SLOT`) used to `emit(SILENCE)` on a stale handoff — the boot chat got NO context AND no signal it had prior work. The compact path already surfaced a STALE hint; gave the boot path the same (`ageMinutesFromFrontmatter` null-safe guard + identical emit shape + `return` after emit, directs `/checkin-<slot>`).

## Tests / verify
44/44 (`node --test .claude/hooks/__tests__/session-start-auto-resume.test.mjs`). +2 new: a "12h default resumes a 10h handoff" R9 regression guard (fails on a 720→240 revert) + the staleHandoff fixture moved 10h→24h so it STAYS stale under the new 12h default (else the "stale→null" test would have silently flipped to passing-for-the-wrong-reason — an R9 trap the diff avoids) + the custom-window test repurposed 12h→48h. Live smoke: hook emits `{continue:true}` exit 0. **3-of-3 scrutiny PASS** (arms A/B/C, session claude-773b6557).

## Doc-reflect
Threshold corrected 240→720 in: the hook constant + its knob doc-comment, the test-file comment, and 2 memory files ([[reference_session_continuity_stack_2026_05_15]] + [[reference_autocompact_autonomous_ms0_2026_05_15]]). Wiki auto-distilled at `knowledge/wiki/code-tribal/learnings/context-retention-u-autoresume-stale-window.md`.

## Workflow leftovers (next /loop iterations)
Same workflow ranked 4 more context-retention survivors NOT yet built: **F2** (per-agent-handoff.mjs O(N=911) scan storm → 8s-timeout silent-resume-loss on compact; cap legacy-index rebuild to N-newest-by-mtime, behind a knob) · **F3** (memory-relevance-inject.mjs is lexical-only — add a nomic-embed semantic stage, union-before-rerank, fail-open; resident nomic-embed + 96GB Blackwell idle) · **F1** (autocompact knob drift 90-vs-95 — NEEDS OPERATOR SIGN-OFF before pinning) · **F4** (6 consolidated `.tmp` orphans — COORDINATE WITH GOLF; janitor in scripts/ non-recursive + misses `.tmp-<pid>-<ts>`). The 4 failed lanes (pc-specs, token-savings, obsidian-wiring, obsidian-value) need a re-run. Obsidian state confirmed by direct check: vault = `H:/prism/knowledge` (60,273 files, `.obsidian` config present — real vault); Obsidian app NOT running so REST API :27123 is dark; recall side is lexical-only (F3 = the real "synergy" gap).

Related: [[reference_session_continuity_stack_2026_05_15]] · [[feedback_reflect_all_changes_post_update]] · workflow w9brtuij1.
