---
type: "chat-session"
source: "claude-code-cli"
session_id: "f7b0f940-61e9-4d5b-812e-205ca34b8a84"
title: "You assess BACKEND readiness for FULL-COMBINATION SFC (speed-feed) parity testin"
date: "2026-05-29"
first_ts: "2026-05-29T17:41:57.556Z"
last_ts: "2026-05-29T17:47:15.345Z"
cwd: "H:\\prism-slot-oscar"
messages: 51
user_msgs: 20
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/workflows/wf_988683dd-db8/agent-a6a1d7480d6191ee7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:04"
---

# You assess BACKEND readiness for FULL-COMBINATION SFC (speed-feed) parity testin

> **claude-code-cli** | 2026-05-29 | 51 msgs (20 user / 31 assistant) | cwd: H:\prism-slot-oscar
> Raw: `H:/.claude/projects/H--prism-slot-oscar/f7b0f940-61e9-4d5b-812e-205ca34b8a84/subagents/workflows/wf_988683dd-db8/agent-a6a1d7480d6191ee7.jsonl`

## Transcript

### User | 2026-05-29T17:41:57.556Z

You assess BACKEND readiness for FULL-COMBINATION SFC (speed-feed) parity testing: running PRISM's speed/feed recommendation for EVERY input combination in the SFC app and comparing each against BOTH HSMAdvisor AND G-Wizard. MCP + Ollama are DOWN — use git + filesystem only (git ls-files, Read, Grep), with ABSOLUTE paths.

