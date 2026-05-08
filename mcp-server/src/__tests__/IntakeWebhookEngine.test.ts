/**
 * IntakeWebhookEngine.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK
 *
 * Security boundary tests for the personal-knowledge webhook ingest engine.
 * Each it() exercises one threat-model rule from the engine's preamble.
 *
 * 17 it() cases (envelope minimum 15).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import {
  IntakeWebhookEngine,
  intakeWebhookEngine,
  PAYLOAD_CAP_BYTES,
  RATE_LIMIT_MAX,
  TS_SKEW_MAX_MS,
  type IngestParams,
} from "../engines/IntakeWebhookEngine.js";

// Test-only HMAC key — never used in production. Read from env if set so
// CI can rotate, otherwise a deterministic fixture for offline runs.
const TEST_HMAC_KEY = process.env.IWE_TEST_KEY ?? "iwe-fixture-key-2026-not-prod";
const NOW = Date.UTC(2026, 4, 8, 12, 0, 0); // 2026-05-08 12:00 UTC

let tmpRoot: string;
let engine: IntakeWebhookEngine;

function sign(body: Buffer, key: string = TEST_HMAC_KEY): string {
  return createHmac("sha256", key).update(body).digest("hex");
}

function buildBody(content: string, extras: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({ content, ...extras }), "utf8");
}

function ingest(
  params: Partial<IngestParams> & { rawBody: Buffer },
  opts: Record<string, unknown> = {}
) {
  // Honor explicit `signature: undefined` — required by the missing-header test.
  const sigProvided = Object.prototype.hasOwnProperty.call(params, "signature");
  const fullParams: IngestParams = {
    rawBody: params.rawBody,
    signature: sigProvided ? params.signature : sign(params.rawBody),
    source: params.source ?? "manual",
  };
  return engine.ingest(fullParams, { secret: TEST_HMAC_KEY, now: NOW, inboxRoot: tmpRoot, ...opts });
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "iwe-test-"));
  engine = new IntakeWebhookEngine();
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("IntakeWebhookEngine — security boundaries", () => {
  it("valid HMAC + readwise + content writes file with verified frontmatter", () => {
    const body = buildBody("My highlight from a book.", { metadata: { book: "The Manager's Path", location: 42 } });
    const result = ingest({ rawBody: body, source: "readwise" });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.source).toBe("readwise");
    expect(typeof result.file).toBe("string");
    expect(existsSync(result.file ?? "")).toBe(true);
    const onDisk = readFileSync(result.file ?? "", "utf8");
    expect(onDisk.startsWith("---\nsource: readwise\n")).toBe(true);
    expect(onDisk.includes("ingested_at: 2026-05-08T12:00:00.000Z")).toBe(true);
    expect(onDisk.includes("signature_verified: true")).toBe(true);
    expect(onDisk.includes('book: "The Manager\'s Path"')).toBe(true);
    expect(onDisk.includes("location: 42")).toBe(true);
    expect(onDisk.includes("My highlight from a book.")).toBe(true);
  });

  it("invalid HMAC returns 401 and writes NOTHING to inbox", () => {
    const body = buildBody("Should not be persisted.");
    const result = ingest({
      rawBody: body,
      signature: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      source: "readwise",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(readdirSync(tmpRoot)).toEqual([]);
  });

  it("missing X-Intake-Signature header returns 401", () => {
    const body = buildBody("Unsigned attempt.");
    const result = ingest({ rawBody: body, signature: undefined, source: "readwise" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("HMAC compare is timing-safe — wrong-length signature does not crash", () => {
    const body = buildBody("Length mismatch attempt.");
    const result = ingest({ rawBody: body, signature: "abc123", source: "readwise" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("non-hex signature is rejected with 401, not a crash", () => {
    const body = buildBody("Garbage signature.");
    const result = ingest({ rawBody: body, signature: "not-hex-at-all-zzz", source: "readwise" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("'sha256=' prefix on signature is accepted", () => {
    const body = buildBody("Prefixed sig.");
    const sig = `sha256=${sign(body)}`;
    const result = ingest({ rawBody: body, signature: sig, source: "manual" });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it("61st request in same 60-second window returns 429 (rate limit)", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const body = buildBody(`burst ${i}`);
      const r = ingest({ rawBody: body, source: "readwise" }, { now: NOW + i });
      expect(r.status).toBe(200);
    }
    const overflow = buildBody("one too many");
    const r = ingest({ rawBody: overflow, source: "readwise" }, { now: NOW + RATE_LIMIT_MAX });
    expect(r.status).toBe(429);
  });

  it("rate limit is isolated per source — telegram saturation does not affect readwise quota", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      ingest({ rawBody: buildBody(`tg ${i}`), source: "telegram" }, { now: NOW + i });
    }
    const tgOverflow = ingest({ rawBody: buildBody("tg overflow"), source: "telegram" }, { now: NOW + RATE_LIMIT_MAX });
    expect(tgOverflow.status).toBe(429);
    const rwFresh = ingest({ rawBody: buildBody("rw fresh"), source: "readwise" }, { now: NOW + RATE_LIMIT_MAX });
    expect(rwFresh.status).toBe(200);
  });

  it("rate-limit window expires — request after 60s window passes again", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      ingest({ rawBody: buildBody(`b ${i}`), source: "rss" }, { now: NOW + i });
    }
    const blocked = ingest({ rawBody: buildBody("blocked"), source: "rss" }, { now: NOW + RATE_LIMIT_MAX });
    expect(blocked.status).toBe(429);
    const later = ingest({ rawBody: buildBody("after window"), source: "rss" }, { now: NOW + 70_000 });
    expect(later.status).toBe(200);
  });

  it("payload exceeding 256 KB returns 413 BEFORE parsing JSON or checking signature", () => {
    const big = Buffer.alloc(PAYLOAD_CAP_BYTES + 1, 0x61);
    const result = ingest({ rawBody: big, signature: "anything", source: "readwise" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(413);
    expect(readdirSync(tmpRoot)).toEqual([]);
  });

  it("payload at exactly the cap is accepted", () => {
    const wrapper = JSON.stringify({ content: "" });
    const padding = "x".repeat(PAYLOAD_CAP_BYTES - wrapper.length);
    const body = Buffer.from(JSON.stringify({ content: padding }), "utf8");
    expect(body.length).toBeLessThanOrEqual(PAYLOAD_CAP_BYTES);
    const result = ingest({ rawBody: body, source: "manual" });
    expect(result.status).toBe(200);
  });

  it("unknown source value returns 400 and rejects path-traversal attempts up front", () => {
    const body = buildBody("Trying to escape.");
    const result = ingest({ rawBody: body, source: "../etc/passwd" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(readdirSync(tmpRoot)).toEqual([]);
  });

  it("malformed JSON body returns 400", () => {
    const body = Buffer.from("{not valid json", "utf8");
    const result = ingest({ rawBody: body, source: "manual" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("body that parses to a JSON array (not object) returns 400", () => {
    const body = Buffer.from("[1,2,3]", "utf8");
    const result = ingest({ rawBody: body, source: "manual" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("empty content (whitespace-only) returns 400", () => {
    const body = buildBody("   \n\t  ");
    const result = ingest({ rawBody: body, source: "manual" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("unicode content (non-Latin + emoji) is preserved on disk", () => {
    const text = "日本語テスト 🛠️ ñoño café";
    const body = buildBody(text);
    const result = ingest({ rawBody: body, source: "manual" });
    expect(result.status).toBe(200);
    expect(readFileSync(result.file ?? "", "utf8").includes(text)).toBe(true);
  });

  it("HMAC must match the EXACT raw body bytes — re-stringifying JSON would break verification", () => {
    const obj = { content: "Spaces matter for HMAC.", metadata: { a: 1 } };
    const tightBody = Buffer.from(JSON.stringify(obj), "utf8");
    const looseBody = Buffer.from(JSON.stringify(obj, null, 2), "utf8");
    const sig = sign(tightBody);
    const r1 = engine.ingest(
      { rawBody: tightBody, signature: sig, source: "manual" },
      { secret: TEST_HMAC_KEY, now: NOW, inboxRoot: tmpRoot }
    );
    expect(r1.status).toBe(200);
    const r2 = engine.ingest(
      { rawBody: looseBody, signature: sig, source: "manual" },
      { secret: TEST_HMAC_KEY, now: NOW + 1, inboxRoot: tmpRoot }
    );
    expect(r2.status).toBe(401);
  });

  it("payload.timestamp outside ±5min skew window returns 401 (anti-replay)", () => {
    const stale = buildBody("Old replay attempt.", { timestamp: NOW - TS_SKEW_MAX_MS - 1 });
    const result = ingest({ rawBody: stale, source: "manual" });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("payload.timestamp inside ±5min window is accepted", () => {
    const fresh = buildBody("Fresh request.", { timestamp: NOW - 60_000 });
    const result = ingest({ rawBody: fresh, source: "manual" });
    expect(result.status).toBe(200);
  });

  it("singleton intakeWebhookEngine and a fresh instance both succeed on a valid request", () => {
    const body = buildBody("Singleton check.");
    const r1 = engine.ingest(
      { rawBody: body, signature: sign(body), source: "manual" },
      { secret: TEST_HMAC_KEY, now: NOW, inboxRoot: tmpRoot }
    );
    const r2 = intakeWebhookEngine.ingest(
      { rawBody: body, signature: sign(body), source: "manual" },
      { secret: TEST_HMAC_KEY, now: NOW + 1, inboxRoot: tmpRoot }
    );
    intakeWebhookEngine.resetRateLimits();
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.source).toBe(r2.source);
  });
});
