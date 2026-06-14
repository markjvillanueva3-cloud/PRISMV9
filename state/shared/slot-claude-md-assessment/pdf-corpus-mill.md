# pdf-corpus-mill — fleet-managed

## Current state

**Size:** CLAUDE.md = ~83 lines / ~4.1 KB. MEMORY.md = ~94 lines / ~3.8 KB.

**Quality grade: PARTIAL**

The current CLAUDE.md is a lightly-populated Ollama-distillation stub (auto-generated 2026-06-09 by `fill-galaxy-claudemd-domain.mjs`) that carries several concrete problems:

1. **Fabricated / wrong engine list.** The "Key engines" block lists 12 engines (e.g. `AdaptiveMillingChipLoadMonitorEngine`, `CADCorpusIngesterEngine`, `CADCorpusIngestionEngine`, etc.) that are **mill-galaxy or CAD-corpus engines**, NOT pdf-corpus-mill engines. The pdf-corpus-mill directory contains ZERO `.ts` files — verified by `ls`. These engine names were keyword-matched from the global engine pool and copied verbatim, giving a false impression of local ownership.
2. **Slot attribution drift.** Header says "Canonical slot: foxtrot (de-facto)" but SOUL.md correctly identifies it as `slot: (none)` — a **slotless fleet-shared infra galaxy**. Foxtrot owns the mill galaxy that CONSUMES this corpus, not this galaxy itself.
3. **Ollama model tags use retired retired :3b/:7b/:14b pattern.** The cross-cutting methodology block (auto-wired) still references the pattern but correctly avoids naming retired tags; however the block as a whole is generic boilerplate not tuned to the actual pdf-corpus-mill workflow (pypdf extraction runs Python, not TS).
4. **"Domain knowledge" prose is vague and AI-hallucinated.** The sentence "Key components include various engines such as AdaptiveMillingChipLoadMonitorEngine and CADCorpusIngesterEngine, which process and organize this data" is incorrect — those engines belong to other galaxies.
5. **No dispatcher surface listed.** TOOLBELT.md placeholder says "owning slot lists the domain's prism_* dispatcher actions here" — never filled in. MEMORY.md correctly notes the dispatcher surface is inherited: `prism_dev:pdf_pipeline_*` + `prism_resource_extraction`, but CLAUDE.md does not carry this.
6. **No pipeline invocation pattern.** The canonical extraction command (`scripts/extract-jm-die-corpus-page-by-page.py` via lima pypdf) and the mill-bridge emitter (`scripts/generate-milling-extracted-pdf-bridge.mjs`) are only in MEMORY.md, absent from CLAUDE.md.
7. **Tribal pointers are mill-general, not pdf-extraction-specific.** `machining-tactics-climb-vs-conventional-milling.md` is a mill physics pointer irrelevant to PDF extraction work.

**Stale/inaccurate citations:**
- PATHS.md lists 231 name-matched engines as "verify ownership" — honest disclaimer, but CLAUDE.md re-uses a 12-engine sample from that unverified list without the disclaimer, which reads as authoritative.

---

## KEEP

The following content is accurate and load-bearing; retain in the galaxy CLAUDE.md:

