# mill session e2ac25ec (2026-06-06, 24.1MB, spine 94KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `416acfe8cd` – anti‑revert guard hardened (`no-retired-llm-refs.test.mjs`).  
- `0a86b1cf7d` – MultiModelConsensusEngine updated; octopus diverse N‑family panel.  
- `348f97c0f8` – ModelRoutingEngine wired with install‑gated catalog entries (4‑engine).  

**DECISIONS**  
- Use install‑gated routing (cost‑router, resolver) to auto‑activate models in main tree.  
- Complete BLACKWELL upgrade: retire small Ollama coders; ship gpt‑oss:120b (best), gpt‑oss:20b (fast), gemma4:31b (consensus).  
- Keep single healthy driver for `ollama pull`; never kill or add concurrent drivers.  
- Append poison‑partial mechanism to `feedback_ollama_pull_monitoring_discipline`.  
- Treat scheduled tasks marked “MISSING” as benign/intentional; no crash coverage gap.  

**OPERATOR DIRECTIVES**  
- User queried free cloud Kimi 2.6 → exists but fails data‑bar.  
- Integration (Phases 0–2) completed; remaining tasks outlined.  
- Precompact handoff with explicit RESUME directive.  
- Let PID 77860 finish `gpt‑oss:120b` pull; if exits, restart single `ollama pull gpt‑oss:120b`.  
- Upon model landing, run `U-BW-CATALOG-REALIGN` to auto‑activate.  

**FINDINGS/BUGS**  
- Pull monitoring unreliable when measuring disk bytes or calling `ollama list`; watchdogs killed healthy downloads.  
- Home link rate‑limit caused repeated 2 s drops for gpt‑oss:120b; aggressive backoff worsened it.  
- Stale slot worktree lacked guard file – resolved by committing in main tree.  
- Git index.lock contention from fleet hooks prevented immediate commit; required lock‑retry logic.  
- Anti‑revert guard false positives on trailing comments; fixed with `stripTrailingComment`.  
- Pull died silently; leftover `‑partial` files caused ~21 GB layer discard and restart.  
- Error `remove …‑partial‑0: cannot find file` triggered re‑pull; poison‑partial mechanism logs exact error string.  

**DOMAIN SPECIFICS**  
- Engines/Dispatchers: MultiModelConsensusEngine, ModelRoutingEngine, AISystemRouterEngine, OllamaHookBridgeEngine, OllamaTaskOffloaderEngine, `feedback_ollama_pull_monitoring_discipline`.  
- Metrics/Paths: `/api/pull` completion; guard scan via `scripts/no-retired-llm-refs.test.mjs`; slot logs in `H:/prism/.claude/helpers/chat-slots.mjs`.  
- Unique paths: `H:/prism/.claude/commands/checkin.md`, `H:/prism/.claude/helpers/audit-roadmap-drift.mjs`, `H:/Tools/ollama/bw-pull-loop.ps1`.  
- Phase 3 NIM/Docker gating: setx `NGC_API_KEY` and start Docker before wiring SessionStart hook.  

**TOOLS USED**  
- PRISM: `/checkin-alpha` wrapper, ultracode orchestrator, chat‑slot helpers, audit‑roadmap‑drift.  
- Scripts/hooks: anti‑revert guard test, `MultiModelConsensusEngine.ts`, `ModelRoutingEngine.ts`, `feedback_ollama_pull_monitoring_discipline`.  
- External: Ollama CLI (`ollama pull`, `/api/pull`), PowerShell retry driver `bw-pull-loop.ps1`.  

**OPEN THREADS**  
- Pull of gpt‑oss:120b (65 GB) and gemma4:31b pending; operator must run in terminal or rely on exit‑code‑only retry loop.  
- Phase 3 NIM/Docker requires operator to supply `NGC_API_KEY` and start Docker before wiring SessionStart hook.  
- Verify auto‑promotion (`resolveSynthesisModel → gpt‑oss:120b`) and run `U-BW-CATALOG-REALIGN` once models land.  
- Re‑register weekly tasks / remove superseded Zombie Reaper v2 from crash‑critical set.
