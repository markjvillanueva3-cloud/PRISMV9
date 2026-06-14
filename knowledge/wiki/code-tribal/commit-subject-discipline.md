---
name: commit-subject-discipline
category: code-tribal
domain: backend-dev
tags: [git, commit-message, audit-trail, scope, unit-id, milestone-progress, conventional-commits, attribution]
last_updated: 2026-05-18
slot-attribution: alpha
---

# Commit Subject Discipline in PRISM

PRISM's commit log IS the audit trail. There is no separate ticket system, no Jira, no fancy commit-tracking DB — `git log --grep` is the canonical query against everything that's happened. The format `[SCOPE]/U-ID: title` is what makes that work.

The 2026-05-12 history-strip cost the project 668 milestone envelopes' worth of credit because the prior commit subjects didn't carry `[SCOPE]/U-ID`. Six months of "silent close-out drift" came from that single discipline gap. This wiki captures the format and why each piece is load-bearing.

## The canonical format

```
[SCOPE]/U-ID: title (≤80 chars)

Detail body (wrapped 72 chars):
- What changed
- Why
- Verification (tests passed, gate cleared)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Three components, each with a different reader:

| Component | Format | Read by |
|-----------|--------|---------|
| `[SCOPE]` | `[MILESTONE-NAME-MS#]` | `audit-roadmap-drift.mjs`, milestone tooling |
| `U-ID` | `U-XXXX` (uppercase, hyphen-separated) | `build-milestone-progress.mjs`, MILESTONE_PROGRESS.json |
| `title` | Imperative verb, ≤80 chars | Humans, `git log --oneline` |

## Pattern 1 — Scope = milestone, never project-wide

The `[SCOPE]` is the milestone identifier — `[BACKEND-DEV-LOOP]`, `[FLEET-REAPER-MS2]`, `[OLLAMA-EXPAND-MS0]`. Conventions:

- **All-caps + hyphen-separated.** Lowercase or mixed-case won't match the grep patterns the audit tooling uses.
- **Milestone-grained, not feature-grained.** A 6-month milestone may ship 50 commits; all 50 share `[SCOPE]`. A commit titled `[FIX-TYPO]` is wrong — fix the typo under whatever milestone is owning the surrounding work.
- **`-MS#` suffix when the milestone has multiple phases.** `[FLEET-REAPER-MS0]`, `[FLEET-REAPER-MS1]`, `[FLEET-REAPER-MS2]` — each ships independently; downstream tooling can ask "what's in MS1 vs MS2."

**Anti-pattern**: `[BUGFIX]`, `[CLEANUP]`, `[MAINT]`. These don't map to a milestone — they leave no audit trail. If a bug is worth fixing, it belongs to SOME milestone (the one whose surface is broken). Put the milestone in `[SCOPE]`.

## Pattern 2 — U-ID = uniquely identified unit

The `U-ID` is the unit of work — the smallest grain at which MILESTONE_PROGRESS tracks completion. Conventions:

- **`U-` prefix + hyphen-separated identifier.** `U-WIRE-ENERGY`, `U-MIQ-MINCONF-CONTRACT`.
- **Uppercase identifier.** Lowercase doesn't match the audit regex `U-[A-Z0-9-]+`.
- **Stable across iterations.** A unit might ship in 3 commits (`U-CK06`, `U-CK06-FIX`, `U-CK06-DOCS`) — same U-ID, suffixed scope.
- **Globally unique within the milestone.** A unit id is never reused across scopes; collisions corrupt the credit math.

`MILESTONE_PROGRESS.json` reads commit subjects and credits the corresponding milestone unit. Without `U-ID`, the milestone shows units as `pending` even when the deliverable shipped — the "silent close-out drift" class.

## Pattern 3 — Title = imperative action verb

The title describes what the commit DOES, not what it IS:

| Good | Bad |
|------|-----|
| "wire ProbeRoutineEngine into mill-strategy" | "ProbeRoutineEngine integration" |
| "fix R12 silent fail in master-index filter" | "min_confidence bug" |
| "ship 3 wikis covering concurrency, hermetic-test, schema" | "wiki additions" |
| "add fail-on-revert oracle for stratified neg-sampling" | "test improvements" |

Three rules:
- **First word is a verb.** wire / fix / ship / add / refactor / drop / harden / promote / consolidate.
- **No editorializing.** "improve" and "enhance" are vague; "speed up X by 3×" or "fix R12 silent fail in X" are specific.
- **Reads like an instruction to the codebase.** The codebase used to NOT have X; now it does.

## Pattern 4 — Body explains the WHY, the AUDIT, the VERIFICATION

The detail body is for the future-reader (you, in 6 weeks, debugging a regression). Three sections:

```
[MAIN] [BACKEND-DEV-LOOP]/U-WIRE-ENERGY: wire MachiningEnergyModelEngine

WHAT: prism_calc:machining_energy_model — surfaces the ME engine to
       Ollama agents + MCP callers.
WHY:  half-orphan engine (test-only wire) per CLAUDE.md regression class.
       729-unwired-engines pain.
HOW:  added executor body in calcDispatcher, z.enum entry, 16-case test.
       physics-reviewer pass: 0 P0/P1.
       fail-on-revert oracle: tested via real MachiningEnergyModelEngine.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

The R12 honesty rule: claim only what you verified. "Tests pass" is a lie when you `.skip`-ped any.

## Pattern 5 — Co-Authored-By for AI attribution

PRISM commits routinely carry `Co-Authored-By: Claude Opus 4.7 (1M context)`. Two reasons:
- **License clarity** — explicit AI involvement is auditable.
- **Pattern recognition** — `git log --author=Claude` filters AI-led work.

The trailer goes at the END of the commit body, separated by a blank line from any other content. Multiple co-authors get multiple trailers.

## Pattern 6 — Multi-line body uses HEREDOC for git

When the body has structure (lists, code-fenced examples), pass it via HEREDOC so quoting + escaping works:

```bash
git commit -m "$(cat <<'EOF'
[MAIN] [BACKEND-DEV-LOOP]/U-XYZ: title

Detail line 1
Detail line 2 with $literal $dollars and `backticks`

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

The single-quoted heredoc `<<'EOF'` is the standard — no variable expansion, no escaping needed. Double-quoted heredoc `<<EOF` interpolates and is a footgun.

## Pattern 7 — `[MAIN]` prefix when commit lands on main directly

PRISM convention: `[MAIN]` prefix means "this commit lands on the main branch (not via PR)." It signals that the commit was self-reviewed + scrutiny-gated rather than going through external review. The 3-of-3 scrutiny gate replaces traditional PR review for these.

Without `[MAIN]`, the commit is on a feature branch headed for merge. The convention started 2026-05-12 when the multi-chat fleet shifted to direct-to-main with the scrutiny gate as the quality gate.

## Pattern 8 — Tag iteration in titles for /loop commits

When ships multiple iterations of the same loop:

```
[MAIN] [BACKEND-DEV-LOOP]/U-TRIBAL-BACKEND-DEV-EXHAUST: 6 more wikis + 5 more retags (iter3)
```

The `(iter3)` lets `git log --grep="iter3"` find the iteration, and the message indicates this is the third in a sequence. Useful when:
- Reviewing a /loop run after the fact.
- Computing cumulative deltas across iterations.
- Surfacing "which iter shipped what" in handoffs.

## Pattern 9 — Slot attribution in commit body (not subject)

When multiple slots ship to the same scope, attribution helps debugging:

```
[MAIN] [BACKEND-DEV-LOOP]/U-WIRE-ENERGY: wire ...

slot: kilo
iter5 of /goal continue ollama+obsidian upgrades
```

This goes in the body, not the subject — the subject is constrained to 80 chars and the slot identity is debugging context, not the primary message. The 2026-05-17 multi-chat lane discipline added this as a soft convention.

## Pattern 10 — Verbatim file paths for grep-ability

When a commit touches a specific file, name it in the body verbatim:

```
[MAIN] [FOO]/U-BAR: refactor cycle-time math

mcp-server/src/engines/CycleTimeEngine.ts — extracted cyclic-overhead
mcp-server/src/algorithms/CornerVelocity.ts — moved Bessel impl here
```

Now `git log --grep="CycleTimeEngine.ts"` finds the commit. Forward slashes, full repo-relative path, no markdown wrapping.

## Anti-patterns observed in PRISM

- **Subject without `[SCOPE]/U-ID`** — silent close-out drift class. Was THE bug for the 2026-05-12 history-strip pre-period.
- **Reusing U-ID across milestones** — credit math gets confused; one U-ID, one milestone unit.
- **`[FIX]` or `[CHORE]` as scope** — non-milestone scope leaves no audit trail.
- **Generic title ("update X", "improve Y")** — fails the "what does it do" test.
- **Body that re-states the title** — adds no information; an empty body is better.
- **Force-pushing over a tagged commit** — breaks the audit trail; never force-push without explicit operator authorization.
- **Squashing iter1+iter2+iter3 into one commit** — loses the iteration history; the audit trail is shorter and less useful.

## Bug-class taxonomy

| Bug class | Pattern that prevents it | Example |
|-----------|--------------------------|---------|
| Silent close-out drift | Pattern 1 + Pattern 2 (SCOPE + U-ID required) | 2026-05-12 history-strip / silent-close-out-drift detector |
| Lost cross-iter credit | Pattern 2 (stable U-ID) | (multiple, before discipline took hold) |
| Reviewing untracked work | Pattern 4 (audit + verification body) | per-file scrutiny gate |
| Sweeping peer's work | (no commit pattern; needs slot-worktree) | This very wiki — peer auto-add commit class |
| Force-push regression | Pattern 7 ([MAIN] + scrutiny gate) | (averted multiple times) |

## When to break the rules

Internal experiment branches (not merged) don't need full discipline — they exist to be thrown away. But the moment a branch heads for `main`, the discipline kicks in: rebase + reword if the format is missing.

For squash merges (rare in PRISM; we prefer rebase + atomic per-unit commits), the squash author IS responsible for the resulting commit subject; auto-generated GitHub squash messages don't satisfy the format.

## See also

- [[regression-prevention-doctrine]] — `## Recent regressions` is parallel audit trail
- [[observability-patterns]] — commit subject = observability surface (Pattern 7 there)
- [[multi-chat-coordination]] — slot attribution + lane discipline
- [[schema-migration-patterns]] — commits that bump schemaVersion
