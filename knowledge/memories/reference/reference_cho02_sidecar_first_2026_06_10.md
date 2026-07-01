---
name: reference_cho02_sidecar_first_2026_06_10
description: "readChatPressure (scripts/lib/chat-token-watch.mjs) now reads the token-awareness sidecar FIRST (state/shared/token-budget-<slot>.json) and only falls back to the byte-estimate when the sidecar is missing/stale/disabled. The byte-estimate over-reports the live context window because it counts the whole on-disk jsonl (pre-compact bloat) -- live: 1.7M tokens=critical vs the real 739K=YELLOW/warn. Fixes the false-critical /compact nag in all 3 CHO02 consumers (zulu-advisory-inject, U-ZULU02 sweep, token-awareness-inject) at the source. Commit f8b7fa6d44 on cad-fusion-live-ms0."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.515Z
aliases: reference_cho02_sidecar_first_2026_06_10
---


# CHO02 sidecar-first readChatPressure (slot:bravo, 2026-06-10)

## The bug (over-report)
`readChatPressure` (scripts/lib/chat-token-watch.mjs) estimated context pressure from the
post-compact byte count of the on-disk transcript jsonl divided by DEFAULT_BYTES_PER_TOKEN.
But the jsonl accumulates PRE-compact bloat that is no longer in the live context window, so
the byte estimate over-reports. Live proof on slot bravo: byte-estimate = 1,718,708 tokens
(=> `critical`, fires the "/compact NOW" nag) while the REAL context was 739,355 / 1,000,000
= 73.9% (=> YELLOW / `warn`). After I wired zulu-advisory-inject this session, that hook
inherited the over-report and would nag for /compact at ~70% real usage.

## The fix (sidecar-first, zone-authoritative)
`token-awareness-sidecar.mjs` already writes the REAL `/context` assessment every prompt to
`state/shared/token-budget-<slot>.json`: `{ctx:{tokens,maxTokens,pct}, zone:"GREEN|YELLOW|RED", capturedAt}`.
`readChatPressure` now reads that FIRST (after computing bytesPerToken, before readTranscriptBytes):
- freshness-gated: TTL 180s (SIDECAR_TTL_MS); reject missing capturedAt, negative/future age, age>ttl.
- map `zone` -> level via `zoneToLevel` (RED/CRITICAL->critical, YELLOW/WARN->warn, GREEN/CLEAN->clean).
  DO NOT re-threshold the sidecar's tokens -- the zone is the authoritative assessment.
- on any miss (no slot, no file, parse fail, stale, unknown zone) -> return null -> fall back to byte-estimate.
Knob `PRISM_CHAT_TOKEN_SIDECAR_DISABLE=1` forces the byte path. Every result now carries a
`source:` tag ("sidecar" | "byte-estimate"). Mirrors the proven U-TA13 `readSidecarTokens`
pattern in precompact-auto-trigger.mjs:222 (chat-token-watch's header said both should improve together).

## New exports
- `zoneToLevel(zone)` -> "critical"|"warn"|"clean"|null
- `readSidecarPressure(slot, {sidecarDir, ttlMs, _io, _now})` -> {tokens, pct, level, source:"sidecar"} | null

## Verification
39/39 tests (9 new: zoneToLevel mapping, readSidecarPressure fresh/stale/future/missing/unknown-zone/unknown-slot,
readChatPressure sidecar-first beats byte-estimate with transcript readFileSync set to THROW to prove the
transcript is NOT read, + disable-knob + no-sidecar fallback). LIVE: readChatPressure(bravo) default =>
warn/source:sidecar/739K; forced byte => critical/1.7M. Same fix benefits all 3 CHO02 consumers.

Related: [[reference_cho02_compact_scan_accuracy_2026_06_09]] (the 16MB tail-scan escalation -- the byte path
this supersedes as primary) -- [[reference_zulu_advisory_fieldfix_2026_06_09]] (the consumer this protects) --
[[reference_bravo_unwired_hooks_audit_2026_06_10]] (why bravo-lane clean wire-ups are exhausted).
