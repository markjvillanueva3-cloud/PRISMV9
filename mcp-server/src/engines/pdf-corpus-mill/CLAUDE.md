# pdf-corpus-mill Galaxy — fleet-managed (no dedicated slot)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = pdf-corpus-mill domain doctrine ONLY; never re-inline universal prose.

---

## §1 — Domain scope + slot identity

**Owns:** mill-specific PDF corpus extraction — page-level entries for Haas/Hurco WinMAX/Mazak Matrix
operator manuals and macro programming references. Pure filter/view over the `pdf-corpus` parent pipeline.

**EXCLUDES:** mill physics / toolpath engines → `engines/mill/`; generic PDF extraction engines →
`engines/pdf-corpus/`; G-code emission → `engines/post-processor/`.

**Slot:** fleet-managed — NO dedicated slot, NO local `.ts` files. Any slot may work here; claim via
`/pick-unit` + heartbeat. Engine code lives in `engines/pdf-corpus/` (parent).

---

## §2 — Verified engines

This galaxy contains **zero local TypeScript engines** (confirmed: `Glob engines/pdf-corpus-mill/**/*.ts`
returns empty). All extraction machinery lives in the parent:

| role | location |
|------|----------|
| Extraction engine(s) | `mcp-server/src/engines/pdf-corpus/` (parent — read those files) |
| Mill corpus consumer | `mcp-server/src/engines/mill/` (consuming galaxy) |
| Dialect miner | `mcp-server/src/engines/post-processor/` (Haas/Mazak dialect mining) |

Do NOT create new `.ts` files here. Engine work → `engines/pdf-corpus/` or `engines/mill/`.

---

## §3 — Dispatcher quick-ref

No `pdf-corpus-mill`-specific dispatcher exists — do NOT invent one. Use inherited surfaces:

| dispatcher | action | use |
|------------|--------|-----|
| `prism_dev` | `pdf_pipeline_classify` | classify a PDF by domain/controller |
| `prism_dev` | `pdf_pipeline_extract` | run extraction pass on a source PDF |
| `prism_dev` | `pdf_pipeline_read` | read extracted page entries |
| `prism_dev` | `pdf_pipeline_summary` | summarize an extraction run |
| `prism_resource_extraction` | *(see resourceExtractionDispatcher.ts)* | parent corpus extraction surface |
| `prism_data` | `database_search` | query jm-die-database corpus |
| `prism_data` | `database_list` | list available database collections |

**MCP-down fallback:** filter `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` directly by source tags
(`Haas|Hurco|Mazak|mill|WinMax|Matrix`).

---

## §4 — Canonical constants + data paths

**No physics constants apply here** — this galaxy does NOT compute feeds/speeds/forces. Never inline
machining constants. If an extracted page contains speed/feed values, tag them with the source unit
(imperial vs metric) from the PDF context; do not convert or treat them as physics inputs.

| store | path | access rule |
|-------|------|-------------|
| Extraction output | `mcp-server/data/tribal/jm-die-corpus-pages.jsonl` | filter by source tag; NEVER full-scan without tag filter |
| JM Die corpus index | `mcp-server/data/jm-die-database/` | query via `prism_data:database_search`; NEVER `Glob` the 38K-file tree |
| Resource trove index | `H:/PRISM/resources/RESOURCES-INDEX.md` | check here first before crawling `H:/PRISM/resources/PDF/` |
| Synthesis brain | `knowledge/memories/patterns/pdf-corpus-mill_synthesis.md` | recall via `prism_memory:semantic_search query="pdf-corpus-mill" topK=20` |

---

## §5 — Domain gotchas / safety rails

1. **JM Die = INCH (G20) by convention.** Extracted feed/speed values from Haas/Hurco manuals must be
   tagged as imperial. Mazak Matrix manuals may differ — verify from `G20`/`G21` or title block; never
   assume metric even for Mazak.
2. **Haas macro B variable scope trap.** `#100–#149` = local (cleared on subprogram exit);
   `#500–#599` = global (persist across power cycles). Extracted macro examples missing scope tags
   become dangerously misleading tribal entries — always tag scope.
3. **Hurco WinMAX coolant block = 4-char max.** hyperMILL emits 6-char coolant blocks; cross-posting
   to WinMAX breaks V11 silently. Extraction must flag per-page when a coolant block exceeds 4 chars.
4. **Mazak Matrix page-ordering anomaly.** Manual PDFs may have appendices interleaved — pypdf page
   index does NOT equal manual section number. Always tag with PDF page number, not section number.
5. **Do NOT re-OCR already-indexed corpora.** `H:/PRISM/Docustrata` (257,992 files) and `H:/PRISM/JM DIE`
   are already indexed. Search the manifest/index first.

---

## §6 — What NOT to do (domain refuses)

- **NEVER create local `.ts` engine files** — this galaxy has zero by design; engine work → `engines/pdf-corpus/`.
- **NEVER claim extraction is complete without a page count** — page-count is the only completion proof
  (`claiming-extraction-complete-without-page-count` refuse from SOUL.md).
