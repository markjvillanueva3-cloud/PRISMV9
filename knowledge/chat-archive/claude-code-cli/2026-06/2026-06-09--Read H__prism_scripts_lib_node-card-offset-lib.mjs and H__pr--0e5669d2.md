---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Read H:/prism/scripts/lib/node-card-offset-lib.mjs and H:/prism/scripts/build-ca"
date: "2026-06-09"
first_ts: "2026-06-09T13:08:27.536Z"
last_ts: "2026-06-09T13:10:01.331Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-a40474d17fa09a4ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Read H:/prism/scripts/lib/node-card-offset-lib.mjs and H:/prism/scripts/build-ca

> **claude-code-cli** | 2026-06-09 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_b5aa5735-a88/agent-a40474d17fa09a4ca.jsonl`

## Transcript

### User | 2026-06-09T13:08:27.536Z

Read H:/prism/scripts/lib/node-card-offset-lib.mjs and H:/prism/scripts/build-card-offset-index.mjs END TO END. I am cloning this OFFSET-SEEK pattern for a sibling artifact: vault-backlinks (a JSON map {vaultKey:[nodeIds]}, currently a single 19.8MB JSON at state/shared/system-viz/vault-backlinks.json built by scripts/build-vault-backlink-index.mjs). I want a seekable variant: vault-backlinks.jsonl (one record per vault key) + vault-backlinks-offsets.json (key->byteOffset), so a hook can seek ONE record without loading 19.8MB. Produce a precise BLUEPRINT: (1) the exact functions node-card-offset-lib exports and their signatures (makeCard? writeOffsetIndex? seekCard? readCard?); (2) the EXACT on-disk shapes of node-cards.jsonl + node-card-offsets.json (record-per-line? what's in the offsets json — {id:offset} or {id:{offset,length}}? multibyte-safe byte offsets?); (3) how seekCard parses the offsets once then fs.read's exact bytes (the torn-pair guard, the integrity/id-match guard, the never-throw behavior); (4) how build-card-offset-index emits both files (atomic write? stream?). Give me a concrete clone-skeleton I can adapt for vault-backlink-offset-lib.mjs + extending build-vault-backlink-index.mjs to ALSO emit the jsonl+offsets. Quote real line numbers. Plain text, no JSON.

### Assistant | 2026-06-09T13:08:36.486Z

I'll read both files end to end to produce a precise blueprint.

### Assistant | 2026-06-09T13:08:36.694Z

[tool_use: Read]

### User | 2026-06-09T13:08:37.867Z

[tool_result] 1	/**
2	 * node-card-offset-lib.mjs — the seekable card-offset index for sub-parse
3	 * node reads (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX, slot:sierra).
4	 *
5	 * THE PROBLEM (the next layer down from node-card-read): readCard's full-sidecar
6	 * path parses the WHOLE 193MB system-graph-index.json (or 55MB find-cache) to
7	 * build an id->node Map. A long-lived process caches that, but a
... [+7488 chars truncated]

### Assistant | 2026-06-09T13:08:42.027Z

[tool_use: Read]

### User | 2026-06-09T13:08:43.422Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-card-offset-index.mjs — emit the seekable node-card offset index
4	 * (node-cards.jsonl + node-card-offsets.json) from the ALREADY-BUILT
5	 * system-graph-index.json (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX,
6	 * slot:sierra).
7	 *
8	 * WHY a standalone in ADDITION to the build-graph-index integration: the
9	 * integration keeps the pair fresh on ever
... [+5452 chars truncated]

### Assistant | 2026-06-09T13:10:01.331Z

Both files read end to end. Here is the precise blueprint, with real line numbers from the two source files.

---

## (1) Exact exports and signatures — `node-card-offset-lib.mjs`

`makeCard` is NOT defined here — it is **imported** (line 31: `import { makeCard } from "./node-card-schema.mjs";`). The lib re-uses it so the JSONL card shape can never drift from the full-sidecar projection (lines 21-22). `seekCard`/`readCard` are NOT in this lib either — they live in `node-card-read.mjs` (the reader). This lib is the BUILDER side only. It exports exactly four things:

- **`CARD_OFFSET_SCHEMA_VERSION`** — const string `"1.0.0"` (line 33).
- **`buildCardOffsetIndex(nodes)`** (line 54) → `{ jsonl, offsets, count, skipped, dupSkipped }`. Pure compute, no FS, no Date (lines 48-49). Throws if `nodes` is not an array (lines 55-57).
- **`writeCardOffsetIndex(built, { jsonlPath, offsetsPath, meta = {} })`** (line 112) → `{ jsonlPath, offsetsPath, jsonlBytes, offsetsBytes, count }`. The I/O half. Validates `built` (lines 113-115) and required paths (lines 116-118).
- **`offsetIndexPathsFor(outPath)`** (line 151) → `{ jsonlPath, offsetsPath }`. Path resolver that co-locates the pair beside a given main sidecar path (lines 152-156).

There is also a private `atomicWrite(targetPath, data)` (line 85, not exported) returning byte length.

---

## (2) Exact on-disk shapes

**`node-cards.jsonl`** — one card per line. Each line is `JSON.stringify(makeCard(node))` (line 70). Records are joined with `"\n"` PLUS a trailing `"\n"` so every record including the last is a complete line (lines 78-80): `parts.join("\n") + "\n"`. Empty when count is 0. Critically, the stored `length` **excludes the trailing newline** (line 49, comment; line 71 `lineBytes = Buffer.byteLength(line, "utf8")` is the line only) so a reader parses the exact JSON slice with no trim.

**`node-card-offsets.json`** — a single JSON object built at lines 128-138, with stamp keys deliberately ordered BEFORE `offsets` so a re
... [+12966 chars truncated]
