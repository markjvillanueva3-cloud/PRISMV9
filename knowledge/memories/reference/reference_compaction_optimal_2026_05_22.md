---
name: compaction-optimal-2026-05-22
description: "User-directed audit + fix of PRISM's token-awareness tracker + compaction system. Found 4-read sidecar (root cause of staleness), HP-bar/tracker divergence, stale GREEN lull. Shipped P0/P1/P2 across 3 commits; 3-of-3 PASS."
aliases: reference_compaction_optimal_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.070Z
---


# COMPACTION-OPTIMAL — 2026-05-22, slot alpha

User interrupted the U-BRIDGE-WIRE-MILL loop with: *"can you see if our token usage tracker is accurate relative to our compaction system and the ui HP bar"* then *"check the entire compaction system to ensure its optimal."* User chose **Everything (P0+P1+P2)** scope.

## Verdict on the user's literal question
The tracker's **number** was accurate when fresh (compact-boundary-safe via `extractLatestCtx`). The **freshness was broken** — sidecar did 4× full 4 MB transcript read+parses per fire → timed out under fleet load → went stale → bar showed minute-to-hour-stale numbers. The HP bar and the injected tracker **disagreed when stale** because the statusline silently fell back to its own `estimateCtx()` while the inject kept showing the frozen sidecar.

## Audit + fixes (3 commits)

**P0 — `d8e25d1407` `[COMPACTION-OPTIMAL]/P0-SINGLE-READ`** (3 files, 249+/67−)
- `scripts/lib/transcript-token-counter.mjs`: new `readTranscriptTail(filePath)` single-read primitive returning `{raw, active}`; pure `analyzeTranscriptFromText` / `extractLatestCtxFromText` operate on already-read text; `analyzeTranscript` / `extractLatestCtx` / `tailReadTranscript` kept as thin backward-compat wrappers; dead private `tailReadTranscriptRaw` removed; `extractLatestCtx` now skips compact-summary records via new exported `isCompactSummaryBlock` (mirrors `precompact-auto-trigger`).
- `.claude/hooks/token-awareness-sidecar.mjs`: reads tail ONCE, feeds both sources. **4 reads → 1.** Direct root-cause fix for sidecar staleness.
- 14 new lib tests: single-read intent (counts `fs.openSync` calls = 1), zero-IO purity (FromText variants throw on disk access), equivalence oracle (FromText ≡ file-reading variants), P1c skip fail-on-revert (`tokens === 300+2000` not `950_000`).

**P1-P2 — `7dc2702e23` `[COMPACTION-OPTIMAL]/P1-P2`** (6 files, 48+/18−)
- P1a — staleness TTL 60s→180s in all 3 readers (`DEFAULT_STALE_TTL_MS`, statusline `TOKEN_AWARENESS_SIDECAR_TTL_MS`, precompact `SIDECAR_TTL_MS`, kept equal). 60s false-flagged healthy sidecars stale on any turn longer than a minute; under fleet load (Bash calls 30-41s) almost every long turn tripped false-stale.
- P1b — statusline `readTokenAwarenessSidecar` returns the sidecar even when stale (annotated `_stale`) so the bar shows the SAME ctx number the inject shows (with a `⚠stale` flag) — single source of truth, no divergence.
- P2b — statusline `SLOT_NAMES = Object.keys(slotsObj)` instead of a hard-coded `['alpha',...,'lima']` (12). Now renders all 26 slots automatically as the fleet expands.
- P2c — `compression-precompact.mjs` header-marked unwired. The hook was wired on **PreCompact** but its trigger checks `input.prompt` for "compact" — PreCompact events carry NO `prompt` field, so it no-opped on 100% of fires. Its `SESSION_COMPRESSED-*.json` output had no reader, and it duplicated the canonical `precompact-handoff`. Settings.json removal applied + mirrored C:→H: (outside this repo).
- P2a — `token-awareness-sidecar.mjs` wired on `Stop` (immediately before `token-awareness-stop-advisory` which reads it). `~/.claude/settings.json` change, outside the repo.
- Fixture updates `120_000`→`240_000` in `token-awareness-state.test.mjs` (3 fixtures) and `precompact-auto-trigger.test.mjs` (1 fixture) — fixtures must exceed the new 180s TTL to still be "stale." Assertions unchanged (legitimate fixture-corrections, not weakening).

