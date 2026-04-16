# Sync Memory — Export/Import PRISM Memory Across PCs via H: Drive

Dump PRISM's Qdrant-backed memory to a JSON bundle on the portable H: drive (or import one into a fresh PC). Designed for the home-PC / work-PC / drive-swap workflow: tribal tips, program embeddings, outcome vectors, and formula memories follow the drive.

## Args: $ARGUMENTS
- `export`: create a new bundle. Args: `--collections=<csv>` `--dest=<path>` `--vector-size=<n>`
- `import`: restore a bundle. Args: `--src=<path>` `[--replace]` `[--only=<csv>]`
- `list`: enumerate bundles in a directory (newest first)
- `info <path>`: inspect one bundle without importing

## Defaults
- Dest dir: `H:\prism\data\memory-bundles\`
- Vector size: 768 (nomic-embed-text)
- Distance: Cosine
- Collections (full sync): all 7 kinds from `/memory-search`
- Schema version: 1

## Pipeline
### Export
1. `MemorySyncEngine.exportBundle()` for each requested collection
2. `QdrantVectorStoreEngine.scrollAll()` — cursor-paginated dump
3. Write single JSON file with schemaVersion + createdAt + source metadata + per-collection points

### Import
1. `MemorySyncEngine.importBundle()` reads + validates schema
2. For each collection: `ensureCollection()` (with optional `replaceCollections` → drop+recreate)
3. `upsert()` all points (same id replaces existing row — newer bundle wins)

## Engines
- `MemorySyncEngine` (U-LLM8) — bundle logic, schema guard, per-collection error surfacing
- `QdrantVectorStoreEngine` (infra) — scroll / upsert primitives

## Dispatcher Call (once wired)
```json
{
  "tool": "prism_local_llm",
  "action": "memory_sync_export",
  "params": {
    "collections": ["prism_memory_tip", "prism_memory_outcome"],
    "destPath": "H:/prism/data/memory-bundles/bundle-2026-04-16.json"
  }
}
```

## Drive-Swap Workflow
1. At site A: `/sync-memory export` → bundle lands on H: drive
2. Eject H:, physically move to site B
3. At site B: `setup-new-pc.py` brings PRISM up, then `/sync-memory import --src=<latest>`
4. Qdrant at site B now has everything site A learned

## Caveats
- Bundles are plain JSON — large collections (100k+ points) produce multi-hundred-MB files
- Import is upsert semantics, NOT a 3-way merge — if both sides wrote to the same id since last sync, newer bundle wins (last-writer-wins by file timestamp)
- `--replace` wipes a collection before import — use when the sending side is authoritative
