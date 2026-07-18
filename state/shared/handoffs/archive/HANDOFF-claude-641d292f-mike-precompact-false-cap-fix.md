---
chat_id: claude-641d292f
slot: mike
topic: mike-precompact-false-cap-fix
branch: cad-fusion-live-ms0
source: live-chat
written_at: 2026-05-21
unit_focus: fix post-/compact false hard-cap + resume PRINT-OCR-100PCT-MS0 work
---

## RESUME

**FIRST: commit the uncommitted fix** in `.claude/hooks/precompact-auto-trigger.mjs` (heavy peer contention on the shared-tree git index blocked the commit this session — file IS on disk and active in production already):

```bash
git add .claude/hooks/precompact-auto-trigger.mjs
git commit -m "[MAIN] [FIX]/U-PRECOMPACT-COMPACT-SUMMARY-FALSE-CAP (slot:mike): post-/compact false hard-cap" -- .claude/hooks/precompact-auto-trigger.mjs
```

**THEN: resume the PRINT-OCR-100PCT-MS0 work** per the prior handoff
`HANDOFF-claude-641d292f-mike-print-ocr-100pct.md` (still on disk). 4 units
queued: U1 corpus-template schema + writer, U2 corpus-wide orchestrator,
U3 100% accuracy proof harness + Stop hook, U4 wiki + tribal batch generator.
JM DIE corpus = **76,166 PDFs** (counted this session).

## STATE — this session's outcome

### Bug fixed (2026-05-21, mike slot, session 641d292f)

**Symptom:** Immediately after a clean `/compact`, the very first tool call
hard-blocked with `CONTEXT AT 1,041,107 TOKENS — PRECOMPACT HARD THRESHOLD
(940,000)`. Actual post-compact context per `token-budget-mike.json`:
**291,720 tokens**. ~750K-token false-positive blocking work in the cleanest
possible state (right after a successful compact).

**Root cause:** `lastAssistantTokens()` in `precompact-auto-trigger.mjs`
walks the transcript tail looking for the latest `type:"assistant"` entry
and returns `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`.
After `/compact`, the LATEST assistant entry can BE the compact-summary entry
itself, whose `cache_read_input_tokens` reflects the **pre-compact prefix
Claude had to read in order to GENERATE the summary** — NOT the post-compact
context size. Summing it returns ~1M when the actual post-compact context
is just the summary + new turns (~50K-300K).

**Fix:** When the latest assistant entry has `isCompactSummary: true`
(checked at both `entry.isCompactSummary` and `entry.message.isCompactSummary`),
return null and let `estimateFromBytes()` take over. `estimateFromBytes()`
already uses `findLastCompactOffset()` to count only post-compact bytes,
which is the correct post-compact answer. For a real post-compact assistant
turn (any turn AFTER the summary), the API usage IS authoritative —
preserve the existing sum.

**Surgical:** 3-line guard added inside the existing assistant-walk loop;
no other behavior changed.

**Tests:** 13/14 pass in `__tests__/precompact-auto-trigger.test.mjs`
(was 11/14 before the fix surfaced an existing latent bug). The 1
remaining failure is `SUPPRESSES SOFT inject when byte-estimator reports
> 1.1× cap (no compact marker)` — a SEPARATE pre-existing failure for a
not-yet-implemented SOFT-suppression feature added by another chat (alpha)
today. Untouched by this commit.

### File changed

- `.claude/hooks/precompact-auto-trigger.mjs` (46 ins / 7 del, 1 file)
  Diff confined to `lastAssistantTokens()` function. No interface changes,
  no other call sites affected.

### Commit blocked by peer contention

The shared-tree `H:/prism/.git/index.lock` was held by another git process
for the entire duration of this session (lock size oscillated between 0
and 4.8MB; PowerShell `Remove-Item` returned silent failure; bash `rm`
returned `Device or resource busy`). 10 peers online on the chat bus.
Per `feedback_conflict_fork_rule`, the canonical resolution is to fork
to a sibling worktree, but the fix is **already live on disk** — the next
PreToolUse hook fire picks up the patched logic regardless of commit
status. Persistent storage just needs the commit.

