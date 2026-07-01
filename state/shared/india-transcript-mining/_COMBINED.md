# India / PRISM-AI-systems transcript mining -- 5 mined of 5 attempted (92 mineable >= 2026-05-01; discovery via handoff filenames only)

# india session 9ac2ca4a (2026-06-26, 7.1MB, spine 60KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `b8acbfcf5c` – armed youtube→tribal promotion (step 1 of tribal‑promotion cron). 28 CAD/machining videos → 164 new tips.  
- `ce931d7527` – fixed parseInt(“0.9”) → 90, restoring high‑confidence wiki gate.  
- `427b937d29` – aligned alternate installer to use the committed runner (SSOT).  
- `b0abcc1e93` – rewritten installer to register the committed cron directly (eliminates %TEMP% path and divergence).  
- `4bea1df390` – built web‑source `/learn` lane (`drain-web-sources-tribal.mjs`) with fetch → strip → Ollama tip‑gen → stage. 11/11 tests, P0 fixed.  
- `df7a4c4d26` – added `tipsToWebKnowledgeTips`, consumer‑validated; 8 web tips promoted (store 1474→1482).  
- `db58fa2886` – committed curated watchlist of 33 live‑validated sources (32/36 passed real fetch+strip).  
- Harvest run: 16/33 sources completed → 157 new web tribal tips promoted (store 1482→1639).  
- All commits passed 2‑of‑2 scrutiny gates.

**DECISIONS**  
- Arm youtube→tribal promotion step in existing cron.  
- Correct threshold parsing bug and align installer to SSOT.  
- Build web‑source lane using youtube primitives; add 0‑tip skip and proper tip shape.  
- Validate watchlist via real drain pipeline; curate 33 sources.  
- Run harvest in background, then promote staged tips.  
- Re‑harvest remaining ~17 sources in small batches to avoid fleet‑reaper >10 min kill.  
- Arm autonomous web‑drain task for future curation (no manual grinding).  

**OPERATOR DIRECTIVES**  
- Improve learning/AI systems for CAD drawing, print generation, Fusion/HyperCAD/Mastercam integration.  
- Utilize Hermes CLI, agents, Ollama offloading, octopus, harnesses, engineered loops, crons, JM files, Obsidian vault, full system capabilities.  
- Inject tribal knowledge; run Hermes `/learn` pipeline on all CAD/engineering sources in `H:\PRISM\resources` and other MIT/college course materials, including videos and reputable online sources (no duplication).  

**FINDINGS / BUGS**  
- Video promotion stalled: missing step 1 in cron.  
- ParseInt(“0.9”) bug collapsed wiki gate to 0 → promoted everything.  
- Installer divergence: default `$ConfThreshold=0.9` and omitted step 1.  
- Web lane staged raw tips lacking `source`; ingest threw on `toLowerCase()`.  
- 0‑tip artifacts from JS‑rendered pages; added skip logic.  
- Harvest exited 255 due to fleet‑reaper >10 min kill; stale lock cleared.  

**AI‑SYSTEM SPECIFICS**  
- Engines: `CADTrialErrorLearningEngine.ts`, `BlueprintLoRABridgeEngine.ts`, `BlueprintExtractionRAGEngine.ts`.  
- Actions: `cad_learning_*` (9 actions), `cad-text-to-cadquery.mjs`, `blueprint_rag_extract`, `blueprint_lora_prepare_set`.  
- Metrics: closed‑loop ledger records, no explicit AUROC/Brier/F1 reported; all loops verified via consumer promotion.  

**OPEN THREADS**  
- Re‑harvest ~17 remaining web sources in 5‑source batches (avoid >10 min kill).  
- Arm “PRISM Web Source Drain” task with small per‑run cap for future curation.  
- Optional Playwright fetch path for JS‑rendered sites (gated, operator‑approved).  
- Add P2 seam‑regression test for web tip shape consistency.


---

# india session 2a305e00 (2026-06-25, 7.4MB, spine 48KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- **U‑CAD‑LEARN‑CALIBRATE** – `1a910d6015` – self‑correcting calibration loop (logit‑shift, shrinkage). 3‑of‑3 scrutiny passed.  
- **U‑CAD‑TEXT‑LEARN‑PROMPT** – `50bd919799` – reverse arrow feeding learned failure modes back into the text→CAD prompt. 2‑arm scrutiny passed.  

**DECISIONS**  
- Do not rebuild any unit already shipped (R8).  
- Add only new knowledge; all existing CAD‑learning, tribal‑injection, and LoRA/RAG loops are mature.  
- Build a **video‑transcript drain** (`U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN`) to ingest MIT/college lecture captions (.vtt/.srt) that were previously ignored; tests passed (17/17).  
- Do not auto‑fix the RL‑CAM feedback engine arity errors – route to owner.  

