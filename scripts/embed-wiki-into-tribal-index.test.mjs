#!/usr/bin/env node
/**
 * Hermetic node:test suite for embed-wiki-into-tribal-index.mjs
 * (BACKEND-DEV-LOOP/U-TRIBAL-EMBED-GAP).
 *
 * No Ollama, no real index mutation — pure helpers + injected fetch +
 * tmpdir index. Real-value assertions only (no toBeDefined-style stubs).
 * Each block encodes WHY the behavior matters (the non-retrievable-entry
 * failure class this unit closes). tmpdirs are tracked + removed in an
 * `after()` hook so the "hermetic" claim is true on the filesystem too.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  stripFrontmatter, flattenBody, isEmbeddable, makeWinPath, makeId, contentHash,
  buildEntry, planAppend, spliceEntries, embedText,
  VALID_DOMAINS, TEXT_MAX, MODEL, DEFAULT_DOMAIN,
} from "./embed-wiki-into-tribal-index.mjs";

const SCRIPT = path.resolve("scripts/embed-wiki-into-tribal-index.mjs");
const FM = "---\nname: x\ndomain: backend-dev\n---\n";
const TMPDIRS = [];
function mkTmp(prefix = "ewti-") {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  TMPDIRS.push(d);
  return d;
}
after(() => { for (const d of TMPDIRS) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best-effort */ } } });

// ── stripFrontmatter ──────────────────────────────────────────────────────
test("stripFrontmatter removes a leading YAML block only at byte 0", () => {
  assert.equal(stripFrontmatter(FM + "# Body\ntext"), "# Body\ntext");
  assert.equal(stripFrontmatter("---\r\na: 1\r\n---\r\nBody"), "Body");          // CRLF
  assert.equal(stripFrontmatter("# No FM\nhi"), "# No FM\nhi");                   // none
  assert.equal(stripFrontmatter("intro\n---\na: 1\n---\nx"), "intro\n---\na: 1\n---\nx"); // not byte 0
  assert.equal(stripFrontmatter(""), "");
  assert.equal(stripFrontmatter(null), "");
});

// ── flattenBody ───────────────────────────────────────────────────────────
test("flattenBody strips FM then collapses all whitespace to single spaces", () => {
  const raw = FM + "# Title\n\nLine one.\n\n  Line   two.\t\nLine three.";
  assert.equal(flattenBody(raw), "# Title Line one. Line two. Line three.");
  assert.ok(flattenBody(FM + "# H\nx").startsWith("# H"));               // heading retained
  assert.equal(flattenBody("---\na: 1\n---\n   \n\t"), "");              // pure-FM → empty
});

// ── isEmbeddable — gap #5 empty-text skip-guard ───────────────────────────
test("isEmbeddable is true only when post-FM, post-flatten text remains", () => {
  assert.equal(isEmbeddable(FM + "# Body\nreal text"), true);
  assert.equal(isEmbeddable("plain body no frontmatter"), true);
  assert.equal(isEmbeddable("---\nname: x\n---\n   \n\t"), false); // FM + whitespace only
  assert.equal(isEmbeddable("---\nname: x\n---\n"), false);        // FM only (the stub class)
  assert.equal(isEmbeddable(""), false);
  assert.equal(isEmbeddable(null), false);                        // flattenBody null-safe
  assert.equal(isEmbeddable("   \n\t  "), false);                 // all-whitespace, no FM
});

// ── makeWinPath / makeId ──────────────────────────────────────────────────
test("makeWinPath yields a backslash absolute path; makeId prefixes external:", () => {
  const wp = makeWinPath("knowledge/wiki/code-tribal/lora-fine-tuning-patterns.md");
  assert.ok(!wp.includes("/"), "no forward slashes remain");
  assert.ok(/^[A-Za-z]:\\/.test(wp) || path.isAbsolute(wp.replace(/\\/g, path.sep)));
  assert.ok(wp.endsWith("lora-fine-tuning-patterns.md"));
  assert.equal(makeId(wp), "external:" + wp);
  assert.equal(makeWinPath("a/b.md"), makeWinPath("a/b.md"));            // deterministic
});

// ── contentHash ───────────────────────────────────────────────────────────
test("contentHash is a stable 16-hex sha256 prefix", () => {
  const h = contentHash("hello world");
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(h, contentHash("hello world"));
  assert.notEqual(h, contentHash("hello world!"));
});

