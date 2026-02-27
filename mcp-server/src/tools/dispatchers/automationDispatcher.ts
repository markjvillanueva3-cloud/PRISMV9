/**
 * prism_automation — Shop Floor Automation Dispatcher
 *
 * 5 actions: oee_calc, bottleneck, digital_thread, work_instructions, shift_handoff
 *
 * Engine dependencies: OEECalculatorEngine, BottleneckIdentificationEngine,
 *   DigitalThreadEngine, DigitalWorkInstructionEngine, ShiftHandoffEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

let _oee: any, _bottleneck: any, _thread: any, _instructions: any, _handoff: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "oee": return _oee ??= (await import("../../engines/OEECalculatorEngine.js")).oeeCalculatorEngine;
    case "bottleneck": return _bottleneck ??= (await import("../../engines/BottleneckIdentificationEngine.js")).bottleneckIdentificationEngine;
    case "thread": return _thread ??= (await import("../../engines/DigitalThreadEngine.js")).digitalThreadEngine;
    case "instructions": return _instructions ??= (await import("../../engines/DigitalWorkInstructionEngine.js")).digitalWorkInstructionEngine;
    case "handoff": return _handoff ??= (await import("../../engines/ShiftHandoffEngine.js")).shiftHandoffEngine;
    default: throw new Error(`Unknown automation engine: ${name}`);
  }
}

const ACTIONS = [
  "oee_calc", "bottleneck", "digital_thread", "work_instructions", "shift_handoff",
] as const;

export function registerAutomationDispatcher(server: any): void {
  server.tool(
    "prism_automation",
    `Shop Floor Automation dispatcher — OEE calculation, bottleneck analysis, digital thread tracing, work instructions, shift handoff reports.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_automation] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        switch (action) {
          case "oee_calc": {
            const engine = await getEngine("oee");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "OEECalculator method not found" };
            break;
          }
          case "bottleneck": {
            const engine = await getEngine("bottleneck");
            result = engine.identify?.(params) ?? engine.compute?.(params) ?? { error: "BottleneckIdentification method not found" };
            break;
          }
          case "digital_thread": {
            const engine = await getEngine("thread");
            result = engine.trace?.(params) ?? engine.compute?.(params) ?? { error: "DigitalThread method not found" };
            break;
          }
          case "work_instructions": {
            const engine = await getEngine("instructions");
            result = engine.generate?.(params) ?? engine.compute?.(params) ?? { error: "DigitalWorkInstruction method not found" };
            break;
          }
          case "shift_handoff": {
            const engine = await getEngine("handoff");
            result = engine.generate?.(params) ?? engine.compute?.(params) ?? { error: "ShiftHandoff method not found" };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_automation");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
