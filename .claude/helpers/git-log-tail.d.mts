/**
 * Type declarations for git-log-tail.mjs (U-CLEANUP-B3).
 * Shape derived from the implementation at the same path.
 * NodeNext convention: .mjs source → .d.mts declaration file.
 */

export interface GitLogCommit {
  sha: string;
  author: string;
  isoDate: string;
  subject: string;
  files: string[];
}

export interface TailOptions {
  /** ISO 8601 cutoff for `git log --since=<iso>`. Required. */
  sinceIso: string;
  /** Repo root directory. Defaults to H:/prism. */
  repoRoot?: string;
  /** Author names to exclude (e.g. bot accounts). */
  excludeAuthors?: string[];
  /** Explicit git binary path; overrides auto-resolution. */
  gitBin?: string;
}

export interface TailResult {
  commits: GitLogCommit[];
  error?: string;
  lockRelated?: boolean;
}

export declare function tail(opts: TailOptions): TailResult;

/**
 * Load the last-poll ISO timestamp from the state file.
 * @param path - State file path; defaults to H:/prism/state/shared/.watchdog-last-poll.iso
 */
export declare function loadLastPollIso(path?: string): string | null;

/**
 * Atomically save the last-poll ISO timestamp to the state file.
 * @param isoString - UTC ISO 8601 string to persist.
 * @param path - State file path; defaults to H:/prism/state/shared/.watchdog-last-poll.iso
 */
export declare function saveLastPollIso(isoString: string, path?: string): void;

/** Frozen configuration constants exported for consumer introspection. */
export declare const GIT_LOG_TAIL_LIMITS: {
  readonly DEFAULT_REPO_ROOT: string;
  readonly DEFAULT_LAST_POLL_PATH: string;
  readonly SCHEMA_VERSION: number;
  readonly MAX_LOCK_RETRIES: number;
  readonly LOCK_RETRY_BACKOFF_MS: readonly number[];
  readonly GIT_TIMEOUT_MS: number;
  readonly TOTAL_BUDGET_MS: number;
  readonly TMP_RAND_BYTES: number;
  readonly LOAD_RETRY_COUNT: number;
  readonly LOAD_RETRY_DELAY_MS: number;
};
