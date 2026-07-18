# india session ee8cef5a (2026-06-03, 8.2MB, spine 51KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `state/shared/specs/BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md` – full master plan (corrected front‑matter, 6 P0 fixes).  
- `OllamaCapabilityProbeEngine.ts` + dispatcher wiring (`prism_ai:capability_probe`) – 19 real tests, 2 reviewers PASS.  
- Commit to `cad-fusion-live-ms0`: 3 files added under `[BOOTSTRAP-SLOT-ENFORCE]`.  

**DECISIONS**  
- Use existing `ModelRoutingEngine` (pure scorer) and wire it with the new probe; no duplicate router created.  
- Dedup‑guard applied: MS1 edits only modify two consensus engines, not creating a new asset.  
- Adopt “runtime‑probe + catalog filtering” pattern for all routing decisions to avoid absent‑model calls.  
- Build order: MS0 (keystone) → MS1 (routing ladder) → inference‑only units (MS2/5/6).  

**OPERATOR DIRECTIVES**  
- Continue GPU AI‑upgrade build in slot **india**, reading `HANDOFF-claude-ee8cef5a-blackwell-ai-upgrade.md`.  
- Build next unit in dependency order: MS1 U‑ROUTE‑LADDER (wire probe, purge ~10 hardcoded defaults), then inference‑only units MS2/5/6.  
- Enforce dedup‑guard, no stubs, no inline physics constants; per‑file 2‑arm scrutiny after each file, 3‑of‑3 Stop gate, real tests (no `toBeDefined` stubs).  
- Commit under `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MSn]/U-ID`.  

**FINDINGS/BUGS**  
- **Octopus consensus path** hardcodes `deepseek‑r1:14b`, an absent model → runtime failure.  
- Missing implementation of `pickBestOllamaModel` / `resolveOllamaModels`; tests were RED, now green after adding helpers and wiring into `ask()`.  
- Real‑daemon call to `listModels()` introduced a network dependency in unit tests; fixed by mocking the call in all relevant test blocks.  
- Index lock contention during stash/pop: peer processes hold `H:/prism/.git/index.lock`; cannot force removal—must wait for lock release before committing MS1 changes.  
- GPU status confirmed idle (WDDM artifact), driver CUDA 13.2 supports sm_120, Python‑GPU stack missing – to be installed by golf later.

**AI‑SYSTEM SPECIFICS**  
- **U‑CAP‑PROBE**: probes `nvidia-smi` (WDDM‑aware) and Ollama `/api/tags`, returns `routableCatalog()` & `toRoutingContext()`. 19 tests, real‑data E2E.  
- **ModelRoutingEngine**: pure scorer; now receives live catalog from probe to avoid absent models.  
- **MS1 (U‑ROUTE‑LADDER)**: edits `ConsensusAIBridgeEngine.ts` and `MultiModelConsensusEngine.ts` to call `resolveOllamaModels()` with probe data.  
- **Inference‑only units**: MS2 – RAG re‑embed via Ollama; MS5 – octopus local big‑voice; MS6 – CAG resident. No GPU training stack required.

**OPEN THREADS**  
1. Resolve index lock contention and commit the MS1 edits (wire probe, purge hardcoded defaults).  
2. Run full test suite after committing to ensure no regressions.  
3. Proceed with building inference‑only units MS2/5/6 once MS1 is stable.  
4. Coordinate with golf for Python‑GPU stack installation (torch, peft, bitsandbytes, DGL/PyG) before any training‑dependent units.  
5. Verify that the plan’s metrics (AUROC/Brier/F1) are updated in downstream inference pipelines after re‑embedding.