// ── buildEntry — the canonical retrieval contract ─────────────────────────
test("buildEntry emits the EXACT iter3 canonical shape (retrieval contract)", () => {
  const raw = FM + "# LoRA\n\nbody ".repeat(200);                       // long → 400-cap
  const emb = new Array(768).fill(0.5);
  const e = buildEntry("knowledge/wiki/code-tribal/lora-fine-tuning-patterns.md", raw, "backend-dev", emb);
  assert.deepEqual(Object.keys(e).sort(),
    ["domain", "embedding", "hash", "id", "path", "source", "text", "title"]);
  assert.equal(e.source, "external");                                   // NOT "wiki"
  assert.equal(e.title, "lora-fine-tuning-patterns");                   // basename, no .md
  assert.equal(e.domain, "backend-dev");
  assert.ok(e.id.startsWith("external:") && e.id === "external:" + e.path);
  assert.ok(!e.path.includes("/"));
  assert.equal(e.text.length, TEXT_MAX);
  assert.ok(!e.text.includes("name: x"));                               // FM stripped
  assert.equal(e.embedding.length, 768);
  assert.match(e.hash, /^[0-9a-f]{16}$/);
  assert.equal(buildEntry("a/b.md", "x", undefined, emb).domain, DEFAULT_DOMAIN);

  // P1 (Arm B): short body → text must be NON-EMPTY (rerank renders the
  // snippet; an empty text is a silent degraded injection), and embedding
  // must be a finite number[] (rerank cosine over a non-number → NaN →
  // corpus-corrupting unsorted scores).
  const short = buildEntry("a/s.md", FM + "# S\ntiny backend body.", "mill", emb);
  assert.ok(short.text.length > 0 && short.text.length <= TEXT_MAX);
  assert.equal(short.text, "# S tiny backend body.");
  assert.ok(Array.isArray(short.embedding) && short.embedding.every((n) => Number.isFinite(n)));
});

// ── planAppend — idempotency + force ──────────────────────────────────────
test("planAppend dedupes by id; --force routes present ids to replace", () => {
  const winId = makeId(makeWinPath("a/lora.md"));
  const idx = { entries: [{ id: winId, source: "external" }, { id: "other" }] };
  const p1 = planAppend(idx, ["a/lora.md", "a/new.md"], false);
  assert.equal(p1.toAdd.length, 1);
  assert.equal(p1.toAdd[0].id, makeId(makeWinPath("a/new.md")));
  assert.equal(p1.skipped.length, 1);
  assert.equal(p1.toReplace.length, 0);
  const p2 = planAppend(idx, ["a/lora.md"], true);
  assert.equal(p2.toReplace.length, 1);
  assert.equal(p2.skipped.length, 0);
  const p3 = planAppend({ entries: [null, { id: winId }] }, ["a/lora.md"], false);
  assert.equal(p3.skipped.length, 1);                                   // null-entry tolerant
  assert.equal(planAppend({}, ["a/x.md"]).toAdd.length, 1);             // non-array safe
});

// ── spliceEntries — replace-in-place vs append (P1 Arm A: was untested) ────
test("spliceEntries replaces in place (order-stable) and appends new", () => {
  const idA = makeId(makeWinPath("a.md"));
  const idC = makeId(makeWinPath("c.md"));
  const idx = { entries: [{ id: idA, title: "OLD-A" }, { id: "B" }], wikiEmbeddedCount: 5 };
  const built = [
    { id: idA, entry: { id: idA, title: "NEW-A" } },                    // replace
    { id: idC, entry: { id: idC, title: "C" } },                        // append
  ];
  const r = spliceEntries(idx, built, "FIXED-TS");
  assert.deepEqual(r, { added: 1, replaced: 1 });
  assert.equal(idx.entries.length, 3);
  assert.equal(idx.entries[0].title, "NEW-A");                          // replaced in slot 0
  assert.equal(idx.entries[1].id, "B");                                 // untouched, order kept
  assert.equal(idx.entries[2].title, "C");                              // appended at end
  assert.equal(idx.generatedAt, "FIXED-TS");
  assert.equal(idx.wikiEmbeddedAt, "FIXED-TS");
  assert.equal(idx.wikiEmbeddedCount, 7);                               // 5 + 1 + 1
  // null existing entry tolerated
  const idx2 = { entries: [null], };
  assert.deepEqual(spliceEntries(idx2, [{ id: "z", entry: { id: "z" } }], "T"), { added: 1, replaced: 0 });
  assert.equal(idx2.wikiEmbeddedCount, 1);
});

