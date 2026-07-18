## blueprint-vision — slot:xray

### Current state

**Size:** 21,104 bytes / 164 lines.

**Quality grade: EXCELLENT**

The existing galaxy CLAUDE.md is the strongest example in the assessment set so far. It was fully asset-verified by 3 parallel inventory agents on 2026-05-29, correcting a 21-engine hallucination class from the alpha seed. All engine names, dispatcher actions, and paths are either confirmed on disk or explicitly marked "unconfirmed — route via the action." No fabricated content found.

Specific notes:
- PROVENANCE block (line 6) is exemplary: it documents the seed-hallucination event, mandates Glob/Grep before enshrining any name, and cites the correction date and method.
- The STEP backing-engine caveat (line 25: "engine class name unconfirmed — route via the action") is exactly the right R12-honest handling.
- The "96% multi-print containers" figure is correctly flagged as unverified and replaced with the concrete counts from the docustrata pipeline (8,154 → 36,638).
- Confidence thresholds are correctly reconciled: the seed's 0.85/0.95/0.99 tiers are marked uncorroborated; the verified operative floor (0.70 from PRINT-TO-INSPECTION-PIPELINE-V2) is cited.
- Cross-file consistency: CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md, GSD_BLUEPRINT_VISION.md, SOUL.md, and AWARENESS.md are all present and mutually consistent. The companion files cover what CLAUDE.md omits (full path atlas in PATHS.md, tool-call patterns in TOOLBELT.md, full lifecycle in GSD, algorithm primitives in MEMORY.md).

Minor staleness risks:
- The `## Cross-cutting methodology` section (lines 139–164) duplicates fleet-wide operational context (Ollama model tags, hardware specs, loop discipline, vault, LoRA/CAG/RAG) that was auto-wired into TOOLBELT.md's `OPERATIONAL CONTEXT` block via `scripts/wire-galaxies-to-operational-context.mjs`. Two sources of the same content will drift. The CLAUDE.md copy is the stale candidate.
- The `<!-- AI-SYSTEMS-STATE:BEGIN -->` block (lines 151–158) is a pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` and a regen command — zero load-bearing doctrine. It appears verbatim in MEMORY.md too (lines 163–170). One canonical location is enough.
- The `<!-- CRITIC-KEEPWORKING-STANZA -->` block (lines 160–165) is a pointer to global CLAUDE.md R6 + R12. Pure pointer, not domain content. Valuable as a reminder stanza but could be compressed to one line.
- The `## Closed-loop integration with india` section (lines 119–137) is fleet-wide boilerplate (all 34 galaxies have it via `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`). A one-line pointer + the xray-specific `xproc_outcome_publish {slot:'xray'}` call is sufficient.

---

### KEEP

All of the following are accurate, load-bearing, and domain-specific — retain verbatim:

1. **`## What lives here`** (lines 8–46) — the complete, asset-verified engine + format inventory with the provenance discipline note. This is the definitive engine roster for xray. Keep every sub-section: OCR engines, GD&T/tolerance chain, native parsers, feature recognition, orchestration/corpus, multi-print PDF discipline.

2. **`## Dispatcher surface`** (lines 49–58) — the full verified action list across `cadDispatcher`, `businessDispatcher`, `qualityDispatcher`, `camDispatcher`, `cadDrawingKnowledgeDispatcher`, `resourceExtractionDispatcher`, `sessionDispatcher`. This is the daily routing table for xray; losing it means re-deriving it every session.

3. **`## Anti-patterns (xray refuses)`** (lines 61–70) — the eight domain-specific refuses. Every item is validated by a shipped gate or a real corpus failure. This list is what differentiates a blueprint-vision CLAUDE.md from a generic one.

4. **`## Karpathy 5-step for vision/extraction work`** (lines 72–78) — the domain-adapted CLASSIFY/TECHNIQUE/EDGE CASES/FAILURE MODES/THEN WRITE expansion. Concise, specific, not derivable from the fleet-wide generic version. Keep as-is.

5. **`## Synergy — VLM-ensemble IS xray's octopus`** (lines 80–86) — the multi-VLM ensemble pattern specific to this galaxy (≥2-agree = corroborated, N-agreement → confidence, cost-routing via india). This is xray's domain-specific instantiation of the fleet octopus pattern.

6. **`## Related galaxies (PSN edges)`** (lines 88–97) — the consumer/producer graph (delta, kilo, charlie, foxtrot/whiskey/mike, india, victor, lima, juliett). Critically: the juliett asymmetric-edge advisory (line 97) is a live TODO that must not be lost.

