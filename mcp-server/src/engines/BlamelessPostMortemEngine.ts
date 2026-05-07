/**
 * BlamelessPostMortemEngine (U-LPR-INCIDENT-PMORT, Delivery B6)
 *
 * Enforced blameless-post-mortem tracker for wet-run incidents. Consumes
 * an abort_event (or any operator-filed incident) and drives the
 * post-mortem through a strict lifecycle so nothing falls off: every
 * SEV1 must have a complete post-mortem BEFORE pilot → production is
 * eligible (see PilotPhaseExitGateEngine's prod gate).
 *
 * Lifecycle:
 *
 *   draft        — first filed, author still gathering facts
 *   ready        — five-why filled in, action items proposed,
 *                  author believes it is ready for review
 *   in_review    — reviewer assigned, awaiting feedback
 *   revisions    — reviewer asked for changes
 *   closed       — reviewer accepted; all action items must either be
 *                  'done' or explicitly deferred with an owner + due
 *
 * Enforcement at close():
 *   - severity ∈ {sev1, sev2, sev3}
 *   - incident_summary ≥120 chars (enough to reconstruct what happened)
 *   - exactly 5 "why" entries, each ≥20 chars (Toyota 5-Why discipline)
 *   - ≥ 1 contributing_factor + ≥ 1 action_item
 *   - every action_item either done OR has owner + due_ts ≥ close_ts
 *   - no blame-names in incident_summary or whys (blameless language
 *     enforcement: operator/"who" references flagged)
 *   - reviewer !== author (four-eyes principle)
 *
 * Action-item tracking:
 *   - each item has {id, title, owner, status, due_ts}
 *   - statuses: open → in_progress → done | deferred
 *   - setActionItemStatus() records history + who_changed_by
 *
 * openSEV1Count() exposes the count of open/in-progress/draft post-
 * mortems of severity sev1 — this is the number the PilotExitGate
 * reads as open_sev1_incidents.
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/POSTMORTEMS.json` (schemaVersion 1).
 */

export type PMSeverity = "sev1" | "sev2" | "sev3";

export type PMStatus =
  | "draft"
  | "ready"
  | "in_review"
  | "revisions"
  | "closed";

export type ActionItemStatus = "open" | "in_progress" | "done" | "deferred";

export interface ActionItem {
  id: string;
  title: string;
  owner: string;
  status: ActionItemStatus;
  due_ts: number;              // epoch ms
  created_at: number;
  last_changed_at: number;
  last_changed_by: string;
  deferred_reason?: string;
}

export interface Why {
  level: 1 | 2 | 3 | 4 | 5;
  text: string;
}

export interface PostMortemDraft {
  pmid: string;
  session_id: string;           // reference to WetRunSessionLogEngine
  severity: PMSeverity;
  author: string;
  filed_at: number;
  incident_summary: string;
  whys: Why[];
  contributing_factors: string[];
  action_items: ActionItem[];
}

export interface PostMortemRecord extends PostMortemDraft {
  status: PMStatus;
  reviewer?: string;
  reviewed_at?: number;
  revision_count: number;
  closed_at?: number;
  closed_by?: string;
}

export interface CloseVerdict {
  ok: boolean;
  gaps: string[];
}

const BLAME_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bhe\b/i, label: "he" },
  { re: /\bshe\b/i, label: "she" },
  { re: /\bhis\b/i, label: "his" },
  { re: /\bher\b/i, label: "her" },
  { re: /they were at fault/i, label: "they were at fault" },
  { re: /operator error/i, label: "operator error" },
  { re: /\bfault of\b/i, label: "fault of" },
  { re: /\bblamed\b/i, label: "blamed" },
  { re: /\bnegligent\b/i, label: "negligent" },
  { re: /\bincompetent\b/i, label: "incompetent" },
];

export class BlamelessPostMortemEngine {
  private pms = new Map<string, PostMortemRecord>();

