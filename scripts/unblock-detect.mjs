#!/usr/bin/env node
// scripts/unblock-detect.mjs
//
// U-P5-MULTI-CHAT-UNBLOCK-DETECT — detect when a peer's commit unblocks a milestone.
//
// In the 12-chat PRISM fleet, milestones depend on other milestones (roadmap-index
// `dependencies[]` — an array of milestone-id strings). A chat blocked on milestone
// M is waiting for M's dependency milestones to finish — work done by PEER chats.
// This script reads roadmap-index.json, classifies every milestone DONE / READY /
// BLOCKED off the one-level dependency check, and cross-refs recent git commits
// (scoped `[MILESTONE-ID]` tags) so a chat can see "your blocker just shipped".
//
// One-level dependency check only (M is READY iff every DIRECT dep is DONE) — no
// recursion, so a dependency cycle cannot hang the classifier.
//
// Operator-invoked CLI (no hook wiring, per feedback_dont_wire_for_wiring_sake_2026_05_16);
// the natural caller is /checkin or /pick-unit. Read-only except writing its own
// containment-checked report file.
//
// Reuses the generic, scrutiny-passed utilities from the sibling goal-ship-report.mjs
// (inlineSafe / clip / writeFileAtomic / loadJson / resolveOutPath) rather than
// duplicating them — that file's isMain guard means importing it runs no main().
//
// CONSUMED SURFACE SHAPE (pin point — if the producer changes, update here):
//   roadmap-index.json → { milestones: [ { id, status, dependencies:[<id>...],
//                          total_units, completed_units } ] }
//
// Usage:
//   node scripts/unblock-detect.mjs [--milestone <id>] [--window N]
//                                   [--json] [--out <path>] [--frozen-time <iso>]
//
// Knobs (env): PRISM_ROOT (repo root override, for tests).

import * as path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

import { inlineSafe, clip, writeFileAtomic, loadJson, resolveOutPath } from "./goal-ship-report.mjs";

const REPO = process.env.PRISM_ROOT || "H:/prism";
const ROADMAP_REL = "mcp-server/data/roadmap-index.json";
const DEFAULT_OUT_REL = "state/shared/UNBLOCK-REPORT.md";
const DEFAULT_WINDOW = 80;
const MAX_WINDOW = 500;
const MAX_ROWS = 200; // cap the ready/blocked tables; overflow is flagged, not silent
const MAX_TITLE = 80;
const MAX_SUBJECT = 1000;
const SHA_LEN = 12;
const GIT_TIMEOUT_MS = 15000;
const MAX_GIT_BUFFER_BYTES = 8 * 1024 * 1024;

// A dependency milestone counts as "satisfied" (non-blocking) when its status is
// any of these. `superseded`/`consolidated` mean the work moved elsewhere — it no
// longer blocks. `ready` is NOT here: a dep that is merely ready (deps met but not
// built) has not shipped, so it still blocks its dependents.
const DONE_STATUSES = new Set(["complete", "completed", "consolidated", "superseded", "done"]);

// ───────────────────────── pure helpers (exported for test) ─────────────────────────

/**
 * A milestone is DONE when its status is terminal, OR every unit shipped
 * (total_units > 0 && completed_units >= total_units). Defensive against
 * non-object / missing-field input.
 */
export function isDone(m) {
  if (!m || typeof m !== "object") return false;
  if (DONE_STATUSES.has(String(m.status || "").toLowerCase())) return true;
  const total = Number(m.total_units);
  const done = Number(m.completed_units);
  return Number.isFinite(total) && total > 0 && Number.isFinite(done) && done >= total;
}

/**
 * Build an id → milestone Map from the roadmap-index milestones array.
 * Plain Map (not a bare object) — prototype-pollution-safe. Last entry wins
 * on a duplicate id (matches roadmap-index reconcile semantics).
 */
export function buildIndex(milestones) {
  const idx = new Map();
  if (!Array.isArray(milestones)) return idx;
  for (const m of milestones) {
    if (m && typeof m === "object" && typeof m.id === "string" && m.id) idx.set(m.id, m);
  }
  return idx;
}

// Extract every `[TAG]` bracket token from a commit subject (bounded length).
// A commit `[MAIN] [HOOK-SYNERGY-MS0]/U-X: t` yields ["MAIN","HOOK-SYNERGY-MS0"].
const SCOPE_RE = /\[([A-Za-z0-9._-]+)\]/g;

/** @returns {string[]} all bracket-tag tokens in the subject. */
export function parseScopes(subject) {
  const s = String(subject ?? "").slice(0, MAX_SUBJECT);
  const out = [];
  let m;
  SCOPE_RE.lastIndex = 0;
  while ((m = SCOPE_RE.exec(s)) !== null) out.push(m[1]);
  return out;
}