7. **`## Wiki cross-refs`** (lines 99–108) — the verified-on-disk wiki entry list including the critical "seed-named-but-MISSING" warning. This prevents re-creating phantom wiki links. Keep the MISSING list.

8. **`## Bridges OUT`** (lines 110–115) — the four canonical exit routes for extracted data. Compact and critical for every extraction session.

9. **`<!-- CRITIC-KEEPWORKING-STANZA -->`** (lines 160–165) — useful per-turn reminder. Keep but compress to 3 lines (just the pointer; doctrine lives in global CLAUDE.md).

---

### DROP

The following are generic/duplicated/stale and waste tokens every session load:

1. **`## Cross-cutting methodology`** (lines 139–149) — 11 lines of fleet-wide operational context (PC specs, Ollama model tags, loop discipline, vault paths, LoRA/CAG/RAG orchestration). This EXACT content is auto-wired into `TOOLBELT.md §OPERATIONAL CONTEXT` by `scripts/wire-galaxies-to-operational-context.mjs` and is already present there. Keeping it in CLAUDE.md creates a second copy that will drift. Replace with: `> Operational context (PC/Ollama/loops/vault/LoRA-CAG-RAG): see TOOLBELT.md §OPERATIONAL CONTEXT.`

2. **`<!-- AI-SYSTEMS-STATE:BEGIN -->` block** (lines 151–158) — a pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` with a regen command. Zero domain content. Appears identically in MEMORY.md (lines 163–170). One location is enough; drop from CLAUDE.md (keep in MEMORY.md where it lives alongside the synthesis brain it describes).

3. **`## Closed-loop integration with india`** (lines 119–137) — entirely fleet-standard boilerplate. Every galaxy has the same four bullet points (`xproc_outcome_publish`, `xproc_kg_project_features`, `prism_knowledge:tribal_capture`, `xproc_calibration_monitor_record`) via `PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`. The only domain-specific part is `{slot:'xray', domain:'blueprint-vision'}`. Compress to: `**Closed-loop (india):** publish via \`xproc_outcome_publish {slot:'xray', domain:'blueprint-vision'}\`; tribal capture via \`prism_knowledge:tribal_capture slot=xray\` (never direct markdown writes). Full protocol: \`state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md\`.`

**Token savings from these three drops: ~40 lines / ~2,500 bytes per session.**

---

### ADD (domain-specific — the heart of this assessment)

The current CLAUDE.md is already strong, but these domain-critical items are absent or only partially covered:

