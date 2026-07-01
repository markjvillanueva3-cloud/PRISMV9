import { test } from "node:test";
import assert from "node:assert/strict";
import { shapePointerInjection, renderPointerBlock } from "./zulu-build-pointer.mjs";

const LIVE = {
  schemaVersion: "1.0.0",
  at: "2026-06-15T20:55:02.924Z",
  builder: "bravo",
  drained: false,
  next: { id: "C4", title: "Delegation Contract Engine", effort: "M", summary: "" },
  pending: [
    { id: "C4", title: "Delegation Contract Engine", effort: "M" },
    { id: "C5", title: "Adaptive Back-Pressure", effort: "M" },
  ],
  pendingCount: 5,
  doneCount: 3,
  blocked: ["C9-gov"],
  blockedCount: 1,
  note: "Next GATED build for bravo: C4 ...; NEVER auto-commit unreviewed.",
};

test("happy: builder slot + pending unit -> inject, throttleKey=next.id", () => {
  const r = shapePointerInjection({ directive: LIVE, currentSlot: "bravo" });
  assert.equal(r.inject, true);
  assert.equal(r.reason, "pending");
  assert.equal(r.throttleKey, "C4");
  assert.match(r.text, /Delegation Contract Engine/);
  assert.match(r.text, /next GATED build = C4/);
});

test("wrong slot: surfaces ONLY to the builder slot (default bravo)", () => {
  assert.equal(shapePointerInjection({ directive: LIVE, currentSlot: "oscar" }).reason, "not-builder-slot");
  assert.equal(shapePointerInjection({ directive: LIVE, currentSlot: "zulu" }).reason, "not-builder-slot");
  assert.equal(shapePointerInjection({ directive: LIVE, currentSlot: null }).reason, "not-builder-slot");
  assert.equal(shapePointerInjection({ directive: LIVE, currentSlot: "oscar" }).inject, false);
});

test("builder defaults to bravo when the directive omits it", () => {
  const noBuilder = { ...LIVE, builder: undefined };
  assert.equal(shapePointerInjection({ directive: noBuilder, currentSlot: "bravo" }).inject, true);
  assert.equal(shapePointerInjection({ directive: noBuilder, currentSlot: "charlie" }).reason, "not-builder-slot");
});

test("respects an explicit non-default builder slot", () => {
  const charlieBuild = { ...LIVE, builder: "charlie" };
  assert.equal(shapePointerInjection({ directive: charlieBuild, currentSlot: "charlie" }).inject, true);
  assert.equal(shapePointerInjection({ directive: charlieBuild, currentSlot: "bravo" }).reason, "not-builder-slot");
});

test("drained queue -> no inject even on the builder slot", () => {
  const drained = { schemaVersion: "1.0.0", builder: "bravo", drained: true, next: null, pending: [], doneCount: 8 };
  assert.equal(shapePointerInjection({ directive: drained, currentSlot: "bravo" }).inject, false);
  assert.equal(shapePointerInjection({ directive: drained, currentSlot: "bravo" }).reason, "drained");
});

test("next present but missing id -> treated as drained (no half-pointer surfacing)", () => {
  const bad = { builder: "bravo", drained: false, next: { title: "no id", effort: "M" } };
  assert.equal(shapePointerInjection({ directive: bad, currentSlot: "bravo" }).reason, "drained");
});

test("null / non-object directive -> no-pointer (fail-soft, never throws)", () => {
  assert.equal(shapePointerInjection({ directive: null, currentSlot: "bravo" }).reason, "no-pointer");
  assert.equal(shapePointerInjection({ directive: undefined, currentSlot: "bravo" }).reason, "no-pointer");
  assert.equal(shapePointerInjection({ directive: "junk", currentSlot: "bravo" }).reason, "no-pointer");
  assert.equal(shapePointerInjection({}).reason, "no-pointer");
});

test("renderPointerBlock: contains unit, pending ids, pointer path, disable knob; ASCII-only", () => {
  const block = renderPointerBlock(LIVE);
  assert.match(block, /C4 Delegation Contract Engine \(effort M\)/);
  assert.match(block, /pending \(5\): C4, C5/);
  assert.match(block, /shipped: 3 \| gated\/blocked: C9-gov/);
  assert.match(block, /zulu-build-loop-next\.json/);
  assert.match(block, /NEVER auto-commit unreviewed/);
  assert.match(block, /PRISM_ZULU_BUILD_POINTER_INJECT_DISABLE=1/);
  // ASCII-only invariant (ascii-guard parity): no byte > 0x7f.
  for (const ch of block) assert.ok(ch.codePointAt(0) <= 0x7f, `non-ASCII char in block: ${JSON.stringify(ch)}`);
});

test("renderPointerBlock: summary rendered when present, omitted when blank", () => {
  assert.match(renderPointerBlock({ ...LIVE, next: { id: "C4", title: "X", effort: "M", summary: "build the delegation contract" } }), /^> build the delegation contract/m);
  // blank summary must not render a blockquote LINE (the block legitimately
  // contains ">" inside the "->" arrows, so match a line START, not any ">").
  assert.ok(!/^> /m.test(renderPointerBlock(LIVE)), "blank summary must not render a quote line");
});

test("renderPointerBlock: multi-line/whitespace summary collapses to ONE blockquote line (no framing break)", () => {
  const multiline = { ...LIVE, next: { id: "C4", title: "X", effort: "M", summary: "line one\n- inject\n  extra\t spaced" } };
  const block = renderPointerBlock(multiline);
  const quoteLines = block.split("\n").filter((l) => l.startsWith("> "));
  assert.equal(quoteLines.length, 1, "a multi-line summary must render exactly one blockquote line");
  assert.equal(quoteLines[0], "> line one - inject extra spaced", "whitespace (incl newlines/tabs) collapses to single spaces");
});
