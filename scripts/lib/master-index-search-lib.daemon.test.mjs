// master-index-search-lib.daemon.test.mjs -- FLEET-SEARCH-DAEMON-MS0 client seam.
// Tests searchViaDaemon + masterIndexSearch against a real stub HTTP server (no
// flaky external dep) + the env gates. Run:
//   node --test H:/prism/scripts/lib/master-index-search-lib.daemon.test.mjs

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { searchViaDaemon, masterIndexSearch, searchViaDaemonSync, masterIndexSearchSync } from "./master-index-search-lib.mjs";

// A controllable stub daemon: each test sets `respond` to shape the reply.
let server;
let port;
let respond; // (req,res) => void

before(async () => {
  server = http.createServer((req, res) => respond(req, res));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});

after(async () => { await new Promise((r) => server.close(r)); });

beforeEach(() => {
  // default: a healthy daemon returning one full-coverage hit
  respond = (req, res) => {
    const body = JSON.stringify({ ok: true, source: "daemon", tokens: ["dup", "guard"], hits: [{ id: "n1", label: "duplication-guard", score: 9, layer: "L10" }] });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(body);
  };
  // point the lib at our stub; clear gates
  process.env.PRISM_INDEX_DAEMON_PORT = String(port);
  process.env.PRISM_INDEX_DAEMON_HOST = "127.0.0.1";
  delete process.env.PRISM_INDEX_DAEMON_SELF;
  delete process.env.PRISM_INDEX_DAEMON_DISABLE;
});

// -- searchViaDaemon: success + every miss path --

test("searchViaDaemon: healthy daemon -> {tokens,hits}", async () => {
  const r = await searchViaDaemon("duplication guard", { topK: 3 });
  assert.ok(r, "should resolve a result");
  assert.deepEqual(r.tokens, ["dup", "guard"]);
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].label, "duplication-guard");
});

test("searchViaDaemon: PRISM_INDEX_DAEMON_SELF=1 -> null (anti-recursion, no network)", async () => {
  process.env.PRISM_INDEX_DAEMON_SELF = "1";
  let hit = false;
  respond = (req, res) => { hit = true; res.writeHead(200); res.end("{}"); };
  const r = await searchViaDaemon("x y z", {});
  assert.equal(r, null);
  assert.equal(hit, false, "must NOT contact the daemon in self mode");
});

test("searchViaDaemon: PRISM_INDEX_DAEMON_DISABLE=1 -> null (no network)", async () => {
  process.env.PRISM_INDEX_DAEMON_DISABLE = "1";
  let hit = false;
  respond = (req, res) => { hit = true; res.writeHead(200); res.end("{}"); };
  assert.equal(await searchViaDaemon("x y z", {}), null);
  assert.equal(hit, false);
});

test("searchViaDaemon: empty query -> null (no network)", async () => {
  let hit = false;
  respond = (req, res) => { hit = true; res.writeHead(200); res.end("{}"); };
  assert.equal(await searchViaDaemon("   ", {}), null);
  assert.equal(hit, false);
});

test("searchViaDaemon: non-200 -> null", async () => {
  respond = (req, res) => { res.writeHead(503); res.end("busy"); };
  assert.equal(await searchViaDaemon("x y z", {}), null);
});

test("searchViaDaemon: malformed JSON -> null", async () => {
  respond = (req, res) => { res.writeHead(200); res.end("{not json"); };
  assert.equal(await searchViaDaemon("x y z", {}), null);
});

test("searchViaDaemon: ok:false payload -> null", async () => {
  respond = (req, res) => { res.writeHead(200); res.end(JSON.stringify({ ok: false, error: "boom" })); };
  assert.equal(await searchViaDaemon("x y z", {}), null);
});

test("searchViaDaemon: hits not an array -> null", async () => {
  respond = (req, res) => { res.writeHead(200); res.end(JSON.stringify({ ok: true, hits: "nope" })); };
  assert.equal(await searchViaDaemon("x y z", {}), null);
});

test("searchViaDaemon: daemon DOWN (refused) -> null, fast", async () => {
  process.env.PRISM_INDEX_DAEMON_PORT = "59997"; // nothing listening
  const t0 = Date.now();
  assert.equal(await searchViaDaemon("x y z", {}), null);
  assert.ok(Date.now() - t0 < 1000, "ECONNREFUSED must be near-instant, not the timeout");
});

test("searchViaDaemon: slow daemon past timeout -> null", async () => {
  respond = (req, res) => { /* never responds */ };
  const r = await searchViaDaemon("x y z", { daemonTimeoutMs: 120 });
  assert.equal(r, null);
});

