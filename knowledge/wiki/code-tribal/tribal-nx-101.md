---
name: tribal-nx-101
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["siemens-nx", "holder-library", "naming-convention", "organization", "database"]
confidence: 83
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-101.md
promoted_at: 2026-06-09T22:31:16.487Z
---

# Holder Library Organization with Naming Conventions

Organize the NX holder_database.dat file using a consistent naming convention: [Manufacturer]_[Interface]_[Type]_[Size] (e.g., BIG_BT40_ER32_100L). Group holders by interface type (BT40, HSK-A63, CAT50) for fast filtering in the Tool dialog. Include gauge length and maximum RPM in the holder description field. A well-organized holder library prevents programmers from selecting incompatible holders — the most common cause of tool assembly collisions that pass simulation but crash on the real machine.

**Category:** tooling
**Confidence:** 83
**Source:** web:siemens-nx-docs
**Operations:** setup

## Related
- [[gibbscam-cam-tips-gc-163|GibbsCAM operation grouping with naming conventions supports rapid program auditing]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
