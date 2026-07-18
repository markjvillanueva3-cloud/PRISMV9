# HANDOFF — claude-7efaddb4 — knowledge-accretion-loop (slot:zulu)

_2026-06-15. Operator: fleet→9 chats, "accelerate", away 2 days. Switched accounts mid-session (hit limit).
CHECKPOINT written under context-wall pressure (a persist subagent thrashed; fork-storm at 503) — let
auto-compact reset, then a FRESH context finishes the tail below. The cron carries all 34 regardless._

## TWO TIERS (both live)
- **TIER 1 cron (rate-limit-IMMUNE):** `PRISM Galaxy Knowledge Iterate`, `--count 18`/hr, xAI Grok via :8645.
  Saturates all 34 (iter≥10) in ~13h. Status: `node scripts/galaxy-knowledge-iterate.mjs --status`.
- **TIER 2 verified waves (Workflow):** scriptPath `C:\Users\wompu\.claude\projects\H--prism\7efaddb4-e737-4637-939f-3d15ea0c2610\workflows\scripts\galaxy-verify-deepen-wf_821ace04-636.js`.
  Re-invoke `Workflow({scriptPath, args:{galaxies:[{g,p,hint}]}})` + `--force-fanout [SCOPED]` in the **top-level description**. **≤5 galaxies/wave.**

## SHIPPED THIS SESSION (committed `[MAIN-FORCE]`)
- 22 galaxies VERIFIED: U-ZKM-VERIFY (cam/ai-training/cad), -W2 (business/blueprint-vision/agent-orchestration/backend-helper),
  -W3 (academy/bug-hunting/cad-fusion-live/quality/shop-floor), -W4 PHYSICS (mill/lathe/wedm/speed-feed/post-processor, fence held),
  -W5 (quoting/frontend-app/database-expansion/system-viz/compliance-safety).
- **U-ACCT-SWITCH-AUTOFIRE** — account-switch auto-trigger: `scripts/account-switch-monitor.mjs` (cron-callable,
  apply-gated OFF) + `install-account-switch-monitor-cron.ps1` + 11/11 tests. Cron `PRISM Account Switch Monitor`
  registered (10-min, dry-run-safe). **Operator must, for full auto-switch:** (a) capture ≥2 accounts (`claude login`
  + `scripts/capture-claude-credentials.mjs`), (b) set `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` (~90% of observed ceiling;
  live 5h weighted ≈ 112.8M), (c) `PRISM_ACCT_SWITCH_AUTO_APPLY=1`. Until then it detects+logs, no actuation.

## TAIL TO FINISH (fresh context — verified tier to 34/34)
1. **Persist wave 6/6b (5 galaxies → 27):** data in the workflow OUTPUT FILES (durable):
   - token-optimization (7 src) + : `tasks/wc17kepp8.output`
   - fleet-hygiene, discovery, dormant-data, wiring : `tasks/w812nq5lx.output`
   (paths under `C:/Users/wompu/AppData/Local/Temp/claude/H--prism/7efaddb4.../`)
   **CRITICAL LESSON: do NOT read these output files wholesale — they are ~30KB+ JSON and thrashed a subagent's
   context. Grep per-galaxy + targeted Read offset/limit, OR persist ONE galaxy at a time.** FIRST run
   `git log --oneline -4` + `ls knowledge/wiki/{token-optimization,fleet-hygiene,discovery,dormant-data,wiring}/*-foundations-verified-2026-06-14.md`
   — the thrashed subagent (16 tool-uses) may have already created/committed some; do NOT duplicate. token-optimization
   + fleet-hygiene were drafted in-context but their Write was blocked (files already existed → subagent had made them).
   Per galaxy: write `<g>-foundations-verified-2026-06-14.md` (mirror `knowledge/wiki/backend-helper/backend-helper-foundations-verified-2026-06-14.md`),
   then `node scripts/galaxy-knowledge-iterate.mjs --record <g> --sources "<fetched-urls>" --confirmed --note "..."`, commit U-ZKM-VERIFY-W6.
2. **Wave 7 (running, `wfqu587b5`) → 32:** corpus-aggregation, knowledge-conversion, hermes-zulu, pdf-corpus, tribal-knowledge.
   Retrieve its output, persist (same pattern, chunk-read), commit U-ZKM-VERIFY-W7.
3. **Wave 8 (final 2) → 34:** pdf-corpus-mill, mit-curriculum. Launch wave, persist, commit U-ZKM-VERIFY-W8.

## PER-WAVE PERSIST PATTERN (R15)
physics-grep physics/mfg-adjacent galaxies for cutting constants → Write foundations-verified file (honest
`fetched:false` for paywalled/500 sources) → `--record <g> --sources <fetched-urls> --confirmed` → commit wiki files
(explicit paths; ledger json = live cron state, NOT git-tracked).

## LESSONS (R12, this session)
- Workflow output files are large JSON — persist per-galaxy / chunk-read, never wholesale (thrashes context).
- Process each wave's result + commit BEFORE launching the next, and let auto-compact reset between waves (don't
  accumulate 6 waves of inline processing in one context — that's what walled this session).
- Fork-storm fires ≥400 bash during running waves (the waves' own agents) — do NOT override; wait.
- account-switch: true auto-swap is blocked on interactive OAuth (operator-only) — the wiring is done, not the OAuth.

## LEDGER (deterministic stop)
`SATURATED = iter≥10 AND last 2 iters <2 novel src` OR `iter≥30`. Ledger: `state/shared/galaxy-knowledge-iterations.json`
(O_EXCL lock). Verified galaxies at iter 5-6; cron drives all 34. The cron ALONE reaches the goal; verified waves are quality bonus.
