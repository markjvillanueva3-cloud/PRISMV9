---
name: reference_obsidian_router_table_advise_disable_2026_06_09
description: "Token-savings win discovered via the ultracode discovery Workflow (w3qho9bc3) + implemented + verified this fire: disabled pre-tool-router-table-advise.mjs via PRISM_ROUTER_TABLE_ADVISE_DISABLE=1. EMPIRICALLY VERIFIED redundant — 100% of its 1649 nudges are route-found:rtk-wrap for rtk.git (candidateId rtk.git:1649 == nudge count; every other candidate gets no-route-for-candidate), which the bash-rewrite hook auto-prefixes anyway. Stops ~82K injected tokens + a 121,890-row/13.4MB ledger. Zero functional loss (R9 control: knob empty -> nudges, knob=1 -> silent), instantly reversible. Carries the rest of the verified discovery queue (R1-C2..R5)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.233Z
aliases: reference_obsidian_router_table_advise_disable_2026_06_09
---


# Router-table-advise disable + the verified discovery queue (2026-06-09, slot:alpha)

The ultracode discovery Workflow (`w3qho9bc3`, 6 agents/384s, off-context) the operator's
/goal demanded — clause-1 (use ultracode to DISCOVER) + clause-2 (token savings) satisfied
this fire. The synthesis self-disciplined (R12-discarded the weak candidates: the
offload "6%->30%" framing, the always-on-path-ignores-galaxy-brains premise, 3 obsidian
-wiring premises — all live-falsified by the agents).

## SHIPPED (verified + implemented this fire)
**R1-C1 — disable `pre-tool-router-table-advise.mjs`** via `PRISM_ROUTER_TABLE_ADVISE_DISABLE=1`
in `C:/Users/wompu/.claude/settings.json` env (c-to-h-mirror replicated to H:; both valid JSON).
EMPIRICAL PROOF (streamed the 13.4MB ledger `state/shared/dashboards/pre-tool-router-table-advise.jsonl`):
121,890 rows, **only 1,649 nudge, and 100% are `route-found:rtk-wrap` for `rtk.git`** (candidateId
`rtk.git:1649` == nudge count exactly; rtk.ls/node/grep/find/cat all get `no-route-for-candidate`).
The hook's ENTIRE nudge output is "suggest rtk.git (RTK wrap)" — which the bash-rewrite hook
auto-prefixes anyway → zero functional loss. R9 control: knob empty → nudges, knob=1 → `{continue:true}`.
Knob short-circuit at `pre-tool-router-table-advise.mjs:244`. Disable-not-delete (hook stays wired).

## VERIFIED QUEUE (synthesis survivors — act without re-running the Workflow)
2. **R1-C2** — gate `node-no-rtk-wrap` nudge (`pre-tool-savings-multi.mjs:257`, knob
   `PRISM_PTSM_BASHNODE_DISABLE=1`). 2278 fires ~159K tok, ~0 uptake, "node=top spend" premise
   contradicted (real node out ~135 tok). PREFER a session-once gate (clone `_BACKEND_AUDIT_SESSION_KEY`)
   over hard-disable so genuinely-verbose node still gets one nudge. **VERIFY its uptake ledger first** (R8).
3. **R3-C1** — embed ~284 substantive vault-only `reference` memos into `memo-embedding-cache.jsonl`
   (builder keys `.path` already; add `listVaultOnlyReferenceMemos()` keyed `vault/<name>`). Additive,
   zero hot-path blast. Needs a one-time incremental Ollama embed (local-LLM compute step).
4. **R4-C1** — filter glob/path-fragment phantoms from `knowledge-link-audit` extractLinks
   (regex `:45` accepts `*`/`/`; `normalizeName :57` last-segments paths). 1,135 false positives (12.8%
   of 8,891). Pure-function skip predicate + existing test file. Also stops phantom-stub pollution.
5. **R2-C1** — `memory-index-search-lib.mjs:293` `enumerateMemoryFiles` skips `MEMORY.md` → the live-scan
   FALLBACK is blind to all 34 galaxy brains (silent-total-loss class, but only when the BM25 sidecar is
   absent/corrupt). Reuse `collectGalaxyBrainRecords` in the fallback branch.
6/7. R2-C2 (re-embed stale dense sidecar) · R2-C3 (always-on galaxy rank prior — RANKING-SENSITIVE, knob+calibrate, do last).

## OPERATOR-GATED / FRESH-BUDGET (do NOT auto-ship)
- R5-C1 structured-doc auto-route to a reasoning model: configured model is qwen2.5-coder:32b (NOT
  gpt-oss:120b) so the "120B makes lossy-extraction safe" premise is UNVERIFIED; lifting `REPORTISH_EXT`
  risks dropping a needed number (the 2026-06-03 allowlist guarded exactly this). Needs exact-value
  template + model-class gate + must-not-drop-a-number adversarial tests.
- R5-C3 gpt-oss:120b pre-pass on the per-file scrutiny gate: the gate is a CLAUDE.md PROTOCOL, nothing
  to wire into yet; any local pre-pass must stay advisory (never clears the gate alone). Defer.
- R3-C2 `dreams` namespace into recall: BLOCKED on operator yes/no (dream artifacts are staged-not-applied).
