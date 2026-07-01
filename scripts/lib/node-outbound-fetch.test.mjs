// scripts/lib/node-outbound-fetch.test.mjs
// Run: node scripts/lib/node-outbound-fetch.test.mjs
//
// Deterministic: nodeFetch + spawn are injected fakes -> no network, no real curl.
// The LIVE curl path is proven separately by the drain's live run (R15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  makeResponseLike,
  buildCurlArgs,
  parseCurlStdout,
  curlFallbackFetch,
} from "./node-outbound-fetch.mjs";

const SENTINEL = "__PRISM_CURL_META__";

// A fake curl child process. scenario: {stdout, stderr, code, spawnThrow, emitError}
function fakeSpawn(scenario, calls) {
  return (bin, args, opts) => {
    if (calls) calls.push({ bin, args, opts });
    if (scenario.spawnThrow) throw new Error(scenario.spawnThrow);
    const cp = new EventEmitter();
    cp.stdout = new EventEmitter();
    cp.stderr = new EventEmitter();
    cp.killed = false;
    cp.kill = () => { cp.killed = true; queueMicrotask(() => cp.emit("close", 143)); };
    queueMicrotask(() => {
      if (scenario.emitError) { cp.emit("error", new Error(scenario.emitError)); return; }
      if (scenario.stdout != null) cp.stdout.emit("data", Buffer.from(scenario.stdout));
      if (scenario.stderr != null) cp.stderr.emit("data", Buffer.from(scenario.stderr));
      cp.emit("close", scenario.code ?? 0);
    });
    return cp;
  };
}
const throwIfCalledSpawn = () => { throw new Error("curl must NOT be called in this scenario"); };

// ---- makeResponseLike ----

test("makeResponseLike: status maps ok; headers.get is case-insensitive; text()", async () => {
  const r = makeResponseLike({ status: 200, contentType: "text/html; charset=utf-8", body: "<p>hi</p>" });
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(r.headers.get("CONTENT-TYPE"), "text/html; charset=utf-8");
  assert.equal(r.headers.get("x-other"), null);
  assert.equal(await r.text(), "<p>hi</p>");
  const bad = makeResponseLike({ status: 404, contentType: "", body: "" });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 404);
});

// ---- buildCurlArgs ----

test("buildCurlArgs: -sS -L --max-time + per-header -H + -w trailer + url last", () => {
  const args = buildCurlArgs("https://example.com/x", {
    headers: { "User-Agent": "PRISM/1.0", "Accept": "text/html", "X-Null": null },
  }, { PRISM_CURL_MAX_TIME_SEC: "30" });
  assert.ok(args.includes("-sS"));
  assert.ok(args.includes("-L"));
  const mi = args.indexOf("--max-time");
  assert.equal(args[mi + 1], "30");
  // headers became -H "k: v" pairs; null-valued header skipped
  assert.ok(args.some((a) => a === "User-Agent: PRISM/1.0"));
  assert.ok(args.some((a) => a === "Accept: text/html"));
  assert.ok(!args.some((a) => a.startsWith("X-Null")));
  // -w trailer present and the url is passed via --url (flag-injection guard), url last
  const wi = args.indexOf("-w");
  assert.ok(args[wi + 1].includes(SENTINEL));
  assert.equal(args[args.length - 2], "--url", "URL must be passed via --url, not a bare positional");
  assert.equal(args[args.length - 1], "https://example.com/x");
});

test("buildCurlArgs: ADVERSARIAL -leading URL is guarded by --url (cannot be read as a flag)", () => {
  const args = buildCurlArgs("-K/etc/evil", {}, {});
  assert.equal(args[args.length - 2], "--url");
  assert.equal(args[args.length - 1], "-K/etc/evil");
});

// ---- parseCurlStdout ----

test("parseCurlStdout: splits body from trailer, parses status + content-type", () => {
  const out = `<html>body</html>\n${SENTINEL}200 text/html; charset=utf-8`;
  const p = parseCurlStdout(out);
  assert.equal(p.status, 200);
  assert.equal(p.contentType, "text/html; charset=utf-8");
  assert.equal(p.body, "<html>body</html>");
});

test("parseCurlStdout: no trailer -> status 0, whole string is body (transport failure)", () => {
  const p = parseCurlStdout("partial junk no trailer");
  assert.equal(p.status, 0);
  assert.equal(p.contentType, "");
  assert.equal(p.body, "partial junk no trailer");
});

