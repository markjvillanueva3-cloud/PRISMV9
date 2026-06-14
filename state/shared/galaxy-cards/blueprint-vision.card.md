## blueprint-vision — per-domain working brain (XRAY slot)
- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- — recall: `prism_memory:semantic_search query="blueprint ocr pdf cad-extract gdt tolerance" topK=20`
- **DOWN (push to master):** write `<type>_xray_<topic>.md` →
- `C:/Users/wompu/.claude/projects/H--prism/memory/` → fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs` at Stop
- **MASTER-INDEX edge:** master `MEMORY.md` carries `[galaxy:blueprint-vision]` back-pointer (verify it exists — added 2026-05-29)
- **Last master-sync:** 2026-05-29   ← bump on every PULL reconcile; older than the galaxy dir mtime ⇒ re-pull before work
- **Lima's pypdf page-by-page extractor is canonical** — `scripts/extract-jm-die-corpus-page-by-page.py` (NOT a phantom `lima-pypdf-page-extract.mjs`). Per [[feedback_use_lima_pypdf_page_extractor]].
- **Verify engine names on disk before referencing** — the alpha seed named 21 non-ex
…[card truncated]
