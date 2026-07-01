# OBSIDIAN-COMPOUND-MS0 — Status

**Created:** 2026-05-07 by claude-cee63f1f
**Trigger:** /forge audit of Obsidian utilization vs cyrilXBT framing ("vault that gets smarter every day without you doing anything")
**Audit memory:** `[[reference_obsidian_compound_audit_2026-05-07]]`
**Total units:** 7 · **Shipped:** 4 · **Queued:** 3 · **Rescoped:** 1

## Shipped this session

| ID | Status | Files | Verification |
|---|---|---|---|
| U-MIRROR-CATEGORIES | ✅ DONE | `H:/prism/.claude/hooks/memory-mirror-to-vault.mjs` | `lesson_*` + `decision_*` prefixes added; route to `lessons/`+`decisions/` vault subdirs (closes gap from `[[reference_obsidian_vault_subdirs]]`) |
| U-BRIEF-WIKI | ✅ DONE | `H:/prism/mcp-server/scripts/generate-claude-brief.mjs` | New "Wiki + memory pulse" section injects last 5 distinct `wiki/log.md` ops + `memories/` 24h activity. Verified: `node generate-claude-brief.mjs --write` renders cleanly. |
| U-ROUTING-LEDGER | ✅ DONE | `H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts` | Every `route()` call appends JSONL to `H:/prism/knowledge/summaries/routing-decisions.jsonl`. Best-effort write (never blocks routing). |
| Audit memory | ✅ DONE | `C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/reference_obsidian_compound_audit_2026-05-07.md` | Auto-mirrored to vault via PostToolUse hook (`reference/` subdir). |

## Queued for next session

| ID | Title | Files (planned) | Effort | Spec |
|---|---|---|---|---|
| U-WIKILINK-OLLAMA | Auto-suggest `[[wiki-links]]` on memory writes | new `H:/prism/.claude/hooks/wiki-link-suggest.mjs` (PostToolUse on memory writes) | ~80 LOC | Ollama prompt: "Given this memory body and the wiki/index.md catalog of 722 entries, list the 1-4 entries it should `[[link]]` to. Return JSON: `{links:[...]}`." Append suggestions as `<!-- suggested-links: [[X]], [[Y]] -->` comment for human review (don't auto-insert into body). |
| U-RECALL-COUNTER | Per-entry recall counter + hot-entry promotion | new `H:/prism/mcp-server/src/engines/WikiRecallCounterEngine.ts` + dispatcher action `prism_memory:recall_increment` + state file `mcp-server/data/state/wiki-recall-counter.json` + companion test | ~100 LOC | New engine in MAIN prism (NOT iooms0). Wire into `memory-rag-inject.mjs` post-injection callback to increment per surfaced entry. `WikiIndexMaintainerEngine` reads counts to maintain a "hot entries" section in `wiki/index.md`. |
| U-SKILL-TELEMETRY | Weekly skill-usage digest → vault | new `H:/prism/.claude/hooks/skill-telemetry-digest.mjs` (Stop hook, runs once per ISO week) | ~60 LOC | Read existing skill telemetry source (find via grep on `skill_invocation` or similar), aggregate by skill name × count for current ISO week, write `H:/prism/knowledge/summaries/skills-YYYY-WW.md`. Skip if file already exists for current week. |

## Rescoped after deeper inspection

| ID | Original framing | Reality | New framing |
|---|---|---|---|
| U-RAG-EXECUTE | "Convert ollama-obsidian-rag from suggest to execute" | Hook ALREADY has both branches. `recordOllamaEvent({decision: 'offload', tokensSaved: 400})` fires when Ollama returns content; `decision: 'suggest'` fires when Ollama is reachable but returns null. Last session's "16 suggest / 0 offload" telemetry = Ollama reachable but `queryOllamaRAG()` returning null. | **U-RAG-RELIABILITY** — investigate why Ollama returns null: (a) bump curl-execSync timeout from 5s→8s, (b) try fetch instead of execSync, (c) fallback model on null, (d) log full raw response on null for diagnosis. Defer to next session — needs Ollama-side debugging. |

## Compounding effects observed

- Tier 1 ships AT LEAST these compounding wins per cyrilXBT framing:
  - **U-MIRROR-CATEGORIES** = "auto-categorize" pillar improved (lessons/+decisions/ now fill)
  - **U-BRIEF-WIKI** = "compounding" pillar improved (every SessionStart now reads vault activity, not just inventory+git)
  - **U-ROUTING-LEDGER** = vault accrues a routing audit trail without any human logging
  - **Audit memory** = vault now contains the audit itself, queryable in future sessions via `[[reference_obsidian_compound_audit_2026-05-07]]`

## Cross-session constraint observed

`ObsidianMemoryRagEngine` source lives in `H:/prism-iooms0/`, claimed by claude-a09ce89e. **U-RECALL-COUNTER must implement as a separate engine in MAIN H:/prism/`** (not as a method on the iooms0 engine). The counter writes a sidecar state file that the iooms0 RAG engine can consume via lazy import once upstreamed.

## Verification commands

```bash
# Tier 1 verification (already passing in claude-cee63f1f session):
node H:/prism/mcp-server/scripts/generate-claude-brief.mjs --write
grep "Wiki + memory pulse" H:/prism/state/shared/CLAUDE-BRIEF.md
ls H:/prism/knowledge/memories/lessons/ H:/prism/knowledge/memories/decisions/  # may be empty until first lesson_/decision_ memory written

# After next memory write with `lesson_` prefix:
ls H:/prism/knowledge/memories/lessons/  # should now contain the file

# After AI router fires (next route() call from any engine):
ls H:/prism/knowledge/summaries/routing-decisions.jsonl
tail -1 H:/prism/knowledge/summaries/routing-decisions.jsonl  # JSONL with ts + decision

# Build verify (recommended before commit):
cd H:/prism/mcp-server && npx tsc --noEmit
```

## Cross-references

- [[reference_obsidian_compound_audit_2026-05-07]] — full audit + 6×Obsidian gap matrix
- [[reference_karpathy_llm_wiki_external_validation]] — pattern validation
- [[feedback_obsidian_low_token_2nd_brain_protocol]] — operating playbook
- [[reference_token_savings_baseline]] — Ollama offload telemetry (relevant for U-RAG-RELIABILITY)
