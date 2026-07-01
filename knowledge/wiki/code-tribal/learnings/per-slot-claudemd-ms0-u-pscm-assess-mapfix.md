# PER-SLOT-CLAUDEMD-MS0/U-PSCM-ASSESS-MAPFIX — [MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-ASSESS-MAPFIX (slot:alpha): 34-galaxy CLAUDE.md assessment + canonical template; fix 2 slot-galaxy-map bugs

**Commit:** `e4032335517f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-13T10:35:35-05:00
**Tags:** per-slot-claudemd-ms0, u-pscm-assess-mapfix, auto-distilled

## Subject
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-ASSESS-MAPFIX (slot:alpha): 34-galaxy CLAUDE.md assessment + canonical template; fix 2 slot-galaxy-map bugs

## Body
```
[MAIN-FORCE] [PER-SLOT-CLAUDEMD-MS0]/U-PSCM-ASSESS-MAPFIX (slot:alpha): 34-galaxy CLAUDE.md assessment + canonical template; fix 2 slot-galaxy-map bugs

Phase A of the per-slot-domain-CLAUDE.md directive (use ultracode+ollama to deep-assess
how each slot's CLAUDE.md should be set up, then fine-tune + hard-enforce).

ASSESS (ultracode Workflow, 34 sonnet agents + opus synthesis, 4M tok):
 - state/shared/slot-claude-md-assessment/<galaxy>.md x34 (KEEP/DROP/ADD + ideal outline,
   verified-symbol discipline) + _TEMPLATE.md (canonical 14-section per-slot skeleton,
   target 80-160 ln vs the 530-ln monolith; slot->galaxy map; universal-core set;
   per-galaxy gap table 2 EXCELLENT/17 GOOD/15 PARTIAL; enforcement+loader recs).

MAP FIX (scripts/lib/slot-galaxy-map.mjs, the single-source consumed by 3 live hooks):
 - bravo/zebra/zulu: 'hermes-zebra' (NONEXISTENT dir) -> 'hermes-zulu' (verified real).
   The 3 Hermes-domain slots were silently getting ZERO galaxy-context injection.
 - papa OPEN CONFLICT resolved 'frontend-app' -> 'backend-helper': prior reason
   ('backend-helper not a real dir') is STALE (dir+CLAUDE.md exist); operator-canonical
   CHAT-SLOT-DOMAINS + 34-galaxy synthesis + feedback_papa_no_gates all concur.
 - test: corrected assertions to fixed intent + NEW invariant (every mapped galaxy has
   engines/<g>/CLAUDE.md -- the test that would have caught hermes-zebra). 6/6 pass.
 - VERIFIED live: 3 map-consuming hooks (slot-context-bundle-inject, ai-synergy-awareness,
   memory-index-precheck) all exit 0 post-edit (RUN, not just node --check -- the lesson).
```

## Files touched (38)
- scripts/lib/slot-galaxy-map.mjs                                |  30 +++++----
- scripts/lib/slot-galaxy-map.test.mjs                           |  29 +++++++--
- state/shared/slot-claude-md-assessment/_TEMPLATE.md            | 390 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/academy.md              | 195 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/agent-orchestration.md  | 253 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/ai-training.md          | 169 ++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/backend-helper.md       | 153 ++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/blueprint-vision.md     | 194 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/bug-hunting.md          | 157 +++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/slot-claude-md-assessment/business.md             | 205 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
_(+28 more)_

## Lessons surfaced in commit body
- lesson).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e4032335517f`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-CLAUDEMD-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._