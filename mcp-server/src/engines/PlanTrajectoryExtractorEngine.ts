/**
 * PlanTrajectoryExtractorEngine — extract decision trajectories from
 * `.claude/plans/*.md` files into structured records the CSM bridge can
 * search alongside per-DB memories.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U03.
 *
 * Pure functions; no fs I/O. The driver script
 * (scripts/ingest-plans-trajectories.mjs) reads files and feeds them in.
 *
 * @module engines/PlanTrajectoryExtractorEngine
 */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const H1_RE = /^#\s+(.+?)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const STATUS_HEAD_RE = /^(?:.*\b)?status\b\s*:?\s*(.+?)\s*$/i;
const DECISION_PREFIXES = [
  /^(?:we\s+)?(?:decided|chose|picked|will\s+use|going\s+with)\s+(?:to\s+)?(.+)/i,
  /^(?:we\s+)?(?:rejected|ruled\s+out|skipped|dropped)\s+(.+)/i,
  /^(?:option|choice|approach)\s*[:\-]\s*(.+)/i,
];
const MILESTONE_PREFIXES = [
  /^[-*]\s*\[\s*([xX ])\s*\]\s+(.+)/,
  /^[-*]\s*(✅|❌|⏳|🚧|✔)\s+(.+)/,
  /^[-*]\s*\b(DONE|TODO|FIXME|WIP|BLOCKED)\b\s*[:\-]?\s*(.+)/,
];
const MAX_SECTION_TITLE_LEN = 200;
const MAX_DECISION_LEN = 400;
const MAX_MILESTONE_LEN = 400;
const MAX_BODY_PREVIEW = 1000;
const MAX_ID_LEN = 80;
const STATUS_HEAD_SCAN_LINES = 30;

export type TrajectoryStatus =
  | "completed" | "in_progress" | "blocked" | "abandoned" | "unknown";

export type MilestoneState = "done" | "todo" | "wip" | "blocked";

export interface PlanDecision {
  kind: "chose" | "rejected" | "considered";
  text: string;
  section: string;
  line: number;
}

export interface PlanMilestone {
  state: MilestoneState;
  text: string;
  section: string;
  line: number;
}

export interface PlanSection {
  title: string;
  depth: number;
  bodyPreview: string;
  line: number;
}

export interface PlanTrajectory {
  id: string;
  title: string;
  status: TrajectoryStatus;
  createdISO: string;
  updatedISO: string;
  sections: PlanSection[];
  decisions: PlanDecision[];
  milestones: PlanMilestone[];
  body: string;
  source_path: string;
}

