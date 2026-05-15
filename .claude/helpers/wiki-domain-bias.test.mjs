// wiki-domain-bias.test.mjs
// SYSTEM-VIZ-BRAIN-MS0/U-P1-WIKI-PRELOAD-BY-DOMAIN
//
// Uses plain node:test + node:assert because the vitest harness for
// .claude/helpers/ has a pre-existing transform bug (see fleet-reaper.test.mjs
// for prior art). Hermetic — fixtures live in tmpdir.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tmp;
let slotsPath;
let positionPath;

async function reload() {
  const url = new URL("./wiki-domain-bias.mjs", import.meta.url);
  return await import(url.href + "?t=" + Date.now());
}

function writeSlots(state) {
  writeFileSync(slotsPath, JSON.stringify(state), "utf8");
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "wiki-domain-bias-"));
  slotsPath = join(tmp, "chat-slots.json");
  positionPath = join(tmp, "CURRENT_POSITION.md");
  process.env.PRISM_CHAT_SLOTS_FILE = slotsPath;
  process.env.PRISM_CURRENT_POSITION = positionPath;
  delete process.env.PRISM_WIKI_DOMAIN_BIAS_DISABLE;
});

afterEach(() => {
  delete process.env.PRISM_CHAT_SLOTS_FILE;
  delete process.env.PRISM_CURRENT_POSITION;
  delete process.env.PRISM_WIKI_DOMAIN_BIAS_DISABLE;
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
});

