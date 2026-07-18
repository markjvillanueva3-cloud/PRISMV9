/**
 * Tests for U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH (2026-06-20, slot:alpha) --
 * the interim static low-take suppress added to mcp-route-suggest.mjs.
 *
 * Scope:
 *   - _INTERIM_LOW_TAKE_SUPPRESS set membership (only the audit-flagged offender)
 *   - applyInterimSuppress() drops the base message for the suppressed classifier,
 *     keeps everything else, respects the reversible knob, and is defensive on
 *     non-array / non-string / unclassified input.
 *
 * Grounding: the take-rate audit (scripts/audit-mcp-route-takerate.mjs, 2026-06-20)
 * flagged isVerboseBash `suppress-candidate` -- 417 fires / 0 takes / 51.4% fire-share
 * / credit-path PROVEN LIVE -- which the route-suggest-decay actor will NOT auto-mute
 * (it needs the exact `suppress` verdict + takes>0). Doctrine:
 * feedback_low_take_rate_nudges_are_net_negative.
 *
 * Run: node H:/prism/.claude/hooks/__tests__/mcp-route-suggest-interim-suppress.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  _INTERIM_LOW_TAKE_SUPPRESS,
  applyInterimSuppress,
} from "../mcp-route-suggest.mjs";

// Real classifier-trigger substrings (from mcp-route-suggest.mjs:_classifierFromMessage).
const MSG_BASH     = "\u{1F4A1} verbose Bash -- prefer rtk wrapper";        // isVerboseBash
const MSG_GREP     = "\u{1F4A1} broad Grep -- narrow search first";         // isBroadGrep
const MSG_READ     = "\u{1F4A1} large digest/index -- use offset/limit";    // isLargeRead
const MSG_DOCTRINE = "\u{1F4A1} Doctrine/command surface: verify the bridge"; // doctrineSurface
const MSG_AUDIT    = "\u{1F4A1} Backend audit: chain available for this edit"; // backendAuditChain

describe("_INTERIM_LOW_TAKE_SUPPRESS membership", () => {
  test("contains exactly the audit-flagged offender isVerboseBash", () => {
    assert.ok(_INTERIM_LOW_TAKE_SUPPRESS.has("isVerboseBash"));
    assert.equal(_INTERIM_LOW_TAKE_SUPPRESS.size, 1);
  });

  test("excludes classifiers the audit did NOT flag suppress-candidate", () => {
    // isLargeRead = verify-wiring (cause unproven), isBroadGrep = keep,
    // backendAuditChain/doctrineSurface = verify-wiring -> none interim-suppressed.
    assert.ok(!_INTERIM_LOW_TAKE_SUPPRESS.has("isLargeRead"));
    assert.ok(!_INTERIM_LOW_TAKE_SUPPRESS.has("isBroadGrep"));
    assert.ok(!_INTERIM_LOW_TAKE_SUPPRESS.has("backendAuditChain"));
    assert.ok(!_INTERIM_LOW_TAKE_SUPPRESS.has("doctrineSurface"));
  });
});

describe("applyInterimSuppress", () => {
  test("DROPS the isVerboseBash base message (default knob on)", () => {
    delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    const out = applyInterimSuppress([MSG_BASH]);
    assert.deepEqual(out, []); // the net-negative nudge is gone from output
  });

  test("KEEPS non-suppressed classifiers (grep / read / doctrine / audit)", () => {
    delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    assert.deepEqual(applyInterimSuppress([MSG_GREP]), [MSG_GREP]);
    assert.deepEqual(applyInterimSuppress([MSG_READ]), [MSG_READ]);
    assert.deepEqual(applyInterimSuppress([MSG_DOCTRINE]), [MSG_DOCTRINE]);
    assert.deepEqual(applyInterimSuppress([MSG_AUDIT]), [MSG_AUDIT]);
  });

  test("mixed batch: only isVerboseBash dropped, order of the rest preserved", () => {
    delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    const out = applyInterimSuppress([MSG_GREP, MSG_BASH, MSG_DOCTRINE, MSG_AUDIT]);
    assert.deepEqual(out, [MSG_GREP, MSG_DOCTRINE, MSG_AUDIT]);
  });

  test("knob PRISM_MCP_ROUTE_INTERIM_SUPPRESS=0 restores the nudge (reversible)", () => {
    process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS = "0";
    try {
      assert.deepEqual(applyInterimSuppress([MSG_BASH]), [MSG_BASH]);
    } finally {
      delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    }
  });

  test("knob set to anything except '0' still suppresses (case-strict)", () => {
    process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS = "false"; // not '0' -> still suppress
    try {
      assert.deepEqual(applyInterimSuppress([MSG_BASH]), []);
    } finally {
      delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    }
  });

  test("a message with NO recognized classifier passes through untouched", () => {
    delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    const unrelated = "\u{1F4A1} some unrelated hook message";
    assert.deepEqual(applyInterimSuppress([unrelated]), [unrelated]);
  });

  test("non-string entries pass through (defensive)", () => {
    delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    const out = applyInterimSuppress([MSG_BASH, 42, null, MSG_GREP]);
    assert.deepEqual(out, [42, null, MSG_GREP]); // only the string isVerboseBash dropped
  });

  test("non-array input returns unchanged (defensive)", () => {
    assert.equal(applyInterimSuppress(null), null);
    assert.equal(applyInterimSuppress("not-an-array"), "not-an-array");
  });

  test("all-isVerboseBash batch collapses to empty (the all-noise turn)", () => {
    delete process.env.PRISM_MCP_ROUTE_INTERIM_SUPPRESS;
    assert.deepEqual(applyInterimSuppress([MSG_BASH, MSG_BASH]), []);
  });
});
