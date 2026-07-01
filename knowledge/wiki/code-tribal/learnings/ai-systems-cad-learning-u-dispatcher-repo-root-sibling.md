# AI-SYSTEMS-CAD-LEARNING/U-DISPATCHER-REPO-ROOT-SIBLING — [MAIN-FORCE] [AI-SYSTEMS-CAD-LEARNING]/U-DISPATCHER-REPO-ROOT-SIBLING (slot:india): close the bug-class -- SchemaCoverageAuditEngine module-scope repo-root over-shot in the bundle

**Commit:** `d6b917f831eb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T10:20:56-05:00
**Tags:** ai-systems-cad-learning, u-dispatcher-repo-root-sibling, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-CAD-LEARNING]/U-DISPATCHER-REPO-ROOT-SIBLING (slot:india): close the bug-class -- SchemaCoverageAuditEngine module-scope repo-root over-shot in the bundle

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-CAD-LEARNING]/U-DISPATCHER-REPO-ROOT-SIBLING (slot:india): close the bug-class -- SchemaCoverageAuditEngine module-scope repo-root over-shot in the bundle

3-of-3 scrutiny on c741b6074d (the 7-dispatcher-site repo-root fix) flagged this SIBLING of the same bug-class: SchemaCoverageAuditEngine.ts:26 computed PROJECT_ROOT = resolve(dirname(import.meta.url), '..','..','..') at MODULE scope, intending H:/prism (3 climbs from src/engines). Under the esbuild dist/index.js bundle runtime, import.meta.url is dist/index.js, so the 3-climb over-shoots to the DRIVE ROOT -> SCHEMAS_DIR = H:/mcp-server/src/schemas and OUT_FILE = H:/state/... (both wrong); prism_dev:schema_coverage_audit would scan nothing + write to the wrong path. Same root cause as U-DISPATCHER-REPO-ROOT-FIX.

Fix: PROJECT_ROOT = resolveRepoRoot() (the depth-independent .git+mcp-server resolver shipped in c741b6074d), removing the now-dead fileURLToPath import + __filename/ENGINE_DIR. VALIDATED: tsx module-load OK (exports SchemaCoverageAuditEngine + singleton), resolveRepoRoot() -> H:/PRISM, SCHEMAS_DIR + OUT dir both exist; build:fast clean. Closes the repo-root bug-class (R16 fit-the-whole). Activates on next :3100 restart with c741b6074d.
```

## Files touched (2)
- mcp-server/src/engines/SchemaCoverageAuditEngine.ts | 11 ++++++-----
- 1 file changed, 6 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- wrong); prism_dev:schema_coverage_audit would scan nothing + write to the wrong path. Same root cause as U-DISPATCHER-REPO-ROOT-FIX.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d6b917f831eb`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-CAD-LEARNING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._