/**
 * ChatBusEngine.test.ts — real-behavior tests for inter-chat messaging + file claims.
 *
 * Every test exercises the actual fs-based engine against a per-test temp directory.
 * No mocks, no stubs. Each assertion verifies concrete business behavior:
 * message content, claim ownership, conflict detection, TTL semantics, etc.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ChatBusEngine,
  chatBusEngine,
  setChatBusRoot,
  CLAIM_TTL_MS,
  PRESENCE_TTL_MS,
  MESSAGE_RETENTION_MS,
  type ChatMessage,
  type FileClaim,
} from "../engines/ChatBusEngine.js";

let tempRoot: string;
let engine: ChatBusEngine;

beforeEach(() => {
  tempRoot = mkdtempSync(join(tmpdir(), "chat-bus-test-"));
  setChatBusRoot(tempRoot);
  engine = new ChatBusEngine();
});

afterEach(() => {
  setChatBusRoot(null);
  rmSync(tempRoot, { recursive: true, force: true });
});

// ─── Messaging: actual content round-trip ────────────────────────────────
describe("ChatBusEngine — messaging round-trip", () => {
  it("postMessage writes a parseable file with exact sender/body/kind/schemaVersion", () => {
    const id = engine.postMessage({
      sessionId: "session-alpha",
      pcName: "MARKV",
      kind: "message",
      body: "U-CAM59 in progress, next PDF pending",
    });
    // id is a real UUID (36 chars with dashes)
    expect(id).toHaveLength(36);
    expect(id.split("-")).toHaveLength(5);

    const files = readdirSync(join(tempRoot, "messages"));
    expect(files).toHaveLength(1);
    const payload = JSON.parse(readFileSync(join(tempRoot, "messages", files[0]!), "utf-8")) as ChatMessage;
    expect(payload.id).toBe(id);
    expect(payload.sessionId).toBe("session-alpha");
    expect(payload.pcName).toBe("MARKV");
    expect(payload.kind).toBe("message");
    expect(payload.body).toBe("U-CAM59 in progress, next PDF pending");
    expect(payload.schemaVersion).toBe("1.0.0");
    // ts is a real ISO timestamp within the last second.
    const tsMs = Date.parse(payload.ts);
    expect(tsMs).toBeGreaterThan(Date.now() - 5_000);
    expect(tsMs).toBeLessThanOrEqual(Date.now() + 1_000);
  });

  it("readUnread returns only messages from OTHER sessions, preserving body content", () => {
    engine.postMessage({ sessionId: "session-alpha", pcName: "MARKV", kind: "message", body: "alpha-first" });
    engine.postMessage({ sessionId: "session-beta", pcName: "MARKV", kind: "message", body: "beta-one" });
    engine.postMessage({ sessionId: "session-alpha", pcName: "MARKV", kind: "message", body: "alpha-second" });
    engine.postMessage({ sessionId: "session-gamma", pcName: "OTHERPC", kind: "message", body: "gamma-news" });

    const result = engine.readUnread("session-alpha");
    expect(result.messages).toHaveLength(2);
    const bodies = result.messages.map((m) => m.body).sort();
    expect(bodies).toEqual(["beta-one", "gamma-news"]);
    const senders = result.messages.map((m) => m.sessionId).sort();
    expect(senders).toEqual(["session-beta", "session-gamma"]);
  });

  it("readUnread is idempotent after cursor advance — second call returns empty with same cursor", () => {
    engine.postMessage({ sessionId: "session-beta", pcName: "MARKV", kind: "message", body: "hello" });
    const first = engine.readUnread("session-alpha");
    expect(first.messages).toHaveLength(1);
    expect(first.messages[0]!.body).toBe("hello");
    const firstCursor = first.cursorAdvancedTo;

    const second = engine.readUnread("session-alpha");
    expect(second.messages).toHaveLength(0);
    expect(second.cursorAdvancedTo).toBe(firstCursor);
  });

  it("postMessage with kind=claim writes path + intent, and body key is absent", () => {
    engine.postMessage({
      sessionId: "s1",
      pcName: "MARKV",
      kind: "claim",
      path: "src/engines/Foo.ts",
      intent: "edit",
    });
    const files = readdirSync(join(tempRoot, "messages"));
    expect(files).toHaveLength(1);
    const m = JSON.parse(readFileSync(join(tempRoot, "messages", files[0]!), "utf-8")) as ChatMessage;
    expect(m.kind).toBe("claim");
    expect(m.path).toBe("src/engines/Foo.ts");
    expect(m.intent).toBe("edit");
    // body key must not appear on claim messages (we intentionally omit it)
    expect(Object.keys(m)).not.toContain("body");
  });
});

// ─── File claims — the anti-commit-jumbling primitive ────────────────────
describe("ChatBusEngine — file claims", () => {
  it("claimFile(new file, session A) writes a valid FileClaim with correct owner + TTL", () => {
    const before = Date.now();
    const result = engine.claimFile({
      sessionId: "session-A",
      pcName: "MARKV",
      path: "mcp-server/src/engines/Foo.ts",
      intent: "edit",
    });
    expect(result).toBe(null);
    const files = readdirSync(join(tempRoot, "claims"));
    expect(files).toHaveLength(1);
    const claim = JSON.parse(readFileSync(join(tempRoot, "claims", files[0]!), "utf-8")) as FileClaim;
    expect(claim.sessionId).toBe("session-A");
    expect(claim.pcName).toBe("MARKV");
    expect(claim.path).toBe("mcp-server/src/engines/Foo.ts");
    expect(claim.intent).toBe("edit");
    const acquiredMs = Date.parse(claim.acquiredAt);
    const expiresMs = Date.parse(claim.expiresAt);
    expect(acquiredMs).toBeGreaterThanOrEqual(before);
    expect(expiresMs - acquiredMs).toBe(CLAIM_TTL_MS);
  });

  it("claimFile by session B while A holds claim returns ClaimConflict naming A", () => {
    engine.claimFile({ sessionId: "session-A", pcName: "MARKV", path: "contested.ts" });
    const conflict = engine.claimFile({ sessionId: "session-B", pcName: "OTHERPC", path: "contested.ts" });
    expect(conflict).not.toBe(null);
    expect(conflict!.path).toBe("contested.ts");
    expect(conflict!.heldBy).toBe("session-A");
    expect(conflict!.heldByPc).toBe("MARKV");
    expect(conflict!.age_s).toBeGreaterThanOrEqual(0);
    expect(conflict!.age_s).toBeLessThan(5);
    // The claim file on disk must still belong to A.
    const files = readdirSync(join(tempRoot, "claims"));
    expect(files).toHaveLength(1);
    const onDisk = JSON.parse(readFileSync(join(tempRoot, "claims", files[0]!), "utf-8")) as FileClaim;
    expect(onDisk.sessionId).toBe("session-A");
  });

  it("claimFile by same session refreshes expiresAt but preserves acquiredAt", async () => {
    const path = "refresh-me.ts";
    engine.claimFile({ sessionId: "sA", pcName: "MARKV", path });
    const first = JSON.parse(
      readFileSync(join(tempRoot, "claims", readdirSync(join(tempRoot, "claims"))[0]!), "utf-8"),
    ) as FileClaim;
    // Short sleep to ensure clock moves (ms resolution).
    await new Promise((r) => setTimeout(r, 5));
    engine.claimFile({ sessionId: "sA", pcName: "MARKV", path });
    const second = JSON.parse(
      readFileSync(join(tempRoot, "claims", readdirSync(join(tempRoot, "claims"))[0]!), "utf-8"),
    ) as FileClaim;
    expect(second.acquiredAt).toBe(first.acquiredAt); // preserved
    expect(Date.parse(second.expiresAt)).toBeGreaterThanOrEqual(Date.parse(first.expiresAt)); // refreshed
    expect(second.sessionId).toBe("sA");
  });

  it("claimFile overrides an expired foreign claim — new owner replaces old", () => {
    engine.claimFile({ sessionId: "session-old", pcName: "MARKV", path: "expired.ts" });
    const claimFiles = readdirSync(join(tempRoot, "claims"));
    const claimPath = join(tempRoot, "claims", claimFiles[0]!);
    const claim = JSON.parse(readFileSync(claimPath, "utf-8")) as FileClaim;
    claim.expiresAt = new Date(Date.now() - 60_000).toISOString();
    claim.acquiredAt = new Date(Date.now() - (CLAIM_TTL_MS + 120_000)).toISOString();
    writeFileSync(claimPath, JSON.stringify(claim));

    const result = engine.claimFile({ sessionId: "session-new", pcName: "OTHERPC", path: "expired.ts" });
    expect(result).toBe(null);
    const after = JSON.parse(readFileSync(claimPath, "utf-8")) as FileClaim;
    expect(after.sessionId).toBe("session-new");
    expect(after.pcName).toBe("OTHERPC");
  });

  it("releaseFile fails (returns false) when a different session tries to release", () => {
    engine.claimFile({ sessionId: "owner", pcName: "MARKV", path: "mine.ts" });
    const released = engine.releaseFile({ sessionId: "imposter", pcName: "MARKV", path: "mine.ts" });
    expect(released).toBe(false);
    const files = readdirSync(join(tempRoot, "claims"));
    expect(files).toHaveLength(1);
    const still = JSON.parse(readFileSync(join(tempRoot, "claims", files[0]!), "utf-8")) as FileClaim;
    expect(still.sessionId).toBe("owner");
  });

  it("releaseFile succeeds (returns true) for the owner and removes the claim file", () => {
    engine.claimFile({ sessionId: "owner", pcName: "MARKV", path: "mine.ts" });
    expect(readdirSync(join(tempRoot, "claims"))).toHaveLength(1);
    const released = engine.releaseFile({ sessionId: "owner", pcName: "MARKV", path: "mine.ts" });
    expect(released).toBe(true);
    expect(readdirSync(join(tempRoot, "claims"))).toHaveLength(0);
  });

  it("releaseAllFor removes exactly this session's claims, leaves others intact", () => {
    engine.claimFile({ sessionId: "session-A", pcName: "MARKV", path: "a1.ts" });
    engine.claimFile({ sessionId: "session-A", pcName: "MARKV", path: "a2.ts" });
    engine.claimFile({ sessionId: "session-B", pcName: "MARKV", path: "b1.ts" });
    engine.claimFile({ sessionId: "session-C", pcName: "MARKV", path: "c1.ts" });
    expect(readdirSync(join(tempRoot, "claims"))).toHaveLength(4);

    const released = engine.releaseAllFor("session-A");
    expect(released).toBe(2);
    const remainingFiles = readdirSync(join(tempRoot, "claims"));
    expect(remainingFiles).toHaveLength(2);
    const remainingOwners = remainingFiles
      .map((f) => JSON.parse(readFileSync(join(tempRoot, "claims", f), "utf-8")) as FileClaim)
      .map((c) => c.sessionId)
      .sort();
    expect(remainingOwners).toEqual(["session-B", "session-C"]);
  });
});

// ─── findForeignClaims — the commit-guard primitive ──────────────────────
describe("ChatBusEngine — findForeignClaims commit guard", () => {
  it("returns [] when every staged path is self-claimed or unclaimed", () => {
    engine.claimFile({ sessionId: "me", pcName: "MARKV", path: "engine.ts" });
    const conflicts = engine.findForeignClaims("me", ["engine.ts", "unclaimed.ts", "another.ts"]);
    expect(conflicts).toEqual([]);
  });

  it("flags exactly the foreign-claimed paths with correct owner data", () => {
    engine.claimFile({ sessionId: "other-chat", pcName: "OTHERPC", path: "shared.ts", intent: "refactor" });
    engine.claimFile({ sessionId: "me", pcName: "MARKV", path: "mine.ts" });

    const conflicts = engine.findForeignClaims("me", ["shared.ts", "mine.ts", "never-claimed.ts"]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.path).toBe("shared.ts");
    expect(conflicts[0]!.heldBy).toBe("other-chat");
    expect(conflicts[0]!.heldByPc).toBe("OTHERPC");
    expect(conflicts[0]!.intent).toBe("refactor");
  });

  it("does NOT flag expired foreign claims (they're garbage to the commit guard)", () => {
    engine.claimFile({ sessionId: "dead-chat", pcName: "MARKV", path: "stale.ts" });
    const files = readdirSync(join(tempRoot, "claims"));
    const claimPath = join(tempRoot, "claims", files[0]!);
    const c = JSON.parse(readFileSync(claimPath, "utf-8")) as FileClaim;
    c.expiresAt = new Date(Date.now() - 60_000).toISOString();
    writeFileSync(claimPath, JSON.stringify(c));

    const conflicts = engine.findForeignClaims("me", ["stale.ts"]);
    expect(conflicts).toEqual([]);
  });

  it("flags multiple foreign conflicts simultaneously", () => {
    engine.claimFile({ sessionId: "chat-x", pcName: "MARKV", path: "a.ts" });
    engine.claimFile({ sessionId: "chat-y", pcName: "MARKV", path: "b.ts" });
    engine.claimFile({ sessionId: "chat-z", pcName: "MARKV", path: "c.ts" });

    const conflicts = engine.findForeignClaims("me", ["a.ts", "b.ts", "c.ts"]);
    expect(conflicts).toHaveLength(3);
    const owners = conflicts.map((c) => c.heldBy).sort();
    expect(owners).toEqual(["chat-x", "chat-y", "chat-z"]);
  });
});

// ─── Presence / heartbeat ────────────────────────────────────────────────
describe("ChatBusEngine — presence", () => {
  it("heartbeat persists sessionId/pcName/ts; activeSessions returns them", () => {
    engine.heartbeat("session-a", "MARKV", { lane: "u-cam59" });
    engine.heartbeat("session-b", "OTHERPC");
    const active = engine.activeSessions();
    expect(active).toHaveLength(2);
    const ids = active.map((s) => s.sessionId).sort();
    expect(ids).toEqual(["session-a", "session-b"]);
    const sessionA = active.find((s) => s.sessionId === "session-a")!;
    expect(sessionA.pcName).toBe("MARKV");
    expect(sessionA.age_s).toBeGreaterThanOrEqual(0);
    expect(sessionA.age_s).toBeLessThan(5);
  });

  it("activeSessions excludes sessions whose heartbeat is older than PRESENCE_TTL_MS", () => {
    engine.heartbeat("session-live", "MARKV");
    engine.heartbeat("session-stale", "MARKV");
    const presenceFile = join(tempRoot, "presence", "session-stale.json");
    const p = JSON.parse(readFileSync(presenceFile, "utf-8"));
    p.ts = new Date(Date.now() - (PRESENCE_TTL_MS + 60_000)).toISOString();
    writeFileSync(presenceFile, JSON.stringify(p));

    const active = engine.activeSessions();
    expect(active).toHaveLength(1);
    expect(active[0]!.sessionId).toBe("session-live");
  });

  it("activeSessions returns [] when presence dir is empty", () => {
    expect(engine.activeSessions()).toEqual([]);
  });
});

// ─── Prune / GC ──────────────────────────────────────────────────────────
describe("ChatBusEngine — prune", () => {
  it("removes messages older than retention and leaves fresh ones", () => {
    engine.postMessage({ sessionId: "s1", pcName: "MARKV", kind: "message", body: "keep-me" });
    engine.postMessage({ sessionId: "s1", pcName: "MARKV", kind: "message", body: "age-me" });

    const files = readdirSync(join(tempRoot, "messages")).sort();
    expect(files).toHaveLength(2);
    const agePath = join(tempRoot, "messages", files[1]!);
    const aged = JSON.parse(readFileSync(agePath, "utf-8")) as ChatMessage;
    aged.ts = new Date(Date.now() - (MESSAGE_RETENTION_MS + 60_000)).toISOString();
    writeFileSync(agePath, JSON.stringify(aged));

    const result = engine.prune();
    expect(result.messagesRemoved).toBe(1);
    const remaining = readdirSync(join(tempRoot, "messages"));
    expect(remaining).toHaveLength(1);
    const survivor = JSON.parse(readFileSync(join(tempRoot, "messages", remaining[0]!), "utf-8")) as ChatMessage;
    expect(survivor.body).toBe("keep-me");
  });

  it("prune deletes claims past CLAIM_TTL_MS (stale-chat cleanup)", () => {
    engine.claimFile({ sessionId: "crashed-chat", pcName: "MARKV", path: "abandoned.ts" });
    const files = readdirSync(join(tempRoot, "claims"));
    expect(files).toHaveLength(1);
    const claimPath = join(tempRoot, "claims", files[0]!);
    const c = JSON.parse(readFileSync(claimPath, "utf-8")) as FileClaim;
    c.acquiredAt = new Date(Date.now() - (CLAIM_TTL_MS + 60_000)).toISOString();
    writeFileSync(claimPath, JSON.stringify(c));

    const result = engine.prune();
    expect(result.claimsReleased).toBe(1);
    expect(readdirSync(join(tempRoot, "claims"))).toHaveLength(0);
  });

  it("prune deletes corrupt JSON files in every sub-directory", () => {
    engine.postMessage({ sessionId: "s1", pcName: "MARKV", kind: "message", body: "ok" });
    engine.heartbeat("s1", "MARKV");
    engine.claimFile({ sessionId: "s1", pcName: "MARKV", path: "x.ts" });
    writeFileSync(join(tempRoot, "messages", "bogus.json"), "{not json");
    writeFileSync(join(tempRoot, "claims", "bogus.json"), "{not json");
    writeFileSync(join(tempRoot, "presence", "bogus.json"), "{not json");

    const result = engine.prune();
    expect(result.messagesRemoved).toBeGreaterThanOrEqual(1);
    expect(result.claimsReleased).toBeGreaterThanOrEqual(1);
    expect(result.presenceRemoved).toBeGreaterThanOrEqual(1);
    expect(existsSync(join(tempRoot, "messages", "bogus.json"))).toBe(false);
    expect(existsSync(join(tempRoot, "claims", "bogus.json"))).toBe(false);
    expect(existsSync(join(tempRoot, "presence", "bogus.json"))).toBe(false);
  });
});

// ─── Input validation ────────────────────────────────────────────────────
describe("ChatBusEngine — input validation", () => {
  it("postMessage throws when sessionId is empty", () => {
    expect(() =>
      engine.postMessage({ sessionId: "", pcName: "MARKV", kind: "message", body: "hi" }),
    ).toThrow(/sessionId/);
  });

  it("postMessage throws when pcName is empty", () => {
    expect(() =>
      engine.postMessage({ sessionId: "s1", pcName: "", kind: "message", body: "hi" }),
    ).toThrow(/pcName/);
  });

  it("postMessage throws when kind=message has no body", () => {
    expect(() =>
      engine.postMessage({ sessionId: "s1", pcName: "MARKV", kind: "message" }),
    ).toThrow(/body/);
  });

  it("postMessage throws when kind=claim has no path", () => {
    expect(() =>
      engine.postMessage({ sessionId: "s1", pcName: "MARKV", kind: "claim" }),
    ).toThrow(/path/);
  });

  it("claimFile throws when sessionId is empty", () => {
    expect(() =>
      engine.claimFile({ sessionId: "", pcName: "MARKV", path: "x.ts" }),
    ).toThrow(/sessionId/);
  });

  it("claimFile throws when path is empty", () => {
    expect(() =>
      engine.claimFile({ sessionId: "s1", pcName: "MARKV", path: "" }),
    ).toThrow(/path/);
  });
});

// ─── Path canonicalization — adversarial spellings ───────────────────────
describe("ChatBusEngine — path canonicalization prevents spelling bypass", () => {
  it("Windows-style backslash and Unix-style forward slash collide on same claim", () => {
    const r1 = engine.claimFile({ sessionId: "sA", pcName: "MARKV", path: "H:\\prism\\foo.ts" });
    expect(r1).toBe(null);
    const r2 = engine.claimFile({ sessionId: "sB", pcName: "MARKV", path: "h:/prism/foo.ts" });
    expect(r2).not.toBe(null);
    expect(r2!.heldBy).toBe("sA");
  });

  it("uppercase vs lowercase drive letter collide on same claim", () => {
    const r1 = engine.claimFile({ sessionId: "sA", pcName: "MARKV", path: "H:/prism/foo.ts" });
    expect(r1).toBe(null);
    const r2 = engine.claimFile({ sessionId: "sB", pcName: "MARKV", path: "h:/prism/foo.ts" });
    expect(r2).not.toBe(null);
    expect(r2!.heldBy).toBe("sA");
  });

  it("trailing slash differences canonicalize together", () => {
    const r1 = engine.claimFile({ sessionId: "sA", pcName: "MARKV", path: "H:/prism/dir" });
    expect(r1).toBe(null);
    const r2 = engine.claimFile({ sessionId: "sB", pcName: "MARKV", path: "H:/prism/dir/" });
    expect(r2).not.toBe(null);
    expect(r2!.heldBy).toBe("sA");
  });
});

// ─── Three-session race: exactly one winner ──────────────────────────────
describe("ChatBusEngine — concurrent-claim race", () => {
  it("three sequential claim attempts on the same file → exactly 1 winner, 2 conflicts", () => {
    const path = "racing-file.ts";
    const r1 = engine.claimFile({ sessionId: "s1", pcName: "MARKV", path });
    const r2 = engine.claimFile({ sessionId: "s2", pcName: "MARKV", path });
    const r3 = engine.claimFile({ sessionId: "s3", pcName: "MARKV", path });

    const winners = [r1, r2, r3].filter((r) => r === null).length;
    const losers = [r1, r2, r3].filter((r) => r !== null);
    expect(winners).toBe(1);
    expect(losers).toHaveLength(2);
    for (const conflict of losers) {
      expect(conflict!.heldBy).toBe("s1");
      expect(conflict!.path).toBe(path);
    }
  });

  it("handoff: winner releases, next claimant becomes new winner, third still blocked", () => {
    const path = "handoff.ts";
    expect(engine.claimFile({ sessionId: "s1", pcName: "MARKV", path })).toBe(null);
    expect(engine.claimFile({ sessionId: "s2", pcName: "MARKV", path })).not.toBe(null);
    engine.releaseFile({ sessionId: "s1", pcName: "MARKV", path });

    expect(engine.claimFile({ sessionId: "s2", pcName: "MARKV", path })).toBe(null);
    const conflict = engine.claimFile({ sessionId: "s3", pcName: "MARKV", path });
    expect(conflict).not.toBe(null);
    expect(conflict!.heldBy).toBe("s2");
  });
});

// ─── Singleton export sanity ─────────────────────────────────────────────
describe("ChatBusEngine — singleton export", () => {
  it("chatBusEngine is a usable ChatBusEngine instance", () => {
    expect(chatBusEngine).toBeInstanceOf(ChatBusEngine);
    const id = chatBusEngine.postMessage({
      sessionId: "singleton-test",
      pcName: "MARKV",
      kind: "message",
      body: "via-singleton",
    });
    expect(id).toHaveLength(36);
    const files = readdirSync(join(tempRoot, "messages"));
    expect(files).toHaveLength(1);
    const m = JSON.parse(readFileSync(join(tempRoot, "messages", files[0]!), "utf-8")) as ChatMessage;
    expect(m.body).toBe("via-singleton");
  });
});
