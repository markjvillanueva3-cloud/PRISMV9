# RALPH VALIDATION: W1-W5 Wiring Roadmap
## 4-Phase: SCRUTINIZE → IMPROVE → VALIDATE → ASSESS
## Date: 2026-02-10 | Manual execution (server needs restart for computationCache fix)

---

# PHASE 1: SCRUTINIZE — Find Every Weakness

## S1. Ordering & Dependencies

### ✅ CORRECT: W1 before W2
W1.1 (file-based GSD) must exist before W1.2 (gsd_sync writes to those files).
W1.3 (doc anti-regression) should be in place before W2-W5 touch any skills.

### ⚠️ ISSUE: W2.3 (register phase0_hooks) needs careful sequencing
The 39 hooks in phase0_hooks.py were written for an OLDER architecture.
They reference patterns like `prism_mcp_server.py` which no longer exists.
Blindly registering may create conflicts with the 112 hooks already live.
**Risk:** Hook name collisions, stale tool references, duplicate safety gates.
**Mitigation:** Audit phase0_hooks.py FULLY before registration. Map each hook
to current architecture. Only register compatible ones.

### ⚠️ ISSUE: W2.4 (register all 154 scripts) may register broken scripts
Some scripts in scripts/_archive/ are superseded. Some reference old paths.
**Risk:** autoScriptRecommend suggests broken/outdated scripts.
**Mitigation:** Register only from scripts/core/, scripts/validation/, 
scripts/batch/, scripts/state/. Exclude _archive/. Verify each script
has valid Python syntax before registration.

### ✅ CORRECT: W3 depends on W2 session wire points
resume_detector and resume_validator (W2.2) should be wired before
full D5 session_lifecycle (W3.2) to avoid duplicate resume logic.

### ✅ CORRECT: W4 independent of W3, can parallel
MCP wrappers are self-contained. No dependency on D5 modules.

### ⚠️ ISSUE: W5 (knowledge recovery) underspecified
"Mine transcripts" is vague. Which transcripts? How many? What format?
Need concrete plan: which specific skills lost content, what to recover.
**Mitigation:** W5.1 should start with the 3 skills rewritten this session
(prism-session-buffer, prism-context-pressure, prism-task-continuity).
Check transcripts from 2026-02-08 through 2026-02-10.

## S2. Completeness Gaps

### ❌ MISSING: No rollback plan
If W1.1 (file-based GSD) breaks the gsdDispatcher, there's no rollback.
Current hardcoded strings would be gone.
**Fix:** Keep hardcoded strings as FALLBACK. If file read fails, fall back
to hardcoded. This is standard defensive coding for safety-critical systems.

### ❌ MISSING: No testing protocol
W1-W5 changes core infrastructure. No mention of verification steps.
**Fix:** After each W phase, run:
1. npm run build (clean compile)
2. Server startup test (no errors)
3. Smoke test: call prism_gsd action=quick (verify content)
4. Smoke test: call prism_gsd action=get section=buffer (verify sections)
5. For W2+: call prism_session action=session_end (verify new wiring)
6. Anti-regression: count dispatchers, actions, hooks — must not decrease

