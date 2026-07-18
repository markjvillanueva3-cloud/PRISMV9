# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-TRAINSET-CURATE — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-TRAINSET-CURATE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: curate the clean supervised OCR/print-to-CAD trainset from all prints + CAD models

**Commit:** `c768306a6e8b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T21:12:19-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-trainset-curate, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-TRAINSET-CURATE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: curate the clean supervised OCR/print-to-CAD trainset from all prints + CAD models

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-TRAINSET-CURATE (slot:xray) [BOOTSTRAP-SLOT-ENFORCE]: curate the clean supervised OCR/print-to-CAD trainset from all prints + CAD models

Work order: continue OCR/blueprint training utilizing all prints + CAD models. R8 — consumes juliett's already-built pairing manifest (blueprint-training-pairs.jsonl, 76,205 parts); NEVER re-OCRs the 257K PDFs (soul-refuse). NO Ollama, NO PDF/CAD reads — pure streaming.

DECISIVE FINDING (ML garbage-in-garbage-out): train_eligible marks 4,245 parts, but the corpus' own match_confidence flags poison pairings (a print joined to the WRONG program/CAD answer-key). The clean supervised set is 3,941 (exact 1,983 + loose 1,958) — the 304-part gap is entirely poison-with-a-real-source (232 ambiguous + 4 garbage + ...) that train_eligible blindly counted. Training a dimension reader against a wrong key teaches it to emit values never on the print.

Live over all 76,205 parts: CLEAN 3,941 (5.17%) · POISON excluded 236 · unlabeled 72,028 · trainable subsets roundtrip_b(print+CAD)=350, print_program=3,941, triple=350. (Clean round-trip-B is 350, not the raw 498 — 148 print+CAD parts have untrustworthy/absent labels.) Curated trainset -> state/shared/blueprint-trainset-clean.jsonl (gitignored, regenerable); census -> blueprint-trainset-census.json.

- scripts/lib/blueprint-trainset-curate-lib.mjs (pure, 13 tests): isCleanLabel + curateRecord (fail-toward-exclusion: only exact/loose + real program/cad source kept; poison/unlabeled/unknown-confidence excluded with distinct reasons) + accumulate/finalizeCuration. Self-contained rows carry part_number_normalized + print_doc/program/cad locators (trainable standalone).
- scripts/blueprint-trainset-curate.mjs: streaming runner (51.8MB never whole-parsed), atomic write, --report-only, honest exit. census carries schemaVersion + mustHumanVerify.

Distinct from build-blueprint-cad-program-pairs.mjs (a PRODUCER that joins + emits coarse counts, confidence-agnostic) — this is a CONSUMER applying the curation fold the producer structurally cannot. Per-file 2-of-2 scrutiny PASS/PASS (reviewer P1 locator-thin + P2 schemaVersion both fixed in-session). 13/13 tests.
```

## Files touched (5)
- scripts/blueprint-trainset-curate.mjs              |  96 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/blueprint-trainset-curate-lib.mjs      | 147 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/blueprint-trainset-curate-lib.test.mjs | 144 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/blueprint-trainset-census.json        |  28 +++++++++++++++++++++++++
- 4 files changed, 415 insertions(+)

## Lessons surfaced in commit body
- tilizing all prints + CAD models. R8 — consumes juliett's already-built pairing manifest (blueprint-training-pairs.jsonl, 76,205 parts); NEVER re-OCRs the 257K PDFs (soul-refuse). NO Ollama, NO PDF/CAD reads — pure streaming.
- WRONG program/CAD answer-key). The clean supervised set is 3,941 (exact 1,983 + loose 1,958) — the 304-part gap is entirely poison-with-a-real-source (232 ambiguous + 4 garbage + ...) that train_eligible blindly counted. Training a dimension reader against a wrong key teaches it to emit values never on the print.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c768306a6e8b`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._