  file(input: PostMortemDraft): PostMortemRecord {
    if (!input.pmid.trim()) throw new Error("pmid required");
    if (!input.session_id.trim()) throw new Error("session_id required");
    if (!input.author.trim()) throw new Error("author required");
    if (!["sev1", "sev2", "sev3"].includes(input.severity)) {
      throw new Error("severity must be sev1|sev2|sev3");
    }
    if (!Number.isFinite(input.filed_at) || input.filed_at <= 0) {
      throw new Error("filed_at must be a positive epoch-ms");
    }
    if (this.pms.has(input.pmid)) {
      throw new Error(`post-mortem ${input.pmid} already filed`);
    }
    const rec: PostMortemRecord = {
      ...input,
      pmid: input.pmid.trim(),
      author: input.author.trim(),
      incident_summary: input.incident_summary.trim(),
      whys: input.whys.map((w) => ({ ...w, text: w.text.trim() })),
      contributing_factors: input.contributing_factors.map((f) => f.trim()),
      action_items: input.action_items.map((a) => ({ ...a })),
      status: "draft",
      revision_count: 0,
    };
    this.pms.set(rec.pmid, rec);
    return this.snapshot(rec);
  }

  markReady(pmid: string): PostMortemRecord {
    const pm = this.mustFind(pmid);
    if (pm.status !== "draft" && pm.status !== "revisions") {
      throw new Error(
        `can only markReady from draft or revisions; current=${pm.status}`,
      );
    }
    pm.status = "ready";
    return this.snapshot(pm);
  }

  assignReviewer(pmid: string, reviewer: string, at: number): PostMortemRecord {
    const pm = this.mustFind(pmid);
    if (pm.status !== "ready") {
      throw new Error(`reviewer can only be assigned from status=ready`);
    }
    if (!reviewer.trim()) throw new Error("reviewer required");
    if (reviewer.trim() === pm.author) {
      throw new Error("reviewer must differ from author (four-eyes)");
    }
    pm.reviewer = reviewer.trim();
    pm.reviewed_at = at;
    pm.status = "in_review";
    return this.snapshot(pm);
  }

  requestRevisions(pmid: string): PostMortemRecord {
    const pm = this.mustFind(pmid);
    if (pm.status !== "in_review") {
      throw new Error(`can only request revisions from in_review`);
    }
    pm.status = "revisions";
    pm.revision_count += 1;
    return this.snapshot(pm);
  }

  /** Dry-run gate check — returns the list of reasons close() would reject. */
  canClose(pmid: string, close_ts: number): CloseVerdict {
    const pm = this.mustFind(pmid);
    const gaps: string[] = [];
    if (pm.status !== "in_review") {
      gaps.push(`status is ${pm.status}; must be in_review`);
    }
    if (pm.incident_summary.length < 120) {
      gaps.push(
        `incident_summary must be ≥120 chars (got ${pm.incident_summary.length})`,
      );
    }
    if (pm.whys.length !== 5) {
      gaps.push(`must have exactly 5 whys (got ${pm.whys.length})`);
    } else {
      const levels = pm.whys.map((w) => w.level).sort();
      if (levels.join(",") !== "1,2,3,4,5") {
        gaps.push("why levels must be exactly {1,2,3,4,5}");
      }
      for (const w of pm.whys) {
        if (w.text.length < 20) {
          gaps.push(`why level ${w.level} too short (<20 chars)`);
        }
      }
    }
    if (pm.contributing_factors.length < 1) {
      gaps.push("at least one contributing_factor required");
    }
    if (pm.action_items.length < 1) {
      gaps.push("at least one action_item required");
    }
    for (const ai of pm.action_items) {
      if (ai.status === "done") continue;
      if (ai.status === "deferred") {
        if (!ai.deferred_reason || ai.deferred_reason.trim().length < 30) {
          gaps.push(
            `action_item ${ai.id} deferred but deferred_reason <30 chars`,
          );
        }
        continue;
      }
      // open/in_progress items must have owner + future due_ts
      if (!ai.owner.trim()) {
        gaps.push(`action_item ${ai.id} missing owner`);
      }
      if (ai.due_ts < close_ts) {
        gaps.push(`action_item ${ai.id} due_ts already past at close`);
      }
    }
    const blameScan = this.scanBlame(pm);
    if (blameScan.length > 0) {
      gaps.push(`blameless language violated: ${blameScan.join("; ")}`);
    }
    return { ok: gaps.length === 0, gaps };
  }

