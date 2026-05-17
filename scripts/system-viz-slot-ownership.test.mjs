// system-viz-slot-ownership.test.mjs — U-P2-SLOT-OWNERSHIP-OVERLAY tests (node:test)
//
// Coverage targets:
//   • buildPalette: 13-slot deterministic, distinct, hex-format
//   • buildSlotOwnership pure-core: empty / single / multi-session / unknown slot /
//     malformed entries / chatId not in live slots / sorted output / counter accuracy
//   • parseArgs: defaults, --out, --json, --frozen-time, --help
//   • I/O: readFileOwnership missing-file safe / readChatSlots fallback / writeOverlay
//   • Real-data E2E: live session-file-ownership.json → overlay with non-zero files

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  buildPalette,
  buildSlotOwnership,
  readFileOwnership,
  readChatSlots,
  writeOverlay,
  parseArgs,
  SLOT_NAMES_FALLBACK,
  PALETTE_SAT,
  PALETTE_LIGHT,
} from "./system-viz-slot-ownership.mjs";

const FROZEN_ISO = "2026-05-17T05:00:00.000Z";
const FROZEN_MS = Date.parse(FROZEN_ISO);

// ─── buildPalette ────────────────────────────────────────────────────────────
describe("buildPalette", () => {
  it("returns 13 colors for 13 default slots", () => {
    const p = buildPalette();
    assert.equal(Object.keys(p).length, 13);
    for (const name of SLOT_NAMES_FALLBACK) {
      assert.ok(p[name], `missing palette for ${name}`);
    }
  });

  it("emits hex strings matching #RRGGBB", () => {
    const p = buildPalette();
    for (const hex of Object.values(p)) {
      assert.match(hex, /^#[0-9a-f]{6}$/i, `bad hex ${hex}`);
    }
  });

  it("produces 13 DISTINCT colors (no collisions)", () => {
    const p = buildPalette();
    const set = new Set(Object.values(p));
    assert.equal(set.size, 13);
  });

  it("is deterministic — two calls produce identical output", () => {
    assert.deepEqual(buildPalette(), buildPalette());
  });

  it("custom slot-name list emits matching key set", () => {
    const p = buildPalette(["x", "y", "z"]);
    assert.deepEqual(Object.keys(p).sort(), ["x", "y", "z"]);
  });

  it("empty slot list returns empty palette", () => {
    assert.deepEqual(buildPalette([]), {});
  });

  it("PALETTE_SAT/LIGHT named constants are exported", () => {
    assert.equal(typeof PALETTE_SAT, "number");
    assert.equal(typeof PALETTE_LIGHT, "number");
    assert.ok(PALETTE_SAT > 0 && PALETTE_SAT < 1);
    assert.ok(PALETTE_LIGHT > 0 && PALETTE_LIGHT < 1);
  });
});

// ─── buildSlotOwnership pure-core ────────────────────────────────────────────
describe("buildSlotOwnership pure-core", () => {
  it("empty inputs produce empty overlay with zero summary", () => {
    const out = buildSlotOwnership({ now: FROZEN_MS });
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.generatedAt, FROZEN_ISO);
    // files is Object.create(null) for proto-pollution safety — compare via keys.
    assert.equal(Object.keys(out.files).length, 0);
    assert.equal(out.summary.filesTotal, 0);
    assert.equal(out.summary.filesWithSlot, 0);
    assert.equal(out.summary.filesSessionOnly, 0);
    assert.equal(out.summary.filesMalformed, 0);
  });

  it("single file owned by a chat that holds slot alpha → file.slot=alpha", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: {
          "scripts/foo.mjs": { session: "claude-aaa", timestamp: FROZEN_MS - 60_000 },
        },
        sessions: { "claude-aaa": { lastActive: FROZEN_MS, hostname: "HOST-A" } },
      },
      chatSlotsState: {
        slots: { alpha: { chatId: "claude-aaa", host: "HOST-A", topic: "alpha-work" } },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.files["scripts/foo.mjs"].slot, "alpha");
    assert.equal(out.files["scripts/foo.mjs"].session, "claude-aaa");
    assert.equal(out.files["scripts/foo.mjs"].hostname, "HOST-A");
    assert.equal(out.files["scripts/foo.mjs"].color, out.slotPalette.alpha);
    assert.equal(out.summary.filesWithSlot, 1);
    assert.equal(out.summary.filesSessionOnly, 0);
    assert.equal(out.perSlot.alpha.fileCount, 1);
    assert.equal(out.perSlot.alpha.topic, "alpha-work");
  });

  it("file owned by session NOT in live slot table → slot:null, color:null", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: { "scripts/foo.mjs": { session: "claude-ghost", timestamp: 1 } },
        sessions: { "claude-ghost": { hostname: "HOST-A", lastActive: 1 } },
      },
      chatSlotsState: { slots: {} },
      now: FROZEN_MS,
    });
    assert.equal(out.files["scripts/foo.mjs"].slot, null);
    assert.equal(out.files["scripts/foo.mjs"].color, null);
    assert.equal(out.summary.filesWithSlot, 0);
    assert.equal(out.summary.filesSessionOnly, 1);
  });

  it("multiple files different slots → perSlot tallies correctly", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: {
          "a.mjs": { session: "claude-a", timestamp: 1 },
          "b.mjs": { session: "claude-b", timestamp: 2 },
          "c.mjs": { session: "claude-a", timestamp: 3 },
          "d.mjs": { session: "claude-c", timestamp: 4 },
        },
        sessions: {
          "claude-a": { hostname: "H1", lastActive: 1 },
          "claude-b": { hostname: "H1", lastActive: 2 },
          "claude-c": { hostname: "H1", lastActive: 4 },
        },
      },
      chatSlotsState: {
        slots: {
          alpha: { chatId: "claude-a" },
          bravo: { chatId: "claude-b" },
          // claude-c not bound → expect d.mjs slot:null
        },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.perSlot.alpha.fileCount, 2);
    assert.equal(out.perSlot.bravo.fileCount, 1);
    assert.equal(out.perSlot.charlie, undefined);
    assert.equal(out.summary.filesWithSlot, 3);
    assert.equal(out.summary.filesSessionOnly, 1);
    assert.equal(out.summary.slotsActive, 2);
    assert.equal(out.summary.sessionsTotal, 3);
  });

  it("malformed entries (null/missing-session) increment filesMalformed", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: {
          "ok.mjs": { session: "claude-a", timestamp: 1 },
          "bad1.mjs": null,
          "bad2.mjs": { timestamp: 2 }, // no session
          "bad3.mjs": { session: 42, timestamp: 3 }, // non-string session
        },
        sessions: { "claude-a": { hostname: "H1" } },
      },
      chatSlotsState: { slots: { alpha: { chatId: "claude-a" } } },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.filesTotal, 4);
    assert.equal(out.summary.filesMalformed, 3);
    assert.equal(out.summary.filesWithSlot, 1);
    assert.equal(out.files["ok.mjs"].slot, "alpha");
    assert.equal(out.files["bad1.mjs"], undefined);
    assert.equal(out.files["bad2.mjs"], undefined);
    assert.equal(out.files["bad3.mjs"], undefined);
  });

  it("file keys appear in alphabetical order (stable sort)", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: {
          "z.mjs": { session: "s", timestamp: 1 },
          "a.mjs": { session: "s", timestamp: 1 },
          "m.mjs": { session: "s", timestamp: 1 },
        },
        sessions: {},
      },
      chatSlotsState: { slots: {} },
      now: FROZEN_MS,
    });
    assert.deepEqual(Object.keys(out.files), ["a.mjs", "m.mjs", "z.mjs"]);
  });

  it("slotPalette ordered by slotNames input (alpha first, mike last)", () => {
    const out = buildSlotOwnership({ now: FROZEN_MS });
    const keys = Object.keys(out.slotPalette);
    assert.equal(keys[0], "alpha");
    assert.equal(keys[12], "mike");
    assert.deepEqual(keys, SLOT_NAMES_FALLBACK);
  });

  it("custom slotNames override and palette regenerates accordingly", () => {
    const out = buildSlotOwnership({
      slotNames: ["a", "b", "c"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.slotNames, ["a", "b", "c"]);
    assert.deepEqual(Object.keys(out.slotPalette), ["a", "b", "c"]);
  });

  it("perSlot carries slot topic + host + lastHeartbeat from chatSlotsState", () => {
    const hb = new Date(FROZEN_MS - 5000).toISOString();
    const out = buildSlotOwnership({
      fileOwnership: {
        files: { "x.mjs": { session: "claude-a", timestamp: 1 } },
        sessions: { "claude-a": { hostname: "H1" } },
      },
      chatSlotsState: {
        slots: {
          alpha: {
            chatId: "claude-a",
            host: "DESKTOP-X",
            topic: "alpha-experiment",
            lastHeartbeat: hb,
          },
        },
      },
      now: FROZEN_MS,
    });
    assert.equal(out.perSlot.alpha.host, "DESKTOP-X");
    assert.equal(out.perSlot.alpha.topic, "alpha-experiment");
    assert.equal(out.perSlot.alpha.lastHeartbeat, hb);
    assert.equal(out.perSlot.alpha.chatId, "claude-a");
  });

  it("lastTouchIso reflects timestamp; null when missing", () => {
    const ts = FROZEN_MS - 12345;
    const out = buildSlotOwnership({
      fileOwnership: {
        files: {
          "withts.mjs": { session: "s", timestamp: ts },
          "nots.mjs": { session: "s" },
        },
        sessions: {},
      },
      chatSlotsState: { slots: {} },
      now: FROZEN_MS,
    });
    assert.equal(out.files["withts.mjs"].lastTouchMs, ts);
    assert.equal(out.files["withts.mjs"].lastTouchIso, new Date(ts).toISOString());
    assert.equal(out.files["nots.mjs"].lastTouchMs, null);
    assert.equal(out.files["nots.mjs"].lastTouchIso, null);
  });

  it("perSession.fileCount tallies independently from perSlot", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: {
          "a.mjs": { session: "claude-s1", timestamp: 1 },
          "b.mjs": { session: "claude-s1", timestamp: 2 },
          "c.mjs": { session: "claude-s2", timestamp: 3 },
        },
        sessions: {},
      },
      chatSlotsState: { slots: { alpha: { chatId: "claude-s1" } } },
      now: FROZEN_MS,
    });
    assert.equal(out.perSession["claude-s1"].fileCount, 2);
    assert.equal(out.perSession["claude-s1"].slot, "alpha");
    assert.equal(out.perSession["claude-s2"].fileCount, 1);
    assert.equal(out.perSession["claude-s2"].slot, null);
  });

  it("now defaults to Date.now() when not passed (within tolerance)", () => {
    const before = Date.now();
    const out = buildSlotOwnership({});
    const after = Date.now();
    const t = Date.parse(out.generatedAt);
    assert.ok(t >= before - 1 && t <= after + 1, `generatedAt ${t} outside [${before},${after}]`);
  });

  it("advisory block carries mustHumanVerify:true + caveat string", () => {
    const out = buildSlotOwnership({ now: FROZEN_MS });
    assert.equal(out.advisory.mustHumanVerify, true);
    assert.ok(typeof out.advisory.caveat === "string");
    assert.ok(out.advisory.caveat.length > 0);
  });

  it("sources block names the input files", () => {
    const out = buildSlotOwnership({ now: FROZEN_MS });
    assert.match(out.sources.fileOwnership, /session-file-ownership\.json/);
    assert.match(out.sources.chatSlots, /chat-slots\.mjs/);
  });

  it("custom palette is honored (not overwritten)", () => {
    const customPalette = { alpha: "#deadbe", bravo: "#cafe00" };
    const out = buildSlotOwnership({
      fileOwnership: {
        files: { "x.mjs": { session: "s", timestamp: 1 } },
        sessions: {},
      },
      chatSlotsState: { slots: { alpha: { chatId: "s" } } },
      slotNames: ["alpha", "bravo"],
      palette: customPalette,
      now: FROZEN_MS,
    });
    assert.equal(out.files["x.mjs"].color, "#deadbe");
    assert.equal(out.slotPalette.alpha, "#deadbe");
  });

  it("slot bound to chatId with no matching file → perSlot.alpha not present", () => {
    const out = buildSlotOwnership({
      fileOwnership: { files: {}, sessions: {} },
      chatSlotsState: { slots: { alpha: { chatId: "claude-x" } } },
      now: FROZEN_MS,
    });
    assert.equal(out.perSlot.alpha, undefined);
    assert.equal(out.summary.slotsActive, 0);
  });
});

