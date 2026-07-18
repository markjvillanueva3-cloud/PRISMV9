# BLACKWELL-MODEL-UPGRADE/U-BW-DISPATCHER-SCAN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-DISPATCHER-SCAN (slot:charlie): prism_ai cascade defaults pointed at RETIRED un-pulled models — fix + close the source-lock blind spot

**Commit:** `e32e1e455cd1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T04:17:41-05:00
**Tags:** blackwell-model-upgrade, u-bw-dispatcher-scan, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-DISPATCHER-SCAN (slot:charlie): prism_ai cascade defaults pointed at RETIRED un-pulled models — fix + close the source-lock blind spot

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-DISPATCHER-SCAN (slot:charlie): prism_ai cascade defaults pointed at RETIRED un-pulled models — fix + close the source-lock blind spot

ROOT CAUSE (synergy /goal "correct models relative to gpu"): aiReasoningDispatcher's
two_pass_cascade + cascade_run actions defaulted to the qwen2.5-coder :3b/:7b/:14b
small-GPU roster that U-BW-RESEARCH-REFINE (2026-06-04) RETIRED. On the 96GB RTX PRO
6000 Blackwell those tags are NOT pulled (live /api/tags: only 1.5b + 32b coder, plus
gpt-oss:20b/120b + VLMs + nomic). So every cascade default requested a missing model
and silently failed — a plausible contributor to the chronic <30% offload take-rate.

WHY IT SURVIVED the U-BW sweep: the anti-revert source-lock (scripts/no-retired-llm-refs.
test.mjs) scanned scripts + .claude/{hooks,helpers,scripts} + mcp-server/src/engines, but
NOT mcp-server/src/tools/dispatchers. The dispatcher tree was the one executable surface
the lock never saw. The cascade actions bypass ModelRoutingEngine (they call
OllamaClientEngine.generate directly), so the catalog's pure-scorer install-gate never
covered them either.

FIX (2 files):
1. aiReasoningDispatcher.ts — repoint the 5 cascade defaults to INSTALLED Blackwell tiers:
   two_pass  cheap qwen2.5-coder:1.5b / strong qwen2.5-coder:32b
   cascade   cheap qwen2.5-coder:1.5b / mid gpt-oss:20b / strong qwen2.5-coder:32b
   (per-tier PRISM_TWOPASS_*/PRISM_CASCADE_* env overrides unchanged.)
2. no-retired-llm-refs.test.mjs — add mcp-server/src/tools/dispatchers to SCAN_DIRS so the
   source-lock permanently polices EVERY dispatcher, not just this one. Reused the canonical
   guard (executable-position discrimination, comment-strip, >50-file sanity floor) rather
   than forking a weaker standalone test (R8 dedup; india's stale-snapshot warning,
   reference_model_retired_test_stale_2026_06_08).

VALIDATE (live, R15-step-3): GPU = RTX PRO 6000 Blackwell 97887MiB; new defaults
qwen2.5-coder:1.5b + gpt-oss:20b + qwen2.5-coder:32b all present in /api/tags; retired
:3b/:7b/:14b confirmed absent. Guard 3/3 green with dispatcher tree in scope; build:fast OK.

Verify: node --test scripts/no-retired-llm-refs.test.mjs
```

## Files touched (3)
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts | 23 ++++++++++++++++++-----
- scripts/no-retired-llm-refs.test.mjs                      |  8 ++++++++
- 2 files changed, 26 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e32e1e455cd1`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._