**OPERATOR DIRECTIVES**  
- Improve learning & AI for CAD drawing, print generation, and print→CAD in Fusion/Hypercad/Mastercam.  
- Use Hermes CLI/agents, Ollama offloading, Octopus, harnesses, engineered loops, crons, JM files, Obsidian vault.  
- Ensure tribal‑knowledge injections are added (ZULU).  
- Run the Hermes `/learn` pipeline on all CAD/engineering sources in `H:\PRISM\resources` and all MIT/college course directories; include videos & reputable online sources; **do not duplicate knowledge**.  

**FINDINGS / BUGS**  
- Calibration loop measured error but never acted → fixed with raw‑anchored logit‑shift.  
- Text→CAD bridge lacked reverse arrow → added `loadLearnedRisk()` to prompt.  
- Print→CAD generation path had no tribal injection (cross‑lane).  
- MIT/college lecture transcripts (.vtt/.srt) were not being drained; built and tested a new drain unit.  
- RL‑CAM feedback engine arity mismatch – unsafe to auto‑fix, routed to owner.  

**AI‑SYSTEM SPECIFICS**  
| Engine / Unit | Key Actions | Metrics / Parameters |
|---------------|-------------|----------------------|
| `CADTrialErrorLearningEngine` (U‑CAD‑LEARN‑CALIBRATE) | Record recommendation → attribute outcome → link outcome → compute efficacy → recommend adjustments (logit‑shift, shrinkage). | Brier score, calibration error, raw risk, shift. |
| Text→CAD generation (`cad-text-to-cadquery.mjs`) | Generate CAD query + inject tribal tips; now reads learned failure modes into prompt. | None specified. |
| Video‑Transcript Drain (`U-CAD-LEARN-VIDEO-TRANSCRIPT-DRAIN`) | Walk `.vtt/.srt` → parse → chunk → Ollama tip generation → embed → tribal brain. | 351 transcripts, ~2 k segments each; no duplication via hash. |
| `/learn` drain (scheduled task) | Processes PDFs from `resources` + MIT/college PDFs; now also scheduled to re‑run after manual batch. | Cursor‑resumable; lock‑aware. |

**OPEN THREADS**  
1. **Print→CAD tribal injection** – requires cross‑lane coordination with Xray/Delta GenerationBackend.  
2. **Online reputable source ingestion (videos, other media)** – beyond local PDFs and transcripts; needs new pipeline or expansion of `/learn` drain.  
3. **GNN tier‑5 AUROC < 0.78** – currently dormant; may be deferred until lower tiers are stable.  
4. **RL‑CAM feedback engine arity regression** – routed to owner (Lima); no action pending.  

The loop is resumable (`/startup-india /loop`). The next in‑lane work is the video‑transcript drain unit, which has been built and tested; commit it when ready. Cross‑lane items await operator approval.


---

# india session 3f6cef82 (2026-06-25, 4.7MB, spine 63KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- None of the requested build units were committed; only verification and handoff files were written.

**DECISIONS**  
- Windows display settings (resolution, scaling, ClearType) are correct – blur originates from Electron/Chromium rendering.  
- The recommended fix for Electron apps is to increase system scaling to 125 % or disable hardware acceleration per‑app.  
- GPU output format confirmed RGB 4:4:4; chroma subsampling is not the cause of fuzziness.  
- Blueprint closed‑loop arc (hook event shape + recordOutcome wiring) has been fully validated with 80/80 passing tests.  
- The India queue is verified drained; remaining items are operator‑gated (GPU retrain, cross‑lane CAD change, CAM design scope).  
- No auto‑commit or cron activation will occur without explicit operator approval.

**OPERATOR DIRECTIVES**  
- `125%` – apply 125 % system scaling to resolve Electron app blur.  
- `run the retrain` – launch NN/GNN GPU retraining (`nn-graph-retrain-lifecycle.mjs --force`).  
- `scope CAM 2-phase` – build under the two‑phase CAM design scope.  
- `assign CAD swap to delta+xray` – route the CAD cross‑lane change through delta+xray.  
- `stop the loops` – disarm autonomous loop re‑fires if desired.

**FINDINGS/BUGS**  
- Windows settings: native resolution, 100 % scaling, ClearType enabled → no display fault.  
- Electron apps render text with grayscale anti‑aliasing; 125 % scaling yields crisper glyphs.  
- GPU output color format is RGB 4:4:4 on both monitors; chroma subsampling not present.  
- ClearType tuner had never been run before; after running, native app text sharpens.  
- Blueprint loop tests: 44/44 (consumer‑lib), 17/17 (loop‑drain), 13/13 (event‑writer), 6/6 (cadDispatcher recordOutcome) → 80/80 green.  
- India backlog verified drained; only operator‑gated items remain.