describe("chatIdFromInput", () => {
  it("derives canonical claude-<8hex> from session_id", async () => {
    const { chatIdFromInput } = await reload();
    assert.equal(chatIdFromInput({ session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9" }), "claude-a61bbf34");
  });

  it("accepts sessionId camelCase as fallback", async () => {
    const { chatIdFromInput } = await reload();
    assert.equal(chatIdFromInput({ sessionId: "deadbeef-0000-0000-0000-000000000000" }), "claude-deadbeef");
  });

  it("returns null when session_id missing", async () => {
    const { chatIdFromInput } = await reload();
    assert.equal(chatIdFromInput({}), null);
    assert.equal(chatIdFromInput(null), null);
    assert.equal(chatIdFromInput(undefined), null);
  });

  it("returns null on non-hex session_id", async () => {
    const { chatIdFromInput } = await reload();
    assert.equal(chatIdFromInput({ session_id: "ZZZZZZZZ-rest-is-fine" }), null);
    assert.equal(chatIdFromInput({ session_id: "short" }), null);
  });

  it("normalizes uppercase hex to lowercase", async () => {
    const { chatIdFromInput } = await reload();
    assert.equal(chatIdFromInput({ session_id: "A61BBF34-XXXX" }), "claude-a61bbf34");
  });
});

describe("getDomainTokens", () => {
  it("returns [] when chat-slots file missing AND position file missing", async () => {
    const { getDomainTokens } = await reload();
    assert.deepEqual(getDomainTokens({ chatId: "claude-deadbeef" }), []);
  });

  it("returns [] when knob PRISM_WIKI_DOMAIN_BIAS_DISABLE=1", async () => {
    writeSlots({
      slots: { alpha: { chatId: "claude-a61bbf34", topic: "system-viz-brain-ms0", branch: "cad-fusion-live-ms0", lastHeartbeat: new Date().toISOString() } },
    });
    process.env.PRISM_WIKI_DOMAIN_BIAS_DISABLE = "1";
    const { getDomainTokens } = await reload();
    assert.deepEqual(getDomainTokens({ chatId: "claude-a61bbf34" }), []);
  });

  it("extracts tokens from matched slot's topic + branch", async () => {
    writeSlots({
      slots: { alpha: { chatId: "claude-a61bbf34", topic: "system-viz-brain-ms0", branch: "cad-fusion-live-ms0", lastHeartbeat: new Date().toISOString() } },
    });
    const { getDomainTokens } = await reload();
    const toks = getDomainTokens({ chatId: "claude-a61bbf34" });
    assert.ok(toks.includes("system"), "missing 'system'");
    assert.ok(toks.includes("viz"), "missing 'viz'");
    assert.ok(toks.includes("brain"), "missing 'brain'");
    assert.ok(toks.includes("cad"), "missing 'cad'");
    assert.ok(toks.includes("fusion"), "missing 'fusion'");
    assert.ok(!toks.includes("ms0"), "'ms0' should be stop-filtered");
    assert.ok(!toks.includes("prism"), "'prism' should be stop-filtered");
  });

  it("strips work/ branch prefix", async () => {
    writeSlots({
      slots: { alpha: { chatId: "claude-feed1234", topic: null, branch: "work/cam-exhaust", lastHeartbeat: new Date().toISOString() } },
    });
    const { getDomainTokens } = await reload();
    const toks = getDomainTokens({ chatId: "claude-feed1234" });
    assert.ok(toks.includes("cam"));
    assert.ok(toks.includes("exhaust"));
    assert.ok(!toks.includes("work"));
  });

  it("returns [] when chatId provided but unmatched (no cross-contamination)", async () => {
    writeSlots({
      slots: {
        alpha: { chatId: "claude-peer1234", topic: "lathe-prod-ready-ms0", branch: "work/lathe", lastHeartbeat: new Date().toISOString() },
        bravo: { chatId: "claude-peer5678", topic: "cad-fusion-live-ms0", branch: "work/cad", lastHeartbeat: new Date().toISOString() },
      },
    });
    const { getDomainTokens } = await reload();
    assert.deepEqual(getDomainTokens({ chatId: "claude-orphan99" }), []);
  });

  it("falls back to freshest non-null-topic slot when chatId is null", async () => {
    const older = new Date(Date.now() - 60_000).toISOString();
    const newer = new Date().toISOString();
    writeSlots({
      slots: {
        alpha: { chatId: "claude-a", topic: "lathe-prod", branch: "work/lathe", lastHeartbeat: older },
        bravo: { chatId: "claude-b", topic: "wedm-power", branch: "work/wedm", lastHeartbeat: newer },
        charlie: { chatId: "claude-c", topic: null, branch: null, lastHeartbeat: newer },
      },
    });
    const { getDomainTokens } = await reload();
    const toks = getDomainTokens({});
    assert.ok(toks.includes("wedm"), "freshest non-null-topic should win");
    assert.ok(toks.includes("power"));
    assert.ok(!toks.includes("lathe"), "older slot should NOT be picked");
  });

  it("survives malformed chat-slots.json without throwing", async () => {
    writeFileSync(slotsPath, "{not json", "utf8");
    const { getDomainTokens } = await reload();
    assert.doesNotThrow(() => getDomainTokens({ chatId: "claude-a" }));
    assert.deepEqual(getDomainTokens({ chatId: "claude-a" }), []);
  });

  it("survives null slot entries (foxtrot..juliett style)", async () => {
    writeSlots({
      slots: {
        alpha: { chatId: "claude-a", topic: "mill-kienzle", branch: "work/mill", lastHeartbeat: new Date().toISOString() },
        bravo: null,
        charlie: null,
        delta: null,
      },
    });
    const { getDomainTokens } = await reload();
    assert.ok(getDomainTokens({ chatId: "claude-a" }).includes("mill"));
  });

  it("merges tokens from CURRENT_POSITION.md H1", async () => {
    writeSlots({ slots: {} });
    writeFileSync(positionPath, "# Working on Cam Exhaust Optimization\n\nSome body.", "utf8");
    const { getDomainTokens } = await reload();
    const toks = getDomainTokens({});
    assert.ok(toks.includes("working"));
    assert.ok(toks.includes("exhaust"));
    assert.ok(toks.includes("optimization"));
  });

  it("survives CURRENT_POSITION.md missing", async () => {
    writeSlots({
      slots: { alpha: { chatId: "claude-a", topic: "system-viz-brain-ms0", branch: "main", lastHeartbeat: new Date().toISOString() } },
    });
    assert.equal(existsSync(positionPath), false);
    const { getDomainTokens } = await reload();
    assert.ok(getDomainTokens({ chatId: "claude-a" }).includes("system"));
  });

  it("filters DOMAIN_STOP — 'ms0..ms9', 'prism', 'work' never leak", async () => {
    writeSlots({
      slots: { alpha: { chatId: "claude-a", topic: "prism-work-fix-ms2-the-and-for-cleanup", branch: "main-prism-live", lastHeartbeat: new Date().toISOString() } },
    });
    const { getDomainTokens } = await reload();
    const toks = getDomainTokens({ chatId: "claude-a" });
    for (const stop of ["prism", "work", "the", "and", "for", "live", "main"]) {
      assert.ok(!toks.includes(stop), `'${stop}' should be stop-filtered, got: ${toks.join(",")}`);
    }
    assert.ok(toks.includes("cleanup"));
  });
});

describe("domainBoostFor", () => {
  it("returns 0 when domainTokens empty", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor({ toks: ["mill", "force"] }, []), 0);
    assert.equal(domainBoostFor({ toks: ["mill"] }, null), 0);
  });

  it("returns 0 when entry has no overlap", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor({ toks: ["lathe", "turning"] }, ["mill", "force"]), 0);
  });

  it("scores BOOST_PER_HIT (1.5) per strong concept match", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor({ toks: ["mill", "kienzle", "cutting"] }, ["mill"]), 1.5);
    assert.equal(domainBoostFor({ toks: ["mill", "kienzle", "cutting"] }, ["mill", "kienzle"]), 3.0);
  });

  it("path hit alone weight 0.5×", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor({ toks: [], source: "engines/MillKienzle.ts" }, ["mill"]), 0.75);
  });

  it("strong-hit + matching-path doesn't double count", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor({ toks: ["mill"], source: "engines/MillKienzle.ts" }, ["mill"]), 1.5);
  });

  it("category match scores 0.5× when not also in toks", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor({ toks: [], category: "mill" }, ["mill"]), 0.75);
  });

  it("caps total boost at MAX_DOMAIN_BOOST=4.5 (preserves curated tier)", async () => {
    const { domainBoostFor } = await reload();
    const result = domainBoostFor(
      { toks: ["a", "b", "c", "d", "e", "f"], source: "engines/A/B/C/D/E/F.ts" },
      ["a", "b", "c", "d", "e", "f"]
    );
    assert.equal(result, 4.5);
  });

  it("tolerates missing entry.toks", async () => {
    const { domainBoostFor } = await reload();
    assert.doesNotThrow(() => domainBoostFor({}, ["mill"]));
    assert.equal(domainBoostFor({}, ["mill"]), 0);
  });

  it("tolerates non-string category", async () => {
    const { domainBoostFor } = await reload();
    assert.doesNotThrow(() => domainBoostFor({ toks: [], category: 42 }, ["mill"]));
  });

  it("returns 0 on null entry", async () => {
    const { domainBoostFor } = await reload();
    assert.equal(domainBoostFor(null, ["mill"]), 0);
  });
});