/**
 * One-level classification of a milestone against the index.
 * @returns {{id,status,state,deps:string[],blockedBy:string[],missingDeps:string[]}}
 *   state: "done" | "ready" | "blocked"
 */
export function classifyMilestone(m, index) {
  const id = m && typeof m.id === "string" ? m.id : "(unknown)";
  const status = m && m.status != null ? String(m.status) : "(none)";
  const deps = Array.isArray(m && m.dependencies)
    ? m.dependencies.filter((d) => typeof d === "string" && d)
    : [];
  // A DONE milestone needs no unblock analysis, but still report its dep list
  // (focus mode surfaces it) — only blockedBy/missingDeps are moot when done.
  if (isDone(m)) return { id, status, state: "done", deps, blockedBy: [], missingDeps: [] };
  const missingDeps = [];
  const blockedBy = [];
  for (const d of deps) {
    const dm = index.get(d);
    if (!dm) {
      // A dependency id absent from the index cannot be confirmed done →
      // conservatively treat it as a blocker (and flag it as unresolved).
      missingDeps.push(d);
      blockedBy.push(d);
    } else if (!isDone(dm)) {
      blockedBy.push(d);
    }
  }
  return {
    id,
    status,
    state: blockedBy.length > 0 ? "blocked" : "ready",
    deps,
    blockedBy,
    missingDeps,
  };
}

/**
 * Map each id in `ids` to its most-recent scoped commit, or null.
 * `commits` is newest-first; the first commit tagged with an id wins.
 * @returns {Map<string,{sha:string,dateISO:string,subject:string}|null>}
 */
export function scanScopedActivity(commits, ids) {
  const want = ids instanceof Set ? ids : new Set(Array.isArray(ids) ? ids : []);
  const hit = new Map();
  for (const id of want) hit.set(id, null);
  for (const c of Array.isArray(commits) ? commits : []) {
    if (!c || typeof c !== "object") continue;
    for (const tag of parseScopes(c.subject)) {
      if (want.has(tag) && hit.get(tag) === null) {
        hit.set(tag, {
          sha: typeof c.sha === "string" ? c.sha.slice(0, SHA_LEN) : "",
          dateISO: typeof c.dateISO === "string" ? c.dateISO : "",
          subject: typeof c.subject === "string" ? c.subject : "",
        });
      }
    }
  }
  return hit;
}

/**
 * Core pure pipeline: milestones + commits → unblock report payload.
 * Focus mode (focusMilestone set) answers "is milestone M unblocked, and on what
 * is it waiting?". Fleet mode lists every READY milestone (deps satisfied, not
 * done — actionable pickup candidates) and flags those a recent commit unblocked.
 * @returns {{markdown:string, json:object}}
 */
