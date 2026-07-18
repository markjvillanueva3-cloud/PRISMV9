/**
 * nim-docker-launcher.test.mjs — hermetic coverage for the pure core of
 * the NIM container launcher. No docker, no fetch, no spawn.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  nimModelToImage,
  decidePrecondition,
  buildNimRunArgs,
} from "./nim-docker-launcher.mjs";

// ─── parseArgs ──────────────────────────────────────────────────────────────

test("parseArgs: --k=v pairs and bare flags", () => {
  const a = parseArgs(["--model=meta/llama-3.1-8b-instruct", "--dry-run", "--port=8000"]);
  assert.equal(a.model, "meta/llama-3.1-8b-instruct");
  assert.equal(a["dry-run"], true);
  assert.equal(a.port, "8000");
});

test("parseArgs: ignores non -- tokens, empty argv", () => {
  assert.deepEqual(parseArgs([]), {});
  assert.deepEqual(parseArgs(["positional", "also"]), {});
});

// ─── nimModelToImage ────────────────────────────────────────────────────────

test("nimModelToImage: vendor/name → nvcr.io/nim path", () => {
  assert.equal(
    nimModelToImage("meta/llama-3.1-8b-instruct"),
    "nvcr.io/nim/meta/llama-3.1-8b-instruct:latest",
  );
});

test("nimModelToImage: custom tag honored", () => {
  assert.equal(
    nimModelToImage("mistralai/codestral-22b-v0.1", "1.0.0"),
    "nvcr.io/nim/mistralai/codestral-22b-v0.1:1.0.0",
  );
});

test("nimModelToImage: strips stray slashes", () => {
  assert.equal(nimModelToImage("/meta/llama-3.1-8b-instruct/"), "nvcr.io/nim/meta/llama-3.1-8b-instruct:latest");
});

test("nimModelToImage: non-vendor/name forms → null (no bad image)", () => {
  assert.equal(nimModelToImage("llama3"), null);     // no slash
  assert.equal(nimModelToImage(""), null);
  assert.equal(nimModelToImage(null), null);
  assert.equal(nimModelToImage(undefined), null);
  assert.equal(nimModelToImage(42), null);
});

// ─── decidePrecondition ─────────────────────────────────────────────────────

test("decidePrecondition: NIM already up → noop (wins over everything)", () => {
  const r = decidePrecondition({ nimUp: true, dockerUp: false, ngcKeyPresent: false });
  assert.equal(r.action, "noop-already-up");
});

test("decidePrecondition: docker down → blocked-docker (operator-only)", () => {
  const r = decidePrecondition({ nimUp: false, dockerUp: false, ngcKeyPresent: true });
  assert.equal(r.action, "blocked-docker");
  assert.match(r.reason, /Docker daemon unreachable/);
});

test("decidePrecondition: docker up, no NGC key → blocked-ngc-key", () => {
  const r = decidePrecondition({ nimUp: false, dockerUp: true, ngcKeyPresent: false });
  assert.equal(r.action, "blocked-ngc-key");
  assert.match(r.reason, /NGC_API_KEY/);
});

test("decidePrecondition: all green → proceed", () => {
  const r = decidePrecondition({ nimUp: false, dockerUp: true, ngcKeyPresent: true });
  assert.equal(r.action, "proceed");
});

test("decidePrecondition: gate ORDER — docker checked before ngc-key", () => {
  // Both bad: docker is the more fundamental blocker, must win.
  const r = decidePrecondition({ nimUp: false, dockerUp: false, ngcKeyPresent: false });
  assert.equal(r.action, "blocked-docker");
});

// ─── buildNimRunArgs ────────────────────────────────────────────────────────

test("buildNimRunArgs: defaults produce a valid gpu docker run", () => {
  const a = buildNimRunArgs({ image: "nvcr.io/nim/meta/llama-3.1-8b-instruct:latest" });
  assert.equal(a[0], "run");
  assert.ok(a.includes("-d"));
  assert.ok(a.includes("--gpus") && a[a.indexOf("--gpus") + 1] === "all");
  assert.ok(a.includes("--name") && a[a.indexOf("--name") + 1] === "prism-nim");
  assert.ok(a.includes("-e") && a[a.indexOf("-e") + 1] === "NGC_API_KEY");
  assert.equal(a[a.indexOf("-p") + 1], "8000:8000");
  assert.equal(a[a.length - 1], "nvcr.io/nim/meta/llama-3.1-8b-instruct:latest");
});

test("buildNimRunArgs: custom port maps host→container 8000", () => {
  const a = buildNimRunArgs({ image: "img:1", port: 8100 });
  assert.equal(a[a.indexOf("-p") + 1], "8100:8000");
});

test("buildNimRunArgs: --restart unless-stopped present (survives reboot)", () => {
  const a = buildNimRunArgs({ image: "img:1" });
  assert.equal(a[a.indexOf("--restart") + 1], "unless-stopped");
});

test("buildNimRunArgs: no image → null (never emit a broken run)", () => {
  assert.equal(buildNimRunArgs({}), null);
  assert.equal(buildNimRunArgs({ image: "" }), null);
});

test("buildNimRunArgs: cache volume mounted (no re-pull on restart)", () => {
  const a = buildNimRunArgs({ image: "img:1", hostCacheVol: "v", cacheDir: "/c" });
  assert.ok(a.includes("-v") && a[a.indexOf("-v") + 1] === "v:/c");
});