export class PlanTrajectoryExtractorEngine {
  parsePlan(rawMarkdown: string, sourcePath: string): PlanTrajectory {
    const traj: PlanTrajectory = {
      id: this.deriveId(sourcePath),
      title: "",
      status: "unknown",
      createdISO: "",
      updatedISO: "",
      sections: [],
      decisions: [],
      milestones: [],
      body: "",
      source_path: typeof sourcePath === "string" ? sourcePath.replace(/\\/g, "/") : "",
    };
    if (typeof rawMarkdown !== "string" || rawMarkdown.length === 0) {
      traj.title = traj.id || "(empty plan)";
      return traj;
    }

    let body = rawMarkdown;
    const fm = FRONTMATTER_RE.exec(rawMarkdown);
    if (fm) {
      const frontmatter = fm[1];
      const created = /^\s*created\s*:\s*(.+?)\s*$/im.exec(frontmatter);
      const updated = /^\s*updated\s*:\s*(.+?)\s*$/im.exec(frontmatter);
      if (created) traj.createdISO = this.safeISO(created[1]);
      if (updated) traj.updatedISO = this.safeISO(updated[1]);
      body = rawMarkdown.slice(fm[0].length);
    }
    traj.body = body;

    const lines = body.split(/\r?\n/);
    // Prefer ANY H1 in the document — this is the canonical title signal.
    // Falls back to the first non-empty line only when no H1 exists at all.
    for (const l of lines) {
      const h1 = H1_RE.exec(l.trim());
      if (h1) { traj.title = h1[1].slice(0, MAX_SECTION_TITLE_LEN); break; }
    }
    if (traj.title.length === 0) {
      for (const l of lines) {
        const t = l.trim();
        if (t.length === 0) continue;
        traj.title = t.slice(0, MAX_SECTION_TITLE_LEN);
        break;
      }
    }
    if (traj.title.length === 0) traj.title = traj.id || "(untitled plan)";

    const headTopMatches = lines.slice(0, STATUS_HEAD_SCAN_LINES)
      .map((l) => STATUS_HEAD_RE.exec(l.trim()))
      .filter(Boolean) as RegExpExecArray[];
    if (headTopMatches.length > 0) {
      traj.status = this.inferStatusFromText(headTopMatches[0][1]);
    }

    let currentSection = "";
    let currentSectionDepth = 0;
    let currentSectionStart = 0;
    let currentSectionLine = 0;

    const flushSection = (endIdx: number) => {
      if (currentSection.length === 0) return;
      const sectionLines = lines.slice(currentSectionStart + 1, endIdx);
      const bodyPreview = sectionLines.join("\n").trim().slice(0, MAX_BODY_PREVIEW);
      traj.sections.push({
        title: currentSection.slice(0, MAX_SECTION_TITLE_LEN),
        depth: currentSectionDepth,
        bodyPreview,
        line: currentSectionLine,
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      const lineNo = i + 1;
      const heading = HEADING_RE.exec(t);
      if (heading) {
        flushSection(i);
        currentSectionDepth = heading[1].length;
        currentSection = heading[2];
        currentSectionStart = i;
        currentSectionLine = lineNo;
        continue;
      }
      for (let p = 0; p < DECISION_PREFIXES.length; p++) {
        const m = DECISION_PREFIXES[p].exec(t);
        if (!m) continue;
        const kind: PlanDecision["kind"] = p === 0 ? "chose" : p === 1 ? "rejected" : "considered";
        traj.decisions.push({
          kind,
          text: m[1].slice(0, MAX_DECISION_LEN),
          section: currentSection.slice(0, MAX_SECTION_TITLE_LEN),
          line: lineNo,
        });
        break;
      }
      for (let p = 0; p < MILESTONE_PREFIXES.length; p++) {
        const m = MILESTONE_PREFIXES[p].exec(t);
        if (!m) continue;
        let state: MilestoneState;
        let text: string;
        if (p === 0) {
          state = m[1].toLowerCase() === "x" ? "done" : "todo";
          text = m[2];
        } else if (p === 1) {
          const emoji = m[1];
          state = (emoji === "✅" || emoji === "✔") ? "done"
                : emoji === "❌" ? "blocked"
                : "wip";
          text = m[2];
        } else {
          const word = m[1].toUpperCase();
          state = word === "DONE" ? "done"
                : word === "TODO" ? "todo"
                : word === "FIXME" || word === "WIP" ? "wip"
                : "blocked";
          text = m[2];
        }
        traj.milestones.push({
          state,
          text: text.slice(0, MAX_MILESTONE_LEN),
          section: currentSection.slice(0, MAX_SECTION_TITLE_LEN),
          line: lineNo,
        });
        break;
      }
    }
    flushSection(lines.length);

    if (traj.status === "unknown" && traj.milestones.length > 0) {
      traj.status = this.inferStatusFromMilestones(traj.milestones);
    }
    return traj;
  }

  summarize(trajectories: readonly PlanTrajectory[]): {
    totalPlans: number;
    byStatus: Record<TrajectoryStatus, number>;
    totalDecisions: number;
    totalMilestones: number;
    decisionsByKind: Record<PlanDecision["kind"], number>;
    milestonesByState: Record<MilestoneState, number>;
  } {
    const out = {
      totalPlans: 0,
      byStatus: { completed: 0, in_progress: 0, blocked: 0, abandoned: 0, unknown: 0 } as Record<TrajectoryStatus, number>,
      totalDecisions: 0,
      totalMilestones: 0,
      decisionsByKind: { chose: 0, rejected: 0, considered: 0 } as Record<PlanDecision["kind"], number>,
      milestonesByState: { done: 0, todo: 0, wip: 0, blocked: 0 } as Record<MilestoneState, number>,
    };
    if (!Array.isArray(trajectories)) return out;
    for (const t of trajectories) {
      if (!t || typeof t !== "object") continue;
      out.totalPlans++;
      const status = (t as PlanTrajectory).status;
      if (typeof status === "string" && status in out.byStatus) {
        out.byStatus[status as TrajectoryStatus]++;
      }
      const decs = (t as PlanTrajectory).decisions;
      if (Array.isArray(decs)) {
        for (const d of decs) {
          if (!d || typeof d !== "object") continue;
          out.totalDecisions++;
          const kind = (d as PlanDecision).kind;
          if (typeof kind === "string" && kind in out.decisionsByKind) {
            out.decisionsByKind[kind as PlanDecision["kind"]]++;
          }
        }
      }
      const ms = (t as PlanTrajectory).milestones;
      if (Array.isArray(ms)) {
        for (const m of ms) {
          if (!m || typeof m !== "object") continue;
          out.totalMilestones++;
          const state = (m as PlanMilestone).state;
          if (typeof state === "string" && state in out.milestonesByState) {
            out.milestonesByState[state as MilestoneState]++;
          }
        }
      }
    }
    return out;
  }

  deriveId(sourcePath: string): string {
    if (typeof sourcePath !== "string" || sourcePath.length === 0) return "";
    const norm = sourcePath.replace(/\\/g, "/");
    const fname = norm.split("/").pop() ?? "";
    return fname.replace(/\.md$/i, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_ID_LEN);
  }

  // ---- private helpers ----

  private safeISO(raw: string): string {
    const s = raw.trim().replace(/^["']|["']$/g, "");
    const t = Date.parse(s);
    if (!Number.isFinite(t)) return "";
    return new Date(t).toISOString();
  }

  private inferStatusFromText(t: string): TrajectoryStatus {
    const s = t.toLowerCase();
    if (/\b(done|completed|complete|shipped|landed)\b/.test(s)) return "completed";
    if (/\b(blocked|stalled)\b/.test(s)) return "blocked";
    if (/\b(abandoned|cancelled|canceled|dropped)\b/.test(s)) return "abandoned";
    if (/\b(in[\s-]?progress|wip|active|ongoing)\b/.test(s)) return "in_progress";
    return "unknown";
  }

  private inferStatusFromMilestones(ms: readonly PlanMilestone[]): TrajectoryStatus {
    let done = 0, todo = 0, wip = 0, blocked = 0;
    for (const m of ms) {
      if (m.state === "done") done++;
      else if (m.state === "todo") todo++;
      else if (m.state === "wip") wip++;
      else blocked++;
    }
    if (blocked > 0) return "blocked";
    if (wip > 0) return "in_progress";
    if (done > 0 && todo === 0) return "completed";
    if (todo > 0) return "in_progress";
    return "unknown";
  }
}

export const planTrajectoryExtractorEngine = new PlanTrajectoryExtractorEngine();
