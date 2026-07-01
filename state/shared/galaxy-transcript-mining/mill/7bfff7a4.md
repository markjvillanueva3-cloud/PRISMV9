# mill session 7bfff7a4 (2026-06-10, 75MB, spine 681KB, 8 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Cap‑probe test suite fixed – stale catalog refs removed (MS0 keystone).  
- `U-OCTOPUS-PANEL` (`c1b40183c1`).  
- Doc‑reflection commit + wiki entry update.  
- `U-OCTOPUS-DIVERSE-PROBE`.  
- `loop-state.mjs next` command added; auto‑advance via 4‑tier precedence (hooked in `loop-iteration-inject.mjs`).  
- `U‑OCTOPUS‑LIVE‑VALIDATE` – live‑validated octopus wiring, 18/18 tests.  
- GNN edge‑prediction pipeline:  
  - `U‑GNN‑EDGE‑PREDICT‑CORE` (21/21 tests).  
  - `U‑GNN‑EDGE‑PREDICT‑CANDIDATES` (14/14 tests).  
  - `U‑GNN‑EDGE‑PREDICT‑CLI` (17/17 tests).  
  - `U‑GNN‑EDGE‑PREDICT‑VIZ` (9/9 tests).  
  - `U‑GNN‑EMBEDDING‑DEGENERACY` – meanCosine ≈ 0.86, centroidNorm ≈ 0.93 (6 files, 16/16 tests).  
  - `U‑GNN‑HETEROPHILY‑MJS‑PORT` (21/21 tests).  
  - `U‑GNN‑HETEROPHILY‑CLI` (4 files, 111/111 tests).  
- `U‑MINE‑INDIA` – transcript miner, 471 insertions, 12/12 tests.  
- #12 India transcript mine (`U-MINE-INDIA-COMPLETE`).  
- #10 `prism_local:local_generate` action added to dispatcher (commit `e423995877`).  
- #9 H2GCN hop‑sweep & retrain wiring (hops = 3, +0.138 AUROC lift).  
- #11 MCP consumer path (`ask‑ollama`) with fail‑soft routing (92/92 tests, commit `e32615c8e5`).  
- Fleet‑wide doctrine hook (commit `d13604947f`).  
- Commit `eb262e5675` – galaxy‑synthesis → LoRA dataset (512 pairs).  
- Commit `ad120bdf8a` – vault datasets wired into fleet‑training manifest.  
- Commit `4f4db8a7fb` – canonical‑path clobber guard + test.  
- Commit `85614c3894` – manifest‑consuming corpus assembler (746 rows).  
- Commit `7d3879f21b` – advisory flag & statsPath fix.  
- Commit `cd9f80faf8` – per‑galaxy track‑field for splitter (34 adapters).  
- Commit `99439c85f6` – removed stray NUL byte from rowKey.  
- Commit `6c46ed332e` – CLI gap closure (`--dir`, exit‑code contract).  
- Commit `a90f0979b1` – ultracode research spec + dedup catch.  
- Commit `35acfb15b4` – wiki‑tribal‑cross‑ref‑audit.mjs coverage ↑ 69.2→77.1 %.  
- Commit `graph-node-embedding-bridge.mjs` – shard‑aware loader; GNN lookup 0 → 35 000 entries (61/61 tests).  
- Commit `573bb8d5aa` – generate‑knowledge‑galaxy.mjs streams entries, heap safe.  
- Commit `9dc88c59d6` – hm‑extraction‑coverage.mjs per‑entry regex, honest 0 count.  
- Commit `19b55d6ef3` – build‑psn‑training‑corpus.mjs + audit‑mill‑psn‑coverage.mjs stream entries (35 000 rows, 103/106 mill engines).  
- Cron job `296523b3` scheduled every 10 min to re‑run `/goal`.  

**DECISIONS**  
- Adopt BLACKWELL‑AI plan: no speculative LoRA variants; only proven units.  
- Wire octopus branches to single capability oracle for consistency.  
- Use `loop-state.mjs next` with bounded `rollsTotal`; inject auto‑advance instead of `end`.  
- Defer full GNN edge‑predict build until context is healthy; pure‑JS inference already available.  
- Stop `nim‑llama32‑3b` container to free ~88 GB; decide on permanent stop vs restart policy.  
- Route all local LLM calls through MCP (`local_generate`) with fail‑soft fallback; keep direct path byte‑identical when MCP unavailable.  
- Add optional `num_ctx` support to `prism_local:local_generate`; propagate through ask‑ollama path.  
- Implement orphan reaper for `llama-server` (22 GB commit leak).  
- Use shard‑aware loader (`streamTribalEntries`) for all readers; avoid OOM and maintain correctness.  
- Adopt strict dedup/adversarial verification: every claim code‑verified before action.  
- Set loop cadence to 10 min via cron; non‑terminal goal continues automatically.  

