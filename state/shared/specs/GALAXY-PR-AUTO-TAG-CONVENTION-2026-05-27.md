# Galaxy PR Auto-Tag Convention (U-GALAXY-MS1-G3, 2026-05-27 slot:alpha)

> **Problem solved:** Multi-galaxy PRs touch files across N domain galaxies. Without tagging, reviewers from each affected galaxy don't get notified → reviews stall or miss domain-specific issues. With the galaxy doctrine + per-galaxy soul slots in place, auto-tagging becomes mechanical.

## The convention

When a PR is opened (via `gh pr create` or the `swarm-pr` agent), an automation step:
1. Scans the PR's changed-files list
2. Maps each file to its galaxy via `mcp-server/src/engines/<galaxy>/` directory match
3. Looks up the soul slot per `GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md` soul map
4. Adds the slot owner as a requested reviewer + adds GitHub labels `galaxy:<name>` for each touched galaxy

## Mapping table (slot → GitHub reviewer handle)

The slot identity in PRISM is internal (alpha/charlie/etc.). The GitHub reviewer handle is the human/agent that runs that slot. Today this is the operator (`markjvillanueva3-cloud`) for all slots. Per-slot reviewer-handle mapping lives at `state/shared/slot-github-reviewer-map.json` (to be created when fleet gets multiple human reviewers).

## Galaxy → required-review map (for now, single-reviewer mode)

All slots = operator currently, so PR auto-tag is **label-only** today:

| Galaxy touched | Auto-applied label | Future reviewer (when multi-human) |
|---------------|--------------------|-----|
| mill | `galaxy:mill` | alpha-handle |
| lathe | `galaxy:lathe` | TBD-lathe-soul-handle |
| wedm | `galaxy:wedm` | TBD-wedm-soul-handle |
| quoting | `galaxy:quoting` | charlie-handle |
| business | `galaxy:business` | hotel-handle |
| (all 20 galaxies same pattern) | `galaxy:<name>` | per-soul-slot |
| **cross-galaxy (2+ matched)** | `galaxy:cross-galaxy` + R7-fork-flag | all matched souls |

## R7-fork-flag (cross-galaxy PR amplification)

Per `feedback_conflict_fork_rule`: a PR touching 2+ galaxies in a single commit MAY be:
1. **Legit cross-cutting infra** (the asset belongs in `engines/baseline` or shared lib)
2. **Cross-galaxy bridge engine** (the cross-galaxy/ memory namespace applies)
3. **Chat-soul drift** (work was done by wrong slot — should be reassigned)

The auto-tag adds an `R7-fork-flag` label that triggers a comment template asking the author to declare which of the 3 patterns applies. Without this declaration, the PR fails the per-file scrutiny gate.

## Wiring (deferred to a follow-up unit)

Implementation requires:
1. GitHub Action (`.github/workflows/galaxy-auto-tag.yml`) that reads PR diff + applies labels via `gh pr edit --add-label`
2. Update to `swarm-pr` agent to call the same tagger before PR creation
3. Slot-handle map JSON at `state/shared/slot-github-reviewer-map.json` (skeleton OK for single-reviewer mode)

These are 3 separate units to file under MS2 (Phase B+ of the doctrine).

## Quantified ROI

When the fleet adds a 2nd human reviewer:
- Auto-tag removes manual `@mention` per PR (saves ~30s per multi-galaxy PR × N PRs/day)
- R7-fork-flag catches drift PRs BEFORE merge (prevents the absorb-into-peer-commit class of bugs that this session experienced)
- Galaxy labels enable filter views: "PRs affecting mill in last week" via `gh pr list --label galaxy:mill`

## Cross-refs

- Parent doctrine: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Sister gate: [`GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md`](GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md)
- MS1 envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-G3-GALAXY-PR-AUTO-TAG`
- Related: `feedback_conflict_fork_rule`, F2 hook `pre-write-cross-galaxy-warn.mjs` (in-session detection counterpart)
