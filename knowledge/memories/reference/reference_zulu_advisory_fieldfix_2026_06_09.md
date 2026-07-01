---
name: reference_zulu_advisory_fieldfix_2026_06_09
description: "zulu-advisory-inject (dormant UserPromptSubmit hook) was BUILT-but-unwired AND field-mismatched: read pressure.level/.tokens but readChatPressure(CHO02) returns pressureLevel/tokensEstimate -> main() exited every prompt (silent no-op even if wired). Fixed (normalizePressure adapter + entry-guard + R9 tests, commit 9a598c52c7) but DELIBERATELY NOT WIRED: readChatPressure over-reports (found=false, counts whole jsonl) so a wired advisory = fleet-wide noise. Deeper unit = CHO02 compact-detection accuracy."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
aliases: reference_zulu_advisory_fieldfix_2026_06_09
---


# zulu-advisory-inject field-fix + the CHO02 accuracy gate (slot:bravo, 2026-06-09)

## What shipped (commit 9a598c52c7, cad-fusion-live-ms0)
`zulu-advisory-inject.mjs` was a dormant zulu-lane UserPromptSubmit hook (0 settings refs in all 3 settings.json). The scout flagged it as "BUILT-but-unwired, wire it." Verifying first (R8) caught a SECOND defect: it was also field-mismatched, so wiring it as-is would have made a wired-forever-no-op (the "looks active, silently does nothing" regression class — same family as the localhost-IPv6 sweep).

- **The bug**: hook read `pressure.level` / `pressure.tokens`, but its producer `readChatPressure` (CHO02, `scripts/lib/chat-token-watch.mjs`) returns `{ pressureLevel, tokensEstimate }`. So `main()` `if (!pressure.level) process.exit(0)` fired EVERY prompt -> never emitted.
- **R9 lesson**: the old test hand-built `pressure` as `{level,tokens}` — the shape the hook EXPECTED, not the shape the producer EMITS — so unit tests were green while the integration was dead. A test that constructs the consumer's assumed input instead of the producer's real output verifies nothing.
- **Testability lesson**: the hook ran `main()` unconditionally on import (no entry guard), and `main()`'s `for await (process.stdin)` blocks forever on an open stdin under `node --test` -> the test could NEVER run (exit 255, no output). An un-importable hook is how the field bug stayed unverified. Fixed with the repo's standard guard: `const isDirect = import.meta.url === pathToFileURL(process.argv[1]||"").href; if (isDirect) main()...` (convention `localhost-ollama-hardcode-guard.mjs:97`).
- **Fix**: `normalizePressure(raw)` boundary adapter (`pressureLevel->level`, `tokensEstimate->tokens`, tolerant of both, null-passthrough) + entry-guard + 4 R9 tests asserting the REAL producer shape flows end-to-end (they FAIL on the pre-fix hook). 23/23 pass. Live smoke: forced-critical -> emits `/compact` advisory; `PRISM_ZULU_DISABLE=1` -> silent.
- Also folded a pre-existing uncommitted Zebra->Zulu rename for this file (orphan from migration `71c7be4e3`).

## UPDATE 2026-06-09: GATE LIFTED -> CHO02 FIXED + zulu-advisory NOW WIRED
The gate below is RESOLVED. CHO02 accuracy fixed (commit d257350cf3, two-tier 256KB->16MB escalation + byte-op marker scan) -- see [[reference_cho02_compact_scan_accuracy_2026_06_09]]. zulu-advisory-inject is now WIRED into settings.json UserPromptSubmit (59 entries, C:+mirrored H:). PROVEN: the live 68MB session that pre-fix read false-critical now reads CLEAN -> hook silent. Original gate rationale (still valid as the reason it was deferred to a 2nd unit) preserved below.

## Why it WAS NOT wired (the original gate -- R13 logical order: don't wire a consumer atop an unproven dependency)
`readChatPressure(SID)` for the live session returned `found=false, lastCompactOffset=0, postCompactBytes==totalBytes (68.5MB) -> tokensEstimate 20.5M -> critical` (threshold `DEFAULT_CRITICAL_AT_TOKENS=940k`). It counts the WHOLE on-disk jsonl as post-compact bytes. If it reports always-critical, wiring an always-on `/compact recommended` advisory injects noise on nearly every prompt across ~10 fleet sessions. So the hook is now CORRECT but stays unwired until the pressure signal is trustworthy.

## The deeper unit (next pickup, bravo/zulu lane) — CHO02 compact-boundary detection accuracy
`findLastCompactOffsetInBuffer` searches needle `"isCompactSummary":true`. For a >4MB transcript (`FULL_LOAD_CEILING_BYTES=4MB`) it uses the TAIL path: reads only the last `COMPACT_TAIL_SCAN_BYTES=256KB`. **Hypothesis A (most likely):** in a long post-compact session, >256KB accumulates AFTER the last compact marker, pushing the marker out of the 256KB window -> found=false -> postCompactBytes=whole file -> over-report. **Hypothesis B:** auto-compact may not write `"isCompactSummary":true` into the same jsonl (format) — verify on a CLEAN transcript.
- **Fix direction**: for large transcripts, scan a larger/whole-file window for the (short) marker, OR reuse precompact-auto-trigger's recorded offset, OR memory-aware-raise the window. Affects ALL CHO02 consumers: `zulu-advisory-inject`, the zulu SendKeys sweep (U-ZULU02, which decides when to `/compact` chats), `token-awareness-inject`.
- **CRITICAL diagnostic caveat**: do NOT diagnose this in a session that is discussing the marker string — every mention of `isCompactSummary` (commands, outputs) gets appended to the transcript and pollutes the grep/scan (I hit exactly this: 6 "markers 2KB from EOF" were my own analysis text, not real boundaries). Use a DIFFERENT session's transcript, and match the marker as a structural JSONL line (line-anchored / by entry `type`), not a substring anywhere.

Related: [[reference_zulu_orchestrator_ms0]] · [[reference_bravo_hermes_zulu_hooks]] · [[feedback_psn_definition]] (zulu = chat-fleet orchestration leg).