**P1B-FIX — `5f53bb5b84` `[COMPACTION-OPTIMAL]/P1B-FIX`** (2 files on disk; commit attribution split)
- 3-of-3 arm C FAILed initial review on BLOCKER 1: P1b returned the sidecar with its FROZEN zone when stale — a frozen-at-GREEN sidecar would let the bar display "all good" indefinitely even after ctx grew past 95%. **Fix**: `readTokenAwarenessSidecar` now bumps `zone GREEN→YELLOW` when stale, mirroring `applyStaleness` doctrine. RED/CRITICAL never downgrade.
- BLOCKER 2 (180s TTL widens window where stale-but-trusted sidecar could miss a HARD threshold): documented per audit trade-off — bounded by `PostToolUse` refresh + the new Stop refresh + 95% native autocompact backstop.

## 3-of-3 scrutiny verdicts (session `5b1fef86-cc3d-44b7-b463-7ee50a77a0a5`)
- **Arm A (reviewer holistic)**: PASS — no BLOCKERs. Confirmed behavior preservation; thin wrappers preserve exact pre-refactor public API; equivalence oracle is genuine; TTL trade-off "documented + bounded by sidecar refresh on UserPromptSubmit + PostToolUse + now Stop (P2a)."
- **Arm B (reviewer test-integrity)**: PASS — no BLOCKERs. Confirmed fixture changes are LEGITIMATE corrections (assertions unchanged); backward compat clean; no tests skipped/deleted/weakened. P1 note (not blocking): no statusline unit test for the zone-bump rule (mirror-source `applyStaleness` IS tested).
- **Arm C (code-analyzer)**: original FAIL fixed by P1B-FIX (BLOCKER 1 mechanical; BLOCKER 2 documented). Arms A+B independently verified the fix on the latest state.

## Tests verified
- `transcript-token-counter.test.mjs` — 44/44 (30 original + 14 new).
- `token-awareness-state.test.mjs` — 46/46 (3 fixtures updated).
- `precompact-auto-trigger.test.mjs` — 14/14 (1 fixture updated).
- Hook smoke test: real-transcript pipe → exit 0 → fresh sidecar `ctx.tokens=505346 zone=GREEN`.
- Settings.json JSON-validated on C: and H:.

## Known follow-ups (P1/P2/P3, not blocking)
1. **No statusline unit test for the zone-bump rule** (arm B P1 note). Mirror-source `applyStaleness` is tested but the statusline ternary has no direct fail-on-revert. Cheapest fix: add a 2-line comment in statusline pointing to the canonical test as doctrine oracle.
2. **`compression-precompact.mjs` unwired from disk-only** — the file header is marked but the settings.json removal lives outside the repo. Golf (hygiene slot) should sweep this against any cron audit that flags unwired hooks.
3. **`estimateCtxFromBytes` in the sidecar duplicates the fd-open/close pattern** that `readTranscriptTail` now provides as a primitive (arm A note 4). Future DRY pass.
4. **`Object.keys(slotsObj)` ordering** — depends on JSON-file key insertion order (arm A note 2). Cosmetic-only; harmless because `chat-slots.mjs` writes keys in canonical SLOT_NAMES order.
5. **Equivalence oracle test uses full `deepEqual`** — if internal fields are added later, it'd false-fail (arm B note 2). Consider asserting on a stable subset.

## Doctrine + lessons
- **The audit recommendation "TTL 60→180s, kept equal across all 3 readers" survived 3-of-3 review.** Arm C flagged a tail risk for the precompact-trigger; arm A endorsed the trade-off; arm B PASSed. Conservative TTL is documented but kept at 180s — 60s had a worse failure mode (the byte-fallback's sanity-suppress silently disables HARD).
- **Single-read primitive pattern** for hooks that do multiple computations on the same large file: read once, pure variants compute. Halves-to-quarters the I/O. Mirror this in any other hook that does N reads of the same transcript tail.
- **The H8/peer-absorption hazard reappeared** ([[reference_h8_misattribution_2026_05_20]]): statusline bumpedZone code was staged + committed in `5f53bb5b84` but the change ended up in a peer's commit (`83a661d461 hotel BRIDGE-WIRING`) — `git add` window on the shared 16-chat tree. The CODE is correct + live in HEAD; only the commit ledger attribution is wrong. R12: verify with `grep` on HEAD, not commit-message.
- **`compression-precompact.mjs` was a "double-dead" hook**: (a) wrong event wired (looked for `input.prompt` on PreCompact which has none → no-op 100%), (b) output unconsumed. The audit caught (b); reading the code revealed (a). When unwiring a "no reader" hook, also check whether the hook itself functions — it may be deader than the audit thought.

## Cross-refs
- Audit subagent report (in-conversation, not on disk) — preserved in this memory.
- [[reference_token_awareness_ms0_2026_05_20]] — the original token-awareness system this audit fixed.
- [[reference_h8_misattribution_2026_05_20]] — peer-absorption pattern that hit the P1B-FIX commit ledger.
- [[feedback_settings_wiring_drift_2026_05_16]] — shared-settings hazard; relevant to P2a/P2c settings edits.
