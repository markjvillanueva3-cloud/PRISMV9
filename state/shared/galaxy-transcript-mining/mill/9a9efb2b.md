# mill session 9a9efb2b (2026-06-22, 24.4MB, spine 171KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U‑SUBGRAPH‑RETRIEVE – commits 256388a702, 2a7b5c0b58  
- BRIDGE‑EXEC‑VISIBILITY – commit 81b75e89a6 (exposed ~874 off‑Claude executions)  
- OFFLOAD‑SUCCESS‑RATE – 11743cf441 (added `recordFailure()` for Ollama failures)  
- OFFLOAD‑EXITCODE‑NARROW – c299e2c477 (guard exitCode 3 only)  
- OFFLOAD‑DRIFT‑GUARD – e35ceca1c2, 2ca92f74c5 (self‑detect untracked bridges)  
- PSN‑REWRITE‑SHAPE‑FIX – 6b78070b28, 9b593fc6b4 (corrected 349 rewrite counts)  
- TAIL‑READ‑CAP – 54f0b2d7a8, e013cef6b9 (raised cap to 64 MB; fixed 13.2 MB truncation)  
- AW‑1: byte‑estimate “critical” downgrade guard – 17eb3a1acf  
- U‑SUBAGENT‑INJECTION‑MEASURE – cf40d23901, 0693e28ef0 (instrumented Task/Agent‑spawn ceiling)  
- Token‑surface audit – 0368e414b4 (verified no token‑savings wins)  
- Force‑loop stuck‑picker bug fix – 46d33ef8de, 965b9da540, 662df285b4  

**DECISIONS**  
- Prioritized measurement honesty; fixed under‑reporting bugs before feature churn.  
- Adopted verify‑first approach; only changed code after live data inspection.  
- Chose incremental‑aggregation refactor next (offset‑cursor redesign).  
- Declined PSN telemetry unit shipping; all real bugs fixed.  
- Ship AW‑1 as highest‑value in‑lane lever.  
- Added subagent‑injection instrument to close documented gap.  
- Fixed loop stuck‑picker bug per AUTO‑FIX‑INLINE.  

**OPERATOR DIRECTIVES**  
- Keep pushing through queued units.  
- Continue hardening graph capabilities and utilization.  
- Find improvements for context retention, prism awareness, obsidian vault.  
- Proceed to next in‑domain task (incremental aggregation or RTK adoption).  

**FINDINGS/BUGS**  
- `ask-hermes` executions invisible to metrics; exposed `tokensSaved`.  
- Ollama success rate misreported 100% due to missing failure logging.  
- Tail‑read capped at 500 KB truncated 13.2 MB ledgers; raised cap to 64 MB.  
- PSN rewrite ledger misclassified rewrites as misses; now counted correctly (0 savings credit).  
- PSN telemetry under‑reporting of tail‑read and prompt‑rewrite savings (fixed).  
- AW‑1 byte‑estimate “critical” incorrectly triggered `/compact`.  
- Subagent injection overflow claim stale doc; actual ceiling 3.65 KB.  
- CU‑1/CU‑1b dedup TTL & synergy‑inject dedup already optimized.  
- `agent-rules-inject` name‑gating redundant for current Agent tool.  
- Loop stuck‑picker bug: `progressGate` keyed on iter, resets on picker rolls.  

**DOMAIN SPECIFICS**  
- Engines/dispatchers: `ask‑ollama`, `ask‑hermes`, `ask‑openrouter`.  
- Metrics: `recordOllamaEvent`, `bumpTotals`, `tallyUsage`, `psn-savings-aggregate`.  
- Paths: `per-agent-handoff.mjs` (slot‑commit), `system-viz-query.mjs`, `subgraph-retrieve.mjs`, `node-card-read.mjs`.  
- Token‑pressure stack: `chat-token-watch.mjs::readChatPressure`, `ask‑hermes.mjs`, `ask‑ollama.mjs`.  
- Subagent context injection: `subagent-start-context.mjs`, `measure-subagent-injection.mjs`.  
- Loop control: `loop-state.mjs` (picker/roll), `progressGate`.  
- Injection‑budget audit: `audit-injection-surface.mjs`, `measure-userpromptsubmit-budget.mjs`.  

**TOOLS USED**  
- PRISM commands: `/checkin-alpha`, `/handoff`; scripts: `ask‑ollama.mjs`, `ask‑hermes.mjs`, `chat-token-watch.mjs`, `measure-subagent-injection.mjs`, `system-viz-query.mjs`, `subgraph-retrieve.mjs`, `node-card-read.mjs`.  
- Helpers: `cmdWrite`, `atomicWriteSync`, `tailRead`.  
- Testing: Jest/Node suites, sonnet scanners, workflow audit runner.  

**OPEN THREADS**  
- Incremental‑Aggregation Refactor (offset‑cursor redesign).  
- RTK‑Adoption‑Measure Under‑Credit verification.  
- Cross‑lane items: India’s GNN tier‑5 (`U-NN-TIER05`), Sierra’s graph sidecar auto‑regen (`system-viz`).  
- Potential picker peer‑active skip fix.  
- Memory→wiki promotion sweep for discovered insights.  
- Any‑domain “fixes” or new alpha‑axis work pending steering.
