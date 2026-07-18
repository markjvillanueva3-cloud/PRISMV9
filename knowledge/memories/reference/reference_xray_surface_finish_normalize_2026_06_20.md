---
name: reference_xray_surface_finish_normalize_2026_06_20
description: "xray shipped normalizeSurfaceFinish (blueprint OCR recall): recovers surface-finish callouts the VLM emits as TEXT (63 RMS / 125 uin / N6 / Ra 0.8) that extractSurfaceFinish previously dropped -> canonical Ra um. Wired into parseVisionResponse (shared lib) so all 14 .mjs OCR consumers incl the closed-loop grinder benefit. ALSO: verified the live page-0-only multipage bug is CLOSED across all rasterizing engines. NOTE: dedicated commit attribution absorbed into a concurrent fleet commit during an in-progress cherry-pick on cad-fusion-live-ms0."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.277Z
aliases: reference_xray_surface_finish_normalize_2026_06_20
---


# xray surface-finish normalizer + page-0-only verified-closed (2026-06-20)

## What shipped (LIVE on cad-fusion-live-ms0, 81/81 tests green on committed code)
`scripts/lib/ollama-vision-extract-lib.mjs`: new pure `normalizeSurfaceFinish(raw)` +
`ISO_N_GRADE_RA_UM` table. Recovers surface-finish callouts the VLM emits as TEXT --
`"63 RMS"`, `"125 uin"`, `"N6"`, `"Ra 0.8"` -- that `extractSurfaceFinish` previously
DROPPED (it read only a numeric `ra_um`). Conversions are exact/chart-canonical:
microinch->um x0.0254 (63 uin = 1.6002 um); RMS number taken as its microinch
Ra-equivalent (ASME B46.1 shop convention); ISO 1302 N1..N12 table. Bare unit-less
numbers disambiguated by the ISO preferred series (0.8=um-preferred, 32/63=uin-preferred,
flagged `assumed:true`); a bare number in neither series stays `resolved:false` -- never
a silent guess (R12). Negatives captured+rejected; explicit um/uin tokens win over RMS.

WIRED into `parseVisionResponse` via `extractSurfaceFinish` (adds
`ra_um_source`/`finish_system`/`ra_um_assumed`) + `extractDimension`
(`surface_finish_ra` string callouts). Reaches all 14 `.mjs` consumers automatically:
the closed-loop OCR training grinder (`ocr-closed-loop.mjs`), `vision-ensemble-fuse`,
batch/probe/CLI. 81/81 tests (+16: happy + RMS/uin/um/N-grade + 4 failure modes incl
R12 negative-reject + 2 adversarial word-collision + parseVisionResponse round-trip).
Per-file 2-arm scrutiny PASS (arm-B P1 negative-sign-flip + arm-A P2
explicit-token-precedence both fixed before ship).

## Verified-closed (no fix needed -- do NOT re-investigate)
The live page-0-only multipage bug is CLOSED. Only two engines rasterize PDFs --
`CADLiveBlueprintOcrAdapter` + `CADRoundTripValidationEngine` -- and BOTH are all-pages
+ union via `U-PRINT-OCR-PDF` (13557d84c9, committed 23:17 2026-06-19, AFTER the 20:04
handoff that hypothesized the bug). `cad_pdf_blueprint_extract` is text-based (needs
`text_content`); `blueprint_to_quote` consumes OCR `analysis`; `print_to_program_full`
consumes pre-parsed `dimensions` -- all inherit upstream. No other rasterizing engine
exists (broad sweep).

## Open follow-ups (queued for next xray loop iters)
1. [DONE 2026-06-20, commit 02b56c847f -- U-XRAY-SFC-NORMALIZE-LIVE] TS-PORT shipped:
   `mcp-server/src/utils/surfaceFinishNormalize.ts` (cross-boundary clone of the .mjs;
   the MCP/TS bundle cannot import scripts/.mjs) wired into
   `BlueprintVisionOCREngine.convertDimensions` -- the live `cad_live_blueprint_ocr` path now
   recovers text callouts too. 17 vitest, tsc clean, 2-arm scrutiny (arm A caught + FIXED a
   P1: the port dropped the `.mjs` `(?:micro|u)"` inch-double-quote alternative -> 25u" had
   silently read as 25 um). Callout recovery is now on BOTH OCR paths (grinder + live MCP).
