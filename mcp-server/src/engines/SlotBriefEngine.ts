/**
 * SlotBriefEngine — the WRITE side of the targeted orchestrator→slot brief channel.
 *
 * The `.claude/hooks/slot-brief-inject.mjs` hook is the READ/deliver side: it surfaces
 * a queued brief into a slot's next prompt and consumes it (archives to _delivered/).
 * THIS engine is how the Hermes app (the slot-less ZULU master, via the `prism_context`
 * MCP surface) and any chat ISSUE a targeted work order to ONE slot.
 *
 * Symmetry: `ChatBusEngine.postMessage` is the BROADCAST writer; this is the TARGETED,
 * consume-once counterpart. Storage mirrors the hook exactly:
 *   - Queued:    state/shared/slot-briefs/<slot>.md   (one brief per slot at a time)
 *   - Delivered: state/shared/slot-briefs/_delivered/<slot>-<intMtimeMs>-<hash>.md
 * Briefs are transient runtime state (git-ignored); only the lane README is tracked.
 *
 * Root resolves via PATHS.STATE_DIR (honors PRISM_ROOT env, same as the hook) with a
 * constructor override for tests. Slot names are validated against the SAME alpha-only
 * guard the hook uses — slot keys become filename components, never built from
 * unvalidated input (path-traversal defense).
 *
 * @module SlotBriefEngine
 */

import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";

/** NATO alpha tokens only — matches slot-brief-inject.mjs's resolveSlot guard. */
const SLOT_RE = /^[a-z]+$/;

/**
 * The REPO-ROOT coordination lane — the EXACT dir `slot-brief-inject.mjs` reads
 * (its `process.env.PRISM_ROOT || "H:/prism"` + `state/shared/slot-briefs`). Hardcoded
 * absolute, mirroring `ChatBusEngine.CHAT_BUS_ROOT`, because `PATHS.STATE_DIR` resolves
 * to `mcp-server/state` inside the running MCP server process (cwd/__dirname-relative) —
 * a DIFFERENT lane the hook never reads. Using PATHS here silently broke the channel via
 * the MCP write path (briefs landed where no hook would deliver them). Override with
 * `PRISM_SLOT_BRIEFS_DIR` (portability) or the constructor `rootOverride` (tests).
 */
const SLOT_BRIEFS_ROOT = "H:/prism/state/shared/slot-briefs";

export interface WriteBriefInput {
  /** Target NATO slot (alpha..zulu). Validated against SLOT_RE. */
  slot: string;
  /** Markdown work-order body injected into the slot's next prompt. */
  body: string;
  /** Optional attribution — who issued the brief (e.g. "zulu", "hermes-app", "slot:bravo"). */
  from?: string;
}

export interface WriteBriefResult {
  written: boolean;
  slot: string;
  path: string | null;
  bytes: number;
  error: string | null;
}

export interface PendingBrief {
  slot: string;
  bytes: number;
  mtimeMs: number;
}

export interface DeliveredBrief {
  slot: string;
  file: string;
  bytes: number;
  mtimeMs: number;
}

export class SlotBriefEngine {
  private readonly briefsDir: string;
  private readonly deliveredDir: string;

  constructor(rootOverride?: string) {
    const base = rootOverride ?? process.env.PRISM_SLOT_BRIEFS_DIR ?? SLOT_BRIEFS_ROOT;
    this.briefsDir = base;
    this.deliveredDir = path.join(base, "_delivered");
  }

  /** Directory where briefs are queued (exposed for diagnostics). */
  get directory(): string {
    return this.briefsDir;
  }

  /**
   * Issue/replace the queued brief for a slot. Validates the slot name (filename
   * safety) + a non-empty body, then writes atomically. One brief per slot at a
   * time — a second write overwrites the prior pending brief (queue the next only
   * after the prior is consumed).
   */
  writeBrief(input: WriteBriefInput): WriteBriefResult {
    const slot = String(input?.slot ?? "").trim().toLowerCase();
    if (!SLOT_RE.test(slot)) {
      return { written: false, slot, path: null, bytes: 0, error: "invalid_slot (must match /^[a-z]+$/)" };
    }
    const body = String(input?.body ?? "");
    if (!body.trim()) {
      return { written: false, slot, path: null, bytes: 0, error: "empty_body" };
    }
    const from = String(input?.from ?? "").trim();
    // Prepend a provenance line when attribution is given. The hook injects the
    // whole body, so this audit line shows in the slot's context too.
    const content = from ? `> _brief from: ${from}_\n\n${body}` : body;
    const dest = path.join(this.briefsDir, `${slot}.md`);
    try {
      fs.mkdirSync(this.briefsDir, { recursive: true });
      safeWriteSync(dest, content);
      return { written: true, slot, path: dest, bytes: Buffer.byteLength(content, "utf8"), error: null };
    } catch (e: unknown) {
      return { written: false, slot, path: null, bytes: 0, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** List queued (undelivered) briefs — at most one per slot. Sorted by slot. */
  listPending(): PendingBrief[] {
    let names: string[];
    try {
      names = fs.readdirSync(this.briefsDir);
    } catch {
      return [];
    }
    const out: PendingBrief[] = [];
    for (const n of names) {
      if (!n.endsWith(".md") || n === "README.md") continue;
      const slot = n.slice(0, -3);
      if (!SLOT_RE.test(slot)) continue;
      try {
        const st = fs.statSync(path.join(this.briefsDir, n));
        if (st.isFile()) out.push({ slot, bytes: st.size, mtimeMs: Math.floor(st.mtimeMs) });
      } catch {
        /* skip unreadable entry */
      }
    }
    return out.sort((a, b) => a.slot.localeCompare(b.slot));
  }

  /** List delivered (archived) briefs, newest first; optionally filter by slot. */
  listDelivered(opts: { slot?: string; limit?: number } = {}): DeliveredBrief[] {
    let names: string[];
    try {
      names = fs.readdirSync(this.deliveredDir);
    } catch {
      return [];
    }
    const filterSlot = opts.slot ? String(opts.slot).trim().toLowerCase() : null;
    const out: DeliveredBrief[] = [];
    for (const n of names) {
      if (!n.endsWith(".md")) continue;
      // Archive name = <slot>-<intMtimeMs>-<hash>.md ; slot is alpha-only (no hyphens).
      const slot = n.split("-")[0];
      if (filterSlot && slot !== filterSlot) continue;
      try {
        const st = fs.statSync(path.join(this.deliveredDir, n));
        out.push({ slot, file: n, bytes: st.size, mtimeMs: Math.floor(st.mtimeMs) });
      } catch {
        /* skip unreadable entry */
      }
    }
    out.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const limit = Number.isFinite(opts.limit as number) && (opts.limit as number) > 0
      ? Math.floor(opts.limit as number)
      : 50;
    return out.slice(0, limit);
  }
}

/** Shared singleton wired into prism_context (slot_brief_write / slot_brief_list). */
export const slotBriefEngine = new SlotBriefEngine();
