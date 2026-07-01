/**
 * EmailPrintIntakeEngine tests (hotel iter24).
 *
 * Pure-engine — fake ImapAdapter + InMemoryArtifactSink + InMemoryDedupLedger
 * + fixed clock. Real-behavior assertions; no toBeDefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  EmailPrintIntakeEngine,
  InMemoryDedupLedger,
  InMemoryArtifactSink,
  isoWeekday,
  shouldRunOnDate,
  extensionOf,
  isPictureExtension,
  sha256Hex,
  buildOutputPath,
  PRINT_EXTENSIONS,
  TUESDAY_ISO,
  type ImapAdapter,
  type InboxConfig,
  type RawAttachment,
  type Clock,
} from "../engines/EmailPrintIntakeEngine.js";

function makeAttachment(opts: Partial<RawAttachment> & { filename: string; bytes?: Uint8Array }): RawAttachment {
  return {
    message_id: opts.message_id ?? `<msg-${Math.random()}@jmdie.com>`,
    from_email: opts.from_email ?? "customer@example.com",
    subject: opts.subject ?? "Updated print",
    filename: opts.filename,
    mime_type: opts.mime_type ?? "application/octet-stream",
    bytes: opts.bytes ?? new Uint8Array([1, 2, 3, 4]),
    received_at: opts.received_at ?? "2026-05-26T14:00:00.000Z",
  };
}

function fixedClock(d: Date): Clock {
  return { now: () => d };
}

describe("pure helpers", () => {
  it("isoWeekday matches ISO 8601 — Monday=1 .. Sunday=7", () => {
    // 2026-05-25 was a Monday (UTC)
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 25)))).toBe(1);
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 26)))).toBe(2); // Tue
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 27)))).toBe(3); // Wed
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 28)))).toBe(4); // Thu
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 29)))).toBe(5); // Fri
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 30)))).toBe(6); // Sat
    expect(isoWeekday(new Date(Date.UTC(2026, 4, 31)))).toBe(7); // Sun
  });

  it("shouldRunOnDate returns true ONLY on Tuesday", () => {
    expect(shouldRunOnDate(new Date(Date.UTC(2026, 4, 25)))).toBe(false); // Mon
    expect(shouldRunOnDate(new Date(Date.UTC(2026, 4, 26)))).toBe(true);  // Tue
    expect(shouldRunOnDate(new Date(Date.UTC(2026, 4, 27)))).toBe(false); // Wed
    expect(TUESDAY_ISO).toBe(2);
  });

  it("extensionOf is case-insensitive and rejects non-print extensions", () => {
    expect(extensionOf("drawing.PDF")).toBe("pdf");
    expect(extensionOf("part.STEP")).toBe("step");
    expect(extensionOf("photo.jpg")).toBe("jpg");
    expect(extensionOf("readme.txt")).toBeNull();
    expect(extensionOf("noext")).toBeNull();
    expect(extensionOf("trailing.")).toBeNull();
    expect(extensionOf(".hidden")).toBeNull();
  });

  it("PRINT_EXTENSIONS covers the operator's stated formats (PDF + pictures + CAD)", () => {
    expect(PRINT_EXTENSIONS).toContain("pdf");
    expect(PRINT_EXTENSIONS).toContain("png");
    expect(PRINT_EXTENSIONS).toContain("jpg");
    expect(PRINT_EXTENSIONS).toContain("jpeg");
    expect(PRINT_EXTENSIONS).toContain("step");
    expect(PRINT_EXTENSIONS).toContain("dwg");
    expect(PRINT_EXTENSIONS).toContain("dxf");
  });

  it("isPictureExtension flags only raster image formats", () => {
    expect(isPictureExtension("png")).toBe(true);
    expect(isPictureExtension("jpg")).toBe(true);
    expect(isPictureExtension("jpeg")).toBe(true);
    expect(isPictureExtension("tif")).toBe(true);
    expect(isPictureExtension("pdf")).toBe(false);
    expect(isPictureExtension("step")).toBe(false);
    expect(isPictureExtension("dwg")).toBe(false);
  });

  it("sha256Hex returns 64-hex-char deterministic digest", () => {
    const a = sha256Hex(new Uint8Array([1, 2, 3, 4]));
    const b = sha256Hex(new Uint8Array([1, 2, 3, 4]));
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    const c = sha256Hex(new Uint8Array([1, 2, 3, 5]));
    expect(c).not.toBe(a);
  });

  it("buildOutputPath produces filesystem-safe per-user paths", () => {
    const p = buildOutputPath(
      "user-vicky",
      "2026-05-26T14:00:00.000Z",
      "<msg-abc@example.com>",
      "drawing.pdf"
    );
    expect(p).toMatch(/^user-vicky\/2026-05-26\/msg-abc_example.com\/drawing\.pdf$/);
  });
});

describe("EmailPrintIntakeEngine — registerInbox", () => {
  let engine: EmailPrintIntakeEngine;
  let adapter: ImapAdapter;

  beforeEach(() => {
    adapter = { fetchPrintAttachments: async () => [] };
    engine = new EmailPrintIntakeEngine(
      adapter,
      new InMemoryArtifactSink(),
      new InMemoryDedupLedger(),
      fixedClock(new Date(Date.UTC(2026, 4, 26))) // Tuesday
    );
  });

  it("registers a valid inbox", () => {
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/var/prism/intake/vicky",
      pictures_allowed: true,
    });
    expect(engine.size().inboxes).toBe(1);
  });

  it("refuses missing @ in email_address", () => {
    expect(() =>
      engine.registerInbox({
        user_id: "user-bad",
        email_address: "no-at-sign",
        imap_host: "imap",
        imap_port: 993,
        use_tls: true,
        password_env_var: "X_PW",
        folder: "INBOX",
        search_since_days: 7,
        output_bucket: "/tmp",
        pictures_allowed: false,
      })
    ).toThrow(/invalid email_address/);
  });

  it("refuses a literal password masquerading as env var (whitespace / wrong shape)", () => {
    const base: InboxConfig = {
      user_id: "user-bad",
      email_address: "bad@jmdie.com",
      imap_host: "imap",
      imap_port: 993,
      use_tls: true,
      password_env_var: "MyActualPasswordHere",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp",
      pictures_allowed: false,
    };
    expect(() => engine.registerInbox(base)).toThrow(/UPPER_SNAKE/);
    expect(() => engine.registerInbox({ ...base, password_env_var: "my pw with space" })).toThrow(
      /whitespace|UPPER_SNAKE/
    );
    expect(() => engine.registerInbox({ ...base, password_env_var: "ab" })).toThrow(/UPPER_SNAKE/);
  });

  it("refuses out-of-range imap_port", () => {
    const base: InboxConfig = {
      user_id: "user-x",
      email_address: "x@jmdie.com",
      imap_host: "imap",
      imap_port: 70000,
      use_tls: true,
      password_env_var: "X_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp",
      pictures_allowed: false,
    };
    expect(() => engine.registerInbox(base)).toThrow(/invalid imap_port/);
  });

  it("refuses search_since_days outside 1..90", () => {
    const base = (days: number): InboxConfig => ({
      user_id: "user-x",
      email_address: "x@jmdie.com",
      imap_host: "imap",
      imap_port: 993,
      use_tls: true,
      password_env_var: "X_PW",
      folder: "INBOX",
      search_since_days: days,
      output_bucket: "/tmp",
      pictures_allowed: false,
    });
    expect(() => engine.registerInbox(base(0))).toThrow(/search_since_days/);
    expect(() => engine.registerInbox(base(91))).toThrow(/search_since_days/);
  });
});

describe("EmailPrintIntakeEngine — shouldRunNow + day-of-week gating", () => {
  it("runBatch returns no-op when not Tuesday and forceRunIgnoringTuesday=false", async () => {
    const monday = new Date(Date.UTC(2026, 4, 25));
    const engine = new EmailPrintIntakeEngine(
      { fetchPrintAttachments: async () => [] },
      new InMemoryArtifactSink(),
      new InMemoryDedupLedger(),
      fixedClock(monday)
    );
    expect(engine.shouldRunNow()).toBe(false);
    const result = await engine.runBatch();
    expect(result.is_tuesday).toBe(false);
    expect(result.total_users_attempted).toBe(0);
  });

  it("runBatch executes on Tuesday", async () => {
    const tuesday = new Date(Date.UTC(2026, 4, 26));
    const engine = new EmailPrintIntakeEngine(
      { fetchPrintAttachments: async () => [] },
      new InMemoryArtifactSink(),
      new InMemoryDedupLedger(),
      fixedClock(tuesday)
    );
    expect(engine.shouldRunNow()).toBe(true);
    const result = await engine.runBatch();
    expect(result.is_tuesday).toBe(true);
  });

  it("forceRunIgnoringTuesday overrides day check (manual ad-hoc run)", async () => {
    const wed = new Date(Date.UTC(2026, 4, 27));
    const engine = new EmailPrintIntakeEngine(
      { fetchPrintAttachments: async () => [] },
      new InMemoryArtifactSink(),
      new InMemoryDedupLedger(),
      fixedClock(wed)
    );
    const result = await engine.runBatch({ forceRunIgnoringTuesday: true });
    expect(result.is_tuesday).toBe(false);
    expect(result.total_users_attempted).toBe(0); // no inboxes registered
  });
});

describe("EmailPrintIntakeEngine — extraction + dedup", () => {
  let sink: InMemoryArtifactSink;
  let ledger: InMemoryDedupLedger;
  let engine: EmailPrintIntakeEngine;
  const tuesday = new Date(Date.UTC(2026, 4, 26));

  beforeEach(() => {
    sink = new InMemoryArtifactSink();
    ledger = new InMemoryDedupLedger();
    process.env.JM_DIE_VICKY_IMAP_PW = "fake-pw";
  });

  afterEach(() => {
    delete process.env.JM_DIE_VICKY_IMAP_PW;
  });

  it("extracts PDF + picture, writes to sink with correct sha256, records in ledger", async () => {
    const att1 = makeAttachment({
      filename: "drawing.pdf",
      bytes: new Uint8Array([10, 20, 30]),
      message_id: "<a@x>",
    });
    const att2 = makeAttachment({
      filename: "photo.jpg",
      bytes: new Uint8Array([40, 50, 60]),
      message_id: "<b@x>",
    });
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [att1, att2] };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    const result = await engine.runBatch();
    expect(result.is_tuesday).toBe(true);
    expect(result.total_extracted).toBe(2);
    expect(result.per_user[0].status).toBe("ok");
    expect(sink.persisted).toHaveLength(2);
    expect(sink.persisted[0].artifact.sha256).toBe(sha256Hex(new Uint8Array([10, 20, 30])));
    expect(sink.persisted[1].artifact.sha256).toBe(sha256Hex(new Uint8Array([40, 50, 60])));
    expect(ledger.size().messages).toBe(2);
    expect(ledger.size().shas).toBe(2);
  });

  it("skips pictures when pictures_allowed=false (PII gate)", async () => {
    const pdf = makeAttachment({ filename: "drawing.pdf", message_id: "<p1@x>" });
    const pic = makeAttachment({ filename: "photo.jpg", message_id: "<p2@x>" });
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [pdf, pic] };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: false,
    });

    const result = await engine.runBatch();
    expect(result.total_extracted).toBe(1);
    expect(sink.persisted).toHaveLength(1);
    expect(sink.persisted[0].artifact.filename).toBe("drawing.pdf");
  });

  it("dedups by message_id across consecutive runs", async () => {
    const att = makeAttachment({ filename: "drawing.pdf", message_id: "<dup@x>" });
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [att] };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    const r1 = await engine.runBatch();
    const r2 = await engine.runBatch();
    expect(r1.total_extracted).toBe(1);
    expect(r2.total_extracted).toBe(0);
    expect(r2.total_skipped_duplicates).toBe(1);
    expect(sink.persisted).toHaveLength(1);
  });

  it("dedups by SHA-256 across distinct emails (same drawing re-attached)", async () => {
    const att1 = makeAttachment({
      filename: "drawing.pdf",
      message_id: "<m1@x>",
      bytes: new Uint8Array([99, 100, 101]),
    });
    const att2 = makeAttachment({
      filename: "drawing-v2.pdf",            // different filename!
      message_id: "<m2@x>",                  // different message!
      bytes: new Uint8Array([99, 100, 101]), // same bytes
    });
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [att1, att2] };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    const result = await engine.runBatch();
    expect(result.total_extracted).toBe(1);
    expect(result.total_skipped_duplicates).toBe(1);
    expect(sink.persisted).toHaveLength(1);
  });

  it("missing env var → status='no_credentials', NOT a thrown error", async () => {
    delete process.env.JM_DIE_VICKY_IMAP_PW;
    const att = makeAttachment({ filename: "drawing.pdf" });
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [att] };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    const result = await engine.runBatch();
    expect(result.per_user[0].status).toBe("no_credentials");
    expect(result.total_extracted).toBe(0);
    expect(sink.persisted).toHaveLength(0);
  });

  it("adapter timeout → status='timeout', batch continues for other users", async () => {
    process.env.JM_DIE_MARK_IMAP_PW = "fake-pw-2";
    const failingAdapter: ImapAdapter = {
      fetchPrintAttachments: async (cfg) => {
        if (cfg.user_id === "user-vicky") {
          const err: Error & { code?: string } = new Error("IMAP fetch timeout");
          err.code = "TIMEOUT";
          throw err;
        }
        return [makeAttachment({ filename: "mark-drawing.pdf", message_id: "<m@x>" })];
      },
    };
    engine = new EmailPrintIntakeEngine(failingAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });
    engine.registerInbox({
      user_id: "user-mark",
      email_address: "mvillanueva@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_MARK_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/mark",
      pictures_allowed: false,
    });

    const result = await engine.runBatch();
    expect(result.per_user).toHaveLength(2);
    const vicky = result.per_user.find((r) => r.user_id === "user-vicky")!;
    const mark = result.per_user.find((r) => r.user_id === "user-mark")!;
    expect(vicky.status).toBe("timeout");
    expect(mark.status).toBe("ok");
    expect(mark.extracted).toBe(1);
    expect(result.total_extracted).toBe(1);

    delete process.env.JM_DIE_MARK_IMAP_PW;
  });

  it("empty inbox → status='ok', extracted=0 (fail-soft, never throws)", async () => {
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [] };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    const result = await engine.runBatch();
    expect(result.per_user[0].status).toBe("ok");
    expect(result.per_user[0].extracted).toBe(0);
    expect(result.per_user[0].skipped_duplicates).toBe(0);
  });

  it("adapter receives sinceISO derived from clock - search_since_days", async () => {
    let captured: { sinceISO: string } | null = null;
    const fakeAdapter: ImapAdapter = {
      fetchPrintAttachments: async (_cfg, opts) => {
        captured = { sinceISO: opts.sinceISO };
        return [];
      },
    };
    engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    await engine.runBatch();
    expect(captured).not.toBeNull();
    // 2026-05-26T00:00:00Z - 7 days = 2026-05-19T00:00:00Z
    expect(captured!.sinceISO).toBe("2026-05-19T00:00:00.000Z");
  });
});

describe("EmailPrintIntakeEngine — output path shape (multi-user)", () => {
  it("output_path is deterministic + user-namespaced + date-bucketed", async () => {
    process.env.JM_DIE_VICKY_IMAP_PW = "fake-pw";
    const tuesday = new Date(Date.UTC(2026, 4, 26));
    const sink = new InMemoryArtifactSink();
    const ledger = new InMemoryDedupLedger();
    const att = makeAttachment({
      filename: "PART-001.pdf",
      message_id: "<a@x>",
      received_at: "2026-05-26T14:30:00.000Z",
    });
    const fakeAdapter: ImapAdapter = { fetchPrintAttachments: async () => [att] };
    const engine = new EmailPrintIntakeEngine(fakeAdapter, sink, ledger, fixedClock(tuesday));
    engine.registerInbox({
      user_id: "user-vicky",
      email_address: "vicky@jmdie.com",
      imap_host: "imap.gmail.com",
      imap_port: 993,
      use_tls: true,
      password_env_var: "JM_DIE_VICKY_IMAP_PW",
      folder: "INBOX",
      search_since_days: 7,
      output_bucket: "/tmp/vicky",
      pictures_allowed: true,
    });

    await engine.runBatch();
    expect(sink.persisted[0].artifact.output_path).toBe(
      "user-vicky/2026-05-26/a_x/PART-001.pdf"
    );
    delete process.env.JM_DIE_VICKY_IMAP_PW;
  });
});
