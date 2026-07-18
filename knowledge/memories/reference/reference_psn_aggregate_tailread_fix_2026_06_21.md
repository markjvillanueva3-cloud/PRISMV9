---
name: reference_psn_aggregate_tailread_fix_2026_06_21
description: "PSN savings aggregate's 500K tail-read cap under-reported the fleet headline (read full file then byte-sliced last 500KB, lossy mid-line). Fixed to a 64MB crash-guard ceiling + clean line-boundary truncation. 3-of-3 FAILED my first \"8MB covers ~2.2MB largest\" claim (real largest = 13.2MB) -- enumerate-before-claim lesson."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.124Z
aliases: reference_psn_aggregate_tailread_fix_2026_06_21
---


# PSN savings-aggregate tail-read windowing FIXED + a 3-of-3-caught false-coverage lesson (2026-06-21, slot:alpha)

**Commits:** `54f0b2d7a8` (first cut, 3-of-3 FAIL) -> `e013cef6b9` (correction, 3-of-3 PASS). Files: `.claude/hooks/stop-psn-savings-aggregate.mjs` + `.claude/hooks/__tests__/stop-psn-savings-aggregate.test.mjs`.

**Bug.** `tailRead` capped each aggregated ledger at the last `MAX_READ_BYTES=500_000`. Two faults: (1) it `readFileSync`s the WHOLE file then `buf.slice(buf.length-500K)` -- so the cap saved ZERO I/O, it only threw away most of the already-read buffer before parsing; (2) byte-slicing lands mid-record, so the first (partial) line was silently dropped by the consumer's `JSON.parse...catch{continue}`. The fleet-wide SessionStart savings headline therefore UNDER-reported: only the last ~23% of the 2.2MB prompt-rewrites ledger and ~last-4% of the 13.2MB pre-tool-savings-multi ledger were counted.

**Fix (e013cef6b9).** `MAX_READ_BYTES 500K -> 64MB` (a real crash-guard ceiling, ~5x the verified largest live ledger), and `tailRead` advances past the first newline ONLY when the slice began mid-line (`start>0 && buf[start-1] !== "\n"`) so a boundary-aligned slice keeps its first complete line. Exported `tailRead`+`MAX_READ_BYTES`; +6 R9 tests incl. an INTEGRATION round-trip (a >8MB ledger fully counted through `aggregateSavings` -- the test that would have caught the miss). **LIVE before/after:** `totals.savedTokens 521,600 -> 563,900` (~42K previously-masked REAL rtk savings surfaced); `totals.nudges 2,795 -> 4,471` (pre-tool-savings-multi 87,024 -> 144,661 lines); prompt-rewrites full-history 349.

**THE LESSON (3-of-3 caught my R12 false claim).** My first commit asserted "8MB covers every live ledger (largest ~2.2MB) with headroom." All three scrutiny arms FAILED it: the real largest is `pre-tool-savings-multi.jsonl` = **13.2MB**, so the 8MB cap STILL truncated it (~1,671 nudges dropped) -- the exact windowing bug I claimed to fix, left half-live, on a FALSE premise. Root cause: I enumerated ledger sizes in `.claude/cache/` + `mcp-server/data/state/` but NEVER listed `state/shared/dashboards/` (where the 13.2MB ledger lives). This is the [[feedback_enumerate_before_read]] / "never claim coverage without a full enumeration" failure -- a coverage/absence claim MUST be backed by the FULL `Glob`/`ls` of every relevant dir, with the count stated. The 3-of-3 gate working as designed (an isolated self-review would have shipped the lie). Always enumerate ALL source dirs before a "covers everything" claim.

**HONEST RESIDUAL (deferred, NOT solved).** Only 2 of 6 aggregated ledgers are pruned by `stop-ledger-prune.mjs` (rtk-savings + prompt-rewrites); `pre-tool-savings-multi` / `rtk-adoption-measure` / `read-auto-limit` / `nav` grow UNBOUNDED, so the 64MB ceiling WILL eventually be exceeded. The proper fix is **incremental/offset-based aggregation** (carry a cumulative total per ledger + parse only new lines past a stored byte offset) so read cost is bounded WITHOUT windowing and lifetime totals stay exact. Disclosed in-code; this is the next PSN-telemetry unit.

**Also deferred (arm-C P2, pre-existing):** the `scripts/lib/psn-savings-aggregate.mjs` header comment lists a stale legacy ledger `read-offset-nudges.jsonl` (drifted from the live `read-auto-limit`/`nav` SOURCES) -- harmless (the lib is a generic key-driven aggregator) but align on next touch.

Sibling: [[reference_psn_rewrite_shape_fix_2026_06_21]] (the shape bug -- object vs string) + [[reference_psn_aggregate_schema_mismatch_2026_06_12]] (the other substrates' savings-credit semantics, still deferred).
