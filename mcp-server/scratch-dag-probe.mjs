import { registerOrchestrationDispatcher } from "./src/tools/dispatchers/orchestrationDispatcher.ts";
let handler;
registerOrchestrationDispatcher({ tool: (_n,_d,_s,h) => { handler = h; } });
const res = await handler({ action: "roadmap_dag_build", params: { forceReload: true } });
const txt = res?.content?.[0]?.text ?? "null";
console.log("raw:", txt.slice(0, 400));