**1. OCR corpus live state (HIGH PRIORITY — xray's primary active workstream)**

The 2026-06-10 session (MEMORY.md lines 138–143) discovered the single highest-ROI unbuilt fix: `qwen2.5vl:7b` runaway-JSON dropout causes ~30-37% of prints to be dropped (1-survivor → print excluded). The fix (`format:"json"` in `ollama-vision-extract-lib.mjs:408`) is not yet in CLAUDE.md. Add:

```
## OCR corpus — live state + highest-ROI open fix (2026-06-10)
- **Pipeline:** `scripts/blueprint-ocr-training-loop.mjs` + `scripts/lib/ocr-training-loop-lib.mjs`. 3 phases: CALIBRATE → WEAK-LABEL → EMIT `trainset.jsonl` (for india LoRA). Resumable cursor.
- **Production task:** `PRISM OCR Training Loop` (Windows Scheduled Tasks; worklist `corpus-worklist-drawing.txt` ~7,794 drawing prints).
- **Tier floors:** gold ≥0.85 / silver ≥0.65 / bronze ≥0.45. Trainable = gold|silver (both VLMs agree). 2-model pin is EMPIRICALLY CORRECT — `llama3.2-vision:11b` returns empty 100% (tested 2026-06-10, 0/32 prints). Do NOT add a 3rd VLM.
- **TOP ROI FIX (NOT YET BUILT):** `qwen2.5vl:7b` generates runaway repetitive blobs (~480 lines, 73s, hits `num_predict:4096` mid-structure → malformed JSON → parse-fail dropout). ~30-37% of prints dropped this way. Fix: add `format:"json"` constrained decoding to `ollama-vision-extract-lib.mjs:408` → all callers (`run-ollama-vision-extract` → `vision-ensemble-fuse`). A/B gate required before promoting; test + 3-of-3 (OCR = safety-relevant). [[reference_xray_ocr_yield_mechanics_2026_06_10]]
- **Calibration:** currently `reliable:false` (<50 samples, n≈24). Calibration is under-powered — do NOT trust the isotonic curve for safety gates until re-run with ≥200 samples.
```

**2. Ground-truth stratification (safety-relevant, missing from main CLAUDE.md)**

The GSD_BLUEPRINT_VISION.md (Stage 6) defines a 4-tier ground-truth hierarchy that governs what extraction results can feed downstream: `confirmed` (ERP-shipped + measured) > `produced` > `quoted` > `inferred`. Historical S/F + dims from amateur programs are DATA, not ground truth. This rule is safety-relevant (a `confirmed` extraction gate feeds `prism_cam:print_to_program_full` which drives machines). It belongs in CLAUDE.md as a standing rule, not only in the GSD. Add:

```
## Ground-truth stratification (safety-relevant)
4-tier: `confirmed` (ERP-shipped + measured) > `produced` > `quoted` > `inferred`.
Historical S/F data + dims from amateur programs = DATA, not ground truth.
No extraction is ground truth without operator-confirm or a confirmed ERP match.
Engines: `GroundTruthRegistryEngine` + `GroundTruthValidationEngine` — EXTEND, never recreate.
```

**3. LoRA anonymization blocklist (safety/compliance — missing from CLAUDE.md)**

GSD Stage 7 lists the blocklisted customers for LoRA export. This belongs in CLAUDE.md as a refuse, not buried in GSD. Add to the `## Anti-patterns` list:
```
- **LoRA/training export without anonymization** — scrub customer names, part numbers, program content before ANY file leaves local FS. Blocklist: ITW, OPTIMAS, SFS, HOLO-KROME, ALCOA, Continental Midland.
```

**4. Key hooks (currently only in PATHS.md)**

The three domain-specific Stop/PreToolUse hooks are only discoverable from PATHS.md. A blueprint-vision chat that hasn't read PATHS.md will unknowingly trigger them. Add a one-line hook registry:

```
## Active domain hooks (xray-owned gates)
- `.claude/hooks/blueprint-accuracy-guard.mjs` — HARD-BLOCKS on >20% conformal-bound widening (knob: `PRISM_BLUEPRINT_DRIFT_WIDEN_PCT`, default 20).
- `.claude/hooks/blueprint-coverage-floor-guard.mjs` — enforces min coverage floor.
- `.claude/hooks/blueprint-join-index-stale-check.mjs` — flags stale blueprint↔program join.
- `.claude/hooks/cost-bridge-on-pdf-extract.mjs` — bridges PDF-extract → charlie's quote pipeline.
```

**5. STEP AP203/AP214 GD&T side-channel rule (currently only in GSD)**

GSD Stage 7 contains a critical contract: "STEP AP203/AP214 carry geometry ONLY (no GD&T) — GD&T survives via the orchestrator side-channel, never assume the format carries it." This is a daily extraction mistake class that should be in CLAUDE.md anti-patterns, not only in GSD. Add to `## Anti-patterns`:
```
- **Assuming STEP carries GD&T** — STEP AP203/AP214 carry geometry ONLY. GD&T survives via the `PrintToCADOrchestratorEngine` side-channel. Never assume the format carries it.
```

**6. JM Die print corpus quick-ref (daily use, not in CLAUDE.md)**

Every extraction session starts with a corpus lookup. The three canonical corpus locations (from PATHS.md) should appear in CLAUDE.md so xray doesn't need to open PATHS.md for the most common task:
```
## JM Die print corpus (search before extracting)
- `H:/PRISM/JM DIE/PRISM CAD TESTING/` — test fixture prints (canonical: `PRISM_2475-037_Extrude_Punch Drawing v1.pdf`)
- `H:/PRISM/JM DIE/REVERSE ENGINEERING/` — ~36 mixed CAD/blueprint samples (12 .ipt, 8 .idw, 4 .jpg, 3 .stp, 2 .dxf)
- `H:/PRISM/JM DIE/Prism JM Die/` — 406 customer subdirs (program corpus)
- `H:/PRISM/Docustrata/JMD Scans` + `JMD Laser Sheets` — business scan corpus (257,992 files; search `manifest.json` + `.index/`, NEVER re-OCR)
- Dedup gate: `prism_data:database_search` against `JMDieDocuStrataDB` (111,745 entries) before any extraction.
```

**7. Vision A/B benchmark infrastructure (unbuilt gap)**

The `scripts/bench-vision-ocr-ab.mjs` + `scripts/lib/vision-ab-compare.mjs` (44 tests, built 2026-06-03) are the gating mechanism for VLM upgrades but have never run against real data (waiting for a quiet fleet). This is a standing gap that any xray session needs to know about. Add a one-line note under the OCR state section.

**8. Synthesis brain pollution warning (active mislead)**

MEMORY.md (lines 138) documents that `knowledge/memories/patterns/blueprint-vision_synthesis.md` is POLLUTED with post-processor/holder/Fusion content from off-domain BM25 recall. A xray chat that runs `prism_memory:semantic_search` and trusts the synthesis blind will load wrong domain context. Add to CLAUDE.md:
```
⚠ `knowledge/memories/patterns/blueprint-vision_synthesis.md` is POLLUTED (as of 2026-06-10 — off-domain BM25 results from generic galaxy vocab queries; see [[reference_xray_synthesis_pollution_2026_06_10]]). Trust THIS CLAUDE.md + MEMORY.md over the synthesis brain until re-synthesized. Fix owned by sierra/india.
```

---

### IDEAL SECTION OUTLINE

The ordered sections this galaxy CLAUDE.md should have (nothing else needed but the universal-core pointer):

```
1. SCOPE + PROVENANCE (current §header + "What lives here" intro — keep)
2. ENGINE INVENTORY — OCR + PDF + GD&T + native parsers + feature-recog + orchestration (keep, verbatim)
3. DISPATCHER SURFACE — action routing table (keep, verbatim)
4. JM DIE PRINT CORPUS QUICK-REF (ADD — daily use, currently only in PATHS.md)
5. ACTIVE DOMAIN HOOKS (ADD — gates xray must know about)
6. EXTRACTION ANTI-PATTERNS / REFUSES (keep + ADD 2 new items: STEP-GD&T side-channel, LoRA anon blocklist)
7. KARPATHY 5-STEP FOR VISION/EXTRACTION (keep, verbatim)
8. CONFIDENCE THRESHOLDS + GROUND-TRUTH STRATIFICATION (ADD ground-truth 4-tier to complement existing thresholds)
9. OCR CORPUS LIVE STATE + TOP ROI FIX (ADD — the active workstream state)
10. VLM-ENSEMBLE AS DOMAIN OCTOPUS (keep, verbatim)
11. RELATED GALAXIES + PSN EDGES (keep, verbatim)
12. WIKI CROSS-REFS (keep, verbatim — including the MISSING list)
13. BRIDGES OUT (keep, verbatim)
14. SYNTHESIS BRAIN POLLUTION WARNING (ADD)
15. CLOSED-LOOP (compress to 3 lines — xray slot + pointer)
16. CRITIC + KEEP-WORKING STANZA (compress to 3 lines — pointer to global rules)
17. UNIVERSAL-CORE POINTER (see below)

DROP: §Cross-cutting methodology (→ TOOLBELT.md), §AI-SYSTEMS-STATE block (→ MEMORY.md only)
```

---

### UNIVERSAL-CORE POINTER

The following universal rules must remain available to slot:xray but should NOT be duplicated in the galaxy CLAUDE.md. A single pointer block at the end of the file is sufficient:

```markdown
## Universal operating rails (do NOT duplicate — pointer only)
> Full doctrine lives in `H:/prism/CLAUDE.md`. The rules every xray session inherits:
> - **R1–R15** (Karpathy 4 + agent-era 9): especially R8 (read before write), R9 (tests verify intent), R12 (fail loud), R13 (comprehensive route), R15 (wire→test→validate→all-galaxies).
> - **Scrutiny gate 3-of-3** (`node .claude/scripts/scrutiny-3way.mjs`) + per-file 2-arm review for multi-file builds.
> - **Per-chat handoff** (`per-agent-handoff.mjs write/read`) — topic suffix mandatory; never `state/HANDOFF.md`.
> - **Commit format** `[SCOPE]/U-ID: title`; slot:xray commits on `slot/xray` branch in `H:/prism-slot-xray`.
> - **Units-first** — detect inch vs mm from source (STEP `CONVERSION_BASED_UNIT`) before ANY geometry work. JM Die STEP files are often inch.
> - **No-stub engines** — hook blocks placeholder returns.
> - **duplicationGuardEngine.mustCheckBeforeCreating()** — THROWS on duplicates; run before any new engine/hook/skill.
> - **ENGINE_DIGEST.md** — check before creating new engines (`mcp-server/data/docs/ENGINE_DIGEST.md`).
> - **Honesty rules** — verify a symbol before claiming it exists (cite file:line); "I don't know" beats a confident guess.
```

These rules are already enforced by hooks (scrutiny gate, duplication-hard-block, comprehensive-build-enforce) so they need not be prose in the galaxy CLAUDE.md — the pointer + hook enforcement is sufficient.

---

_Assessment by: subagent (claude-sonnet-4-6) | date: 2026-06-13 | source files verified: CLAUDE.md (21,104B/164L), MEMORY.md, PATHS.md, TOOLBELT.md, SOUL.md, AWARENESS.md, GSD_BLUEPRINT_VISION.md._
