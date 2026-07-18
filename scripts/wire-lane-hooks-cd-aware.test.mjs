// scripts/wire-lane-hooks-cd-aware.test.mjs
// Tests for U-LANE-CD-AWARE applier: idempotent, anchor-asserted wiring.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wireOne } from "./wire-lane-hooks-cd-aware.mjs";

const GOOD = `import { exit } from "node:process";
// other code
  const cwd =
    payload?.cwd ||
    payload?.tool_input?.cwd ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.cwd();
  const x = 1;`;

describe("wireOne", () => {
  it("happy: both anchors present -> wires import + cd-aware cwd", () => {
    const r = wireOne(GOOD);
    assert.equal(r.changed, true);
    assert.match(r.text, /import \{ effectiveCwdFromCmd \} from "\.\.\/\.\.\/scripts\/lib\/effective-cwd-from-cmd\.mjs"/);
    assert.match(r.text, /const payloadCwd =/);
    assert.match(r.text, /const cwd = effectiveCwdFromCmd\(cmd, payloadCwd\)/);
  });

  it("idempotent: an already-wired file is not changed", () => {
    const once = wireOne(GOOD).text;
    const twice = wireOne(once);
    assert.equal(twice.changed, false);
    assert.equal(twice.reason, "already-wired");
  });

  it("anchor-asserted: missing import anchor -> no change (never partial)", () => {
    const r = wireOne("  const cwd =\n    payload?.cwd ||\n    payload?.tool_input?.cwd ||\n    process.env.CLAUDE_PROJECT_DIR ||\n    process.cwd();");
    assert.equal(r.changed, false);
    assert.equal(r.reason, "import-anchor-missing");
  });

  it("anchor-asserted: missing cwd anchor -> no change", () => {
    const r = wireOne(`import { exit } from "node:process";\n// no cwd block`);
    assert.equal(r.changed, false);
    assert.equal(r.reason, "cwd-anchor-missing");
  });
});
