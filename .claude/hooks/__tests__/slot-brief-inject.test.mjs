// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — tests
// Pure-function unit tests + a spawn-based consume-once integration test that
// proves the load-bearing behavior: a queued brief injects exactly once, archives
// to _delivered/, and is invisible on the next prompt.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  resolveSlot,
  briefHash,
  formatStamp,
  truncateBrief,
  buildBriefBlock,
} from "../slot-brief-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(__dirname, "..", "slot-brief-inject.mjs");

describe("resolveSlot", () => {
  const slotsDoc = {
    slots: {
      bravo: { chatId: "5852a0b9-b93f-42e3-a8f0-deab5898423c" },
      hotel: { chatId: "claude-cb728a14" },
      delta: null,
      echo: { chatId: null },
    },
  };
  it("returns null on missing sid or doc", () => {
    assert.equal(resolveSlot("", slotsDoc), null);
    assert.equal(resolveSlot("x", null), null);
    assert.equal(resolveSlot("x", {}), null);
  });
  it("matches exact chatId", () => {
    assert.equal(resolveSlot("5852a0b9-b93f-42e3-a8f0-deab5898423c", slotsDoc), "bravo");
  });
  it("matches by claude- prefix substring", () => {
    assert.equal(resolveSlot("cb728a14-ffff-0000", slotsDoc), "hotel");
  });
  it("skips null/empty entries and returns null on no match", () => {
    assert.equal(resolveSlot("totally-different", slotsDoc), null);
  });
  it("rejects non-alpha slot keys (path-traversal defense)", () => {
    const evil = {
      slots: {
        "../../etc/passwd": { chatId: "claude-evil" },
        "bravo": { chatId: "claude-ok" },
      },
    };
    assert.equal(resolveSlot("claude-evil-1111", evil), null, "malicious key must not resolve");
    assert.equal(resolveSlot("claude-ok-1111", evil), "bravo", "clean key still resolves");
  });
});

describe("briefHash + formatStamp", () => {
  it("produces a stable 8-hex hash", () => {
    const h = briefHash("hello");
    assert.match(h, /^[0-9a-f]{8}$/);
    assert.equal(briefHash("hello"), h);
  });
  it("distinguishes different content", () => {
    assert.notEqual(briefHash("abc"), briefHash("xyz"));
  });
  it("handles null/undefined body", () => {
    assert.match(briefHash(null), /^[0-9a-f]{8}$/);
    assert.match(briefHash(undefined), /^[0-9a-f]{8}$/);
  });
  it("formats stamp as intMtime-hash", () => {
    assert.equal(formatStamp(1700, "x"), `1700-${briefHash("x")}`);
    assert.equal(formatStamp(1700.9, "x"), `1700-${briefHash("x")}`); // floored
    assert.equal(formatStamp(NaN, "x"), `0-${briefHash("x")}`); // non-finite -> 0
  });
});

describe("truncateBrief", () => {
  it("passes short bodies through unchanged", () => {
    assert.equal(truncateBrief("short", 4096), "short");
  });
  it("head-truncates over-cap bodies with a marker", () => {
    const big = "a".repeat(5000);
    const out = truncateBrief(big, 4096);
    assert.equal(out.startsWith("a".repeat(4096)), true);
    assert.match(out, /brief truncated at 4096 bytes/);
  });
  it("coerces null body to empty string", () => {
    assert.equal(truncateBrief(null, 10), "");
  });
});

describe("buildBriefBlock", () => {
  it("includes the targeted header with the slot name + body", () => {
    const b = buildBriefBlock("bravo", "do X", {});
    assert.match(b, /Orchestrator brief — bravo/);
    assert.match(b, /consume-once/);
    assert.match(b, /do X/);
  });
  it("verbose appends the source path", () => {
    const b = buildBriefBlock("bravo", "do X", { verbose: true, briefPath: "/p/bravo.md" });
    assert.match(b, /brief source: \/p\/bravo\.md/);
  });
  it("non-verbose omits the source path", () => {
    const b = buildBriefBlock("bravo", "do X", { verbose: false });
    assert.equal(b.includes("brief source"), false);
  });
});

describe("consume-once integration (spawned hook)", () => {
  let root;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "slot-brief-"));
    fs.mkdirSync(path.join(root, "state/shared/slot-briefs"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "state/shared/chat-slots.json"),
      JSON.stringify({ slots: { bravo: { chatId: "claude-deadbeef" } } }),
    );
  });
  after(() => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* best-effort */ }
  });

  const briefFile = () => path.join(root, "state/shared/slot-briefs/bravo.md");
  function run(envelope, extraEnv = {}) {
    return spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify(envelope),
      env: { ...process.env, PRISM_ROOT: root, ...extraEnv },
      encoding: "utf8",
    });
  }

  it("injects a queued brief, then consumes it (archive to _delivered)", () => {
    fs.writeFileSync(briefFile(), "## Work order\nWire engine X to dispatcher Y.");
    const r1 = run({ session_id: "claude-deadbeef-1111" });
    const out1 = JSON.parse(r1.stdout);
    assert.equal(out1.continue, true);
    assert.ok(out1.hookSpecificOutput, "first prompt injects");
    assert.match(out1.hookSpecificOutput.additionalContext, /Orchestrator brief — bravo/);
    assert.match(out1.hookSpecificOutput.additionalContext, /Wire engine X/);
    assert.equal(fs.existsSync(briefFile()), false, "brief file removed after delivery");
    const delivered = fs.readdirSync(path.join(root, "state/shared/slot-briefs/_delivered"));
    assert.equal(delivered.length, 1, "exactly one archive copy");
    assert.match(delivered[0], /^bravo-\d+-[0-9a-f]{8}\.md$/);

    const r2 = run({ session_id: "claude-deadbeef-2222" });
    const out2 = JSON.parse(r2.stdout);
    assert.equal(out2.continue, true);
    assert.equal(out2.hookSpecificOutput, undefined, "second prompt injects nothing (consumed)");
  });

  it("no brief queued -> empty continue", () => {
    const r = run({ session_id: "claude-deadbeef-3333" });
    assert.deepEqual(JSON.parse(r.stdout), { continue: true });
  });

  it("disable knob -> empty continue, brief left queued", () => {
    fs.writeFileSync(briefFile(), "queued");
    const r = run({ session_id: "claude-deadbeef-4444" }, { PRISM_SLOT_BRIEF_INJECT_DISABLE: "1" });
    assert.deepEqual(JSON.parse(r.stdout), { continue: true });
    assert.equal(fs.existsSync(briefFile()), true, "brief NOT consumed when disabled");
    fs.rmSync(briefFile());
  });

  it("unresolvable slot -> empty continue, brief untouched", () => {
    fs.writeFileSync(briefFile(), "queued2");
    const r = run({ session_id: "claude-not-a-slot" });
    assert.deepEqual(JSON.parse(r.stdout), { continue: true });
    assert.equal(fs.existsSync(briefFile()), true, "brief untouched for unmatched session");
    fs.rmSync(briefFile());
  });

  it("empty/whitespace brief -> empty continue", () => {
    fs.writeFileSync(briefFile(), "   \n  ");
    const r = run({ session_id: "claude-deadbeef-5555" });
    assert.deepEqual(JSON.parse(r.stdout), { continue: true });
    fs.rmSync(briefFile());
  });

  it("missing session_id -> empty continue", () => {
    const r = run({});
    assert.deepEqual(JSON.parse(r.stdout), { continue: true });
  });
});