- **NEVER publish macro syntax** (Haas macro B, WinMAX conversational) without controller-version
  verification — version-specific syntax differences cause real machine errors
  (`publishing-unverified-macro-syntax` refuse from SOUL.md).
- **NEVER overwrite original manuals in the repo** (`overwriting-original-manuals-in-repo` refuse).
- **NEVER expose proprietary operator data publicly** (`exposing-proprietary-operator-data-publicly` refuse).
- **NEVER invent a `pdf-corpus-mill`-specific MCP dispatcher** — the inherited surface is sufficient;
  a parallel dispatcher creates orphaned routing debt.
- **NEVER use heading-anchor or chapter-boundary PDF parsing** — pypdf page-by-page is canonical
  (76× deeper coverage per `feedback_use_lima_pypdf_page_extractor.md`).
- **NEVER emit a tribal entry without source PDF path + page number + extraction date provenance.**
- **NEVER full-read `jm-die-corpus-pages.jsonl` without a source-tag filter** — pipe through tag grep.

---

## §7 — Domain workflow / pipeline contract

```
Source PDFs (H:/PRISM/resources/PDF/ + H:/PRISM/JM DIE/ manual subtrees)
  ↓
scripts/extract-jm-die-corpus-page-by-page.py   ← lima pypdf (CANONICAL extractor; resumable cursor)
  Output: mcp-server/data/tribal/jm-die-corpus-pages.jsonl
  ↓  (filter: source tags Haas|Hurco|Mazak|mill|WinMax|Matrix)
scripts/generate-milling-extracted-pdf-bridge.mjs  ← mill-scoped emitter (verified 2026-05-26)
  Output: mill page entries → mill galaxy tribal input
```

Finding new PDFs: check `H:/PRISM/resources/RESOURCES-INDEX.md` first — do not crawl the raw tree.

**Standing invariants (from MEMORY.md):**
- **Inherit-not-fork** — reuse parent pdf-corpus extraction; never fork the extractor for mill alone.
- **Provenance** — every extracted entry carries: source PDF path + page number + extraction date.
- **No-re-OCR** — already-indexed corpora (`JM DIE/`, `Docustrata/`) are never re-processed.
- **No-inline-constants** — machining constants extracted from PDFs flow to tribal/wiki, not hardcoded in engines.

---

## §8 — Tribal + corpus pointers

| resource | path |
|----------|------|
| Mill PDF corpus tribal pointer | `knowledge/wiki/code-tribal/milling/milling-pdf-corpus.md` |
| Synthesis brain | `knowledge/memories/patterns/pdf-corpus-mill_synthesis.md` |
| Wiki entries (4) | `knowledge/wiki/pdf-corpus-mill/` — query before re-deriving |
| JM Die Hurco WinMAX manuals | `H:/PRISM/resources/` — WinMax Mill CUTTER COMPENSATION.pdf, WinMax Mill RECOVERY AND RESTART.pdf |
| Haas/Mazak mill refs | `H:/PRISM/resources/PDF/` (see RESOURCES-INDEX.md for current list) |
| JM Die archive | `H:/PRISM/JM DIE/` — 38K+ files; access via `prism_data:database_search`, NOT Glob |

Tribal write rule: `prism_knowledge:tribal_capture slot=<your-nato>` — never write
`knowledge/tribal/*.md` directly (auto-overwritten on next sync).

---

## §9 — Cross-galaxy edges (PSN)

```
pdf-corpus (parent extractor)
  → pdf-corpus-mill [FILTER: mill source tags]
      → mill (consuming galaxy — tribal input)
      → post-processor (Haas Mill / Mazak Matrix dialect mining)
```

- **Producer:** `pdf-corpus` (parent) generates `jm-die-corpus-pages.jsonl`; this galaxy filters it.
- **Consumer:** `mill` reads mill-tagged page entries as tribal knowledge input.
- **Consumer:** `post-processor` mines Haas/Mazak dialect patterns for G-code emission.
- **No reverse write** — this galaxy never writes back to the parent corpus; it only filters.

---

## §10 — Closed-loop integration (india)

```
prism_ai:xproc_outcome_publish {slot:'<your-nato>', domain:'pdf-corpus-mill'}  // UNVERIFIED action name
```

Tribal capture after extraction: `prism_knowledge:tribal_capture slot=<nato> domain=pdf-corpus-mill`.
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 — Test commands

```bash
cd mcp-server && rtk npx vitest run -t "pdf|corpus|mill|extraction"
# Pure-node health check (no port 3100 needed):
node scripts/generate-milling-extracted-pdf-bridge.mjs --dry-run 2>/dev/null || echo "check script args"
```

---

## §13 — AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs pdf-corpus-mill "<question>"
```

Ollama routing: summarize a Haas/Mazak manual page → `gpt-oss:20b`; lint extraction script →
`qwen2.5-coder:32b`; deep corpus reasoning → `gpt-oss:120b`.
AI-systems fleet state: `knowledge/memories/patterns/ai-systems-fleet-state.md`
(regenerate: `node scripts/ai-systems-fleet-state.mjs`).
