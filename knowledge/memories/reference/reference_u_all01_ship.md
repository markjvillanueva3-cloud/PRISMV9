---
name: reference-u-all01-ship
description: AUTO-LEARNING-LOOP-MS0/U-ALL01 ship — ReputableSourceMonitorEngine + CLI + cron + dispatcher wiring shipped 2026-05-13 by charlie/claude-2e39dd7e
aliases: [u-all01-ship, U All01 SHIP, reference-u-all01-ship]
metadata: 
  node_type: memory
  type: project
  originSessionId: 2e39dd7e-6d0d-4bc6-8c72-fa76a2b9e9fd
---

**AUTO-LEARNING-LOOP-MS0/U-ALL01** — shipped 2026-05-13 by `charlie/claude-2e39dd7e`. Foundation engine for the external-source learning loop. Future U-ALL02-U-ALL12 chats read this for context.

**Ships:**
- `mcp-server/src/engines/ReputableSourceMonitorEngine.ts` — 10-source poller (arXiv cs.AI/cs.MA, Anthropic, HF Papers, GitHub anthropics, Hacker News, RSSHub-X, Cloudflare changelog, LangChain, Moonshot). ETag/If-Modified-Since, 4-step backoff [1m/5m/30m/2h], 50MB streamed-body cap, MITM hostname check, in-flight `Map<slug, Promise>` dedup. Singleton `reputableSourceMonitorEngine`.
- `scripts/source-monitor-sweep.mjs` — self-contained tsx-free CLI. Writes `state/shared/source-monitor-log.jsonl`. CLI duplicates parser by design (DRY-violation tradeoff for cron portability).
- `.claude/helpers/install-source-monitor-task.ps1` — Windows Task Scheduler installer, every 4h at minute 7. Operator must run once.
- Dispatcher action `prism_dev:source_sweep` with 5 modes: `poll_all` (default), `poll_one` (slug), `get_sources`, `get_state` (slug), `reset_all`.

**Why:** Foundation for U-ALL02 (NoveltyDetectionEngine — both unblocked). All later U-ALL units depend on this surface.

**How to apply:** Future U-ALL chats build ON this surface — call `reputableSourceMonitorEngine.pollAll()` from inside MCP, OR `node scripts/source-monitor-sweep.mjs --once` from cron. Don't re-derive — extend.

**Commits:** `8b2df4a62` (ship) + `bbe384ffa` (close-out 4-surface).

**Tests:** 34/34 (22 engine + 12 dispatcher wire). `tsc --noEmit` clean.

**Scrutiny:** Per-file gate found 2 P0 + 7 P1 in engine (concurrent-poll race, parseRSS-misclassifies-Atom, CDATA-nested tags, jsonItemsPath proto-pollution, stream-cancel, TextDecoder fatal, parseBody exhaustiveness, setTimeout type, MITM-mismatch-no-backoff). All fixed inline. End-of-task 3-of-3: Codex env-fail (escape hatch per [[reference_training_learning_ms0_u1_collision]]); Reviewer A PASS; Reviewer B PASS (caught 1 CLI ReferenceError, fixed).

**Operator follow-up:**
1. Install cron: `powershell -File .claude/helpers/install-source-monitor-task.ps1`
2. Verify acceptance: `node scripts/source-monitor-sweep.mjs --once` should log ≥1 item per source
3. If `rsshub-x-ai` or `moonshot-blog` rate-limit / fail from US runner, swap for higher-availability alternates

**Deferred (P2/P3 from scrutiny):**
- CLI/engine parser drift — add parity test or extract shared module
- User-Agent string hardcoded to `markjvillanueva3-cloud/prism` — should accept `EngineOpts.userAgent`
- `parseRSS` doesn't resolve namespace prefixes (`dc:date` from arxiv won't populate `published`)
