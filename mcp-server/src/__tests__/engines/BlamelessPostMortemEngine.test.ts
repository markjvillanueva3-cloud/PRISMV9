/**
 * BlamelessPostMortemEngine tests (U-LPR-INCIDENT-PMORT)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  BlamelessPostMortemEngine,
  type PostMortemDraft,
  type ActionItem,
  type Why,
} from "../../engines/BlamelessPostMortemEngine.js";

let eng: BlamelessPostMortemEngine;

const T0 = 1_000_000_000_000;
const DAY = 24 * 3600 * 1000;

const SUMMARY =
  "Spindle load exceeded 120% on block N150 during the third facing pass on the ALCOA-4512 pilot run. The controller alarmed and the operator triggered an e-stop before any crash occurred, but the tool edge showed chipping afterward requiring replacement.";

function why(level: 1 | 2 | 3 | 4 | 5, text: string): Why {
  return { level, text };
}

const GOOD_WHYS: Why[] = [
  why(1, "Spindle load spiked past 120 percent on block N150"),
  why(2, "Adaptive feed engine did not back off in time for thicker chip"),
  why(3, "Chip-load model was calibrated to nominal stock, not actual stock"),
  why(4, "Stock arrived over tolerance from the vendor without inspection flag"),
  why(5, "Receiving inspection plan lacked this stock-size check — gap in QMS"),
];

function ai(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "AI-1",
    title: "Add receiving-inspection check for bar stock OD",
    owner: "quality-lead",
    status: "open",
    due_ts: T0 + 30 * DAY,
    created_at: T0,
    last_changed_at: T0,
    last_changed_by: "author",
    ...overrides,
  };
}

function draft(overrides: Partial<PostMortemDraft> = {}): PostMortemDraft {
  return {
    pmid: "PM-2026-001",
    session_id: "SES-2026-04-19-01",
    severity: "sev1",
    author: "ops-lead",
    filed_at: T0,
    incident_summary: SUMMARY,
    whys: [...GOOD_WHYS],
    contributing_factors: ["stock out of tolerance", "adaptive feed lag"],
    action_items: [ai()],
    ...overrides,
  };
}

function advanceToReview(pmid = "PM-2026-001"): void {
  eng.markReady(pmid);
  eng.assignReviewer(pmid, "eng-director", T0 + 1 * DAY);
}

beforeEach(() => {
  eng = new BlamelessPostMortemEngine();
});

// ─────────────────────────────────────────────────────────
// file
// ─────────────────────────────────────────────────────────

describe("file", () => {
  it("creates a draft post-mortem", () => {
    const pm = eng.file(draft());
    expect(pm.status).toBe("draft");
    expect(pm.revision_count).toBe(0);
  });

  it("rejects duplicate pmid", () => {
    eng.file(draft());
    expect(() => eng.file(draft())).toThrow(/already filed/);
  });

  it("rejects empty author", () => {
    expect(() => eng.file(draft({ author: " " }))).toThrow(/author/);
  });

  it("rejects unknown severity", () => {
    expect(() =>
      eng.file({ ...draft(), severity: "critical" as unknown as "sev1" }),
    ).toThrow(/severity/);
  });

  it("rejects non-positive filed_at", () => {
    expect(() => eng.file(draft({ filed_at: 0 }))).toThrow(/filed_at/);
  });
});

// ─────────────────────────────────────────────────────────
// lifecycle transitions
// ─────────────────────────────────────────────────────────

describe("lifecycle", () => {
  beforeEach(() => {
    eng.file(draft());
  });

  it("draft → ready", () => {
    const pm = eng.markReady("PM-2026-001");
    expect(pm.status).toBe("ready");
  });

  it("rejects markReady from in_review", () => {
    advanceToReview();
    expect(() => eng.markReady("PM-2026-001")).toThrow(/draft or revisions/);
  });

  it("ready → in_review via assignReviewer", () => {
    eng.markReady("PM-2026-001");
    const pm = eng.assignReviewer("PM-2026-001", "eng-director", T0 + 1 * DAY);
    expect(pm.status).toBe("in_review");
    expect(pm.reviewer).toBe("eng-director");
  });

  it("four-eyes: reviewer cannot equal author", () => {
    eng.markReady("PM-2026-001");
    expect(() =>
      eng.assignReviewer("PM-2026-001", "ops-lead", T0 + 1 * DAY),
    ).toThrow(/four-eyes/);
  });

  it("rejects assignReviewer from non-ready status", () => {
    expect(() =>
      eng.assignReviewer("PM-2026-001", "eng-director", T0 + 1 * DAY),
    ).toThrow(/status=ready/);
  });

  it("requestRevisions bumps revision_count + returns to revisions status", () => {
    advanceToReview();
    const pm = eng.requestRevisions("PM-2026-001");
    expect(pm.status).toBe("revisions");
    expect(pm.revision_count).toBe(1);
  });

  it("rejects requestRevisions from non-in_review status", () => {
    expect(() => eng.requestRevisions("PM-2026-001")).toThrow(/in_review/);
  });

  it("revisions → ready re-transition increments revision counter only via requestRevisions", () => {
    advanceToReview();
    eng.requestRevisions("PM-2026-001");
    const pm = eng.markReady("PM-2026-001");
    expect(pm.status).toBe("ready");
    expect(pm.revision_count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────
// canClose — validation gates
// ─────────────────────────────────────────────────────────

describe("canClose", () => {
  it("passes on a well-formed SEV1 ready for close", () => {
    eng.file(draft());
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(true);
    expect(v.gaps).toEqual([]);
  });

  it("flags status != in_review", () => {
    eng.file(draft());
    const v = eng.canClose("PM-2026-001", T0 + 1 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /status/.test(g))).toBe(true);
  });

  it("flags short incident_summary", () => {
    eng.file(draft({ incident_summary: "too short" }));
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /incident_summary/.test(g))).toBe(true);
  });

  it("flags fewer than 5 whys", () => {
    eng.file(draft({ whys: GOOD_WHYS.slice(0, 3) }));
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /5 whys/.test(g))).toBe(true);
  });

  it("flags non-sequential why levels", () => {
    eng.file(
      draft({
        whys: [why(1, "a".repeat(25)), why(1, "a".repeat(25)), why(3, "a".repeat(25)), why(4, "a".repeat(25)), why(5, "a".repeat(25))],
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /1,2,3,4,5/.test(g))).toBe(true);
  });

  it("flags too-short why text", () => {
    eng.file(
      draft({
        whys: [why(1, "short"), why(2, "a".repeat(25)), why(3, "a".repeat(25)), why(4, "a".repeat(25)), why(5, "a".repeat(25))],
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /level 1 too short/.test(g))).toBe(true);
  });

  it("flags missing contributing_factors", () => {
    eng.file(draft({ contributing_factors: [] }));
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /contributing_factor/.test(g))).toBe(true);
  });

  it("flags missing action_items", () => {
    eng.file(draft({ action_items: [] }));
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /action_item/.test(g))).toBe(true);
  });

  it("flags action_item without owner", () => {
    eng.file(
      draft({
        action_items: [ai({ owner: " " })],
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /owner/.test(g))).toBe(true);
  });

  it("flags action_item due_ts in the past at close", () => {
    eng.file(
      draft({
        action_items: [ai({ due_ts: T0 - 1 * DAY })],
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /due_ts already past/.test(g))).toBe(true);
  });

  it("accepts deferred action_item with ≥30 char reason", () => {
    eng.file(
      draft({
        action_items: [
          ai({
            status: "deferred",
            deferred_reason:
              "Deferred to Q3 because the underlying vendor spec is being renegotiated.",
          }),
        ],
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(true);
  });

  it("flags deferred action_item with short reason", () => {
    eng.file(
      draft({
        action_items: [
          ai({ status: "deferred", deferred_reason: "short" }),
        ],
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /deferred_reason <30/.test(g))).toBe(true);
  });

  it("flags blameful language", () => {
    eng.file(
      draft({
        incident_summary:
          "The operator made an error and was at fault — he pushed the wrong button causing a large chip that damaged the insert before anyone could stop the machine from continuing to run.",
      }),
    );
    advanceToReview();
    const v = eng.canClose("PM-2026-001", T0 + 2 * DAY);
    expect(v.ok).toBe(false);
    expect(v.gaps.some((g) => /blameless/.test(g))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// close
// ─────────────────────────────────────────────────────────

describe("close", () => {
  beforeEach(() => {
    eng.file(draft());
    advanceToReview();
  });

  it("closes a well-formed PM", () => {
    const pm = eng.close({
      pmid: "PM-2026-001",
      closed_at: T0 + 2 * DAY,
      closed_by: "eng-director",
    });
    expect(pm.status).toBe("closed");
    expect(pm.closed_by).toBe("eng-director");
  });

  it("rejects close by author (four-eyes)", () => {
    expect(() =>
      eng.close({
        pmid: "PM-2026-001",
        closed_at: T0 + 2 * DAY,
        closed_by: "ops-lead",
      }),
    ).toThrow(/four-eyes/);
  });

  it("rejects close with empty closed_by", () => {
    expect(() =>
      eng.close({
        pmid: "PM-2026-001",
        closed_at: T0 + 2 * DAY,
        closed_by: " ",
      }),
    ).toThrow(/closed_by/);
  });

  it("surfaces gap details in error message", () => {
    eng.requestRevisions("PM-2026-001"); // take out of in_review
    expect(() =>
      eng.close({
        pmid: "PM-2026-001",
        closed_at: T0 + 2 * DAY,
        closed_by: "eng-director",
      }),
    ).toThrow(/status is revisions/);
  });
});

// ─────────────────────────────────────────────────────────
// setActionItemStatus
// ─────────────────────────────────────────────────────────

describe("setActionItemStatus", () => {
  beforeEach(() => {
    eng.file(draft());
  });

  it("advances open → in_progress", () => {
    const ai = eng.setActionItemStatus({
      pmid: "PM-2026-001",
      action_item_id: "AI-1",
      status: "in_progress",
      changed_at: T0 + 1 * DAY,
      changed_by: "quality-lead",
    });
    expect(ai.status).toBe("in_progress");
    expect(ai.last_changed_by).toBe("quality-lead");
  });

  it("defer requires ≥30 char reason", () => {
    expect(() =>
      eng.setActionItemStatus({
        pmid: "PM-2026-001",
        action_item_id: "AI-1",
        status: "deferred",
        changed_at: T0 + 1 * DAY,
        changed_by: "quality-lead",
        deferred_reason: "nope",
      }),
    ).toThrow(/deferred_reason/);
  });

  it("moving out of deferred clears deferred_reason", () => {
    eng.setActionItemStatus({
      pmid: "PM-2026-001",
      action_item_id: "AI-1",
      status: "deferred",
      changed_at: T0 + 1 * DAY,
      changed_by: "quality-lead",
      deferred_reason:
        "Deferred to Q3 because the underlying vendor spec is being renegotiated.",
    });
    const ai2 = eng.setActionItemStatus({
      pmid: "PM-2026-001",
      action_item_id: "AI-1",
      status: "in_progress",
      changed_at: T0 + 2 * DAY,
      changed_by: "quality-lead",
    });
    expect(ai2.deferred_reason).toBeUndefined();
  });

  it("rejects unknown action_item_id", () => {
    expect(() =>
      eng.setActionItemStatus({
        pmid: "PM-2026-001",
        action_item_id: "AI-NOPE",
        status: "done",
        changed_at: T0 + 1 * DAY,
        changed_by: "quality-lead",
      }),
    ).toThrow(/not found/);
  });

  it("rejects empty changed_by", () => {
    expect(() =>
      eng.setActionItemStatus({
        pmid: "PM-2026-001",
        action_item_id: "AI-1",
        status: "done",
        changed_at: T0 + 1 * DAY,
        changed_by: " ",
      }),
    ).toThrow(/changed_by/);
  });
});

// ─────────────────────────────────────────────────────────
// openSEV1Count + listing + snapshot
// ─────────────────────────────────────────────────────────

describe("openSEV1Count + listing", () => {
  it("counts open sev1 post-mortems", () => {
    eng.file(draft());
    eng.file(draft({ pmid: "PM-2026-002", severity: "sev2" }));
    expect(eng.openSEV1Count()).toBe(1);
  });

  it("closed sev1 does not count as open", () => {
    eng.file(draft());
    advanceToReview();
    eng.close({
      pmid: "PM-2026-001",
      closed_at: T0 + 2 * DAY,
      closed_by: "eng-director",
    });
    expect(eng.openSEV1Count()).toBe(0);
  });

  it("filters by severity + status", () => {
    eng.file(draft());
    eng.file(draft({ pmid: "PM-2026-002", severity: "sev3" }));
    expect(eng.listPostMortems({ severity: "sev1" })).toHaveLength(1);
    expect(eng.listPostMortems({ status: "draft" })).toHaveLength(2);
  });
});

describe("snapshot", () => {
  it("round-trips with schemaVersion 1", () => {
    eng.file(draft());
    advanceToReview();
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new BlamelessPostMortemEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.getPostMortem("PM-2026-001")?.status).toBe("in_review");
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, post_mortems: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("getPostMortem returns null when missing", () => {
    expect(eng.getPostMortem("nope")).toBeNull();
  });

  it("clearAll empties state", () => {
    eng.file(draft());
    eng.clearAll();
    expect(eng.listPostMortems()).toHaveLength(0);
  });
});
