---
title: Tribal index crossed V8's 512MiB max string length
type: lesson
domain: dev-infra
created: 2026-06-08
tags: [tribal, embeddings, v8, json, silent-regression, PSN, gap-5]
commit: 182788232a
---

# Tribal index crossed V8's 512MiB max string length

## Symptom
Tribal injection (PSN leg #5) returned nothing in every chat — silently, with no
error surfaced. `tribal-by-domain-inject` → `tribal-rerank.mjs` produced zero
hits. The wiki embedder also failed instantly (~0.5s per chunk, far too fast for
a GPU embed).

## Root cause
`state/shared/tribal-embed-index.json` grew to **536,988,127 bytes**, crossing
**V8's hard maximum string length** `0x1fffffe8` = **536,870,888 bytes (≈512 MiB)**
by 117,239 bytes. Any code doing:

```js
JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))
```

now throws `Cannot create a string longer than 0x1fffffe8 characters` **before
`JSON.parse` ever runs** — the UTF-8 *string* allocation fails. This is the
string-length limit, **not** the heap: `--max-old-space-size` does not help.
(That flag was the correct fix earlier the same day at 533 MB, when the read
SUCCEEDED but the parsed object-graph OOM'd — a *different* wall the index then
grew past.)

The breakage was fleet-wide and silent because the live consumer
(`.claude/scripts/tribal-rerank.mjs:76`) and the embedder read
(`embed-wiki-into-tribal-index.mjs`) both used the string-read path.

## Fix
`scripts/lib/load-tribal-index.mjs` — `loadTribalIndex(path, fs)`:
- Reads the file as a **Buffer** (`Buffer.MAX_LENGTH` ≈ 2-4 GB, no string cap).
- **Under cap**: `JSON.parse(buf.toString("utf8"))` — byte-identical to the old
  path, so existing indices are unaffected.
- **Over cap**: parse the small head metadata, then walk the `"entries":[...]`
  array with a minimal brace-aware JSON scanner (string + escape + depth state)
  and `JSON.parse` each small entry individually — never allocating a >cap string.

Wired into `tribal-rerank.mjs` (live PSN leg #5) and the wiki embedder read.
Validated on the real 537 MB / 33,639-entry index (read 3.4s, 0 corrupt;
reranker returns real domain-weighted hits).

## Still open — the write side
`atomicWriteJSON` does `JSON.stringify(obj)` — stringifying a >cap object **also
throws** the same error. The embedder can READ the index now but cannot APPEND
new entries. The monolithic single-blob index is at end-of-life; the real fix is
**sharding** (split into N shard files each < cap; writers append to the active
shard; readers concat across shards). Until then, wiki↔tribal coverage % cannot
grow.

## The fail-OPEN clobber (the worse downstream effect)
The read-failure had a second, catastrophic manifestation. `tribal-embed-index.mjs`
`readIndex()` had a fail-OPEN `catch` that **returned a fresh empty `{entries:[]}`**
on any parse error. When the cap made the 537 MB read throw, an `--add`/`--update`
invocation (an auto-embed hook firing on a wiki-file Write) loaded that empty base,
spliced one file, and `writeIndex()`'d it — **clobbering the 537 MB / 33,639-entry
brain down to a 1-entry stub**. The 537 MB version is gitignored (no git history)
and rename-replace bypassed the recycle bin, so it is gone. The surviving 4,162-entry
baseline (slot worktrees, 2026-05-20) was restored; the lost ~29 K delta is derived
and re-embeddable. Hardening: `readIndex` now fails loud when an existing file won't
load; `writeIndex` refuses a >50 % shrink over a populated index (`PRISM_TRIBAL_ALLOW_SHRINK=1`
to override). This index was also clobbered 2026-05-22 (key-scheme).

## Lesson
A JSON store that only ever grows will eventually hit V8's ~512 MiB string cap —
and the failure is a hard throw on the READ, not a gradual slowdown, so it
presents as a *silent* whole-feature outage. Any append-only JSON corpus needs a
size ceiling + sharding plan **before** it approaches 512 MB. Prefer NDJSON /
sharded stores for anything that grows unbounded.

Memory: [[reference_tribal_index_v8_string_cap_2026_06_08]] ·
[[reference_wiki_tribal_embed_pipeline_blocked_2026_06_08]]
