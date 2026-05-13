/**
 * commit-format-validator hook — P6-U02 close-out tests.
 *
 * Covers isValidSubject + extractCommitSubject pure functions with
 * concrete-value assertions on subject patterns and command parsing.
 */
import { describe, it, expect } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

process.env.PRISM_COMMIT_FORMAT_VALIDATOR_AS_LIB = "1";

const HOOK_URL = pathToFileURL(
  resolve("H:/prism/.claude/hooks/commit-format-validator.mjs"),
).href;

const mod = (await import(/* @vite-ignore */ HOOK_URL)) as {
  isValidSubject: (subject: string) => boolean;
  extractCommitSubject: (command: string) => string | null;
};
const { isValidSubject, extractCommitSubject } = mod;

describe("isValidSubject — accepts canonical PRISM forms", () => {
  it("accepts [SCOPE-MS#]/U-ID: title", () => {
    expect(isValidSubject("[CAD-INFRA-MS0]/U-CINF12: aliases shipped")).toBe(true);
  });

  it("accepts [MAIN] [SCOPE-MS#]/U-ID: title", () => {
    expect(isValidSubject("[MAIN] [BP-MS0]/U-BLOB1: tests")).toBe(true);
  });

  it("accepts SCOPE without MS suffix when bracketed", () => {
    expect(isValidSubject("[CLEANUP]/U-A6: bootstrap-golf")).toBe(true);
  });

  it("accepts numeric MS suffix variants", () => {
    expect(isValidSubject("[AWARE-MS0]/U-AWARE02: saturation arm")).toBe(true);
    expect(isValidSubject("[APPW-MS8]/U-APPW41: machine workspace")).toBe(true);
  });

  it("accepts U-ID with hyphenated suffix", () => {
    expect(isValidSubject("[CAD-INFRA-MS0]/U-CINF12-DRIFT-FIX: title")).toBe(true);
  });

  it("accepts Revert form", () => {
    expect(isValidSubject('Revert "[MAIN] [SCOPE-MS0]/U-X: old"')).toBe(true);
  });
});

describe("isValidSubject — rejects non-canonical forms", () => {
  it("rejects empty string", () => {
    expect(isValidSubject("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidSubject(null as unknown as string)).toBe(false);
  });

  it("rejects bare text with no brackets", () => {
    expect(isValidSubject("fix the broken test")).toBe(false);
  });

  it("rejects lowercase scope brackets", () => {
    expect(isValidSubject("[main]/u-xyz: lowercase")).toBe(false);
  });

  it("rejects WIP: prefix without bracketed scope", () => {
    expect(isValidSubject("WIP: refactoring")).toBe(false);
  });

  it("rejects subject missing colon", () => {
    expect(isValidSubject("[CAD-INFRA-MS0]/U-CINF12 missing colon")).toBe(false);
  });

  it("rejects subject longer than 200 chars (pragmatic length cap)", () => {
    const longTail = "a".repeat(250);
    expect(isValidSubject(`[CAD-INFRA-MS0]/U-CINF12: ${longTail}`)).toBe(false);
  });
});

describe("extractCommitSubject — extracts -m subjects from git commands", () => {
  it("returns null when no git commit in command", () => {
    expect(extractCommitSubject("ls -la")).toBe(null);
  });

  it("returns null for empty command", () => {
    expect(extractCommitSubject("")).toBe(null);
  });

  it("returns null when -m absent (interactive editor commit)", () => {
    expect(extractCommitSubject("git commit")).toBe(null);
  });

  it("extracts double-quoted subject", () => {
    const cmd = `git commit -m "[CAD-INFRA-MS0]/U-CINF12: aliases"`;
    expect(extractCommitSubject(cmd)).toBe("[CAD-INFRA-MS0]/U-CINF12: aliases");
  });

  it("extracts single-quoted subject", () => {
    const cmd = `git commit -m '[MAIN] [BP-MS0]/U-BLOB1: tests'`;
    expect(extractCommitSubject(cmd)).toBe("[MAIN] [BP-MS0]/U-BLOB1: tests");
  });

  it("extracts heredoc-style subject (first line after EOF)", () => {
    const cmd = `git commit -m "$(cat <<'EOF'
[CAD-INFRA-MS0]/U-CINF12: heredoc subject

Body goes here.
EOF
)"`;
    expect(extractCommitSubject(cmd)).toBe("[CAD-INFRA-MS0]/U-CINF12: heredoc subject");
  });

  it("returns trimmed subject (no leading/trailing whitespace)", () => {
    const cmd = `git commit -m "  [MAIN] [SCOPE-MS0]/U-X: padded  "`;
    expect(extractCommitSubject(cmd)).toBe("[MAIN] [SCOPE-MS0]/U-X: padded");
  });

  it("handles 'cd ... && git commit' prefix", () => {
    const cmd = `cd H:/prism && git commit -m "[MAIN] [SCOPE-MS0]/U-X: chained"`;
    expect(extractCommitSubject(cmd)).toBe("[MAIN] [SCOPE-MS0]/U-X: chained");
  });
});

describe("integration: extracted subject feeds back into validator", () => {
  it("canonical commit command produces a valid subject", () => {
    const cmd = `git commit -m "[CAD-INFRA-MS0]/U-CINF12: thin facade for spec aliases"`;
    const subject = extractCommitSubject(cmd);
    expect(subject === null).toBe(false);
    expect(isValidSubject(subject!)).toBe(true);
  });

  it("non-canonical commit command produces an invalid subject", () => {
    const cmd = `git commit -m "fix bug in tests"`;
    const subject = extractCommitSubject(cmd);
    expect(subject === null).toBe(false);
    expect(isValidSubject(subject!)).toBe(false);
  });
});
