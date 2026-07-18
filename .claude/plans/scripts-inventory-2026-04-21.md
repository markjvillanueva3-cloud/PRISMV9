# H:\PRISM\scripts\ Inventory & Catalog Refresh — 2026-04-21

## Census (actual)
| Extension | Count |
|---|---:|
| `.py` | **202** |
| `.js` | 76 |
| `.mjs` | 31 |
| `.ts` | 14 |
| `.sh` | 3 |
| **Total** | **326** |

Earlier count "361" also counted `mcp-server/scripts/`.

## Stale README
`H:\PRISM\scripts\README.md` references `C:\Users\wompu\Box\PRISM REBUILD\` — home-PC specific, stale. Documents scripts (START_SESSION.bat, session_manager.py, update_state.py, context_generator.py) that don't exist in the current dir.

## Proposed 7-section structure
1. Session Management — start/end/state
2. Data Extraction — JM Die, PDF, video, tribal
3. Calculators — physics, speed/feed, validators
4. Registry Maintenance — materials, tools, machines, strategies
5. Build / Sync — `update-prism-inventory.mjs`, `sync-*`, audits
6. Post-Processor Tooling — PPG, validation, test harnesses
7. Archived — `_archive/`, `_completed_utilities/`

## Sub-dirs already organized
`_archive/`, `_completed_utilities/`, `agents/`, `__pycache__/`.

## Recommended actions
1. Rewrite README with 7-section structure, H: paths.
2. Write `generate-scripts-catalog.mjs` to auto-index from docstrings.
3. Dead-code scan — scripts with zero inbound refs.
4. Dedup scan — near-duplicate JM Die parsers etc.

Execution in a dedicated session; plan only.
