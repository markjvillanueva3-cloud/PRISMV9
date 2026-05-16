#!/usr/bin/env node
// Plain node:assert smoke driver (node --test silent-exits on this Windows env
// per CLAUDE.md). Run: node .claude/hooks/__tests__/_smoke-slot-signature-advisory.mjs
import assert from "node:assert";
import path from "node:path";
import {
  detectCarrier,
  isExemptPath,
  parseSignature,
  aliveSlots,
  currentSlotFor,
  decideWarning,
} from "../slot-signature-advisory.mjs";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("ok " + name); } catch (e) { fail++; console.log("FAIL " + name + " — " + e.message); } };

// ── detectCarrier ────────────────────────────────────────────────────────────
t("detectCarrier: .ts → comment", () => assert.equal(detectCarrier("a/b.ts"), "comment"));
t("detectCarrier: .mjs → comment", () => assert.equal(detectCarrier("x.mjs"), "comment"));
t("detectCarrier: .py → comment", () => assert.equal(detectCarrier("s.py"), "comment"));
t("detectCarrier: .md → frontmatter", () => assert.equal(detectCarrier("R.md"), "frontmatter"));
t("detectCarrier: .json → sidecar", () => assert.equal(detectCarrier("c.json"), "sidecar"));
t("detectCarrier: .txt → null", () => assert.equal(detectCarrier("n.txt"), null));
t("detectCarrier: empty → null", () => assert.equal(detectCarrier(""), null));
t("detectCarrier: null → null", () => assert.equal(detectCarrier(null), null));

// ── isExemptPath ─────────────────────────────────────────────────────────────
t("exempt: CLAUDE.md", () => assert.equal(isExemptPath("H:/prism/CLAUDE.md"), true));
t("exempt: MEMORY.md", () => assert.equal(isExemptPath("x/MEMORY.md"), true));
t("exempt: settings.json", () => assert.equal(isExemptPath("C:/u/.claude/settings.json"), true));
t("exempt: settings.local.json", () => assert.equal(isExemptPath("a/settings.local.json"), true));
t("exempt: state/shared path", () => assert.equal(isExemptPath("H:/prism/state/shared/x.json"), true));
t("exempt: knowledge/wiki path", () => assert.equal(isExemptPath("H:/prism/knowledge/wiki/a.md"), true));
t("exempt: .claude path", () => assert.equal(isExemptPath("H:/prism/.claude/hooks/z.mjs"), true));
t("exempt: handoffs path", () => assert.equal(isExemptPath("a/handoffs/HANDOFF-x.md"), true));
t("exempt: regular src false", () => assert.equal(isExemptPath("H:/prism/mcp-server/src/engines/Foo.ts"), false));
t("exempt: null → true (fail-safe)", () => assert.equal(isExemptPath(null), true));

// ── parseSignature ───────────────────────────────────────────────────────────
const RF = (map) => (p) => { if (!(p in map)) throw new Error("ENOENT " + p); return map[p]; };
const EF = (map) => (p) => p in map;

t("parseSig: comment present", () => {
  const m = { "x.ts": "#!/usr/bin/env node\n// prism-slot: bravo 2026-05-16T00:00:00Z\nconst a=1;" };
  assert.deepEqual(parseSignature("x.ts", RF(m), EF(m)), { slot: "bravo", iso: "2026-05-16T00:00:00Z" });
});
t("parseSig: comment slot-only (no iso)", () => {
  const m = { "x.ts": "// prism-slot: kilo\n" };
  assert.deepEqual(parseSignature("x.ts", RF(m), EF(m)), { slot: "kilo", iso: "" });
});
t("parseSig: comment absent → null", () => {
  const m = { "x.ts": "const a=1; // not a slot line\n" };
  assert.equal(parseSignature("x.ts", RF(m), EF(m)), null);
});
t("parseSig: frontmatter present", () => {
  const m = { "r.md": "---\ntitle: x\nprism_slot: charlie\n---\n# Body" };
  assert.deepEqual(parseSignature("r.md", RF(m), EF(m)), { slot: "charlie", iso: "" });
});
t("parseSig: frontmatter key outside fenced block → null", () => {
  const m = { "r.md": "# Body\nprism_slot: charlie\n" };
  assert.equal(parseSignature("r.md", RF(m), EF(m)), null);
});
t("parseSig: sidecar present", () => {
  // Compute the sidecar key exactly as the hook does (OS-stable).
  const fp = "subdir/c.json";
  const side = path.join(path.dirname(fp), "." + path.basename(fp) + ".slot");
  const m = { [side]: JSON.stringify({ slot: "delta", iso: "2026-05-16" }) };
  const got = parseSignature(fp, (p) => m[p], (p) => p in m);
  assert.deepEqual(got, { slot: "delta", iso: "2026-05-16" });
});
t("parseSig: sidecar absent → null", () => {
  assert.equal(parseSignature("c.json", () => { throw new Error("no"); }, () => false), null);
});
t("parseSig: read throws → null (fail-open)", () => {
  assert.equal(parseSignature("x.ts", () => { throw new Error("boom"); }, () => true), null);
});
t("parseSig: unknown ext → null", () => {
  assert.equal(parseSignature("n.txt", RF({}), EF({})), null);
});
t("parseSig: malformed sidecar JSON → null", () => {
  const got = parseSignature("c.json", () => "{not json", () => true);
  assert.equal(got, null);
});

