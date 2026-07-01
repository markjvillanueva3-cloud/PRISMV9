---
name: reference_cho02_compact_scan_accuracy_2026_06_09
description: "readChatPressure (CHO02, scripts/lib/chat-token-watch.mjs) over-reported false-critical on any transcript >256KB past its last compact marker -- the large-file path read ONLY the last 256KB for the isCompactSummary marker, so a chat that compacted then did >256KB work counted the WHOLE jsonl as post-compact -> always-critical. Live 68MB session read 20.5M tokens. Fixed with two-tier escalation (256KB tail -> bounded 16MB -> over-estimate) + byte-op findLastCompactOffsetInBuffer. Commit d257350cf3. Corrected the already-wired zulu sweep + token-awareness + UNBLOCKED+WIRED zulu-advisory-inject."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.515Z
aliases: reference_cho02_compact_scan_accuracy_2026_06_09
---


# CHO02 readChatPressure compact-scan accuracy + zulu-advisory wired (slot:bravo, 2026-06-09)

## The bug (fleet-wide, affected 3 zulu-lane consumers)
`readChatPressure` (CHO02, `scripts/lib/chat-token-watch.mjs`) drives the U-ZULU02 SendKeys sweep (decides when to auto-`/compact` a chat), token-awareness, and zulu-advisory-inject. Its `readTranscriptBytes` large-file path (file >4MB `FULL_LOAD_CEILING_BYTES`) read ONLY the last `COMPACT_TAIL_SCAN_BYTES`=256KB looking for the `"isCompactSummary":true` marker. A chat that compacted then did >256KB of work pushed the marker out of that window -> `found=false` -> it counted the WHOLE on-disk jsonl as post-compact -> always-critical. **Measured live: a 68.5MB transcript -> postCompactBytes=68.5MB -> 20.5M tokens -> critical** regardless of real context fill. So the sweep over-reported (would `/compact` chats that didn't need it) and zulu-advisory was un-wireable (it would fire `/compact` on nearly every prompt).
The original comment called the over-estimate "the safe direction for a pressure signal" -- safe for an auto-compact nudge, but it makes a per-prompt advisory useless (always-critical).

## The fix (commit d257350cf3)
1. **Two-tier escalation** in `readTranscriptBytes`: Tier-1 fast 256KB tail (common fresh-compact case) -> Tier-2 bounded 16MB (`LARGE_SCAN_BUDGET_BYTES`) read ONLY on a tail miss -> Tier-3 over-estimate only for genuinely-huge (>16MB post-compact) spans (which ARE correctly critical). One fd, bounded memory, escalation read only when needed.
2. **`findLastCompactOffsetInBuffer` -> Buffer byte-ops** (`buf.lastIndexOf(needleBuf)` / `buf.indexOf(0x0a)`) instead of `buf.toString().lastIndexOf` -- a string char index diverges from the byte offset over multibyte UTF-8, negligible on a 256KB ASCII tail but real over the 16MB window.
3. **4 R9 tests** (synthetic `_io` injection, no live-transcript self-pollution): tier-2 finds a marker 2MB back the tail misses; tier-3 bounded over-estimate beyond budget; tier-1 no needless escalation; byte-accurate offset across multibyte UTF-8. 30/30 pass; all 4 FAIL on pre-fix code.

## Proof (R15, real numbers)
- Synthetic 6.5MB transcript on real fs (marker 6MB back, 0.5MB post-compact): pre-fix `found:false/critical/6.5MB` -> post-fix `found:true/clean/0.50MB/149796 tokens`.
- **LIVE: the actual 68MB session that pre-fix read 20.5M-tokens-critical now reads CLEAN** -> wired zulu-advisory hook is silent (correct token-save). This is the cleanest live proof BECAUSE it observes the end result (clean->silent) rather than grepping the marker (which self-pollutes a session discussing `isCompactSummary`).

## Activation done (the gate from [[reference_zulu_advisory_fieldfix_2026_06_09]] is LIFTED)
zulu-advisory-inject WIRED into `C:/Users/wompu/.claude/settings.json` UserPromptSubmit (after slot-context-bundle-inject; 58->59 entries; c-to-h-mirror copied to H:/.claude; both parse-valid). It now fires ONLY at genuine warn/critical (silent at clean), fail-soft (every error -> exit 0), kill switches `PRISM_ZULU_DISABLE=1` / `PRISM_ZULU_ADVISORY_DISABLE=1`. Zero Claude-API cost (pure local). The accuracy fix ALSO corrected the already-running sweep + token-awareness (they were silently over-reporting) -- a 3-consumer activation from one fix.

## Lessons
- A "safe-direction" over-estimate in a SHARED signal silently degrades EVERY consumer differently (fine for one, useless for another). When a heuristic gives up (here: marker past 256KB), check what reads it before trusting the give-up default.
- Diagnosing a transcript-marker bug LIVE self-pollutes (every mention of the marker string lands in the transcript). Validate with synthetic buffers/files + observe end-behavior, never grep the live transcript for the marker.
- Byte-vs-char index conflation hides until the window grows; `Buffer.lastIndexOf/indexOf` are byte-exact.

Related: [[reference_zulu_advisory_fieldfix_2026_06_09]] (the consumer fix that surfaced this) · [[reference_zulu_orchestrator_ms1_2026_05_22]] (the sweep this corrects) · [[feedback_psn_definition]].
