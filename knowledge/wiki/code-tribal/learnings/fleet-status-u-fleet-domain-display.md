# FLEET-STATUS/U-FLEET-DOMAIN-DISPLAY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-STATUS]/U-FLEET-DOMAIN-DISPLAY (slot:alpha): surface per-slot domain specialization in fleet-status dashboard.

**Commit:** `cbae0793a49f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T21:32:29-05:00
**Tags:** fleet-status, u-fleet-domain-display, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-STATUS]/U-FLEET-DOMAIN-DISPLAY (slot:alpha): surface per-slot domain specialization in fleet-status dashboard.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-STATUS]/U-FLEET-DOMAIN-DISPLAY (slot:alpha): surface per-slot domain specialization in fleet-status dashboard.

Operator ask: 'update the chat fleet domains read, fleet-status.md to see what each chat specialization is'.

Added 3 new exports (pure, cached):
- readSlotSoul(slot) — parses YAML frontmatter from state/shared/slot-souls/<slot>.md, returns flat KV (role, voice, tone, domain_filter, hermes_role). Memoized; graceful-null on missing/unparseable.
- domainOf(slot) — convenience returning soul.role string (e.g. 'mill-specialist', 'lathe-specialist', 'wire-edm-specialist').
- domainFilterOf(slot) — soul.domain_filter (e.g. 'mill|milling|cutting-force|...').

Boxed render now shows a 4th line per slot:
  | domain: <role> (<domain_filter truncated to 38 chars>)
Renders for ALL slots — claimed AND idle — so the dashboard answers 'which chat does what?' without separate queries. domain:any (golf full-stack) renders just the role.

JSON output (--json) augments each slot with {role, domain, domain_filter} so machine consumers can route work to the correct specialist without re-importing chat-slots.mjs.

Live verification: 13+ NATO slots render domains correctly (alpha=mill, bravo=mill (per shared-domain note), charlie=wire-edm, delta=cad, echo=cam, foxtrot=tribal-knowledge, golf=work, hotel=erp, india=post-processor, juliett=speed-feed, kilo=print-to-program, lima=academy, mike=misc, whiskey=lathe per operator codification).

Source of truth: state/shared/slot-souls/<slot>.md frontmatter (already maintained for slot-soul-inject hook). Soul files unchanged by this commit — just newly surfaced.
```

## Files touched (2)
- scripts/fleet-status.mjs | 72 +++++++++++++++++++++++++++++++++++++++++++++++-
- 1 file changed, 71 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cbae0793a49f`
- Milestone envelope: `mcp-server/data/milestones/FLEET-STATUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._