/**
 * BuildDebriefEngine — U-FORE-04 (PSAU-FORESIGHT)
 * ================================================
 *
 * After a unit is built + committed, this engine emits a plain-language
 * recap for the user: what changed, why, what could break, what to watch
 * next. New-coder mode receives long-form; expert mode gets a one-liner
 * or nothing at all.
 *
 * Persists each debrief to data/state/BUILD_DEBRIEFS.jsonl for replay.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  newCoderModeEngine,
  type NewCoderModeEngine,
  type ModeProfile,
} from "./NewCoderModeEngine.js";

export interface DebriefInput {
  unitId: string;
  title?: string;
  filesCreated?: string[];
  filesModified?: string[];
  summary: string;
  testsPassed?: number;
  testsTotal?: number;
  knownCaveats?: string[];
  nextSteps?: string[];
  commitSha?: string;
}

export interface Debrief {
  unitId: string;
  profile: ModeProfile;
  whatChanged: string;
  whyItChanged: string;
  couldBreak: string[];
  watchNext: string[];
  oneLiner: string;
  longForm: string;
  emittedAt: number;
}

const LOG_PATH = path.join(
  process.cwd(),
  "mcp-server",
  "data",
  "state",
  "BUILD_DEBRIEFS.jsonl"
);

export class BuildDebriefEngine {
  readonly name = "BuildDebriefEngine";

  constructor(
    private readonly mode: NewCoderModeEngine = newCoderModeEngine,
    private readonly logPath: string = LOG_PATH
  ) {}

  /**
   * Compose a debrief for the given unit completion.
   *
   * @param input Unit completion metadata.
   * @returns Debrief sections tailored to current mode; also persisted.
   */
  debriefFor(input: DebriefInput): Debrief {
    this.assertInput(input);
    const profile = this.mode.currentProfile();

    const whatChanged = this.renderWhatChanged(input);
    const whyItChanged = input.summary;
    const couldBreak = this.inferCouldBreak(input);
    const watchNext = input.nextSteps ?? this.defaultWatchNext(profile, input);
    const oneLiner = this.renderOneLiner(input);
    const longForm = this.renderLongForm(profile, input, {
      whatChanged,
      whyItChanged,
      couldBreak,
      watchNext,
    });

    const debrief: Debrief = {
      unitId: input.unitId,
      profile,
      whatChanged,
      whyItChanged,
      couldBreak,
      watchNext,
      oneLiner,
      longForm,
      emittedAt: Date.now(),
    };

    this.persist(debrief);
    return debrief;
  }

  /**
   * Render the message that should actually be shown to the user, given
   * their current mode.
   */
  render(debrief: Debrief): string {
    if (!debrief.profile.requireDebrief) {
      return debrief.oneLiner;
    }
    return debrief.longForm;
  }

  /**
   * Read back the last N debriefs from the log.
   */
  recent(limit = 5): Debrief[] {
    if (!fs.existsSync(this.logPath)) return [];
    try {
      const lines = fs
        .readFileSync(this.logPath, "utf-8")
        .split(/\r?\n/)
        .filter((l) => l.trim());
      const out: Debrief[] = [];
      for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
        try {
          out.push(JSON.parse(lines[i]) as Debrief);
        } catch {
          // Skip unparseable rows
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  private renderOneLiner(input: DebriefInput): string {
    const parts = [`${input.unitId} done`];
    if (input.testsPassed != null && input.testsTotal != null) {
      parts.push(`${input.testsPassed}/${input.testsTotal} tests`);
    }
    if (input.commitSha) {
      parts.push(`@ ${input.commitSha.slice(0, 7)}`);
    }
    return parts.join(" · ");
  }

  private renderWhatChanged(input: DebriefInput): string {
    const created = input.filesCreated?.length
      ? `${input.filesCreated.length} new`
      : null;
    const modified = input.filesModified?.length
      ? `${input.filesModified.length} modified`
      : null;
    const pieces = [created, modified].filter(Boolean).join(", ");
    return pieces ? `Files: ${pieces}` : "No file-level changes recorded";
  }

  private inferCouldBreak(input: DebriefInput): string[] {
    const risks: string[] = [];
    const created = input.filesCreated ?? [];
    const modified = input.filesModified ?? [];
    if (created.some((f) => f.includes("src/engines/"))) {
      risks.push(
        "New engine — downstream consumers must import the singleton and update dispatcher actions."
      );
    }
    if (modified.some((f) => f.includes("dispatchers/"))) {
      risks.push("Dispatcher modified — action enum and schema must still match.");
    }
    if (created.some((f) => f.includes("schemas/")) || modified.some((f) => f.includes("schemas/"))) {
      risks.push("Schema changed — check downstream clients and bump schemaVersion if needed.");
    }
    if (input.testsPassed != null && input.testsTotal != null && input.testsPassed < input.testsTotal) {
      risks.push(
        `${input.testsTotal - input.testsPassed} tests failing — do not ship until the failures are understood.`
      );
    }
    return risks.concat(input.knownCaveats ?? []);
  }

  private defaultWatchNext(profile: ModeProfile, input: DebriefInput): string[] {
    const steps: string[] = [];
    steps.push("Run `tsc --noEmit` on the package to catch type drift.");
    steps.push("Run the full test file for this engine to confirm no regressions.");
    if (profile.experience === "new") {
      steps.push(
        "Before the next build, skim the diff one more time. If anything surprises you, ask first."
      );
    }
    if (input.filesCreated?.some((f) => f.includes("engines/"))) {
      steps.push("Re-run the duplication guard before creating another engine in this area.");
    }
    return steps;
  }

  private renderLongForm(
    profile: ModeProfile,
    input: DebriefInput,
    parts: {
      whatChanged: string;
      whyItChanged: string;
      couldBreak: string[];
      watchNext: string[];
    }
  ): string {
    const lines: string[] = [];
    lines.push(`Debrief — ${input.unitId}${input.title ? `: ${input.title}` : ""}`);
    lines.push("");
    lines.push("What changed:");
    lines.push(`  ${parts.whatChanged}`);
    lines.push("");
    lines.push("Why:");
    lines.push(`  ${parts.whyItChanged}`);
    if (parts.couldBreak.length > 0) {
      lines.push("");
      lines.push("What could break:");
      for (const c of parts.couldBreak) lines.push(`  - ${c}`);
    }
    if (parts.watchNext.length > 0) {
      lines.push("");
      lines.push("Watch next:");
      for (const w of parts.watchNext) lines.push(`  - ${w}`);
    }
    if (profile.experience === "new") {
      lines.push("");
      lines.push("(You are in new-coder mode — this debrief is intentionally long. Toggle with userModelEngine.setExperience.)");
    }
    return lines.join("\n");
  }

  private persist(debrief: Debrief): void {
    try {
      const dir = path.dirname(this.logPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.logPath, JSON.stringify(debrief) + "\n", "utf-8");
    } catch {
      // Logging failure should not crash the build
    }
  }

  private assertInput(input: unknown): asserts input is DebriefInput {
    if (!input || typeof input !== "object") {
      throw new Error("BuildDebriefEngine.debriefFor: input must be an object");
    }
    const rec = input as Partial<DebriefInput>;
    if (typeof rec.unitId !== "string" || rec.unitId.trim() === "") {
      throw new Error("BuildDebriefEngine.debriefFor: input.unitId required");
    }
    if (typeof rec.summary !== "string" || rec.summary.trim() === "") {
      throw new Error("BuildDebriefEngine.debriefFor: input.summary required");
    }
  }
}

export const buildDebriefEngine = new BuildDebriefEngine();
