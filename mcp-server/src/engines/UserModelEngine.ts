/**
 * UserModelEngine — U-FORE-04 (PSAU-FORESIGHT)
 * =============================================
 *
 * Persists a lightweight model of the human developer across sessions.
 * Fields include `developer_experience` (new | intermediate | expert),
 * `verbosity_preference`, `prefers_rollback_plan`, and a rolling edit
 * history used by BuildAdvisorEngine to infer experience when unset.
 *
 * Storage: mcp-server/data/state/USER_MODEL.json (JSON, schemaVersion 1).
 * Reads are lazy and cached for the process; writes are atomic (tmp+rename).
 *
 * Exports both a class and a singleton so callers can inject a test
 * instance with a temp storage path.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type DeveloperExperience = "new" | "intermediate" | "expert" | "unknown";
export type VerbosityPreference = "quiet" | "normal" | "verbose";

export interface UserModel {
  schemaVersion: 1;
  developer_experience: DeveloperExperience;
  verbosity_preference: VerbosityPreference;
  prefers_rollback_plan: boolean;
  wants_debrief: boolean;
  edit_history: Array<{ ts: number; kind: string; outcome: "ok" | "revert" | "fail" }>;
  updated_at: number;
}

const DEFAULT_STORAGE = path.join(
  process.cwd(),
  "mcp-server",
  "data",
  "state",
  "USER_MODEL.json"
);

export const USER_MODEL_DEFAULT: UserModel = {
  schemaVersion: 1,
  developer_experience: "unknown",
  verbosity_preference: "normal",
  prefers_rollback_plan: false,
  wants_debrief: true,
  edit_history: [],
  updated_at: 0,
};

const MAX_HISTORY = 200;

export class UserModelEngine {
  readonly name = "UserModelEngine";
  private cache: UserModel | null = null;

  constructor(private readonly storagePath: string = DEFAULT_STORAGE) {}

  /**
   * Load the persisted model (cached per-process).
   *
   * @returns Current user model; defaults if file missing/corrupt.
   */
  load(): UserModel {
    if (this.cache) return this.cache;
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, "utf-8");
        const parsed = JSON.parse(raw) as UserModel;
        if (parsed && parsed.schemaVersion === 1) {
          this.cache = { ...USER_MODEL_DEFAULT, ...parsed };
          return this.cache;
        }
      }
    } catch {
      // corrupt file — fall through to defaults
    }
    this.cache = { ...USER_MODEL_DEFAULT };
    return this.cache;
  }

  /**
   * Merge partial update into the persisted model and write atomically.
   *
   * @param patch Partial fields to overwrite.
   * @returns Updated model.
   */
  update(patch: Partial<UserModel>): UserModel {
    const current = this.load();
    const next: UserModel = {
      ...current,
      ...patch,
      schemaVersion: 1,
      updated_at: Date.now(),
    };
    this.writeAtomic(next);
    this.cache = next;
    return next;
  }

  /**
   * Append an edit record to the rolling history (capped at MAX_HISTORY).
   *
   * @param kind  Edit classification (e.g. "engine", "test", "config").
   * @param outcome  Whether the edit stuck (ok), was reverted, or failed.
   */
  recordEdit(kind: string, outcome: "ok" | "revert" | "fail"): UserModel {
    const current = this.load();
    const history = [...current.edit_history, { ts: Date.now(), kind, outcome }];
    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }
    return this.update({ edit_history: history });
  }

  /**
   * Infer developer_experience from edit history when explicit field is
   * "unknown". Simple heuristic: revert-ratio + edit count.
   *
   * @returns Experience level classification.
   */
  inferExperience(): DeveloperExperience {
    const m = this.load();
    if (m.developer_experience !== "unknown") return m.developer_experience;
    const h = m.edit_history;
    if (h.length < 20) return "new";
    const reverts = h.filter((e) => e.outcome === "revert" || e.outcome === "fail").length;
    const revertRatio = reverts / h.length;
    if (revertRatio > 0.2) return "new";
    if (revertRatio > 0.08) return "intermediate";
    return "expert";
  }

  /**
   * Explicitly set the developer_experience field (bypasses inference).
   */
  setExperience(level: DeveloperExperience): UserModel {
    return this.update({ developer_experience: level });
  }

  /**
   * Force-reload from disk, bypassing the process cache.
   */
  reload(): UserModel {
    this.cache = null;
    return this.load();
  }

  /**
   * Reset the model to defaults (mostly for tests).
   */
  reset(): UserModel {
    this.writeAtomic({ ...USER_MODEL_DEFAULT, updated_at: Date.now() });
    this.cache = null;
    return this.load();
  }

  private writeAtomic(model: UserModel): void {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = this.storagePath + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(model, null, 2), "utf-8");
    fs.renameSync(tmp, this.storagePath);
  }
}

export const userModelEngine = new UserModelEngine();
