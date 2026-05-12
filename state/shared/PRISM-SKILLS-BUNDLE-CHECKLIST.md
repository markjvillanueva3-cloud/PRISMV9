# PRISM Skills Bundle — Checklist (INTERNAL distribution)

> **Status (2026-05-12):** the bundle (`scripts/export-prism-skills-plugin.mjs` → `dist/prism-manufacturing-skills/`) is currently **empty** — 0 skills are production-grade yet (the 3-scenario protocol shipped in U-SKU02 and nothing has been run through `prism_dev:skill_test`). Work the gap list in the latest `state/shared/SKILL-LIBRARY-AUDIT-*.json` to populate it, then re-export. This checklist is what to verify *each time you rebuild and reuse the bundle internally*.
>
> **Hard rule (`feedback_no_public_h_drive.md`, 2026-05-11):** nothing from the H: drive may be published / distributed publicly — no public GitHub repo, no agentskills.io / skillsmp.com submission, no posting H: paths/code/data externally. The bundle is for the maintainer's own multi-machine / multi-chat reuse **only**. The "share publicly" step from @eng_khairallah1's Phase-4 is **DEFERRED** behind explicit per-artifact clearance (see the bottom section) and is **out of scope** for SKILLS-UTILIZATION-MS0.

---

## A. Build it

1. Run a fresh audit first so the production-grade set is current:
   `node scripts/skill-library-audit.mjs`
2. Export the bundle (domain ∈ `manufacturing` | `cad` | `cam` | `dev-tools` | `all`):
   `node scripts/export-prism-skills-plugin.mjs --domain manufacturing --out dist/prism-manufacturing-skills`
3. Read the printed summary + `dist/prism-manufacturing-skills/MANIFEST.json`:
   - `includedCount` == the audit's `production_grade` count *for that domain* — no `needs_refinement` / `stub_or_orphan` skill leaked in.
   - `excluded[]` is empty, or every entry has a clear reason (`internal-path-leak`, missing source, proprietary-data leak). Excluded skills are **not** in `skills/`.
   - `warnings[]` — if it says the bundle is empty, that's expected today; don't ship an empty bundle as if it's populated.
   - `distribution` reads `INTERNAL ONLY — public release deferred …` (the script sets this; if it ever doesn't, stop).

## B. Verify it (before reusing across your own machines / chats)

- [ ] `.claude-plugin/plugin.json` parses, has a `name`, a `description`, and a `skills` array; every `skills/<name>/SKILL.md` it lists exists on disk. (`scripts/export-prism-skills-plugin.mjs --self-test` runs `validateBundle()`; the CLI also prints "structural validation: OK" after a write.)
- [ ] No `skills/<name>/SKILL.md` body contains a machine-specific absolute path (`H:/prism…`, `H:\PRISM…`, `C:\Users…`) — the export excludes those, but double-check after any manual edit.
- [ ] No `skills/<name>/SKILL.md` references a sibling file by an absolute or repo-relative path that won't exist on the target machine (skills should be self-contained or reference siblings *within* `skills/<name>/`).
- [ ] `scenarios/` fixtures were carried along where they exist (the export copies `<root>/.claude/skills/<name>/scenarios/` → `skills/<name>/scenarios/`).
- [ ] `scenarios/` fixtures contain **no JM-Die / customer data** (`JM DIE`, `ALCOA`, `Holo-Krome`, `Optimas`, …) — the export excludes a skill whose fixtures trip those markers; double-check.
- [ ] `README.md` accurately lists the included skills and their descriptions.
- [ ] `LICENSE` is present and reads "INTERNAL USE ONLY" (it is **not** an open-source license — see the hard rule).
- [ ] The bundle's `version` is pinned to the git SHA it was built from (so you can tell which PRISM state it reflects).

## C. Reuse it (internal)

- Copy `dist/prism-manufacturing-skills/` to a `.claude-plugin`-aware location on the target machine (e.g. `~/.claude/plugins/prism-manufacturing-skills/`).
- Re-export after every `skill-library-audit.mjs` run — the production-grade set changes as the gap list is worked. The bundle is a snapshot, not a live view.
- Do **not** push this directory to any remote, public or otherwise, without going through §DEFERRED below.

---

## DEFERRED — DO NOT EXECUTE: bar for ANY future public release

> **This section is a record of what would be required, not an instruction.** Public release of any part of the PRISM repo (including this bundle) is **prohibited** by the standing hard rule and must not happen without the maintainer's explicit, per-artifact clearance. Even with clearance, ALL of the following must pass first:

1. **`/harness-security-audit`** (the hard gate) — zero exposed secrets, tokens, API keys, credentials, or `.env` content anywhere in the bundle or its history.
2. **Zero H: / C: paths** — no `H:/prism…`, `H:\PRISM…`, `C:\Users…`, or any other machine-specific absolute path in any file (`SKILL.md`, `scenarios/`, `README.md`, `MANIFEST.json`).
3. **Zero proprietary / customer data** — no JM-Die program data, customer names, drawings, NC code, or shop-specific configuration anywhere in the bundle (incl. `scenarios/` fixtures and examples).
4. **An actual LICENSE** — replace the "INTERNAL USE ONLY" notice with a real, deliberate open-source license chosen by the maintainer (MIT / Apache-2.0 / etc.), with copyright held appropriately.
5. **Clean history** — if publishing as a git repo, the published history must contain none of the above (a fresh-history export, not a filtered fork of the H: repo).
6. **Explicit per-artifact clearance** — the maintainer signs off on *this specific bundle, at this specific version,* going public. Blanket clearance does not count.

Until every one of those is satisfied **and** clearance is granted, the only valid distribution target for this bundle is the maintainer's own machines/chats. `scripts/export-prism-skills-plugin.mjs` writes to a local `dist/` directory and has no publish path — keep it that way.

---

*Related: `state/shared/SKILL-LIBRARY-AUDIT-*.json` (the production-grade set), `scripts/skill-library-audit.mjs` (U-SKU05), `scripts/export-prism-skills-plugin.mjs` (U-SKU08), `feedback_no_public_h_drive.md` (the hard rule).*
