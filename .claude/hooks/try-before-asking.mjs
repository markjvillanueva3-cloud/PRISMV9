// tier: T1
/**
 * try-before-asking.mjs — UserPromptSubmit Stop Hook
 *
 * Detects when Claude is about to tell the user to do something
 * that Claude can do itself. Injects a reminder to try first.
 *
 * Triggers on phrases like:
 * - "you can run", "you should run", "try running"
 * - "please run", "run this command"
 * - "you'll need to", "you need to"
 * - "manually start", "manually run"
 * - "in your terminal"
 *
 * @hook PreToolUse (on assistant responses suggesting user action)
 */

// This hook monitors for patterns suggesting delegation to user
// when Claude should attempt the action itself

const DELEGATION_PATTERNS = [
  /you (?:can|should|need to|will need to|might want to) run/i,
  /please (?:run|execute|start|type)/i,
  /try (?:running|executing|typing)/i,
  /in your terminal/i,
  /manually (?:start|run|execute|do)/i,
  /you'll need to/i,
  /run this (?:command|script)/i,
  /type this in/i,
  /open .* and run/i,
  /start .* manually/i,
];

const EXCEPTIONS = [
  /interactive/i,      // Truly interactive commands
  /password/i,         // Needs user credentials
  /sudo/i,             // Needs elevated privileges
  /admin/i,            // Admin actions
  /gui/i,              // GUI-only actions
  /browser/i,          // Browser actions
  /login/i,            // Login flows
  /authenticate/i,     // Auth flows
];

export default async function tryBeforeAsking(event) {
  // This hook would need to intercept assistant output before sending
  // Since we can't do that directly, we add context to remind Claude

  return {
    decision: "approve",
    additionalContext: `[SELF-SUFFICIENCY RULE] Before telling the user to run a command:
1. TRY IT YOURSELF FIRST using Bash tool
2. Only ask user if: requires GUI, needs password/sudo, is truly interactive, or you tried and it failed
3. Don't waste tokens explaining - just do it`
  };
}
