---
title: U-TRIBAL-EMBED-GAP — embed final-3 tribal wikis into the auto-injection index
type: architecture
milestone: BACKEND-DEV-LOOP
unit: U-TRIBAL-EMBED-GAP
slot: foxtrot
shipped: 2026-05-18
commit: 709dec3985
authors:
  - claude-3c737257
links:
  - "[[tribal-by-domain-inject]]"
  - "[[backend-dev-loop-u-tribal-bac]]"
  - "[[reference_tribal_embed_gap_2026_05_18]]"
---

# U-TRIBAL-EMBED-GAP

**Commit:** `709dec3985` · slot foxtrot, 2026-05-18 · BACKEND-DEV-LOOP

## The gap (R12 — a loop that declared "exhaustion" without finishing its own step)

The BACKEND-DEV-LOOP / `U-TRIBAL-BACKEND-DEV-EXHAUST` pattern is: write a
tribal wiki → **embed it into `state/shared/tribal-embed-index.json`** →
commit (index + md together). Commit `d9f1b7960f` (iter3) followed it — its 6
wikis are all in the index. Commit `d716d20a96` (subject: *"final 3 wikis
(LoRA + RL + MCP-tool-design) [iter6 — exhaustion 20/20]"*) shipped **only the
3 `.md` files** (179 insertions, no `tribal-embed-index.json` change) and
skipped the embed step.

Consequence: `lora-fine-tuning-patterns`, `reinforcement-learning-patterns`
and `mcp-tool-design` were **absent** from `tribal-embed-index.json`. The
automatic tribal-knowledge injection path —
`tribal-by-domain-inject.mjs` (UserPromptSubmit) → `tribal-rerank.mjs`
(cosine top-K over `index.entries[]`) — can only ever surface entries that
are *in that index*. So the 3 most-recent backend-dev tribal wikis never
auto-injected for any slot, despite the loop having declared exhaustion. The
loop reported "done" while the auto-injection it was building was incomplete.

## What shipped

`scripts/embed-wiki-into-tribal-index.mjs` — a reusable, idempotent appender
(the loop's missing embed step, made explicit so future final-batch commits
can run it):

- Ollama `nomic-embed-text:latest` 768-d via `/api/embeddings` — **same
  endpoint+model as `tribal-rerank.mjs`** (cosine validity depends on model
  parity, not text length).
- Canonical iter3 entry shape: `id:"external:"+winAbsPath`,
  `source:"external"`, `title`=basename, `text`=flattened-400-char head,
  `path`=win backslash abs, `hash`=`sha256(flattened)[:16]` (provenance only
  — `tribal-rerank` never reads `.hash`), `embedding`=full-body 768-d.
- **All-or-nothing fail-loud**: every file embedded before any write; one
  Ollama failure → exit 3, nothing written (no partial index).
- `--domain` validated against `VALID_DOMAINS` (mirrors `tribal-rerank`) with
  a greedy-consume guard so a trailing `.md` isn't eaten as the domain.
- Pure exported core (`stripFrontmatter`/`flattenBody`/`makeWinPath`/
  `makeId`/`contentHash`/`buildEntry`/`planAppend`/`spliceEntries`/
  `embedText`) for hermetic tests; `expectedDim` pinned from the index's own
  `dim` so a wrong model is rejected loudly.
- 17-case `node:test` suite (tmpdir + subprocess oracles + regression guards;
  `after()` cleanup).

## Verification (end-to-end, not just unit)

`tribal-rerank.mjs --domain backend-dev` after `--apply`:

| query | top hit |
|-------|---------|
| "LoRA fine-tuning EWC adapter rank" | **lora-fine-tuning-patterns** #1 (1.456) |
| "reinforcement learning reward policy Q-learning" | **reinforcement-learning-patterns** #1 (1.271) |
| "MCP tool design dispatcher action schema" | **mcp-tool-design** #2 (1.394) |

Before: absent (never injectable). After: top-ranked for their domain.

## Scrutiny

Per-file 2-reviewer gate: round-1 Arm B **FAIL** (P0 — `--domain`
greedy-consume test was a false-green: proved file still planned, not that
the domain fell back to a *valid* default). Fixed (exit-3-not-2 strong
proof + `spliceEntries` extraction for direct splice coverage + dim-wiring
echo + multi-file all-or-nothing witness + tmpdir cleanup). Round-2: both
arms PASS/SHIP. 2 P2 residuals (main→embedText dim arg-pass integration not
directly asserted; partial-batch needs a partial-Ollama mock) — both
structurally mitigated (collect-then-single-write makes partial-write
impossible; wrong-dim silent-store covered at the `embedText` unit
boundary).

## Reuse

Any future tribal/wiki final-batch: `node scripts/embed-wiki-into-tribal-index.mjs
<paths…> --domain <d> --apply`. Idempotent (skip-by-id; `--force` to
re-embed). This closes the structural class, not just the 3 files.

## Lineage

Sibling of `retag-tribal-backend-dev.mjs` (which only flips `domain` on
existing memory/external entries — it does NOT add wiki entries; that was
the unfilled half this unit completes).
