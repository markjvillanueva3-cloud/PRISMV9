---
name: reference_echo_post_data_corpus_paths
description: "On-disk post-processor data corpus — instant pathways to NC programs, .cps posts, controller/dialect DATA files, and CAD/CAM inputs. Enumerated 2026-05-29 (find scans take ~150s — read this instead of re-scanning)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.562Z
aliases: reference_echo_post_data_corpus_paths
---


slot:echo enumerated the full post-processor data corpus on `H:/prism` (live `find`, excl node_modules/.git/worktrees, 2026-05-29). Wired into galaxy `mcp-server/src/engines/post-processor/PATHS.md` §"Domain data corpus" (commit 78ea97b7c9). **Read this before re-scanning — the finds take ~150s.**

## NC output programs — 160,582 (.nc/.min/.eia/.tap/.ngc/.pgm)
- `mcp-server/data/programs/okuma/` (= `data/programs/okuma/` mirror) — 2,734 each, generated Okuma set
- `JM DIE/CNC LATHE/<customer>/PRISM_UPGRADED/Okuma_<machine>/` — per-customer×machine: OMG 2,723/machine ×7 machines (Multus_B250II, LNC8, LB-3000EX[_II/-BigBore], GENOS_L300-M/L200E-M); NATHANS USB 1,754; FONTANA 933
- bulk = Okuma lathe (whiskey-adjacent); mill NC under `JM DIE/CNC MILL` + `BOX`

## Post definitions — 13,790 `.cps` + 52 Mastercam `.pst/.spm`
- `mcp-server/data/posts/fusion-cache/` (= `data/posts/fusion-cache/`) — 464 cached Fusion
- `resources/FUSION BASIC POSTS/` · `BOX/FUSION BASIC POSTS/` · `mcp-server/data/posts/box-basic/` — 180 each
- `resources/HSMWorks 2026/posts/` · `HSMWorks 2027/posts/` — 100 each
- `JM DIE/PRISM MODIFIED POST PROCESSORS/` — 12 JM production .cps (Haas/Hurco/Okuma/Fanuc; wire-EDM absent)

## Controller / dialect / post DATA (machine-readable, never inline) — 14 files in `mcp-server/src/data/`
- `okuma-dialect-knowledge.ts` (ONLY per-vendor dialect .ts — **`controller-dialects/<vendor>.ts` does NOT exist**; corrected a stale PATHS claim)
- `controller-knowledge.json` · `controller-knowledge-tips.ts` · `controller-alarm-database.json`
- `fusion-post-strategies.json` · `cimco-post-strategies.json` · `hypermill-post-configs.json` · `machine-post-enriched.ts`
- `machine-kinematics-catalog.ts` · `machine-kinematics-enriched.ts` (**NOT** `machine-kinematics.ts` — absent)
- `post-feature-parity/mill-post-feature-parity.ts` · `tribal-tips/post-pdf-cited-tips.ts`

## CAD/CAM source inputs (toolpath sources echo posts)
- counts: `.ipt` 10,720 · `.step` 2,608 · `.f3d` 1,739 · `.sldprt` 529 · `.stl` 458 · `.stp` 271 · `.igs` 27 · `.iges` 2
- FULL 129K CAD corpus = delta's domain → [[cad-corpus-paths]] (don't re-enumerate). CAM seats: Mastercam X8, hyperMILL v31 (NOT v33), Fusion/HSMWorks.

## Post-gen INPUT databases (wired into PATHS §Machine/Controller/Alarm databases, 2026-05-29)
The 7 stores post-gen consumes (route by machine → emit by controller → validate vs alarms; tool/holder/fixture geometry + toolpath motion): **Machines 824** (`src/registries/MachineRegistry.ts` + MachineConfig/Handbook/Option/Rate engines + ShopConfigurationEngine 21 JM) · **Controllers ~30** (`controller-knowledge.json` + okuma-dialect + CONTROLLER_PROFILES 14) · **Alarms 2,588/13ctrl** (`controller-alarm-database.json` — alarm-aware post-gen UNDERUSED, not in P5) · **Tools 41,495/32cat** (`*-tools-extracted.json`: osg 11550, iscar 5449, guhring 3421…) · **Holders 1,889/5** (`*holder*-extracted.json`: big-daishowa 1208, haimer 489) · **Fixtures** (Monolith{Fixture,Workholding,HyperMillFixture}DatabaseEngine + 12 Fixture*) · **Tool paths** (kilo CAM engines → ToolpathBlock → pipeline P2; 160,582 NC corpus). juliett owns the stores; echo consumes (bidirectional bridge in database-expansion/MEMORY.md).

See [[reference_echo_nc_dialect_lint]] (the linter that consumes NC) · [[reference_echo_post_gen_coverage_audit]] · galaxy PATHS.md.
