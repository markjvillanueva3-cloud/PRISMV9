/**
 * file-read-cache.test.mjs — behavioural tests for the hard-deny read-dedup hook.
 *   HOOKS-AUTOMATION-V2-MS0 / U-HKA01, step-3 ("5 tests").
 *
 * Covers the spec's required cases:
 *   1. first read of a file → cache miss (recorded, not denied)
 *   2. identical re-read of an unchanged file → DENY
 *   3. mtime changed between reads → allowed (cache entry invalidated)
 *   4. oversized cache → LRU-evicted down to the cap (+ TTL expiry)
 *   5. directory read → skipped (never cached / denied)
 * plus: exempt session-volatile paths skipped; non-Read / missing file skipped;
 *       clearSession() (PreCompact wiring) drops only the given session's entries.
 *
 * The exported helpers are pure / dir-parameterised, so no real .claude/cache is
 * touched — decideRead takes the cache as an argument and only fs.stat's the
 * real target file (we create real temp files with controlled mtimes).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  isExempt,
  cacheKey,
  canonicalPath,
  pruneCache,
  decideRead,
  clearSession,
  loadCache,
  saveCache,
} from "../file-read-cache.mjs";

let sandbox;
beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "frc-"));
});
afterEach(() => {
  if (sandbox && fs.existsSync(sandbox)) fs.rmSync(sandbox, { recursive: true, force: true });
});

function readEvent(filePath, extra = {}) {
  return { tool_name: "Read", tool_input: { file_path: filePath, ...extra }, session_id: "sess-1" };
}

describe("file-read-cache — decideRead (the PreToolUse:Read decision)", () => {
  it("1. first read of a file is a cache MISS (recorded with the exact entry, not denied)", async () => {
    const f = path.join(sandbox, "a.txt");
    fs.writeFileSync(f, "hello");
    const now = Date.now();
    const d = await decideRead(readEvent(f), {}, now);
    expect(d.kind).toBe("record");
    expect(d.entry).toEqual({ ts: now, path: f });
    expect(d.key).toBe(cacheKey(await canonicalPath(f), fs.statSync(f).mtimeMs, undefined, undefined, "sess-1"));
  });

  it("2. an IDENTICAL re-read of an unchanged file is DENIED, with the path + age in the reason", async () => {
    const f = path.join(sandbox, "b.txt");
    fs.writeFileSync(f, "hello");
    const cache = {};
    const now = Date.now();
    const first = await decideRead(readEvent(f), cache, now);
    expect(first.kind).toBe("record");
    cache[first.key] = first.entry; // mimic what main() does on a miss

    const second = await decideRead(readEvent(f), cache, now + 4000);
    expect(second.kind).toBe("deny");
    expect(second.key).toBe(first.key);
    expect(second.ageSec).toBe(4);
    expect(second.reason).toContain(f);
    expect(second.reason.toLowerCase()).toContain("already read");
    expect(second.reason).toContain("PRISM_READ_CACHE=0"); // the documented escape hatch
  });

  it("3. if the file's mtime changed between reads, the re-read is ALLOWED (new key)", async () => {
    const f = path.join(sandbox, "c.txt");
    fs.writeFileSync(f, "v1");
    const cache = {};
    const first = await decideRead(readEvent(f), cache, Date.now());
    expect(first.kind).toBe("record");
    cache[first.key] = first.entry;

    // Bump mtime well past any filesystem resolution granularity.
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(f, future, future);

    const second = await decideRead(readEvent(f), cache, Date.now());
    expect(second.kind).toBe("record"); // new key (different mtime) → not a hit
    expect(second.key).not.toBe(first.key);
    expect(second.key).toBe(cacheKey(await canonicalPath(f), fs.statSync(f).mtimeMs, undefined, undefined, "sess-1"));
  });

  it("3c. a re-read via a different path SPELLING (./.. segments, casing, separators) of the same file is still DENIED", async () => {
    const f = path.join(sandbox, "spell.txt");
    fs.writeFileSync(f, "x");
    const cache = {};
    const first = await decideRead(readEvent(f), cache, Date.now());
    expect(first.kind).toBe("record");
    cache[first.key] = first.entry;

    // Same file, ugly spelling: go into the dir, back up, back down (lexically equal after resolve;
    // realpath also resolves casing/symlinks). Must hit the SAME cache key → DENY.
    const uglyPath = path.join(path.dirname(f), ".", "..", path.basename(path.dirname(f)), "spell.txt");
    const again = await decideRead(readEvent(uglyPath), cache, Date.now() + 1000);
    expect(again.kind).toBe("deny");
    expect(again.key).toBe(first.key);
    // canonicalPath itself collapses the variant:
    expect(await canonicalPath(uglyPath)).toBe(await canonicalPath(f));
  });

  it("3b. a re-read of a DIFFERENT slice (offset/limit) of the same file is allowed; the SAME slice is denied", async () => {
    const f = path.join(sandbox, "c2.txt");
    fs.writeFileSync(f, "0123456789".repeat(50));
    const cache = {};
    const a = await decideRead(readEvent(f, { offset: 0, limit: 10 }), cache, Date.now());
    expect(a.kind).toBe("record");
    cache[a.key] = a.entry;
    const b = await decideRead(readEvent(f, { offset: 100, limit: 10 }), cache, Date.now());
    expect(b.kind).toBe("record"); // different offset/limit → different key → miss
    expect(b.key).not.toBe(a.key);
    cache[b.key] = b.entry;
    const cAgain = await decideRead(readEvent(f, { offset: 0, limit: 10 }), cache, Date.now() + 500);
    expect(cAgain.kind).toBe("deny");
    expect(cAgain.key).toBe(a.key);
  });

  it("5. a directory Read is skipped (never cached or denied)", async () => {
    const d = await decideRead(readEvent(sandbox), {}, Date.now());
    expect(d).toEqual({ kind: "skip" });
  });

  it("a missing file is skipped (let the Read tool fail naturally)", async () => {
    const d = await decideRead(readEvent(path.join(sandbox, "nope.txt")), {}, Date.now());
    expect(d).toEqual({ kind: "skip" });
  });

  it("an exempt session-volatile path is skipped even when it exists and is unchanged", async () => {
    const f = path.join(sandbox, "session.jsonl"); // *.jsonl → exempt
    fs.writeFileSync(f, "{}\n");
    const cache = {};
    expect((await decideRead(readEvent(f), cache, Date.now())).kind).toBe("skip");
    // a second identical read is STILL skipped (never even recorded)
    expect((await decideRead(readEvent(f), cache, Date.now() + 1000)).kind).toBe("skip");
    expect(cache).toEqual({});
  });

  it("a non-Read tool, or a Read with no file_path, or a null event, is skipped", async () => {
    expect((await decideRead({ tool_name: "Bash", tool_input: { command: "ls" } }, {}, Date.now())).kind).toBe("skip");
    expect((await decideRead({ tool_name: "Read", tool_input: {} }, {}, Date.now())).kind).toBe("skip");
    expect((await decideRead(null, {}, Date.now())).kind).toBe("skip");
  });

  it("an image / PDF / notebook read is skipped (not a cheap text read)", async () => {
    for (const ext of [".png", ".pdf", ".ipynb", ".jpg"]) {
      const f = path.join(sandbox, `img${ext}`);
      fs.writeFileSync(f, "binary-ish");
      expect((await decideRead(readEvent(f), {}, Date.now())).kind).toBe("skip");
    }
  });
});

describe("file-read-cache — pruneCache (TTL + LRU size cap)", () => {
  it("4. evicts oldest-by-ts down to the cap when the cache is oversized", () => {
    const now = Date.now();
    const cache = {};
    const N = 60;
    for (let i = 0; i < N; i++) cache[`k${i}`] = { ts: now - (N - i), path: `/x/${i}` }; // k0 oldest (ts now-60) … k59 newest (ts now-1)
    const pruned = pruneCache(cache, now, /*max*/ 10, /*ttlMs*/ 60 * 60 * 1000);

    // Exactly the 10 newest survive: k50 (ts now-10) … k59 (ts now-1).
    const survivors = Array.from({ length: 10 }, (_, i) => `k${50 + i}`);
    expect(Object.keys(pruned).sort()).toEqual([...survivors].sort());
    expect(pruned.k59).toEqual({ ts: now - 1, path: "/x/59" }); // newest, intact
    expect(pruned.k50).toEqual({ ts: now - 10, path: "/x/50" }); // last survivor, intact
    expect(pruned.k49).toBeUndefined(); // first one evicted
    expect(pruned.k0).toBeUndefined(); // oldest evicted
  });

  it("drops entries older than the TTL and malformed entries, regardless of the cap", () => {
    const now = Date.now();
    const cache = {
      fresh: { ts: now - 1000, path: "/a" },
      stale1: { ts: now - 10 * 60 * 1000, path: "/b" },
      stale2: { ts: now - 99 * 60 * 1000, path: "/c" },
      malformed: { nope: true },
    };
    const pruned = pruneCache(cache, now, 1000, /*ttlMs*/ 5 * 60 * 1000);
    expect(pruned).toEqual({ fresh: { ts: now - 1000, path: "/a" } });
  });

  it("returns the entries unchanged when under the cap and within TTL", () => {
    const now = Date.now();
    const cache = { a: { ts: now, path: "/a" }, b: { ts: now - 5, path: "/b" } };
    expect(pruneCache(cache, now, 10, 60_000)).toEqual(cache);
  });
});

