---
name: reference-oscar-sfc-9axis-ms0-2026-05-26
description: OSCAR-SFC-9AXIS-MS0 milestone — 6 units shipped 2026-05-26 closing the vendor-baseline + fleet-corpus-bridge phases of the speed-feed calculator
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.694Z
aliases: reference_oscar_sfc_9axis_ms0_2026_05_26
---


# OSCAR-SFC-9AXIS-MS0 — 2026-05-26 6-unit ship + envelope close-out

## What shipped (this session, slot:oscar `claude-2ae65067`, /goal /loop /yolo-mode)

**6 new units on the speed-feed-calculator milestone** + critical wire-fix + missing envelope landed.

| Unit | Engine | Tests | Commit | Branch |
|------|--------|------:|--------|--------|
| U-OSC9-08 | `SpeedFeedShopLibraryBridgeEngine` — operator's REAL Fusion 360 shop library → MRR-ranked SFC | 35 | `7c9643f7f0` | main |
| U-OSC9-09 | `HSMAdvisorAdapterEngine` — live-state reader for `%APPDATA%/HSMAdvisor/settings_v2.xml` | 31 | `32a707ec22` | main |
| U-OSC9-10 | `SpeedFeedPDFCorpusBridgeEngine` — kilo cad-cam-pdf-tribal-seeds + fleet extracted-pdfs JSONL → SFC tribal prior | 33 | `aefecf1676` | main |
| U-OSC9-11 | `HSMAdvisorComparatorBridgeEngine` — 5-axis PRISM ↔ HSMAdvisor diff + geometric-mean agreement | 28 | `e6c390fc2b` | slot/oscar |
| U-OSC9-12 | `GWizardAdapterEngine` — G-Wizard Calculator toolcrib.csv read-only adapter | 24 | `37c15f36b5` | slot/oscar |
| U-OSC9-13 | `WedmTrainingPairBridgeEngine` — index/lookup over mike's 98-pair WEDM training-corpus | 26 | `88ff0daef9` | slot/oscar |
| WIRE-FIX | engine-on-main commit closing silent wire-break (engines were slot-only / dispatcher actions main-wired) | 50 | `be173cf2b5` | main |
| ENVELOPE | `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json` — 13-unit envelope (was missing) | — | `f32c99216a` | slot/oscar |

**17 new `prism_calc` actions** added across the milestone — every unit gets one.

**363 tests total** (yesterday's 59 + today's 304).

## Key findings (real bugs caught by test/scrutiny stack)

1. **HSMAdvisor utf-16 declared / utf-8 stored** — the XML prolog `encoding="utf-16"` lies; live operator file is UTF-8 bytes on disk. .NET XmlSerializer sometimes produces this mismatch. Initial commit blindly read as utf16le and produced garbage. Fixed via BOM-sniff encoding detector (4-tier: UTF-16-LE BOM, UTF-16-BE BOM, UTF-8 BOM, BOM-less heuristic). Caught by gated real-file test — hand-written fixture wouldn't have surfaced this.
2. **PDFCorpus Zod enum drift** — kilo's tribal-seeds data carries `domain: "cad"` but my initial enum omitted it. Live-data probe surfaced the gap before ship.
3. **ShopLibBridge passthrough-clobber** — Reviewer A P1: top-level fields set after `...passthrough` spread silently override passthrough values to `undefined` when omitted. Fixed via `input.X ?? passthrough.X`.
4. **ShopLibBridge `tool_diameter_mm` vs `diameter_mm` field-name** — TS gate caught the mismatch before commit. NineAxisInput.tooling uses `tool_diameter_mm` (REQUIRED); tool_library entry shape uses `diameter_mm` (different schema by design).
5. **Silent wire-break** — engines slot/oscar-only but dispatcher actions main-wired. Any chat calling `prism_calc:gwizard_read_toolcrib` or `wedm_training_pair_lookup` would have hit module-not-found from main. Caught via `git ls-files` audit before any peer noticed.

## Operator directives honored

1. **"I now have gwizard and hsmadvisor on this pc for you to test and compare against"** — closed via U-OSC9-09 + U-OSC9-11 + U-OSC9-12. HSMAdvisor sandbox file paths probed live; G-Wizard AIR sandbox auto-resolve baked in.
2. **"whiskey/lima/mike/foxtrot/echo PDF-extracting → bridge to speed-feed calculator"** — closed via U-OSC9-10 (kilo seeds + fleet JSONL) + U-OSC9-13 (mike WEDM training-pairs). AGENT_CHAT broadcast posted to peer slots.

## Future-work backlog (registered in envelope)

- **U-OSC9-14** — AI training axis (SF-AI-L1/L2/L3 engines exist as shells, untrained). Ollama is currently broken (50/50 calls timing out per banner) so deferred.
- **U-OSC9-15** — G-Wizard SQLite GWizard.db saved-jobs extraction. Operator file is 11KB; small enough that the CSV adapter shipped first.
- **U-OSC9-16** — HSMAdvisor `material_id` → ISO lookup table. U-OSC9-11 ships with a minimal hardcoded map (227 → P) + caller override. Coverage grows once the full id→name table is derived from `user_tool_lib.tooldb2.xml` (1.1MB) or DLL reverse-engineering.

## Doctrine notes

- **Slot/oscar worktree as escape hatch for main-tree lock contention.** When `feedback_slot_bridge_hooks_disabled` left every chat in shared `H:/prism`, the index.lock contention from peer commits stranded multiple commits. Operator directive "commit to oscar work tree" restored the slot-worktree path — clean commits with no peer absorption.
- **Gated real-file tests are load-bearing.** Hand-written fixtures match my mental model. The HSMAdvisor utf-8 bug shipped clean tests but failed against the live operator file — the gated test (skipped when file absent) caught it pre-commit.
- **Per-file scrutiny gate works.** iter1 (U-OSC9-08) ran the full 2-of-2 parallel scrutiny — 4 P1s flagged, all fixed inline before commit. The P1 about action-name convention drift (`sfc_shop_library_mrr_rank` → `sfc_shop_library_rank`) would have been forward-incompatible after ship.

## Cross-references

- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`
- Yesterday's session: [[reference_oscar_sfc_9axis_ship_absorbed_2026_05_25]]
- Peer PDF-extraction work: [[feedback_psn_definition]] (PSN leg taxonomy) + kilo's cad-cam-resources-pdf-index wiki entry
- Coordination broadcast: state/shared/AGENT_CHAT.jsonl @ 2026-05-26T16:35Z (oscar → fleet)
