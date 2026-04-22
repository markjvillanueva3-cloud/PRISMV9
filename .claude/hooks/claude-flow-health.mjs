#!/usr/bin/env node
/**
 * claude-flow-health.mjs — SessionStart Hook (stub)
 *
 * Placeholder for claude-flow health check. The real implementation was
 * referenced in settings.json but never landed on disk, causing a
 * Node CJS loader error on every session start:
 *   "Cannot find module 'H:\prism\.claude\hooks\claude-flow-health.mjs'"
 *
 * This stub exits cleanly so SessionStart doesn't spam the transcript
 * with MODULE_NOT_FOUND errors. Replace the body if/when a real health
 * check is needed.
 */
process.exit(0);