test("parseCurlStdout: ADVERSARIAL body containing the sentinel uses the LAST (real) trailer", () => {
  // A page that literally contains the sentinel token mid-body must not fool the parser.
  const out = `text ${SENTINEL}999 fake/type more text\n${SENTINEL}404 text/plain`;
  const p = parseCurlStdout(out);
  assert.equal(p.status, 404);
  assert.equal(p.contentType, "text/plain");
  assert.ok(p.body.startsWith("text "));
});

test("parseCurlStdout: non-numeric code -> status 0", () => {
  const p = parseCurlStdout(`b\n${SENTINEL}abc text/html`);
  assert.equal(p.status, 0);
});

// ---- curlFallbackFetch: selection logic ----

test("HEALTHY box: node fetch succeeds within probe -> returns node response, curl NOT called", async () => {
  const sentinelResp = { ok: true, status: 200, headers: { get: () => "text/html" }, text: async () => "via-node" };
  const res = await curlFallbackFetch("https://x", {}, {
    nodeFetch: async () => sentinelResp,
    spawn: throwIfCalledSpawn,
  });
  assert.equal(res, sentinelResp);
});

test("BLOCKED box: node fetch rejects -> curl fallback returns a Response-like", async () => {
  const calls = [];
  const res = await curlFallbackFetch("https://en.wikipedia.org/wiki/Swarf", {
    headers: { "User-Agent": "PRISM/1.0" },
  }, {
    nodeFetch: async () => { throw new Error("fetch failed"); }, // the box symptom
    spawn: fakeSpawn({ stdout: `<html>swarf</html>\n${SENTINEL}200 text/html`, code: 0 }, calls),
  });
  assert.equal(res.ok, true);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "<html>swarf</html>");
  assert.equal(calls.length, 1, "curl invoked exactly once");
});

test("PRISM_NODE_FETCH_PROBE_MS=0 -> skips node entirely, goes straight to curl", async () => {
  let nodeCalled = false;
  const res = await curlFallbackFetch("https://x", {}, {
    env: { PRISM_NODE_FETCH_PROBE_MS: "0" },
    nodeFetch: async () => { nodeCalled = true; return { ok: true }; },
    spawn: fakeSpawn({ stdout: `c\n${SENTINEL}200 text/plain`, code: 0 }),
  });
  assert.equal(nodeCalled, false, "node fetch skipped when probe=0");
  assert.equal(res.status, 200);
});

test("caller signal already aborted -> propagates, curl NOT used", async () => {
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(
    () => curlFallbackFetch("https://x", { signal: ac.signal }, {
      nodeFetch: async (_u, opts) => {
        if (opts.signal?.aborted) { const e = new Error("aborted"); e.name = "AbortError"; throw e; }
        return { ok: true };
      },
      spawn: throwIfCalledSpawn,
    }),
    /abort/i,
  );
});

// ---- curlFallbackFetch: curl failure modes ----

test("curl returns HTTP 404 (code 0, status parsed) -> ok:false, status 404 (parity with fetch)", async () => {
  const res = await curlFallbackFetch("https://x/missing", {}, {
    nodeFetch: async () => { throw new Error("blocked"); },
    spawn: fakeSpawn({ stdout: `not found\n${SENTINEL}404 text/html`, code: 0 }),
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 404);
});

test("curl transport failure (exit!=0, no status) -> rejects", async () => {
  await assert.rejects(
    () => curlFallbackFetch("https://x", {}, {
      nodeFetch: async () => { throw new Error("blocked"); },
      spawn: fakeSpawn({ stdout: "", code: 6 }), // 6 = couldn't resolve host
    }),
    /curl exit 6/,
  );
});

test("curl binary missing (spawn throws) -> rejects with clear error", async () => {
  await assert.rejects(
    () => curlFallbackFetch("https://x", {}, {
      nodeFetch: async () => { throw new Error("blocked"); },
      spawn: fakeSpawn({ spawnThrow: "ENOENT" }),
    }),
    /curl spawn failed/,
  );
});

test("curl process 'error' event (e.g. killed) -> rejects", async () => {
  await assert.rejects(
    () => curlFallbackFetch("https://x", {}, {
      nodeFetch: async () => { throw new Error("blocked"); },
      spawn: fakeSpawn({ emitError: "EPIPE" }),
    }),
    /curl process error/,
  );
});
