# mit-curriculum session ae98bc9f (2026-05-19, 13.6MB, spine 30KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U-CAMX22-VISIBLE-SKIP` – 100‑line edit in `PrintToProgramPipelineEngine.ts`, committed via peer commit `2f2c5b0ef5`.  
- Foxtrot: `OLLAMA-EXPAND-MS0 L2b` (`2518aa3514`) and doc‑reflect (`90103705e8`).  
- Foxtrot: `U-GAP-TRIBAL-FORMULA-REGISTRY` – wiring dispatcher actions, tests, doc‑reflection; commit `4ab0fa591f`.  

**DECISIONS**  
- Use slot‑worktree model (`H:/prism-slot-juliett`, `slot/juliett`) to avoid cross‑chat index contention.  
- Commit via atomic `commit-tree` + `update-ref` with a private `GIT_INDEX_FILE` to beat 12‑chat ref‑lock races.  
- Treat stale queue entries as silent close‑out debt; reconcile envelope and slot‑queue after each ship.  

**OPERATOR DIRECTIVES**  
- “/checkin-juliett /goal compile all juliett tasks from previous sessions …”  
- “work on most recent work from today (2026‑05‑18)”.  
- “check bus chat, golf redistributed work from today to the chats”.  
- “/startup-india /goal check session from earlier today … compile any remaining work for your chat slot”.  
- “/startup-foxtrot /goal check session from earlier today … compile any remaining work for your chat slot”.  

**FINDINGS/BUGS**  
- Drift: `juliett` commits landed on wrong files due to staying on main tree (`cad-fusion-live-ms0`) instead of slot worktree.  
- Git contention: 12‑chat shared index caused ref‑lock failures and staging resets; resolved with CAS commit strategy.  
- P0 bug – three knowledge JS files were git‑ignored, causing silent failure on fresh clone.  
- P1 bug – engine swallowed read errors, returning `{totalFormulas:0}` (R12 fail‑loud violation).  
- P2 bug – hard‑coded `H:/prism/` path; replaced with `PATHS.PRISM_ROOT`.  

**DOMAIN SPECIFICS**  
- Engines: `PrintToProgramPipelineEngine.ts`, `AutoSpeedFeedEngine.ts`, `FormulaHarvesterEngine.ts`.  
- Actions: dispatcher actions for formula harvesting (`formula_harvest{,_sources,_audit}`).  
- Metrics: R12 fail‑loud, R8 dedup‑win, per‑file scrutiny gates (P0/P1/P2).  
- Paths: slot names (`juliett`, `india`, `foxtrot`), worktree directories (`H:/prism-slot-juliett`).  

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs` (claim, reclaim), `/checkin` pipeline, `/startup` pipeline.  
- Git primitives: `commit-tree`, `update-ref`, private `GIT_INDEX_FILE`.  
- Build/test: TypeScript (`tsc --noEmit`), Vitest (`PrintToProgramPipelineEngine.test.ts`).  
- Per‑file scrutiny harness (two agents per file).  

**OPEN THREADS**  
- Loop halted at 1/5 due to agent limit; next unit pending after reset.  
- Remaining foxtrot queue units: `F1/U-VOICE-CAPTURE` and others marked as silent close‑out debt – need final reconciliation.  
- No further juliett tasks queued beyond those already shipped; verify bus chat for any golf‑redistributed work that may still be pending.
