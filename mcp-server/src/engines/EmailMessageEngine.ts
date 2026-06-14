/**
 * EmailMessageEngine — HCAP09 RFC 5322 email message structural model.
 *
 * Pure-core: caller drives MIME parsing (mailparser, simple-parser, IMAP
 * fetch) and supplies a typed `RawEmailMessage` blob; engine validates +
 * normalizes to typed structure + derives thread/category metadata.
 *
 * @module engines/EmailMessageEngine
 */

import { z } from "zod";

export const EmailAddressSchema = z.object({
  email: z.string().min(3).max(320).regex(/.+@.+/, "must contain @"),
  name: z.string().max(120).optional(),
});
export type EmailAddress = z.infer<typeof EmailAddressSchema>;

export const RawEmailMessageSchema = z.object({
  message_id: z.string().min(1).max(255),
  from: EmailAddressSchema,
  to: z.array(EmailAddressSchema).min(1).max(100),
  cc: z.array(EmailAddressSchema).max(100).default([]),
  bcc: z.array(EmailAddressSchema).max(100).default([]),
  subject: z.string().max(500),
  body_text: z.string().max(200_000),
  body_html: z.string().max(1_000_000).optional(),
  sent_at: z.string().min(1),
  in_reply_to: z.string().max(255).optional(),
  attachments_count: z.number().int().min(0).max(100),
});
export type RawEmailMessage = z.infer<typeof RawEmailMessageSchema>;

export interface EmailStructure extends RawEmailMessage {
  recipient_count: number;
  has_html: boolean;
  has_attachments: boolean;
  is_reply: boolean;
  thread_root_id: string;
  category: "automated" | "personal" | "reply" | "bulk";
}

function categorize(m: RawEmailMessage): EmailStructure["category"] {
  const fromLower = m.from.email.toLowerCase();
  if (/no-?reply|noreply|donotreply|notifications?@|alerts?@/.test(fromLower)) return "automated";
  if (m.in_reply_to) return "reply";
  const totalRecipients = m.to.length + m.cc.length + m.bcc.length;
  if (totalRecipients > 5) return "bulk";
  return "personal";
}

export class EmailMessageEngine {
  static validate(m: unknown): RawEmailMessage { return RawEmailMessageSchema.parse(m); }

  static analyze(raw: RawEmailMessage): EmailStructure {
    const m = RawEmailMessageSchema.parse(raw);
    return {
      ...m,
      recipient_count: m.to.length + m.cc.length + m.bcc.length,
      has_html: m.body_html !== undefined && m.body_html.length > 0,
      has_attachments: m.attachments_count > 0,
      is_reply: m.in_reply_to !== undefined,
      thread_root_id: m.in_reply_to ?? m.message_id,
      category: categorize(m),
    };
  }

  /** Compare two messages for likely-same-thread membership. */
  static sameThread(a: EmailStructure, b: EmailStructure): boolean {
    return a.thread_root_id === b.thread_root_id;
  }

  static renderStructure(s: EmailStructure): string {
    return `[EMAIL ${s.message_id}] from=${s.from.email} → ${s.recipient_count} recipients · ${s.category} · subject="${s.subject.slice(0, 60)}${s.subject.length > 60 ? "…" : ""}" attachments=${s.attachments_count}`;
  }
}

export const emailMessageEngine = EmailMessageEngine;
