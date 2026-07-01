# pdf-corpus-mill session f6b6d9da (2026-06-15, 32.3MB, spine 187KB, 3 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Commit 54a7183de0: `agent-fanout-pressure-gate` denies mechanical fan‑outs → Ollama.  
- Commit U-SFLC-NOTE-CORRECT: removed stale “not fixed” note in CLAUDE.md.  
- Build b56ef64c7e (ask‑hermes utilization tracking): 26/26 tests, live usage recorded.  
- Build b1ff295da7 (delegation provider pinned to local Ollama).  
- U‑ASK‑HERMES: `ask-hermes.mjs` wired into `task-substrate-router`, 20/20 unit tests + E2E (`PRISM_BRIDGE_OK`).  
- U‑PROXY‑ENSURE: Hermes‑proxy keepalive task installed, 12/12 tests + live E2E.  
- U‑ASK‑HERMES‑SKILL: `/ask-hermes` slash command committed to `.claude/commands/`.  
- Desktop GUI launched; backend running on local Ollama (`gpt‑oss:120b`).  

**DECISIONS**  
- Adopt **round_robin** OAuth pool for 6 Claude Code accounts → 9‑entry pool (keep PKCE backups, prune dead).  
- Use Hermes `/v1` proxy as bridge endpoint; default to free local Ollama on failure.  
- Hybrid model: Claude CLI handles deep reasoning & coding; Hermes offloads lighter tasks via bridge.  
- Repoint all Hermes profiles to `provider: ollama`, `base_url: http://127.0.0.1:11434/v1`.  
- Install durable keepalive scheduled task for Hermes proxy (no manual start).  
- Do not auto‑pin auxiliary roles (`web_extract`, `skills_hub`, etc.) – leave operator choice.  
- Activation policy for Hermes remains open; opt‑in until operator configures automatic invocation or promotes `/ask-hermes` to INVOKE_NOW.  

**OPERATOR DIRECTIVES**  
- “Help me get the anthropic oauth working for all 6 accounts in the hermes cli?”  
- “Bridge the hermes cli into our system so we get access to hermes capabilities?”  
- “Ultimate goal is hermes agentic behavior and smart offloading…”  
- “Build everything we can” – no additional builds required beyond shipped.  
- “Use ultracode to evaluate our utilization of Hermes within Claude Code CLI.” → trigger workflow `wf run hermes-utilization-eval`.  

**FINDINGS/BUGS**  
- Hermes install corrupted by interrupted 0.15.1→0.16.0 update; syntax error in `toolsets.py` resolved.  
- Stale `.update‑incomplete` marker cleared.  
- Anthropic billing policy returns HTTP 400 for third‑party apps → requires extra usage credit or provider switch.  
- Main‑loop reads cannot be hook‑forced; only subagent boundaries enforce offload.  
- Bridge active on port 8645; proxy returns real Grok completions (`PRISM_BRIDGE_OK`).  
- Hermes agent loop runs locally (`gpt‑oss:120b`) – no paid‑provider billing path.  
- Utilization of Hermes from Claude CLI currently ≈0 % tokens; bridge and keepalive healthy.  
- MCP‑bridge latency under heavy load (performance bottleneck, not code defect).  
- Latent paid‑path in primary loop (`auto_invocation_router=true`, `claude_escalation_threshold=0.65`) fixed by Build #2.  
- Delegation provider defaulted to `auto` → potential cloud billing; resolved.  
- Five auxiliary roles defaulted to `auto`; flagged but not pinned.  

**DOMAIN SPECIFICS**  
- Hermes agent, `auth.json` credential pool (anthropic entries), `config.yaml` strategy field.  
- Scripts: `capture-claude-credentials.mjs`, `sync-claude-accounts-to-hermes.mjs`, `ask-hermes.mjs`, `agent-fanout-pressure-gate.mjs`, `subagent-model-enforce.mjs`.  
- Proxy listening on 127.0.0.1:8645/v1; uses XAI OAuth.  
- Offload stack: `ollama-fanout.mjs`, `smart-fanout.mjs`.  
- Engine: Hermes agent loop (`hermes-agent`), local Ollama (`gpt‑oss:120b`).  
- Dispatcher: `task-substrate-router.mjs` injects Hermes as “stronger managed‑OAuth” tier; falls back to free Ollama.  
- Metrics/paths: `/ask-hermes` CLI command → `hermes proxy /v1`; bridge health via `:8645`.  
- Unique to this galaxy: Hermes desktop GUI, scheduled keepalive task (`PRISM Hermes Proxy`).  

**TOOLS USED**  
- Node mjs scripts for credential capture & sync.  
- Hermes CLI (`hermes chat`, `hermes model`).  
- PRISM hook system (`agent‑fanout‑pressure‑gate`, `subagent‑model‑enforce`, `task‑substrate‑router`).  
- Unit test framework `node:test`; ASCII‑only tests.  
- PRISM tools: `ask-hermes.mjs`, `hermes-proxy-ensure.mjs`, `install-hermes-proxy-task.ps1`.  
- Ultracode evaluation workflow (`wf_b36ab40c-3b2`).  
- `repoint_block` script for pinning delegation.  
- Hooks: `byHook.ask-hermes`, `tallyUsage()`, `recordUsage()`.

**OPEN THREADS**  
- Resolve Anthropic billing wall (add extra usage or switch provider).  
- Full integration of Hermes agentic coding into PRISM beyond the proxy.  
- Monitoring/auto‑recovery for running Hermes fleet when active.  
- MCP‑bridge latency under load – performance tuning needed.  
- Ultracode evaluation workflow creation to collect per‑slot token usage, latency, hit/miss ratios.  
- Final activation policy for Hermes (automatic loop vs. on‑demand).  
- Confirmation that paid‑path exposure in primary loop is resolved.  
- Optional pinning of auxiliary roles if cloud/web functionality no longer required.
