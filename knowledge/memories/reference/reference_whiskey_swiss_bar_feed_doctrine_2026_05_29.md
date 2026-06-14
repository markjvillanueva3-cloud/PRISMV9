---
name: reference-whiskey-swiss-bar-feed-doctrine-2026-05-29
description: Swiss-type / bar-feed / guide-bushing lathe process doctrine — guide-bushing stock prep, headstock-stroke zoning, multi-channel ($1/$2/$3) sync, bar-feed remnant logic, gang collision. The uncaptured Swiss content gap.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:11.055Z
aliases: reference_whiskey_swiss_bar_feed_doctrine_2026_05_29
---


Swiss-type turning is named in the lathe galaxy scope (`/swiss-program`, `/swiss-production` skills) but had **zero memory/tribal doctrine** — only a content-free auto-stub wiki. This captures the procedural doctrine (the largest lathe content gap per the 2026-05-29 mining audit).

**Guide bushing (GB):**
- GB machines support the cut close to the tool → enable high L/D slender work the boring-bar L/D rule would forbid on a chuck lathe; but require **extra stock** (the part length + guide-bushing engagement + remnant) and ground/precision bar stock (GB rides the OD — out-of-round/oversize bar binds or scores).
- Non-GB (sliding-headstock-only / "Swiss without GB") trades the slender-support advantage for less stock waste + tolerance of imperfect bar.

**Headstock-stroke zoning:** the part is machined in Z-zones bounded by the headstock stroke; long parts need re-grip/stroke sequencing. Z-zero shifts per stroke — a program that ignores stroke limits crashes the collet/GB.

**Multi-channel sync ($1/$2/$3):** main + back/sub spindle + gang tools run as parallel channels with `!`/`WAITxx`/`Q`-code sync (controller-specific: Citizen/Star/Tsugami). **Unsynced channels = gang collision** (two tools in the same Z at once). Sync codes are the #1 Swiss crash class — verify every wait barrier.

**Bar-feed remnant/changeover:** track bar length vs part+facing+cutoff+remnant; emit bar-change M-codes before remnant < min-chuck-grip. A miscounted remnant runs the last part short or crashes the bar-pull.

**Sub-spindle handoff:** pickup phase-sync ≤0.5° (same as chuck-lathe rule [[feedback_whiskey_subspindle_phase_tolerance]]) + cutoff-timing coordination across channels.

**Apply:** Swiss programs need channel-sync validation + stroke-zone + GB-stock checks that the chuck-lathe linter does not cover — a future Swiss-specific lint/validate extension. JM Die fleet is NOT Swiss (100% Okuma chuck/bar lathes LTH-01..07), so this is forward-looking doctrine for Swiss customers. Related: [[reference_whiskey_lathe_gsd_protocol_2026_05_29]] · galaxy `lathe/CLAUDE.md` §1 scope.
