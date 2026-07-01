# COMMAND-KERNEL-MS0/U-CK06 — [MAIN] [COMMAND-KERNEL-MS0]/U-CK06: canonical command frontmatter schema (wiki form) + U-VAULT04 reconciliation

**Commit:** `790ec17f25c8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T04:44:45-05:00
**Tags:** command-kernel-ms0, u-ck06, auto-distilled

## Subject
[MAIN] [COMMAND-KERNEL-MS0]/U-CK06: canonical command frontmatter schema (wiki form) + U-VAULT04 reconciliation

## Body
```
[MAIN] [COMMAND-KERNEL-MS0]/U-CK06: canonical command frontmatter schema (wiki form) + U-VAULT04 reconciliation

Both wiki/os/ docs for U-CK06:
 - knowledge/wiki/os/_command-schema.md — narrative form of the canonical
   command frontmatter schema. SUPERSET of U-SKU06; the machine-readable
   JSON Schema source-of-truth at .claude/schemas/command-frontmatter.schema.json
   is the $id-bearing canonical artifact (already shipped); this doc is its
   wiki-namespaced explanation with field semantics + fully-populated
   example.
 - knowledge/wiki/os/_command-schema-reconciliation.md — pins the U-VAULT04
   absorption decision: skill-frontmatter is the SINGLE registry. The
   per-skill `trigger.autoSuggest` + `consumes` (with wiki/* items) +
   `trigger.events` + `pipeline_integrations[]` fields collectively
   absorb U-VAULT04's planned cross-trigger-registry.json. No separate
   registry file is built.

Schema highlights (kernel ABI):
 - Required: name + description only (backward-compat by design;
   baseline 33/167 skills already valid).
 - Composition primitive (new — SUPERSET of U-SKU06): consumes / produces
   / composes_with / pipeline_integrations.
 - Trigger registry unified: trigger.autoSuggest absorbs autosuggest
   keywords; consumes:[wiki/*] absorbs wiki-entry pairing; trigger.events
   absorbs hook-event declarations.
 - Tier T0-T5, model auto/opus/sonnet/haiku, effort low..max, context
   minimal..max — runtime budget hints for the harness.

Migration path documented for legacy skills (name+description only);
U-CK08 corpus migration progressively enriches.

Mirror-gen impact (U-CK05) noted: only SLASH_COMMAND_REGISTRY.json would
become a mirror of these frontmatters when U-CK05 lands. chat-slots.json +
atomic-roadmap.json stay as live-runtime state (U-CK05 fleet-impact
concern carried forward).

Files:
 - knowledge/wiki/os/_command-schema.md (new)
 - knowledge/wiki/os/_command-schema-reconciliation.md (new)

Strictly additive. JSON schema (canonical) untouched. Closes U-CK06's
two-deliverable spec.
```

## Files touched (3)
- .../wiki/os/_command-schema-reconciliation.md      | 116 +++++++++++++++
- knowledge/wiki/os/_command-schema.md               | 158 +++++++++++++++++++++
- 2 files changed, 274 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 790ec17f25c8`
- Milestone envelope: `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._