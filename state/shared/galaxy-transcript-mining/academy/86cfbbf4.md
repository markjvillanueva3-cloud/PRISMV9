# academy session 86cfbbf4 (2026-05-28, 8.9MB, spine 12KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Commit 0325e81389: `U-CAG-INJECTORS-CONSUME`, `U-CAG-CACHE‑CONTROL`, `U-CAG-DASHBOARD` (143/143 tests pass).  
- Fixup commit 7f6a8ded5a: resolved `_markSeen()` bug and camelCase session_id parsing.  

**DECISIONS**  
- Use `/checkin-sierra` wrapper to force‑claim slot `sierra` before canonical `/checkin`.  
- Resume at “Ship CAG follow‑ups” (INJECTORS‑CONSUME, CACHE‑CONTROL, DASHBOARD).  
- Wire orphan `tribal-by-domain-inject` into settings.json; add SessionStart hook for cold cache anchor.  
- Adopt typed tail filter (S1) + PSN cross‑leg bridges (S2) to surface 394 dormant modules in `/system-viz`.  

**OPERATOR DIRECTIVES**  
- “Pull up sessions from 5/26–5/27, continue where we left off.”  
- “Check dormant features in H:\PRISM\extracted and H:\PRISM\extracted_modules that we can synergize into /system‑viz.”  

**FINDINGS/BUGS**  
- Integration test masked skip path due to `PRISM_MASTER_INDEX_INJECT=0`.  
- Windows `isDirectRun` template literal failed; replaced with `pathToFileURL`.  
- Diff‑truncation failures (81510B > 80KB) flagged in Arm C; resolved by trimming.  
- Bug P1: `_markSeen()` removed on skip path to avoid silent fallback suppression.  
- Bug P2: session_id extractor now accepts camelCase.  
- Open follow‑ups: `U-CAG-SKIP-TELEMETRY`, `cag-soul-cache-block.mjs` unwired, dunik_7 tweet UNFETCHED, regen‑viz V8 OOM gating live `ghost.cag_router`.  

**DOMAIN SPECIFICS**  
- CAG‑router stack: `U-CAG-INJECTORS-CONSUME`, `U-CAG-CACHE‑CONTROL`, `U-CAG-DASHBOARD`.  
- Dispatcher routing roost for `/pick-unit` (S4).  
- Feature‑utilization counters not incremented on consumer skip paths.  
- Ghost roost: `ghost.cag_router` with 7 substrates.  
- PSN cross‑leg bridges (S2) wiring ai_ml→leg #11, physics→leg #9, algo→leg #8, cam→leg #7.  

**TOOLS USED**  
- PRISM CLI: `/checkin-sierra`, `.claude/helpers/chat-slots.mjs`, `slot-bind-enforce.mjs`.  
- Test harnesses: helper tests (26), integration tests (14), regression (69).  
- Scripts: `scripts/generate-cag-router-features.mjs`, `cag-consume.mjs`, `cag-cold-cache-anchor.mjs`.  
- Build utilities: `makeHookEnv()`, `pathToFileURL`, `git-add-lane-guard` bypass.  

**OPEN THREADS**  
- Ship `U-CAG-SKIP-TELEMETRY` to record skip telemetry.  
- Wire `cag-soul-cache-block.mjs` into SessionStart bundle.  
- Fetch dunik_7 tweet 2058905748579418615 (X auth‑gated).  
- Resolve regen‑viz V8 OOM gating for live `ghost.cag_router`.  
- Evaluate and ship synergy units S1–S6; priority: S1 + S2 (≈605 new graph elements).
