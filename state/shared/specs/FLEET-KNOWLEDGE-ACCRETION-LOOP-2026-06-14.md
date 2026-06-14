# FLEET KNOWLEDGE-ACCRETION LOOP — durable, bounded, ≥10×-per-galaxy

> **Authored by zulu (master orchestrator) 2026-06-14.** Operator `/goal` (2026-06-14, YOLO + ultracode):
> *"utilize obsidian vault, ultracode, hermes, parallel agents, harnessed loops, crons, hermes agentic coding
> techniques to continuously loop through every galaxy at least 10 times each to keep improving, building and
> adding knowledge until it's physically impossible to do so because there are no more reputable sources to
> extract from like college courses, case studies, books, articles, seminars and videos."*

## The loss function (R12 — the goal as written is UNBOUNDED; this bounds it deterministically)
The prose "until physically impossible / no more reputable sources" has no stop test. Converted to a
deterministic gate in `scripts/lib/galaxy-knowledge-ledger.mjs`:

- **A galaxy is SATURATED ⇔ `iterations ≥ targetIterations (10)` AND the last `saturationConsecutive (2)`
  iterations EACH added `< noveltyThreshold (2)` novel reputable sources.** novelty = cited sources whose
  key is NOT already in that galaxy's cumulative source set. **novelty → 0 is the measurable proxy for "no
  more reputable sources to extract".**
- **Fleet DONE ⇔ all 34 galaxies saturated.** Then every cron run is a cheap no-op ("FLEET DONE"). There is
  no infinite loop — the ledger terminates it.
- A galaxy that keeps finding new sources at iter 11, 12, … keeps iterating (the counter RESETS on a
  high-novelty iter) — exactly the operator's intent ("until there are no more sources").

## Architecture — two tiers (honest about what runs where)
| Tier | Runs | What it does | Fidelity |
|------|------|--------------|----------|
| **Hermes cron tier** | `scripts/galaxy-knowledge-iterate.mjs` via the `PRISM Galaxy Knowledge Iterate` scheduled task (reaper-immune, every 3 h, `--count 3`) | Calls Hermes (xAI Grok via :8645, OUTSIDE Claude) for the next deep-research layer + candidate reputable sources per galaxy; deposits a **DRAFT** anchor into the Obsidian vault; records the iteration in the ledger | DRAFT — citations are Hermes-RECALLED, marked pending-WebFetch-promotion |
| **WebFetch Workflow tier** | the existing `galaxy-deepen-foundations` Workflow (ultracode + parallel agents), run in a Claude session | WebFetch-**CONFIRMS** claims against live free sources (MIT OCW, OpenStax, NIST/NASA/DOE, standards), promotes to VERIFIED in `knowledge/wiki/<g>/<g>-foundations.md` | VERIFIED — only WebFetch-confirmed claims promoted (R12) |

Both feed the SAME ledger (`--record <g> --sources … --confirmed` records a Workflow-tier iteration). The cron
keeps the loop turning between sessions; the Workflow tier provides verified precision when a session runs.

## Why a cron (the operator named it)
A chat-spawned loop dies when the chat /compacts or stops (the fleet-reaper kills long node children of a dead
`claude.exe`). A scheduled-task's node child's parent is Task Scheduler — **reaper-immune** — so the loop runs
continuously with NO Claude session. Register/inspect:
```
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/helpers/install-galaxy-knowledge-cron.ps1 -RunNow
node scripts/galaxy-knowledge-iterate.mjs --status      # per-galaxy iteration + saturation
```

## The 34 galaxies + the field fence
`GALAXIES` in `galaxy-knowledge-iterate.mjs` (== the engine-subdir / mining-registry roster). Each carries a
`hint` (true PRISM domain) + a `physics` flag. **Field fence (R12 fix):** Hermes anchors hard on "manufacturing"
for ambiguous galaxy names — `discovery` drifted to manufacturing SPC/MSA. The prompt now leads with the `hint`
and explicitly fences software/AI/business/education galaxies OUT of manufacturing sources. Validated: `discovery`
went from manufacturing-DOE → CS knowledge-discovery (KDD/EDA/MDL/algorithmic-information-theory). The 6 physics
galaxies (mill/lathe/wedm/cam/speed-feed/post-processor) get method/standards/theory depth ONLY — **never a
numeric cutting constant** (those stay in `src/physics/constants.ts`).

## Wiring / consumers (R15)
- **Engine:** `scripts/lib/galaxy-knowledge-ledger.mjs` (pure loss-function + atomic/fail-loud persistence;
  22 tests) → consumed by `scripts/galaxy-knowledge-iterate.mjs` (CLI/cron entrypoint) → driven by
  `.claude/helpers/install-galaxy-knowledge-cron.ps1` (durable scheduler).
- **Output:** Obsidian vault `knowledge/memories/reference/reference_<g>_iter<N>_deepsource_*.md` (cron tier) +
  `knowledge/wiki/<g>/<g>-foundations.md` (Workflow tier, VERIFIED). Ledger:
  `state/shared/galaxy-knowledge-iterations.json`.
- **DOMAIN:** FLEET-WIDE — serves all 34 galaxies from one engine (clone-don't-fork; R15 APPLY-TO-ALL-GALAXIES).

## Honest limitations (R12)
- **Cron citations are unverified until promoted.** The Hermes tier RECALLS sources (Grok can err); they are
  clearly marked DRAFT and only become VERIFIED when a WebFetch Workflow pass confirms them. The cron advances
  *coverage/momentum*; the Workflow tier advances *verified fidelity*.
- **Hermes domain-precision is field-correct, not pinpoint.** The fence stops gross drift (manufacturing↔CS);
  exact PRISM sub-domain precision comes from the Workflow tier's per-galaxy prompts.
- **WebFetch is rate-limited fleet-wide** — the Workflow tier is WAVE=3 chunked; the cron tier (Hermes, no
  WebFetch) is the always-on path.
- **"≥10× each to exhaustion" is a multi-week durable program**, not one session. The cron advances ~24
  galaxy-iterations/day; 34×10 = 340 iterations → ~2 weeks to a first saturation pass, then it self-trims as
  galaxies saturate. This session built + proved the engine and started the cron.

## This session's bounded deliverable (the deterministic leg — DONE)
- ✅ `galaxy-knowledge-ledger.mjs` + 17 tests (loss function: saturation, novelty, fail-loud persistence).
- ✅ `galaxy-knowledge-iterate.mjs` + 5 tests (34-galaxy roster, Hermes tier, field fence, ledger record).
- ✅ Ledger initialized for all 34 galaxies; `discovery` proven end-to-end (real Hermes anchor + ledger increment).
- ✅ `install-galaxy-knowledge-cron.ps1` registered + started (`PRISM Galaxy Knowledge Iterate`, reaper-immune).
- ✅ This spec. The loop now runs durably toward all-34-saturated.

_Authored 2026-06-14 slot:zulu. Companion to FLEET-KNOWLEDGE-MAX-ROADMAP / -PHASE4-DISPATCH / -PHASE4-REPORT._
