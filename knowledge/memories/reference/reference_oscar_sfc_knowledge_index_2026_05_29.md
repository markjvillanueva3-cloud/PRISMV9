---
name: reference_oscar_sfc_knowledge_index_2026_05_29
description: SFC knowledge index — scripts/sfc-knowledge-index.mjs compiles + existence-validates ALL SFC wiki+tribal+engines+tests+scripts+dispatcher-actions+memories into SFC-KNOWLEDGE-INDEX.md + json; auto-invoked on SFC-keyword prompts via oscar-sfc-knowledge-inject.mjs.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.708Z
aliases: reference_oscar_sfc_knowledge_index_2026_05_29
---


# SFC knowledge + path index (2026-05-29, slot:oscar)

Operator goal: "compile all relevant wiki and tribal knowledge for your domain | wire all file paths relevant to your domain for quicker searches and usability: wired, validated and auto-invoked when needed." Delivered:

## Compiler — `scripts/sfc-knowledge-index.mjs`
Pure-node (fs only, no MCP/Ollama). Reuses `repoRoot`/`sfcEngines`/`dispatcherActions` from `sfc-awareness-snapshot.mjs` (DRY). Compiles + **existence-validates** every SFC asset into:
- `mcp-server/src/engines/speed-feed/SFC-KNOWLEDGE-INDEX.md` (human, categorized)
- `mcp-server/src/engines/speed-feed/sfc-knowledge-index.json` (machine — the hook reads it)

First run (2026-05-29): **wiki 5 · tribal 6 · engines 29 · tests 27 · scripts 5 · dispatcher-actions 42 · memories 19**. Sections: galaxy docs (+ constants + domain-map memory) · wiki · tribal · engines · tests/scripts · dispatcher actions · memories. Test: `scripts/sfc-knowledge-index.test.mjs` (5/5, R9 — counts are real, floors).

## Auto-invoke — `.claude/hooks/oscar-sfc-knowledge-inject.mjs`
UserPromptSubmit hook (tier T2, advisory, fail-soft). On a Speed-Feed-keyword match it injects a compact pointer block (index path + counts + galaxy read-first docs + top wiki) from the json sidecar. **Gate fix lesson:** the first keyword cut `speed[\s-]?feed` MISSED "speed and feed" / "speeds and feeds" — the most common operator phrasing. Fixed to `speeds?\s*(?:and|&|/|-)?\s*feeds?`. Complements `tribal-by-domain-inject` (which needs MCP-ingested tips) — this reads the LOCAL compiled index, so it works MCP-down + covers wiki + paths, not just tribal. Knob: `PRISM_OSCAR_SFC_KNOWLEDGE_INJECT_DISABLE=1`. **Wiring: golf-merge pending** (worktree behind; .claude gitignored → add -f).

## Use
Hit `SFC-KNOWLEDGE-INDEX.md` (or `/sfc-gates` / domain-map memory) BEFORE Grep/Glob for any SFC lookup. See [[reference_oscar_sfc_domain_map_2026_05_27]] · [[reference_oscar_sfc_gsd_2026_05_29]] · [[reference_oscar_sfc_quality_gate_ecosystem_2026_05_29]] · [[sfc-dev-protocol]].
