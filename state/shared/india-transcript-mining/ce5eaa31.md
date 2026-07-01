# india session ce5eaa31 (2026-06-25, 12.1MB, spine 89KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus utilization driver + cron (`commit 7acb5253a5`) – rotates 10‑question pool, drives consensus, Ollama inference, Hermes Grok voice, Obsidian write‑back, PSN ledger.  
- Ollama stress harness & `num_ctx` fix (`commits d79f06d849`, `52bbd7bedb`, `f190542258`) – measures capability frontier, concurrency limits, wedge guard, auto‑scales KV cache per request.  
- Codegen & other batteries (`commit 135fdb5a2e`, `f00515f3d7`) – verified stress tests for code generation, reasoning, long‑context, JSON‑schema, instruction, manufacturing‑domain tasks.  
- New batteries + wedge‑guard `--recover && <probe>` command chain – empirical validation of byte‑`num_ctx` fix (100 % long‑context at 16K).  

**DECISIONS**  
- Fleet‑reaper ownership moved from alpha to golf; use `/checkin-golf` or `/fleet-reaper`.  
- Ship octopus driver as a single unit covering 5 substrates per tick.  
- Build Ollama stress harness with concurrency sweep, wedge guard, and per‑request `num_ctx`.  
- Wire the `num_ctx` fix into offload path to avoid KV cache wedges; harden against self‑induced wedge.  
- Queue expansion of octopus coverage to all 34 galaxies.  
- Adopt wedge‑guard recover & probe chaining for clean local‑model metrics on busy box, outperforming Ollama’s fleet‑load wedge.  
- End current session due to budget ceiling (~48 min limit).  

**OPERATOR DIRECTIVES**  
- `/goal`: improve Hermes CLI/agent, Obsidian vault, PSN, `/system-viz`, Ollama offloading, and octopus utilization across the entire system; use engineered loops/crons.  
- Keep stress testing capabilities (codegen, reasoning, long‑context, JSON‑schema, instruction, mfg‑domain).  
- Continue workflow authoring/review of batteries.  

**FINDINGS/BUGS**  
- Octopus substrate dormant → driver now active.  
- Ollama offload 34 % but suggestion→execution gap (5/209 suggestions executed).  
- Concurrency wedge at c=8 due to KV cache reservation (131072 context × parallel slots); per‑request `num_ctx` fix resolves wedge; concurrency knee at c=2, safe up to 4.  
- CJK truncation bug in codegen battery fixed via UTF‑8 byte sizing.  
- Stale task false positives resolved; no action needed.  
- Codegen self‑test failures fixed by workflow review.  
- Manufacturing facts inaccuracies and instruction precision issues identified.  
- Robust code generation, 100 % long‑context handling at 16K, reliable JSON processing confirmed.  

**AI‑SYSTEM SPECIFICS**  
- Engines: Octopus (`runLive`), Ollama (qwen2.5‑coder 1.5b/7b/14b, gpt‑oss 20b, deepseek‑r1 14b), Hermes (Grok proxy), Obsidian write‑back, PSN ledger.  
- Actions: rotate question pool, consensus, ledger updates, outcome feed to `wedm.jsonl`, system‑viz ping.  
- Metrics: ledger growth (62→65→...), outcome count, tok/s throughput (80–200 tps for 7b, 36–44 tps for 14b), concurrency peak at c=2 (~255 tps), wedge at c=8.  
- Deploy gates: 3‑of‑3 scrutiny, per‑file 2‑arm review, commit hygiene, loop tick, handoff.  
- Model names: qwen2.5‑coder (1.5b/7b/14b), gpt‑oss (20b), deepseek‑r1 (14b).  
- Dataset/corpus paths: galaxy‑synthesis open‑threads for question pool; ledger and `wedm.jsonl` in octopus‑outcomes.  
- Wedge‑guard recover & probe chain metrics: long‑context success rate 100 % @16K.  

**OPEN THREADS**  
- Expand octopus utilization driver to all 34 galaxies.  
- Address Ollama suggestion→execution gap (209 suggestions vs 5 executed).  
- Further capability testing for codegen, instruction precision, mfg‑domain specifics.  
- Potential config tweak: `OLLAMA_NUM_PARALLEL` / `OLLAMA_MAX_LOADED_MODELS`.  
- Budget ceiling and session time limit require continuation in the next session.
