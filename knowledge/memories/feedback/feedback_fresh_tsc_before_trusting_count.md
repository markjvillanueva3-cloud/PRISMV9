---
name: feedback_fresh_tsc_before_trusting_count
description: "Incremental .tsbuildinfo can report a STALE tsc error count; delete the cache + run fresh before treating \"N errors\" as real or claiming \"build green\""
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.426Z
aliases: feedback_fresh_tsc_before_trusting_count
---


When you read a `tsc --noEmit` error count to decide whether the build is clean (or to pick a "fix the last error" unit), **the count can be a stale `.tsbuildinfo` incremental-cache artifact** — it may report errors that a fresh full type-check does NOT reproduce, and vice-versa.

**Why:** TypeScript's incremental build writes `*.tsbuildinfo`. After peers fix files on a shared tree (or after your own edits), an out-of-date buildinfo can show a phantom error from a prior state, or mask a real one. During edits, the cache and the source drift, so a `grep -c "error TS"` mid-edit is unreliable.

**How to apply:**
- Before treating a tsc count as ground truth (especially before claiming "tsc 0 / build type-gate green", R12, or before starting a "fix the last error" task): `find mcp-server -maxdepth 2 -name '*.tsbuildinfo' -delete` then run `npx tsc --noEmit` fresh. Confirm the SAME count twice.
- Never claim "build green" off a single grep-count. The stale "0" and the stale "1" are equally untrustworthy.
- Concrete burn (2026-06-21, slot:sierra): a stale session-start buildinfo reported "1 error" in `InventorCADCodeGeneratorEngine.ts`. The project was actually tsc-clean (papa/delta had already fixed it, commits `23316cfe63`/`08158121b9`). Chasing the phantom, I added optional `CADCapabilityMatrix` fields that themselves *introduced* a real TS2739, then reverted (commit `365da2cde6`). Net-zero code, ~an hour burned. A fresh tsc at the start would have shown 0 and the whole thread never starts. This was the spiral; the revert commit message's own "still errors TS2739 / pre-session 1 error" rationale was also a cache-state artifact and is wrong — the record is corrected here.

Pairs with [[feedback_read_full_content_not_titles]] (verify the live thing, not a cached proxy) and the R12 fail-loud doctrine.
