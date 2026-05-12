# prism-manufacturing-skills

> **INTERNAL bundle — not for public distribution.** PRISM's production-grade manufacturing skills, packaged for the maintainer's own multi-machine / multi-chat reuse. Public release is DEFERRED (see `state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md`). Generated 2026-05-12T15:27:59.878Z from PRISM @ git b186b1dc8 · audit state\shared\SKILL-LIBRARY-AUDIT-2026-05-12.json (2026-05-12T14:09:26.732Z).

## Contents — 0 skill(s)

*(empty — 0 production-grade skills in domain "manufacturing" at this audit. A skill reaches "production-grade" only after passing the linter + the 3-Question gate + all three scenario tests (`prism_dev:skill_test`). Work the gap list in `state\shared\SKILL-LIBRARY-AUDIT-2026-05-12.json` to populate this bundle, then re-run `scripts/export-prism-skills-plugin.mjs`.)*

## Install (internal)

Copy this directory under a `.claude-plugin`-aware location (e.g. `~/.claude/plugins/prism-manufacturing-skills/`) on the target machine. Each `skills/<name>/SKILL.md` is the skill; `scenarios/` carries the U-SKU02 fixtures. Before reusing, walk `state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md` (no broken sibling links, no machine-specific absolute paths, README accurate).

*Rebuild: `node scripts/export-prism-skills-plugin.mjs --domain manufacturing` after each `scripts/skill-library-audit.mjs` run. Version is pinned to the git SHA.*
