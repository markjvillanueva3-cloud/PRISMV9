// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA05 — tests for zebra-bd-priority.mjs
//
// Pure-function unit tests. Hermetic (no I/O, no PS spawn).
// Covers: BACKEND_DEV_PREFIXES freeze + canonical content,
//   isBackendDevUnit (positive + negative + edge),
//   sortBackendDevFirst (BD-first + stable + non-array),
//   buildCheckinPayload (happy path + slot validation + opts.extraHint),
//   buildCompactThenCheckinPayload (delegation + slot propagation).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BACKEND_DEV_PREFIXES,
  isBackendDevUnit,
  sortBackendDevFirst,
  buildCheckinPayload,
  buildCompactThenCheckinPayload,
  buildAwarenessHint,
} from "../../scripts/lib/zebra-bd-priority.mjs";

describe("BACKEND_DEV_PREFIXES", () => {
  it("is frozen (cannot be mutated)", () => {
    assert.equal(Object.isFrozen(BACKEND_DEV_PREFIXES), true);
    assert.throws(() => {
      BACKEND_DEV_PREFIXES.push("U-EVIL");
    });
  });
  it("matches the canonical priority table", () => {
    assert.deepEqual([...BACKEND_DEV_PREFIXES], [
      "U-WIRE",
      "U-BRIDGE",
      "U-HOOK",
      "U-INFRA",
      "U-DEVTOOL",
      "U-CK",
    ]);
  });
});

describe("isBackendDevUnit", () => {
  it("returns true for canonical U-WIRE prefix", () => {
    assert.equal(isBackendDevUnit("U-WIRE-FOO"), true);
  });
  it("returns true for canonical U-BRIDGE prefix", () => {
    assert.equal(isBackendDevUnit("U-BRIDGE-BAR"), true);
  });
  it("returns true for canonical U-HOOK prefix", () => {
    assert.equal(isBackendDevUnit("U-HOOK-BAZ"), true);
  });
  it("returns true for canonical U-INFRA prefix", () => {
    assert.equal(isBackendDevUnit("U-INFRA-XYZ"), true);
  });
  it("returns true for canonical U-DEVTOOL prefix", () => {
    assert.equal(isBackendDevUnit("U-DEVTOOL-ABC"), true);
  });
  it("returns true for canonical U-CK prefix", () => {
    assert.equal(isBackendDevUnit("U-CK01"), true);
  });
  it("returns false for non-backend unit (U-CAM*)", () => {
    assert.equal(isBackendDevUnit("U-CAM01"), false);
  });
  it("returns false for empty string", () => {
    assert.equal(isBackendDevUnit(""), false);
  });
  it("returns false for null/undefined/non-string", () => {
    assert.equal(isBackendDevUnit(null), false);
    assert.equal(isBackendDevUnit(undefined), false);
    assert.equal(isBackendDevUnit(42), false);
    assert.equal(isBackendDevUnit({}), false);
  });
  it("trims whitespace before testing the prefix", () => {
    assert.equal(isBackendDevUnit("  U-WIRE-FOO  "), true);
    // whitespace-only is empty after trim → false
    assert.equal(isBackendDevUnit("   "), false);
  });
});

describe("sortBackendDevFirst", () => {
  it("returns empty array on non-array input", () => {
    assert.deepEqual(sortBackendDevFirst(null), []);
    assert.deepEqual(sortBackendDevFirst(undefined), []);
    assert.deepEqual(sortBackendDevFirst("U-WIRE-FOO"), []);
    assert.deepEqual(sortBackendDevFirst(42), []);
  });
  it("returns empty array on empty input", () => {
    assert.deepEqual(sortBackendDevFirst([]), []);
  });
  it("filters out empty/non-string entries", () => {
    assert.deepEqual(
      sortBackendDevFirst(["U-WIRE-A", "", null, undefined, 42, "U-CAM-B"]),
      ["U-WIRE-A", "U-CAM-B"],
    );
  });
  it("places backend-dev units before others", () => {
    const out = sortBackendDevFirst([
      "U-CAM01",
      "U-WIRE-A",
      "U-DOC02",
      "U-BRIDGE-B",
    ]);
    assert.deepEqual(out, ["U-WIRE-A", "U-BRIDGE-B", "U-CAM01", "U-DOC02"]);
  });
  it("is stable within each group", () => {
    const out = sortBackendDevFirst([
      "U-WIRE-A",
      "U-WIRE-B",
      "U-WIRE-C",
      "U-CAM-X",
      "U-CAM-Y",
    ]);
    assert.deepEqual(out, ["U-WIRE-A", "U-WIRE-B", "U-WIRE-C", "U-CAM-X", "U-CAM-Y"]);
  });
  it("handles all-backend input as identity (stable)", () => {
    const ids = ["U-WIRE-A", "U-BRIDGE-B", "U-HOOK-C", "U-CK01"];
    assert.deepEqual(sortBackendDevFirst(ids), ids);
  });
});

