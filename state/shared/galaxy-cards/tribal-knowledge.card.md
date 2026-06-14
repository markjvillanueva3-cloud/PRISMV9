## tribal-knowledge — tribal-knowledge .md
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="tribal knowledge" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:tribal-knowledge]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-06-01
- <!-- GALAXY-BRAIN-FILL:BEGIN -->
- **knowledge-conversion** — `engines/knowledge-conversion/` consumes Lane-A tribal tips (symmetric edge in CLAUDE.md §Related galaxies)
- **post-processor** — `PostProcessorTribalKnowledgeIntegrationEngine.ts` (cited-tip pipeline output, PP-TRIBAL-INT)
- **ai-training** — LoRA augmentation feed via `lathe_lora_tribal_*` actions + `TribalKnowledgeTrainingEngine.ts`
- **database-expansion** — juliett-owned KnowledgeDB intake (PATHS.md regi
…[card truncated]
