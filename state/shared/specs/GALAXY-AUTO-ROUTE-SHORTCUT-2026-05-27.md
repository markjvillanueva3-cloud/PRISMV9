# Galaxy Auto-Route Shortcut (U-GALAXY-MS1-G2, 2026-05-27 slot:alpha)

> **Problem solved:** MCP route-takerate is 0.4% (per `route-suggest-stats`). Every prompt classifies through the full router decision tree. For high-confidence galaxy-domain matches, a heuristic shortcut bypasses classification → instant dispatch.

## The shortcut rule

**IF** `slot ∈ SLOT_GALAXY_MAP` **AND** task-text contains a galaxy-canonical keyword **THEN** directly route to the galaxy's canonical dispatcher action, skipping classifier.

## Per-galaxy canonical-keyword + dispatcher table

| Slot | Galaxy | Trigger keywords | Direct route |
|------|--------|------------------|--------------|
| alpha | mill | kienzle, taylor, chip-load, spindle-power, mill-cutting-force | `prism_calc:kienzle_force`, `prism_calc:taylor_life`, `prism_calc:spindle_power` |
| (lathe-soul TBD) | lathe | css-cap, boring-bar-deflection, threading-cycle, parting-stress | `prism_calc:lathe_*` cluster |
| (wedm-soul TBD) | wedm | pulse-on-off, wire-tension, recast-depth, flushing-pressure | `prism_calc:edm_*` cluster |
| charlie | quoting | quote-for, instant-quote, bid, cost-estimate | `prism_quoting:*` cluster |
| hotel | business | payroll, pto-accrue, work-order, customer-credit | `prism_business:*` cluster |
| lima | academy | course-build, learning-path, lesson-quiz | `prism_knowledge:academy_*` |
| echo | post-processor | gcode-emit, master-post, fanuc-dialect, okuma-dialect, siemens-dialect | `cam_*_post_*` cluster |
| (cad-soul TBD) | cad | dfm-check, tolerance-stack, feature-recognize | `prism_cad:*` |
| oscar | speed-feed | speed-feed-for, sfc-calc, auto-speed-feed | `prism_calc:speed_feed_*` |

## Implementation pattern

A new UserPromptSubmit hook `pre-prompt-galaxy-shortcut.mjs` (~80 LOC):
1. Read slot from chat-slots.json
2. Look up galaxy via `SLOT_GALAXY_MAP` (already shared with F1+F2+F3)
3. If found AND galaxy has a trigger-keyword table entry, check prompt text for keyword matches (case-insensitive substring)
4. If matched: inject hint `Route directly to <dispatcher>:<action> — skip classifier` as additionalContext
5. The CHAT decides whether to act on the hint (router still has authority; this is a SHORTCUT hint, not a mandate)

## R12 fail-loud constraint

The shortcut is ADVISORY, not enforcing. The classifier remains the source of truth for ambiguous cases. False positives (e.g. "kienzle" mentioned in a docs-edit task) get filtered when the chat reads the hint context + recognizes it doesn't apply. Per the operator's actual MCP route-takerate 0.4%, even modest shortcut hit-rate (~5-10%) doubles the take-rate.

## Cross-refs

- Parent doctrine: [`DOMAIN-GALAXY-DOCTRINE-2026-05-26.md`](DOMAIN-GALAXY-DOCTRINE-2026-05-26.md)
- Sister hooks: F1 cascade-inject (`pre-edit-galaxy-cascade-inject.mjs`), F2 cross-galaxy-warn (`pre-write-cross-galaxy-warn.mjs`), F3 slot-context-galaxy-line (in `slot-context-bundle-inject.mjs`)
- MS1 envelope: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-G2-PER-GALAXY-AUTO-ROUTE-SHORTCUT`
- Sister gate: `GALAXY-BIRTHRATE-GRADUATION-GATE-2026-05-27.md` (governs which slots get auto-route entries)
- Sister convention: `GALAXY-PR-AUTO-TAG-CONVENTION-2026-05-27.md` (galaxy → label/reviewer mapping uses same SLOT_GALAXY_MAP)
