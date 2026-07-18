# CLAUDE.md patch sibling — U-TRIBAL-EMBED-GAP (foxtrot, 2026-05-18)

CLAUDE.md is peer-locked. This patch sibling is the durable record; a future
chat owning the lock applies it.

## Target

`## Recent regressions` block — append:

```
- 2026-05-18 | **final-3 BACKEND-DEV-LOOP tribal wikis were never embedded into tribal-embed-index.json** — commit `d716d20a96` ("final 3 wikis … exhaustion 20/20") shipped lora-fine-tuning-patterns / reinforcement-learning-patterns / mcp-tool-design as `.md` ONLY; it skipped the embed step that iter3 `d9f1b7960f` performed. `tribal-by-domain-inject` → `tribal-rerank` ranks cosine over `tribal-embed-index.json::entries[]` ONLY, so all 3 were dark to fleet-wide auto-injection despite the loop declaring exhaustion (R12 — "done" while the auto-injection it built was incomplete). | fix: U-TRIBAL-EMBED-GAP (commit `709dec3985`, slot foxtrot) — `scripts/embed-wiki-into-tribal-index.mjs` reusable idempotent appender (Ollama nomic-embed-text:latest 768-d, canonical iter3 `external:` shape, all-or-nothing fail-loud, pure `spliceEntries`/`embedText`, 17 node:test). +3 backend-dev entries. Per-file 2-reviewer round-1 Arm B FAIL (P0 domain-guard test false-green) → round-2 both PASS. | observed-by: claude-3c737257 slot foxtrot, user "continue [earlier-today] wiki and tribal knowledge injections through obsidian and ollama". | verify: `node -e "const e=require('./state/shared/tribal-embed-index.json').entries;['lora-fine-tuning','reinforcement-learning','mcp-tool-design'].forEach(s=>console.log(s, e.some(x=>(x.path||'').includes(s))))"` → all `true`; `node .claude/scripts/tribal-rerank.mjs --query "LoRA fine-tuning" --domain backend-dev --k 3 --json` ranks lora-fine-tuning-patterns #1.
```

## Also (optional, if a §BACKEND-DEV pointer section exists)

Pointer: `scripts/embed-wiki-into-tribal-index.mjs` is the canonical
"embed a wiki .md into the tribal auto-injection index" tool — run it
(`--apply`) whenever a tribal/wiki final-batch ships `.md` without touching
`tribal-embed-index.json`. Idempotent; `--force` re-embeds. Wiki
[[u-tribal-embed-gap]].

## Apply when

CLAUDE.md becomes editable (current owner releases peer-claim). Wiki entry
[[u-tribal-embed-gap]] + memory [[reference_tribal_embed_gap_2026_05_18]]
hold the same content for the unlocked surfaces.