- **§Scope** (lines 5-6): correctly states the galaxy's boundary — mill-specific PDF extraction + page-level entries for Haas/Hurco/Mazak Matrix manuals. Accurate and token-lean.
- **§Cross-galaxy edges** (lines 8-9): `pdf-corpus (parent) ↔ mill (consumer) ↔ post-processor (dialect mining)`. Accurate and critical for any work in this galaxy.
- **§Cross-cutting methodology — Loops paragraph** (line 63): "mill-manual extraction `/loop` (resumable cursor)" is a real operational pattern for this galaxy.
- **§Obsidian vault pointer** (line 65): `prism_memory:semantic_search query="pdf-corpus-mill" topK=20` — correct recall entry.
- **§Critic + keep-working contract** (lines 79-83): universal doctrine pointer — keep as pointer, not body.
- **§AI-systems fleet state pointer** block: correct pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md`.
- **SOUL.md §Refuses**: the 5 domain-specific refuses are excellent and accurate:
  - `claiming-extraction-complete-without-page-count`
  - `publishing-unverified-macro-syntax`
  - `overwriting-original-manuals-in-repo`
  - `ignoring-controller-specific-dialect`
  - `exposing-proprietary-operator-data-publicly`
  These should be promoted into CLAUDE.md (currently only in SOUL.md).
- **MEMORY.md §Standing patterns / invariants**: the 4 invariants (inherit-not-fork, provenance, no-re-OCR, no-inline-constants) are accurate and operationally critical — promote to CLAUDE.md.

---

## DROP

Remove or externalize the following from CLAUDE.md (token waste / inaccurate):

1. **§Key engines block** (lines 18-31) — entire block. Every engine listed belongs to mill or cad-corpus galaxies. This galaxy has no `.ts` files. Replace with a one-line truth: "No local engines — machinery lives in `engines/pdf-corpus/` (parent)."
2. **§High-ROI domain memories** (lines 33-38) — these are mill-galaxy memories (foxtrot ownership, mill atlas, mill awareness surface), not pdf-corpus-mill specific. Foxtrot attribution belongs in mill/CLAUDE.md.
3. **§Tribal pointers** (lines 40-43) — `machining-tactics-climb-vs-conventional-milling.md` and `tooling-endmill-flute-helix-corner.md` are mill-physics tribal, irrelevant to PDF extraction. Replace with extraction-specific pointers.
4. **§Domain knowledge prose** (lines 14-16) — the Ollama-distilled free-text paragraph is inaccurate (wrong engine names) and superseded by the structured sections. Drop entirely.
5. **`<!-- GALAXY-CLAUDEMD-FILL:BEGIN/END -->` wrapper** — the auto-fill scaffolding comment wrapping inaccurate content. Remove or re-fill with accurate content.
6. **Long generic cross-cutting methodology block** — the PC-specs / Loops / LoRA / CAG / RAG prose in the cross-cutting lane is 15+ lines of fleet-wide doctrine duplicated from main CLAUDE.md. Replace with pointer to `TOOLBELT.md §OPERATIONAL CONTEXT` which already carries this correctly.

---

## ADD (domain-specific — the heart of this assessment)

### True nature of this galaxy (must be explicit)
pdf-corpus-mill is a **pure filter/view galaxy with NO local TypeScript engines**. It is the mill-domain-tagged subset of the pdf-corpus parent pipeline. Every extraction engine lives in `mcp-server/src/engines/pdf-corpus/` (parent). This galaxy's job is: (1) filter the pypdf extraction output to mill-relevant content, (2) emit page-indexed mill tribal entries, (3) serve as the addressable corpus for the mill galaxy and post-processor dialect mining.

### Canonical pipeline (verified paths)
```
Source PDFs (H:/PRISM/resources/PDF + JM DIE manual subtrees)
  ↓
scripts/extract-jm-die-corpus-page-by-page.py  ← lima pypdf (CANONICAL extractor)
  Output: mcp-server/data/tribal/jm-die-corpus-pages.jsonl
  ↓ (filter: source tags Haas|Hurco|Mazak|mill|WinMax|Matrix)
scripts/generate-milling-extracted-pdf-bridge.mjs  ← mill-scoped emitter (2026-05-26)
  Output: mill page entries → mill galaxy tribal input
