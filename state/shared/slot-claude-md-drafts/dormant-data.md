# Dormant-Data Galaxy -- slot:victor
> Universal rails (R1-R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama->Sonnet->Opus ladder · wiki protocol):
> -> `H:/prism/CLAUDE.md`. THIS file = dormant-data domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

Victor owns **knowledge-recovery infrastructure**: finding extracted/distilled data that PRISM paid
extraction cost for but never wired to a consumer. Every unconsumed extract is wasted Anthropic spend.

**OWNS:** classifying dormant assets, routing to the correct consumer galaxy, maintaining the dormant-data
ledger, coordinating engine findings to romeo.

**EXCLUDES:** wiring engines to dispatchers (romeo) · orphan-rank scoring (tango) · LoRA/GNN training
pipeline (india) · tribal-tip slot-mapping beyond capture (knowledge-conversion galaxy).

Slot: victor. Worktree: `H:/prism-slot-victor`, branch: `slot/victor`.

---

## 2. Verified engines

No local `.ts` engines live under `mcp-server/src/engines/dormant-data/` -- this galaxy is
infrastructure/protocol only. Cross-galaxy engines victor depends on:

| Role | Engine file (verified on disk) |
|------|-------------------------------|
| Duplication guard | `mcp-server/src/engines/DuplicationGuardEngine.ts` |
| Source sanitizer | `mcp-server/src/engines/SourcePoisoningSanitizerEngine.ts` |

Do not reference `KnowledgeConversionPipelineEngine.ts` -- does NOT exist on disk (dropped per assessment).

---

## 3. Dispatcher quick-ref

Primary: **`prism_dev`** · Secondary: **`prism_knowledge`**

| Action | Use | Verified |
|--------|-----|----------|
| `prism_dev:resource_census` | Count + classify a dormant root folder | devDispatcher.ts:2088 |
| `prism_dev:resource_census_read` | Read cached census report | devDispatcher.ts:2097 |
| `prism_dev:resource_census_summary` | Summary view of cached census | devDispatcher.ts:2103 |
| `prism_dev:dedup_might_contain` | Pre-wire bloom check (soft) | devDispatcher.ts:2206 |
| `prism_dev:dedup_is_definitely_new` | Pre-wire dedup check (hard) | devDispatcher.ts:2218 |
| `prism_knowledge:tribal_capture` | Promote tip with slot affinity | knowledgeDispatcher.ts:344 |

Full action list: `mcp-server/src/tools/dispatchers/devDispatcher.ts` ACTIONS array (line 36).

**MCP-down fallback:** `node H:/prism/scripts/orphan-inventory.mjs` (no dispatcher needed).

---

## 4. Canonical constants + data paths

No physics constants apply (data-recovery galaxy, not a physics domain).

| Store | Path | Rule |
|-------|------|------|
| Extraction log | `mcp-server/data/state/extraction-log.json` | Read before ANY re-extraction; `mustNotReExtract()` THROWS |
| Asset registry | `mcp-server/data/state/cross-session-asset-registry.json` | Fleet-wide creation log; check before routing new asset |
| Directory digest | `mcp-server/data/docs/DIRECTORY_DIGEST.md` | 215 dirs with purposes; consult before deciding route |
| Dormant ledger | `state/shared/dormant-data-ledger.jsonl` | **CREATE-ON-FIRST-USE** -- does not exist until victor creates it |

**Vendor extraction counts (inline -- avoids opening 1MB+ JSON):**
Mastercam: 45 · hyperMILL: 25 · Okuma: 63 · Fanuc: 35 · Haas: 28 · Titans: 42

**Ledger schema (create-on-first-use, append-only):**
`{ schemaVersion, sha, source_path, classification, consumer_found, route, status, prior_sha?, ts }`

---

## 5. Domain gotchas / safety rails

1. **Wrong script name in prior draft.** `scripts/audit-orphan-inventory.mjs` does NOT exist.
   Correct name: `scripts/orphan-inventory.mjs` (verified on disk).
2. **Dormant ledger does not pre-exist.** `state/shared/dormant-data-ledger.jsonl` must be created
   on first run -- do not block on "ledger not found."
3. **`KnowledgeConversionPipelineEngine.ts` does not exist.** Route data findings via the
   knowledge-conversion galaxy CLAUDE.md or wiki `[[architecture/knowledge-conversion-ms0]]`.
4. **Single grep is insufficient for consumer check.** Must search: `mcp-server/src/` AND
   `.claude/commands/` AND dispatchers AND hooks -- all four. Missing one returns false negatives.
5. **`harvest-*.mjs` scripts that exist are catalog harvesters (thomasnet/IMTS/prints), NOT a prior
   extraction harness.** `build-corpus-catalog.mjs` does NOT exist. Confirm exact path before invoking.
6. **Checkpoint every 50 files (R10).** Emit: root-being-swept / files-surveyed / findings-this-batch /
   ledger-entries-written. Depth-first sweeps run indefinitely without this gate.

---

## 6. What NOT to do

