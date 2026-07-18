# cam session 9a9efb2b (2026-06-22, 24.4MB, spine 171KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- **Ollama offloading** – 11743cf441, c299e2c477, e35ceca1c2+2ca92f74c5, 81b75e89a6: success‑rate per exitCode = 3, narrow failure guard, drift guard, bridge‑visibility via ask‑* hooks.  
- **PSN savings telemetry** – 6b78070b28+9b593fc6b4, 54f0b2d7a8→e013cef6b9: prompt‑rewriter hit logic (349 hits), tail‑read cap raised to 64 MB, full ledger coverage.  
- **AW‑1** – 17eb3a1acf: byte‑estimate “critical” guard fixed; /compact no longer triggered erroneously.  
- **Subagent injection instrument** – cf40d23901: measures 3.65 KB spawn ceiling; 0693e28ef0, debbc636ce, 0368e414b4, 717c19fcbf: comment‑accuracy fixes, wiki lessons, CLAUDE.md correction to 3.65 KB.  
- **Force‑loop stuck‑picker** – 46d33ef8de, 965b9da540, 662df285b4: progressGate high‑water mark logic; loop‑stuck detection lesson.

**DECISIONS**  
- Offload failure metric = only exitCode = 3.  
- Bridge visibility via self‑detecting ask‑* guard.  
- Prompt‑rewriter rewrites counted as hits (0 savings credit for augmentation).  
- Tail‑read cap → 64 MB; boundary truncation fixed.  
- PSN telemetry not shipped further (already completed).  
- Prioritize AW‑1, subagent injection instrument, token surface audit, force‑loop fix.  
- Leave picker peer‑active logic to cross‑lane owner.

**OPERATOR DIRECTIVES**  
- Continue building in alpha domain.  
- Find context‑retention improvements: AW‑1 identified.  
- Harden graph capabilities and utilization – verified.  
- Push until real bug found; address force‑loop issue.

**FINDINGS/BUGS**  
- ask‑hermes savings 0 → surfacing bridge executions fixed.  
- Prompt‑rewriter rewrites miscounted → now hits (349).  
- Tail‑read capped at 500 KB → under‑reported large ledgers; cap raised to 64 MB, truncation fixed.  
- Untracked ask‑* could silently disappear → guard added.  
- Failure recording omitted non‑model failures → now exitCode = 3 only.  
- PSN telemetry: two under‑reporting bugs fixed (rewrites, tail‑read).  
- AW‑1 byte‑estimate “critical” incorrectly triggered /compact → fixed.  
- Subagent injection ceiling measured 3.65 KB.  
- Token surface audit found ineffective per‑invocation mtime cache pattern.  
- Force‑loop stuck‑picker bug: progressGate keyed on iter reset → endless nagging; fixed.

**DOMAIN SPECIFICS**  
- Engines/dispatchers: ask‑ollama, ask‑hermes, ask‑openrouter, per-agent-handoff.mjs, cmdWrite.  
- Metrics: offloadDecisions, executedOffloads, bridgeExecutions, tokensSaved, savedTokens, nudges.  
- Paths: /checkin-alpha slot‑binding wrapper; scripts/system-viz-query.mjs; psn-savings-aggregate.mjs; tailRead() in state/shared/dashboards/.  
- Subagent injection audit: measure-subagent-injection.mjs, injection-dedup.mjs, audit-injection-surface.mjs.  
- Graph access surface: system-viz-query.mjs, subgraph-retrieve.mjs, node-card-read.mjs.  
- Loop‑state and force‑loop‑continue hook logic.

**TOOLS USED**  
- PRISM helpers: .claude/helpers/chat-slots.mjs, .claude/commands/checkin.md.  
- Scripts: system-viz-query.mjs, ask-ollama.mjs, psn-savings-aggregate.mjs, measure-subagent-injection.mjs, audit-injection-surface.mjs.  
- Hooks: recordOllamaEvent (ollama-stats.mjs), subagent-start-context.mjs, agent-rules-inject.mjs, loop-state.mjs, force-loop-continue.

**OPEN THREADS**  
- Incremental‑aggregation refactor (offset‑cursor design).  
- RTK adoption‑measure under‑credit gap.  
- Legacy ledger naming mismatches (pre-tool-savings-multi.jsonl header).  
- Picker peer‑active skip logic (U‑NN‑TIER05) – cross‑lane.  
- Graph sidecar auto‑regen‑on‑stale – cross‑lane.
