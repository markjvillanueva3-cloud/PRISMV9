import { registerCalcDispatcher } from "./src/tools/dispatchers/calcDispatcher.js";

interface CapturedTool { name: string; handler: (a: { action: string; params?: Record<string, unknown> }) => Promise<unknown>; }
class Mock { tools: CapturedTool[] = []; tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) { this.tools.push({ name, handler }); } }

try {
  const server = new Mock();
  registerCalcDispatcher(server as unknown as { tool: Mock["tool"] });
  const tool = server.tools.find((t) => t.name === "prism_calc");
  console.error("TOOLS:", server.tools.map((t) => t.name).join(","), "| found prism_calc:", !!tool);
  if (!tool) process.exit(1);
  const raw = await tool.handler({ action: "sfc_rag_warmstart", params: { material: "TestAlloy_SFC_RAG_WIRE_2026_06_22_xyz" } });
  console.error("RAW_MATERIAL_ONLY:", JSON.stringify(raw).slice(0, 800));
} catch (e) {
  console.error("THREW:", (e as Error)?.message, (e as Error)?.stack?.slice(0, 400));
}
