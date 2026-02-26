try {
  const fs = require("fs");
  const data = fs.readFileSync("C:\\PRISM\\state\\nl_hooks\\registry.json", "utf-8");
  const parsed = JSON.parse(data);
  const hooks = Array.isArray(parsed) ? parsed : Array.isArray(parsed.hooks) ? parsed.hooks : [];
  const deployed = hooks.filter(h => h.deploy_status === "deployed" || h.deploy_status === "active" || h.status === "active");
  const out = `Total: ${hooks.length}, Deployed: ${deployed.length}, First: ${deployed[0]?.id || "none"}, Condition: ${deployed[0]?.condition || "none"}`;
  fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", out);
} catch(e) {
  const fs = require("fs");
  fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", "ERROR: " + e.message);
}