describe("buildCheckinPayload", () => {
  it("rejects missing slot", () => {
    const out = buildCheckinPayload(null);
    assert.equal(out.ok, false);
    assert.equal(out.error, "missing-slot");
  });
  it("rejects non-string slot", () => {
    const out = buildCheckinPayload(42);
    assert.equal(out.ok, false);
    assert.equal(out.error, "missing-slot");
  });
  it("rejects empty/whitespace-only slot", () => {
    assert.equal(buildCheckinPayload("").error, "missing-slot"); // empty -> missing
    assert.equal(buildCheckinPayload("   ").error, "empty-slot"); // trims to empty
  });
  it("rejects slot with internal whitespace / control chars (trailing ws is trimmed)", () => {
    // Internal whitespace is structurally illegal — would break a SendKeys line.
    assert.equal(buildCheckinPayload("brav o").error, "slot-has-whitespace-or-control");
    assert.equal(buildCheckinPayload("brav\no").error, "slot-has-whitespace-or-control");
    assert.equal(buildCheckinPayload("brav\to").error, "slot-has-whitespace-or-control");
    // Control chars anywhere (incl. terminal) are illegal — trim() does NOT strip \x01-\x1f.
    assert.equal(buildCheckinPayload("bravo\x01").error, "slot-has-whitespace-or-control");
    // Trailing standard whitespace is trimmed and accepted — this is intentional lenient input.
    assert.equal(buildCheckinPayload("bravo\n").ok, true);
    assert.equal(buildCheckinPayload("bravo\t").ok, true);
  });
  it("emits canonical text on happy path", () => {
    const out = buildCheckinPayload("bravo");
    assert.equal(out.ok, true);
    assert.equal(
      out.text,
      "/checkin-bravo priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|U-INFRA*|U-DEVTOOL*|U-CK*|backend-dev FIRST",
    );
  });
  it("appends extraHint when non-empty", () => {
    const out = buildCheckinPayload("bravo", { extraHint: "iter 3" });
    assert.equal(out.ok, true);
    assert.ok(out.text.endsWith(" iter 3"), `unexpected: ${out.text}`);
  });
  it("ignores blank/non-string extraHint", () => {
    const a = buildCheckinPayload("bravo", { extraHint: "" });
    const b = buildCheckinPayload("bravo", { extraHint: 42 });
    const c = buildCheckinPayload("bravo");
    assert.equal(a.text, c.text);
    assert.equal(b.text, c.text);
  });
});

describe("buildCompactThenCheckinPayload", () => {
  it("returns the underlying slot error verbatim", () => {
    const out = buildCompactThenCheckinPayload("");
    assert.equal(out.ok, false);
    assert.equal(out.error, "missing-slot");
  });
  it("returns 2 lines on happy path: /compact then /checkin-<slot> ...", () => {
    const out = buildCompactThenCheckinPayload("hotel");
    assert.equal(out.ok, true);
    assert.equal(out.lines.length, 2);
    assert.equal(out.lines[0], "/compact");
    assert.ok(out.lines[1].startsWith("/checkin-hotel "));
  });
  it("propagates opts.extraHint into the checkin line", () => {
    const out = buildCompactThenCheckinPayload("hotel", { extraHint: "post-compact" });
    assert.equal(out.ok, true);
    assert.ok(out.lines[1].endsWith(" post-compact"), `unexpected: ${out.lines[1]}`);
  });
});

