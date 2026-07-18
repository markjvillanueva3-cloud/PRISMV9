# academy session 7bfff7a4 (2026-06-10, 51.7MB, spine 464KB, 6 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑LOOP‑AUTO‑ADVANCE` – loop‑state.mjs `next` wired into `/loop‑iteration‑inject`; 4‑tier precedence, bounded by `PRISM_LOOP_MAX_ROLLS`.  
- `U‑OCTOPUS‑LIVE‑VALIDATE` – live validation of octopus capability‑probe wiring; all tests green.  
- GNN edge‑prediction: core, candidates, CLI, viz (21/21, 14/14, 17/17, 9/9 tests).  
- Heterophily H2GCN transform (`U‑GNN‑HETEROPHILY‑MJS‑PORT`) – 21/21 tests; AUROC lift +0.067 across 3 seeds.  
- Feature wiring pipeline (`U‑FEATURE‑WIRING`) – 108/108 tests.  
- India transcript miner (`#12`) – 84/84 transcripts mined, Obsidian vault synthesis written.  
- `prism_local:local_generate` action (`#10`) – 10/10 unit tests + live validation; IPv6 bug fixed to `127.0.0.1`.  
- MCP‑route for ask‑ollama (`#11`) – fail‑soft wrapper, all tests green.  
- H2GCN hop sweep & retrain wire (`#9`) – hop = 3 optimal (+0.138 lift, ceiling ≈ 0.64 AUROC).  
- Ask‑ollama → MCP `local_generate` (commit e32615c8e5) – 92/92 tests, live validated.  
- Fleet‑wide auto‑fix doctrine hook (`auto-fix-blackwell-doctrine-inject.mjs`).  
- P3 fixes & doc‑reflect wiki lesson; `num_ctx` optional added to `local_generate`.  
- Locked‑step 8192→16384 output cap for miners; hotel miner overlay + guard.  
- Llama‑server orphan reaper tool (18/18 tests) wired into fleet‑wide Stop hook.

**DECISIONS**  
- Defer full build of **MS3 U‑GNN‑EDGE‑PREDICT** until pure‑JS inference primitive & embeddings verified.  
- Adopt auto‑advance loop for all future units; enforce `PRISM_LOOP_MAX_ROLLS` cap.  
- Stop `nim‑llama32‑3b` container (~88 GB commit); pending permanent removal or leave stopped.  
- Use reaper‑immune Windows Scheduled Task for long jobs (India mine, GPU retrains).  
- Route all local‑LLM consumers through MCP server with fail‑soft fallback (`PRISM_LOCAL_LLM_VIA_MCP`).  
- Add `num_ctx` support to `local_generate`; propagate through ask‑ollama path.  
- Implement fleet‑wide auto‑fix doctrine as session‑scoped UserPromptSubmit hook.  
- Adopt hop = 3 default for heterophily; gate clearance requires embedding growth (~300 k nodes).  
- Use session‑scoped Stop hook with condition `"[do everything in loops until its all wired, tested and validated]"`.  

**OPERATOR DIRECTIVES**  
- Make loops automatically lead to next unit.  
- Diagnose API‑rate‑limit errors → identified WSL overcommit from GPU container; fixed by stopping the container.  
- Audit X‑articles coverage matrix delivered (≈85–90 % covered).  
- Do everything in loops until wired, tested and validated—no pause or `/goal clear`.  
- Authorize GPU retrain now (#9); do not authorize MCP `:3100` restart (#11).  
- Enforce auto‑fix inline + Blackwell‑awareness fleet‑wide via UserPromptSubmit hook.  

**FINDINGS/BUGS**  
- P0: unbounded runaway – added `PRISM_LOOP_MAX_ROLLS`.  
- P1-a: cross‑session handoff contamination – now verifies terminal match.  
- P1-b: `--resolve-only` mutates on exhausted – gated off.  
- P1-c: fleet‑fallback bypasses peer‑claim filter – threaded `--chatId`, fail‑closed when absent.  
- Exhaustion test replaced with deterministic seam `PRISM_LOOP_NEXT_NO_PICKUNIT`.  
- API errors due to WSL memory overcommit; root cause GPU context from `nim‑llama32‑3b`.  
- Stale doc drift in MEMORY.md corrected.  
- Node fetch on Windows resolved localhost to IPv6 → ECONNREFUSED; fixed by using `127.0.0.1`.  
- Fleet reaper kills long foreground node runs (exit 255); resolved by moving jobs to scheduled tasks.  
- Hop‑sweep ceiling at AUROC ≈ 0.64 (< 0.78 gate).  
- Production retrain lacked H2GCN integration; now flag‑gated and heap‑safe.  
- Stale MCP bundle caused “MCP error –32602” on `local_generate`; fail‑soft fallback verified.  
- Obsolete test expecting `qwen2.5-coder:3b` replaced with current 32 B model.  
- Leaked `llama-server` orphan (~22 GB commit) resolved by reaping PID 129048.  
- OCR Batch task flagged stale due to one‑shot trigger design; requires operator reinstall of the task.  
- Memory‑pressure spike from large model commits mitigated by orphan reaper and monitoring.  
- Assistant returned API Error: 400 – request body not valid JSON (Stop hook command).  

**DOMAIN SPECIFICS**  
Engines/dispatchers: `loop-state.mjs`, `/loop-iteration-inject`, `PromptCachingEngine.ts`, `MultiModelConsensusEngine.ts`, `OllamaCapabilityProbeEngine.ts`; `prism_local` dispatcher, `OllamaTaskOffloaderEngine`, `ask‑ollama.mjs`; MCP streamable client (`mcp-streamable-client.mjs`).  
Metrics/gates: `rollsTotal`, `PRISM_LOOP_MAX_ROLLS`, host commit %, `vmmemWSL`; AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15; H2GCN hop lift +0.138 (ceiling ≈ 0.64).  
Unique paths: auto‑advance logic with 4‑tier precedence; GNN edge‑predict inference primitive `sigmoid(dot())`; GPU memory mapping via WSL; India AI training galaxy (`mcp-server/src/engines/ai-training/`); transcript miner script `mine-india-transcripts.mjs`; scheduled‑task installer `install-india-mine-task.ps1`.  

**TOOLS USED**  
PRISM CronCreate, skill tool slash commands (`/goal`, `/loop`), scripts: `predict-missing-edges.mjs`, `generate-predicted-edges-features.mjs`, `heterophily-features.mjs`, `mine-india-transcripts.mjs`; Local LLMs: gpt‑oss 20b/120b, qwen2.5-coder 32b; Vitest / node --test / tsx harness; PRISM helpers (`chat-slots.mjs`, `/startup` pipeline); custom orphan reaper script wired into Stop hook; Docker commands (`docker stop`, `wsl --shutdown`, Docker Desktop restart).  

**OPEN THREADS**  
- Full build of **MS3 U‑GNN‑EDGE‑PREDICT** (graph‑coupled candidate generation + engine wiring).  
- Gate clearance for GNN tier‑5 full gate (embedding growth run ≈ 300 k nodes, target AUROC ≥ 0.78).  
- Completion of full mine of all 84 transcripts (`b82qr6i9k`).  
- Validation of H2GCN integration under production load (scheduled task).  
- MCP restart needed for `local_generate` functionality.  
- Path‑B engine→dispatcher wiring after embeddings regeneration (task #9).  
- Resolve JSON formatting bug in Stop hook; verify auto‑clear once all conditions met.
