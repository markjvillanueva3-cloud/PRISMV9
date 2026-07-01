#!/usr/bin/env node
/**
 * PRISM CLI — Command-line interface for PRISM engines
 *
 * Phase 0.10 from AGI proximity plan. Provides CLI access to:
 *   - Engine method invocation
 *   - Formula calculations
 *   - Tribal knowledge search
 *   - Material/tool lookups
 *
 * Usage:
 *   prism-cli engine call <EngineName> <method> [--param value...]
 *   prism-cli engine list
 *   prism-cli formula calc <formula> --param1 val1 --param2 val2
 *   prism-cli formula list
 *   prism-cli tribal search "query"
 *   prism-cli material lookup --name "4140" --iso-group P
 *   prism-cli tool search --type endmill --diameter 12
 *
 * Environment:
 *   PRISM_API_URL — API endpoint (default: http://localhost:3000/api/py)
 *
 * @module bin/prism-cli
 */

import { parseArgs } from "node:util";

const API_URL = process.env.PRISM_API_URL || "http://localhost:3000/api/py";

// ============================================================================
// HTTP CLIENT
// ============================================================================

async function fetchJSON(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return data;
}

// ============================================================================
// COMMANDS
// ============================================================================

async function engineCall(engineName, method, params) {
  const result = await fetchJSON("/engine/call", {
    method: "POST",
    body: JSON.stringify({
      engine: engineName,
      method,
      args: params,
    }),
  });
  return result;
}

async function engineList() {
  return await fetchJSON("/engine/list");
}

async function formulaCalc(formula, params) {
  return await fetchJSON("/formula/calculate", {
    method: "POST",
    body: JSON.stringify({ formula, params }),
  });
}

async function formulaList() {
  return await fetchJSON("/formula/list");
}

async function tribalSearch(query, options = {}) {
  return await fetchJSON("/tribal/search", {
    method: "POST",
    body: JSON.stringify({
      query,
      limit: options.limit || 10,
      category: options.category,
    }),
  });
}

async function materialLookup(options) {
  return await fetchJSON("/material/lookup", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

async function toolSearch(options) {
  return await fetchJSON("/tool/search", {
    method: "POST",
    body: JSON.stringify(options),
  });
}

async function healthCheck() {
  return await fetchJSON("/health");
}

async function capabilities() {
  return await fetchJSON("/capabilities");
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseNumericParams(args) {
  const params = {};
  for (const [key, value] of Object.entries(args)) {
    if (key === "_" || key === "help" || key === "h") continue;
    const num = Number(value);
    params[key] = isNaN(num) ? value : num;
  }
  return params;
}

function printUsage() {
  console.log(`
PRISM CLI — Command-line interface for PRISM engines

USAGE:
  prism-cli <command> <subcommand> [options]

COMMANDS:
  engine call <Engine> <method> [--param value...]
    Invoke an engine method with parameters

  engine list
    List all available engines

  formula calc <formula> --param1 val1 --param2 val2
    Calculate a physics formula

  formula list
    List all available formulas

  tribal search "query" [--limit N] [--category CAT]
    Search tribal knowledge

  material lookup [--name NAME] [--iso-group GROUP] [--hardness-min N] [--hardness-max N]
    Look up material properties

  tool search [--type TYPE] [--diameter D] [--material MAT] [--operation OP]
    Search for tools

  health
    Check API health

  capabilities
    Show API capabilities

ENVIRONMENT:
  PRISM_API_URL   API endpoint (default: http://localhost:3000/api/py)

EXAMPLES:
  prism-cli engine list
  prism-cli engine call KienzleForceModelEngine calculate --ap 2.0 --fz 0.1 --kc1_1 1800
  prism-cli formula calc kienzle_force --ap 2 --fz 0.1 --kc1_1 1800 --mc 0.25
  prism-cli tribal search "thin wall milling" --limit 5
  prism-cli material lookup --name 4140
  prism-cli tool search --type endmill --diameter 12
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    return;
  }

  const command = args[0];
  const subcommand = args[1];

  try {
    let result;

    switch (command) {
      case "engine":
        if (subcommand === "list") {
          result = await engineList();
        } else if (subcommand === "call") {
          const engineName = args[2];
          const method = args[3];
          if (!engineName || !method) {
            console.error("Error: engine call requires <EngineName> <method>");
            process.exit(1);
          }
          // Parse remaining args as params
          const { values } = parseArgs({
            args: args.slice(4),
            options: {},
            strict: false,
            allowPositionals: true,
          });
          const params = parseNumericParams(values);
          result = await engineCall(engineName, method, params);
        } else {
          console.error(`Unknown engine subcommand: ${subcommand}`);
          process.exit(1);
        }
        break;

      case "formula":
        if (subcommand === "list") {
          result = await formulaList();
        } else if (subcommand === "calc") {
          const formula = args[2];
          if (!formula) {
            console.error("Error: formula calc requires <formula>");
            process.exit(1);
          }
          const { values } = parseArgs({
            args: args.slice(3),
            options: {},
            strict: false,
            allowPositionals: true,
          });
          const params = parseNumericParams(values);
          result = await formulaCalc(formula, params);
        } else {
          console.error(`Unknown formula subcommand: ${subcommand}`);
          process.exit(1);
        }
        break;

      case "tribal":
        if (subcommand === "search") {
          const query = args[2];
          if (!query) {
            console.error("Error: tribal search requires <query>");
            process.exit(1);
          }
          const { values } = parseArgs({
            args: args.slice(3),
            options: {
              limit: { type: "string", short: "l" },
              category: { type: "string", short: "c" },
            },
            strict: false,
          });
          result = await tribalSearch(query, {
            limit: values.limit ? parseInt(values.limit) : 10,
            category: values.category,
          });
        } else {
          console.error(`Unknown tribal subcommand: ${subcommand}`);
          process.exit(1);
        }
        break;

      case "material":
        if (subcommand === "lookup") {
          const { values } = parseArgs({
            args: args.slice(2),
            options: {
              name: { type: "string" },
              "iso-group": { type: "string" },
              "hardness-min": { type: "string" },
              "hardness-max": { type: "string" },
            },
            strict: false,
          });
          result = await materialLookup({
            name: values.name,
            iso_group: values["iso-group"],
            hardness_min: values["hardness-min"] ? parseFloat(values["hardness-min"]) : undefined,
            hardness_max: values["hardness-max"] ? parseFloat(values["hardness-max"]) : undefined,
          });
        } else {
          console.error(`Unknown material subcommand: ${subcommand}`);
          process.exit(1);
        }
        break;

      case "tool":
        if (subcommand === "search") {
          const { values } = parseArgs({
            args: args.slice(2),
            options: {
              type: { type: "string" },
              diameter: { type: "string" },
              material: { type: "string" },
              operation: { type: "string" },
              limit: { type: "string" },
            },
            strict: false,
          });
          result = await toolSearch({
            type: values.type,
            diameter: values.diameter ? parseFloat(values.diameter) : undefined,
            material: values.material,
            operation: values.operation,
            limit: values.limit ? parseInt(values.limit) : 10,
          });
        } else {
          console.error(`Unknown tool subcommand: ${subcommand}`);
          process.exit(1);
        }
        break;

      case "health":
        result = await healthCheck();
        break;

      case "capabilities":
        result = await capabilities();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
