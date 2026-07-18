// zulu-builder-mcp-registration.mjs
// Registers the new prism_builder actions so ZULU can use them immediately
// Built autonomously in YOLO mode

import { builderActions } from './builderDispatcher.full.ts';

export function registerBuilderActions(registry) {
  for (const [name, action] of Object.entries(builderActions)) {
    registry.register(`prism_builder:${name}`, action);
  }
  console.log('[ZULU] Primary builder MCP functions registered');
}