# ai-training session ce5eaa31 (2026-06-25, 12.1MB, spine 89KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus utilization driver + cron (`scripts/octopus-utilization-driver.mjs`, `install-octopus-utilization-task.ps1`) – commit `7acb5253a5`.  
- Ollama stress harness (per‑request `num_ctx`, wedge guard, CJK byte‑sizing) – commits `d79f06d849`, `52bbd7bedb`, `f00515f3d7`.  
- Codegen sandbox escape fix (strict mode + disabled strings/WASI) – commit `f00515f3d7`.  
- New batteries & memory‑handoff code committed; capability data captured with byte‑num_ctx validated at 16K context.  

**DECISIONS**  
- Ship only the high‑ROI octopus driver, not all 7 substrates.  
- Override `num_ctx` per request instead of global config to avoid fleet restarts.  
- Adopt byte‑based sizing for CJK contexts; harden harness with wedge guard (zero‑success abort).  
- Use `wedge-guard --recover && <probe>` as the standard local‑model metric method, outperforming Ollama’s fleet‑load wedge.  
- Validate byte‑num_ctx fix across all six new dimensions; confirm 100 % long‑context performance at 16K tokens.  

**OPERATOR DIRECTIVES**  
- “Keep stress testing capabilities.”  
- Prioritize improvements to Hermes CLI/agent, Obsidian vault, PSN, system‑viz, Ollama offloading, and octopus utilization loops/crons.  

**FINDINGS / BUGS**  
- Ollama wedges at concurrency 8 (KV‑cache 131072 context × slots).  
- CJK truncation bug (`chars/3` heuristic) fixed via byte‑based sizing.  
- Codegen sandbox escape vulnerability patched with strict mode & disabled strings/WASI.  
- Per‑request `num_ctx` override resolves wedge; global change unnecessary.  
- Stale scheduled‑task warnings (NN‑Graph Retrain, Tribal Embed) are false positives.  
- Manufacturing fact inconsistencies and instruction precision errors uncovered in new batteries.  
- Strengths: robust code generation, reliable long‑context handling, accurate JSON output.  

**DOMAIN SPECIFICS**  
- Octopus: `runLive`, `octopus-first-live-record.mjs`; ledger growth 62→63; obsidian write‑back; PSN feed; system‑viz integration.  
- Ollama harness: `ask-ollama.mjs`, `callOllama`; per‑request `num_ctx`; wedge guard; concurrency & tier sweeps.  
- Cron registration via `install-octopus-utilization-task.ps1`; cron state tracked in S4U schedule.  
- New batteries focus on mfg facts, instruction precision, code‑gen, long‑context, JSON; benchmarked with `wedge-guard`/`<probe>`.  

**TOOLS USED**  
- Chat‑slot helpers (`.claude/helpers/chat-slots.mjs`).  
- `/checkin` pipeline (`.claude/commands/checkin.md`).  
- `audit-roadmap-drift.mjs`.  
- R8 per‑file scrutiny gate, R11 cron install convention.  
- `ask-ollama.mjs`, `runLive`, `octopus-first-live-record.mjs`.  
- `ollama-wedge-guard.mjs`.  
- Memory & wiki persistence hooks.  
- `wedge-guard --recover && <probe>` command chain; reference to Ollama’s fleet‑load wedge baseline.  

**OPEN THREADS**  
- Expand octopus utilization to all 34 galaxies.  
- Address Ollama suggestion→execution gap (209 suggestions vs 5 executed).  
- Complete full capability matrix for codegen, instruction, long‑context, reasoning, JSON‑schema, mfg domain across models.  
- Resolve or confirm stale task warning heuristic.  
- Evaluate higher concurrency limits or reduced context length for throughput gains.  
- Budget ceiling reached; session limited to ~48 min, leaving potential follow‑up work unaddressed.
