# OLLAMA-VERIFIED-OFFLOAD/U-FILES-DIGEST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-VERIFIED-OFFLOAD]/U-FILES-DIGEST (slot:alpha): multi-source verified digest (consumer #9 chat-bus/handoff condense)

**Commit:** `b79ef2bb0164` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T13:06:07-05:00
**Tags:** ollama-verified-offload, u-files-digest, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-VERIFIED-OFFLOAD]/U-FILES-DIGEST (slot:alpha): multi-source verified digest (consumer #9 chat-bus/handoff condense)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-VERIFIED-OFFLOAD]/U-FILES-DIGEST (slot:alpha): multi-source verified digest (consumer #9 chat-bus/handoff condense)

Verified-offload queue consumer #9: the single-file 'digest @file' verb couldn't
condense the 92-unread chat-bus (many JSONL message files) or a multi-handoff set.
offloadFilesDigest(paths) reads N files (fail-soft: missing/unreadable SKIPPED, not
fatal), aggregates with labeled separators, bounds the total to maxChars (16000,
the offloadDigest input cap), and verified-digests the set on local Ollama
(nonEmptyText verifier). Fallback inherits offloadDigest's truncated-raw-aggregate
so the caller ALWAYS gets content even when Ollama is down. Returns the
verifiedOffload record +  (files actually read); NOTHING readable ->
{source:none, reason:no-readable-files} (R12, never a silent empty). CLI verb
.

Built on the keystone (scripts/lib/ollama-verified-offload.mjs) + offloadDigest --
model proposes, code verifies, fail-safe fallback. NOT a latency-critical per-prompt
hook (verified EXECUTION belongs in on-demand CLI / Stop paths, not a PreToolUse
that would block on the Ollama call -- the reason the read/nav advisories SUGGEST
rather than execute). Galaxy-agnostic, fleet-callable.

Tests 15/15 (+7: aggregate, fail-soft skip, @-tolerance, no-readable, ollama-down
fallback, maxChars bound, misuse guard) -- hermetic via injected readImpl+runImpl.
LIVE-PROVEN: digest-files on 2 real alpha handoffs -> source:ollama verified:true,
both sources listed, coherent digest.
```

## Files touched (3)
- scripts/ollama-offload.mjs      | 57 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/ollama-offload.test.mjs | 66 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 121 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b79ef2bb0164`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-VERIFIED-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._