#!/usr/bin/env node
/**
 * anti-regression-auto-sweep.mjs — STUB (intentional no-op)
 *
 * History: this path was previously occupied by misplaced markdown content
 * (a hookify-rules skill written into a `.mjs` filename) which caused Node
 * to throw a syntax error on every PostToolUse and spam every chat's stderr
 * with `ERR_INVALID_OR_UNEXPECTED_TOKEN`. The non-blocking error contributed
 * to transcript bloat across all 6 concurrent chats.
 *
 * `continueOnError: true` in settings.json (line 466) means deleting the
 * file would break nothing functionally, but the registered hook entry is
 * still there. This stub keeps the hook chain intact while doing nothing,
 * so the registration can be removed safely from settings.json without
 * coordinating with whichever chat is currently editing settings.
 *
 * If/when an actual anti-regression sweep is implemented, replace the body
 * below. Until then, exit 0 with `{continue:true}` to keep the chain
 * flowing without interfering with downstream hooks.
 */
process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }));
