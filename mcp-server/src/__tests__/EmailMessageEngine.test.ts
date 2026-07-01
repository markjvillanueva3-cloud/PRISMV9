/**
 * EmailMessageEngine tests — HCAP09.
 */
import { describe, it, expect } from "vitest";
import { EmailMessageEngine, type RawEmailMessage } from "../engines/EmailMessageEngine.js";

const ISO = "2026-05-24T13:00:00.000Z";

const msg = (over: Partial<RawEmailMessage> = {}): RawEmailMessage => ({
  message_id: "<msg1@example.com>",
  from: { email: "ops@example.com", name: "Ops" },
  to: [{ email: "user@example.com" }],
  cc: [], bcc: [],
  subject: "Test", body_text: "body",
  sent_at: ISO, attachments_count: 0,
  ...over,
});

describe("EmailMessageEngine.analyze — categorization", () => {
  it("classifies no-reply sender as 'automated'", () => {
    expect(EmailMessageEngine.analyze(msg({ from: { email: "noreply@github.com" } })).category).toBe("automated");
  });

  it("classifies notifications@ as 'automated'", () => {
    expect(EmailMessageEngine.analyze(msg({ from: { email: "notifications@github.com" } })).category).toBe("automated");
  });

  it("classifies in_reply_to as 'reply'", () => {
    expect(EmailMessageEngine.analyze(msg({ in_reply_to: "<prev@x>" })).category).toBe("reply");
  });

  it("classifies >5 recipients as 'bulk'", () => {
    const to = Array.from({ length: 7 }, (_, i) => ({ email: `u${i}@x.com` }));
    expect(EmailMessageEngine.analyze(msg({ to })).category).toBe("bulk");
  });

  it("classifies personal email as 'personal' (default)", () => {
    expect(EmailMessageEngine.analyze(msg()).category).toBe("personal");
  });
});

describe("EmailMessageEngine.analyze — derived fields", () => {
  it("recipient_count sums to + cc + bcc", () => {
    const s = EmailMessageEngine.analyze(msg({
      to: [{ email: "a@x.com" }, { email: "b@x.com" }],
      cc: [{ email: "c@x.com" }],
      bcc: [{ email: "d@x.com" }, { email: "e@x.com" }],
    }));
    expect(s.recipient_count).toBe(5);
  });

  it("has_html=true only when body_html is non-empty", () => {
    expect(EmailMessageEngine.analyze(msg()).has_html).toBe(false);
    expect(EmailMessageEngine.analyze(msg({ body_html: "<p>x</p>" })).has_html).toBe(true);
  });

  it("has_attachments derived from count > 0", () => {
    expect(EmailMessageEngine.analyze(msg({ attachments_count: 0 })).has_attachments).toBe(false);
    expect(EmailMessageEngine.analyze(msg({ attachments_count: 3 })).has_attachments).toBe(true);
  });

  it("thread_root_id falls back to message_id when no in_reply_to", () => {
    const s = EmailMessageEngine.analyze(msg());
    expect(s.thread_root_id).toBe("<msg1@example.com>");
    expect(s.is_reply).toBe(false);
  });

  it("thread_root_id = in_reply_to when present", () => {
    const s = EmailMessageEngine.analyze(msg({ in_reply_to: "<root@example.com>" }));
    expect(s.thread_root_id).toBe("<root@example.com>");
    expect(s.is_reply).toBe(true);
  });
});

describe("EmailMessageEngine — validation + util", () => {
  it("rejects from.email lacking @ (zod regex)", () => {
    expect(() => EmailMessageEngine.analyze(msg({ from: { email: "invalid" } }))).toThrow();
  });

  it("rejects to: [] (zod min(1))", () => {
    expect(() => EmailMessageEngine.analyze(msg({ to: [] }))).toThrow();
  });

  it("sameThread returns true for two messages in same thread", () => {
    const a = EmailMessageEngine.analyze(msg({ message_id: "<a>" }));
    const b = EmailMessageEngine.analyze(msg({ message_id: "<b>", in_reply_to: "<a>" }));
    expect(EmailMessageEngine.sameThread(a, b)).toBe(true);
  });

  it("renderStructure shows from + recipient_count + category", () => {
    const md = EmailMessageEngine.renderStructure(EmailMessageEngine.analyze(msg()));
    expect(md.includes("<msg1@example.com>")).toBe(true);
    expect(md.includes("ops@example.com")).toBe(true);
    expect(md.includes("personal")).toBe(true);
  });
});
