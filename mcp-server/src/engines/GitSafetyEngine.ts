/**
 * GitSafetyEngine — U-FORE-14 (New-Coder Safety Net)
 * ===================================================
 *
 * Classifies a git command before it runs. Flags destructive flags
 * (`--force`, `--hard`, `-D`, `clean -fd`), explains what they do in
 * plain language, and emits a confirmation prompt for the user.
 *
 * The engine does NOT execute git. It only returns a safety verdict.
 * Hooks (bash-destructive-guard.mjs) are responsible for enforcement.
 *
 * Inputs  → { command: string, branch?: string }
 * Outputs → {
 *   safe,
 *   severity: "ok"|"warn"|"block",
 *   reasons[],                // why we flagged it
 *   plainLanguageImpact,      // what will happen in one sentence
 *   confirmationPrompt?,      // question to ask the user
 *   saferAlternative?         // command that achieves the same goal with less risk
 * }
 */

export interface GitSafetyInput {
  command: string;
  branch?: string;
}

export interface GitSafetyVerdict {
  safe: boolean;
  severity: "ok" | "warn" | "block";
  reasons: string[];
  plainLanguageImpact: string;
  confirmationPrompt?: string;
  saferAlternative?: string;
}

type Rule = {
  id: string;
  severity: "warn" | "block";
  pattern: RegExp;
  impact: string;
  confirm: string;
  saferAlternative?: string;
};

const RULES: Rule[] = [
  {
    id: "push_force",
    severity: "block",
    pattern: /\bgit\s+push\s+[^#\n]*--force(?!-with-lease)\b/,
    impact: "Rewrites remote history and can permanently destroy teammates' commits.",
    confirm: "Do you really want to overwrite the remote branch and drop anything others pushed?",
    saferAlternative: "git push --force-with-lease",
  },
  {
    id: "reset_hard",
    severity: "block",
    pattern: /\bgit\s+reset\s+[^#\n]*--hard\b/,
    impact: "Discards all uncommitted changes in the working tree. They are NOT recoverable from `git stash`.",
    confirm: "Every unstaged and staged change will be lost. Continue?",
    saferAlternative: "git stash push -u && git reset",
  },
  {
    id: "branch_force_delete",
    severity: "warn",
    pattern: /\bgit\s+branch\s[^#\n]*-D(?:\s|$)/,
    impact: "Deletes a branch even if it has unmerged commits that live nowhere else.",
    confirm: "The branch has unmerged work. Delete anyway?",
    saferAlternative: "git branch -d <branch>  # refuses if unmerged",
  },
  {
    id: "checkout_discard",
    severity: "warn",
    pattern: /\bgit\s+checkout\s+--\s+\./,
    impact: "Discards all unstaged changes in the working tree.",
    confirm: "All unsaved edits will be thrown away. Continue?",
    saferAlternative: "git stash push -u",
  },
  {
    id: "restore_discard_all",
    severity: "warn",
    pattern: /\bgit\s+restore\s+--worktree\s+\./,
    impact: "Discards all unstaged changes in the working tree.",
    confirm: "All unsaved edits will be thrown away. Continue?",
    saferAlternative: "git stash push -u",
  },
  {
    id: "clean_force",
    severity: "block",
    pattern: /\bgit\s+clean\s+[^#\n]*-f[dx]{0,2}/,
    impact: "Deletes untracked files — including any in-progress work you haven't added.",
    confirm: "Every untracked file will be permanently deleted. Continue?",
    saferAlternative: "git clean -nd   # dry-run first",
  },
  {
    id: "push_delete",
    severity: "warn",
    pattern: /\bgit\s+push\s+[^#\n]*(?::[^\s]+|--delete\s+\S+)/,
    impact: "Removes a branch from the remote.",
    confirm: "The remote branch will be gone for everyone. Continue?",
  },
  {
    id: "filter_branch",
    severity: "block",
    pattern: /\bgit\s+filter-branch\b/,
    impact: "Rewrites history across many commits. Collaborators will diverge.",
    confirm: "History rewrite is a coordinated operation. Has every teammate agreed?",
    saferAlternative: "git filter-repo  # safer, still destructive",
  },
  {
    id: "rebase_onto_main",
    severity: "warn",
    pattern: /\bgit\s+rebase\s+.*\s-i\b|\bgit\s+rebase\s+.*--root\b/,
    impact: "Rewrites local commit history.",
    confirm: "Interactive or root rebase rewrites SHAs. Continue?",
  },
  {
    id: "no_verify",
    severity: "warn",
    pattern: /\bgit\s+(commit|push)\s+[^#\n]*--no-verify\b/,
    impact: "Bypasses pre-commit / pre-push hooks that exist to catch mistakes.",
    confirm: "Hooks exist for a reason. Really skip them?",
  },
];

const PROTECTED_BRANCHES = ["main", "master", "release", "production"] as const;

export class GitSafetyEngine {
  readonly name = "GitSafetyEngine";

  classify(input: GitSafetyInput): GitSafetyVerdict {
    if (!input || typeof input.command !== "string") {
      throw new Error("GitSafetyEngine.classify: command required");
    }
    const cmd = input.command;
    const reasons: string[] = [];
    let severity: "ok" | "warn" | "block" = "ok";
    let impact = "Safe.";
    let confirm: string | undefined;
    let alt: string | undefined;

    for (const rule of RULES) {
      if (rule.pattern.test(cmd)) {
        reasons.push(rule.id);
        if (rule.severity === "block" || severity !== "block") severity = rule.severity;
        impact = rule.impact;
        confirm = rule.confirm;
        if (rule.saferAlternative && !alt) alt = rule.saferAlternative;
      }
    }

    if (input.branch && PROTECTED_BRANCHES.includes(input.branch as typeof PROTECTED_BRANCHES[number]) &&
        /--force|--hard|clean\s+-f/.test(cmd)) {
      reasons.push(`protected_branch:${input.branch}`);
      severity = "block";
      impact = `Operating on protected branch '${input.branch}' with a destructive flag.`;
    }

    return {
      safe: severity === "ok",
      severity,
      reasons,
      plainLanguageImpact: impact,
      ...(confirm ? { confirmationPrompt: confirm } : {}),
      ...(alt ? { saferAlternative: alt } : {}),
    };
  }

  isDestructive(command: string): boolean {
    return RULES.some((r) => r.pattern.test(command));
  }

  ruleIds(): string[] {
    return RULES.map((r) => r.id);
  }
}

export const gitSafetyEngine = new GitSafetyEngine();
