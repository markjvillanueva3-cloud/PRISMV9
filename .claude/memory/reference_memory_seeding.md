---
name: Memory Seeding Infrastructure
description: How to seed Qdrant vector store with PRISM assets using /memory-seed skill and seed-qdrant.ts script
type: reference
originSessionId: be182624-3e78-4961-85dd-4a444ed02fe4
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
