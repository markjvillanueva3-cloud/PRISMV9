---
name: reference_e1_ideablock_extractor_2026_05_15
description: "OBSIDIAN-INTELLIGENCE-MS3 / E1 — U-IDEABLOCK-EXTRACTOR shipped 2026-05-15 by slot hotel claude-a2b1b5ca. Schema + engine + 21-case vitest with per-file scrutiny gate (3 files, 6 reviewer agents). Lists every P0/P1 fix learned through the gate."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.282Z
aliases: reference_e1_ideablock_extractor_2026_05_15
---


# E1 — IdeaBlockExtractor (Akshay/Blockify pattern)

**Where:** `mcp-server/src/{schemas/ideaBlockSchema.ts, engines/IdeaBlockExtractorEngine.ts, __tests__/IdeaBlockExtractor.test.ts}`
**Pattern:** Markdown notes → atomic question/answer IdeaBlocks via Ollama (`qwen2.5-coder:7b`) structured-JSON output. Each block content-addressed by sha256(NFC(question) + U+001F + NFC(answer)).slice(0, 24).
**Downstream:** E2 dedup (cosine), E3 RAG retrieval, E4 governance gates, D1 reads `source_path` + `extracted_at` + `model` as provenance.

## Scrutiny-driven design (P0+P1 findings caught BEFORE landing)

### Schema (File A)
- **`.strict()` on all object schemas** (NOT `.passthrough()`) — block is LLM-emitted, unknown fields would silently propagate to D1/E3/E4 as trusted data. Closed shape.
- **Path-traversal refinement** on `source_path` — reject `..`, absolute Windows drives, UNC `\\` or `//`, Unix-absolute, URL schemes (`file://`), backslash separators. D1's provenance back-link would otherwise be a path-traversal vector.
- **Control-char regex** on `question` + `answer` — reject NUL..BS, VT..US, DEL, RTL-OVERRIDE (U+202E homoglyph), BOM. Real markdown has only TAB + LF, never these.
- **Closed-enum on `error`** (8-value `IdeaBlockExtractErrorClass`) — callers exhaustively switch.
- **`schema_version: z.literal(1)`** with `IdeaBlockSchemaV1` named + rolling `IdeaBlockSchema` alias — v2 will land as `z.discriminatedUnion("schema_version", [V1, V2])`. Migration path explicit, not hand-waved.
- **id = 24 hex chars (96 bits)** — birthday-collision boundary ~2^48 ≈ 281T blocks. 16-hex (64-bit) would hit collisions at ~10M blocks per vault projection.
- **`governance_tags.max(6)`** — Sentra/Ashwin triad + 5 PRISM extensions + headroom.

### Engine (File B)
- **Depth-aware brace matcher** in `tryParseJson` (Arm B P0). Greedy `slice(firstBrace, lastBrace+1)` is hostile-payload exploitable: `{"blocks":[]}garbage{"blocks":[real]}` would silently drop the real blocks. Walk left-to-right, depth-scan respecting strings + escapes, return first parseable object with `blocks` array.
- **Refusal detector** makes `model-refused` enum reachable. Heuristic: no `{` AND length < 800 AND matches `/i can(?:not|'t)|i'?m unable|i refuse|sorry,? i can|as an ai/i`.
- **`governance_tags` filter fallback** — `filter(typeof === "string" && length > 0)`; if empty, fall back to `["unknown"]` (not silently drop the block).
- **ID hash separator U+001F** (`ID_HASH_SEP`) between question + answer prevents `(q="A\nB", a="")` colliding with `(q="A", a="B")`. The schema's control-char regex rejects U+001F in either field, so the precondition holds.
- **NFC normalization BEFORE hashing** — homoglyph variants collapse to same id.
- **Repair-retry telemetry** — `raw_response_length` reports the LATEST attempt's response, not the first.
- **Race-promise `.catch(() => {})`** — when timeout wins, the in-flight `client.generate()` rejection becomes a non-issue. KNOWN GAP: socket not actually cancelled (would need AbortController plumbed into OllamaClientEngine — tracked as follow-up).
- **`fail()` envelope is 4-arg** — no free-form `message` field. Drops `_debug_message` attack surface that Arm B rejected on the schema.

### Test (File C, 21 cases)
- All 6 `IdeaBlockExtractErrorClass` enum values reachable + asserted via concrete `expect(r.error).toBe("...")`.
- 5-fixture exit-condition: each fixture seeded with unique content so block ids are distinct across fixtures. **`cannedClaims(n, {seed: fixture.source})`** — without distinct seeds, content-addressed dedup correctly collapses fixtures to same ids (which is the design, not a bug).
- Adversarial: hostile JSON multi-object, governance-tags filter empty, id-collision pair, backslash source_path, schema-strict unknown-field, model_override, max_blocks truncation, empty-blocks success path, repair-success path.

## Files (lines/bytes)

| File | LOC | Purpose |
|---|---:|---|
| `ideaBlockSchema.ts` | ~190 | Zod V1 schema + extract I/O + closed-enum error class + safety refines |
| `IdeaBlockExtractorEngine.ts` | ~330 | Class with injectable client + extractFromMarkdown + tryParseJson depth-scan + promote |
| `IdeaBlockExtractor.test.ts` | ~470 | 21 vitest cases — schema RT, 6 failure classes, 7 adversarial, exit condition |

## Next steps (E1 close-out)
1. Wire to `prism_memory` or `prism_intake` dispatcher (z.enum + lazy import + case branch + schema entry).
2. Run dispatcher-level round-trip test.
3. Close out envelope (status → completed) + regen MILESTONE_PROGRESS + BUILD_STATE + chat-bus done message.

## Sister units
- [[reference_subagent_per_task_presearch_2026_05_15]] — also OBSIDIAN-INTELLIGENCE-MS3 territory
- [[feedback_parallel_scrutiny_per_file]] — the gate doctrine that caught the P0s here
- [[feedback_read_tool_strips_control_chars]] — false-positive on the U+001F constant


## Related
[[engines/IdeaBlockExtractorEngine|IdeaBlockExtractorEngine]] • [[engines/OllamaClientEngine|OllamaClientEngine]] • [[dispatchers/prism_memory|prism_memory]] • [[dispatchers/prism_intake|prism_intake]] • [[skills/src|/src]] • [[skills/idea|/idea]] • [[skills/answer|/answer]] • [[skills/i|/i]] • [[skills/bytes|/bytes]]