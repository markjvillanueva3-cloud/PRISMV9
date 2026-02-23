/**
 * PRISM Chat Archive Dispatcher (#33)
 * ====================================
 *
 * prism_chat_archive — 6 actions for session chat storage, search, and memory.
 * Built on existing chat storage system (Session 29, data/chats/).
 *
 * @version 1.0.0
 * @phase REORG
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeChatArchiveAction } from "../../engines/ChatArchiveEngine.js";
import { log } from "../../utils/Logger.js";

export function registerChatArchiveDispatcher(server: McpServer): void {
  server.tool(
    "prism_chat_archive",
    "Session chat storage and memory system. Save transcripts, generate summaries, search history, load context. Actions: chat_start, chat_save, chat_end, chat_list, chat_search, chat_stats",
    {
      action: z.enum([
        "chat_start", "chat_save", "chat_end",
        "chat_list", "chat_search", "chat_stats",
      ]).describe("Chat archive action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params = {} } = args;
      try {
        log.info(`[CHAT_ARCHIVE] ${action}`);
        const result = executeChatArchiveAction(action, params as Record<string, unknown>);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        log.error(`[CHAT_ARCHIVE] ${action} failed: ${(e as Error).message}`);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: (e as Error).message }) }] };
      }
    }
  );
}