// ─── parseArgs ───────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "script.mjs"]);
    assert.equal(a.json, false);
    assert.equal(a.frozenTime, null);
    assert.equal(a.help, false);
    assert.match(a.outPath, /slot-ownership-overlay\.json$/);
  });

  it("--out overrides path", () => {
    const a = parseArgs(["node", "script.mjs", "--out", "/tmp/x.json"]);
    assert.equal(a.outPath, "/tmp/x.json");
  });

  it("--json sets stdout mode", () => {
    const a = parseArgs(["node", "script.mjs", "--json"]);
    assert.equal(a.json, true);
  });

  it("--frozen-time captures ISO string", () => {
    const a = parseArgs(["node", "script.mjs", "--frozen-time", FROZEN_ISO]);
    assert.equal(a.frozenTime, FROZEN_ISO);
  });

  it("--help and -h both set help flag", () => {
    assert.equal(parseArgs(["node", "x", "--help"]).help, true);
    assert.equal(parseArgs(["node", "x", "-h"]).help, true);
  });
});

// ─── I/O wrappers ────────────────────────────────────────────────────────────
describe("readFileOwnership", () => {
  it("missing file returns empty defaults (no throw)", () => {
    const out = readFileOwnership("/nonexistent/path/should/not/exist.json");
    assert.deepEqual(out.files, {});
    assert.deepEqual(out.sessions, {});
  });

  it("malformed JSON returns empty defaults with _readError", () => {
    const tmp = path.join(os.tmpdir(), `bad-${Date.now()}.json`);
    fs.writeFileSync(tmp, "{not json", "utf8");
    try {
      const out = readFileOwnership(tmp);
      assert.deepEqual(out.files, {});
      assert.ok(out._readError);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("real production file is readable and well-formed", () => {
    const out = readFileOwnership();
    assert.equal(typeof out.files, "object");
    assert.equal(typeof out.sessions, "object");
    assert.ok(Object.keys(out.files).length > 0, "production file should have entries");
  });
});

describe("readChatSlots", () => {
  it("returns {state, slotNames} with 13 slot names from live module", async () => {
    const { state, slotNames } = await readChatSlots();
    assert.equal(typeof state, "object");
    assert.equal(slotNames.length, 13);
    assert.equal(slotNames[0], "alpha");
    assert.equal(slotNames[12], "mike");
  });

  it("REGRESSION: slotNames from live module MUST deep-equal SLOT_NAMES_FALLBACK (drift catch)", async () => {
    // Per-file scrutiny arm B P2-1: first/last/length asserts let a SAME-LENGTH
    // reorder slip through. Full deep-equal catches any drift in canonical slot order.
    const { slotNames } = await readChatSlots();
    assert.deepEqual(slotNames, SLOT_NAMES_FALLBACK);
  });

  it("REGRESSION (Windows path bug): state.slots MUST contain entries when live slots are claimed", async () => {
    // Real-data verification: at least one of the 13 slots is normally claimed
    // by an active chat. If readChatSlots silently fell back to {slots:{}} (the
    // bug that shipped first pass — Windows absolute paths need file:// URL via
    // pathToFileURL), this assertion would fail.
    const { state } = await readChatSlots();
    const slotsObj = state.slots || {};
    const claimedCount = Object.values(slotsObj).filter(
      (s) => s && s.chatId,
    ).length;
    // This test runs from within an active claude session, so ≥1 slot is always
    // claimed (THIS chat at minimum).
    assert.ok(
      claimedCount >= 1,
      `expected ≥1 claimed slot but got ${claimedCount} — readChatSlots likely silent-empty fell-back (Windows import bug?)`,
    );
  });
});

describe("writeOverlay", () => {
  it("creates parent dir + writes pretty JSON with trailing newline", () => {
    const tmp = path.join(os.tmpdir(), `overlay-${Date.now()}`, "deep", "nested", "out.json");
    try {
      const payload = { schemaVersion: 1, hello: "world" };
      const written = writeOverlay(tmp, payload);
      assert.equal(written, tmp);
      const txt = fs.readFileSync(tmp, "utf8");
      assert.ok(txt.endsWith("\n"));
      assert.deepEqual(JSON.parse(txt), payload);
    } finally {
      try {
        fs.rmSync(path.dirname(path.dirname(path.dirname(tmp))), { recursive: true, force: true });
      } catch {}
    }
  });
});

// ─── Real-data E2E ───────────────────────────────────────────────────────────
describe("real-data E2E", () => {
  it("live inputs produce a non-empty overlay with valid schema", async () => {
    const fileOwnership = readFileOwnership();
    const { state, slotNames } = await readChatSlots();
    const overlay = buildSlotOwnership({
      fileOwnership,
      chatSlotsState: state,
      slotNames,
      now: FROZEN_MS,
    });
    assert.equal(overlay.schemaVersion, 1);
    assert.ok(overlay.summary.filesTotal > 0, "live data should yield non-zero files");
    assert.equal(typeof overlay.files, "object");
    // Every file record carries the expected keys
    const sample = Object.values(overlay.files)[0];
    assert.ok(sample.session);
    assert.ok("slot" in sample);
    assert.ok("color" in sample);
    assert.ok("lastTouchMs" in sample);
  });

  it("live overlay's slot count never exceeds slotNames length", async () => {
    const fileOwnership = readFileOwnership();
    const { state, slotNames } = await readChatSlots();
    const overlay = buildSlotOwnership({
      fileOwnership,
      chatSlotsState: state,
      slotNames,
      now: FROZEN_MS,
    });
    assert.ok(overlay.summary.slotsActive <= slotNames.length);
  });

  it("filesTotal == filesWithSlot + filesSessionOnly + filesMalformed (accounting invariant)", () => {
    const fileOwnership = readFileOwnership();
    const overlay = buildSlotOwnership({ fileOwnership, now: FROZEN_MS });
    const s = overlay.summary;
    assert.equal(s.filesTotal, s.filesWithSlot + s.filesSessionOnly + s.filesMalformed);
  });
});

// ─── Regression guards (must fail if reverted) ───────────────────────────────
describe("regression guards", () => {
  it("REGRESSION: filesMalformed counter MUST increment for non-string session", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: { "x.mjs": { session: 999, timestamp: 1 } },
        sessions: {},
      },
      chatSlotsState: { slots: {} },
      now: FROZEN_MS,
    });
    assert.equal(out.summary.filesMalformed, 1);
    assert.equal(out.files["x.mjs"], undefined);
  });

  it("REGRESSION: 13 palette entries MUST be distinct (no hue collisions)", () => {
    const p = buildPalette(SLOT_NAMES_FALLBACK);
    assert.equal(new Set(Object.values(p)).size, 13);
  });

  it("REGRESSION: advisory.mustHumanVerify MUST stay true (operator safety)", () => {
    const out = buildSlotOwnership({ now: FROZEN_MS });
    assert.equal(out.advisory.mustHumanVerify, true);
  });

  it("REGRESSION: file color MUST be null when slot is null (no orphan-colored files)", () => {
    const out = buildSlotOwnership({
      fileOwnership: {
        files: { "orphan.mjs": { session: "claude-nowhere", timestamp: 1 } },
        sessions: {},
      },
      chatSlotsState: { slots: {} },
      now: FROZEN_MS,
    });
    assert.equal(out.files["orphan.mjs"].slot, null);
    assert.equal(out.files["orphan.mjs"].color, null);
  });
});
