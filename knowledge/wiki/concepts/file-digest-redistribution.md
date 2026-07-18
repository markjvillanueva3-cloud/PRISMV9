---
title: File digest + redistribution (Evernote-like) — concept page (U-VICTOR-B2)
type: concept
status: seed
created: 2026-05-27
slot: victor
related:
  - knowledge/wiki/architecture/engines/pdf-corpus.md
  - knowledge/wiki/architecture/engines/knowledge-conversion.md
  - knowledge/wiki/architecture/engines/course-to-tribal-tips.md
tags: [file-digest, evernote, ingest, redistribution, concept]
---

# File digest + redistribution

The operator named **"automatic file digest (Evernote) and redistribution of data from the file to all corresponding units in the prism app"** as a domain. Audit at iter-1 reported 0 wiki / 0 tribal / 0 memory under the literal name "evernote", which initially looked like a true gap.

**It is not a gap. It is a mis-naming.** The capability already exists across three PRISM galaxies — this page maps the operator's term to the existing implementation so future chats don't redesign.

## What the operator means

"Evernote-style ingest" = take any file (PDF, image, video transcript, course archive, vendor catalog, controller manual) and:

1. **Read** it page-by-page / chapter-by-chapter (no whole-document load — pdf-parse OOM)
2. **Extract** structured tribal tips (manufacturing knowledge, controller dialects, operator wisdom) at conf ≤ 1.0
3. **Classify** the content into PRISM domain buckets (use `scripts/lib/wiki-domain-classifier.mjs`)
4. **Promote** tribal tips at conf ≥ 0.9 → wiki canonical (`scripts/promote-tribal-to-wiki.mjs`)
5. **Embed** into the tribal-embed-index (`scripts/embed-tribal-jsonl-into-index.mjs`)
6. **Inject** into operator chats by slot domain (`.claude/hooks/tribal-by-domain-inject.mjs`)

That's the 6-step closed loop. Steps 1-6 are all wired. See [[reference_existing_tribal_wiki_pipeline_2026_05_27]] for the script roster.

## "Redistribution to all corresponding units"

This is the **inject layer**. Once a tribal tip is embedded, three hooks decide who sees it:

| Hook | Lever | Surface |
|------|-------|---------|
| `tribal-by-domain-inject` | slot domain (alpha=mill, charlie=quoting, etc.) | UserPromptSubmit per-chat |
| `wiki-tribal-coverage-inject` | coverage gap at session start | SessionStart per-chat (echo iter-8) |
| `wiki-tribal-coverage-per-domain-inject` | per-domain worst-3 | SessionStart per-chat (U-VICTOR-A2, this milestone) |

"Redistribution" is **pull-based** — the embed-index is global, and each slot's hooks pull what's relevant to its work. The operator does NOT push a file at specific engines; the engines/dispatchers pull from the index when their action is invoked.

## What's still missing under this name

- **File-watcher trigger** — currently new PDFs need a manual `pdf-parse-extract.mjs --file <new>` invocation. U-VICTOR-C3 closes this: file-watcher on `resources/` + `JM DIE/` re-ingests on `*.pdf` change.
- **Image / scanned PDF OCR** — `pdf-parse-extract.mjs` handles text PDFs; scanned-image PDFs need `extract-jm-die-corpus-page-by-page.py` (Python pypdf path, per [[feedback_use_lima_pypdf_page_extractor]]).
- **Video transcript ingest** — `youtube-toolpath-tribal.jsonl` (2520 entries today) covers YouTube; arbitrary video files need a transcription bridge (not yet built).

## References

- [[reference_existing_tribal_wiki_pipeline_2026_05_27]] — 9-stage pipeline tour
- [[reference_jm_die_tribal_wiki_extraction_starter_2026_05_26]] — operator's prior directive + delta's 8-of-93 PDF extract
- [[feedback_use_lima_pypdf_page_extractor]] — canonical pypdf path (76× deeper than pdf-parse)
