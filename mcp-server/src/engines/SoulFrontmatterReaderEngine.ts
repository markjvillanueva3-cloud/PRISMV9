/**
 * SoulFrontmatterReaderEngine — HSE01 slot-soul YAML frontmatter reader.
 *
 * Pure-core: parses a `state/shared/slot-souls/<slot>.md` file (already
 * read from disk by the caller) into a typed SlotSoul object.  Filesystem
 * I/O is injected — the parsing is what's tested here.
 *
 * @module engines/SoulFrontmatterReaderEngine
 */

import { z } from "zod";

export const SlotSoulSchema = z.object({
  slot: z.string().min(1).max(60),
  role: z.string().min(1).max(120),
  voice: z.string().min(1).max(120),
  tone: z.string().min(1).max(120),
  escalation_path: z.string().max(500).optional(),
  refuse_list: z.array(z.string().min(1).max(120)).max(40),
  preferred_subagent_type: z.string().min(1).max(60).optional(),
  domain_filter: z.string().max(500).optional(),
  hermes_role: z.string().min(1).max(120),
  /** Body markdown after frontmatter — kept verbatim for the html renderer. */
  body: z.string().max(50_000),
});
export type SlotSoul = z.infer<typeof SlotSoulSchema>;

export interface ParseResult {
  ok: boolean;
  soul: SlotSoul | null;
  errors: string[];
}

export class SoulFrontmatterReaderEngine {
  /** Parse `source` (the full .md file contents) into a SlotSoul. */
  static parse(source: string, slotFromPath: string): ParseResult {
    if (typeof source !== "string") return { ok: false, soul: null, errors: ["source must be a string"] };
    if (typeof slotFromPath !== "string" || slotFromPath.length === 0) {
      return { ok: false, soul: null, errors: ["slotFromPath required"] };
    }

    const re = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const m = source.match(re);
    if (!m) return { ok: false, soul: null, errors: ["no frontmatter block found"] };

    const fmRaw = m[1];
    const body = m[2];

    // Minimal YAML parse — slot souls only ever use scalars + list-of-scalars.
    // Avoid pulling a YAML dep for a 8-field flat schema.
    const fields: Record<string, unknown> = {};
    const lines = fmRaw.split(/\r?\n/);
    let curList: string[] | null = null;
    let curListKey = "";
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, "");
      if (!line.length) continue;
      // List item under previous key.
      if (curList && /^\s{2,}-\s+/.test(line)) {
        const item = line.replace(/^\s*-\s+/, "").trim();
        if (item.length > 0) curList.push(item);
        continue;
      }
      const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1];
      let value = kv[2].trim();
      // Strip surrounding quotes.
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (value === "") {
        // Could be a list-key.
        curList = [];
        curListKey = key;
        fields[key] = curList;
      } else {
        fields[key] = value;
        curList = null;
        curListKey = "";
      }
    }

    // Promote slot from path if soul body doesn't carry it.
    if (!fields.slot) fields.slot = slotFromPath;
    if (!fields.refuse_list) fields.refuse_list = [];

    const out: Record<string, unknown> = { ...fields, body };
    try {
      const soul = SlotSoulSchema.parse(out);
      return { ok: true, soul, errors: [] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, soul: null, errors: [msg.slice(0, 500)] };
    }
  }

  static renderSummary(s: SlotSoul): string {
    return `[SOUL ${s.slot}] role=${s.role} refuses=${s.refuse_list.length} subagent=${s.preferred_subagent_type ?? "—"}`;
  }
}

export const soulFrontmatterReaderEngine = SoulFrontmatterReaderEngine;
