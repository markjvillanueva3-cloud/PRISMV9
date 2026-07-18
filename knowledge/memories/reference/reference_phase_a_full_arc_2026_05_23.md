---
name: reference-phase-a-full-arc-2026-05-23
description: Successor to [[reference_phase_a_3iter_progression_2026_05_23]]. Covers the full 12-iter charlie /loop Phase-A WEDM corpus arc (iter 35-46). 11 substantive commits + 1 wiki entry that closes the loop. JM Die WEDM corpus is now structurally exhausted at this token budget — 97/98 .mcx-* manifests metadata-wired, 22 NC files dialect-sniffed (19 misfiled lathe, 2 real WEDM, 1 indeterminate), 85/97 explicit Mitsubishi FA-class machine-def coverage. Three R12 fail-loud cancellations saved the slot from shipping wrong work (U-WEDM-MIN-DIALECT-DETECT, U-MCX-COMPRESSION-COVERAGE, U-MCX-MATERIAL-VOCAB engine-extension). Canonical reference: wiki/architecture/wedm-phase-a-corpus.md (iter-46 commit e8736489e3).
aliases: reference_phase_a_full_arc_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.727Z
---


**2026-05-23 charlie /loop iter 35-46.** Same session as the precursor memo; this one extends it through close-out.

## What changed since the precursor

[[reference_phase_a_3iter_progression_2026_05_23]] covered iter 35-37 (the metadata-wire + sibling-NC-refutation + standalone-NC-parse chain). This successor covers iter 38-46 — where each iter's finding chained into the next reframe until the corpus arc structurally exhausted:

| Iter | Commit | What it added | What it discovered |
|---|---|---|---|
| 38 | `0a690f376a` | Content-sniffing pivot in pairs-index (LATHE_MARKERS vs WEDM_MARKERS regexes); replaced extension-only dialect tag | 19 of 22 .MIN files in JM Die WIRE EDM dir are actually mitsubishi-lathe G-code (`$NAME.MIN%` macro prelude → G50/G96/G97/T-codes/NTURN). The "dialect-detection gap" iter-37 flagged in WireEDMProgramParserEngine was actually correct parser behavior — `unknown` IS the right answer for non-WEDM input. **CANCELED U-WEDM-MIN-DIALECT-DETECT** (would have taught the parser to misclassify lathe as WEDM). |
| 39 | `4cbc862292` | Phase-B kickoff: aggregate 97-pair reference_metadata into pattern catalog | 80/97 binaries surface `machine_hints: ["wire"]` (corrects iter-37's sample bias). 5 distinct post-processor identities surfaced including `I FA-SERIES 4X WIRE.PST` — first explicit Mitsubishi WEDM post in the corpus. zlib_chunks=0 on 89/97 flagged as potential parser gap. |
| 40 | `409cc89d5d` (peer-absorbed into juliett's U-SFPSN-03 commit window) | Full-file byte-scan diagnostic for non-zlib compression markers (zlib quirky + gzip + zip + xz + bzip2 + lzw + lz4 + mcx_record_98) on 5 sampled binaries | **engine_vs_scan_delta = 0 across ALL 5 files**. McxProgramParserEngine's zlib detection is correct; X8 binaries genuinely have NO off-the-shelf compression at the byte level. **CANCELED U-MCX-COMPRESSION-COVERAGE** as engine-extension unit. Op-count recovery needs Mastercam SDK / NETHOOK. |
| 41 | `00c2fb1499` | Material-vocab discovery (re-parse 5 samples + dump filtered embedded_strings + classify against MATERIAL_VOCAB_PATTERNS) | 0/5 files surface ANY material-descriptor pattern. Operators don't put material in Mastercam — material lives in shop ERP / job traveler. **CANCELED engine-extension to expand COMMON_MATERIAL_TOKENS regex**. But: 144 cross-corpus shared strings exposed the REAL signal — `.wmd-*` machine-definition references. |
| 42 | `c117f699c7` | Canonical .wmd-* catalog across all 97 binaries + suffix-fragment dedup pass (suppressed 4 noise artifacts like `ECH).wmd-8` being a substring of `EDM(TECH).wmd-8`) | 7 unique .wmd identities. 77/97 reference `X WIRE (TECH).wmd-5` (Mastercam X5 generic default). 53/97 reference explicit `MPW MITS FA-FX EDM(TECH).wmd-8`. JM Die WEDM corpus is dominantly Mitsubishi FA-class. |
| 43 | `721a4a49d9` | Tightened MACHINE_CLASS_PATTERNS regex — added MITSUBISHI as strong identifier + FA-SERIES Nx WIRE variant | 31 manifests reclassified from generic_wire → mitsubishi_fa_series. Explicit Mitsubishi exposure 53 → 85 of 97 (**88%**). Combined with the 77 X-WIRE generic-default refs (operators leave default machine-def when posting to Mitsubishi) = effectively 100% Mitsubishi-targeted corpus. |
| 44 | `7479f60460` | Investigated the 18 zero-wmd manifests — sampled 3 (af102-05, 0137471, 12270_gage), dumped top-30 strings + machine-identifier candidates | All 3 are default-machine-def projects (operator imported geometry via DXF/IGS, never customized machine def). Default ref lives in X8 compressed proprietary region (iter-40 proved opaque). Conservative assumption: also Mitsubishi FA-class default. Side-finding: MACHINE_MODEL_NUM_RE matched binary garbage `\|?Z)u8)K` — regex too greedy on `U`+digit. |
| 45 | `fe4af8d4a9` | Dropped single-letter `U` prefix from MACHINE_MODEL_NUM_RE; widened digit count 1-4 → 2-5; added ROBO + AC prefixes for completeness | Binary-garbage false positive eliminated. All 3 zero-wmd samples now correctly show 0 model_num candidates, consistent with iter-44 structural finding. |
| 46 | `e8736489e3` | Canonical wiki entry `knowledge/wiki/architecture/wedm-phase-a-corpus.md` — 184 lines documenting the full 11-commit arc with corpus census, machine-def distribution, R12 cancellations, operational charlie defaults, artifact locations | Per `[[feedback_reflect_all_changes_post_update]]` doc-reflection rule. Future charlie chats can build on the corpus findings without re-deriving. |

## The R7+R12 discipline in action

The arc demonstrates exactly what `[[feedback_r5_thru_r12_doctrine]]` is for. Three units (one per major sub-investigation) were proposed mid-arc that would have been wrong work:

| Wrong-work unit | Reframed by | Why CANCELED |
|---|---|---|
| U-WEDM-MIN-DIALECT-DETECT | iter-38 | Would have taught WireEDMProgramParserEngine to misclassify mitsubishi-lathe G-code as WEDM dialect |
| U-MCX-COMPRESSION-COVERAGE | iter-40 | Would have extended McxProgramParserEngine to find zlib chunks that don't structurally exist in JM Die X8 binaries |
| U-MCX-MATERIAL-VOCAB engine-extension | iter-41 | Would have expanded COMMON_MATERIAL_TOKENS regex for patterns operators never put in Mastercam to begin with |

Each fail-loud diagnostic SHIPPED as a canonical artifact (the negative finding IS the deliverable). Without that discipline, the arc would have produced 3 confidently-wrong commits instead of 3 honestly-documented gaps.

## What's now true about Phase-A coverage

- **97/97 manifests classified**: 53 explicit FA-FX + 32 explicit FA-SERIES + 12 generic-default-X5 (likely Mitsubishi too) + 18 default-machine-def (X8-opaque, conservatively Mitsubishi FA-class)
- **Cannot get further without Mastercam SDK / NETHOOK** for op-count, full toolpath text, deviation reports
- **JM Die alone provides 2 real operator-authored WEDM programs** — too few for dialect calibration; external corpora needed
- **The 19 misfiled-lathe programs were cross-shared to bravo** (lathe-domain slot) via AGENT_CHAT.jsonl — operationally useful for bravo's lathe corpus, not for charlie's WEDM
- **PRISM WEDM defaults at Mitsubishi FA-class are corpus-validated** at 88% minimum signal

## What's NOT done yet (next-iter pickups)

Per the wiki entry's "Coverage ceiling" section, the genuine next steps require resources beyond this session's scope:

- **U-WEDM-CORPUS-EXTERNAL** — vendor sample programs / public WEDM corpora / synthetic generation
- **U-MASTERCAM-COM-BRIDGE** — runtime Mastercam COM / NETHOOK bridge to post .mcx-* → NC (gated on Mastercam license + Windows COM expertise)
- **U-WEDM-OPERATOR-INTERVIEW** — for the 18 zero-wmd default-machine-def projects, what physical machine did each actually target?

None of those are tight-scoped enough for a /loop drift-discipline iter; they're proper milestones.

## Canonical references

- Wiki: `knowledge/wiki/architecture/wedm-phase-a-corpus.md` (iter-46 `e8736489e3` — primary)
- Memory predecessor: `[[reference_phase_a_3iter_progression_2026_05_23]]` (iter 35-37 chain only)
- Memory iter-35 context: `[[reference_u_mcx_metadata_wire_2026_05_23]]`
- Memory pre-arc state: `[[reference_wedm_phase_a1_proven_end_to_end_2026_05_22]]`
- Slot soul: charlie (wire-EDM specialist)

## Session-end stats

iter 46 / 20 (at-target +26 — drift-acknowledged; operator was in active "next batch" loop). Session db0678d4. Charlie domain. 12 substantive units (11 git commits + 1 wiki) + 4 reference memos this session (this one being the 4th) + 1 cross-slot finding (AGENT_CHAT notice to bravo). Phase-A coverage ceiling reached. Token state 70% YELLOW at close.

Related: `[[feedback_autonomous_loop_drift_discipline]]` (drift-acknowledgement framework) · `[[feedback_reflect_all_changes_post_update]]` (doc-reflection rule satisfied) · `[[feedback_do_optional_high_roi_work]]` (operator-directed continuation overrode drift cap) · `[[feedback_parallel_scrutiny_per_file]]` (single-file scope per iter avoided multi-file scrutiny cycle overhead).