```
Do NOT use heading-anchor parsing. Do NOT re-OCR. `feedback_use_lima_pypdf_page_extractor.md` explains why (76× deeper coverage).

### Verified source PDFs (from MEMORY.md + PATHS.md, existence-confirmed)
- `H:/PRISM/resources/` — WinMax Mill CUTTER COMPENSATION.pdf, WinMax Mill RECOVERY AND RESTART.pdf (Hurco WinMAX mill control)
- `H:/PRISM/resources/PDF/` — Haas mill operator manuals, Mazak Matrix mill references (per RESOURCES-INDEX.md)
- `H:/PRISM/JM DIE/` — in-house Haas/Hurco programs and controller references (38,251-file archive, indexed at `mcp-server/data/jm-die-database/`)

### Inherited dispatcher surface (verified in MEMORY.md; no pdf-corpus-mill-specific dispatcher exists — do NOT invent one)
- `prism_dev:pdf_pipeline_classify` — classify a PDF by domain/controller
- `prism_dev:pdf_pipeline_extract` — run extraction pass on a source
- `prism_dev:pdf_pipeline_read` — read extracted page entries
- `prism_dev:pdf_pipeline_summary` — summarize an extraction run
- `prism_resource_extraction` — resource extraction surface (parent corpus)
- `prism_data:database_search` / `database_list` / `globalSearch` — query the jm-die-database corpus
- Query extracted output: filter `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` by source tags

### Controller-specific extraction rules (domain safety)
- **Haas**: extract alarm codes, macro B variable declarations (`#100-#149` local, `#500-#599` global), G65/G66 subprogram calls. Flag any feed/speed recommendation as imperial (G20 context is Haas-default for JM Die).
- **Hurco WinMAX**: coolant block is 4-char max — do NOT transfer hyperMILL 6-char coolant blocks to WinMAX without truncation (`feedback_foxtrot_hypermill_coolant_block_hurco`). Extract conversational vs. G-code mode differences.
- **Mazak Matrix**: extract MAZATROL vs. EIA/ISO mode distinctions; per-manual page context is essential because Matrix syntax differs materially from standard Fanuc.
- **Units discipline**: ALL JM Die mill programs are INCH (G20). Extracted feed/speed values from manuals must be tagged with the unit stated in the source document — never assume metric even for Mazak Matrix (verify from `G20`/`G21` or title-block).

### What NOT to do in this galaxy
1. Do NOT create new `.ts` engine files here — this galaxy has no local engines by design. Engine work goes to `engines/pdf-corpus/` (parent) or `engines/mill/` (consumer).
2. Do NOT re-OCR already-indexed corpora. `H:/PRISM/Docustrata` (257,992 files) and `H:/PRISM/JM DIE` are already indexed — search the manifest/index first (`mcp-server/data/jm-die-database/`).
3. Do NOT invent a `pdf-corpus-mill`-specific MCP dispatcher. The inherited `prism_dev:pdf_pipeline_*` + `prism_resource_extraction` surface is sufficient; adding a parallel dispatcher creates orphaned routing debt.
4. Do NOT use heading-anchor or chapter-boundary PDF parsing — pypdf page-by-page is the canonical method.
5. Do NOT emit tribal entries without source PDF path + page number + extraction date provenance (SOUL.md refuse: `claiming-extraction-complete-without-page-count`).
6. Do NOT publish macro syntax (Haas macro B, WinMAX conversational) without controller-version verification — version-specific syntax differences cause real machine errors (`publishing-unverified-macro-syntax`).

### Tribal gotchas (promote from MEMORY.md failure modes)
- **HyperMILL → Hurco WinMAX coolant block**: 4-char block max; cross-post coolant transfer breaks V11 silently. Extraction must flag this per-page.
- **Mazak Matrix page-ordering**: manual PDFs are sometimes non-sequential (appendices interleaved). pypdf page index != manual section number — always tag with PDF page number, not section number.
- **Haas macro B variable scope**: `#100-#149` are local (cleared on subprogram exit), `#500-#599` are global (persist across power cycles). Extraction of macro examples must tag scope or they become dangerously misleading tribal entries.

