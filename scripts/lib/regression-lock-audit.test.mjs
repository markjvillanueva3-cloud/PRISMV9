// scripts/lib/regression-lock-audit.test.mjs
// U-REGRESSION-LOCK-AUDIT (2026-06-09, slot:alpha): the audit must (1) parse real
// `## Recent regressions` entry shapes (observed-in sha, verify-show sha, no-sha),
// (2) classify LOCKED/UNLOCKED/UNVERIFIABLE honestly (UNVERIFIABLE never inflates
// UNLOCKED), (3) compute lockRate over the JUDGEABLE set only. Real reference
// values (R9), injected commitFilesFn -- no git I/O.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseRegressionEntries, classifyLock, auditRegressions, LOCK } from "./regression-lock-audit.mjs";

// Real-shaped fixture (mirrors the live CLAUDE.md `## Recent regressions` format).
const FIXTURE = `
## Recent regressions
- 2026-06-08 | **Fail-OPEN read CLOBBERED the tribal brain (slot:golf)** | observed-in: a3e6d3ca97 | root cause: ... | verify: git -C H:/prism show a3e6d3ca97
- 2026-05-20 | **103-case matrix on UltimateSpeedFeedEngine (slot:kilo)** | observed-in: 1b87f98f2 | fix: see commit | verify: git -C H:/prism show 1b87f98f2
- 2026-05-19 | **re-enable disabled crash-critical tasks (slot:alpha)** | observed-in: 2bc54961b | fix: see commit
- 2026-05-18 | **a doc-only fix with no sha at all** | fix: see commit

## Next section
- 2099-01-01 | **must NOT be parsed -- this is the next section** | observed-in: deadbeef
`;

test("parseRegressionEntries: extracts date/description/sha for each entry, stops at next ## heading", () => {
  const entries = parseRegressionEntries(FIXTURE);
  assert.equal(entries.length, 4, "4 entries in the section, the Next-section bullet excluded");
  assert.equal(entries[0].date, "2026-06-08");
  assert.equal(entries[0].sha, "a3e6d3ca97");
  assert.equal(entries[0].description, "Fail-OPEN read CLOBBERED the tribal brain (slot:golf)");
  assert.equal(entries[1].sha, "1b87f98f2"); // observed-in wins
  assert.equal(entries[2].sha, "2bc54961b"); // observed-in present, no verify-show line
  assert.equal(entries[3].sha, null, "no sha anywhere -> null");
  // the next-section bullet (deadbeef / 2099) must NOT appear
  assert.ok(!entries.some((e) => e.sha === "deadbeef"), "section boundary respected");
});

test("parseRegressionEntries: empty / no-section input -> []", () => {
  assert.deepEqual(parseRegressionEntries(""), []);
  assert.deepEqual(parseRegressionEntries("# Some doc\nno regressions here"), []);
});

test("classifyLock: fix commit WITH a test file -> LOCKED", () => {
  const filesFn = () => ["src/engines/FooEngine.ts", "src/engines/__tests__/FooEngine.test.ts"];
  const r = classifyLock({ sha: "abc1234" }, filesFn);
  assert.equal(r.status, LOCK.LOCKED);
  assert.equal(r.hasTest, true);
});

test("classifyLock: fix commit with SOURCE but NO test -> UNLOCKED (the recurrence-risk punch list)", () => {
  const filesFn = () => ["scripts/lib/thing.mjs", "scripts/thing-cli.mjs"];
  const r = classifyLock({ sha: "abc1234" }, filesFn);
  assert.equal(r.status, LOCK.UNLOCKED);
  assert.equal(r.hasSource, true);
  assert.equal(r.hasTest, false);
});

test("classifyLock: no sha -> UNVERIFIABLE, never UNLOCKED", () => {
  const r = classifyLock({ sha: null }, () => ["src/x.ts"]);
  assert.equal(r.status, LOCK.UNVERIFIABLE);
  assert.equal(r.reason, "no-sha");
});

test("classifyLock: commitFilesFn returns null (bad/stale sha) -> UNVERIFIABLE, no throw", () => {
  assert.equal(classifyLock({ sha: "deadbeef" }, () => null).status, LOCK.UNVERIFIABLE);
  assert.equal(classifyLock({ sha: "deadbeef" }, () => { throw new Error("git fail"); }).status, LOCK.UNVERIFIABLE);
});

test("classifyLock: doc/data-only fix (no source, no test) -> UNVERIFIABLE, never UNLOCKED (no code to test)", () => {
  const r = classifyLock({ sha: "abc1234" }, () => ["CLAUDE.md", "state/shared/notes.json"]);
  assert.equal(r.status, LOCK.UNVERIFIABLE, "a doc-only fix has no recurrence-testable code -- not a scare-number");
  assert.equal(r.reason, "doc-or-data-only-fix");
});

test("classifyLock: __tests__ dir + .spec. variants both count as test", () => {
  assert.equal(classifyLock({ sha: "a" }, () => ["a/__tests__/x.mjs"]).status, LOCK.LOCKED);
  assert.equal(classifyLock({ sha: "a" }, () => ["a/x.ts", "a/x.spec.ts"]).status, LOCK.LOCKED);
});

test("auditRegressions: exact summary integers + lockRate over JUDGEABLE set + UNLOCKED-first order", () => {
  // Map each fixture sha to a deterministic file list:
  const filesBySha = {
    a3e6d3ca97: ["scripts/lib/load-tribal-index.mjs"],                    // source, no test -> UNLOCKED
    "1b87f98f2": ["src/engines/UltimateSpeedFeedEngine.ts", "src/__tests__/usf.test.ts"], // test -> LOCKED
    "2bc54961b": ["scripts/reenable.ps1"],                                 // .ps1 not in SOURCE_RE, not test -> doc/data -> UNVERIFIABLE
  };
  const filesFn = (sha) => filesBySha[sha] || null; // entry 4 (no sha) -> UNVERIFIABLE
  const a = auditRegressions(FIXTURE, filesFn);
  assert.equal(a.total, 4);
  assert.equal(a.locked, 1);       // 1b87f98f2
  assert.equal(a.unlocked, 1);     // a3e6d3ca97
  assert.equal(a.unverifiable, 2); // 2bc54961b (ps1) + the no-sha entry
  assert.ok(Math.abs(a.lockRate - 1 / 2) < 1e-9, "lockRate = locked/(locked+unlocked) = 1/2, NOT 1/4 -- unverifiable excluded");
  assert.equal(a.entries[0].status, LOCK.UNLOCKED, "punch list first");
});

test("auditRegressions: nothing judgeable -> lockRate null (honest, not 0)", () => {
  const a = auditRegressions(FIXTURE, () => null); // every sha unresolved
  assert.equal(a.lockRate, null, "no judgeable entries -> null, not a misleading 0%");
  assert.equal(a.unverifiable, 4);
});
