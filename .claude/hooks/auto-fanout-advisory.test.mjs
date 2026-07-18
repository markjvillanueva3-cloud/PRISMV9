// auto-fanout-advisory.test.mjs -- hook-level: opt-out + advisory formatting.
// (Assessment logic is covered by scripts/lib/fanout-assess.test.mjs.)
// Run: node .claude/hooks/auto-fanout-advisory.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOptOut, buildAdvisory } from "./auto-fanout-advisory.mjs";

test("isOptOut: detects the opt-out tokens, case-insensitive", () => {
  assert.equal(isOptOut("build this [no-fanout] please"), true);
  assert.equal(isOptOut("just a [SKIP-FANOUT]"), true);
  assert.equal(isOptOut("mark [trivial]"), true);
  assert.equal(isOptOut("normal multi-domain task"), false);
  assert.equal(isOptOut(""), false);
  assert.equal(isOptOut(null), false);
});

test("buildAdvisory: shouldFanout=false -> empty string (silent)", () => {
  assert.equal(buildAdvisory({ shouldFanout: false, domains: [], signals: [], domainCount: 1 }), "");
  assert.equal(buildAdvisory(null), "");
  assert.equal(buildAdvisory(undefined), "");
});

test("buildAdvisory: fan-out -> advisory lists domains->slots + ADVISORY-ONLY + opt-out", () => {
  const a = {
    shouldFanout: true,
    domainCount: 3,
    signals: ["multi-domain"],
    domains: [
      { domain: "mill", slot: "foxtrot", matched: ["mill"] },
      { domain: "lathe", slot: "whiskey", matched: ["lathe"] },
      { domain: "wedm", slot: "mike", matched: ["wedm"] },
    ],
  };
  const txt = buildAdvisory(a);
  assert.match(txt, /Fan-out advisory/);
  assert.match(txt, /mill -> foxtrot/);
  assert.match(txt, /lathe -> whiskey/);
  assert.match(txt, /wedm -> mike/);
  assert.match(txt, /3 distinct domains/);
  assert.match(txt, /ADVISORY ONLY/);          // never auto-spawns
  assert.match(txt, /\[no-fanout\]/);          // opt-out documented
  assert.match(txt, /PRISM_AUTO_FANOUT_DISABLE/); // kill switch documented
});

test("buildAdvisory: fleet-wide-scope driver wording", () => {
  const txt = buildAdvisory({ shouldFanout: true, domainCount: 1, signals: ["fleet-wide-scope"], domains: [{ domain: "mill", slot: "foxtrot", matched: ["mill"] }] });
  assert.match(txt, /explicit fleet-wide scope/);
});