// ── aliveSlots ───────────────────────────────────────────────────────────────
const nowIso = new Date().toISOString();
const oldIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
t("aliveSlots: fresh heartbeat in set", () => {
  const s = aliveSlots(JSON.stringify({ slots: { bravo: { lastHeartbeat: nowIso } } }));
  assert.equal(s.has("bravo"), true);
});
t("aliveSlots: stale heartbeat excluded", () => {
  const s = aliveSlots(JSON.stringify({ slots: { delta: { lastHeartbeat: oldIso } } }));
  assert.equal(s.has("delta"), false);
});
t("aliveSlots: bad json → empty", () => assert.equal(aliveSlots("{not json").size, 0));
t("aliveSlots: no slots key → empty", () => assert.equal(aliveSlots("{}").size, 0));
t("aliveSlots: null st entry skipped", () => {
  const s = aliveSlots(JSON.stringify({ slots: { x: null, y: { lastHeartbeat: nowIso } } }));
  assert.equal(s.has("y") && !s.has("x"), true);
});

// ── currentSlotFor ───────────────────────────────────────────────────────────
const slotsText = JSON.stringify({ slots: { kilo: { chatId: "claude-549c9f4f" }, bravo: { chatId: "claude-aaaa1111" } } });
t("currentSlotFor: match", () => assert.equal(currentSlotFor(slotsText, "claude-549c9f4f"), "kilo"));
t("currentSlotFor: no match → null", () => assert.equal(currentSlotFor(slotsText, "claude-zzzz9999"), null));
t("currentSlotFor: no stableId → null", () => assert.equal(currentSlotFor(slotsText, null), null));
t("currentSlotFor: bad json → null", () => assert.equal(currentSlotFor("{x", "claude-1"), null));

// ── decideWarning (the truth table) ──────────────────────────────────────────
const alive = new Set(["bravo", "kilo"]);
t("decide: no sig → null", () =>
  assert.equal(decideWarning({ sig: null, currentSlot: "kilo", alive, filePath: "a/F.ts" }), null));
t("decide: exempt path → null", () =>
  assert.equal(decideWarning({ sig: { slot: "bravo" }, currentSlot: "kilo", alive, filePath: "H:/prism/CLAUDE.md" }), null));
t("decide: same slot → null", () =>
  assert.equal(decideWarning({ sig: { slot: "kilo" }, currentSlot: "kilo", alive, filePath: "src/F.ts" }), null));
t("decide: signer dead → null (pickup OK)", () =>
  assert.equal(decideWarning({ sig: { slot: "charlie" }, currentSlot: "kilo", alive, filePath: "src/F.ts" }), null));
t("decide: diff alive signer → warning string", () => {
  const w = decideWarning({ sig: { slot: "bravo", iso: "2026-05-16" }, currentSlot: "kilo", alive, filePath: "src/F.ts" });
  assert.ok(typeof w === "string" && w.includes("bravo") && w.includes("kilo") && w.includes("ADVISORY"), "warn shape: " + w);
});
t("decide: unslotted current + diff alive → warning", () => {
  const w = decideWarning({ sig: { slot: "bravo" }, currentSlot: null, alive, filePath: "src/F.ts" });
  assert.ok(typeof w === "string" && w.includes("unslotted"), "unslotted warn: " + w);
});

console.log(`\nPASS=${pass}  FAIL=${fail}`);
process.exit(fail ? 1 : 0);