// ── embedText — model parity + R12 fail-loud + dim assertion ───────────────
test("embedText uses the rerank-parity model/endpoint and returns the vector", async () => {
  let captured;
  const fakeFetch = async (url, opts) => {
    captured = { url, body: JSON.parse(opts.body) };
    return { ok: true, json: async () => ({ embedding: new Array(768).fill(0.1) }) };
  };
  const v = await embedText("hello", fakeFetch, 768);
  assert.equal(v.length, 768);
  assert.ok(captured.url.endsWith("/api/embeddings"));
  assert.equal(captured.body.model, MODEL);                             // MUST equal rerank's
  assert.equal(captured.body.prompt, "hello");
});

test("embedText fails loud on HTTP error, empty embedding, and dim mismatch", async () => {
  await assert.rejects(
    embedText("x", async () => ({ ok: false, status: 500, text: async () => "boom" })),
    /ollama embed 500/);
  await assert.rejects(
    embedText("x", async () => ({ ok: true, json: async () => ({}) })), /no embedding/);
  await assert.rejects(
    embedText("x", async () => ({ ok: true, json: async () => ({ embedding: [] }) })), /no embedding/);
  await assert.rejects(
    embedText("x", async () => ({ ok: true, json: async () => ({ embedding: [1, 2, 3] }) }), 768),
    /dim 3 != index dim 768/);
});

// ── VALID_DOMAINS mirrors tribal-rerank ───────────────────────────────────
test("VALID_DOMAINS matches tribal-rerank's domain enum", () => {
  for (const d of ["mill", "lathe", "wedm", "cad", "cam", "backend-dev", "general"]) {
    assert.ok(VALID_DOMAINS.has(d), `${d} must be valid`);
  }
  assert.ok(!VALID_DOMAINS.has("backenddev"));                          // the typo footgun
});

