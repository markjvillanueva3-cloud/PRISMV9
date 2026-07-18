# cam session ce5eaa31 (2026-06-25, 12.1MB, spine 89KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Octopus Utilization Driver & Cron (`scripts/octopus-utilization-driver.mjs`, `install-octopus-utilization-task.ps1`) – commit 7acb5253a5.  
- Ollama Stress Harness (`scripts/ollama-stress-test.mjs` + tests) – commits d79f06d849, 52bbd7bedb, f190542258; measured 7 b sweet spot, ≤14 b co‑resident band, concurrency knee at 2, confirms c=8 wedge elimination via per‑request `num_ctx`.  
- Capability deliverable commit (capability data memory + handoff written).  
- Security & Verification Fixes (`codegen` sandbox escape fixed f00515f3d7).

**DECISIONS**  
- Scope octopus driver to 10‑galaxy pool; defer full coverage.  
- Adopt per‑request `num_ctx` strategy over global config.  
- Keep stress testing capabilities, add codegen/instruction batteries.  
- Use `wedge-guard --recover && <probe>` for clean local‑model numbers on busy boxes.

**OPERATOR DIRECTIVES** (verbatim)  
- keep stress testing capabilities  
- `/goal [ improve hermes cli, hermes agent, obsidian vault, psn, /system-viz, ollama offloading and octopus utilization throughout the entire system…]`

**FINDINGS/BUGS**  
- c=8 concurrency wedge caused by KV‑cache reservation; fixed with per‑request `num_ctx`.  
- 32 b / 120 b models cause VRAM thrash when mixed; safe solo.  
- CJK truncation bug in chars/3 formula – fixed via UTF‑8 byte length.  
- Codegen sandbox escape (P0) – fixed strict mode, disabled wasm.  
- Verification logic false positives tightened.  
- New batteries revealed weaknesses: manufacturing facts & instruction precision not exposed by mechanical battery.  
- Strengths: code generation, long‑context handling 100 % at 16K tokens, JSON support.

**DOMAIN SPECIFICS**  
- Slot‑claim pipeline: `/checkin-alpha` → chat‑slot claim (`chat-slots.mjs`) → drift audit (`audit-roadmap-drift.mjs`) → commit hygiene → roadmap slice → system‑viz ping, CLAUDE.md staleness, fleet activity pickup.  
- Octopus driver imports `runLive` from `octopus-first-live-record.mjs`, rotates 10‑question pool, writes to ledger (`octopus-outcomes/wedm.jsonl`), triggers computeVoiceStats.  
- Ollama harness uses `ask-ollama.mjs` (`callModel`) with per‑request `num_ctx`; integrates `computeVoiceStats`, `wedge-guard`.  
- Wedge‑guard recovery + probe chain beats Ollama’s fleet‑load wedge for local-model number extraction on busy systems.

**TOOLS USED**  
- PRISM CLI helpers: `.claude/helpers/chat-slots.mjs`, `audit-roadmap-drift.mjs`.  
- Scripts/skills/hooks: `scripts/octopus-utilization-driver.mjs`, `install-octopus-utilization-task.ps1`, `scripts/ollama-stress-test.mjs`, `ask-ollama.mjs`, `wedge-guard.mjs`.  
- Batteries & tests: six capability batteries (codegen, reasoning, longcontext, jsonschema, instruction, mfgdomain) with unit‑test harness.  
- `wedge-guard`, `<probe>` command, byte-num_ctx patch, Ollama.

**OPEN THREADS**  
- Expand octopus driver to all 34 galaxies (current pool covers 10).  
- Capture clean full capability matrix under quiet Ollama window; schedule `ollama-stress-expanded-run.mjs`.  
- Finalize long‑context and codegen batteries for higher‑level reasoning tasks.  
- Integrate deliverable into broader PRISM pipeline pending.  
- Address budget/time constraints for subsequent sessions.
