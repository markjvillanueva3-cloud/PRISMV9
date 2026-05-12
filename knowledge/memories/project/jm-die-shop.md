---
name: JM Die Company — Canonical Test Shop
description: JM Die is the canonical test shop for all PRISM development. Cold heading die & tooling, fastener industry. 21 machines, 35,625 program-bearing files, 100+ customers.
type: project
originSessionId: b7710bad-cb98-48d7-b0e9-bf64961f1ecb
source: prism-memory
synced: 2026-04-27T00:20:43.129Z
updated: 2026-05-09
aliases: jm-die-shop
---

JM Die Company is the canonical test shop for the entire PRISM app and MCP server system.

**Why:** User's own company. All PRISM features must work against real JM Die data — not hypothetical shops.

**How to apply:** Use JM Die's machines, rates, customers, and programs as the default context for all development, testing, quoting, and demo scenarios. Never revert to generic defaults.

## Company Profile
- **Industry**: Cold heading die & tooling (fastener industry)
- **Specialty**: Punches, dies, cases, quills, electrodes for cold heading machines
- **Primary materials**: M2, D2, S7, A2 tool steels; tungsten carbide; cobalt carbide; H13; graphite (EDM electrodes)
- **Profile ID**: `"jm-die"` (ShopConfigurationEngine.DEFAULT_PROFILE_ID)

## Machines (21 total)
- **7 Okuma CNC Lathes**: GENOS L300-M, GENOS L200E-M, LNC8, Crown L1060, GENOS L400II-E, LB 3000EX Big Bore, Multus B250II
- **5 Mills**: Hurco VM30i, Okuma M460V-5AX, Haas VF-2, Haas OM-2, Roku-Roku HC 658-II
- **2 Sinker EDMs**: Mitsubishi EA12S, EA12D
- **1 Wire EDM**: Mitsubishi FA10S
- **6 Support**: Surface Grinder, Band Saw, Manual Lathe, Manual Mill, CMM, Optical Comparator

## Programs (rebuilt 2026-05-09 — supersedes earlier 10,216 estimate)
- **Total program-bearing**: **35,625** (20,081 G-code on disk + 15,544 CAM-project files with embedded toolpath)
- **CNC Lathe folder**: 19,803 (mostly Mazak/Okuma `.min` G-code, line 1 = `$<INTERNAL>%`)
- **Okuma standalone**: 6,092
- **Wire EDM**: 4,000 (mix of `.min` + Mastercam)
- **Matthew programs** (Mastercam `.mcx-8`/`.mcx`): 2,320
- **JM Die general**: 2,172
- **Haas-Hurco mill**: 1,820
- **Roku-Roku** (`.cyc` cycle programs): 1,102
- **Mill Haas standalone**: 533
- **Okuma Multus** (mill-turn): 13
- **Programs root**: `H:/PRISM/JM DIE/`
- **Authoritative index**: `H:/PRISM/Docustrata/.index/jm-die-index-v2.json`
- **Per-controller save practice** — see [[jm-die-program-catalog]]: Mastercam (`.mcx*`)/Inventor (`.ipt`/`.iam`)/Fusion (`.f3d`)/SolidWorks embed toolpath in CAD; G-code goes to USB and is NOT retained on disk. Mazak/Okuma/Roku-Roku/Hurco DO save posted G-code.

## Rates
- Labor: $55/hr, Overhead: $30/hr, Setup: $65/hr
- Programming: $85/hr, Inspection: $55/hr, Admin: $15/hr
- Overhead: 18%, Material markup: 15%, Admin burden: 12%

## Top Customers
Fontana, ATF, Agrati, Arconic, Akko, CSM, Brico, Ejot, Archer, Anderson,
ITW Shakeproof, Anixter-Optimas, Holo-Krome, OMG, Grandeur

## Key Files
- Profile JSON: `mcp-server/data/shop/jm-die-profile.json`
- Customer DB: `mcp-server/data/shop/jm-die-customers.json`
- Engine: `mcp-server/src/engines/ShopConfigurationEngine.ts`
- Tests: `mcp-server/src/__tests__/shop-configuration-engine.test.ts`


## Related
[[engines/ShopConfigurationEngine|ShopConfigurationEngine]] • [[skills/prism|/prism]] • [[skills/hr|/hr]] • [[skills/data|/data]] • [[skills/shop|/shop]] • [[skills/jm-die-profile|/jm-die-profile]] • [[skills/jm-die-customers|/jm-die-customers]] • [[skills/src|/src]] • [[skills/engines|/engines]] • [[skills/shop-configuration-engine|/shop-configuration-engine]]