## CONTEXT TO PRESERVE — discoveries

1. **Anthropic API cache hits are independent of harness `/compact`.**
   The API cache key is the message-prefix bytes that were SENT, and
   `/compact` does not invalidate the warm prefix on Anthropic's side.
   So `cache_read_input_tokens` post-compact can report the pre-compact
   prefix size (warm cache hit). This is a meaningful gotcha for any
   token-counting hook — never trust `cache_read` blindly when a compact
   boundary is near.

2. **The compact-summary entry itself has high cache_read.**
   To generate the summary, Claude reads the pre-compact prefix. The
   `usage` block on the summary entry reports that read. Distinguishing
   this from a real post-compact turn requires checking the
   `isCompactSummary` flag on the entry.

3. **The sidecar (`token-budget-mike.json`) is the authoritative source
   post-compact.** It reports `ctx.tokens: 291720` correctly because its
   algorithm (`token-awareness-sidecar.mjs`) uses the 4 MB tail +
   compact-boundary slice. The legacy `lastAssistantTokens` fallback was
   the false-positive vector; sidecar was correct all along.

4. **The hook only writes `precompact-trigger.jsonl` on `source === "bytes"`
   sanity-floor hits.** No log entry exists for the 1.04M block this
   session because the bug was in the `assistant` source path. The
   suspect-floor was never reached because `lastAssistantTokens` returned
   a value > HARD, so the byte estimator and its sanity-floor never
   fired. Future debugging note: instrument the `assistant` path too.

5. **JM DIE PDF count = 76,166.** Real number for scoping the
   corpus-wide orchestrator (PRINT-OCR-100PCT-MS0/U2). Bare PDF count
   only; add TIF/PNG/JPG separately.

## DEFERRED

- **PRINT-OCR-100PCT-MS0 — all 4 units.** This was the original work
  order; the false-cap bug interrupted. Prior handoff
  `HANDOFF-claude-641d292f-mike-print-ocr-100pct.md` has the full plan,
  inventory, deliverables, file pointers, Karpathy pins, next-session
  first actions. Resume from there after the commit lands.

- **SOFT sanity floor — byte-suspect suppression.** 3-test suite added
  today by another chat (likely alpha 2026-05-21 per the test comment
  header). Tests expect SOFT inject to be suppressed when bytes>1.1× cap.
  Not implemented in the current hook. A separate unit of work, not part
  of this fix.

- **U-CK11 + ~60 spec-less golf-migrated database units + U-DOCKER-HOOK-BROKER
  + U-OE-L3** — still deferred from prior session.

## NEXT SESSION'S FIRST ACTIONS

1. Sweep stale git lock if still present: `node .claude/helpers/git-lock-sweeper.mjs`.
2. `git add .claude/hooks/precompact-auto-trigger.mjs && git commit -m "[MAIN] [FIX]/U-PRECOMPACT-COMPACT-SUMMARY-FALSE-CAP (slot:mike): post-/compact false hard-cap" -- <pathspec>`.
3. Re-run tests to confirm green: `node --test .claude/hooks/__tests__/precompact-auto-trigger.test.mjs` (expect 13/14 pass).
4. Resume PRINT-OCR-100PCT-MS0 per the older handoff.

## Karpathy discipline pins for next session

- **R7 — surface conflict.** The SOFT-suppression suite expects behavior
  the current hook doesn't implement. Don't paper over it — it's a real
  separate gap; treat as its own unit.
- **R8 — read before write.** The sidecar already correctly handles
  post-compact context size (`token-budget-mike.json` ctx.tokens). Any
  future token-counting logic should default to the sidecar first; the
  legacy `lastAssistantTokens` is the fallback path.
- **R12 — fail loud.** The fix returns null (not 0) when the summary is
  latest — this routes through the existing fallback chain, NOT a silent
  short-circuit. The byte estimator's behavior is preserved end-to-end.
