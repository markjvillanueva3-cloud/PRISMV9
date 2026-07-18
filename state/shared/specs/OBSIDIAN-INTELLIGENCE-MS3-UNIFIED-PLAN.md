# OBSIDIAN-INTELLIGENCE-MS3 — Unified Plan

**Author:** claude-cee63f1f
**Date:** 2026-05-09
**Sources synthesized:**
- 6 shipped units in `OBSIDIAN-VIZ-MS0` (this session)
- 3 in-flight MS2 units (REREAD-SIGNAL, HIGHLIGHTS-ONLY, VOICE-CAPTURE)
- Handoff `U-DOCKER-HOOK-BROKER` from claude-99eca613
- 5 X articles fetched via jina reader (bodies at `H:/prism/state/shared/x-fetch/`)

---

## What changed since the last plan

The 5 articles re-frame our work in 4 distinct ways:

| Article | Author | Key shift |
|---|---|---|
| "Vault Writes Back to Itself" | cyrilXBT | **Validates our 3-layer architecture exactly** (Obsidian + MCP + Claude). Gives us 6 concrete workflows to ship: Daily Context, Connection Finder, Queue Processor, Weekly Synthesis, Project Auto-Updater, Knowledge Distillation. Not theoretical — full Claude prompts included. |
| "Unreasonable Effectiveness of HTML" | Thariq (Anthropic Claude Code team) | **All Claude-generated specs/reports should be HTML, not markdown.** Info density (SVG, tables, scripts), 2-way interaction (sliders/copy-buttons), shareable. Markdown is restrictive once outputs exceed ~100 lines. Direct relevance to CLAUDE-BRIEF, BUILD_STATE, system-viz reports. |
| "AI team that doesn't quit" | darkzodchi | 3 rules: narrow job description per agent, real-time observability, don't host on laptop. Pixel-Department visualization concept ≈ our system-viz with agent overlay. |
| "Company Brain" | Ashwin Gopinath (Sentra CEO, ex-MIT) | **Re-frames our memory system as a prototype.** Markdown brains hit a wall at organizational scale: need provenance, ontology, conflict resolution, action traces, evals, permissions. JM Die is multi-user → we're at that scale. |
| "You're doing RAG wrong" | Akshay Pachaar | **Chunk is the wrong unit.** Replace with IdeaBlocks (question + validated answer + governance fields). 7-stage pipeline. 40× corpus reduction, 2.3× retrieval relevance, 13.55% accuracy gain. Open-source: Blockify. Direct upgrade path for ObsidianMemoryRagEngine. |

---

## Dependency graph

```
A1 DOCKER-BROKER ─┐
                  │ (unblocks everything — kills xmalloc OOM)
A2 REREAD-finish ─┘
                  │
                  ▼
              ┌───────────────────────────────────────────┐
              │                                           │
              ▼                                           ▼
   ┌──────────────┐                          ┌──────────────────┐
   │ Track C HTML │  ─ independent ─        │ Track E IdeaBlocks │ ─ replaces
   │  Outputs (3) │                          │       (4)         │   chunk RAG
   └──────────────┘                          └──────────────────┘
              ▼                                           ▼
   ┌─────────────────────────────────────────────────────────┐
   │ Track B Autonomous Workflows (6 from cyrilXBT)          │
   │ Daily Context → Queue → Weekly Synth → Connection →     │
   │ Auto-Updater → Distillation                             │
   └─────────────────────────────────────────────────────────┘
              ▼
   ┌─────────────────────────────────────────┐
   │ Track D Company Brain (5 — biggest)     │
   │ provenance / ontology / conflicts /     │
   │ action traces / context evals           │
   └─────────────────────────────────────────┘
              ▼
   ┌──────────────────────────────────────┐
   │ Track F Capture surfaces (2)         │
   │ Voice (Whisper) + PDF Highlights     │
   └──────────────────────────────────────┘
              ▼
   ┌─────────────────────────────────────────────┐
   │ Track G Agent observability (3 from zodchi) │
   │ Job descriptions / Pixel-dept overlay /     │
   │ Run-time alerts                             │
   └─────────────────────────────────────────────┘
```

---

## All 24 units (full enumeration)

### Track A — Stabilization (PREREQ for everything)

| ID | Title | Why | Blocks | Depends |
|---|---|---|---|---|
| A1 | **U-DOCKER-HOOK-BROKER** | Persistent `prism-hooks` container holds all 50+ hooks warm; eliminates per-event node cold-start that's causing xmalloc OOMs across 6 chats | All other tracks | Nothing |
| A2 | **U-REREAD-SIGNAL-FINISH** | Wire the `Write\|Edit\|MultiEdit` matcher in settings.json so the recall counter sees writes (currently hook only fires on Reads) | Track B6 (distillation), Track D4 (action traces) | None — engine + tests already shipped (22/22 pass) |

