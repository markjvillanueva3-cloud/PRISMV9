# DOMAIN-KNOWLEDGE/U-PAPA-DISTILL-KEEPALIVE-TESTS — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DISTILL-KEEPALIVE-TESTS (slot:papa): close the R9 gap on U-PAPA-DISTILL-KEEPALIVE -- add the in-call retry-success test (2 transient VRAM-evict failures -> 3rd call succeeds, calls==3) + the keep_alive-in-request-body assertion, and inject no-op sleepImpl into the retry-exhaustion + raw-fallback tests so they stay fast. Covers the in-call retry path the loop's cross-pass cursor tests don't. Tests green.

**Commit:** `3ef41e650692` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T22:32:39-05:00
**Tags:** domain-knowledge, u-papa-distill-keepalive-tests, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DISTILL-KEEPALIVE-TESTS (slot:papa): close the R9 gap on U-PAPA-DISTILL-KEEPALIVE -- add the in-call retry-success test (2 transient VRAM-evict failures -> 3rd call succeeds, calls==3) + the keep_alive-in-request-body assertion, and inject no-op sleepImpl into the retry-exhaustion + raw-fallback tests so they stay fast. Covers the in-call retry path the loop's cross-pass cursor tests don't. Tests green.

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-DISTILL-KEEPALIVE-TESTS (slot:papa): close the R9 gap on U-PAPA-DISTILL-KEEPALIVE -- add the in-call retry-success test (2 transient VRAM-evict failures -> 3rd call succeeds, calls==3) + the keep_alive-in-request-body assertion, and inject no-op sleepImpl into the retry-exhaustion + raw-fallback tests so they stay fast. Covers the in-call retry path the loop's cross-pass cursor tests don't. Tests green.
```

## Files touched (2)
- scripts/domain-corpus-to-lora-dataset.test.mjs | 23 +++++++++++++++++++++--
- 1 file changed, 21 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TILL-KEEPALIVE-TESTS (slot:papa): close the R9 gap on U-PAPA-DISTILL-KEEPALIVE -- add the in-call retry-success test (2 transient VRAM-evict failures -> 3rd call succeeds, calls==3) + the keep_alive-in-request-body assertion, and inject no-op sleepImpl into the retry-exhaustion + raw-fallback tests so they stay fast. Covers the in-call retry path the loop's cross-pass cursor tests don't. Tests green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3ef41e650692`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._