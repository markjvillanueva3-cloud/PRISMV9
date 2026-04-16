import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { SERVER_NAME, SERVER_VERSION } from "../src/constants.js";
import { log } from "../src/utils/Logger.js";
import { registerContextDispatcher } from "../src/tools/dispatchers/contextDispatcher.js";
import { registerMemoryDispatcher } from "../src/tools/dispatchers/memoryDispatcher.js";
import { memoryGraphEngine } from "../src/engines/MemoryGraphEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const server = new McpServer({
  name: `${SERVER_NAME}-context`,
  version: SERVER_VERSION,
});

function initSafeEngines(): void {
  try {
    memoryGraphEngine?.init();
    log.info("[SAFE-MCP] MemoryGraphEngine initialized");
  } catch (error) {
    log.warn(`[SAFE-MCP] MemoryGraphEngine init skipped: ${(error as Error).message}`);
  }
}

function registerSafeTools(): string[] {
  registerContextDispatcher(server);
  registerMemoryDispatcher(server);

  return [
    "prism_context",
    "prism_memory",
  ];
}

async function main(): Promise<void> {
  process.env.SESSION_ID ||= `CTX-${Date.now()}`;
  log.info(`Starting ${SERVER_NAME} context-only MCP [${process.env.SESSION_ID}]`);

  initSafeEngines();
  const tools = registerSafeTools();

  if (process.env.PRISM_CONTEXT_ONLY_DRY_RUN === "1") {
    log.info(`[SAFE-MCP] Dry run complete. Exposed tools: ${tools.join(", ")}`);
    process.exit(0);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info(`[SAFE-MCP] Server running on stdio with tools: ${tools.join(", ")}`);
}

main().catch((error) => {
  log.error("[SAFE-MCP] Startup failed", error);
  process.exit(1);
});
