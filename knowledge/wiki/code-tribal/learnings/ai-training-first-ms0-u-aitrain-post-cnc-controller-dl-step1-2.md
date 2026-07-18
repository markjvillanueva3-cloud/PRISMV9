# AI-TRAINING-FIRST-MS0/U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP1-2 — [MAIN] [AI-TRAINING-FIRST-MS0]/U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP1-2 (slot:india): corpus mining pipeline

**Commit:** `75e6ad694e55` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T10:52:20-05:00
**Tags:** ai-training-first-ms0, u-aitrain-post-cnc-controller-dl-step1-2, auto-distilled

## Subject
[MAIN] [AI-TRAINING-FIRST-MS0]/U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP1-2 (slot:india): corpus mining pipeline

## Body
```
[MAIN] [AI-TRAINING-FIRST-MS0]/U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP1-2 (slot:india): corpus mining pipeline

Steps 1+2 of the 4-step training_priority for CNCControllerDeepLearningEngine:
mine real Okuma OSP programs from JM-DIE corpus to produce a non-stub learned-
patterns ledger that the engine's (future) ingestLearnedPatterns() consumes.

ARTIFACTS (3 files, +2833 LOC):
  scripts/train-cnc-controller-from-corpus.mjs     pure-core extractor + CLI
  scripts/__tests__/<same>.test.mjs                56-case suite (node:test)
  data/state/learned-cnc-controller-patterns.json  LIVE LEDGER from JM-Die

LIVE EXTRACTION (JM DIE/MACRO PROGRAMS, 4 .min files mined):
  17 tool_slot_conventions   T010101 - OD ROUGH TURNING, etc.
  185 v_variable_idioms      VC100 = 1.32 (STOCK DIAMETER), etc.
  5 macro_labels             NAT1 G81, etc.
  schemaVersion: 1.0.0-DRAFT-no-consumer (engine consumer next sub-unit)

EXTRACTOR DESIGN:
  Pure-core + CLI-shell split — every regex/aggregate/mine fn exported, unit-
  tested without process state. Three deterministic extractors with digits=
  4/5/6 width tag for Okuma vs Fanuc disambiguation. aggregateLedger merges
  identical patterns across files: frequency + source_files[] (dedup, cap 16)
  preserves provenance. normalizeDescription (UPPER + collapse-WS + strip-
  trailing-punct) merges cosmetic variants (STOCK DIAMETER vs Stock Diameter).

HARDENING — all P0/P1 from 2-reviewer per-file scrutiny fixed:
  - 32 MiB per-file size cap (PRISM_TRAIN_CNC_MAX_BYTES) — OOM-safe
  - NUL-byte + heavy-U+FFFD sniff gate — rejects binary masquerade
  - .min REQUIRES Okuma signature match — no silent okuma_osp default
  - sanitizeSourceFile strips control bytes + path-traversal residue
  - DRAFT schemaVersion + schemaNote — producer/consumer R12 fail-loud
  - buildLedger throws on 3 empty surfaces (corpus / controller / extractor)
  - argv parser rejects flag-as-value, isMain guard Windows-safe

TEST SUITE — 56/56 pass via node --test:
  Hermetic tmpdir E2E for buildLedger/mineFile/main exit codes.
  Real-data E2E gated on JM DIE/MACRO PROGRAMS presence (PASS this run).
  Subprocess oracle (execFileSync) catches CLI-only regressions per the
  U-SLOT-BIND-ENFORCE lesson — hermetic fakes don't prove production wiring.
  Every P0/P1 fix encoded as a named regression oracle.

DEFERRED — U-AITRAIN-POST-CNC-CONTROLLER-DL-STEP3-4 (next sub-unit):
  Step 3 — CNCControllerDeepLearningEngine.ingestLearnedPatterns(jsonPath)
  Step 4 — Held-out inference verification (acceptance: non-stub from corpus)
  The DRAFT schemaVersion announces this ordering honestly per R7/R12.

R8 dedup-preflight: scripts/train-*.{mjs,ts} surveyed, none target
CNCControllerDeepLearningEngine, no overlap.
R11 conventions: ESM .mjs, JSDoc on public, __tests__/ companion location.
R12 fail-loud: every error path. No silentCatch.

Per-file scrutiny gate (mandatory pre-next-file):
  Reviewer A (code-analyzer) — PASS with 2 P1 — both fixed via rewrite.
  Reviewer B (reviewer) — FAIL with 3 P0 + 5 P1 — all fixed; test suite
  encodes every fix as a regression oracle. Per Karpathy R9 the 56/56 green
  run IS the verification.

ROADMAP — closes 2/4 acceptance steps of the unit; sibling unit DEFERRED
per honest scope. Next: U-AITRAIN-POST-POST-PROCESSOR-DEEP-LEARNING and
U-AITRAIN-POST-POST-PROCESSOR-META-LEARNING use the same extractor pattern.
```

## Files touched (4)
- .../state/learned-cnc-controller-patterns.json     | 2159 ++++++++++++++++++++
- .../train-cnc-controller-from-corpus.test.mjs      |  674 ++++++
- .../scripts/train-cnc-controller-from-corpus.mjs   |  Bin 0 -> 21266 bytes
- 3 files changed, 2833 insertions(+)

## Lessons surfaced in commit body
- lesson — hermetic fakes don't prove production wiring.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 75e6ad694e55`
- Milestone envelope: `mcp-server/data/milestones/AI-TRAINING-FIRST-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._