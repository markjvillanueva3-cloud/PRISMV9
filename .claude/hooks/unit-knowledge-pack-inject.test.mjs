/**
 * unit-knowledge-pack-inject.test.mjs — hermetic + real-data tests for the
 * UserPromptSubmit hook that auto-injects per-unit knowledge into context
 * when a slot has an active claim.
 *
 * Coverage:
 *   - deriveChatId: valid sid, short sid, non-string, uppercase normalization
 *   - resolveSlotForChat: matching slot, no-match, malformed JSON, missing file
 *   - readActiveClaim: present + fresh, present + stale heartbeat, missing slot,
 *                      non-string unitId, malformed JSON
 *   - shouldInject: no stamp file (yes), fresh stamp (no), stale stamp (yes)
 *   - stampPath: composite-id sanitization (`MILESTONE::U-X` → `_`)
 *   - renderCompact: full pack render, empty arrays, max-char truncation
 *   - runHook end-to-end: DISABLED knob, no-stdin no-op, no-slot no-op,
 *                         no-claim no-op, fresh-stamp no-op, full-path inject
 *   - REAL-DATA E2E: runHook against the real chat-slots + slot-task-claims
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, statSync, existsSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deriveChatId,
  resolveSlotForChat,
  readActiveClaim,
  shouldInject,
  stampPath,
  renderCompact,
  runHook,
} from "./unit-knowledge-pack-inject.mjs";

// ── deriveChatId ─────────────────────────────────────────────────────────
describe("deriveChatId", () => {
  it("returns claude-<first-8-hex> from a UUID-shaped sid", () => {
    assert.equal(deriveChatId("bca3789f-eb42-411b-ab21-ca10664f9aec"), "claude-bca3789f");
  });
  it("normalizes uppercase to lowercase", () => {
    assert.equal(deriveChatId("BCA3789F-AAAA-AAAA-AAAA-AAAAAAAAAAAA"), "claude-bca3789f");
  });
  it("rejects too-short input", () => {
    assert.equal(deriveChatId("abc"), null);
    assert.equal(deriveChatId(""), null);
  });
  it("rejects non-string input", () => {
    assert.equal(deriveChatId(null), null);
    assert.equal(deriveChatId(42), null);
    assert.equal(deriveChatId(undefined), null);
  });
});

// ── resolveSlotForChat ───────────────────────────────────────────────────
describe("resolveSlotForChat", () => {
  const slotsBody = JSON.stringify({
    slots: {
      alpha: { chatId: "claude-aaaaaaaa" },
      charlie: { chatId: "claude-bca3789f" },
      delta: { chatId: null },
    },
  });
  const fakeRead = () => slotsBody;
  it("returns the slot for a matching chatId", () => {
    assert.equal(resolveSlotForChat("claude-bca3789f", "x", fakeRead), "charlie");
  });
  it("returns null when no slot matches", () => {
    assert.equal(resolveSlotForChat("claude-nomatch", "x", fakeRead), null);
  });
  it("returns null for null chatId", () => {
    assert.equal(resolveSlotForChat(null, "x", fakeRead), null);
  });
  it("returns null when read throws", () => {
    assert.equal(resolveSlotForChat("claude-bca3789f", "x", () => { throw new Error("ENOENT"); }), null);
  });
  it("returns null when JSON is malformed", () => {
    assert.equal(resolveSlotForChat("claude-bca3789f", "x", () => "{not json"), null);
  });
});

// ── readActiveClaim ──────────────────────────────────────────────────────
describe("readActiveClaim", () => {
  const now = Date.parse("2026-05-18T17:00:00Z");
  const freshClaim = { unitId: "MS::U-X", lastHeartbeat: new Date(now - 60_000).toISOString() };
  const staleClaim = { unitId: "MS::U-X", lastHeartbeat: new Date(now - 60 * 60_000).toISOString() };
  const claimsRoot = (c) => JSON.stringify({ claims: { charlie: c } });

  it("returns the claim when heartbeat is fresh", () => {
    const c = readActiveClaim("charlie", "x", () => claimsRoot(freshClaim), now);
    assert.equal(c?.unitId, "MS::U-X");
  });
  it("returns null when heartbeat is stale (> 30 min)", () => {
    assert.equal(readActiveClaim("charlie", "x", () => claimsRoot(staleClaim), now), null);
  });
  it("returns null for unknown slot", () => {
    assert.equal(readActiveClaim("foxtrot", "x", () => claimsRoot(freshClaim), now), null);
  });
  it("returns null when unitId is missing or non-string", () => {
    assert.equal(readActiveClaim("charlie", "x", () => claimsRoot({ unitId: 42 }), now), null);
    assert.equal(readActiveClaim("charlie", "x", () => claimsRoot({}), now), null);
  });
  it("returns null on malformed claims JSON", () => {
    assert.equal(readActiveClaim("charlie", "x", () => "junk", now), null);
  });
  it("returns null when slot is null", () => {
    assert.equal(readActiveClaim(null, "x", () => claimsRoot(freshClaim), now), null);
  });
});

// ── shouldInject / stampPath ─────────────────────────────────────────────
describe("shouldInject + stampPath", () => {
  const TTL = 4 * 3600_000;
  const now = 1_000_000_000;
  it("returns true when stamp file does not exist", () => {
    const ok = shouldInject({
      slot: "charlie", unitId: "MS::U-X", stampDir: "X", ttlMs: TTL, now,
      existsImpl: () => false, statImpl: () => ({ mtimeMs: now }),
    });
    assert.equal(ok, true);
  });
  it("returns false when stamp is fresh (age < TTL)", () => {
    const ok = shouldInject({
      slot: "charlie", unitId: "MS::U-X", stampDir: "X", ttlMs: TTL, now,
      existsImpl: () => true, statImpl: () => ({ mtimeMs: now - 1000 }),
    });
    assert.equal(ok, false);
  });
  it("returns true when stamp is stale (age ≥ TTL)", () => {
    const ok = shouldInject({
      slot: "charlie", unitId: "MS::U-X", stampDir: "X", ttlMs: TTL, now,
      existsImpl: () => true, statImpl: () => ({ mtimeMs: now - TTL - 1 }),
    });
    assert.equal(ok, true);
  });
  it("returns false when slot or unitId is empty", () => {
    assert.equal(shouldInject({ slot: "", unitId: "X", stampDir: "X", ttlMs: TTL }), false);
    assert.equal(shouldInject({ slot: "charlie", unitId: "", stampDir: "X", ttlMs: TTL }), false);
  });
  it("stampPath sanitizes composite ids (MS::U-X → MS__U-X)", () => {
    const p = stampPath("charlie", "BRIDGE-WIRING::U-X", "Y");
    assert.ok(p.endsWith("charlie__BRIDGE-WIRING__U-X.stamp"), `got: ${p}`);
  });
  it("stampPath rejects path-traversal chars in unitId", () => {
    const p = stampPath("charlie", "../../etc/passwd", "Y");
    assert.ok(!p.includes(".."), `traversal escaped: ${p}`);
    assert.ok(p.includes("______etc_passwd"), `expected sanitized slug, got: ${p}`);
  });
});

// ── renderCompact ────────────────────────────────────────────────────────
describe("renderCompact", () => {
  const fullPack = {
    unitId: "MS::U-X",
    unit: { milestone: "MS", title: "Test title" },
    masterHits: [{ name: "EngineA" }, { name: "EngineB" }],
    tribalHits: [{ title: "Tip1" }],
    commits: ["abc1 [MS]/U-X: ship"],
    warnings: [],
    domain: "wedm",
  };
  it("emits the header + title + hits + tribal + drill line", () => {
    const out = renderCompact(fullPack);
    assert.match(out, /## 🧰 Unit knowledge pack — MS::U-X \(MS\)/);
    assert.match(out, /Title: Test title/);
    assert.match(out, /Top wiki\/graph: EngineA · EngineB/);
    assert.match(out, /Tribal \(wedm\): Tip1/);
    assert.match(out, /Prior commits in milestone: 1/);
    assert.match(out, /Drill: node scripts\/unit-knowledge-pack\.mjs MS::U-X/);
  });
  it("omits empty sections gracefully", () => {
    const out = renderCompact({ ...fullPack, masterHits: [], tribalHits: [], commits: [], unit: null });
    assert.doesNotMatch(out, /Top wiki\/graph:/);
    assert.doesNotMatch(out, /Tribal/);
    assert.doesNotMatch(out, /Prior commits/);
    assert.match(out, /Drill:/);
  });
  it("surfaces warning count when present", () => {
    const out = renderCompact({ ...fullPack, warnings: ["w1", "w2"] });
    assert.match(out, /⚠ 2 pack warning/);
  });
  it("truncates output above maxChars", () => {
    const out = renderCompact(fullPack, 100);
    assert.ok(out.length <= 100, `length ${out.length} > 100`);
    assert.match(out, /TRUNC/);
  });
  it("returns empty for a null pack", () => {
    assert.equal(renderCompact(null), "");
    assert.equal(renderCompact({ unitId: null }), "");
  });
});

// ── runHook end-to-end ──────────────────────────────────────────────────
describe("runHook end-to-end", () => {
  const SID = "bca3789f-eb42-411b-ab21-ca10664f9aec";
  const slotsBody = JSON.stringify({ slots: { charlie: { chatId: "claude-bca3789f" } } });
  const claimsBody = (unitId) => JSON.stringify({
    claims: { charlie: { unitId, lastHeartbeat: new Date().toISOString() } },
  });
  const okStdin = () => JSON.stringify({ session_id: SID, prompt: "x" });

  it("DISABLE knob short-circuits to {continue:true}", async () => {
    process.env.PRISM_UNIT_PACK_INJECT_DISABLE = "1";
    try {
      const r = await runHook({ stdinImpl: () => null });
      assert.deepEqual(r, { continue: true });
    } finally {
      delete process.env.PRISM_UNIT_PACK_INJECT_DISABLE;
    }
  });
  it("no stdin → no-op continue", async () => {
    const r = await runHook({ stdinImpl: () => null });
    assert.deepEqual(r, { continue: true });
  });
  it("stdin without resolvable slot → no-op continue", async () => {
    const r = await runHook({
      stdinImpl: () => JSON.parse(okStdin()),
      readImpl: () => JSON.stringify({ slots: {} }),
      slotsPath: "x", claimsPath: "y", stampDir: "z",
    });
    assert.deepEqual(r, { continue: true });
  });
  it("slot present but no claim → no-op continue", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ukpi-noclaim-"));
    try {
      const slotsP = join(dir, "slots.json"); writeFileSync(slotsP, slotsBody);
      const claimsP = join(dir, "claims.json"); writeFileSync(claimsP, JSON.stringify({ claims: {} }));
      const r = await runHook({
        stdinImpl: () => JSON.parse(okStdin()),
        slotsPath: slotsP, claimsPath: claimsP, stampDir: dir,
      });
      assert.deepEqual(r, { continue: true });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("happy path: writes stamp + emits hookSpecificOutput with additionalContext", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ukpi-happy-"));
    try {
      const slotsP = join(dir, "slots.json"); writeFileSync(slotsP, slotsBody);
      const claimsP = join(dir, "claims.json"); writeFileSync(claimsP, claimsBody("MS::U-X"));
      const fakeCompose = (unitId, opts) => ({
        unitId, unit: { milestone: "MS", title: "T" }, slot: opts.slot,
        masterHits: [{ name: "EngineX" }], tribalHits: [], commits: [], warnings: [], domain: null,
      });
      const r = await runHook({
        stdinImpl: () => JSON.parse(okStdin()),
        slotsPath: slotsP, claimsPath: claimsP, stampDir: dir,
        composeImpl: fakeCompose,
      });
      assert.equal(r.continue, true);
      assert.equal(r.hookSpecificOutput?.hookEventName, "UserPromptSubmit");
      assert.match(r.hookSpecificOutput.additionalContext, /Unit knowledge pack — MS::U-X/);
      assert.match(r.hookSpecificOutput.additionalContext, /EngineX/);
      // Stamp file was written
      const stamp = join(dir, "charlie__MS__U-X.stamp");
      assert.ok(existsSync(stamp), `expected stamp at ${stamp}`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("throttled: existing fresh stamp suppresses re-inject", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ukpi-throttle-"));
    try {
      const slotsP = join(dir, "slots.json"); writeFileSync(slotsP, slotsBody);
      const claimsP = join(dir, "claims.json"); writeFileSync(claimsP, claimsBody("MS::U-X"));
      const stampF = join(dir, "charlie__MS__U-X.stamp");
      writeFileSync(stampF, String(Date.now()), "utf-8");
      let composeCalls = 0;
      const fakeCompose = (uid) => { composeCalls++; return { unitId: uid, unit: null, masterHits: [], tribalHits: [], commits: [], warnings: [], domain: null }; };
      const r = await runHook({
        stdinImpl: () => JSON.parse(okStdin()),
        slotsPath: slotsP, claimsPath: claimsP, stampDir: dir,
        composeImpl: fakeCompose,
      });
      assert.deepEqual(r, { continue: true });
      assert.equal(composeCalls, 0, "composer should NOT run when stamp is fresh");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("stale stamp (> TTL) is overridden and re-injects", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ukpi-stale-"));
    try {
      const slotsP = join(dir, "slots.json"); writeFileSync(slotsP, slotsBody);
      const claimsP = join(dir, "claims.json"); writeFileSync(claimsP, claimsBody("MS::U-X"));
      const stampF = join(dir, "charlie__MS__U-X.stamp");
      writeFileSync(stampF, "x", "utf-8");
      // Backdate stamp to 5 hours ago (TTL=4h)
      const past = (Date.now() - 5 * 3600_000) / 1000;
      utimesSync(stampF, past, past);
      const fakeCompose = (uid) => ({ unitId: uid, unit: { milestone: "MS", title: "T" }, masterHits: [{ name: "E" }], tribalHits: [], commits: [], warnings: [], domain: null });
      const r = await runHook({
        stdinImpl: () => JSON.parse(okStdin()),
        slotsPath: slotsP, claimsPath: claimsP, stampDir: dir,
        composeImpl: fakeCompose,
      });
      assert.equal(r.continue, true);
      assert.match(r.hookSpecificOutput?.additionalContext ?? "", /MS::U-X/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it("composePack throwing is fail-soft: continue:true, no inject", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ukpi-throw-"));
    try {
      const slotsP = join(dir, "slots.json"); writeFileSync(slotsP, slotsBody);
      const claimsP = join(dir, "claims.json"); writeFileSync(claimsP, claimsBody("MS::U-X"));
      const r = await runHook({
        stdinImpl: () => JSON.parse(okStdin()),
        slotsPath: slotsP, claimsPath: claimsP, stampDir: dir,
        composeImpl: () => { throw new Error("simulated"); },
      });
      assert.deepEqual(r, { continue: true });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
