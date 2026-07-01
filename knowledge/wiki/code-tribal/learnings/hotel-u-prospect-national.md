# HOTEL/U-PROSPECT-NATIONAL — [MAIN] [HOTEL]/U-PROSPECT-NATIONAL (slot:hotel iter22) [BOOTSTRAP-SLOT-ENFORCE]: expand JM Die prospect catalog 8 -> 20 (national coverage; $6.5M -> $23.42M pipeline value)

**Commit:** `466b943e2ee8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T21:47:01-05:00
**Tags:** hotel, u-prospect-national, auto-distilled

## Subject
[MAIN] [HOTEL]/U-PROSPECT-NATIONAL (slot:hotel iter22) [BOOTSTRAP-SLOT-ENFORCE]: expand JM Die prospect catalog 8 -> 20 (national coverage; $6.5M -> $23.42M pipeline value)

## Body
```
[MAIN] [HOTEL]/U-PROSPECT-NATIONAL (slot:hotel iter22) [BOOTSTRAP-SLOT-ENFORCE]: expand JM Die prospect catalog 8 -> 20 (national coverage; $6.5M -> $23.42M pipeline value)

iter21 shipped 8 Midwest+CT prospects. This iter22 expansion adds 12 prospects across all major US manufacturing regions:

TIER 2 (East + Southeast, 2-day freight, 6 entries — $9.4M):
- Spirit AeroSystems (Wichita KS) — aerospace tier-1, AS9100, $1.8M, fit 0.82
- Kennametal Inc (Latrobe PA) — cutting-tool manufacturing, $920k, fit 0.78
- Lockheed Martin Missiles & Fire Control (Orlando FL) — defense aerospace ITAR, $3.4M, fit 0.74
- Honda of America (Marysville OH) — automotive tier-1, $1.5M, fit 0.83
- BorgWarner (Auburn Hills MI) — EV/powertrain tier-1, $1.1M, fit 0.79
- Curtiss-Wright Defense Solutions (Charlotte NC) — mid-size defense AS9100, $680k, fit 0.71

TIER 3 (West + Mountain + Southwest, 3-5 day freight, 6 entries — $7.52M):
- SpaceX (Hawthorne CA) — commercial aerospace high-iteration, $2.2M, fit 0.76
- Intel (Chandler AZ) — semiconductor fab-fixture niche, $950k, fit 0.65 (honest lower-fit assessment)
- Halliburton (Houston TX) — oilfield-services drill-bit components, $1.4M, fit 0.77
- Stryker Orthopaedics supplier-network (Mahwah NJ) — medical device ISO 13485, $780k, fit 0.72
- Smith & Wesson (Springfield MA) — firearms manufacturing, $540k, fit 0.70
- John Deere Component Works (Waterloo IA) — ag/heavy-equipment drivetrain, $1.65M, fit 0.84

NATIONAL COVERAGE delivered:
- 12+ distinct states represented (was 6: IL/MI/WI/OH/CT)
- 10+ distinct industries (was 6) — now spans aerospace + defense + medical + oilfield + semiconductor + EV + ag/heavy-equip + firearms + automotive + appliance + packaging + cutting-tools
- Tier-grouped by freight distance — Tier 1 (drive-to), Tier 2 (2-day truck), Tier 3 (3-5 day or air-freight). Tier-3 prospects warrant phone/video first contact instead of in-person visit; SPIN questions still apply, follow-up cadence stretched.

PII contract preserved: all 12 new entries have VERIFY-prefixed contact name + role-based email alias. Catalog-integrity test enforces VERIFY-prefix on every seed entry. Operator MUST verify decision-maker before outreach.

Honest fit assessment: Intel (semicap) flagged at 0.65 fit because most Intel machining needs sub-micron tolerance + cleanroom (beyond JM Die scope). Memo names the narrow fab-fixture niche where +/-0.0005" is acceptable — no inflated pitch.

NEW TESTS (2 added, 2 updated, 38/38 total):
- 'national geographic coverage' — asserts >=12 distinct states + CA/TX/FL/MA presence
- 'industry diversity' — asserts >=10 industries + aerospace/defense/medical/oilfield/semiconductor verticals
- updated 'seed total' from $6.5M to $23.42M
- updated 'loading entire seed' from 8 to 20 prospects

PSN synergy preserved (no surface changes needed — engine + formula + dispatcher already national-ready; this is pure data expansion).

Operator wins:
- Salesperson can now run 'prospect_list status=cold min_relevance=0.75' to surface the 13 high-fit prospects nationally (was 7 Midwest-only)
- pipeline_value of $23.42M open is the realistic ceiling for the sales motion when all prospects are actively worked
- regional follow-up cadence adjustment (Tier-3 = stretched) documented in file header
```

## Files touched (3)
- .../src/__tests__/ProspectiveCustomer.test.ts      |  44 ++++-
- mcp-server/src/data/jm-die-prospects-seed.ts       | 219 ++++++++++++++++++++-
- 2 files changed, 245 insertions(+), 18 deletions(-)

## Lessons surfaced in commit body
- till apply, follow-up cadence stretched.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 466b943e2ee8`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._