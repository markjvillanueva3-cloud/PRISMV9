/**
 * AutoPostmortemEngine
 * ====================
 *
 * OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE
 *
 * Detects "uncommitted-restart-after-failure" patterns from session
 * telemetry and produces a structured Markdown postmortem at
 * `knowledge/memories/mistakes/<YYYY-MM-DD>-<sig>.md`.
 *
 * Trigger contract (per envelope metric)
 * --------------------------------------
 *   Fires when >= 3 Stop events occur within a 5-minute rolling window AND
 *   the session has uncommitted-state (i.e. the user re-prompted after
 *   the assistant tried to stop, repeatedly, with files still dirty).
 *   A single Stop with uncommitted state is normal end-of-task; only the
 *   repeating pattern means something is failing-then-restarting.
 *
 * Determinism
 * -----------
 * The engine is pure-calculation: given identical inputs (events list,
 * uncommitted flag, error signature, last commits, now) it produces
 * byte-identical output. Filesystem I/O is gated by `apply: true`; the
 * default path returns the postmortem markdown without writing it.
 *
 * Idempotency
 * -----------
 * Postmortems key on a signature derived from the failure fingerprint
 * (error class + top-frame file + day). Re-running with the same signal
 * returns `action: "already-exists"` rather than re-writing — except in
 * `mode: "update"` which updates the existing file in place.
 *
 * False-positive guards (per envelope abort_criteria <5%)
 * ------------------------------------------------------
 *   - Stop count <3 -> no-op
 *   - No uncommitted state -> no-op (clean stop is success, not failure)
 *   - All stops within <2s of each other -> likely a click-storm not a
 *     real failure pattern -> no-op
 *   - Postmortem already exists for today's signature -> action='already-exists'
 *   - More than MAX_PER_DAY postmortems written today -> no-op
 *
 * @milestone OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE
 */

import { readdirSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

export interface StopEvent {
  /** ISO8601 timestamp of the stop attempt. */
  ts: string;
  /** Whether the session had uncommitted file changes at this stop. */
  uncommitted: boolean;
  /** Optional error signature carried by the stop reason (hook block, etc). */
  errorSig?: string;
  /** Optional list of files referenced in the failure context. */
  filesTouched?: string[];
}

export interface PostmortemTrigger {
  events: StopEvent[];
  /** Recent commit subjects (last N), most-recent first. */
  recentCommits: string[];
  /** Optional human-supplied error description. */
  errorDescription?: string;
  /** Optional scrutiny verdict from .claude/scripts/scrutiny-3way.mjs. */
  scrutinyVerdict?: "PASS" | "FAIL" | "MISSING";
  /** Override "now" for deterministic test runs. */
  now?: number;
}

export interface PostmortemOptions {
  /** Override the mistakes/ directory. Defaults to knowledge/memories/mistakes/. */
  mistakesDir?: string;
  /** When true, write the markdown file. Default false (dry-run). */
  apply?: boolean;
  /** "create" (default) or "update" if file already exists. */
  mode?: "create" | "update";
  /** Override now for deterministic tests. */
  now?: number;
}

export type PostmortemAction =
  | "wrote"
  | "would-write"
  | "already-exists"
  | "noop-too-few-stops"
  | "noop-clean-stops"
  | "noop-burst-too-tight"
  | "noop-day-cap-reached";

export interface PostmortemResult {
  action: PostmortemAction;
  /** Absolute path of the postmortem file (regardless of write status). */
  path: string;
  /** YYYY-MM-DD anchor. */
  date: string;
  /** Stable signature hash of the failure pattern. */
  signature: string;
  /** Markdown content (always returned, even when action=noop-*). */
  markdown: string;
  /** Reason the action was taken (human-readable). */
  reason: string;
}

const DEFAULT_MISTAKES_DIR = "H:/prism/knowledge/memories/mistakes";
const MIN_STOP_COUNT = 3;
const ROLLING_WINDOW_MS = 5 * 60 * 1000;
const MIN_BURST_SPREAD_MS = 2_000;
const MAX_POSTMORTEMS_PER_DAY = 10;
const SIG_PREFIX_LEN = 12;
const MAX_FILES_LISTED = 10;

function deriveSignature(events: StopEvent[], errorDescription?: string): string {
  const h = createHash("sha256");
  const sorted = [...events].sort((a, b) => a.ts.localeCompare(b.ts));
  const day = sorted[0]?.ts.slice(0, 10) ?? "unknown";
  h.update(day);
  for (const e of sorted) {
    h.update(e.errorSig ?? "");
    if (e.filesTouched) h.update(e.filesTouched[0] ?? "");
  }
  if (errorDescription) h.update(errorDescription);
  return h.digest("hex").slice(0, SIG_PREFIX_LEN);
}

function renderPostmortem(
  trigger: PostmortemTrigger,
  signature: string,
  date: string,
  nowIso: string,
): string {
  const sorted = [...trigger.events].sort((a, b) => a.ts.localeCompare(b.ts));
  const stopCount = sorted.length;
  const firstTs = sorted[0]?.ts ?? nowIso;
  const lastTs = sorted[sorted.length - 1]?.ts ?? nowIso;
  const spreadMs = Date.parse(lastTs) - Date.parse(firstTs);
  const uncommittedCount = sorted.filter((e) => e.uncommitted).length;

  const filesSet = new Set<string>();
  const sigSet = new Set<string>();
  for (const e of sorted) {
    for (const f of e.filesTouched ?? []) filesSet.add(f);
    if (e.errorSig) sigSet.add(e.errorSig);
  }
  const fileList = [...filesSet].slice(0, MAX_FILES_LISTED);

  const fm = [
    "---",
    "type: auto-postmortem",
    `signature: ${signature}`,
    `failure_date: ${date}`,
    `stop_count: ${stopCount}`,
    `window_spread_ms: ${spreadMs}`,
    `uncommitted_count: ${uncommittedCount}`,
    `scrutiny_verdict: ${trigger.scrutinyVerdict ?? "MISSING"}`,
    `generated_at: ${nowIso}`,
    "epistemic_only: true",
    "consumed_by_machining: false",
    "milestone: OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE",
    "---",
    "",
  ].join("\n");

  let body = `# Auto-Postmortem  ${date}  \`${signature}\`\n\n`;
  body += `_Auto-generated by AutoPostmortemEngine when ${stopCount} Stop events landed within ${Math.round(spreadMs / 1000)}s with uncommitted state. The vault talks back; it tells you when you keep crashing into the same wall._\n\n`;

  body += `## Context\n\n`;
  body += `- Failure window: \`${firstTs}\` -> \`${lastTs}\` (${stopCount} Stop events)\n`;
  body += `- Uncommitted state on ${uncommittedCount}/${stopCount} stops\n`;
  if (trigger.recentCommits.length > 0) {
    body += `- Last ${Math.min(3, trigger.recentCommits.length)} commits before failure:\n`;
    for (const c of trigger.recentCommits.slice(0, 3)) {
      body += `  - \`${c}\`\n`;
    }
  } else {
    body += `- No recent commits captured (session ledger empty).\n`;
  }
  body += "\n";

  body += `## Failure\n\n`;
  if (trigger.errorDescription) {
    body += `${trigger.errorDescription}\n\n`;
  } else if (sigSet.size > 0) {
    body += `Repeated failure signature${sigSet.size === 1 ? "" : "s"}:\n`;
    for (const s of sigSet) body += `- \`${s}\`\n`;
    body += "\n";
  } else {
    body += `(Stop reason was not captured in telemetry; check ERROR_LEARN_LEDGER.jsonl for the raw event.)\n\n`;
  }

  body += `## Root Cause\n\n`;
  body += `_To be filled in by the human reviewer. The engine cannot diagnose root cause from telemetry alone; that is your job._\n\n`;
  if (trigger.scrutinyVerdict === "FAIL") {
    body += `Scrutiny gate reported **FAIL**. Read the scrutiny ledger entry for this session for the multi-CLI consensus. The pattern is: scrutiny rejected the work, the assistant retried without addressing the rejection.\n\n`;
  } else if (trigger.scrutinyVerdict === "MISSING") {
    body += `No scrutiny verdict was recorded. The assistant attempted Stop ${stopCount} times without running the 3-of-3 scrutiny gate. The pattern is: trying to ship without consensus review.\n\n`;
  }

  body += `## Detection\n\n`;
  body += `Auto-detected by **AutoPostmortemEngine** (Stop hook \`auto-postmortem-on-failure-restart.mjs\`). Trigger criteria met:\n`;
  body += `- >= ${MIN_STOP_COUNT} Stop events in <= ${ROLLING_WINDOW_MS / 1000}s rolling window: ${stopCount} in ${Math.round(spreadMs / 1000)}s\n`;
  body += `- Uncommitted state on >= 1 stop: ${uncommittedCount}/${stopCount}\n`;
  body += `- Burst spread >= ${MIN_BURST_SPREAD_MS / 1000}s (not a click-storm): ${Math.round(spreadMs / 1000)}s\n\n`;

  if (fileList.length > 0) {
    body += `## Files Touched (top ${fileList.length})\n\n`;
    for (const f of fileList) body += `- \`${f}\`\n`;
    body += "\n";
  }

  body += `## Fix\n\n`;
  body += `_To be filled in. Suggested triage:_\n`;
  body += `1. Read the last 3 commits (above): was the change reverted, partial, or working?\n`;
  body += `2. If a Stop hook blocked, address its complaint rather than retrying the same edit.\n`;
  body += `3. If lint-staged hollowed a commit, fork to a sibling worktree per \`feedback_lint_staged_hollow_commits.md\`.\n`;
  body += `4. If a peer chat was racing, post status to chat-bus and re-claim the file before retry.\n\n`;

  body += `## Prevention\n\n`;
  body += `_To be filled in once root cause is known. Goals:_\n`;
  body += `- Add a hook that fails LOUD before the failure pattern repeats.\n`;
  body += `- Capture the lesson in \`knowledge/wiki/lessons/\` if the failure mode is general.\n`;
  body += `- Update the affected engine/script's test suite with a regression case.\n`;
  return fm + body;
}

function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.postmortem.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, filePath); }
  catch (err) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function countTodayPostmortems(dir: string, isoDay: string): number {
  if (!existsSync(dir)) return 0;
  let entries;
  try { entries = readdirSync(dir); } catch { return 0; }
  return entries.filter((n) => n.startsWith(isoDay) && n.endsWith(".md")).length;
}

