# mill session ce5eaa31 (2026-06-25, 12.1MB, spine 89KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus utilization driver (`scripts/octopus-utilization-driver.mjs`) – cron loop, commits `7acb5253a5`, `512046d0fc`.  
- Ollama stress harness with per‑request `num_ctx` guard – 19/19 tests, wedge fix; commits `d79f06d849`, `52bbd7bedb`, `f190542258`.  
- Codegen battery + runner (6 batteries) self‑test green after review; commits `135fdb5a2e`, security patch `f00515f3d7`.  
- byte‑num_ctx patch (`/path/to/byte-num_ctx.patch`) and memory/handoff scripts.  
- Reusable method: `wedge‑guard --recover && <probe>` for local‑model benchmarking.

**DECISIONS**  
- Ship single high‑ROI unit (octopus driver) now; queue expansion to all 34 galaxies later.  
- Use per‑request `num_ctx` guard instead of global config to avoid fleet restarts and safety risk.  
- Keep GPU concurrency ≤2 unless proven otherwise; model‑outer sweeps for safety.  
- Adopt byte‑num_ctx fix achieving 100 % long‑context coverage at 16K tokens.  
- Prefer wedge‑guard chaining over Ollama’s fleet‑load wedge for clean local metrics.  
- Declare deliverable complete; halted due to budget ceiling (~48 min session limit).

**OPERATOR DIRECTIVES**  
- Keep stress testing capabilities.

**FINDINGS/BUGS**  
- Ollama wedges at concurrency 8 (KV‑cache reservation); resolved by per‑request `num_ctx`.  
- CJK truncation bug in `chars/3` formula fixed to UTF‑8 byte sizing.  
- Codegen self‑test initially failed 4/36; fixed by review agent.  
- Concurrency knee at 2; c=4 adds latency, no throughput gain.  
- Large models (32b,120b) wedge when mixed with smaller ones.  
- New batteries exposed weaknesses in manufacturing facts and instruction precision; original mechanical battery missed them.  
- Confirmed strengths: code generation, long‑context handling, JSON support.

**DOMAIN SPECIFICS**  
- Octopus driver: `runLive` consensus loop, cron registration (`install-octopus-utilization-task.ps1`).  
- ask‑ollama.mjs: `callModel`, per‑request `num_ctx` handling, safety guard.  
- Fleet tooling: chat‑slots.mjs, `/checkin-alpha`, audit-roadmap-drift.mjs.  
- Capability harness: ollama-stress-test.mjs, runTierSweep, computeVoiceStats.  
- byte-num_ctx patch path `/path/to/byte-num_ctx.patch`.  
- wedge‑guard dispatcher/script at `/scripts/wedge-guard.sh`.

**TOOLS USED**  
- PRISM slot‑claim wrapper (`/checkin-alpha`).  
- Chat‑slot helpers (chat-slots.mjs).  
- Drift audit (audit-roadmap-drift.mjs).  
- Ollama harness scripts (ollama-stress-test.mjs, runTierSweep).  
- Offload path (ask‑ollama.mjs).  
- Workflow harness (wf_c9cfd598-bcb) for battery authoring/review.  
- wedge‑guard dispatcher/script (`/scripts/wedge-guard.sh`).  
- `<probe>` tool used in chaining.  
- Ollama fleet‑load wedge benchmark reference.

**OPEN THREADS**  
- Extend octopus utilization driver to all 34 galaxies (queued).  
- Address Ollama suggestion→execution gap (209 silent vs 5 executed).  
- Finalize full capability matrix across dimensions; capture clean numbers under low fleet load.  
- Session ended due to budget constraints – no further tasks identified.
