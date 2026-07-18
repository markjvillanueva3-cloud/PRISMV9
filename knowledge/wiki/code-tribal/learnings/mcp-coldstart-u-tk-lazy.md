# MCP-COLDSTART/U-TK-LAZY — [MAIN-FORCE] [MCP-COLDSTART]/U-TK-LAZY: defer TribalKnowledgeEngine tip-load off the boot path

**Commit:** `71542be505e7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T21:12:14-05:00
**Tags:** mcp-coldstart, u-tk-lazy, auto-distilled

## Subject
[MAIN-FORCE] [MCP-COLDSTART]/U-TK-LAZY: defer TribalKnowledgeEngine tip-load off the boot path

## Body
```
[MAIN-FORCE] [MCP-COLDSTART]/U-TK-LAZY: defer TribalKnowledgeEngine tip-load off the boot path

The module-level singleton (export const tribalKnowledgeEngine = new ...) ran the
full tip load at construction: the instance field initializers read capturedTips
from disk (loadCapturedTips) and spread STATIC_TIPS + DOC_LEARNED_TIPS +
capturedTips (triggering the lazy static getters' categorize over ~12k tips), then
the constructor built a 12k-entry dedup hash set. All of this fired on every
mcp-server cold start, the instant any module imported the singleton.

Fix: make capturedTips + tips lazy getters (built on first access) + a lazy
ensureHashes() (built on first dedup check), and empty the constructor. The
rebuild-on-capture sites keep working via a tips setter; capturedTips mutation
(push/index) works because the getter returns the loaded array reference.

PROVEN behaviorally (TribalKnowledgeEngine.lazy.test.ts, 5/5): the
'constructs without throwing' test produces ZERO tip-load logs; the load
('Categorizing static tips (lazy init)... Loaded 4234... 7516 doc-learned')
only fires on the first stats()/search(), and ensureHashes ('Initialized content
hash set with 12341 entries') only on the first capture() -- with dedup correctly
rejecting a duplicate. Type-clean in this file (npx tsc --noEmit: 0 errors in
TribalKnowledgeEngine.ts).

NOTE (R12): the full mcp-server tsc build has a PRE-EXISTING ~18-error backlog
across other domains' dispatchers (knowledge/calc/data/dev/guard/infra) + 2
engine callers using wrong method names (LatheLoRA .query, ReasoningChainSharing
.captureKnowledge -> the engine has search/queryTribalNaturalLanguage / capture/
captureFromLLMReasoning). NOT introduced by this change (verified: this edit
touched only fields + isDuplicateContent, never any method); the runtime serves
from esbuild (build:fast) which is unaffected.
```

## Files touched (3)
- mcp-server/src/__tests__/TribalKnowledgeEngine.lazy.test.ts | 56 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/TribalKnowledgeEngine.ts             | 39 +++++++++++++++++++++++++++++++++------
- 2 files changed, 89 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrong method names (LatheLoRA .query, ReasoningChainSharing

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 71542be505e7`
- Milestone envelope: `mcp-server/data/milestones/MCP-COLDSTART.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._