TWO TREES — check BOTH:
- MAIN/integration tree at H:/prism (branch cad-fusion-live-ms0): the live SFC WEB APP (mcp-server/web/src/components/calculator/*.tsx — MillOptimizer, Lathe* panels, etc.) + any sfc-variability-* harness scripts. Use `git -C H:/prism ls-files <glob>` and Read H:/prism/<path>.
- OSCAR slot worktree at H:/prism-slot-oscar (branch slot/oscar): oscar's parity ENGINES — SpeedFeedTriVendorBatchComparatorEngine.ts, SpeedFeedExhaustiveCombinationEngine.ts, {GWizard,HSMAdvisor}{Adapter,LibraryExporter}Engine.ts, HSMAdvisorMachineExporterEngine.ts, PRISMToolCatalogAggregatorEngine.ts, SpeedFeedCatalogJoinerEngine.ts, SpeedFeedNineAxisOrchestratorEngine.ts, scripts/sf-tri-vendor-smoke.mjs, scripts/sf-parity-preview.mjs.

NOTE: some files may exist ON DISK but be UNTRACKED in git (`git status`); flag untracked-but-needed files as a tracking gap. Report only GENUINE blockers/gaps with the exact artifact to build. Return via StructuredOutput.

DIMENSION = "data-and-tracking". Full parity needs complete tool/material/machine data + everything committed so a run is reproducible. Check: PRISMToolCatalogAggregatorEngine.ts (41K-tool union) + SpeedFeedCatalogJoinerEngine.ts (recovers matched-but-cutless cells — the 84.6% ceiling mitigation). Run `git -C H:/prism-slot-oscar status --short` and `git -C H:/prism status --short` and flag any SFC-relevant UNTRACKED files (e.g. shop-tools-*.csv, sfc-variability-*, parity engines not yet merged). Assess data completeness for "every combo" (materials map coverage, machine power-curve data, tool catalog cuts) and reproducibility (are inputs + harness committed?). Flag tracking + data-completeness gap
... [+2 chars truncated]

### Assistant | 2026-05-29T17:42:09.711Z

I'll assess BACKEND readiness for full-combination SFC parity testing along the "data-and-tracking" dimension. Let me start by checking both trees in parallel.

### Assistant | 2026-05-29T17:42:11.653Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:42:11.766Z

[tool_use: Bash]

### User | 2026-05-29T17:42:19.694Z

[tool_result]  M mcp-server/data/state/ollama-offload-stats.json
 M mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts
?? mcp-server/.claude/cache/
?? mcp-server/data/state/SCRUTINY_LEDGER.json
?? mcp-server/mcp-server/
?? mcp-server/src/data/shop-tools-boring-finish.csv
?? mcp-server/src/data/shop-tools-boring-rough.csv
?? mcp-server/src/data/shop-tools-endmills.csv
?? mcp-server/src/data/shop-tools
... [+373 chars truncated]

### User | 2026-05-29T17:42:27.925Z

[tool_result] <persisted-output>
Output too large (3MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-oscar\f7b0f940-61e9-4d5b-812e-205ca34b8a84\tool-results\b9i9m1trl.txt

Preview (first 2KB):
 M .claude/helpers/__tests__/chat-slots-bindings.test.mjs
 M .claude/helpers/chat-slots.mjs
 M .claude/helpers/mcp-http-bridge.mjs
 M .claude/hooks/main-tree-write-block.mjs
 M .claude/hooks/prompt
... [+1780 chars truncated]

### Assistant | 2026-05-29T17:42:31.840Z

The main tree status is huge. Let me filter both for SFC-relevant untracked files and locate the parity engines. Let me run targeted checks.

### Assistant | 2026-05-29T17:42:34.496Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:42:35.914Z

[tool_use: Bash]

### User | 2026-05-29T17:42:39.618Z

[tool_result] <persisted-output>
Output too large (39.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-oscar\f7b0f940-61e9-4d5b-812e-205ca34b8a84\tool-results\bqqz6md3g.txt

Preview (first 2KB):
 M knowledge/memories/reference/reference_vendor_catalog_misclassification_2026_05_23.md
 M knowledge/wiki/architecture/actions/business/shiftscheduleoptimizer.md
 M knowledge/wiki/architecture/
... [+1785 chars truncated]

### User | 2026-05-29T17:42:42.335Z

[tool_result] mcp-server/src/engines/GWizardAdapterEngine.ts
mcp-server/src/engines/GWizardLibraryExporterEngine.ts
mcp-server/src/engines/HSMAdvisorAdapterEngine.ts
mcp-server/src/engines/HSMAdvisorComparatorBridgeEngine.ts
mcp-server/src/engines/HSMAdvisorLibraryExporterEngine.ts
mcp-server/src/engines/HSMAdvisorMachineExporterEngine.ts
mcp-server/src/engines/PRISMToolCatalogAggregatorEngine.ts
mcp-server/src
... [+1109 chars truncated]

### Assistant | 2026-05-29T17:42:48.156Z

The grep on main status didn't isolate cleanly because of the persisted output. Let me read the persisted main-status file directly and check the key files. Let me also verify which oscar engines are tracked vs the untracked ones in oscar status.

### Assistant | 2026-05-29T17:42:52.400Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:42:54.204Z

[tool_use: Bash]

### User | 2026-05-29T17:43:07.618Z

[tool_result]  M mcp-server/data/milestones/TOOL-CATALOG-INGEST-MS0.json
 M mcp-server/src/__tests__/catalogUnifiedQueryBridge.test.ts
 M mcp-server/web/src/components/learning/CourseCatalog.tsx
 M state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-manufacturer_catalogs_uploaded_01_global_cnc_full_catalog_2023_pdf.md
 M state/shared/resource-pdf-specs/AUTOGEN-EXTRACT-SPEC-manufacturer_catalogs_uploaded_2018_r
... [+14208 chars truncated]

### User | 2026-05-29T17:43:12.660Z

[tool_result] ?? mcp-server/src/data/shop-tools-boring-finish.csv
?? mcp-server/src/data/shop-tools-boring-rough.csv
?? mcp-server/src/data/shop-tools-endmills.csv
?? mcp-server/src/data/shop-tools-insert-drills-130.csv
?? mcp-server/src/data/shop-tools-insert-drills-180.csv
?? mcp-server/src/data/shop-tools-turning.csv
?? mcp-server/src/data/shop-tools-twist-drills.csv
?? mcp-server/src/engines/SpeedFeedBaseli
... [+612 chars truncated]

### Assistant | 2026-05-29T17:43:19.410Z

This is a critical finding. The MAIN tree (cad-fusion-live-ms0) has a large number of UNTRACKED SFC-relevant files. Crucially, several parity ENGINES that this audit expects to be in the oscar slot worktree are showing as UNTRACKED in the MAIN tree too — `SpeedFeedExhaustiveCombinationEngine.ts`, `SpeedFeedBaselineComparatorEngine.ts`, etc. And the `shop-tools-*.csv` tool data is untracked in BOTH trees.

Let me confirm the tracking state of the key parity/data files in both trees precisely, and check whether the harness scripts are tracked.

### Assistant | 2026-05-29T17:43:26.750Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:43:31.220Z

[tool_use: Bash]

### User | 2026-05-29T17:43:32.551Z

[tool_result] === OSCAR: is SpeedFeedExhaustiveCombinationEngine tracked? ===
mcp-server/src/engines/SpeedFeedExhaustiveCombinationEngine.ts
=== OSCAR: SpeedFeedTriVendorBatchComparator tracked? ===
mcp-server/src/engines/SpeedFeedTriVendorBatchComparatorEngine.ts
=== OSCAR: SpeedFeedCatalogJoiner tracked? ===
mcp-server/src/engines/SpeedFeedCatalogJoinerEngine.ts
=== OSCAR: HSMAdvisorMachineExporter tracked? =
... [+475 chars truncated]

### User | 2026-05-29T17:43:41.909Z

[tool_result] === MAIN: SpeedFeedTriVendorBatchComparator tracked? ===
error: pathspec 'mcp-server/src/engines/SpeedFeedTriVendorBatchComparatorEngine.ts' did not match any file(s) known to git
=== MAIN: SpeedFeedCatalogJoiner tracked? ===
error: pathspec 'mcp-server/src/engines/SpeedFeedCatalogJoinerEngine.ts' did not match any file(s) known to git
=== MAIN: HSMAdvisorMachineExporter tracked? ===
error: pathsp
... [+377 chars truncated]

### Assistant | 2026-05-29T17:43:48.930Z

Now I have a clear picture of the tracking topology:

- The parity ENGINES are tracked in oscar (`slot/oscar`) but NOT in main (`cad-fusion-live-ms0`) — meaning the parity backend lives only on the oscar branch and hasn't been merged.
- The `shop-tools-*.csv` tool data is UNTRACKED in BOTH trees (the actual catalog cuts feeding the run).
- The `sfc-variability-*` harness scripts are NOT tracked in main either — they appear only as `??` untracked in main status.

Let me confirm the sfc-variability harness tracking precisely (the ls-files returned empty — could mean untracked OR wrong path) and check the data completeness picture: PRISMToolCatalogAggregator's 41K-tool source data and the catalog-join inputs.

### Assistant | 2026-05-29T17:43:52.707Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:43:55.241Z

[tool_use: Bash]

### User | 2026-05-29T17:44:01.799Z

[tool_result] === MAIN: any sfc-variability tracked (broad)? ===
0
=== MAIN: sfc-variability untracked count ===
7
=== MAIN: shop-tools dir contents (disk) ===
?? mcp-server/src/data/shop-tools/=== OSCAR: shop-tools-*.csv on disk (untracked) ===
?? mcp-server/src/data/shop-tools-boring-finish.csv
?? mcp-server/src/data/shop-tools-boring-rough.csv
?? mcp-server/src/data/shop-tools-endmills.csv
?? mcp-server/src/
... [+190 chars truncated]

### User | 2026-05-29T17:44:11.931Z

[tool_result] === OSCAR PRISMToolCatalogAggregator: data sources referenced ===
2: * PRISMToolCatalogAggregatorEngine — unified tool inventory from all PRISM catalog files.
6: * catalogs extracted from PDFs sit in `mcp-server/src/data/*-extracted.json`
7: * (iscar 1.4MB, catalog-c010b 1.4MB, guhring 828KB, accupro 653KB, flash 643KB,
8: * hsm-advisor 542KB, etc.) plus the 13K-tool additional-tool-catalog.ts and
... [+768 chars truncated]

### Assistant | 2026-05-29T17:44:19.531Z

Now the data-source dependency is clear: `PRISMToolCatalogAggregatorEngine` reads `*-extracted.json` files from `mcp-server/src/data/`. Let me verify those extracted catalog inputs exist and are tracked in the oscar tree (the 41K-tool union depends on them), and confirm the SpeedFeedCatalogJoiner inputs. Let me also check materials map coverage and machine power-curve data for "every combo."

### Assistant | 2026-05-29T17:44:23.119Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:44:26.018Z

[tool_use: Bash]

### User | 2026-05-29T17:44:33.241Z

[tool_result] === OSCAR: *-extracted.json tracked count ===
32
=== OSCAR: *-extracted.json on disk (untracked) ===
0
=== OSCAR: tracked extracted json names ===
mcp-server/src/data/accupro-tools-extracted.json
mcp-server/src/data/ampc-tools-extracted.json
mcp-server/src/data/camfix-tools-extracted.json
mcp-server/src/data/catalog-c010b-extracted.json
mcp-server/src/data/emuge-tools-extracted.json
mcp-server/src
... [+1387 chars truncated]

### User | 2026-05-29T17:44:38.135Z

[tool_result] === OSCAR HSMAdvisorMachineExporter: machine count / power-curve source ===
2: * HSMAdvisorMachineExporterEngine — PRISM machine fleet → HSMAdvisor machines.xml writer.
5: * Operator directive 2026-05-26: "add all machines to competitors".
7: * HSMAdvisor machines.xml schema (verified live, operator's
8: * C:/Users/wompu/AppData/Roaming/HSMAdvisor/machines.xml):
11: *       <xs:element name="skv_f
... [+2823 chars truncated]

### Assistant | 2026-05-29T17:44:44.831Z

Important nuances emerging:

1. The 32 `*-extracted.json` catalogs (the 41K-tool union source) ARE tracked in BOTH trees — good for tool-catalog data.
2. The HSMAdvisor machine exporter sources from `machine-torque-curves.js` (1058 machines with real power-curve points) — let me verify that data file is tracked.
3. The `SpeedFeedCatalogJoiner` references G-Wizard `toolcrib.csv` as the input for the 84.6% ceiling mitigation. Let me check if that csv is tracked.
4. The `shop-tools-*.csv` (the SHOP's actual tools, JM Die's inventory feeding the parity run) are untracked in BOTH trees.

Let me verify the torque-curves data, G-Wizard toolcrib, materials map, and the exhaustive-combination enumerator's input dependencies.

### Assistant | 2026-05-29T17:44:49.232Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:44:51.730Z

[tool_use: Bash]

### User | 2026-05-29T17:44:56.905Z

[tool_result] === OSCAR: machine-torque-curves tracked? ===
mcp-server/src/data/machine-torque-curves.ts
=== OSCAR: G-Wizard toolcrib.csv / gwizard data tracked? ===
knowledge/wiki/architecture/actions/cam/imachining-wizard.md
knowledge/wiki/architecture/actions/cam/solidcam-imachining-wizard.md
knowledge/wiki/architecture/engines/tool/toolcribengine.md
knowledge/wiki/architecture/frontends/frontend_file/fronte
... [+1560 chars truncated]

### User | 2026-05-29T17:45:03.025Z

[tool_result] === OSCAR ExhaustiveCombination: enumeration dimensions + data inputs ===
5: * Operator directive (2026-05-25): "run every logical combination through the
7: * system for calculated results of every single logical combination that
8: * can be inputed into our prism calculator studio for the 3 primary machine
11: * The full 9-axis × 3-domain combinatorial space is ~10^9 cells (combinatorial
15: *  
... [+1489 chars truncated]

### Assistant | 2026-05-29T17:45:10.301Z

Critical data-completeness picture now resolves clearly. The G-Wizard adapter reads `toolcrib.csv` from `%APPDATA%/GWizard.*/Local Store/` — an EXTERNAL, machine-local, NON-COMMITTED file. The HSMAdvisor exporter writes to `%APPDATA%/HSMAdvisor/machines.xml` (external too). These external dependencies break reproducibility for "every combo" parity runs. Let me confirm:

1. The exhaustive enumerator's material source — does it have full material coverage or only 3 materials in demo mode?
2. Whether the parity comparison actually has a committed G-Wizard/HSMAdvisor baseline snapshot it compares against (not the live external app), so a run is reproducible.

Let me check the materials map coverage and the tri-vendor comparator/smoke baseline data.

### Assistant | 2026-05-29T17:45:13.676Z

[tool_use: Bash]

### Assistant | 2026-05-29T17:45:17.801Z

[tool_use: Bash]

### User | 2026-05-29T17:45:18.628Z

[tool_result] === OSCAR ExhaustiveCombination: PRODUCTION material list ===
// ============================================================================
// DOMAIN AXIS GRIDS
// ============================================================================

// Demo grid: kept minimal (≤20 cells per domain) so test suites stay <60s.
const DEMO_MATERIALS_BY_ISO: Record<string, string[]> = {
  P: ["steel"], M: ["a
... [+1627 chars truncated]

### User | 2026-05-29T17:45:26.010Z

[tool_result] === OSCAR sf-tri-vendor-smoke.mjs: how does it source vendor baselines? ===
5: * Loads the operator's REAL G-Wizard toolcrib (if available), sweeps the
8: * Usage: tsx scripts/sf-tri-vendor-smoke.mjs [--ledger=path.jsonl] [--matrix=large]
22:const ledgerPath = args.ledger ?? "state/outcomes/sf-tri-vendor-smoke.jsonl";
24:// Resolve operator's G-Wizard toolcrib (optional). Falls back to empty axis

... [+1655 chars truncated]

### Assistant | 2026-05-29T17:45:35.440Z

Now I have decisive findings on the data-and-tracking dimension. The picture is severe for "every combination" parity:

1. **Material coverage is the hard blocker for "every combo."** The exhaustive enumerator's PROD grid covers only 4 ISO materials (P=steel, M=aluminum_6061, K=cast_iron, S=titanium) — N (non-ferrous/superalloy) and H (hardened) are EMPTY `[]`. The comment explicitly states the real exhaustive sweep runs "out-of-band via a script (scripts/sf-exhaustive-sweep.mjs, follow-up)" — that script does NOT exist (it's a named follow-up). So "every input combination" cannot be enumerated for materials today.

2. **G-Wizard baseline is external + optional, not committed.** `sf-tri-vendor-smoke.mjs` loads the operator's real toolcrib if available and "falls back to empty axis" when not on this box. There's no committed toolcrib fixture. A parity run on a fresh checkout produces ZERO G-Wizard comparison cells — not reproducible.

3. **HSMAdvisor baseline writes to external `%APPDATA%`** — comparison depends on the locally-installed app, not a committed snapshot.

Let me confirm the missing sweep script and the HSMAdvisor comparator baseline source, then check whether the parity ledger outputs are committed.

### Assistant | 2026-05-29T17:45:41.888Z

[tool_use: Bash]

### User | 2026-05-29T17:45:48.952Z

[tool_result] === OSCAR: does sf-exhaustive-sweep.mjs exist? ===
/usr/bin/ls: cannot access 'H:/prism-slot-oscar/scripts/sf-exhaustive-sweep.mjs': No such file or directory
/usr/bin/ls: cannot access 'H:/prism-slot-oscar/mcp-server/scripts/sf-exhaustive-sweep.mjs': No such file or directory
=== OSCAR: HSMAdvisorComparatorBridge baseline source ===
20: * HSMAdvisorCore.dll. They're not published as a schema; Eng
... [+688 chars truncated]

### Assistant | 2026-05-29T17:45:54.467Z

The picture is complete and decisive. Let me do one final confirmation on the HSMAdvisor comparator's actual reference-value source (is it a committed dataset or live DLL), and verify the `state/outcomes/sf-tri-vendor-smoke.jsonl` ledger gitignore status — to nail the reproducibility verdict.

### Assistant | 2026-05-29T17:45:59.588Z

[tool_use: Bash]

### User | 2026-05-29T17:46:05.793Z

[tool_result] === OSCAR HSMAdvisorComparator: does it carry committed reference cuts or read external? ===
5: * surfaces HSMAdvisor's computed sfm/ipt/mrr/rpm/feed for the operator's currently-selected
23: *   (a) a HARDCODED minimal map covering the IDs OBSERVED in the operator's settings_v2.xml
25: *       → carbide based on context — "T2 Rough Turn for Steel" tool description). These are
27: *   (b) a CALLER
... [+2609 chars truncated]

### Assistant | 2026-05-29T17:46:24.457Z

I now have everything needed. The `state/outcomes/` ledger and the `shop-tools-*.csv` are BOTH gitignored (exit 0 = ignored) — confirming the parity-run inputs (shop tools) and outputs (ledger) are deliberately excluded from version control, breaking reproducibility.

Final synthesis of the data-and-tracking dimension:

**Tracked OK (present):** 26 parity engines on `slot/oscar`; 32 `*-extracted.json` tool catalogs (41K-tool union source) tracked in both trees; `machine-torque-curves.ts` (1058 machines w/ power curves) tracked; `hsm-advisor-machines.json` + `hsm-advisor-tools.json` + `gwizard-machines.json` tracked; smoke + preview harness scripts tracked on oscar.

**Genuine gaps:**

- **BLOCKER — material coverage incomplete for "every combo":** PROD grid covers only P/M/K/S (4 ISO groups); N and H are empty `[]`. The real exhaustive sweep is deferred to `scripts/sf-exhaustive-sweep.mjs`, which **does not exist** in either tree.
- **BLOCKER — parity ENGINES not merged to the integration tree:** all 26 SpeedFeed*/parity engines are untracked/absent in `H:/prism` (cad-fusion-live-ms0). The live SFC web app there can't invoke them; a parity run from the integration tree is impossible until merge.
- **BLOCKER — G-Wizard baseline non-reproducible:** comparison reads operator's live `%APPDATA%/GWizard.*/toolcrib.csv`; no committed fixture; falls back to empty axis off-box → zero G-Wizard cells on fresh checkout.
- **P1 — HSMAdvisor baseline non-reproducible:** reads live `%APPDATA%/HSMAdvisor/settings_v2.xml` via a hardcoded-observed-IDs map; no committed reference-cut snapshot.
- **P1 — shop tool data untracked + gitignored:** 7 `shop-tools-*.csv` (the shop's actual tools driving the run) are gitignored in both trees.
- **P1 — parity ledger gitignored:** `state/outcomes/sf-tri-vendor-smoke.jsonl` is gitignored → no reproducible record of a run.
- **P2 — sfc-variability harness untracked in main:** 7 `scripts/sfc-variability-*` scripts present only as untracked in `H:/p
... [+6 chars truncated]

### Assistant | 2026-05-29T17:47:01.961Z

[tool_use: StructuredOutput]

### User | 2026-05-29T17:47:02.568Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T17:47:15.345Z

I've completed the data-and-tracking readiness assessment for full-combination SFC parity testing. Verdict: **NOT READY** — 3 BLOCKERS, 4 lower-severity gaps.

Key relevant files:
- `H:/prism-slot-oscar/mcp-server/src/engines/SpeedFeedExhaustiveCombinationEngine.ts` (L131-138: PROD material grid missing N/H; references non-existent sf-exhaustive-sweep.mjs)
- `H:/prism-slot-oscar/mcp-server/src/engines/GWizardAdapterEngine.ts` (L121-125: reads external %APPDATA% toolcrib.csv, no committed fixture)
- `H:/prism-slot-oscar/mcp-server/src/engines/HSMAdvisorComparatorBridgeEngine.ts` (external settings_v2.xml, hardcoded-observed-IDs map)
- `H:/prism-slot-oscar/mcp-server/src/engines/PRISMToolCatalogAggregatorEngine.ts` + `SpeedFeedCatalogJoinerEngine.ts` (data backbone — OK)

Headline: the tool-catalog data backbone is committed and solid (32 extracted catalogs + 1058-machine power curves), but the parity engines live only on `slot/oscar` and are absent from the `cad-fusion-live-ms0` integration tree; material coverage is incomplete; and the vendor baselines (G-Wizard toolcrib, HSMAdvisor settings), shop-tools CSVs, and run ledger are external/gitignored — so a parity run is not reproducible off-box.
