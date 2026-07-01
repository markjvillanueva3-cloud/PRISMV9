# OCTOPUS + SCRUTINY GATE -> Hermes agents with different souls (2026-06-30, slot:alpha)

> Operator: "update octopus to utilize hermes agents and the scrutiny gate to utilize hermes
> agents with different souls." Spec written at YELLOW context for a fresh-session build.
> BUILDS ON the same-session NVIDIA-lane repoint (commits e2579970a6 / 5a015ac1d6 / 35feb01dae):
> `PRISM_HERMES_PROXY_URL=https://integrate.api.nvidia.com/v1` + `PRISM_HERMES_MODEL=
> meta/llama-3.3-70b-instruct`; bearer = `NVIDIA_API_KEY` (in fleet env). Memory:
> [[reference_hermes_grok_via_proxy_deadtoken_2026_06_29]]. Wiki: hermes-fleet-lane-repointed-xai-to-nvidia-2026-06-30.

## What ALREADY exists (do NOT rebuild -- R8/dedup)
- **Octopus** `mcp-server/src/engines/MultiModelConsensusEngine.ts` already has the persona/soul
  voice infra: `HermesAgentVoice` type (persona system-prompt + distinct `name` so N personas on
  ONE model = N distinct voices), `hermesAgentLenses()` (the 5 `brainstorm-path-forward` personas:
  safety-first / root-cause / fastest-unblock / distributed-ownership / adversarial), `resolveHermesVoices()`,
  `execViaHermesProxy` (threads persona as a role:system msg). Gated on `grokClientEngine.hermesProxyReachable()`.
- **GrokClientEngine.ts:68** already reads `PRISM_HERMES_PROXY_URL` (now NVIDIA), but its hermes-proxy
  transport sends NO auth header and requests `grok-4`/`grok-4.3` (NVIDIA doesn't serve those).
- **Scrutiny gate** `.claude/scripts/scrutiny-3way.mjs` emits 3 CLAUDE reviewer prompts (armA opus /
  armB claude / armC analyst); the chat dispatches them via the Agent tool; ledger
  `mcp-server/data/state/SCRUTINY_LEDGER.json`; Stop hook `.claude/hooks/scrutinize-before-stop.mjs`.
- **Souls**: `.claude/souls/*.md` (per-slot souls: efficiency-watchdog, etc.) + the 5 brainstorm lenses
  in `hermesAgentLenses()`. The hermes lane (ask-hermes.mjs) accepts a `--with-context` + per-call
  system prompt; personas are just system prompts.

## PART A -- Octopus utilizes Hermes agents (make the persona voices actually vote)
The infra exists; it just can't reach a live model. Make the Hermes-proxy transport reach the NVIDIA lane:
1. `GrokClientEngine.ts` hermes-proxy transport (the `execViaHermes`/proxy path, ~line 60-130): add the
   bearer header `Authorization: Bearer ${PRISM_HERMES_TOKEN || NVIDIA_API_KEY}` (mirror ask-hermes/
   hermes-mcp-server authHeaders); when the base is the NVIDIA endpoint, resolve the model to
   `PRISM_HERMES_MODEL || meta/llama-3.3-70b-instruct` instead of grok-4.3 (NVIDIA has no grok). Keep the
   :8645 path byte-identical (proxy ignores bearer + maps its own model).
2. `MultiModelConsensusEngine.ts`: confirm `hermesProxyReachable()` now passes against NVIDIA (it should --
   GrokClientEngine reads PRISM_HERMES_PROXY_URL + the meta-health /models probe is already cloud-aware).
   Default `seatLenses=true` so the 5-persona panel auto-seats (operator's "drastically increase hermes-agent
   utilization" from reference_hermes_proxy_aiohttp_dark_root_cause_2026_06_26). All 5 personas run on
   meta/llama-3.3-70b ($0-ish via the user's NGC quota) as 5 DISTINCT consensus voices.
3. Tests: a real local-HTTP-server case (like reconcile-zulu-ledger.test) proving 5 distinct personas ->
   5 voices via the NVIDIA lane + the bearer is carried. `npm run build` (mcp-server) + `npx vitest run`
   the consensus tests.

## PART B -- Scrutiny gate uses Hermes agents with DIFFERENT SOULS
Add Hermes-agent reviewer arms (distinct souls) to the 3-of-3 gate -- they review $0/cheap via the NVIDIA
lane, OUTSIDE Claude context (token economy: the whole point). Design:
1. New `scripts/scrutiny-hermes-souls.mjs` (pure helpers + thin shell, R9-tested): given the session diff,
   run N persona-reviewers via the Hermes lane (ask-hermes / direct NVIDIA fetch with a per-soul system
   prompt). SCRUTINY-SPECIFIC souls (distinct from the brainstorm lenses): `correctness-hawk` (logic/edge
   cases), `security-skeptic` (I/O, injection, secret leak), `test-integrity` (stub asserts, .skip/.only,
   real reference values), `regression-hunter` (silent breakage, blast radius), `convention-enforcer`
   (inlined constants, naming, R8/R11). Each returns PASS/FAIL + P0/P1 findings.
2. Wire into `.claude/scripts/scrutiny-3way.mjs` as an ADVISORY arm (like the Codex arm: never blocks the
   3-of-3, degrades to skipped on Hermes failure) -- emit a `hermesSoulReviewCommand` the chat runs in
   parallel with the 3 Claude arms; surface the merged soul findings to the chat before it records verdicts.
   Keep the strict 3-of-3 (Claude A/B/C) as the load-bearing gate; the Hermes souls are a cheap broad
   pre-filter that catches issues the 3 arms might miss (diversity), at $0.
3. Optional: a `--hermes-souls-block` mode (env `PRISM_SCRUTINY_HERMES_SOULS_BLOCK=1`) where a majority of
   soul-FAILs is surfaced as a hard advisory. Default = advisory-only (don't add a 4th blocking arm without
   operator opt-in -- R7, the 3-of-3 is canonical).
4. Tests: hermetic (inject the Hermes fetch) proving N souls -> N verdicts + the merge + fail-soft skip.

## Acceptance criteria
- Octopus: `prism_ai:consensus` (or the engine) seats >=5 distinct Hermes persona voices that ACTUALLY
  return text from NVIDIA (not "proxy unreachable"); proven with a live consensus call + numbers.
- Scrutiny: a real session diff produces N Hermes-soul reviews ($0, off-Claude) surfaced alongside the
  3 Claude arms; the gate still requires strict 3-of-3 Claude PASS (souls advisory).
- All tests green; `npm run build` clean; both round-tripped through their dispatcher/hook.
- Wire-test-validate-all (R15): no orphan; the souls list is reused (clone-don't-fork) between octopus
  lenses and scrutiny souls where sensible (shared `scripts/lib/hermes-souls.mjs`?).

## Files to touch
- `mcp-server/src/engines/MultiModelConsensusEngine.ts` (seatLenses default; verify reachability)
- `mcp-server/src/engines/GrokClientEngine.ts` (hermes-proxy transport: bearer + NVIDIA model)
- `.claude/scripts/scrutiny-3way.mjs` (+ `scripts/scrutiny-hermes-souls.mjs` new) (+ tests)
- maybe `scripts/lib/hermes-souls.mjs` (shared soul catalog) + `.claude/hooks/scrutinize-before-stop.mjs` (surface the arm)
- Build: `cd mcp-server && npm run build` ; test: `npx vitest run` + `node --test scripts/*.test.mjs`