export function buildUnblockReport({
  milestones = [],
  commits = [],
  gitOk = true,
  focusMilestone = null,
  window = DEFAULT_WINDOW,
  generatedAt = new Date().toISOString(),
} = {}) {
  const index = buildIndex(milestones);

  const L = [];
  L.push(`# Unblock Report — ${inlineSafe(generatedAt)}`);
  L.push("");
  L.push(
    "_Auto-generated by `scripts/unblock-detect.mjs`. Milestone dependency graph " +
      "(`roadmap-index.json`) × recent `git log` scoped commits._"
  );
  L.push("");
  if (!gitOk) {
    L.push(
      "> ⚠ `git log` was unavailable — recent-activity / newly-unblocked signals are " +
        "omitted. Dependency classification (READY/BLOCKED) is unaffected."
    );
    L.push("");
  }

  let json;

  if (focusMilestone) {
    // ── focus mode ──
    const m = index.get(focusMilestone);
    if (!m) {
      L.push(`## Milestone \`${inlineSafe(focusMilestone)}\``);
      L.push("");
      L.push(`- — not found in \`roadmap-index.json\`. Verdict: **UNKNOWN**.`);
      L.push("");
      json = {
        schemaVersion: "1.0.0",
        generatedAt,
        mode: "focus",
        focusMilestone,
        verdict: "UNKNOWN",
        blockedBy: [],
      };
    } else {
      const cls = classifyMilestone(m, index);
      const verdict =
        cls.state === "done" ? "DONE" : cls.state === "ready" ? "READY" : "BLOCKED";
      // recent activity on the blockers (BLOCKED) or on the now-done deps (READY)
      const probeIds = new Set(cls.state === "blocked" ? cls.blockedBy : cls.deps);
      const activity = scanScopedActivity(commits, probeIds);

      L.push(`## Milestone \`${inlineSafe(cls.id)}\` — **${verdict}**`);
      L.push("");
      L.push(`- status: \`${inlineSafe(cls.status)}\` · ${cls.deps.length} dependency milestone(s)`);
      if (cls.state === "done") {
        L.push("- already DONE — nothing to unblock.");
      } else if (cls.state === "ready") {
        L.push("- every dependency milestone is DONE — this milestone is **actionable now**.");
        for (const d of cls.deps) {
          const a = activity.get(d);
          if (a && a.sha) {
            L.push(
              `  - dep \`${inlineSafe(d)}\` — recent commit \`${inlineSafe(a.sha)}\`` +
                (a.dateISO ? ` @ ${inlineSafe(a.dateISO)}` : "") +
                " (a peer may have just unblocked you)"
            );
          }
        }
      } else {
        L.push(`- BLOCKED on ${cls.blockedBy.length} dependency milestone(s):`);
        for (const d of cls.blockedBy) {
          const dm = index.get(d);
          const dStatus = dm ? String(dm.status) : "NOT IN roadmap-index";
          const a = activity.get(d);
          L.push(
            `  - \`${inlineSafe(d)}\` — status \`${inlineSafe(dStatus)}\`` +
              (a && a.sha
                ? ` · last commit \`${inlineSafe(a.sha)}\`${a.dateISO ? ` @ ${inlineSafe(a.dateISO)}` : ""} (in progress)`
                : " · no recent scoped commit")
          );
        }
      }
      L.push("");
      json = {
        schemaVersion: "1.0.0",
        generatedAt,
        mode: "focus",
        focusMilestone: cls.id,
        verdict,
        status: cls.status,
        deps: cls.deps,
        blockedBy: cls.blockedBy,
        missingDeps: cls.missingDeps,
      };
    }
  } else {
    // ── fleet mode ──
    const ready = [];
    const blocked = [];
    let done = 0;
    // iterate index.values() (deduped by id, last-wins) — not the raw milestones
    // array — so a duplicate-id milestone produces exactly one fleet row.
    for (const m of index.values()) {
      const cls = classifyMilestone(m, index);
      if (cls.state === "done") done++;
      else if (cls.state === "ready") ready.push({ cls, m });
      else blocked.push(cls);
    }
    // a READY milestone is "newly unblocked" if a dependency saw a recent commit
    const allDepIds = new Set();
    for (const { cls } of ready) for (const d of cls.deps) allDepIds.add(d);
    const activity = scanScopedActivity(commits, allDepIds);
    for (const r of ready) {
      r.newly = r.cls.deps.some((d) => {
        const a = activity.get(d);
        return a && a.sha;
      });
    }
    // newly-unblocked first, then by id, so the actionable rows surface at the top
    ready.sort((a, b) => {
      if (a.newly !== b.newly) return a.newly ? -1 : 1;
      return a.cls.id < b.cls.id ? -1 : a.cls.id > b.cls.id ? 1 : 0;
    });

    const rowsShown = ready.slice(0, MAX_ROWS);
    const truncated = ready.length > MAX_ROWS;
    // count over the SHOWN rows — the headline must not promise rows the table
    // does not display. `newly` rows sort first, so this equals the true total
    // unless newlyCount itself exceeds MAX_ROWS (not reachable for any real input).
    const newlyCount = rowsShown.filter((r) => r.newly).length;

    L.push(
      `## Fleet — ${ready.length} READY · ${blocked.length} BLOCKED · ${done} DONE`
    );
    L.push("");
    if (newlyCount > 0) {
      L.push(
        `**${newlyCount}** READY milestone(s) had a dependency commit in the last ` +
          `${window} commits — a peer likely just unblocked them.`
      );
      L.push("");
    }
    if (rowsShown.length === 0) {
      L.push("_No READY milestones — every not-done milestone is still blocked._");
    } else {
      L.push("| Milestone | Status | Deps | Recently unblocked | Title |");
      L.push("|-----------|--------|------|--------------------|-------|");
      for (const r of rowsShown) {
        L.push(
          `| ${inlineSafe(r.cls.id)} | \`${inlineSafe(r.cls.status)}\` | ${r.cls.deps.length} | ` +
            `${r.newly ? "⚡ yes" : "—"} | ${inlineSafe(clip(r.m.title, MAX_TITLE))} |`
        );
      }
    }
    if (truncated) {
      L.push("");
      L.push(`_… ${ready.length - MAX_ROWS} more READY milestone(s) not shown (row cap ${MAX_ROWS})._`);
    }
    L.push("");
    json = {
      schemaVersion: "1.0.0",
      generatedAt,
      mode: "fleet",
      window,
      counts: { ready: ready.length, blocked: blocked.length, done, newlyUnblocked: newlyCount },
      truncated,
      ready: rowsShown.map((r) => ({
        id: r.cls.id,
        status: r.cls.status,
        deps: r.cls.deps,
        newlyUnblocked: !!r.newly,
        title: typeof r.m.title === "string" ? r.m.title : "",
      })),
    };
  }

  return { markdown: L.join("\n"), json };
}