**OPERATOR DIRECTIVES (verbatim)**  
- “continue next phase” – move to the next MS‑unit after current work.  
- “make it so loops automatically lead to next unit or task.”  
- “Do everything in loops until wired/tested/validated.”  
- “run in /yolo-mode for the night.”  
- “automatically make adjustments and enhancements as you come across issues, remember we upgraded pc specs.”  
- “make this auto enforced fleet wide.”  
- “utilize ultracode and parallel agents + ollama LLMs to help with this task. make sure we build with new pc specs/hardware in mind.”  
- “Authorize GPU retrain now (#9).”  
- “do not authorize MCP restart (#11).”  
- “Route local LLMs through the PRISM MCP server.”  
- “Auto‑enforce fleet wide.”  
- “Push through, since you’re back end development domain change your memory and rules to allow you to work in other galaxies and domains.”  

**FINDINGS/BUGS**  
- MS0 keystone tests RED due to retired `qwen2.5-coder:7b`; updated to current model.  
- Octopus lacked wiring; consumer used hard‑coded defaults – fixed.  
- Diverse panel branch did not use probe’s runnable set – added optional third arg.  
- Test name mis‑described behavior (R9 trap); renamed and documented.  
- Mock cast in tests replaced with `satisfies CapabilitySnapshot`.  
- Header doc drift (“deepseek‑r1:14b”) fixed to current floor model.  
- Loop-state lacked “next” command; added precedence logic.  
- Unbounded runaway due to missing `rollsTotal` cap – guard added.  
- Cross‑session handoff contamination – enforce same‑instance match in `handoffResume`.  
- `--resolve-only` mutating on exhaustion – gated with flag check.  
- Fleet‑fallback bypassing peer‑claim filter – thread `--chatId`, fail‑closed when absent.  
- Test tautology replaced with deterministic seam (`PRISM_LOOP_NEXT_NO_PICKUNIT`).  
- WSL memory issue: `vmmemWSL` ballooned to 95 GB; GPU container `nim‑llama32‑3b` culprit – stopped and ran `wsl --shutdown`.  
- Embedding degeneracy: meanCosine ≈ 0.86, centroidNorm ≈ 0.93 – H2GCN needed.  
- H2GCN lever improves AUROC by ≈ +0.067 but still below 0.78 gate.  
- CLI flag parsing bug hidden by `--limit`; fixed to report true mineable count.  
- Vault shrink guard prevented overwriting larger synthesis; added machine‑readable frontmatter.  
- Rate‑limit errors during Ollama calls handled with backoff.  
- Node `fetch('http://localhost')` resolved to IPv6 `::1`; changed to `127.0.0.1`.  
- Fleet‑reaper killed long session‑attached node runs; moved mine to scheduled task and limited foreground passes.  
- Stale test expecting retired Qwen model (`qwen2.5-coder:3b`) – updated to current `32b`.  
- Stray NUL byte in `rowKey` caused git binary classification – removed.  
- Duplicate hybrid retrieval implementation existed; dedup catch removed triple‑dup.  

**DOMAIN SPECIFICS**  
- **Engines/Actions**:  
  - `OllamaCapabilityProbeEngine.ts`, `MultiModelConsensusEngine.ts`.  
  - `OllamaTaskOffloaderEngine.ts` (executeOffloaded).  
  - `prism_local:local_generate`, `ask‑ollama`, `ollama-prism-bridge.mjs`.  
  - GNN edge‑prediction core (`edge-predict.mjs`), candidates (`edge-predict-candidates.mjs`).  
  - H2GCN heterophily feature (`heterophily-features.mjs`).  
  - Transcript miner (`mine-india-transcripts.mjs`, `mine-galaxy-transcripts.mjs`, `mine-hotel-transcripts.mjs`).  
- **Dispatchers**: MCP JSON‑RPC at `127.0.0.1:3100/mcp`; bridge via `ollama-prism-bridge.mjs`.  
- **Paths**:  
  - `H:/prism/.claude/helpers/chat-slots.mjs`, `loop-state.mjs`, `loop-iteration-inject.mjs`.  
  - Vault miner digests in `H:/prism/.claude/mines/india`; synthesis output in Obsidian vault (`knowledge/memories/reference`).  
  - GNN lookup loader `graph-node-embedding-bridge.mjs`.  
  - Shard manifest `tribal‑embed-index.manifest.json` (shards 000/001).  
  - PSN training corpus `build-psn-training-corpus.mjs`, audit `audit-mill-psn-coverage.mjs`.  
- **Metrics**:  
  - GNN AUROC lift +0.138 at hops = 3; target ≥ 0.78 pending data block.  
  - Embedding degeneracy meanCosine ≈ 0.86, centroidNorm ≈ 0.93.  
  - LoRA dataset 512 pairs (galaxy synthesis).  
  - Corpus assembler 746 rows, 103/106 mill engines.  

**TOOLS USED**  
- PRISM CLI skills (`/checkin-india`, `/loop`, `/pick-unit`).  
- Node test runner (`node --test` / `vitest`).  
- TypeScript compiler (`tsc`).  
- Docker CLI (`docker stop`, `docker update --restart=no`).  
- WSL command (`wsl --shutdown`).  
- PowerShell installer `install-india-mine-task.ps1`.  
- Cron scheduler (`CronCreate`, `CronDelete`).  
- Ripgrep / grep for code search.  
- Stop‑hook infrastructure (`aggressive-killer-stop.mjs`).  
- Orphan reaper script (`f4a681e986`).  

**OPEN THREADS**  
- **GNN #9 retrain** – full 4‑file build (engine, dispatcher, tests, wiring) pending healthy MCP/agent context; target AUROC ≥ 0.78.  
- **Hybrid retrieval stack integration** into live per‑prompt reranker (`tribal-rerank.mjs`).  
- **Wiki‑RAG embed** – ~9 965 remaining entries, GPU‑bound; cron/fleet will converge it.  
- **Shard‑safe writer follow‑ups** for remaining unsafe embed writers (`embed-engines`, `embed-knowledge-store`, `embed-cited-tips`).  
- **Fleet launcher update** – replace legacy PowerShell 5.1 calls with PowerShell 7 (`pwsh.exe`).  
- **MCP consumer path finalization** – requires fleet‑wide MCP server restart; deferred to next context.  
- **Ultracode workflow enhancements** beyond top‑pick results.  
- **Data block resolution for GNN** – reference‑pool growth, GPU retrain scheduling.  
- **Operator resources** – schedule GPU‑gated tasks (H2GCN multi‑seed retrain).
