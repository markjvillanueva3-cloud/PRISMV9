---
name: reference_ollama_probe_crywolf_2026_06_12
description: "docker-service-health-stop.mjs Ollama probe (2500ms) cries wolf \"UNREACHABLE (This operation was aborted)\" on every Stop when the daemon is actually UP but busy. Verified fix = raise to 8000ms + env knob. Blocked from papa (slot worktree); golf/main-tree to apply."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.681Z
aliases: reference_ollama_probe_crywolf_2026_06_12
---


Slot papa, 2026-06-12 (session 14ef4ae0). Verified false-negative in a Stop hook.

**Symptom:** every Stop emits `⚠ Ollama daemon (:11434) UNREACHABLE (This operation was aborted). Local-LLM offload / embeddings / octopus consensus are silently falling back to Claude -- token-economy degraded.`

**Root cause (verified):** `.claude/hooks/docker-service-health-stop.mjs:47` sets `OLLAMA_PROBE_TIMEOUT_MS = 2500`. On this loaded box the daemon is UP with 12 models (`curl -s -m 12 http://127.0.0.1:11434/api/tags` returns `deepseek-r1:32b, qwen3-coder:30b, gpt-oss:120b, qwen2.5-coder:1.5b, ...`), but `/api/tags` takes >2.5s under concurrent fleet generation, so the AbortController fires ("This operation was aborted" = timeout, NOT connection-refused). The hook's comment claims "/api/tags answers in <100ms even mid-generation" -- empirically FALSE under load. A genuinely-down daemon refuses the connection ~instantly, so an 8s budget distinguishes down-vs-busy without the cry-wolf. Sibling of [[reference_golf_g6_ollama_health_arm_2026_06_09]].

**Exact fix (one line + comment):**
```js
// line 47:
const OLLAMA_PROBE_TIMEOUT_MS = Number(process.env.PRISM_OLLAMA_PROBE_TIMEOUT_MS) || 8000;
```
Plus correct the lines 41-43 comment (drop the false "<100ms even mid-generation"; note that under load it can take seconds, a down daemon refuses instantly, hence 8s). Test (`docker-service-health-stop.test.mjs`) has 0 refs to the constant -- safe.

**Why papa didn't apply it:** `.claude/hooks/*.mjs` is a HARD cross-worktree-firewalled harness-exec file (drift = silent/asymmetric/survives-reboots); blocked from the slot worktree. Non-urgent (cosmetic alert noise, Ollama functions fine) so a logged `PRISM_CROSS_WORKTREE_BYPASS=1` override wasn't warranted unprompted. **Owner: golf or a main-tree chat** -- `cd H:/prism` then edit + commit. Verify after: trigger a Stop, confirm no false UNREACHABLE while `curl -m 12 .../api/tags` succeeds.

**APPLIED 2026-06-12 by zulu (main tree, commit `52970dfb30`)** -- and extended after 2-arm scrutiny found the 8s budget crossed the hook's 4s settings timeout: (a) the knob landed as exported `resolveProbeBudget()` (floor 1000, default 8000); (b) abort/timeout now maps to `reachable: undefined` = UNKNOWN/silent (only a refusal is a confident DOWN -- busy != down, wedge residual documented); (c) cold path REORDERED so docker verdict + stamp land atomically BEFORE the probe (a 4s harness kill can no longer strand the fleet cold or suppress the docker advisory); (d) throttled ticks re-probe a cached DOWN at a 2.5s budget so a restarted daemon clears immediately (zulu's live-observed 3-tick stale-DOWN cry-wolf). 17/17 tests + live E2E both paths. Sibling residual: `session-consolidate-graph.mjs` probes the same endpoint at 1.5s -- still to fix.
