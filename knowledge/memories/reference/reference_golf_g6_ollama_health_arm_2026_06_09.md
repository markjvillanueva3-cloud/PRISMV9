---
name: reference_golf_g6_ollama_health_arm_2026_06_09
description: "G6 SHIPPED (golf queue build-iter-B): native-ollama :11434 Stop-advisory arm added to docker-service-health-stop.mjs. buildOllamaAdvisory (pure) + ollamaNativeProbe (injectable) probed UNCONDITIONALLY before the docker arm so a down Docker daemon (normal on this host) cannot suppress the ollama-offload liveness signal. Cheap /api/tags + reachable===false gate = no cry-wolf. 11/11 tests (4 IO failure-mode via injected fetch), R15 live-proven, 2-agent scrutiny PASS+PASS. Also: G9 CLOSED (cron-locks clean, watchdog-consumption live-proven)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_g6_ollama_health_arm_2026_06_09
---


**2026-06-09 (slot golf, /loop build-iter-B, post-compact #2).** SHIPPED `U-GOLF-G6-OLLAMA-HEALTH-ARM`.

**The gap (verified before building, R8/R12):** `docker-service-health-stop.mjs` (Stop hook) surfaced downed Docker containers (qdrant/postgres/prometheus/grafana via `EXPECTED_SERVICES`) + a downed MCP :3100 singleton (`singletonAdvisory`), but **native ollama on :11434 had NO Stop-surfaced down-advisory anywhere**. The other ollama probes fire at the wrong time: `octopus-provider-probe` + `session-start-ollama-chat-probe` are SessionStart/PreCompact; `fleet-reaper-sweep` probes ollama only to feed its GPU/prewarm coordinator (no down-advisory). On THIS host the compose `ollama` service is deliberately dropped (NIM-drop 2026-06-09 — native runtime owns :11434 via the "PRISM Ollama Serve" task), so the docker-container guard STRUCTURALLY never covers it. Native ollama is the token-economy offload + embeddings + octopus-consensus substrate (PSN leg) — a silent down degrades all of it to Claude-fallback.

**The fix:** `buildOllamaAdvisory(probe)` [pure, exported] + `ollamaNativeProbe(fetchImpl)` [exported, fetch-injectable] folded into the hook's existing advisory merge.
- **Probed UNCONDITIONALLY before the docker arm** — the key design point. Docker Desktop is normally DOWN on this host (`docker ps` throws fast), and the pre-existing code returned silent on that catch. So the ollama probe MUST run independent of docker, else a down docker daemon suppresses the ollama signal. Proven live: synthetic closed-port run showed the docker npipe error on stderr AND the ollama advisory both present.
- **No cry-wolf** (the session's #1 lesson): `/api/tags` is a cheap list endpoint that answers in <100ms even mid-generation (does not load a model), so an unreachable verdict is a confident daemon-down, not a busy false-positive. `buildOllamaAdvisory` returns null unless `probe.reachable === false` (strict; unknown/missing/healthy = silent). 2.5s timeout.
- **Cache carries `.ollamaProbe`** (additive; verified single-reader of `.docker-service-health.json`); pre-change cache rows short-circuit to silent via the `!probe` guard (back-compat).

**WIRE/TEST/VALIDATE (R15):** extends an already-Stop-wired hook (no orphan). 11/11 tests incl. 4 new IO failure-mode tests (happy + non-2xx + fetch-throw + unparseable-body) via injected fetch. LIVE: healthy=`{continue:true}` silent; real closed-port=advisory fires; docker-down does NOT suppress ollama. Per-file 2-agent scrutiny PASS+PASS (0 P0). Addressed findings: **P1** latency (the cold-tick work can exceed the 4s settings budget, but state is durably cached via writeCache+touchStamp BEFORE the slow singleton arm with atomic rename, so the next throttled tick recovers the advisory — documented honestly in the header rather than blind-raising timeouts, which would risk a false-negative in the unrelated singleton arm); **P2** magic-`80` named `OLLAMA_ERR_MAX_CHARS` (unified the 80/120 double-truncation); **P2** `ollamaNativeProbe` IO-coverage gap closed.

**Knob:** `PRISM_DOCKER_HEALTH_ADVISORY_DISABLE=1` (shared with the docker arm). **Follow-up (non-blocking, pre-existing):** the hook's cold-tick aggregate latency (ollama 2.5s + docker ps 8s + singleton 15s sequential) exceeds the 4s settings.json budget — a fleet-wide reliability nit predating G6; the right fix is concurrent probes or a per-hook timeout bump, deferred (out of G6 scope, risks the singleton false-negative).

**G9 also CLOSED this iter:** cron-lock board clean (0 orphans — root `.cron-locks/` empty, `state/shared/.cron-locks/` only `.gitkeep`); watchdog-consumption proven LIVE (this session's Stop hook consumed the fleet-task-health "45/50 healthy" WARN); MCP :3100 already verified healthy. **build-iter-B COMPLETE (G9, G6, G10).** Remaining golf-queue: G2 (gpt-oss pull smoke-test) + build-iter-C (G8 eval verify, G4 worktree consolidation).

Relates to [[reference_golf_queue_completion_plan_2026_06_09]], [[reference_golf_g10_autoreenable_guard_2026_06_09]].