### ❌ MISSING: gsd_sync.py targets wrong files
gsd_sync.py (line 37-42) scans:
- DOCS_DIR / "GSD_CORE_v4.md"
- DOCS_DIR / "GSD_CORE.md"  
- Path("/mnt/project/GSD_CORE_PROJECT_FILE.md")
These paths don't exist in current architecture. The script also scans
prism_mcp_server.py (monolith) and recovery_mcp.py — both old.
**Fix:** Update gsd_sync.py to:
- Scan data/docs/gsd/ directory (W1.1 target)
- Scan src/tools/dispatchers/*.ts for actual dispatcher registrations
- Scan src/engines/*.ts for engine listing
- Output to data/docs/gsd/GSD_QUICK.md and section files

### ❌ MISSING: 15 MCP wrappers may be stale
The *_mcp.py files were written for an older Python-based MCP architecture.
Current PRISM uses TypeScript dispatchers with Python called via execSync.
These wrappers may define duplicate tool names or incompatible schemas.
**Fix:** Audit each wrapper BEFORE registration:
1. Check for tool name conflicts with existing 27 dispatchers
2. Verify they use current paths (C:\PRISM\ not /mnt/project/)
3. Verify they call current Python modules (not deleted/renamed ones)

### ⚠️ GAP: No mention of computationCache fix
This session discovered computationCache import was missing from autoHookWrapper.
This blocks ALL ralph_loop validation. Fix was applied but needs server restart.
**Fix:** Add to W1 as prerequisite: restart Claude app after cache fix build.

## S3. Safety Analysis

### ✅ S(x) NOT AFFECTED
W1-W5 changes documentation, wiring, and session management.
No changes to calculation engines, safety validators, or physics models.
Safety threshold S(x)≥0.70 remains enforced by existing hooks.

### ⚠️ ANTI-REGRESSION RISK
W2.3 (registering 39 new hooks) could theoretically override existing
safety-critical hooks if there are name collisions.
**Mitigation:** Deduplicate hook names BEFORE registration. Any hook in
phase0_hooks.py that shares a name with an existing hook gets SKIPPED
(not overwritten).

### ✅ NO PLACEHOLDER RISK
All W1-W5 work involves wiring EXISTING code, not writing new placeholders.

## S4. Architecture Assessment

### ✅ STRONG: File-based GSD is correct pattern
Reading from disk at runtime = always fresh content. This matches how
skills are already loaded (from SKILL.md files on disk).

### ✅ STRONG: Doc anti-regression fills real gap
This is the same pattern as code anti-regression (new≥old) applied to docs.
Consistent philosophy.

### ⚠️ CONCERN: gsd_sync.py adds build-time dependency on Python
If Python is unavailable or gsd_sync.py has a bug, builds could fail.
**Mitigation:** gsd_sync.py should be non-blocking. Log warning on failure,
don't block the build. Make it try/catch wrapped in cadenceExecutor.

### ✅ STRONG: MCP wrapper registration via ScriptExecutor
This is the existing pattern. No architecture change needed.

---

# PHASE 2: IMPROVE — Apply Scrutiny Findings

## Improved W1.1: File-Based GSD with Fallback

```typescript
// gsdDispatcher.ts — improved pattern
function readGsdFile(filename: string, fallback: string): string {
  const filepath = path.join(GSD_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf-8');
    }
  } catch (err) {
    log.warn(`[GSD] Failed to read ${filename}, using fallback`);
  }
  return fallback; // keep hardcoded as safety net
}
```

## Improved W1.2: gsd_sync.py Must Be Updated First

Before wiring, update gsd_sync.py to:
1. Scan src/tools/dispatchers/*.ts (not old monolith paths)
2. Count actions per dispatcher from registration calls
3. Output to data/docs/gsd/ directory
4. Non-blocking (try/catch, log on failure)

## Improved W2.3: Hook Registration with Dedup Guard

```
For each hook in phase0_hooks.py:
  1. Check if hook name exists in current 112 hooks
  2. If exists: SKIP with log message
  3. If new: validate hook references current tool names
  4. If references stale tools: SKIP with warning
  5. Only register hooks that pass both checks
```

## Improved W2.4: Selective Script Registration

Register scripts from these directories ONLY:
- scripts/core/ (73 files — the D1-D9 modules)
- scripts/validation/ (7 files — validators)
- scripts/state/ (4 files — state management)
- scripts/batch/ (7 files — batch processors)
- scripts/extraction/ (4 files — extraction tools)
DO NOT register from:
- scripts/_archive/ (superseded)
- scripts/testing/ (test utilities, not production)

## Improved W5: Concrete Recovery Plan

Specific skills to recover content for:
1. prism-session-buffer (386→70 lines, lost task-specific checkpoint rules)
2. prism-context-pressure (341→102 lines, lost response length guidance)
3. prism-task-continuity (added section but may have lost other content)

Recovery sources:
- Transcript from 2026-02-10 (this session)
- Transcript from 2026-02-08 (previous telemetry session)
- Transcript from 2026-02-09 (buffer zone fix session)

## Added: Verification Protocol After Each Phase

After W1:
- [ ] Build clean
- [ ] Server starts without errors
- [ ] prism_gsd action=quick returns content from disk file
- [ ] prism_gsd action=get section=buffer returns file content
- [ ] Editing data/docs/gsd/GSD_QUICK.md changes next prism_gsd output
- [ ] gsd_sync.py runs without error when called manually

After W2:
- [ ] Build clean
- [ ] prism_session action=session_end calls next_session_prep.py
- [ ] prism_dev action=session_boot calls resume_detector.py
- [ ] Hook count ≥ 112 (never decreased)
- [ ] Script count in registry ≥ 27 (never decreased)

After W3:
- [ ] All 6 D5 module actions callable
- [ ] Session lifecycle roundtrip works (start→work→end→resume)

After W4:
- [ ] MCP wrapper tools respond to calls
- [ ] No tool name collisions

After W5:
- [ ] Recovered skills have >= original line counts
- [ ] Changelogs present in all modified skills
- [ ] KNOWLEDGE_CHANGELOG.md exists and has entries

---

# PHASE 3: VALIDATE — Check Against PRISM Laws

| Law | W1 | W2 | W3 | W4 | W5 | Notes |
|-----|----|----|----|----|-----|-------|
| S(x)≥0.70 | ✅ N/A | ⚠️ Hook dedup needed | ✅ N/A | ✅ N/A | ✅ N/A | No calc changes |
| No placeholders | ✅ All wiring | ✅ All wiring | ✅ All wiring | ✅ All wiring | ✅ Recovery | No new stubs |
| New≥Old | ✅ Doc AR added | ✅ Hook ≥112 | ✅ Actions ≥323 | ✅ Scripts ≥27 | ✅ Skills ≥ original | Anti-regression enforced |
| MCP First | ✅ File-based GSD | ✅ Via dispatchers | ✅ Via dispatchers | ✅ Via ScriptExecutor | ✅ Via skills | All MCP-native |
| No duplicates | ✅ | ⚠️ Hook dedup needed | ✅ | ⚠️ Tool name check | ✅ | Dedup before register |
| 100% utilization | 🎯 PURPOSE | 🎯 PURPOSE | 🎯 PURPOSE | 🎯 PURPOSE | 🎯 PURPOSE | This IS the utilization fix |

---

# PHASE 4: ASSESS — Final Verdict

## Overall Score: APPROVED WITH CONDITIONS

### Strengths:
1. Addresses the root cause (knowledge loss, unwired modules)
2. Correct priority ordering (protect first, wire second, recover last)
3. Leverages existing code (gsd_sync.py, phase0_hooks.py, MCP wrappers)
4. Anti-regression on docs is a genuine innovation for this project
5. File-based GSD matches existing skill loading pattern

### Conditions (MUST address before execution):
1. **gsd_sync.py MUST be updated** before wiring — current version targets old paths
2. **phase0_hooks.py MUST be audited** — dedup against 112 existing hooks first
3. **MCP wrappers MUST be audited** — check for stale paths and tool name conflicts
4. **Fallback pattern MANDATORY** in gsdDispatcher — file read failure → hardcoded
5. **Server restart REQUIRED** before Ralph validation works (computationCache fix)
6. **Selective script registration** — exclude _archive/ and testing/ directories

### Risk Assessment:
- **Low risk:** W1 (file-based GSD, doc anti-regression) — defensive patterns
- **Medium risk:** W2.3 (hook registration) — needs careful deduplication
- **Medium risk:** W4.1 (MCP wrappers) — needs staleness audit
- **Low risk:** W3, W5 — straightforward wiring and recovery

### Recommended Execution:
```
Session N:   W1.1 + W1.3 + W1.4 (file-based GSD + doc AR + changelogs)
             → Build → Restart → Verify Ralph works
             → W1.2 (wire gsd_sync after updating it for new paths)

Session N+1: W2.1 + W2.2 (session prep + resume wiring)
             → W2.4 (selective script registration)
             → W2.3 (hook audit + registration)

Session N+2: W3 (D5 core modules)

Session N+3: W4 (MCP wrappers after audit) + W5 (knowledge recovery)
```

### Estimated Total: 4 sessions, ~4 hours
### ROI: Prevents all future knowledge loss. Wires 50+ modules. Every future session benefits.
