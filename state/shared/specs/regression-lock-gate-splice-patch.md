# Splice patch: wire regression-lock-gate as a Stop hook (FOR OWNER / main-tree)

> **Owner-gated.** `.claude/hooks/*.mjs` is cross-worktree-firewall-blocked for the golf slot. Golf built + tested + live-validated the enforcement keystone `scripts/lib/regression-lock-gate.mjs` (12/12 tests; parses 18 live CLAUDE.md regression entries; zero false-positive when nothing added). This is the thin Stop-hook wrapper to apply.

## What it does (HRH-NEW-2 from SKILLS-HOOKS-AUDIT-2026-06-11)
Closes the Opik-L3 trace->test loop: `scripts/regression-lock-audit.mjs` AUDITS but nothing ENFORCES. This Stop hook detects when a session added a `## Recent regressions` row to CLAUDE.md WITHOUT a companion test in the same change-set -> advisory punch list, promotable to a hard block via `PRISM_REGRESSION_LOCK_ENFORCE=1`.

## New hook: `.claude/hooks/regression-lock-gate.mjs` (Stop matcher)
```js
#!/usr/bin/env node
// Stop hook: enforce the regression-lock property on session-added regressions.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { findNewlyAddedRegressions, evaluateRegressionLock } from "../../scripts/lib/regression-lock-gate.mjs";

const REPO = "H:/prism";
const sh = (args) => { try { return execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", timeout: 8000, stdio: ["ignore","pipe","ignore"] }); } catch { return ""; } };
try {
  const beforeMd = sh(["show", "HEAD:CLAUDE.md"]);
  let afterMd = ""; try { afterMd = readFileSync(`${REPO}/CLAUDE.md`, "utf8"); } catch {}
  if (!afterMd) process.exit(0); // fail-soft
  const changedFiles = sh(["diff", "--name-only", "HEAD"]).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  const newlyAdded = findNewlyAddedRegressions(beforeMd, afterMd);
  const enforce = process.env.PRISM_REGRESSION_LOCK_ENFORCE === "1";
  const v = evaluateRegressionLock({ newlyAdded, changedFiles, enforce });
  if (!v.shouldWarn) process.exit(0);
  if (v.shouldBlock) { console.log(JSON.stringify({ decision: "block", reason: v.message })); process.exit(0); }
  console.log(JSON.stringify({ systemMessage: v.message })); // advisory
} catch { process.exit(0); } // never block a Stop on the gate's own error
```

## settings.json wiring (Stop array, advisory placement -- after scrutinize/handoff gates)
```json
{ "type": "command", "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/regression-lock-gate.mjs", "timeout": 10000 }
```

## Safety / knobs
- Default **advisory** (systemMessage punch list). `PRISM_REGRESSION_LOCK_ENFORCE=1` promotes to a hard `decision:block`.
- Fail-soft everywhere: missing CLAUDE.md / git error -> exit 0 (never blocks a Stop on the gate's own failure -- R12 keep-running).
- Conservative: any test/spec/__tests__ file in the session change-set locks the added rows (matches the audit's loose "fix shipped a test" semantics; per-commit attribution is unavailable pre-commit).
- Reuses `parseRegressionEntries` from `regression-lock-audit.mjs` (R8 -- no duplicate regex).
- Keystone tests: `scripts/lib/regression-lock-gate.test.mjs` (12/12).
