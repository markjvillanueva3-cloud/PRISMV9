# RECENT-SHIPMENTS — slot oscar — 2026-05-26

Inbox for the golf maintenance slot to drain into `H:/prism/CLAUDE.md` (Recent regressions section + Recent shipments tail). All entries authored by `claude-2ae65067` slot:oscar.

## Recent regressions (caught + fixed this session)

- 2026-05-26 | **silent wire-break — GWizardAdapterEngine + WedmTrainingPairBridgeEngine were slot/oscar-only but dispatcher actions main-wired (any chat calling `prism_calc:gwizard_read_toolcrib` or `wedm_training_pair_lookup` from main would 404 on dispatcher import).** Gap surfaced via `git ls-files` audit pre-commit (not by a peer hitting the failure). | observed-in: aefecf1676 (silent — engines never committed to main during iters 4-6 before fix) | fix: be173cf2b5 | verify: `git -C H:/prism show be173cf2b5`
- 2026-05-26 | **HSMAdvisor `settings_v2.xml` declares `encoding="utf-16"` in XML prolog but stores UTF-8 bytes on disk** (.NET `XmlSerializer` declaration/storage mismatch — verified live 2026-05-26 on operator machine). Engine that blindly reads `utf16le` produces garbled output. Fix: BOM-sniff encoding detector (4-tier: UTF-16-LE BOM, UTF-16-BE BOM, UTF-8 BOM, BOM-less heuristic with UTF-8 default). Caught by gated real-file test; hand-written fixture matched my mental model + would have passed. | observed-in: 32a707ec22 | fix: 32a707ec22 | verify: `git -C H:/prism show 32a707ec22`
- 2026-05-26 | **SpeedFeedPDFCorpusBridge Zod enum drift** — kilo's live tribal-seeds data carries `domain:"cad"` but engine's initial domain enum omitted it. Caught at first test run against the live fixture. Fix: extended enum to `{cad, blueprint}` after live-data probe. Demonstrates R8 (read live data before writing parser). | observed-in: aefecf1676 | fix: aefecf1676 | verify: `git -C H:/prism show aefecf1676`
- 2026-05-26 | **SpeedFeedShopLibraryBridge passthrough-clobber** — top-level fields (`part_volume_cm3`, `batch_size`) set after `...passthrough` spread silently overrode passthrough-provided values to `undefined` when caller omitted them. Reviewer A P1, fixed inline before commit. Fix: `input.X ?? passthrough.X` on every top-level override. | observed-in: 7c9643f7f0 | fix: 7c9643f7f0 | verify: `git -C H:/prism show 7c9643f7f0`

## Recent shipments (informational — no regression)

- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-08 SpeedFeedShopLibraryBridgeEngine** — operator's REAL Fusion 360 shop library → MRR-ranked SFC via NineAxisOrchestrator. 35/35 tests. 4 P1s from parallel scrutiny fixed inline. 7c9643f7f0.
- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-09 HSMAdvisorAdapterEngine** — read-only live-state reader for `%APPDATA%/HSMAdvisor/settings_v2.xml`. Closes vendor-baseline live-data axis for HSMAdvisor side. 31/31 tests (including gated real-file). 32a707ec22.
- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-10 SpeedFeedPDFCorpusBridgeEngine** — kilo cad-cam-pdf-tribal-seeds + fleet extracted-pdfs JSONL → SFC tribal prior. Closes operator coordination directive "whiskey/lima/mike/foxtrot/echo PDF-extraction → SFC bridge". 33/33 tests. aefecf1676.
- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-11 HSMAdvisorComparatorBridgeEngine** — 5-axis PRISM ↔ HSMAdvisor live diff with 3-tier enum translation (builtin → caller-override → fallback+warning) + geometric-mean agreement_score. 28/28 tests. slot/oscar e6c390fc2b → main wire-fix be173cf2b5.
- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-12 GWizardAdapterEngine** — G-Wizard Calculator toolcrib.csv read-only adapter; auto-resolves AIR sandbox; NaN/space coercion; units inference; SQLite GWizard.db deferred to U-OSC9-15. 24/24 tests. slot/oscar 37c15f36b5 → main wire-fix be173cf2b5.
- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-13 WedmTrainingPairBridgeEngine** — index + lookup over mike's 98-pair WEDM training-corpus; stem/customer/parse_ok_only filters; auto customer extraction from JM-Die paths; mtime-keyed cache. 26/26 tests. slot/oscar 88ff0daef9 → main wire-fix be173cf2b5.
- 2026-05-26 | **[OSCAR-SFC-9AXIS-MS0] U-OSC9-ENVELOPE** — created `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json` (was MISSING — silent close-out drift). Documents 13 shipped units across 3 phases + 3 future-work items. slot/oscar f32c99216a.

## Session metrics

- Iters: 11 this session (5/26) + 7 prior (5/25) = 18 cumulative on OSCAR-SFC-9AXIS-MS0
- Engines shipped: 13 (7 prior + 6 this session)
- Tests: 363 cumulative
- New `prism_calc` dispatcher actions: 17
- Real bugs caught by test/scrutiny stack: 4
- Operator coordination directives honored: 2 (G-Wizard/HSMAdvisor + fleet PDF-extraction → SFC)

## Doctrine notes for golf drain

The 4 regressions above all caught at gate-time (pre-commit or pre-merge); none reached production failure. The wire-break is the most subtle — engines existed on disk in main but were *untracked* by git, so dispatcher actions wired on main would have failed module-not-found for any peer chat invoking them. `git ls-files` audit caught it; a peer chat hitting the action would have been the alternative discovery path. Suggests a hook to audit `git ls-files | grep <new-engine>` after every dispatcher edit.
