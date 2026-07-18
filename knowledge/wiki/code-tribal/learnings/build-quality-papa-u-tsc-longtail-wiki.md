# BUILD-QUALITY-PAPA/U-TSC-LONGTAIL-WIKI — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-LONGTAIL-WIKI (slot:papa): code-tribal lesson -- long-tail tsc errors are stub/vestigial/contract SYMPTOMS, not type bugs

**Commit:** `c13d22ba4303` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T09:29:45-05:00
**Tags:** build-quality-papa, u-tsc-longtail-wiki, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-LONGTAIL-WIKI (slot:papa): code-tribal lesson -- long-tail tsc errors are stub/vestigial/contract SYMPTOMS, not type bugs

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-TSC-LONGTAIL-WIKI (slot:papa): code-tribal lesson -- long-tail tsc errors are stub/vestigial/contract SYMPTOMS, not type bugs

Closes the bug-finding->wiki gate for this papa session's findings (authHttp STUB regression + ReasoningChainSharing:662 VESTIGIAL EventBus sub). Captures the generalizable lesson: past ~90% of a tsc campaign, a "missing property"/type-mismatch is usually a symptom of a stub/vestigial-integration/contract-decision, not a type bug -- band-aiding it to green masks the real problem (R12 "green count hiding a deeper problem is a lie").

Includes the 6-error worked table from baseline tsc 89->87 this session: 2 genuinely-clean producer-type reconciliations SHIPPED (RoadmapIntelligence category, JMDie spindle-narrow cast), 4 deferred-with-root-cause (authHttp stub/security feature build, ReasoningChainSharing vestigial, python-api + AutomatedResourceHarvesting contract decisions). Rule: when clean reconciliations are exhausted, route remaining to owners with root cause named + re-gate; never fabricate green. Doc-only (markdown, no build/test gate).
```

## Files touched (2)
- .../wiki/code-tribal/learnings/papa-tsc-longtail-stub-vestigial-symptoms.md | 55 +++++++++++++++++++++++++++++++++++++
- 1 file changed, 55 insertions(+)

## Lessons surfaced in commit body
- lesson -- long-tail tsc errors are stub/vestigial/contract SYMPTOMS, not type bugs
- lesson: past ~90% of a tsc campaign, a "missing property"/type-mismatch is usually a symptom of a stub/vestigial-integration/contract-decision, not a type bug -- band-aiding it to green masks the real problem (R12 "green count hiding a deeper problem is a lie").

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c13d22ba4303`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._