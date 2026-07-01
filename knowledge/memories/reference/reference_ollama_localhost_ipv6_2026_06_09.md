---
name: reference_ollama_localhost_ipv6_2026_06_09
description: "FLEET-WIDE bug found via R15 live-validation: OllamaClientEngine hardcoded http://localhost:11434; on Windows localhost->IPv6 ::1 but Ollama binds IPv4 127.0.0.1, so every engine routing through ollamaClientEngine was Ollama-blind. Fixed to 127.0.0.1 default + OLLAMA_HOST override."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.678Z
aliases: reference_ollama_localhost_ipv6_2026_06_09
---


# Ollama localhost-IPv6 unreachability (fleet-wide, slot:bravo 2026-06-09)

## The bug
`mcp-server/src/engines/OllamaClientEngine.ts` hardcoded `private host = "http://localhost:11434"` (+ `connect(host = "http://localhost:11434")`). On Windows, `localhost` resolves to IPv6 `::1` FIRST, but Ollama binds IPv4 `127.0.0.1` only -> `localhost:11434` is UNREACHABLE. Proven with numbers: a Node `fetch("http://localhost:11434/api/tags")` FAILS in ~64ms; `http://127.0.0.1:11434/api/tags` returns 10 models in ~9ms. Every engine routing through the `ollamaClientEngine` singleton (`MultiModelConsensusEngine.callOllama` line 885 + `listModels` line 494, and any other consumer) silently got "ollama:unreachable" despite a live daemon + present models. This is a likely contributor to the chronically-low (~6-7%) Ollama offload rate and pairs with [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]].

## How it was found (R15 VALIDATE, not a unit test)
Building the octopus live producer (`scripts/octopus-first-live-record.mjs`), the hermetic 17/17 tests all passed, but the **live** dispatch returned `successCount:0, verdict:"...ollama:unreachable"`. The hermetic tests inject fetch so they could never catch this. ONLY the real live run against the live daemon surfaced it. Lesson: a pure-core + injected-IO test suite is GREEN-but-blind to integration-env bugs; the R15 live-validation step is non-optional (this is the same "fake-reader audit" class as RGS-TOOL-AUTOINVOKE-MS1).

## The fix
A module-level `DEFAULT_OLLAMA_HOST` = `process.env.OLLAMA_HOST` (when it startsWith http) else `"http://127.0.0.1:11434"`, used for both the field default and the `connect()` param default. Env-overridable, mirrors `OllamaCapabilityProbeEngine:77`'s existing resolution (the probe already read OLLAMA_HOST; the client did NOT -- inconsistent, now aligned). Regression guard: `mcp-server/src/__tests__/OllamaClientEngineHost.test.ts` (asserts getHost() defaults to 127.0.0.1 + never contains "localhost"; fails against the pre-fix code). Commit on cad-fusion-live-ms0. NOTE: `dist/engines/*.js` are gitignored + emitted by `npm run build:tsc` (NOT build:fast/esbuild, which only builds dist/index.js + chunks from a single entry) -- a source fix needs `build:tsc` (or a targeted `tsc <file> --outDir tmp` + copy) to reach the per-file dist that scripts import directly.

## Follow-up (other slots / next)
Grep the fleet for other `localhost:11434` hardcodes (the search found the host string in MANY dist chunks + several engines: `LatheLoRAOllamaDeployerEngine`, `OllamaCAMIntegrationEngine` fallback, etc.) -- each is the same fleet-wide blind spot on this Windows host. Owner: papa (backend infra) / india (AI). The 2-local-voice octopus consensus floor needs both 65GB+20GB models WARM (a cold sequential load of gpt-oss:120b can exceed the 240s/voice timeout -> successCount 1 on the first cold run, 2 when warm).