### Track B — Autonomous Workflows (cyrilXBT 6-workflow playbook)

| ID | Title | Why | Trigger | Output |
|---|---|---|---|---|
| B1 | **U-DAILY-CONTEXT-WORKFLOW** | Synthesizes yesterday's daily note + active project overviews + inbox/ into a context brief for the day | 6 AM cron | `knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md` |
| B2 | **U-CONNECTION-FINDER** | Reads last 7 days of new memories, finds non-obvious connections to older entries (cross-domain, contradiction, evidence) | Weekly cron Sun 6 AM | `knowledge/memories/generated/CONNECTIONS-YYYY-WW.md` |
| B3 | **U-QUEUE-PROCESSOR** | Watch `knowledge/memories/queue/` for files like `RESEARCH-X.md`, `SYNTHESIZE-X.md`, `DRAFT-X.md`. Process every 2h via Ollama or Claude (size-gated). Output→generated/, archive→archive/ | every 2h cron + fs watcher | `knowledge/memories/generated/<TASK>-output.md` |
| B4 | **U-WEEKLY-SYNTHESIS** | 4-question retro: what moved, what didn't, emerging patterns, top-3 next-week leverage | Sunday 8 PM cron | `knowledge/memories/generated/WEEKLY-YYYY-WW.md` |
| B5 | **U-PROJECT-AUTO-UPDATER** | When a project subfolder file changes, auto-update the project's `overview.md` with one-line change summary | fs.watch | In-place update to `overview.md` |
| B6 | **U-KNOWLEDGE-DISTILLATION** | Monthly: distill 30 days of resources/areas notes into a single canonical reference per topic cluster (aligns with Akshay's IdeaBlock approach — they merge here) | Monthly cron | `knowledge/wiki/distillations/YYYY-MM-<topic>.md` |

### Track C — HTML Output Mode (Thariq playbook)

| ID | Title | Why | Files |
|---|---|---|---|
| C1 | **U-HTML-OUTPUT-MODE** | Add `--html` flag to `generate-claude-brief.mjs`, `generate-system-viz.mjs`, `build-state-snapshot.mjs`. Generate alongside markdown. Each gets info-dense layout with SVG, tables, color-coded status | `mcp-server/scripts/*.mjs` |
| C2 | **U-HTML-DASHBOARD** | One unified HTML dashboard at `state/shared/system-viz/dashboard.html` aggregating: system-viz embed + CLAUDE-BRIEF + BUILD_STATE + scrutiny ledger + recall top-20 + chat-bus presence + workboard. Auto-regenerate on Stop | `state/shared/system-viz/dashboard.html` |
| C3 | **U-HTML-DESIGN-SYSTEM** | Extract a PRISM design system HTML reference from `mcp-server/web/` so subsequent HTML generations match style. Per Thariq: "point Claude at codebase to extract design system" | `state/shared/design-system.html` |

### Track D — Company Brain (Sentra/Ashwin reframe — BIGGEST)

| ID | Title | Why | Files/Engines |
|---|---|---|---|
| D1 | **U-PROVENANCE-LAYER** | Every memory/wiki entry gets `source: { agent, sessionId, writeEvent, parentMemory? }` frontmatter. Memory-mirror enriches on write | `memory-mirror-to-vault.mjs`, `WikiRecallCounterEngine.ts` |
| D2 | **U-ONTOLOGY-LAYER** | Explicit type tagging: `fact \| interpretation`, `current \| deprecated \| draft`, `public \| internal \| confidential`. Frontmatter validates via Zod | new `MemoryOntologyEngine.ts` |
| D3 | **U-CONFLICT-RESOLUTION** | When 2 chats edit the same memory key concurrently, capture both versions in `conflicts/<key>.diff.md`. Resolution policies: last-writer / first-writer / human-arbitrate | new `MemoryConflictResolverEngine.ts` |
| D4 | **U-ACTION-TRACES** | Log every agent write as a graph edge: `(agent, prompt-hash, tool, target-memory, timestamp)`. Stored as JSONL append-only ledger. Queryable from system-viz | new `ActionTraceEngine.ts` + `state/shared/action-traces.jsonl` |
| D5 | **U-CONTEXT-EVAL-GATE** | Before any agent acts on memory: eval whether retrieved context was complete. Compare retrieved-set vs ideal-set (using golden eval set). Block / warn on coverage drop | new `ContextEvalEngine.ts` |

### Track E — IdeaBlock RAG (Akshay/Blockify pattern)

| ID | Title | Why | Files/Engines |
|---|---|---|---|
| E1 | **U-IDEABLOCK-EXTRACTOR** | Convert memory/wiki .md → IdeaBlocks via Ollama (qwen2.5-coder:7b w/ structured output). One question + 2-3 sentence validated answer per atomic claim | new `IdeaBlockExtractorEngine.ts` |
| E2 | **U-IDEABLOCK-DEDUP** | Iterative cosine-similarity dedup at 80-85% threshold, 3-5 rounds. Collapses near-duplicates into canonical blocks | new `IdeaBlockDedupEngine.ts` |
| E3 | **U-IDEABLOCK-RAG-ENGINE** | Replace ObsidianMemoryRagEngine's chunk-window approach with IdeaBlock matching. Expected 2.3× retrieval relevance | new `IdeaBlockRagEngine.ts` (lives in main repo, not iooms0) |
| E4 | **U-IDEABLOCK-GOVERNANCE** | Auto-tag each block with clearance level + version state + product line + export-control flags. Machine-applied, not author-applied | within `IdeaBlockExtractorEngine.ts` |

### Track F — Capture surfaces (already queued)

| ID | Title | Why | Files |
|---|---|---|---|
| F1 | **U-VOICE-CAPTURE** | Whisper local bridge → operator voice memos → tribal knowledge ingest. Phase 1: watcher script for .wav/.mp3 in capture-dir → transcript .md to inbox/ | new `scripts/voice-capture-watcher.mjs` + Whisper config |
| F2 | **U-HIGHLIGHTS-ONLY** | `--highlights-only` flag on `/pdf-learn`. Extract only PDF highlight annotations (Adobe `/Highlight` subtype) instead of full body. Cuts ingest noise 90% | `PDFKnowledgeIngestEngine.ts` |

### Track G — Agent Observability (darkzodchi 3-rule playbook)

| ID | Title | Why | Files |
|---|---|---|---|
| G1 | **U-AGENT-JOB-DESCRIPTIONS** | Codify narrow job descriptions per subagent type. Replaces "vibe" agents with "Oliver decomposes goals into weekly sprints" specificity | `state/shared/AGENT_JOB_DESCRIPTIONS.md` |
| G2 | **U-AGENT-PIXEL-DEPT-OVERLAY** | Extend system-viz with an agent-status overlay layer. Each subagent shows: idle / typing (writing) / parsing (reading) / errored. Pulls from chat-bus heartbeats | `generate-system-viz.mjs` + viewer JS |
| G3 | **U-AGENT-RUNTIME-ALERTS** | Watchdog: if subagent runs >N min without progress, alert via PushNotification. Build on existing chat bus | new `.claude/hooks/agent-watchdog.mjs` |

---

## Recommended execution order

1. **Stabilize first**: A1 (DOCKER-BROKER) → A2 (REREAD-SIGNAL-finish). Without A1, every other unit suffers from xmalloc OOMs that are blocking us right now.
2. **Quick wins in parallel** (touch isolated surfaces): C1 + E1 + F2. HTML output mode dogfoods Thariq immediately; IdeaBlock extractor proves the Akshay pattern; PDF highlights-only is contained.
3. **Workflows**: B3 (Queue Processor — most flexible, lets us defer-then-run any task) → B1 (Daily Context — daily compounding value) → B4 (Weekly Synthesis) → B2 (Connection Finder) → B5 (Project Auto-Updater) → B6 (Distillation, depends on E2).
4. **Track D Company Brain**: D1 (provenance — cheapest, foundational) → D4 (action traces) → D2 (ontology) → D3 (conflicts) → D5 (eval gate). This is the BIG architectural shift; allow 2-3 sessions.
5. **Voice + agent obs**: F1 + G1-G3 in parallel after Track D stabilizes.

## Risks / open questions

- **Cost projection**: Track D5 (context eval) requires golden eval set. Where does ground-truth come from? Manual seed needed.
- **Conflict with D3**: PRISM already has `commit-ownership-guard` for file-level conflicts. D3 is for semantic memory-key conflicts, different scope — confirm with user before building.
- **Track E vs Track B6**: Both touch "distillation". E is per-claim (IdeaBlock), B6 is per-topic (multi-claim doc). Build E first; B6 becomes "render distillations from IdeaBlocks".
- **Whisper scope (F1)**: User has JM Die operators. A Telegram bot for voice memos = real shop-floor capture surface. But bot deployment + auth + retention policies are real work. Phase F1 as just-the-watcher first.

## What I propose

Start the next session with **A1 + A2**. Once those land, fan out to **C1 + E1 + F2** in parallel (3 isolated tracks). Defer Track D until A is stable for ≥48 hours.

If approved, the immediate first step is:
```bash
git worktree add H:/prism-docker-broker -b work/docker-broker
# (per the U-DOCKER-HOOK-BROKER spec's coordination section)
```
