---
name: reference-obsidian-fully-operational-2026-06-09
description: "Obsidian vault gap-fill: re-enabled CAG-gated recall (3 injectors) + fixed the master-index per-prompt OOM, fire-counter telemetry, durable cron-runner dir for the 3 broken tribal tasks + 3 new synthesis crons, reverse H->C mirror wired. Scheduled-task registration is BLOCKED on operator elevation."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.665Z
aliases: reference_obsidian_fully_operational_2026_06_09
---


2026-06-09 (slot:kilo, DESKTOP-N7MI1VB). Operator: "fill all gaps, get obsidian fully operational" after an ultracode wiring deep-dive (run wf_55e91330-19a, 11 agents, adversarial-verified) found the vault writes every 3 min but barely talks back.

**The 5 gaps + what was done:**

1. **Recall injectors hard-OFF (the headline gap).** `settings.json:45-48` had `PRISM_MASTER_INDEX_INJECT/MEMORY_INDEX_INJECT/WIKI_PRECHECK_INJECT=0` + `PRISM_OBSIDIAN_VAULT_PRECHECK_DISABLE=1`. NOT an intentional always-on-suppression (the `feedback_low_take_rate_nudges_are_net_negative` doctrine) — it was a **half-finished CAG migration**: `cag-router-inject.mjs:125-127` computes `masterIndexInject/memoryRelevanceInject/tribalByDomainInject = (tier===COLD && conf>=0.4)` but **nothing consumes it** (the recall hooks only check their own hard `PRISM_*_INJECT` knob). So recall was dead in BOTH tiers. Operator chose **"flip ON + measure take-rate"**. Flipped all 4 knobs (C: edit, mirrored to H:). Live-verified all 3 fire at the 384MB hook heap.

2. **master-index per-prompt OOM (the bug "flip the knob" would have shipped).** `tryLoadSidecar` (`scripts/lib/master-index-search-lib.mjs`) did `JSON.parse(readFileSync(...))` on the **191MB** `system-graph-index.json` inside portable-node's deliberate **384MB** hook heap cap (MCP-FLEET-CAPACITY-MS0 Windows commit-reservation guard) -> Mark-Compact OOM on EVERY prompt the moment master-index was enabled. FIX: heap-aware size guard before the sidecar parse — ceiling = 35% of `v8.getHeapStatistics().heap_size_limit` (~151MB at a 384MB cap), override `PRISM_SIDECAR_MAX_BYTES`. Oversized sidecar -> `rejected()` (visible stderr, R12) -> caller falls through to the 59MB architecture-graph (fits). Reviewer-caught 2 P1s in the knob handling (`Number("-1")` truthy -> rejects ALL sidecars; `0` falsy -> silently ignored): fixed with `Number.isFinite(rawMax) && rawMax > 0`. 4 regression tests (oversized->legacy, generous->sidecar, negative->default, non-numeric->default), 57/57 green.

3. **Take-rate telemetry.** `memory-index-precheck-inject.mjs` recorded NO fire metric (master-index/wiki already do via `feature-counter.mjs` -> `state/shared/dashboards/feature-util-counts.json`). Added `incrementFeature("MemoryIndexInject")` after the hits-guard (counts only real injections). Live 0->1. NOTE (R12): automatic **take**-rate is NOT feasible — an injected memory has no observable "take" signal (unlike route-suggest where a take = a subsequent MCP call). The measurable half is fire-rate + token cost; re-gate if a hook fires a lot and the notes are never referenced.

4. **3 broken tribal tasks + 3 new synthesis crons.** ROOT CAUSE of `Tribal Consolidate Weekly / Tribal Promotion Cron / Wiki-Tribal Audit Regen` showing `0x41303` (never ran): their installers wrote the runner `.ps1` to `$env:TEMP`, which `tmp-orphan-janitor.mjs` reaps -> task points at a deleted script. FIX: created durable `H:/prism/.claude/cron-runners/` (NOT in the janitor's `DEFAULT_DIRS`, and `prism-*-cron.ps1` never matches `isTmpName`); patched all 3 installers to write there. Built NEW `install-synthesis-crons.ps1` registering the 3 cron-READY synthesis runners (`weekly-memory-synthesis`, `run-daily-context`, `run-knowledge-distillation` — all smoke-verified). Deliberately did NOT schedule `find-connections.mjs` (per-target `<target-slug>`, not a batch runner; `prism_memory:connections_materialize` is the on-demand surface).

5. **Reverse H->C mirror wired; 2 RAG hooks left dead by design.** Wired `h-to-c-obsidian-mirror.mjs` into `settings.json` PostToolUse `Edit|Write|MultiEdit` (was 0 refs) -> Obsidian-side memory edits now flow back to the canonical C: source (closes the bidirectional-vault gap, the cyrilXBT "biggest dormant-X-article miss"). NO infinite-loop: h-to-c writes to `C:/.../H--PRISM/memory/`, c-to-h mirrors that to `H:/.claude/...` — a DIFFERENT H: tree, outside h-to-c's `H:/prism/knowledge/memories/**` trigger scope (silent-failure-hunter proved disjoint namespaces + dual SHA skips + mtime gate). Left `obsidian-precheck-inject.mjs` (duplicate of now-live memory-index) + `ollama-obsidian-rag.mjs` (superseded by memory-rag-inject + adds Ollama latency) DEAD per R7.

**Gap 4 (Brain Refresh) = VERIFIED NOT A GAP.** The deep-dive said re-register with `--with-viz`/`AtStartup`. WRONG vs the current installer: `brain-refresh.mjs:49` says heavy `regen-viz` runs only with `--with-viz` because "they have their own commit/Stop/cron triggers". Adding it to a 45-min task = a 30-min heavy graph regen ~32x/day fighting the system-graph write-lock = REGRESSION. Live task matches the current installer; `StartWhenAvailable` covers reboot-resume. No change.

**STILL BLOCKED ON OPERATOR (hard boundary):** this machine denies `Register-ScheduledTask` / `Unregister-ScheduledTask` to a non-elevated shell (`Access denied 0x80070005`) — even for brand-new tasks. So gaps 3+4-cron need ONE elevated PowerShell run:
```
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-synthesis-crons.ps1 -RunNow
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-tribal-consolidate-cron.ps1 -RunNow
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-tribal-promotion-cron.ps1 -RunNow
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-wiki-tribal-audit-task.ps1 -RunNow
```
All 4 installers parse-clean + write durable runners. The recall + mirror + telemetry fixes are LIVE NOW (no elevation needed).

See [[reference_infra_nim_drop_ollama_2026_06_09]] (sister infra session), [[feedback_low_take_rate_nudges_are_net_negative]], [[reference_cag_router_hook_inject_2026_05_26]], [[reference_master_index_sidecar_2026_05_19]].
