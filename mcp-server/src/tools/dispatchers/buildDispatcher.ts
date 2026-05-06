/**
 * prism_build — Build Dispatcher
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P9-U04. Wires AUTO-chain consumer events at
 * the build layer. Companion to:
 *   - hookDispatcher (P9-U04 — calls QualityDashboardEngine on audit events)
 *   - sessionDispatcher (P9-U04 — calls SelfImprovementPatternEngine.consolidate
 *                                  on session end)
 *
 * 4 actions:
 *   - pre_edit          → calls QualityScoreEngine for the affected file before
 *                          an Edit/Write goes through. Returns the file's current
 *                          quality score so callers can decide whether to gate.
 *   - post_edit         → optional companion: re-score the file after an edit and
 *                          report the delta (+/-).
 *   - quality_summary   → aggregate quality scores across a glob of files.
 *   - score_for_file    → bare lookup; same as pre_edit but doesn't write to the
 *                          AUTO chain. Useful for read-only scoring.
 *
 * Pure functions exported for tests:
 *   - normalizeFilePath(input)   → string | null
 *   - validateAction(action, params) → null | string error
 *   - classifyDelta(prev, curr)  → "improved" | "regressed" | "unchanged"
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P9-U04
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, dispatcherResult } from "../../utils/dispatcherMiddleware.js";

let _qse: any;

async function getQualityScoreEngine(): Promise<any> {
  return _qse ??= (await import("../../engines/QualityScoreEngine.js")).qualityScoreEngine;
}

const ACTIONS = [
  "pre_edit",
  "post_edit",
  "quality_summary",
  "score_for_file",
] as const;

const actionEnum = z.enum(ACTIONS);

// --------------------------------------------------------------------------
// PURE LOGIC
// --------------------------------------------------------------------------

/**
 * Accept a file path string; trim, reject empty/non-string, normalize backslash
 * to forward-slash so cross-platform paths compare equal.
 */
export function normalizeFilePath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return trimmed.replace(/\\/g, "/");
}

/**
 * Validate per-action params shape. Returns null on success or an error
 * message describing the first issue.
 */
export function validateAction(action: string, params: Record<string, unknown>): string | null {
  if (!params || typeof params !== "object") return "params must be an object";
  switch (action) {
    case "pre_edit":
    case "post_edit":
    case "score_for_file":
      if (typeof params.filePath !== "string" || params.filePath.length === 0) {
        return `${action} requires 'filePath' string`;
      }
      return null;
    case "quality_summary":
      if (typeof params.glob !== "string" || params.glob.length === 0) {
        return "quality_summary requires 'glob' string (e.g. 'src/**/*.ts')";
      }
      return null;
    default:
      return `unknown action: ${action}`;
  }
}

/**
 * Compare two quality scores and label the delta.
 *  - improved  → curr > prev + 0.01 (1pt threshold)
 *  - regressed → curr < prev - 0.01
 *  - unchanged → within ±1 percentage point of each other
 *
 * Inputs that aren't finite numbers default to "unchanged" — caller logs
 * the missing-score case separately rather than letting it look like a
 * regression.
 */
export function classifyDelta(prev: unknown, curr: unknown): "improved" | "regressed" | "unchanged" {
  const p = typeof prev === "number" && Number.isFinite(prev) ? prev : null;
  const c = typeof curr === "number" && Number.isFinite(curr) ? curr : null;
  if (p === null || c === null) return "unchanged";
  const delta = c - p;
  if (delta > 0.01) return "improved";
  if (delta < -0.01) return "regressed";
  return "unchanged";
}

// --------------------------------------------------------------------------
// REGISTRATION
// --------------------------------------------------------------------------

export function registerBuildDispatcher(server: any): void {
  server.tool(
    "prism_build",
    `Build Dispatcher — AUTO-chain consumer events at the build layer.
4 actions: pre_edit (score affected file before Edit/Write), post_edit (re-score + delta),
quality_summary (aggregate over a glob), score_for_file (read-only score lookup).
Wires to QualityScoreEngine. Companion to prism_hook.audit (P9-U04 hookDispatcher) +
prism_session.end (P9-U04 sessionDispatcher).
Actions: ${ACTIONS.join(", ")}.`,
    {
      action: actionEnum,
      params: z.record(z.string(), z.any()).optional(),
    },
    async (args: any) => {
      const { action, params = {} } = args;
      log.info(`[prism_build] action=${action}`);
      const valErr = validateAction(action, params);
      if (valErr) {
        return dispatcherError(valErr, action, "prism_build");
      }
      try {
        const eng = await getQualityScoreEngine();
        switch (action) {
          case "pre_edit": {
            const filePath = normalizeFilePath(params.filePath)!;
            const score = typeof (eng as any).scoreFile === "function"
              ? await (eng as any).scoreFile(filePath)
              : { error: "QualityScoreEngine.scoreFile not callable on this build" };
            return dispatcherResult({ action: "pre_edit", filePath, score });
          }
          case "post_edit": {
            const filePath = normalizeFilePath(params.filePath)!;
            const prevScore = typeof params.prevScore === "number" ? params.prevScore : null;
            const curr = typeof (eng as any).scoreFile === "function"
              ? await (eng as any).scoreFile(filePath)
              : null;
            const currScore = curr && typeof curr === "object" && "score" in curr
              ? (curr as { score: number }).score
              : (typeof curr === "number" ? curr : null);
            const delta = classifyDelta(prevScore, currScore);
            return dispatcherResult({ action: "post_edit", filePath, prevScore, currScore, delta });
          }
          case "quality_summary": {
            const glob = String(params.glob);
            const summary = typeof (eng as any).summarize === "function"
              ? await (eng as any).summarize(glob)
              : { error: "QualityScoreEngine.summarize not callable on this build" };
            return dispatcherResult({ action: "quality_summary", glob, summary });
          }
          case "score_for_file": {
            const filePath = normalizeFilePath(params.filePath)!;
            const score = typeof (eng as any).scoreFile === "function"
              ? await (eng as any).scoreFile(filePath)
              : { error: "QualityScoreEngine.scoreFile not callable on this build" };
            return dispatcherResult({ action: "score_for_file", filePath, score });
          }
          default:
            return dispatcherError(`unknown action: ${action}`, action, "prism_build");
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_build");
      }
    },
  );
}