// ───────────────────────── I/O ─────────────────────────

/**
 * Pull the last `window` commits as {sha, dateISO, subject}.
 * @returns {{ok:boolean, commits:object[]}} — ok:false on ANY git failure (binary
 *   missing, not a repo, timeout, buffer overflow). ok distinguishes a genuine
 *   empty log from a failed scan so the report can say so (Karpathy R12).
 * Fields are tab-separated (git `%x09`); the subject may itself contain a tab, so
 * the first two tabs delimit and the remainder is the subject.
 */
export function gitLogScoped(repo, window) {
  try {
    const out = execFileSync(
      "git",
      ["-C", repo, "log", `-${window}`, "--pretty=format:%H%x09%cI%x09%s"],
      { encoding: "utf8", timeout: GIT_TIMEOUT_MS, maxBuffer: MAX_GIT_BUFFER_BYTES }
    );
    const commits = out
      .split(/\r?\n/)
      .map((line) => {
        if (!line) return null;
        const a = line.indexOf("\t");
        if (a < 0) return null;
        const b = line.indexOf("\t", a + 1);
        if (b < 0) return null;
        return { sha: line.slice(0, a), dateISO: line.slice(a + 1, b), subject: line.slice(b + 1) };
      })
      .filter(Boolean);
    return { ok: true, commits };
  } catch {
    return { ok: false, commits: [] };
  }
}

// ───────────────────────── CLI ─────────────────────────

export function parseArgs(argv) {
  const a = { milestone: null, window: DEFAULT_WINDOW, json: false, out: null, frozenTime: null };
  // A value-taking flag consumes the next token ONLY when it exists and is not
  // itself a `--flag` — so `--window --json` does not silently eat `--json`.
  const valueAt = (i) => {
    const nxt = argv[i + 1];
    return typeof nxt === "string" && !nxt.startsWith("--") ? nxt : null;
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--json") a.json = true;
    else if (t === "--milestone") {
      const v = valueAt(i);
      if (v !== null) { a.milestone = v; i++; }
    } else if (t === "--out") {
      const v = valueAt(i);
      if (v !== null) { a.out = v; i++; }
    } else if (t === "--frozen-time") {
      const v = valueAt(i);
      if (v !== null) { a.frozenTime = v; i++; }
    } else if (t === "--window") {
      const v = valueAt(i);
      if (v !== null) {
        i++;
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) a.window = Math.min(n, MAX_WINDOW);
      }
    }
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  // always pass a non-null outArg so resolveOutPath uses THIS script's default,
  // not goal-ship-report's.
  const { path: outPath, inside } = resolveOutPath(args.out || DEFAULT_OUT_REL, REPO);
  if (!inside && process.env.PRISM_GOAL_REPORT_ALLOW_ANY_OUT !== "1") {
    process.stderr.write(
      `unblock-detect: refusing --out outside the repo (${outPath}); ` +
        `set PRISM_GOAL_REPORT_ALLOW_ANY_OUT=1 to override.\n`
    );
    process.exit(2);
  }

  const roadmap = loadJson(path.join(REPO, ROADMAP_REL));
  const milestones = roadmap && Array.isArray(roadmap.milestones) ? roadmap.milestones : [];
  const git = gitLogScoped(REPO, args.window);
  const generatedAt = args.frozenTime || new Date().toISOString();

  if (milestones.length === 0) {
    process.stderr.write(
      `unblock-detect: roadmap-index.json missing, malformed, or has no milestones[] ` +
        `(${path.join(REPO, ROADMAP_REL)}).\n`
    );
    process.exit(2);
  }

  const report = buildUnblockReport({
    milestones,
    commits: git.commits,
    gitOk: git.ok,
    focusMilestone: args.milestone,
    window: args.window,
    generatedAt,
  });

  writeFileAtomic(outPath, report.markdown + "\n");

  if (args.json) {
    process.stdout.write(JSON.stringify({ ...report.json, outPath }, null, 2) + "\n");
  } else {
    const j = report.json;
    if (j.mode === "focus") {
      process.stdout.write(
        `unblock-detect → ${outPath}\n` +
          `  milestone ${j.focusMilestone}: ${j.verdict}` +
          (j.blockedBy && j.blockedBy.length ? ` (blocked on ${j.blockedBy.length})` : "") +
          "\n"
      );
    } else {
      const c = j.counts;
      process.stdout.write(
        `unblock-detect → ${outPath}\n` +
          `  ${c.ready} ready · ${c.blocked} blocked · ${c.done} done · ` +
          `${c.newlyUnblocked} newly unblocked\n`
      );
    }
  }
}

const isMain = (() => {
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] || "");
  } catch {
    return false;
  }
})();

if (isMain) main();