describe("file-read-cache — isExempt / cacheKey", () => {
  it("isExempt: session-volatile files and dirs are exempt; source files are not", () => {
    for (const p of [
      "H:/prism/state/shared/handoffs/HANDOFF-claude-x-topic.md",
      "H:/prism/CLAUDE.md",
      "C:/Users/u/.claude/settings.json",
      "H:/prism/.claude/cache/whatever.json",
      "H:/prism/mcp-server/data/state/BUILD_STATE.json",
      "H:/prism/x/MEMORY.md",
      "H:/prism/x/HANDOFF-abc.md",
      "/tmp/foo.jsonl",
      "/tmp/run.log",
      "",
    ]) {
      expect(isExempt(p), `${p} should be exempt`).toBe(true);
    }
    for (const p of [
      "H:/prism/mcp-server/src/engines/CuttingForceEngine.ts",
      "H:/prism/.claude/hooks/file-read-cache.mjs",
      "H:/prism/README.md",
      "H:/prism/package.json",
    ]) {
      expect(isExempt(p), `${p} should NOT be exempt`).toBe(false);
    }
  });

  it("cacheKey is deterministic and distinguishes session / mtime / slice", () => {
    const k = cacheKey("/x/a.txt", 111, 0, 0, "s1");
    expect(cacheKey("/x/a.txt", 111, 0, 0, "s1")).toBe(k);
    expect(cacheKey("/x/a.txt", 111, 0, 0, "s2")).not.toBe(k); // different session
    expect(cacheKey("/x/a.txt", 222, 0, 0, "s1")).not.toBe(k); // different mtime
    expect(cacheKey("/x/a.txt", 111, 5, 10, "s1")).not.toBe(k); // different slice
    expect(cacheKey("/x/a.txt", 111, undefined, undefined, undefined)).toBe(cacheKey("/x/a.txt", 111, 0, 0, "_"));
    expect(k).toBe("s1::/x/a.txt::111::0::0");
  });
});

describe("file-read-cache — clearSession (PreCompact wiring)", () => {
  it("removes only the given session's entries from the on-disk cache", async () => {
    const now = Date.now();
    const seeded = {
      "sessA::/x::1::0::0": { ts: now, path: "/x" },
      "sessA::/y::1::0::0": { ts: now, path: "/y" },
      "sessB::/z::1::0::0": { ts: now, path: "/z" },
    };
    await saveCache(seeded, sandbox);
    const removed = await clearSession("sessA", sandbox);
    expect(removed).toBe(2);
    expect(await loadCache(sandbox)).toEqual({ "sessB::/z::1::0::0": { ts: now, path: "/z" } });
  });

  it("is a no-op when the session id is empty or matches no entries", async () => {
    const now = Date.now();
    await saveCache({ "sessB::/z::1::0::0": { ts: now, path: "/z" } }, sandbox);
    expect(await clearSession("", sandbox)).toBe(0);
    expect(await clearSession("sessZ", sandbox)).toBe(0);
    expect(await loadCache(sandbox)).toEqual({ "sessB::/z::1::0::0": { ts: now, path: "/z" } });
  });
});