  close(input: { pmid: string; closed_at: number; closed_by: string }): PostMortemRecord {
    const pm = this.mustFind(input.pmid);
    if (!input.closed_by.trim()) throw new Error("closed_by required");
    const verdict = this.canClose(input.pmid, input.closed_at);
    if (!verdict.ok) {
      throw new Error(`cannot close: ${verdict.gaps.join("; ")}`);
    }
    if (input.closed_by.trim() === pm.author) {
      throw new Error("closer must differ from author (four-eyes)");
    }
    pm.status = "closed";
    pm.closed_at = input.closed_at;
    pm.closed_by = input.closed_by.trim();
    return this.snapshot(pm);
  }

  setActionItemStatus(input: {
    pmid: string;
    action_item_id: string;
    status: ActionItemStatus;
    changed_at: number;
    changed_by: string;
    deferred_reason?: string;
  }): ActionItem {
    const pm = this.mustFind(input.pmid);
    const ai = pm.action_items.find((a) => a.id === input.action_item_id);
    if (!ai) throw new Error(`action_item ${input.action_item_id} not found`);
    if (!input.changed_by.trim()) throw new Error("changed_by required");
    if (input.status === "deferred") {
      if (!input.deferred_reason || input.deferred_reason.trim().length < 30) {
        throw new Error("deferred_reason must be ≥30 chars");
      }
      ai.deferred_reason = input.deferred_reason.trim();
    } else {
      ai.deferred_reason = undefined;
    }
    ai.status = input.status;
    ai.last_changed_at = input.changed_at;
    ai.last_changed_by = input.changed_by.trim();
    return { ...ai };
  }

  /** Count of sev1 post-mortems NOT yet closed — what PilotExitGate reads. */
  openSEV1Count(): number {
    let n = 0;
    for (const pm of this.pms.values()) {
      if (pm.severity === "sev1" && pm.status !== "closed") n += 1;
    }
    return n;
  }

  getPostMortem(pmid: string): PostMortemRecord | null {
    const pm = this.pms.get(pmid);
    return pm ? this.snapshot(pm) : null;
  }

  listPostMortems(filter?: {
    severity?: PMSeverity;
    status?: PMStatus;
  }): PostMortemRecord[] {
    const out: PostMortemRecord[] = [];
    for (const pm of this.pms.values()) {
      if (filter?.severity && pm.severity !== filter.severity) continue;
      if (filter?.status && pm.status !== filter.status) continue;
      out.push(this.snapshot(pm));
    }
    return out;
  }

  toSnapshot(): { schemaVersion: 1; post_mortems: PostMortemRecord[] } {
    return { schemaVersion: 1, post_mortems: this.listPostMortems() };
  }

  loadSnapshot(snap: {
    schemaVersion: number;
    post_mortems: PostMortemRecord[];
  }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.pms.clear();
    for (const pm of snap.post_mortems) {
      this.pms.set(pm.pmid, {
        ...pm,
        whys: pm.whys.map((w) => ({ ...w })),
        contributing_factors: [...pm.contributing_factors],
        action_items: pm.action_items.map((a) => ({ ...a })),
      });
    }
  }

  clearAll(): void {
    this.pms.clear();
  }

  private mustFind(pmid: string): PostMortemRecord {
    const pm = this.pms.get(pmid);
    if (!pm) throw new Error(`post-mortem ${pmid} not found`);
    return pm;
  }

  private scanBlame(pm: PostMortemRecord): string[] {
    const seen = new Set<string>();
    const texts = [pm.incident_summary, ...pm.whys.map((w) => w.text)];
    for (const txt of texts) {
      for (const p of BLAME_PATTERNS) {
        if (p.re.test(txt)) seen.add(`"${p.label}"`);
      }
    }
    return [...seen];
  }

  private snapshot(pm: PostMortemRecord): PostMortemRecord {
    return {
      ...pm,
      whys: pm.whys.map((w) => ({ ...w })),
      contributing_factors: [...pm.contributing_factors],
      action_items: pm.action_items.map((a) => ({ ...a })),
    };
  }
}

export const blamelessPostMortemEngine = new BlamelessPostMortemEngine();