export class AutoPostmortemEngine {
  readonly name = "AutoPostmortemEngine";

  /**
   * Evaluate a trigger and produce (or not) a postmortem markdown.
   *
   * @param trigger  Stop events + commits + error context.
   * @param opts     Output dir + apply flag + mode override.
   * @returns        Action + path + signature + markdown.
   */
  evaluate(trigger: PostmortemTrigger, opts: PostmortemOptions = {}): PostmortemResult {
    const mistakesDir = resolve(opts.mistakesDir ?? DEFAULT_MISTAKES_DIR);
    const apply = !!opts.apply;
    const mode = opts.mode ?? "create";
    const now = opts.now ?? trigger.now ?? Date.now();
    const nowIso = new Date(now).toISOString();
    const events = trigger.events ?? [];

    if (events.length < MIN_STOP_COUNT) {
      return this.makeNoop("noop-too-few-stops", trigger, mistakesDir, nowIso, `${events.length} < ${MIN_STOP_COUNT}`);
    }

    const uncommittedCount = events.filter((e) => e.uncommitted).length;
    if (uncommittedCount === 0) {
      return this.makeNoop("noop-clean-stops", trigger, mistakesDir, nowIso, "no uncommitted state");
    }

    const tsValues = events.map((e) => Date.parse(e.ts)).sort((a, b) => a - b);
    const spread = tsValues[tsValues.length - 1] - tsValues[0];
    if (spread < MIN_BURST_SPREAD_MS) {
      return this.makeNoop("noop-burst-too-tight", trigger, mistakesDir, nowIso, `spread ${spread}ms < ${MIN_BURST_SPREAD_MS}ms`);
    }

    const signature = deriveSignature(events, trigger.errorDescription);
    const date = new Date(tsValues[0]).toISOString().slice(0, 10);
    const filename = `${date}-${signature}.md`;
    const filePath = join(mistakesDir, filename);

    const todayCount = countTodayPostmortems(mistakesDir, date);
    if (todayCount >= MAX_POSTMORTEMS_PER_DAY && !existsSync(filePath)) {
      return this.makeNoop("noop-day-cap-reached", trigger, mistakesDir, nowIso, `${todayCount} >= ${MAX_POSTMORTEMS_PER_DAY}`);
    }

    const markdown = renderPostmortem(trigger, signature, date, nowIso);

    if (existsSync(filePath) && mode === "create") {
      return {
        action: "already-exists",
        path: filePath, date, signature, markdown,
        reason: `postmortem already exists for signature ${signature} on ${date}`,
      };
    }

    if (!apply) {
      return {
        action: "would-write",
        path: filePath, date, signature, markdown,
        reason: "dry-run; pass apply: true to write",
      };
    }

    if (!existsSync(mistakesDir)) mkdirSync(mistakesDir, { recursive: true });
    atomicWrite(filePath, markdown);

    return {
      action: "wrote",
      path: filePath, date, signature, markdown,
      reason: `wrote postmortem ${filename}`,
    };
  }

  private makeNoop(
    action: PostmortemAction,
    trigger: PostmortemTrigger,
    mistakesDir: string,
    nowIso: string,
    reason: string,
  ): PostmortemResult {
    const day = (trigger.events[0]?.ts ?? nowIso).slice(0, 10);
    const sig = deriveSignature(trigger.events, trigger.errorDescription);
    return {
      action, path: join(mistakesDir, `${day}-${sig}.md`),
      date: day, signature: sig,
      markdown: "",
      reason,
    };
  }
}

export const autoPostmortemEngine = new AutoPostmortemEngine();
