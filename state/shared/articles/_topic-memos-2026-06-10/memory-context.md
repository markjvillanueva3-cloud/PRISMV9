# memory + context engineering (the spine)

All verified. The Anthropic "effective context engineering" article is referenced in an audit spec, not captured as a full article. The `cag-injectors-consume.mjs` hook (only the .test.mjs shows — the producer may have been consolidated). I have a complete, verified picture. Writing the memo now.

## memory + context engineering (the spine)

The operator has submitted a tight, recurring cluster of articles on this exact topic across late-May / early-June 2026. Four independent authors describe the *same* architecture from different angles (4-layer / 5-layer / 8-pattern / retrieval-first), and PRISM is the literal namesake of the canonical pattern (Bibryam's "Context Cascade" = PRISM = Per-Repository Instruction & Skill Management). PRISM already implements most of it; the gaps are in the *cognitive-process* layer (inbox processing, contradiction detection, synthesis cadence), not the substrate.

### Source articles the operator submitted (URL + 1-line each)
Verified from transcript URL extraction (`H--prism/*.jsonl`, `H--/*.jsonl`) and the operator's own digest memories:

- **dunik_7 — `https://x.com/dunik_7/status/2058905748579418615`** (seed: "4-layer memory") — operator asked to "incorporate into PRISM"; **UNFETCHED** (R12 fail-loud: X 402 auth-wall + Playwright peer-conflict + not WebSearch-indexed). Captured as a *gap*, not content — see `reference_x_article_dunik_7_2026_05_26.md`.
- **bibryam — `https://x.com/bibryam/status/2059359166188208142`** (seed: "context cascade") — 8 patterns for Claude Code in large codebases. Full version: `generativeprogrammer.com/p/how-teams-scale-claude-code-across`.
- **cyrilXBT — `https://x.com/cyrilXBT/status/2059817560988676179`** — Karpathy 4-layer second-brain framework (Knowledge/Connection/Synthesis/Intelligence) + 6 Claude integrations.
- **cyrilXBT — `https://x.com/cyrilXBT/status/2058373087330959829`** (article `2057568624345563136`) — retrieval-first vault organization (4 retrieval dimensions, 7-folder structure).
- **cyrilXBT — `https://x.com/cyrilXBT/article/2061290917403713538` / `2060883609935077667`** — Obsidian + Hermes "one system" self-learning loop (captured FULL at `state/shared/articles/2026-06-09-cyrilxbt-obsidian-hermes-one-system-FULL.md`).
- **eng_khairallah1 — `https://x.com/eng_khairallah1/status/2059929190158488034`** — "Context Engineering Is Replacing Prompt Engineering" 5-layer (Identity/Knowledge/Memory/Tool/Process).
- **Anthropic — `https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents`** and `.../equipping-agents-for-the-real-world-with-agent-skills` — referenced in `state/shared/specs/AUDIT-TOKEN-CONTEXT-MEMORY-2026-05-16.md` but NOT captured as a full article (gap).
- Supporting repos the operator pasted: `github.com/itechmeat/open-second-brain` (nightly dream passes), `github.com/Burgunthy/hermes-second-brain`, `github.com/muratcankoylan/agent-skills-for-context-engineering`, `github.com/DeusData/codebase-memory-mcp`, `supermemory.ai`, `hermes-agent.nousresearch.com/docs/.../memory-providers`.

### Key techniques / claims (the actual ideas, terse bullets)
- **Context engineering ≠ prompt engineering** (Khairallah): prompt eng treats each chat as isolated and re-explains context every time; context eng asks *"what information does Claude need access to to consistently produce the result I want?"* — value is in persistent structure, not the typed words.
- **The convergent stack** — four authors, one architecture: Identity → Knowledge → Memory/Connection → Tools → Process/Synthesis. The differences are framing, not substance.
- **Context Cascade (Bibryam #1)**: layered CLAUDE.md files — root = global rules + pointers; subdirs = local conventions; auto-loaded by directory proximity. PRISM is the namesake.
- **8 large-codebase patterns (Bibryam)**: Context Cascade, Repo Map, Noise Filter, Symbol Lookup (LSP not text-search), Just-in-Time Skill, Scoped Skill (path-bound auto-load), Scout Subagent (read-only discovery → file → main agent reads summary), Search-as-a-Tool (MCP search, backend-agnostic).
- **Retrieval-first vault (Cyril)**: *"organize to get things back quickly, not to put them away neatly."* 4 retrieval dimensions (Type/Time/Topic/Status); 7-folder (INBOX/LITERATURE/PERMANENT/PROJECTS/DAILY/MAPS/OUTPUTS/SYSTEM); `YYYY-MM-DD-[TYPE]-[TOPIC].md`; YAML frontmatter; Maps-of-Content when a topic exceeds ~20 notes.
- **Literature → Permanent distinction (Karpathy, load-bearing)**: literature notes = *what the source said*; permanent notes = *what I think, in my own words, linked to what I already know*. "You don't own knowledge until you can express it in your own words."
- **6 Claude integrations (Karpathy/Cyril)**: Inbox Processor (evening), Connection Finder (weekly), Question Answerer (vault-first), Writing Assistant, Contradiction Detector (monthly), Synthesis Generator (threshold-fired at N notes).
- **Self-learning loop (Hermes/Cyril)**: agent READS vault before acting, WRITES outcomes back after — closed loop. Background triggers at @10 user-turns (memory review), @15 tool-iterations (skill review), and a 4 AM idle pass. Repeat-corrections → confirmed-preferences with measurable confidence.
- **On-disk-not-in-context**: knowledge lives in the filesystem (Obsidian/markdown), loaded just-in-time, never crammed into base context.

### How PRISM already applies this (verified file paths)
All paths below were confirmed to exist on disk this session:
- **Context Cascade (#1)** → 5 galactic-center sentinels verified: `mcp-server/src/engines/{mill,lathe,wedm,quoting,business}/CLAUDE.md`; doctrine in `state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md` + CLAUDE.md §DOMAIN-GALAXY-DOCTRINE-MS0/MS1.
- **Repo Map (#2)** → `mcp-server/data/docs/{DIRECTORY_DIGEST,ENGINE_DIGEST,DISPATCHER_DIGEST}.md` + per-slot PATHS.md.
- **Noise Filter (#3)** → `.claude/settings.json` deny/excludes; `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md` (advisory, deny-rule syntax pending operator validation).
- **Just-in-Time + Scoped Skill (#5/#6)** → `.claude/hooks/skill-auto-trigger.mjs` reading `knowledge/wiki/architecture/_skill-triggers.jsonl`; **the path-scoped variant `_skill-triggers-pathglob.jsonl` NOW EXISTS** (it was "planned-not-shipped" on the 2026-05-28 bibryam memory — has since materialized at least partially; the pattern-6 gap is narrowing).
- **Scout Subagent (#7)** → `Agent`/`Explore` subagent + scrutiny-3way + per-file 2-reviewer gate.
- **Search-as-a-Tool (#8)** → `prism_session:master_index_query` + `prism_memory:semantic_search` (Qdrant) + `prism_knowledge:search`.
- **CAG router (cold/hot/hybrid context routing — PRISM's deepest original contribution to this topic)** → `.claude/hooks/cag-router-inject.mjs` (producer, T2) + `scripts/lib/cag-router.mjs` (verified) + `cag-cold-cache-anchor.mjs` + `cag-soul-cache-block.mjs` + `cag-injectors-consume.test.mjs`. Classifies each prompt COLD/HOT/HYBRID and lets static-doctrine injectors short-circuit. Memories: `reference_cag_router_2026_05_26.md`, `reference_cag_injectors_consume_2026_05_27.md`.
- **doc-cascade** → `.claude/hooks/doc-cascade.mjs` (T4 PostToolWrite) keeps AUTO-REFRESHED CLAUDE.md/manifest blocks in sync from source JSON.
- **Knowledge vault schema** → `knowledge/wiki/architecture/knowledge-vault-schema.md` (5-namespace: memory/wiki/commands/handoffs/specs; CLAUDE.md is a pointer-index, not a 6th namespace).
- **Inbox-Processor analog** → `state/shared/RECENT-SHIPMENTS-*.md` (many files; weekly golf-drain) — the closest existing analog to Cyril's evening inbox cron.
- **Operator's own digests** (literature-class, the "vault" working): `reference_{bibryam_large_codebase_8_patterns,karpathy_obsidian_4layer_framework,khairallah_5layer_context_engineering,cyril_vault_retrieval_architecture}_2026_05*.md` + `reference_zodchii_self_correcting_claude_md_2026_05_28.md`.
- **Self-scored coverage** (from the operator's digests): Bibryam **7.5/8**, Khairallah **5/5**, Karpathy 4-layer "at Day 0 per-slot." PSN's 11-leg map (`feedback_psn_definition.md`) is the superset that subsumes all three external frameworks.

### Gaps / highest-ROI opportunities to ingest more deeply
1. **dunik_7 4-layer article is still UNFETCHED** (the literal seed). The operator explicitly asked to incorporate it; it remains a fail-loud gap. Highest-ROI single action: re-fetch via an authenticated X session / paste-in. (`reference_x_article_dunik_7_2026_05_26.md`)
2. **Anthropic "effective context engineering" + "agent skills" articles are referenced but never captured FULL** — only cited in an audit spec. These are the authoritative first-party source; capture them into `state/shared/articles/` like the Cyril/Hermes ones already are.
3. **Literature → Permanent synthesis is sparse** (Karpathy's load-bearing distinction): PRISM's auto-memory dir is overwhelmingly *literature-class* (captures/references). The *permanent*, own-words synthesis notes are thin. This is the single biggest cognitive-layer gap.
4. **No daily inbox-processing cron** — PRISM has inbox infra (`RECENT-SHIPMENTS-*`, `memory_import_claude`, DocuRead) but no per-slot *evening* consolidation cron. Both Cyril and the Hermes loop make this a daily habit; PRISM batches it weekly via golf.
5. **No turn-counter / tool-iteration-counter triggers** — the Hermes loop fires memory review @10 turns and skill review @15 tool-calls; PRISM triggers are all *event-based hooks*, never *accumulation counters*. No equivalent exists (`2026-06-09-hermes-obsidian-self-learning-loop.md` line 43-44).
6. **No repeat-corrections → confirmed-preferences-with-confidence** (open-second-brain "nightly dream pass"). PRISM has error-pattern-promote but it doesn't measure confidence or graduate a repeated correction into a confirmed preference.
7. **Missing Contradiction Detector + Synthesis Generator (Karpathy #5/#6)** — PRISM's scrutiny gate reviews diffs, not cross-note contradictions; no threshold-fired per-topic synthesis when N notes accumulate.
8. **Symbol Lookup is graph-not-LSP (Bibryam #4, partial)** — Claude Code's `LSP` tool exists but isn't wired into per-slot TOOLBELT for typed-language slots (papa/foxtrot).
9. **`status/` tag prefix missing** (Cyril retrieval dimension #4) — memories carry type via filename + YAML but no `active/complete/archived` status tag, weakening the Status retrieval dimension.