/**
 * Claude Account Management Actions
 * Allows switching between multiple Anthropic accounts to avoid rate limits.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const POOL_PATH = "H:/prism/state/shared/CLAUDE_ACCOUNT_POOL.json";

export function registerClaudeAccountDispatcher(server: McpServer): void {
  // MCP-BOOT-FIX (2026-06-13, slot:bravo): tool name was "prism_auth" -- a copy-paste collision with
  // the SECURITY-CRITICAL authDispatcher (login/RBAC/MFA), which registers later and won under the
  // old silent last-wins SDK, leaving THESE 4 Claude-account-pool actions dead/unreachable for weeks.
  // Renamed to its own free name "prism_claude_account" (verified no other dispatcher owns it and no
  // external caller references the actions) -- removes the collision AND restores the actions.
  (server as any).tool(
    "prism_claude_account",
    "Claude/Anthropic account management. Actions: list_claude_accounts, switch_claude_account, rotate_claude_account, set_claude_account_status",
    {
      action: z.enum(["list_claude_accounts", "switch_claude_account", "rotate_claude_account", "set_claude_account_status"]),
      account_name: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional()
    },
    async ({ action, account_name, status }) => {
      
      if (!fs.existsSync(POOL_PATH)) {
        return { content: [{ type: "text", text: "No Claude account pool found" }] };
      }
      
      const pool = JSON.parse(fs.readFileSync(POOL_PATH, "utf8"));
      
      if (action === "list_claude_accounts") {
        return {
          content: [{
            type: "text",
            text: JSON.stringify(pool.accounts, null, 2)
          }]
        };
      }
      
      if (action === "switch_claude_account" && account_name) {
        const account = pool.accounts.find((a: any) => a.name === account_name);
        if (!account) {
          return { content: [{ type: "text", text: `Account ${account_name} not found` }] };
        }
        
        // In real implementation, this would update the active Anthropic key
        // For now, we just return the account details
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              switched_to: account,
              message: `Switched to ${account_name}. Set ANTHROPIC_API_KEY env or update config to use this account.`
            }, null, 2)
          }]
        };
      }
      
      if (action === "rotate_claude_account") {
        const activeAccounts = pool.accounts.filter((a: any) => a.status === "active");
        if (activeAccounts.length === 0) {
          return { content: [{ type: "text", text: "No active accounts" }] };
        }
        
        const nextIndex = (pool.current_index || 0) % activeAccounts.length;
        const nextAccount = activeAccounts[nextIndex];
        
        pool.current_index = (nextIndex + 1) % activeAccounts.length;
        fs.writeFileSync(POOL_PATH, JSON.stringify(pool, null, 2));
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              rotated_to: nextAccount,
              message: `Rotated to ${nextAccount.name}`
            }, null, 2)
          }]
        };
      }
      
      if (action === "set_claude_account_status" && account_name && status) {
        const account = pool.accounts.find((a: any) => a.name === account_name);
        if (!account) {
          return { content: [{ type: "text", text: `Account not found` }] };
        }
        
        account.status = status;
        fs.writeFileSync(POOL_PATH, JSON.stringify(pool, null, 2));
        
        return {
          content: [{
            type: "text",
            text: `Account ${account_name} set to ${status}`
          }]
        };
      }
      
      return { content: [{ type: "text", text: "Invalid action or parameters" }] };
    }
  );
}
