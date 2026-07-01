// Quick health check for PRISM MCP server
const path = require("path");
process.chdir("C:\\PRISM\\mcp-server");

async function test() {
  try {
    // Test 1: Can we load registries?
    const { registryManager } = require("./dist/registries/index.js");
    console.log("1. Registry module loaded OK");

    await registryManager.initialize();
    console.log("2. Registries initialized OK");
    console.log("   Materials:", registryManager.materials?.size || "N/A");
    console.log("   Machines:", registryManager.machines?.size || "N/A");
    console.log("   Alarms:", registryManager.alarms?.size || "N/A");
    console.log("   Formulas:", registryManager.formulas?.size || "N/A");
    console.log("   Skills:", registryManager.skills?.size || "N/A");
    console.log("   Scripts:", registryManager.scripts?.size || "N/A");

    // Test 2: Can we load hookEngine?
    try {
      const { hookEngine } = require("./dist/orchestration/HookEngine.js");
      const hooks = hookEngine.listHooks();
      console.log("3. HookEngine loaded OK, hooks:", hooks.length);
    } catch (e) {
      console.log("3. HookEngine FAILED:", e.message);
    }

    // Test 3: Can we load eventBus?
    try {
      const { eventBus } = require("./dist/engines/EventBus.js");
      console.log("4. EventBus loaded OK");
    } catch (e) {
      console.log("4. EventBus FAILED:", e.message);
    }

    // Test 4: Can we load hookExecutor?
    try {
      const { hookExecutor } = require("./dist/engines/HookExecutor.js");
      console.log("5. HookExecutor loaded OK");
    } catch (e) {
      console.log("5. HookExecutor FAILED:", e.message);
    }

    // Test 5: Test dataDispatcher logic directly
    try {
      const mat = await registryManager.materials.search({ query: "4140", limit: 1 });
      console.log("6. Material search OK, found:", mat?.results?.length || mat?.length || "unknown");
    } catch (e) {
      console.log("6. Material search FAILED:", e.message);
    }

    // Test 6: Test the actual dispatcher function
    try {
      const distIndex = require("./dist/index.js");
      console.log("7. dist/index.js loaded OK, exports:", Object.keys(distIndex).join(", ") || "none");
    } catch (e) {
      console.log("7. dist/index.js FAILED:", e.message);
      console.log("   Stack:", e.stack?.split("\n").slice(0, 5).join("\n"));
    }

  } catch (e) {
    console.error("FATAL:", e.message);
    console.error("Stack:", e.stack?.split("\n").slice(0, 5).join("\n"));
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
