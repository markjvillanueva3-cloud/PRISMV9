---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/jm-die-shop.md
source_filename: jm-die-shop.md
content_hash: fdf1464e50b0690cd10d374e8ba08099481741220f512b2c516500a1d4d8b5ce
mirror_ts: 2026-05-05T13:00:09.478Z
mirror_engine: ObsidianMemorySyncEngine
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

## Programs
- **Total**: 10,216 programs across 3 departments
- **CNC Lathe**: 5,076 .MIN files (Okuma OSP), 42 customer folders
- **Milling**: 1,082 files (Mastercam .mcx-8, STEP, DWG), 72 customer folders
- **Wire EDM**: 4,058 files (.MIN + Mastercam), 99 customer folders
- **Programs root**: `H:/prism/JM Die/`

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