// ── main() subprocess oracles (real CLI, hermetic tmpdir index) ───────────
function tmpIndex(entries = [], indexExtra = {}) {
  const dir = mkTmp();
  const ip = path.join(dir, "tribal-embed-index.json");
  fs.writeFileSync(ip, JSON.stringify({
    schemaVersion: "1.0.0", model: MODEL, dim: 768, generatedAt: "x",
    ...indexExtra, entries,
  }));
  const wiki = path.join(dir, "w.md");
  fs.writeFileSync(wiki, FM + "# W\nbackend-dev tribal body about lora and ollama embeddings.");
  return { dir, ip, wiki };
}
function run(args, env = {}) {
  try {
    // PRISM_EMBED_LANE_DISABLE pins the subprocess to the legacy single-URL
    // path: this suite's Ollama-down simulations point PRISM_OLLAMA_URL (MAIN)
    // at a dead port, but a REAL embed lane running on the dev box (:11435)
    // would mask "down" and flip 4 tests by environment. Lane behavior has its
    // own hermetic suite (scripts/lib/embed-endpoint.test.mjs); a test may
    // still override with `...env`. (U-INDIA-EMBED-LANE follow-up, R12.)
    const out = execFileSync(process.execPath, [SCRIPT, ...args],
      { encoding: "utf8", env: { ...process.env, PRISM_EMBED_LANE_DISABLE: "1", ...env }, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") }; }
}

test("main: dry-run writes nothing & echoes expectedDim; invalid domain exits 2; missing file exits 2", () => {
  const { ip, wiki } = tmpIndex();
  const before = fs.readFileSync(ip, "utf8");
  const dry = run([wiki, "--json"], { PRISM_TRIBAL_INDEX_PATH: ip });
  assert.equal(dry.code, 0);
  const dj = JSON.parse(dry.out);
  assert.equal(dj.applied, false);
  assert.equal(dj.expectedDim, 768, "dry-run must echo the index's dim (P1-c wiring witness)");
  assert.equal(fs.readFileSync(ip, "utf8"), before, "dry-run must not mutate the index");

  const bad = run([wiki, "--domain", "backenddev", "--apply", "--json"], { PRISM_TRIBAL_INDEX_PATH: ip });
  assert.equal(bad.code, 2);
  assert.match(JSON.parse(bad.out).error, /invalid --domain/);
  assert.equal(fs.readFileSync(ip, "utf8"), before, "invalid domain must not mutate the index");

  assert.equal(run(["does/not/exist.md", "--json"], { PRISM_TRIBAL_INDEX_PATH: ip }).code, 2);
});

test("main: P1-c dim wiring — index.dim flows to expectedDim; fallback 768 when omitted/invalid", () => {
  const a = tmpIndex([], { dim: 1024 });
  assert.equal(JSON.parse(run([a.wiki, "--json"], { PRISM_TRIBAL_INDEX_PATH: a.ip }).out).expectedDim, 1024);
  // omitted dim → fallback 768 (a one-line revert of the fallback fails HERE)
  const b = mkTmp(); const bip = path.join(b, "i.json");
  fs.writeFileSync(bip, JSON.stringify({ model: MODEL, generatedAt: "x", entries: [] }));
  const bw = path.join(b, "w.md"); fs.writeFileSync(bw, FM + "# W\nbody");
  assert.equal(JSON.parse(run([bw, "--json"], { PRISM_TRIBAL_INDEX_PATH: bip }).out).expectedDim, 768);
  // invalid (0 / negative / non-numeric) → fallback 768 (full ternary branch cover)
  for (const badDim of [0, -5, "not-a-number", null]) {
    const c = tmpIndex([], { dim: badDim });
    assert.equal(
      JSON.parse(run([c.wiki, "--json"], { PRISM_TRIBAL_INDEX_PATH: c.ip }).out).expectedDim, 768,
      `dim:${JSON.stringify(badDim)} must fall back to 768`);
  }
});

test("main: Ollama-down --apply fails loud (exit 3) and writes NOTHING (single-file R12)", () => {
  const { ip, wiki } = tmpIndex();
  const before = fs.readFileSync(ip, "utf8");
  const r = run([wiki, "--apply", "--json"],
    { PRISM_TRIBAL_INDEX_PATH: ip, PRISM_OLLAMA_URL: "http://127.0.0.1:1" });
  assert.equal(r.code, 3);
  const j = JSON.parse(r.out);
  assert.equal(j.ok, false);
  assert.equal(j.phase, "embed");
  assert.equal(fs.readFileSync(ip, "utf8"), before,
    "REGRESSION GUARD: a failed embed must leave the index byte-identical");
});

test("main: multi-file Ollama-down still writes NOTHING (batch all-or-nothing witness)", () => {
  const { dir, ip } = tmpIndex();
  const w1 = path.join(dir, "a.md"); fs.writeFileSync(w1, FM + "# A\nbody a");
  const w2 = path.join(dir, "b.md"); fs.writeFileSync(w2, FM + "# B\nbody b");
  const before = fs.readFileSync(ip, "utf8");
  const r = run([w1, w2, "--apply", "--json"],
    { PRISM_TRIBAL_INDEX_PATH: ip, PRISM_OLLAMA_URL: "http://127.0.0.1:1" });
  assert.equal(r.code, 3);
  assert.equal(fs.readFileSync(ip, "utf8"), before,
    "batch invariant: NO file written if ANY file's embed fails (write-inside-loop regression guard)");
});

test("main: empty-extracted-text file is SKIPPED not aborted (gap #5 driver hardening)", () => {
  const { dir, ip } = tmpIndex();
  const empty = path.join(dir, "empty.md");
  fs.writeFileSync(empty, "---\nname: stub\ndomain: backend-dev\n---\n   \n\t\n"); // FM + whitespace only
  const before = fs.readFileSync(ip, "utf8");
  // Ollama intentionally unreachable: the WHOLE point is the empty file must
  // never reach the embed call. Pre-guard this exited 3 (no-embedding / conn
  // refused) and poisoned the chunk; post-guard it exits 0, partitioned into
  // skippedEmpty, index byte-identical.
  const r = run([empty, "--apply", "--json"],
    { PRISM_TRIBAL_INDEX_PATH: ip, PRISM_OLLAMA_URL: "http://127.0.0.1:1" });
  assert.equal(r.code, 0, "empty-text file must NOT abort the batch (was exit 3 pre-guard)");
  const j = JSON.parse(r.out);
  assert.equal(j.added, 0);
  assert.equal((j.skippedEmpty || []).length, 1, "the empty file must be reported as skippedEmpty");
  assert.equal(j.skippedEmpty[0].reason, "empty-extracted-text");
  assert.equal(fs.readFileSync(ip, "utf8"), before, "an all-empty batch must leave the index byte-identical");
});

test("main: mixed batch — empty is filtered so a GOOD file drives the embed (exit-3 witness)", () => {
  const { dir, ip } = tmpIndex();
  const empty = path.join(dir, "empty.md");
  fs.writeFileSync(empty, "---\nname: stub\n---\n\n");
  const good = path.join(dir, "good.md");
  fs.writeFileSync(good, FM + "# Good\nreal backend tribal body about ollama embeddings.");
  const before = fs.readFileSync(ip, "utf8");
  const r = run([empty, good, "--apply", "--json"],
    { PRISM_TRIBAL_INDEX_PATH: ip, PRISM_OLLAMA_URL: "http://127.0.0.1:1" });
  assert.equal(r.code, 3, "the GOOD file still reaches embed → Ollama-down exit 3");
  const j = JSON.parse(r.out);
  assert.equal(j.phase, "embed");
  assert.equal(j.file, good, "the empty file was filtered; the GOOD file is the embed target (not empty.md)");
  assert.equal(fs.readFileSync(ip, "utf8"), before, "still no partial write");
});

test("main: corrupt index JSON → unhandled path exits 1 with JSON error (the .catch handler)", () => {
  const dir = mkTmp(); const ip = path.join(dir, "i.json");
  fs.writeFileSync(ip, "{ this is not valid json ");
  const wiki = path.join(dir, "w.md"); fs.writeFileSync(wiki, FM + "# W\nbody");
  const r = run([wiki, "--apply", "--json"], { PRISM_TRIBAL_INDEX_PATH: ip });
  assert.equal(r.code, 1, "JSON.parse failure must hit main().catch → exit 1, not a false 0");
  assert.equal(JSON.parse(r.out).ok, false);
});

test("main: P0 — --domain greedy-consume guard falls back to a VALID default (not the .md path)", () => {
  const { ip, wiki } = tmpIndex();
  // `--domain <wiki.md>`: the guard must NOT eat the .md as the domain value.
  // Weak proof (file still planned):
  const dry = run(["--domain", wiki, "--json"], { PRISM_TRIBAL_INDEX_PATH: ip });
  const dj = JSON.parse(dry.out);
  assert.equal(dry.code, 0);
  assert.equal(dj.added, 1, "the .md must remain an input, not be consumed as --domain");
  // STRONG proof (Arm B P0): the resulting domain must be a VALID default, so
  // the apply path reaches the embed phase (exit 3, Ollama down) rather than
  // tripping the invalid-domain gate (exit 2) FIRST. exit-3-not-2 is the
  // load-bearing witness that the guard produced a retrievable domain.
  const ap = run(["--domain", wiki, "--apply", "--json"],
    { PRISM_TRIBAL_INDEX_PATH: ip, PRISM_OLLAMA_URL: "http://127.0.0.1:1" });
  assert.equal(ap.code, 3, "domain must be the valid default → reach embed (3), not domainError (2)");
  assert.equal(JSON.parse(ap.out).phase, "embed");
});

test("main: idempotent skip — present id is skipped without --force (no dup-embed)", () => {
  const { ip, wiki } = tmpIndex();
  const id = makeId(makeWinPath(wiki));
  const idx = JSON.parse(fs.readFileSync(ip, "utf8"));
  idx.entries.push({ id, source: "external", domain: "backend-dev", embedding: new Array(768).fill(0) });
  fs.writeFileSync(ip, JSON.stringify(idx));
  const before = fs.readFileSync(ip, "utf8");
  const r = run([wiki, "--apply", "--json"], { PRISM_TRIBAL_INDEX_PATH: ip });
  assert.equal(r.code, 0);
  const j = JSON.parse(r.out);
  assert.equal(j.added, 0);
  assert.equal((j.skipped || []).length, 1);
  assert.equal(fs.readFileSync(ip, "utf8"), before, "present id → no re-embed, index untouched");
});