2. P0.2 region tiling for dense pages (highest backlog recall lever; needs GPU A/B validation
   -- run off the live grinder's GPU window). See `blueprint-reading-improvement-backlog-2026-06-19`.
3. surface_finishes[] PART-LEVEL channel: BlueprintVisionOCREngine has NO consumer for the
   prompt's surface_finishes[] array (only the dimension-level surface_finish_ra) -- a separate
   unit to surface part-level finishes (arm-B scope note).
4. Dimension-path audit trail (.mjs arm-B P2, low value): system/assumed dropped on the
   dimension path -- in practice `assumed` is never true there (bare numbers go through asNum).

## HAZARD recurrence (R12 honest record)
Dedicated commit attribution was ABSORBED: the shared `cad-fusion-live-ms0` tree had a
peer cherry-pick IN PROGRESS when `git commit` ran; the staged 2 files landed in HEAD's
tree but under a fleet commit, not a `U-XRAY-SURFACE-FINISH-NORMALIZE` commit (grep of
`git log --all --grep` = empty; `git show HEAD:...` = my code present + working tree
clean). xray's OCR line is cad-fusion-live-ms0 (last 5 OCR commits there via [MAIN-FORCE]);
the `slot/xray` worktree is divergent/stale for this file (65 lines behind, lacks
U-PRINT-OCR-PDF). Sibling of [[feedback_commit_to_slot_worktree]]. Lesson: before
`git commit` on the shared tree, CHECK for an in-progress cherry-pick
(`ls .git/CHERRY_PICK_HEAD`) -- committing into one absorbs your staged files + loses
attribution.

## ABSORPTION IS RECURRING -- precheck is INSUFFICIENT (2026-06-20, 2 of 3 commits)
Update: the precheck does NOT prevent it. On U-XRAY-PART-SURFACE-FINISHES the
`ls .git/CHERRY_PICK_HEAD` precheck was CLEAN, staging succeeded, then a fleet cherry-pick
automation RACED IN during the few seconds before/at `git commit` -- absorbing the commit
again (HEAD became an alpha commit; `git log --all --grep=PART-SURFACE-FINISHES` empty; but
`git show HEAD:...` carries the full code + 24/24 tests green). So 2 of 3 xray OCR commits this
session-pair landed LIVE but with attribution absorbed (only U-XRAY-SFC-NORMALIZE-LIVE
02b56c847f kept its own commit, by luck of timing). ROOT: the shared `cad-fusion-live-ms0`
tree runs an unpredictable cherry-pick automation; a precheck cannot win the race. REAL FIX
(operator/golf decision): either (a) commit xray work in the ISOLATED slot worktree
`H:/prism-slot-xray` on `slot/xray` (no shared cherry-pick races) -- but that branch is
divergent/stale for these OCR files (~65 lines behind, lacks U-PRINT-OCR-PDF), so it needs a
sync/rebase first; or (b) pause/serialize the shared-tree cherry-pick automation; or (c)
accept absorbed attribution (code IS delivered + green). Surfaced to operator for a decision.

## U-XRAY-PART-DEFAULT-FINISH (2026-06-21, commit 9c4bdc0986, CLEAN attribution) + COST-SAFETY LESSON
First cut INHERITED the part-level "all over / unless noted" finish onto each dimension's
`surface_finish_ra`. 2-arm scrutiny FAILED it (arm B, two P1s): `surface_finish_ra` is
COST/PROCESS-bearing -- `TolerancePricingImpactEngine` applies a 1.30x/1.10x quote multiplier
on it + `WireEDMPunchDieAdapterEngine` adds a 3rd trim pass when Ra<=0.4 + `TurningPrintIntakeEngine`
copies it to the lathe process target -- and NONE honor an "inherited" flag, so a derived
default would SILENTLY inflate a real quote / add a real machining pass, with no confidence
downgrade. **LESSON (R12/safety, fleet-wide): never silently mutate a cost/process-bearing field
from a DERIVED/INFERRED value. Expose it as an informational signal with provenance; a consumer
must opt in with operator-confirm + a confidence downgrade before applying it.** REDESIGN (shipped):
no dimension mutation -- expose the single unambiguous part finish as an OPTIONAL informational
`part_default_surface_finish` on BlueprintVisionResult (carries finish_system/assumed, zero cost
impact). Hardened `selectPartDefaultFinish`: ra_um>0 guard + tightened all-over regex (rejects
"all 4 holes"/"overall length"/"typical bore"; accepts "all over/surfaces/machined", "unless
(otherwise) noted/specified", "U.O.S.", location-absent). 34/34 vitest; re-scrutiny 2-arm BOTH
PASS no findings. The cost/WEDM readers see exactly the pre-unit surface_finish_ra (only drawn
values). Queued: a consumer that applies part_default_surface_finish with operator-confirm.
NOTE: ALSO confirms a CLEAN commit is achievable -- chained `git add && git commit` in ONE shell
call beat the cherry-pick race (vs the 2 earlier absorbed commits from separate calls).

## U-XRAY-PART-SURFACE-FINISHES (2026-06-20, LIVE in HEAD, attribution absorbed)
BlueprintVisionOCREngine was dropping the VLM's part-level `surface_finishes[]` array entirely
at the baseResult assembly. Added pure `mapSurfaceFinishCallout`/`mapSurfaceFinishes` +
`SurfaceFinishCallout` to `src/utils/surfaceFinishNormalize.ts` (reuse normalizeSurfaceFinish for
raw_text recovery) + additive optional `surface_finishes?` on `BlueprintVisionResult` + populated
at assembly. 24/24 vitest; 2-arm scrutiny BOTH PASS (2 P2 fixed: tolerant RawVisionResponse type
+ clone-divergence note). **ORPHAN-OUTPUT (R12, NOT delivered):** no consumer reads
`BlueprintVisionResult.surface_finishes` yet (WEDM-skim / lathe-intake / quote read a different
PDF-text-path shape). NEXT: wire one consumer -- best in-domain option is dimension-inherits-
part-default-finish ("63 RMS unless noted" -> dims lacking their own surface_finish_ra inherit it,
marked inherited) IN BlueprintVisionOCREngine; or cross-galaxy WEDM skim-pass count.
