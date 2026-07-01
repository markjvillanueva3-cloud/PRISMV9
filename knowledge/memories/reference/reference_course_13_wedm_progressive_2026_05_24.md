---
name: reference-course-13-wedm-progressive-2026-05-24
description: "course-13 Wire EDM Entry→Master shipped on slot/lima — fills the WEDM gap (mill=c4, lathe=c5, wedm=c13). Iter11-15 expansion arc."
aliases: reference_course_13_wedm_progressive_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.532Z
---


# course-13 Wire EDM Progressive — 2026-05-24 lima /loop iter15

`/checkin-lima /goal [ expand prism academy training and functionality, focus on mill, lathe and wire edm. start from entry level and eventually finish with the most complex type of work for each domain. give detailed explanations and examples and interactive training. make it more interactive for the user so learning is enhanced | completed and wired to all viable nodes + synergized PSN, commit to Lima worktree ] /loop [5m] /goal`

## What shipped this session (5 commits on slot/lima, iter11-15)

| Iter | SHA | Scope |
|------|-----|-------|
| 11 | `9e05c90d1f` | course-0a mod7 algebra + mod8 trig calculator blocks (foundations) |
| 12 | `1221344f32` | course-3 mod3 G83 peck + course-4 mod6 HSM chip-thinning + course-5 mod5 threading feed+minor-dia calculators |
| 13 | `78324f0306` | Full ContentType primitive activation — web renderer extended `text\|calculator` → all 7 types. CurriculumEngine.LessonContent gained `videoPosterUrl` + `modelUrl`. Data: course-0b sandbox+video, course-0c annotated_diagram, course-7/9/11 generator propagation |
| 14 | `cad7178f44` | `CurriculumEngine.test.ts` — 22 it() cases ALL PASS — clears `stop_on_unwired_assets` blocker after iter13 schema additions |
| 15 | `6da642d370` | **NEW course-13 Wire EDM Entry→Master** — 5-module progressive course filling WEDM gap |

## course-13 details

Files:
- `mcp-server/src/data/academy/course-13-wire-edm-progressive.ts` (NEW, 445 lines, exports `COURSE_13_MODULES`)
- `mcp-server/src/engines/CurriculumEngine.ts` (added import + `RICH_MODULES["course-13"]` + courseDefinitions entry as intermediate-level, prereq=course-1)

5 modules entry→master:
- **M1 Foundations** — when WEDM beats mill/turn, physics primer, dielectric, kerf-vs-gap. Kunieda CIRP 2005 + Sommer 2010.
- **M2 Basic Programming** — first program, ISO G-code G41/G42 kerf offset, lead-in/out, start holes. + kerf calculator. ISO 6983-1:2009 + Sodick AQ327L manual.
- **M3 4-Axis Taper** — G51/G50, U/V upper-guide, conic transitions. + U-offset calculator. Mitsubishi MV1200S 2022 + ISO 6983-2:2017.
- **M4 Multi-Pass Strategy** — rough/skim/finish economics, recast layer, decision matrix per application. + cycle-time calculator. Sommer ch.7 + ISO 4287 + VDI 3400.
- **M5 Master Work** — sub-100µm tungsten wire, PCD/carbide WEDM, lights-out via glue stops. Hitachi 2024 + Sommer ch.11.

## Why this matters

Before iter15 the academy had:
- `course-4 Milling Operations` (mill domain)
- `course-5 Turning Operations` (lathe domain)
- **NO dedicated wire-EDM progressive course** — WEDM only appeared as scattered tribal tips in course-6 CAM-vendor modules

After iter15, the three core machining domains have parity:
- mill = course-4 + course-8 (5-axis for most-complex work)
- lathe = course-5 (Swiss-type mod10 for most-complex work)
- WEDM = course-13 (M5 for most-complex work — micro-features + PCD/carbide + lights-out)

## Coverage delta from iter11 baseline

| Metric | Before (iter10 close) | After (iter15) |
|---|---|---|
| Courses with interactive blocks | 1 (course-2) | 6 (0a, 0b, 0c, 1, 2, 3, 4, 5 + 13) |
| Active ContentType primitives | 1 (calculator) | 4 (calculator + diagram + sandbox + video) |
| Web renderer LessonSectionType | `text\|calculator` only | all 7 types |
| WEDM dedicated course modules | 0 | 5 |
| Calculator blocks total | 2 | ~30+ (incl. 22 templated via course-7/9/11 generators + 4 in course-13) |

## PSN synergy (this work's 11-leg surface)

- **Obsidian brain** ✓ — this memory file, auto-fed by Stop hook
- **PRISM-OS** ✓ — course-13 in `RICH_MODULES` + `courseDefinitions`, discoverable via `prism_operating_system`
- **Wiki** ✓ — [[prism-academy-mobile-ms0]] §"2026-05-24 session"
- **Memories** ✓ — this file
- **Tribal** ✓ — every Wire EDM claim cites source + clause/page (Lima soul)
- **System-Viz** ⊝ — course-13 nodes will appear next regen
- **Engines** ✓ — CurriculumEngine + WireEDMSpeedFeedEngine + SpeedFeedOrchestratorEngine wired in calculator blocks
- **Algorithms** n/a — curriculum data layer
- **Formulas** ✓ — `wedm_kerf` + `wedm_taper_u_offset` + `wedm_cycle_time` declared as keyFormulas
- **NN-GNN** n/a — curriculum data
- **PRISM-AI** ✓ — course-13 will surface via `prismSelfAwarenessEngine.recommendAIFeatures("wire EDM")` after next manifest refresh

## Related

- [[reference_lima_5_22_to_5_23_2026]] — predecessor session ledger
- [[reference_lima_psn_synergy_2026_05_23]] — first PSN walk for lima
- [[feedback_juliett_12chat_allocation_2026_05_17]] — lima = prism-academy-specialist
- [[prism-academy-mobile-ms0]] — wiki entry, §"2026-05-24 session" has iter11-15 detail
