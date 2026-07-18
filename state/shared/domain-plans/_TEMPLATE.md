---
artifact: domain-buildout-plan
slot: <SLOT>
galaxy: <GALAXY>
galaxy_dir: mcp-server/src/engines/<GALAXY>/
kienzle_pages: [<Kienzle Page.dc.html>, ...]   # design source under mcp-server/web/design-imports/kienzle-app-build/
backend_dispatchers: [<prism_x>, ...]
frontend_owner: quebec                          # quebec implements the .dc.html -> src/pages; THIS slot owns the backend the page consumes
status: draft
generated_by: <slot-or-agent>
generated_at: <YYYY-MM-DD>
---

# DOMAIN BUILDOUT PLAN — <SLOT> (<GALAXY>)

> Finalized plan to take the <GALAXY> galaxy to **PhD-master depth**, then **test → simulate → validate → fine-tune**, then **build/flesh out the frontend** from the Kienzle Claude-Design build.
> Universal rails (R1–R16 · scrutiny 3-of-3 · units-first · no-stub · no-inline-constants · canonical physics from `src/physics/constants.ts`) bind every step → `H:/prism/CLAUDE.md`.
> Parent: `state/shared/domain-plans/00-MASTER-ORCHESTRATION-PLAN.md`.

## §1 — Domain identity & scope
- **Owns:** <1–3 line scope from galaxy CLAUDE.md §scope>
- **Excludes:** <what belongs to a sibling galaxy>
- **Slot worktree:** `H:/prism-slot-<SLOT>` · branch `slot/<SLOT>`
- **Galaxy brain:** `<galaxy_dir>/{CLAUDE,MEMORY,PATHS,TOOLBELT,AWARENESS}.md`

## §2 — Current state (verified, not assumed — R12)
- **Scaffolding:** PASS/PARTIAL — cite the 13-artifact buildout gate + AI-synergy audit score for this galaxy.
- **Engines / dispatcher actions:** <count + the prism_* surface from AWARENESS.md>
- **Knowledge legs (PSN 11-leg):** which are healthy / which are thin (Obsidian · Wiki · Tribal · Memories · System-viz · Engines · Algorithms · Formulas · NN/GNN · PRISM-OS · PRISM-AI).
- **Known landmines (R12):** cite live regressions/gotchas from MEMORY.md / `## Recent regressions`.

## §3 — Deepening roadmap → PhD master (the open-ended leg, made bounded)
> "PhD master" = an *engineered loop*, not a one-shot. Enumerate the concrete fill-work + the loop/cron that drives it.
- **Tribal tips to add:** target N (current → target); sources (JM Die corpus, MIT-OCW, vendor manuals); capture via `prism_knowledge:tribal_capture slot=<SLOT>`.
- **Wiki entries to write/cross-link:** list the load-bearing topics missing a wiki leaf (`knowledge/wiki/architecture|lessons/<GALAXY>-*.md`).
- **Memories to write:** the non-obvious domain facts not yet in the store (`<type>_<SLOT>_<topic>.md`).
- **RAG corpus:** which document trove feeds this domain's retrieval; embed target.
- **CAG cold-anchor:** which static doctrine to cache (per `scripts/lib/cag-router.mjs`).
- **NN/GNN features:** which engine nodes need feature vectors for the wiring-inference / refpool (owner: india).
- **LoRA dataset:** instruction-tune split this domain produces (`<galaxy>_lora_{train,test}.jsonl`); india trains.
- **Engineered loop + cron:** the `/loop` + scheduled task that runs this deepening continuously (e.g. nightly `mine-galaxy-transcripts.mjs` → synthesis → tribal/wiki). Name the cadence + acceptance signal (coverage %, audit score).
- **Ollama offload:** route mechanical reading/summarize/classify to local qwen2.5-coder:32b / gpt-oss:120b on Blackwell (free) before Claude.

