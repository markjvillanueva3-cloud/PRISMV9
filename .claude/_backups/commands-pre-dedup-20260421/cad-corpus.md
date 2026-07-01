# /cad-corpus — CAD Training Corpus Management

Manage the JM Die CAD training corpus for neural CAD generation.

## Usage
```
/cad-corpus ingest             # Ingest CAD files from H:/PRISM/JM DIE
/cad-corpus stats              # Show corpus statistics
/cad-corpus dedup              # Remove duplicates
/cad-corpus --customer ALCOA   # Filter by customer
```

## What It Does
4 core operations for managing the CAD training corpus:

| Action | Description |
|--------|-------------|
| `ingest` | Scan JM Die archive, tokenize CAD files, build knowledge graphs |
| `stats` | Show corpus size, per-customer distribution, file type breakdown |
| `dedup` | Hash-based deduplication to remove identical parts |
| `jsonl` | Export corpus to training-ready JSONL format |

## Example Output
```json
{
  "corpusSize": 10542,
  "customerDistribution": {
    "ITW": 2341,
    "ALCOA": 1876,
    "SFS": 1234,
    "FASTENAL": 987,
    "OTHER": 4104
  },
  "fileTypes": {
    ".step": 5678,
    ".stp": 2345,
    ".iges": 1234,
    ".x_t": 890,
    ".sldprt": 395
  },
  "deduplicationRate": 0.12,
  "averageTokensPerPart": 156
}
```

## Options
- `--customer <name>` — Filter by customer (e.g., ALCOA, ITW, SFS)
- `--machine-type <type>` — Filter by machine type (lathe, mill, wire-edm)
- `--format <ext>` — Filter by file format (.step, .iges, etc.)
- `--limit <N>` — Limit ingestion to N files
- `--output <path>` — Custom output path for JSONL export

## API
```typescript
import { cadCorpusIngesterEngine } from "mcp-server/src/engines/CADCorpusIngesterEngine.js";

// Classify file types in archive
const classified = cadCorpusIngesterEngine.classify({ rootDir: "H:/PRISM/JM DIE" });

// Ingest files to corpus
const corpus = cadCorpusIngesterEngine.ingest({ files: classified.files });

// Get corpus statistics
const stats = cadCorpusIngesterEngine.stats(corpus);

// Deduplicate corpus
const deduped = cadCorpusIngesterEngine.dedup(corpus);

// Export to JSONL
const jsonl = cadCorpusIngesterEngine.toJsonl(corpus);
```

## Dispatcher Actions
- `corpus_classify` — Scan and classify files by type
- `corpus_ingest` — Tokenize and graph CAD files
- `corpus_dedup` — Hash-based deduplication
- `corpus_stats` — Corpus statistics
- `corpus_to_jsonl` — Export to training format

## Related
- `/cad-train` — Train CAD model on corpus
- `/cad-search` — Search similar CAD models
- `/cad-tokenize` — Visualize CAD as tokens