**OPEN THREADS**  
- Execute one of the operator directives above to advance the project or finish the monitor fix.


---

# india session c82292de (2026-06-25, 20.3MB, spine 207KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `55cf3dd18d` – U‑BPA‑LORA‑PAIRS‑WIRE: wired LoRA training‑pair builder, added `empty:true`.  
- `4fa054801a` – Wiki entry on LoRA wiring lessons.  
- `10735ad466` – U‑QP‑SIMILAR‑JOB‑RETRIEVE: KNN retriever over pre‑computed vectors.  
- `d5ff9fdf90` – U‑GNN‑VAULT‑WIRE‑LABELS: 11 GNN ref‑pool labels.  
- `5114e25fc0` – U‑GNN‑VAULT‑LABELS‑HANDOFF: lever‑state update.  
- `d90e92c530` – U‑NNGRAPH‑WARN‑ROOTCAUSE: fleet WARN root‑cause fix.  
- “hunt‑ladder close commit” (hash omitted).

**DECISIONS**  
- De-orphaned `buildLoRAPairsFromLedger`; `precomputedPairs[]` optional, defaults to ledger data.  
- Added `empty:true` flag to avoid silent‑empty footgun.  
- Adopt thin KNN wrapper for quoting retriever; no custom implementation.  
- Ship only units that close predictions→outcomes→retrain loops; postpone operator‑gated GNN retrain & cross‑lane corpus loader.  
- Reset required: `/compact` or `/clear`; no builds in RED/CRITICAL until reset.  
- GNN labeling unit shipped; next step operator‑gated GPU retrain.  
- Blueprint LoRA/RAG loops verified closed – no further action needed.  
- Declined unilateral build of `U‑NN‑TIER05`.  
- Stop building due to imminent 5 h quota block (~11 min left); must re-arm account‑switch RED gate before resuming.

**OPERATOR DIRECTIVES**  
- Execute `/compact` or `/clear` (reset YELLOW budget wall / context).  
- Greenlight operator‑gated GPU retrain for GNN full‑coverage.  
- Greenlight stale NN‑Graph retrain GPU task; remove migration freeze flag.  
- Coordinate with Charlie/Jüliett on quoting corpus loader after fresh budget.  
- Coordinate with Bravo on `U‑NN‑TIER05` milestone.  
- Run `node scripts/capture-claude-credentials.mjs account-N`.  
- Run `node scripts/arm-account-switch.mjs --auto`.  
- Run `nn-graph-retrain-lifecycle.mjs --force` to apply +11 GNN labels and re‑grade macro‑F1.

**FINDINGS / BUGS**  
- Silent‑empty footgun fixed (`empty:true`).  
- Integration drift corrected: dispatcher contract updated.  
- RL `step()` signature missing 5th outcome param – needs redesign, routed to Lima.  
- Self‑compact YELLOW branch bug unresolved.  
- Feeder’s `SPECULATIVE_RE` filter dropped “verify”/“unwired” lines.  
- Mass‑dump of 3,206 labels rejected; AUROC regression from .789→.772.  
- Migration freeze flag only disables marked tasks; stale tasks remain flagged (intentional).  
- All canonical wiki files restored; no deletions.  
- Shared‑tree commit race resolved.

**AI‑SYSTEM SPECIFICS**  
- U‑BPA‑LORA‑PAIRS‑WIRE – 3/3 scrutiny, 15/15 tests pass.  
- U‑QP‑SIMILAR‑JOB‑RETRIEVE – 19/19 reference‑value tests, dispatcher round‑trip.  
- GNN ref‑pool labeling engine (active‑worklist) – macro‑F1 gate 0.55 (current 0.439), AUROC ≥ 0.78, Brier ≤ 0.15.  
- Build stack: mechanical code → Ollama coder ensemble (`qwen3-coder:30b`, `qwen2.5-coder`) → Hermes/Forge agents (Sonnet) → Octopus consensus → Opus safety design.  
- Evaluation gate: per‑file 2‑arm scrutiny + tests + reference‑value checks (happy + ≥3 failures + ≥2 adversarial).  
- Next units pending: `blueprint-accuracy-guard.mjs`, `blueprint_rag_extract`.

**OPEN THREADS**  
- Operator‑gated GNN full‑coverage GPU retrain (apply +11 labels, regrade macro‑F1).  
- Cross‑lane quoting corpus loader/featurizer – Charlie/Jüliett.  
- RL `step()` signature redesign – Lima task.  
- Self‑compact YELLOW bug resolution.  
- Optional non‑destructive measurement of +11 GNN labels.  
- Coordinate Bravo on `U‑NN‑TIER05` build.  
- Monitor migration freeze flag removal to enable NN‑Graph retrain.  
- Await operator re-arm of account‑switch before launching new units; resume `/checkin-india /loop /goal` after rearm.


---

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

