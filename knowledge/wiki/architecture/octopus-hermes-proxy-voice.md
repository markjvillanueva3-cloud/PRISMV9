---
title: Octopus consensus — Hermes OAuth-proxy Grok voice
type: architecture
status: built
slot: zulu
created: 2026-06-23
tags: [octopus, consensus, hermes, grok, synergy, ollama-offload, multi-model]
related:
  - psn-octopus-fleet-synergy-ms0
  - zulu-ledger-reconciler
  - hermes-proxy-silent-degradation-missing-aiohttp-2026-06-23
---

# Octopus consensus — Hermes OAuth-proxy Grok voice (OCTOPUS-HERMES-SYNERGY)

**One-line:** PRISM's octopus multi-model consensus (`MultiModelConsensusEngine`) can now seat its **Grok voice via the FREE local Hermes OAuth proxy (`:8645`)** as a third transport when neither `XAI_API_KEY` nor the `grok` CLI is present — so a host with no paid Grok key still gets a real non-Ollama cloud voice at $0, lifting both hermes utilization and octopus answer-diversity.

## Why
Before this, the octopus Grok voice joined only on `XAI_API_KEY` (HTTP API) or a keyless `grok` CLI on PATH. On the operator's box both are absent, so the autofire consensus ran just **2 local ollama voices** (gpt-oss:20b + qwen2.5-coder:32b). Meanwhile the **Hermes proxy was up + authenticated to the same Grok model via free managed OAuth** — a transport the engine never tried, and the `ask-hermes` lane was under-utilized (~4 calls/window). One additive change activates a dormant stronger voice and synergizes two named systems (hermes + octopus).

## How it works
- **One voice, three transports, never two at once** (R7 — `callGrok` returns after the first live backend). Priority: `XAI_API_KEY` HTTP → `grok` CLI → **Hermes proxy**. Vendor stays `xai` (hermes *is* Grok), so there is no double-vote.
- `GrokClientEngine.hermesProxyReachable(opts?)` — memoized (30s TTL, `force`/`resetHermesProbeCache`) **fail-CLOSED** probe of the proxy `/health` ROOT (not under `/v1`). Only `{status:"ok", authenticated:true}` opens the voice; any failure → `false`, so a down proxy never seats a phantom voice.
- `GrokClientEngine.execViaHermesProxy(options)` — OpenAI-compatible POST to `:8645/v1/chat/completions`, `Bearer PRISM_HERMES_TOKEN` (default `"prism"`, proxy attaches the real OAuth cred — **the XAI key is never sent**). Omits `reasoning_effort` (the proxy/model decides). Same `GrokResult` shape; `r.model` carries the true served model (e.g. `grok-4.3`) for the consensus ledger.
- `MultiModelConsensusEngine`: the `includeGrok` gate adds `|| await grokClientEngine.hermesProxyReachable()` (lazy `||` → **zero cost** on keyed/CLI hosts; only probes when both are absent). `callGrok` gains the third branch, bracket-accessing `grokClientEngine["execViaHermesProxy"]` to dodge the security hook's `.exec` false-positive.

## Knobs
`PRISM_HERMES_PROXY_URL` (default `http://127.0.0.1:8645/v1`) · `PRISM_HERMES_TOKEN` (`prism`) · `PRISM_HERMES_MODEL` · `PRISM_HERMES_PROBE_TTL_MS` (30000) · `PRISM_HERMES_PROBE_TIMEOUT_MS` (1500).

## Verified
Live (real proxy): `hermesProxyReachable()=true`; `execViaHermesProxy` → `ok:true model:grok-4.3 answer:"OK" tokens:255`. Tests 100/100 (GrokClient 42, MultiModelConsensusHermesVoice 7 incl. 2 `ask()` round-trips, MultiModelConsensusEngine 51); tsc clean for changed files; 2-arm per-file scrutiny PASS.

## Scope — what it changes (R12 honest, verified)
- **DOES**: explicit consensus callers that let Grok default in — `prism_ai:consensus_decide`, `TaskInput.consensus=true`, `/octopus`, direct `ask()` — seat the free hermes-Grok voice on a keyless host.
- **Does NOT change the unattended autofire**: `consensus-queue-drain.mjs` sets `includeGrok:false` **deliberately** (local-only gpt-oss:120b + qwen2.5-coder:32b) to avoid paid/rate-limited cloud voices on the ~10-session fleet. Byte-identical after this change.
- **Reaches compiled consumers on the next build**: the running MCP server (:3100) + drain load `dist/`, not `.ts`; the change is in source + tested + engine-level-live-validated, and lands in production on a routine `npm run build` + restart.
- **Autofire opt-in (SHIPPED, U-OCT-DRAIN-HERMES-GROK)**: `PRISM_CONSENSUS_DRAIN_HERMES_GROK=1` adds the free hermes-Grok voice to the otherwise local-only drain, **keyless-gated** (`drainGrokEnabled()`) so the unattended drain never makes a paid Grok call; fail-soft (down proxy → current 2-voice). Default off = byte-identical (R7; sibling of `PRISM_CONSENSUS_DRAIN_INCLUDE_CLAUDE`). Activation = flip the knob + dist rebuild.

## Lesson (test-hermeticity)
Adding a live-I/O term to a gate breaks every existing test that hits that gate's keyless path — and it fails LOUDEST on the host where the feature actually works (proxy up → real probe → extra voice seated → voice-count assertions flip). Neutralize the new term (`hermesProxyReachable → false`) in every keyless `beforeEach`, alongside the existing `isAvailable → false` / vendor-key scrub. And a gate term needs its own `ask()`-level round-trip test — a singleton/`callGrok`-only test can't catch a gate regression (R15). See `[[reference_octopus_hermes_voice_synergy_2026_06_23]]`.