// ZEBRA-ORCHESTRATOR-MS3 / U-ZPSN01 — PSN-awareness hint synthesis tests.
describe("buildAwarenessHint", () => {
  it("returns empty string on null/undefined/non-object", () => {
    assert.equal(buildAwarenessHint(null), "");
    assert.equal(buildAwarenessHint(undefined), "");
    assert.equal(buildAwarenessHint("not-a-fingerprint"), "");
    assert.equal(buildAwarenessHint(42), "");
  });
  it("returns empty string on empty fingerprint", () => {
    assert.equal(buildAwarenessHint({}), "");
  });
  it("emits domain only when fp.domains has entries", () => {
    const out = buildAwarenessHint({ domains: ["mill"] });
    assert.equal(out, "[psn:domain=mill]");
  });
  it("emits role only when hermesRole present", () => {
    const out = buildAwarenessHint({ hermesRole: "mill-specialist" });
    assert.equal(out, "[psn:role=mill-specialist]");
  });
  it("emits queue only when queueLength is a finite number", () => {
    const out = buildAwarenessHint({ queueLength: 5 });
    assert.equal(out, "[psn:queue=5]");
  });
  it("clamps queue to non-negative integer", () => {
    assert.equal(buildAwarenessHint({ queueLength: -3 }), "[psn:queue=0]");
    assert.equal(buildAwarenessHint({ queueLength: 4.7 }), "[psn:queue=4]");
  });
  it("emits tribal only when tribalDomainScores has a positive entry", () => {
    const out = buildAwarenessHint({
      tribalDomainScores: { mill: 8, lathe: 3 },
    });
    assert.equal(out, "[psn:tribal=mill]");
  });
  it("picks the highest-scoring tribal entry", () => {
    const out = buildAwarenessHint({
      tribalDomainScores: { lathe: 2, mill: 12, wedm: 5 },
    });
    assert.equal(out, "[psn:tribal=mill]");
  });
  it("emits a full hint with all 4 fields", () => {
    const out = buildAwarenessHint({
      domains: ["mill", "milling"],
      hermesRole: "mill-specialist",
      queueLength: 3,
      tribalDomainScores: { mill: 9, wedm: 2 },
    });
    assert.equal(out, "[psn:domain=mill,role=mill-specialist,queue=3,tribal=mill]");
  });
  it("sanitises hostile chars from domain/role/tribal (no slash/space/control)", () => {
    const out = buildAwarenessHint({
      domains: ["mi ll;/--rm-rf"],
      hermesRole: "spec\nialist`X`",
      tribalDomainScores: { "abc xyz!": 5 },
    });
    // Sanitiser strips everything except [a-z0-9+-_]; verify NO whitespace,
    // semicolons, backticks, or slashes leak into the emitted hint.
    assert.match(out, /^\[psn:[a-z0-9+\-_=,]+\]$/);
    assert.ok(!out.includes(" "));
    assert.ok(!out.includes(";"));
    assert.ok(!out.includes("/"));
    assert.ok(!out.includes("`"));
    assert.ok(!out.includes("\n"));
  });
  it("ignores zero/negative tribal scores", () => {
    const out = buildAwarenessHint({
      tribalDomainScores: { mill: 0, lathe: -5 },
    });
    assert.equal(out, "");
  });
  it("composes into buildCheckinPayload as extraHint without breaking the line", () => {
    const hint = buildAwarenessHint({
      domains: ["lathe"],
      hermesRole: "lathe-specialist",
      queueLength: 7,
    });
    const out = buildCheckinPayload("bravo", { extraHint: hint });
    assert.equal(out.ok, true);
    assert.ok(out.text.endsWith(hint), `expected suffix ${hint}, got ${out.text}`);
    // Slash command must still be valid: starts with /checkin-<slot>
    assert.ok(out.text.startsWith("/checkin-bravo "));
  });
  it("emits empty string when fp has only zero/empty fields (degenerate fingerprint)", () => {
    // domains is an empty array, role is empty, tribal scores all zero.
    // None should produce parts -> result must be "".
    const out = buildAwarenessHint({
      domains: [],
      hermesRole: "",
      tribalDomainScores: { x: 0 },
    });
    assert.equal(out, "");
  });
});