### Canonical resources for this galaxy
- `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` — primary extraction output (filter for mill source tags)
- `mcp-server/data/jm-die-database/` — full JM Die indexed corpus (manifest + .index/*.jsonl)
- `H:/PRISM/resources/RESOURCES-INDEX.md` — resource trove index (find new mill PDFs here first)
- `knowledge/memories/patterns/pdf-corpus-mill_synthesis.md` — Obsidian synthesis brain
- `knowledge/wiki/pdf-corpus-mill/` — 4 wiki entries (query before re-deriving)
- `knowledge/wiki/code-tribal/milling/milling-pdf-corpus.md` — verified tribal pointer
- `scripts/generate-milling-extracted-pdf-bridge.mjs` — mill-scoped bridge emitter
- `scripts/extract-jm-die-corpus-page-by-page.py` — lima canonical extractor

---

## IDEAL SECTION OUTLINE

The galaxy CLAUDE.md should contain exactly these sections (in order):

1. **Header** — 2-line identity: what this galaxy IS (filter/view, no local engines) + slot (fleet-managed, no dedicated slot).
2. **Scope** — keep current content; add explicit "no local .ts files" statement.
3. **Cross-galaxy edges** — keep current; add data-flow direction (parent→filter→consumer).
4. **Canonical pipeline** — pypdf extractor → mill-filter → bridge emitter. Verified paths only.
5. **Source PDF inventory** — where the PDFs live (resources/PDF, JM DIE manual subtrees), how to find new ones (RESOURCES-INDEX.md).
6. **Inherited dispatcher surface** — `prism_dev:pdf_pipeline_*` + `prism_resource_extraction` + `prism_data:database_*`. One line each. No invented actions.
7. **Controller-specific extraction rules** — Haas (macro B scope, imperial), Hurco WinMAX (coolant 4-char, conversational), Mazak Matrix (MAZATROL vs EIA/ISO). Safety-critical section.
8. **Standing invariants** — the 4 invariants from MEMORY.md (inherit-not-fork, provenance, no-re-OCR, no-inline-constants) + the 5 SOUL.md refuses promoted here.
9. **What NOT to do** — the 6 prohibitions above (no local engines, no re-OCR, no invented dispatcher, no heading-anchor parsing, no provenance-free entries, no unverified macro syntax).
10. **Tribal gotchas** — 3 verified gotchas (coolant block, Mazak page-ordering, Haas macro scope).
11. **Canonical resources** — 8 verified paths (listed above).
12. **Universal-core pointer** — single line referencing main CLAUDE.md.
13. **AI-systems fleet state pointer** — keep current pointer block (accurate).

---

## UNIVERSAL-CORE POINTER

The following universal rules must remain accessible but NOT duplicated in this galaxy file. Reference them as a single pointer line:

> **Universal doctrine:** `H:/PRISM/CLAUDE.md` — R1-R15 (Karpathy discipline + agent-era rules), scrutiny 3-of-3 gate, per-chat handoff protocol, commit format `[SCOPE]/U-ID: title`, units-first safety rail, no-stub-engine enforcement, RTK bash prefix, Ollama fallback ladder (Ollama → Sonnet → Opus), token economy, multi-chat lane discipline.

Sections from main CLAUDE.md that are NOT needed in this galaxy file (already universal and loaded fleet-wide):
- Full R1-R15 text (pointer suffices)
- Scrutiny gate procedure (pointer suffices)
- Per-chat handoff command syntax (pointer suffices)
- Full Ollama model routing table (pointer to TOOLBELT.md §OPERATIONAL CONTEXT suffices)
- FLEET-REAPER, NN-GRAPH MS0/MS1/MS2 milestone prose (irrelevant to extraction work)
- DOMAIN-GALAXY-DOCTRINE milestone prose (irrelevant to extraction work)
- Golf slot doctrine (irrelevant — this is a fleet-managed, not golf-managed galaxy)
- Any other milestone-completion prose for non-pdf-corpus-mill milestones