test("searchViaDaemon: oversize response -> null (capped, never unbounded)", async () => {
  respond = (req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    // stream >8MB of junk so the cap trips before JSON.parse
    res.write('{"ok":true,"hits":[');
    const chunk = "0".repeat(64 * 1024);
    for (let i = 0; i < 200; i++) res.write(chunk); // ~12.8MB
    res.end("]}");
  };
  const r = await searchViaDaemon("x y z", {});
  assert.equal(r, null);
});

test("searchViaDaemon: kind=tribal hits the /tribal path", async () => {
  let seenPath = "";
  respond = (req, res) => { seenPath = req.url; res.writeHead(200); res.end(JSON.stringify({ ok: true, tokens: [], hits: [] })); };
  await searchViaDaemon("wire edm", { kind: "tribal" });
  assert.match(seenPath, /^\/tribal\?/);
});

// -- masterIndexSearch: daemon-prefer + fallback decision --

test("masterIndexSearch: daemon hit -> source 'daemon'", async () => {
  const r = await masterIndexSearch("duplication guard", { topK: 3 });
  assert.equal(r.source, "daemon");
  assert.equal(r.hits[0].label, "duplication-guard");
});

test("masterIndexSearch: daemon down -> source 'in-process' (cheap short-query, no graph load)", async () => {
  process.env.PRISM_INDEX_DAEMON_DISABLE = "1";
  // 'a b' tokenizes to <2 usable tokens (MIN_TOKEN_LEN 3) -> runMasterIndexSearch
  // returns {tokens,hits:[]} WITHOUT loading the 711MB graph: a fast fallback proof.
  const r = await masterIndexSearch("a b", {});
  assert.equal(r.source, "in-process");
  assert.ok(Array.isArray(r.hits));
});

// -- SYNC seam (curl-based) for sync consumers (subagent pre-search) --
// NOTE: searchViaDaemonSync uses SYNCHRONOUS execFileSync('curl'), which blocks
// this process's event loop. An IN-PROCESS stub server cannot serve that curl
// (its event loop is blocked) -> the happy path needs a SEPARATE process server.

// no-server miss tests (these return null WITHOUT a successful curl -> no deadlock)
test("searchViaDaemonSync: PRISM_INDEX_DAEMON_DISABLE=1 -> null (no curl)", () => {
  process.env.PRISM_INDEX_DAEMON_DISABLE = "1";
  assert.equal(searchViaDaemonSync("x y z", {}), null);
});

test("searchViaDaemonSync: PRISM_INDEX_DAEMON_SELF=1 -> null (anti-recursion)", () => {
  process.env.PRISM_INDEX_DAEMON_SELF = "1";
  assert.equal(searchViaDaemonSync("x y z", {}), null);
});

test("searchViaDaemonSync: empty query -> null (no curl)", () => {
  assert.equal(searchViaDaemonSync("  ", {}), null);
});

test("searchViaDaemonSync: daemon DOWN (refused) -> null", () => {
  process.env.PRISM_INDEX_DAEMON_PORT = "59995"; // nothing listening -> curl refused
  assert.equal(searchViaDaemonSync("x y z", {}), null);
});

// happy path: a SEPARATE-process stub server (so the sync curl doesn't block it)
test("searchViaDaemonSync + masterIndexSearchSync: child-process daemon -> {hits} / source daemon", async () => {
  const { spawn } = await import("node:child_process");
  const childCode = "const http=require('http');"
    + "const body=JSON.stringify({ok:true,tokens:['dup','guard'],hits:[{id:'n1',label:'duplication-guard',score:9,layer:'L10'}]});"
    + "const s=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'application/json'});r.end(body)});"
    + "s.listen(0,'127.0.0.1',()=>{process.stdout.write('PORT='+s.address().port+'\\n')});";
  const child = spawn(process.execPath, ["-e", childCode], { stdio: ["ignore", "pipe", "ignore"] });
  try {
    const childPort = await new Promise((resolve, reject) => {
      let buf = "";
      const to = setTimeout(() => reject(new Error("child stub did not report a port")), 5000);
      child.stdout.on("data", (c) => {
        buf += c;
        const m = buf.match(/PORT=(\d+)/);
        if (m) { clearTimeout(to); resolve(Number(m[1])); }
      });
    });
    process.env.PRISM_INDEX_DAEMON_PORT = String(childPort);
    const r = searchViaDaemonSync("duplication guard", { topK: 3 });
    assert.ok(r, "sync daemon hit should return a result");
    assert.deepEqual(r.tokens, ["dup", "guard"]);
    assert.equal(r.hits[0].label, "duplication-guard");
    const r2 = masterIndexSearchSync("duplication guard", { topK: 3 });
    assert.equal(r2.source, "daemon");
  } finally {
    child.kill();
  }
});
