# hermes-zulu — slot:bravo (+ zulu/zebra orchestrator)

## Current state

**Size:** ~119 lines, ~5.8KB  
**Quality grade:** GOOD

The current CLAUDE.md is accurate and owner-maintained (bravo corrected stale mill/domain_filter drift on 2026-06-03). No fabricated engine names found — all 9 Hermes/Zulu engines cited in PATHS.md are verified on disk (`HermesParallelFanoutPlannerEngine.ts`, `HermesFileScopePartitionerEngine.ts`, `HermesParallelBudgetEnvelopeEngine.ts`, `HermesParallelVerdictAggregatorEngine.ts`, `HermesSelfCorrectionEngine.ts`, `ZuluTaskAuctionEngine.ts`, `ZuluDashboardControlEngine.ts`, `ZuluFleetGovernorEngine.ts`, `MoonshotClientEngine.ts`). Dispatcher actions cited in TOOLBELT.md verified in `sessionDispatcher.ts` + `memoryDispatcher.ts`.

**Issues found:**
- The file is a flat chronological append-log (MEMORY.md-style), not a doctrine reference. Scrolling 119 lines of shipped-session prose to find what dispatcher actions exist wastes tokens every turn.
- §"What lives here" lists file paths that are already exhaustively covered in PATHS.md — duplication.
- §"Related galaxies" block is duplicated verbatim between CLAUDE.md and MEMORY.md (both have the same 5 cross-galaxy bridges).
- §"Cross-cutting methodology" (~18 lines, GALAXY-ENRICHMENT-PROGRAM cross-lane) is an injected boilerplate stanza that every 34-galaxy CLAUDE.md received; it adds no hermes-zulu-specific content.
- §"Closed-loop integration with india" + §"AI-systems fleet state" pointer are valid but could be a 2-line pointer to MEMORY.md rather than inline text.
- The `<!-- CRITIC-KEEPWORKING-STANZA -->` block (R6/R12 doctrine) is a generic pointer correctly flagged "global doctrine, do NOT duplicate" — it belongs in the universal-core pointer, not inline here.
- No explicit "what a fresh bravo/zulu chat does in the first 3 minutes" onboarding checklist.
- No explicit "hermes-zulu has NO named dispatcher — all C2 is routed via `prism_session`" callout at the top; this is the single most surprising fact for any new bravo/zulu chat and is currently buried in TOOLBELT.md.
- The `RULES.md` reference (line 11) cites a file in "this dir" that does NOT exist as a standalone file — the rules are actually inlined in CLAUDE.md itself; the pointer is misleading (// UNVERIFIED path `mcp-server/src/engines/hermes-zulu/RULES.md`).

---

## KEEP

1. **§ Galaxy rules / open-tasks pointer** (lines 11-14) — the BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md pointer is essential for context-regain; keep the ledger ref and the 5 shipped deliverables callout.
2. **§ What lives here — runtime surfaces** (Hermes runtime block, lines 18-31) — accurate, load-bearing inventory of the C2 surface; compresses well.
3. **§ Stub-hunter (bravo's recurring duty)** (lines 33-37) — the 3 scripts are verified, and the adversarial doctrine framing is non-obvious and worth keeping.
4. **§ Anti-patterns** (lines 39-45) — the refuse-list here is more prose-complete than SOUL.md's terse bullet form; worth keeping as the authoritative refuse narration.
5. **§ Karpathy 5-step (R9, R10, R12 emphasis)** (lines 47-51) — hermes-zulu-specific interpretation of the 3 rules that bite this domain most. Keep.
6. **§ Related galaxies** (first block, lines 53-59) — keep ONE copy (drop the duplicate in MEMORY.md-mirrored section).
7. **§ Wiki cross-refs** (lines 61-66) — verified wiki entries are load-bearing pointers.
8. **§ Closed-loop integration with india** (lines 70-88) — the 4 dispatcher actions (`xproc_outcome_publish`, `xproc_kg_project_features`, `prism_knowledge:tribal_capture slot=bravo`, `xproc_calibration_monitor_record`) are specific and actionable; keep as a compact callout.
9. **§ AI-systems fleet state pointer** (the `<!-- AI-SYSTEMS-STATE -->` block) — 4-line pointer to the persisted sidecar; valid and cheap to keep.

---

## DROP

1. **§ Cross-cutting methodology** (lines 93-119 in current file, GALAXY-ENRICHMENT boilerplate) — 18+ lines of generic Ollama/loops/vault/LoRA/CAG/RAG doctrine that is identical across all 34 galaxies and is already in the universal CLAUDE.md. Zero hermes-zulu-specific content. Drop entirely; replace with the single universal-core pointer.
2. **§ Related galaxies (PSN edges — symmetric)** second instance (line 91) — exact duplicate of lines 53-59; drop one.
3. **§ `<!-- CRITIC-KEEPWORKING-STANZA -->`** (lines 114-119) — correctly self-labelled "global doctrine, do NOT duplicate." Drop; the universal-core pointer covers it.
4. **§ `RULES.md` reference** as a separate file — the file does not exist; the rules are inline. Rewrite as inline operator-grants (B-1..B-4) without a phantom file pointer.
5. The flat path inventory in "What lives here" — already exhaustive in PATHS.md; drop from CLAUDE.md, keep a single pointer to PATHS.md.

---

## ADD (domain-specific — the heart of this assessment)

### 1. No-named-dispatcher callout (top-of-file, P0)
```
DISPATCHER: none named. All hermes-zulu C2 routes via `prism_session` actions wired to the engines below.
Do NOT search DISPATCHER_DIGEST.md for "hermes" — it will return zero hits (correct, not a bug).
```

### 2. C2 surface quick-reference (the daily lookup table)
Currently scattered across MEMORY.md + TOOLBELT.md. The galaxy CLAUDE.md should carry the canonical one-stop:

| Action | Engine | When |
|--------|--------|------|
| `prism_session:zulu_authority_check` | `ZuluFleetGovernorEngine` | Before any cross-slot directive |
| `prism_session:zulu_task_auction` | `ZuluTaskAuctionEngine` | Distribute work orders to slots |
| `prism_session:hermes_fanout_plan` | `HermesParallelFanoutPlannerEngine` | Plan a parallel-agent burst |
| `prism_session:hermes_file_scope_partition` | `HermesFileScopePartitionerEngine` | No-collide file partitioning |
| `prism_session:hermes_budget_estimate` | `HermesParallelBudgetEnvelopeEngine` | Per-fanout token/turn budget |
| `prism_session:hermes_verdict_aggregate` | `HermesParallelVerdictAggregatorEngine` | Merge parallel verdicts |
| `prism_session:hermes_self_correct` | `HermesSelfCorrectionEngine` | Self-correction loop |
| `prism_session:dream_scan` | `DreamMarkerScannerEngine` | Parse offline DREAM: markers |
| `prism_session:dream_markers_to_proposals` | `DreamMarkerScannerEngine` | Markers → DreamArtifactBundle |
| `memoryDispatcher:weekly_synthesis_get` | sidecar reader | Read weekly self-reflection output |
| `prism_context:slot_brief_write` / `slot_brief_list` | `SlotBriefEngine` | Hermes → slot targeted brief channel |
| `prism_session:model_attribution_record` / `_summary` | `ModelAttributionEngine` | Fleet model-provenance ledger |
| `prism_session:opus_assess_complexity` | `OpusCapabilityEngine` | Model-tier complexity routing |

### 3. Fleet inter-channel map
Three inter-chat channels exist and bravo/zulu must pick the right one:
- **slot-soul** (`state/shared/slot-souls/<nato>.md`) — persistent persona/voice/refuses; changes on schemaVersion bump only.
- **chat-bus** (`state/shared/AGENT_CHAT.jsonl`) — broadcast to all slots; read by `chat-bus-inject.mjs`.
- **slot-brief** (`state/shared/slot-briefs/<slot>.md`) — targeted, consume-once; written via `prism_context:slot_brief_write`; delivered by `slot-brief-inject.mjs`. Use for Hermes → specific slot work orders.

Wrong channel choice (e.g., writing a targeted directive to the chat-bus) = fleet-wide noise. The correct lookup: **broadcast → chat-bus · persona-change → soul-file · targeted one-shot → slot-brief**.

### 4. Governance gate (explicit — not just implied by refuses)
```
unsafe-fleet-control-before-governance is a HARD REFUSE.
ZuluFleetGovernorEngine is READ-ONLY (authority checks only).
The :8767 control path (veto/escalate/promote) is GOVERNANCE-GATED — do NOT actuate it until
the readiness audit clears. Readiness: [[reference_hermes_control_readiness_nogo_2026_06_01]].
Zero slots have zuluOptIn — even if governance clears, opt-in is per-slot.
```

### 5. Stub-hunter operational cadence
Currently stated as a principle but not as a runnable procedure. Add:
```bash
# Every milestone close-out (non-optional):
node scripts/stub-sweep-full.mjs          # 5-pattern codebase sweep
node scripts/audit-unwired-engines.mjs    # orphan detection
node scripts/reconcile-zulu-ledger.mjs    # FIRST at context-regain (rots in hours)
```

### 6. Self-reflect populater liveness contract
The Sunday 20:53 cron offset was chosen to avoid 4 other scheduled tasks (Fleet Reaper +210s, Memory Monitor +330s, Cleanup Orchestrator +60s, Zulu Orchestrator). Any time change requires re-running the offset calc. If `hermes_reflection.exists=false` in a `weekly_synthesis_get` response → the cron is dead; re-register via `install-hermes-self-reflect-task.ps1`. // UNVERIFIED: installer script name — verify before citing.

### 7. Security gotcha: hostile-payload in self-reflect input
The populater consumes peer chat output. Arm-B scrutiny (2026-05-xx) found a greedy-slice exploitability class. **Always parse with bounded `firstBrace..matched-pair` scan; never `JSON.parse` on unbounded peer output.**

### 8. CRLF landmine (Windows-specific)
The repo is de-facto CRLF on Windows (Git-for-Windows). LF is un-stickable from a Git-for-Windows session. Do NOT burn budget fighting EOL. See [[reference_git_crlf_windows_reality_2026_06_02]].

### 9. Hermes app operational facts
- Binary: `…/hermes-agent/apps/desktop/release/win-unpacked/Hermes.exe` (Electron)
- Web UI: `http://127.0.0.1:9120` — check before assuming it is up
- PRISM MCP: `:3100/mcp` — Hermes `config.yaml` wires `mcp_servers.prism` here
- Auth: `provider: anthropic`, `base_url: ''`, credential source `claude_code` (reads `~/.claude/.credentials.json` Bearer); NOT OpenRouter (credit-exhausted)
- Config backup: `config.yaml.bak-opus48-20260604-095223`
- Obsidian: `H:/OBSIDIAN/Obsidian.exe`, open vault = `H:/prism/knowledge`
- Hermes-Obsidian bridge cron: `PRISM Hermes-Obsidian Bridge` (every 15m, `scripts/hermes-obsidian-memory-bridge.mjs`)
- `approvals.cron_mode: deny` (config:435) blocks scheduled cron — flip requires config edit + restart

### 10. What NOT to do in this domain
- Do NOT add `zebra` to `SLOT_NAMES` — Hermes/Zulu is slot-LESS as the conductor above the 25 worker slots.
- Do NOT use `git add -A` or `git add .` in the shared tree — thousands of peer-unrelated files absorb.
- Do NOT treat `prism_session:master_index_query` as a multi-word search — pass ONE distinctive token; multi-word queries filter to empty.
- Do NOT fire `prism_memory:semantic_search` without a Qdrant liveness check first — returns `{ok:false}` silently when down; fall back to master `MEMORY.md §Indexed memories`.
- Do NOT run the 5h-account-switch coordinator without `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` set — it is INERT by default (unsafe-fleet-control gate).
- Do NOT clean stale `pct=1` sidecars from the superseded `populate-5h-quota.mjs` without verifying against the current `five-hour-token-sum.mjs` chain (mis-switch risk).

---

## IDEAL SECTION OUTLINE

```
# hermes-zulu — slot:bravo (+ zulu orchestrator)

## Identity + dispatcher callout      ← NO named dispatcher; all C2 = prism_session
## Operator grants (B-1..B-4)         ← free reign, auto-apply-all-galaxies, slot/bravo commit, launch Hermes+Obsidian
## C2 surface quick-reference         ← table: action | engine | when (13 rows, verified)
## Fleet inter-channel map            ← soul / chat-bus / slot-brief + when to use each
## Governance gate (hard refuse)      ← unsafe-fleet-control explicit callout + readiness status
## Bravo duties
  ### Stub-hunter cadence             ← 3 scripts + run-on-milestone-closeout rule
  ### Soul-file maintenance           ← schemaVersion gate + drift check
  ### Galaxy buildout                 ← pointer to state/shared/per-slot-galaxy-buildout/bravo.md
## Zulu duties
  ### Fleet synthesis pattern         ← ZULU-CROSS-SLOT-<topic>-<date>.md per multi-slot pass
  ### Moonshot routing                ← MoonshotClientEngine → Opus; alpha audits cost
  ### Self-reflect consumer           ← weekly_synthesis_get sidecar; liveness check
## Anti-patterns (refuse list + prose)
## Security gotcha: hostile-payload
## Hermes app operational facts
## CRLF landmine
## Context-regain procedure           ← reconcile-zulu-ledger.mjs FIRST, then ledger
## Closed-loop integration (india)    ← 4 actions, compact
## Cross-galaxy bridges               ← 5 entries, one copy
## Wiki cross-refs                    ← verified pointers
## AI-systems fleet state pointer     ← 4-line pointer to sidecar
## → UNIVERSAL-CORE POINTER           ← see main CLAUDE.md
```

---

## UNIVERSAL-CORE POINTER

The following must remain accessible from the galaxy CLAUDE.md as a single pointer line — **not duplicated inline**:

```
→ Universal doctrine: H:/prism/CLAUDE.md
  Required sections: EXPERT ROLE · TOKEN ECONOMY · KARPATHY DISCIPLINE · CLAUDE.md RULES R5-R15 ·
  SCRUTINY GATE (3-of-3) · PER-CHAT HANDOFF (per-agent-handoff.mjs) · COMMIT FORMAT [SCOPE]/U-ID ·
  SAFETY RAILS (units-first, no-stub, no-inline-constants) · ENGINE WIRING (wire-to-all-sources) ·
  WIKI PROTOCOL · GOLF SLOT · MCP DISPATCHERS
```

Sections that bravo/zulu do NOT need from main (and should NOT inline):
- §WEDM AGI Status, §LATHE/MILL studio paragraphs — wrong domain
- §DOMAIN-GALAXY-DOCTRINE-MS0 full prose — pointer to the spec is sufficient
- §JULIETT-12CHAT-ALLOCATION-MS0 full prose — advisory only, not bravo/zulu daily ops
- §KNOWLEDGE-CONVERSION-MS0 / §RGS-TOOL-AUTOINVOKE full prose — background context for other slots
- §PSN-OCTOPUS-FLEET-SYNERGY / §CROSS-SUBSTRATE-SYNERGY full prose — these already live in MEMORY.md; a 1-line pointer to the wiki entry suffices
- §NN-GRAPH multi-paragraph status — MEMORY.md carries the live state; galaxy CLAUDE.md needs only the recall command