- **NEVER reference `scripts/audit-orphan-inventory.mjs`** -- wrong name; real: `scripts/orphan-inventory.mjs`
- **NEVER reference `KnowledgeConversionPipelineEngine.ts`** -- does not exist on disk
- **NEVER reference `outcome-bus-auto-tap.mjs`** -- fabricated; does not exist fleet-wide
- **NEVER treat `state/shared/dormant-data-ledger.jsonl` as pre-existing** -- create it on first use
- **NEVER run `build-corpus-catalog.mjs`** -- does not exist; confirm any script path before invoking
- **NEVER skip a directory** -- strict excavation order is doctrine; intuition-based skipping has missed
  100+ dormant assets in prior sweeps
- **NEVER classify without a cross-domain consumer check** -- incomplete classification = wrong route
- **NEVER promote a tribal tip without slot affinity** -- use `prism_knowledge:tribal_capture slot=victor`;
  never write directly to `knowledge/tribal/dormant-data-*.md` (auto-overwritten on regen)
- **NEVER bypass `SourcePoisoningSanitizerEngine.ts`** before ingesting any extracted content

---

## 7. Excavation workflow (pipeline contract)

**Roots -- STRICT ORDER (exhaust each before advancing):**
1. `H:/PRISM/extracted/` -- every file exhaustively (highest dormant density)
2. `H:/PRISM/extracted_modules/` -- every file exhaustively
3. Rest of `H:/PRISM` codebase -- folder-by-folder, alphabetically; no skipped directories

**Per-finding triage (5-step):**
1. **CLASSIFY** -- engine | data | formula | tribal-tip | wiki-candidate | other
2. **CONSUMER CHECK** -- grep across `mcp-server/src/` + `.claude/commands/` + dispatchers + hooks
3. **ROUTE**:
   - Engine, no consumer -> `/wire-unwired` (hand off to romeo)
   - Data, no consumer -> knowledge-conversion lane A/B/C
   - Formula -> port to `mcp-server/src/physics/constants.ts` if canonical
   - Tribal tip -> `prism_knowledge:tribal_capture slot=victor`
4. **RECORD** -- append to `state/shared/dormant-data-ledger.jsonl` (create if absent)
5. **COMMIT** `[MAIN] [DORMANT-DATA]/U-DD-<id>: <N> findings from <path>; <M> routed, <K> deferred`

Romeo coordination: post to `state/shared/AGENT_CHAT.md` tagging romeo before opening wiring PR;
check `mcp-server/data/claims/<unit>/claim.json`; use `DistributedLockManager.withLock()` for dispatcher edits.

---

## 8. Tribal + corpus pointers

- Wiki: `[[architecture/knowledge-conversion-ms0]]` · `[[architecture/duplication-guard-discipline]]` · `[[lessons/orphan-rescue-class]]`
- Synthesis brain: `mcp-server/src/engines/dormant-data/MEMORY.md`
- JM Die corpus: `prismSelfAwarenessEngine.getJMDieCustomerPath()` -- NEVER Glob the 24K-file tree
- Tribal capture rule: `prism_knowledge:tribal_capture slot=victor` -- never write markdown directly

---

## 9. Cross-galaxy edges (PSN)

| Direction | Galaxy | Bridge |
|-----------|--------|--------|
| OUT | `wiring/` (romeo) | engine findings; post chat-bus tag before wiring PR |
| OUT | `discovery/` (tango) | deduplicate orphan-inventory vs dormant-ledger before parallel work |
| OUT | `knowledge-conversion/` | data findings routed via lane A/B/C |
| OUT | `ai-training/` (india) | high-value tribal/data findings feed RAG/LoRA corpora |
| COORD | `blueprint-vision/` (xray) | `extracted/` contains CAD/blueprint artifacts; coordinate before those subtrees |

---

## 10. Closed-loop integration (india)

`xproc_outcome_publish {slot:'victor', domain:'dormant-data'}` // UNVERIFIED action name -- grep knowledgeDispatcher before calling.
`prism_knowledge:tribal_capture slot=victor` (verified knowledgeDispatcher.ts:344).
Spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`. Do not roll your own retrain trigger.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "dormant|orphan|extraction|duplication"
node H:/prism/scripts/orphan-inventory.mjs
```

---

## 12. Known bugs / open threads

- `state/shared/dormant-data-ledger.jsonl` -- does not exist yet; create on first run.
- Prior CLAUDE.md cited `scripts/audit-orphan-inventory.mjs` (wrong name) and
  `KnowledgeConversionPipelineEngine.ts` (fabricated) -- both dropped in this rewrite.

---

## 13. AI / reasoning surface

```bash
node H:/prism/scripts/lib/galaxy-reasoning-bridge.mjs dormant-data "<query>"
```

Ollama routing: classify/summarize dormant candidate -> `gpt-oss:20b`; wire-vs-archive decision ->
`gpt-oss:120b`; engine/hook code -> `qwen2.5-coder:32b`; trivial rename -> `qwen2.5-coder:1.5b`.

