/**
 * WebScrapeResultEngine — HCAP06 structured web-scrape result + ranking.
 *
 * Pure-core: caller drives the actual fetch (Playwright, fetch, etc.) and
 * supplies a ScrapeResponse — engine produces a typed `ScrapeStructure`
 * with derived per-block analysis (text density, link count, table count)
 * + a confidence-weighted block ranking.
 *
 * @module engines/WebScrapeResultEngine
 */

import { z } from "zod";

export const ScrapeBlockTypeSchema = z.enum(["heading", "paragraph", "list", "table", "link", "image", "other"]);
export type ScrapeBlockType = z.infer<typeof ScrapeBlockTypeSchema>;

export const ScrapeBlockSchema = z.object({
  index: z.number().int().min(0),
  type: ScrapeBlockTypeSchema,
  text: z.string().max(20_000),
  selector: z.string().max(500).optional(),
});
export type ScrapeBlock = z.infer<typeof ScrapeBlockSchema>;

export const ScrapeResponseSchema = z.object({
  url: z.string().min(1).max(1000),
  http_status: z.number().int().min(100).max(599),
  fetched_at: z.string().min(1),
  blocks: z.array(ScrapeBlockSchema).max(10_000),
});
export type ScrapeResponse = z.infer<typeof ScrapeResponseSchema>;

export interface ScrapeStructure {
  url: string;
  http_status: number;
  fetched_at: string;
  ok: boolean;
  block_count: number;
  heading_count: number;
  paragraph_count: number;
  link_count: number;
  table_count: number;
  total_text_chars: number;
  density: number;
}

export class WebScrapeResultEngine {
  static validateResponse(r: unknown): ScrapeResponse { return ScrapeResponseSchema.parse(r); }

  /** Analyze a scrape response into typed structure. */
  static analyze(response: ScrapeResponse): ScrapeStructure {
    ScrapeResponseSchema.parse(response);
    const ok = response.http_status >= 200 && response.http_status < 300;
    const block_count = response.blocks.length;
    const counter = (t: ScrapeBlockType) => response.blocks.filter((b) => b.type === t).length;
    const total_text_chars = response.blocks.reduce((s, b) => s + b.text.length, 0);
    const density = block_count === 0 ? 0 : total_text_chars / block_count;
    return {
      url: response.url,
      http_status: response.http_status,
      fetched_at: response.fetched_at,
      ok, block_count,
      heading_count: counter("heading"),
      paragraph_count: counter("paragraph"),
      link_count: counter("link"),
      table_count: counter("table"),
      total_text_chars, density,
    };
  }

  /** Rank blocks by length (proxy for information density); ties break by index ASC. */
  static rankByLength(blocks: readonly ScrapeBlock[], topK?: number): ScrapeBlock[] {
    const sorted = [...blocks].sort((a, b) => b.text.length - a.text.length || a.index - b.index);
    return typeof topK === "number" && topK > 0 ? sorted.slice(0, topK) : sorted;
  }

  static renderStructure(s: ScrapeStructure): string {
    const tag = s.ok ? "OK" : "ERR";
    return `[SCRAPE ${tag} ${s.http_status}] ${s.url} blocks=${s.block_count} (h${s.heading_count}/p${s.paragraph_count}/l${s.link_count}/t${s.table_count}) density=${s.density.toFixed(1)}`;
  }
}

export const webScrapeResultEngine = WebScrapeResultEngine;
