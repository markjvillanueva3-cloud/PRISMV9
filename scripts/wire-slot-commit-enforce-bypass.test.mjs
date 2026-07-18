// scripts/wire-slot-commit-enforce-bypass.test.mjs
// Tests for the U-SLOT-COMMIT-ENFORCE-LIVE applier: idempotent, anchor-asserted wiring.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { wireOne } from "./wire-slot-commit-enforce-bypass.mjs";

const GOOD = `import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const BOOTSTRAP_MARKER = "[BOOTSTRAP-SLOT-ENFORCE]";

  if (cmd.includes(BOOTSTRAP_MARKER)) allow("bootstrap-marker");

  const sessionId = resolveSessionId(input);`;

describe("wireOne", () => {
  it("happy: both anchors present -> import + routed bypass", () => {
    const r = wireOne(GOOD);
    assert.equal(r.changed, true);
    assert.match(r.text, /import \{ commitBypass \} from "\.\.\/\.\.\/scripts\/lib\/slot-commit-bypass\.mjs"/);
    assert.match(r.text, /const bypass = commitBypass\(cmd, process\.env\)/);
    assert.match(r.text, /if \(bypass\) allow\(bypass\)/);
    // the blanket marker bypass line is gone
    assert.doesNotMatch(r.text, /if \(cmd\.includes\(BOOTSTRAP_MARKER\)\) allow\("bootstrap-marker"\)/);
    // the local const (used by the deny message) is preserved
    assert.match(r.text, /const BOOTSTRAP_MARKER = "\[BOOTSTRAP-SLOT-ENFORCE\]"/);
  });

  it("idempotent: an already-wired file is not changed", () => {
    const once = wireOne(GOOD).text;
    const twice = wireOne(once);
    assert.equal(twice.changed, false);
    assert.equal(twice.reason, "already-wired");
  });

  it("anchor-asserted: missing import anchor -> no change (never partial)", () => {
    const r = wireOne(`  if (cmd.includes(BOOTSTRAP_MARKER)) allow("bootstrap-marker");`);
    assert.equal(r.changed, false);
    assert.equal(r.reason, "import-anchor-missing");
  });

  it("anchor-asserted: missing bypass anchor -> no change", () => {
    const r = wireOne(`import { spawnSync } from "node:child_process";\n// no bypass line`);
    assert.equal(r.changed, false);
    assert.equal(r.reason, "bypass-anchor-missing");
  });

  it("preserves CRLF when the source uses it (no mixed line endings)", () => {
    const crlf = GOOD.replace(/\n/g, "\r\n");
    const r = wireOne(crlf);
    assert.equal(r.changed, true);
    assert.ok(r.text.includes("\r\n"), "keeps CRLF");
    assert.ok(!/[^\r]\n/.test(r.text), "no bare LF introduced");
  });
});