## §4 — Test plan (real assertions — R9)
- **Unit:** reference-value / algebraic-invariant tests for the core engines (NEVER `toBeDefined()`). Cite physics/business reference sources.
- **Integration:** round-trip **through the dispatcher** (not the singleton) — action enum + Zod schema + lazy import all exercised.
- **E2E:** print/input → domain pipeline → output, asserted against JM-Die live data.
- **Coverage floor:** happy path + **≥3 failure modes** (bad input, boundary, resource exhaustion) + **≥2 adversarial** (NaN, Infinity, empty, oversize) + **≥3 spanning configs** (materials/dialects/machines/process variants).
- **Target test files:** `<galaxy>` `*.test.ts` to add/extend (name them).
- **Runner:** `npx vitest run <files>` (rtk-wrapped); CI gate green.

## §5 — Simulation plan
- **What to simulate:** <physics sim / dry-run / live-data replay / Monte-Carlo where the domain warrants>.
- **Tools:** `prism_calc` / `/cnc-simulate` / `/program-simulate` / domain sim engines (name them).
- **Scenarios:** ≥3 spanning real JM-Die jobs + ≥2 edge/adversarial.
- **Pass criteria:** numeric, with tolerance bands (not "looks fine").

## §6 — Validation plan (live data + numbers — R12/R15)
- **Live-data validation:** run against real JM-Die parts/quotes/programs; report numbers.
- **Acceptance gates:** numeric thresholds (e.g. parity probe page↔core ≤1.3×, S(x) ≥ threshold for safety-relevant, MAPE ≤ X% for cost, in-band for physics).
- **Safety gate:** `prism_safety:validate_physics` where the domain is safety-relevant (S(x) ≥ 0.98 shop_floor).
- **Parity probe:** frontend page output vs backend core output must agree.

## §7 — Fine-tune loop (results → retrain)
> The closed loop the operator asked for: tests/sim/validation RESULTS drive the next-gen model.
- **Outcome capture:** write results to the domain's closed-loop outcome ledger.
- **LoRA:** failing/edge cases → augment `<galaxy>_lora_train.jsonl` → india retrains → promote IFF acceptance gate met.
- **RAG/CAG:** new validated facts → re-embed corpus / refresh cold-anchor.
- **NN/GNN:** new labeled nodes → refpool → retrain (promote IFF AUROC ≥ 0.78 / gates).
- **Trigger + cadence:** what fires the retrain (cron / threshold) + the promotion gate.

## §8 — Frontend build (Kienzle Claude-Design rollout)
> Design SOURCE = `mcp-server/web/design-imports/kienzle-app-build/<Kienzle Page>.dc.html`. Implement 1:1; quebec owns UI, THIS slot owns the backend/API it consumes.
- **Assigned Kienzle page(s):** <list>.
- **Target React page(s):** `mcp-server/web/src/pages/<Page>.tsx` — reuse/extend an existing page if one matches (Codex Page Protection); only create new for genuinely new functionality.
- **Backend wiring:** the `prism_*` dispatcher actions the page calls, the `web/src/api/<client>.ts` client, the Express route on `:3100`. Ensure the route exists/lives (no dead wires).
- **Design language:** iOS fleet language (`web/DESIGN.md` tokens; never inline hex/px) + Calculator-Studio accent where applicable; mobile-first (44pt taps, safe-area, 5 viewports, Capacitor 6).
- **Build/verify loop:** edit → `/run` (or Playwright MCP) → screenshot at desktop + iPhone 14 + Pixel 7 → compare to the `.dc.html` intent → iterate.
- **Acceptance:** page renders, live data round-trips `:3100`, parity with backend (§6), 3-viewport screenshots match design.

## §9 — Dependencies & sequencing
- **Blocked by:** <upstream domains/infra — e.g. india for LoRA/NN retrain, quebec for shared UI shell, romeo for route wiring>.
- **Blocks:** <downstream consumers>.
- **Logical order (R13):** deepen core → test → simulate → validate → fine-tune → frontend (frontend last; never a UI atop an unproven backend).

## §10 — Done-definition (R15: WIRE → TEST → VALIDATE → APPLY)
- [ ] WIRE: every new asset wired to its dispatcher/consumer in the same commit (no orphan).
- [ ] TEST: real reference/invariant tests, happy + ≥3 failure + ≥2 adversarial, through the dispatcher; green.
- [ ] VALIDATE: live-data numbers prove it; acceptance gates met.
- [ ] APPLY: deepening loop + cron live; frontend page rendering live data; parity passing.
- [ ] Per-file 2-arm scrutiny on every code file + 3-of-3 Stop gate on the session.
