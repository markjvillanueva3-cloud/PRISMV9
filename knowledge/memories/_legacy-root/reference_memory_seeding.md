---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/reference_memory_seeding.md
source_filename: reference_memory_seeding.md
content_hash: 7a06f747fb79b0ae99a59b28ae499be62bcb9066d600bc1e17179e1afa6d14e3
mirror_ts: 2026-05-05T13:00:09.540Z
mirror_engine: ObsidianMemorySyncEngine
---
## Memory Seeding

To populate the Qdrant vector store with PRISM asset embeddings:

1. **Prerequisites**:
   - Docker containers: `docker compose up -d qdrant ollama`
   - Embedding model: `docker exec prism-ollama ollama pull nomic-embed-text`

2. **Run seeding**:
   - Via skill: `/memory-seed` (or `/memory-seed engines`, `/memory-seed formulas`, etc.)
   - Via script: `npx tsx scripts/seed-qdrant.ts`

3. **Collections created**:
   - `prism_engines` — engine names + JSDoc descriptions
   - `prism_formulas` — formula registry entries
   - `prism_skills` — skill markdown files

4. **Vector spec**: 768 dimensions, Cosine distance (nomic-embed-text output)

**Why:** Enables semantic search across PRISM assets — find relevant engines/formulas by meaning, not just keywords.

**How to apply:** When user asks about capabilities or you need to find relevant engines, use SemanticAssetIndexEngine.search() after ensuring collections are seeded.
