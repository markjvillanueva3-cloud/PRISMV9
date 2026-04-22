#!/usr/bin/env node
/**
 * macro-expander.mjs — PRISM Macro & Shortcode Expansion System
 *
 * Allows Claude to use compact codes that expand to full forms:
 *
 * FILE CODES (from CODE_SYSTEM_INDEX):
 *   E0001 → src/engines/AHPEngine.ts
 *   D01   → src/tools/dispatchers/calcDispatcher.ts
 *   A05   → src/algorithms/KienzleForce.ts
 *
 * ACTION CODES (dispatcher:action shortcuts):
 *   PC:sfs  → prism_calc:speed_feed_solve
 *   PD:ml   → prism_data:material_lookup
 *   PS:chk  → prism_safety:safety_check
 *
 * SEQUENCE MACROS (common multi-step patterns):
 *   @sf-full    → material_lookup + tool_lookup + speed_feed_solve + verify
 *   @quote-job  → job_estimate + material_cost + cycle_time + margin
 *   @validate   → build + test + lint
 *
 * Usage:
 *   node macro-expander.mjs expand "PC:sfs"        → prism_calc:speed_feed_solve
 *   node macro-expander.mjs expand "E0567"         → src/engines/SpeedFeedOrchestratorEngine.ts
 *   node macro-expander.mjs expand "@sf-full"      → [sequence array]
 *   node macro-expander.mjs list                   → show all macros
 *   node macro-expander.mjs define "@name" "value" → define new macro
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const CODE_INDEX_PATH = "H:/prism/mcp-server/data/docs/CODE_SYSTEM_INDEX.json";
const MACRO_FILE = "H:/prism/.claude/cache/user-macros.json";

// ─── ACTION SHORTCODES ────────────────────────────────────────────
// Format: dispatcher_prefix:action_abbreviation → full dispatcher:action
const ACTION_SHORTCUTS = {
  // prism_calc (PC)
  "PC:sfs": "prism_calc:speed_feed_solve",
  "PC:sfv": "prism_calc:speed_feed_validate",
  "PC:tl": "prism_calc:tool_life_calculate",
  "PC:cf": "prism_calc:cutting_force",
  "PC:pwr": "prism_calc:power_estimate",
  "PC:thm": "prism_calc:thermal_analysis",
  "PC:ct": "prism_calc:cycle_time",

  // prism_data (PD)
  "PD:ml": "prism_data:material_lookup",
  "PD:tl": "prism_data:tool_lookup",
  "PD:mch": "prism_data:machine_lookup",
  "PD:reg": "prism_data:registry_search",
  "PD:cat": "prism_data:catalog_search",

  // prism_safety (PS)
  "PS:chk": "prism_safety:safety_check",
  "PS:col": "prism_safety:collision_check",
  "PS:lim": "prism_safety:limit_check",
  "PS:veto": "prism_safety:veto_gate",

  // prism_dev (PDV)
  "PDV:bld": "prism_dev:build",
  "PDV:tst": "prism_dev:test_run",
  "PDV:hlth": "prism_dev:health_check",
  "PDV:aud": "prism_dev:audit",
  "PDV:cov": "prism_dev:test_coverage",
  "PDV:sec": "prism_dev:security_audit",
  "PDV:sch": "prism_dev:schema_check",
  "PDV:ver": "prism_dev:schema_version",

  // prism_quality (PQL)
  "PQL:scr": "prism_quality:quality_score",
  "PQL:spc": "prism_quality:spc_check",
  "PQL:fai": "prism_quality:fai_check",

  // prism_toolpath (PTP)
  "PTP:gen": "prism_toolpath:generate",
  "PTP:opt": "prism_toolpath:optimize",
  "PTP:sim": "prism_toolpath:simulate",

  // prism_orchestrate (POR)
  "POR:nxt": "prism_orchestrate:roadmap_next",
  "POR:clm": "prism_orchestrate:roadmap_claim",
  "POR:cmp": "prism_orchestrate:roadmap_complete",
  "POR:rel": "prism_orchestrate:roadmap_release",
  "POR:hb": "prism_orchestrate:roadmap_heartbeat",

  // Distributed Locking (LOCK)
  "LOCK:acq": "prism_orchestrate:lock_acquire",
  "LOCK:rel": "prism_orchestrate:lock_release",
  "LOCK:chk": "prism_orchestrate:lock_status",
  "LOCK:rnw": "prism_orchestrate:lock_renew",

  // Dead Letter Queue (DLQ)
  "DLQ:peek": "prism_orchestrate:dlq_peek",
  "DLQ:retry": "prism_orchestrate:dlq_retry",
  "DLQ:drop": "prism_orchestrate:dlq_drop",

  // prism_knowledge (PKN)
  "PKN:trb": "prism_knowledge:tribal_search",
  "PKN:pbk": "prism_knowledge:playbook_lookup",
  "PKN:lrn": "prism_knowledge:learn_pattern",

  // prism_edm (PEDM)
  "PEDM:mp": "prism_edm:wedm_multipass",
  "PEDM:wsp": "prism_edm:wedm_speed",
  "PEDM:elc": "prism_edm:electrode_design",

  // prism_thread (PTH)
  "PTH:dat": "prism_thread:thread_data",
  "PTH:cyc": "prism_thread:threading_cycle",
};

// ─── SEQUENCE MACROS ────────────────────────────────────────────
// Format: @macro_name → array of actions to execute in sequence
const SEQUENCE_MACROS = {
  "@sf-full": {
    description: "Full speed/feed calculation with material + tool lookup",
    steps: [
      "prism_data:material_lookup",
      "prism_data:tool_lookup",
      "prism_calc:speed_feed_solve",
      "prism_safety:limit_check",
    ],
  },
  "@quote-job": {
    description: "Full job quoting sequence",
    steps: [
      "prism_calc:cycle_time",
      "prism_data:material_lookup",
      "prism_business:material_cost",
      "prism_business:job_estimate",
    ],
  },
  "@validate": {
    description: "Build + test + lint cycle",
    steps: ["prism_dev:build", "prism_dev:test_run", "prism_dev:lint"],
  },
  "@toolpath-full": {
    description: "Complete toolpath generation with verification",
    steps: [
      "prism_toolpath:generate",
      "prism_toolpath:optimize",
      "prism_safety:collision_check",
      "prism_toolpath:simulate",
    ],
  },
  "@health": {
    description: "System health check",
    steps: ["prism_dev:health_check", "prism_dev:audit", "prism_quality:quality_score"],
  },
  "@milestone": {
    description: "Roadmap milestone workflow",
    steps: [
      "prism_orchestrate:roadmap_next",
      "prism_orchestrate:roadmap_claim",
      // ... work happens ...
      "prism_orchestrate:roadmap_complete",
    ],
  },
  "@validate-full": {
    description: "Full validation with coverage and security",
    steps: [
      "prism_dev:build",
      "prism_dev:test_run",
      "prism_dev:lint",
      "prism_dev:test_coverage",
      "prism_dev:security_audit",
    ],
  },
  "@ci-local": {
    description: "Local CI simulation",
    steps: [
      "prism_dev:build",
      "prism_dev:test_coverage",
      "prism_dev:schema_check",
      "prism_dev:security_audit",
    ],
  },
  "@claim-safe": {
    description: "Safe milestone claim with locking",
    steps: [
      "prism_orchestrate:lock_acquire",
      "prism_orchestrate:roadmap_claim",
      "prism_orchestrate:roadmap_heartbeat",
    ],
  },
  "@pipeline-check": {
    description: "Pipeline health check",
    steps: [
      "prism_orchestrate:lock_status",
      "prism_orchestrate:dlq_peek",
      "prism_orchestrate:swarm_status",
    ],
  },
  "@release-gate": {
    description: "Pre-release validation gate",
    steps: [
      "prism_dev:build",
      "prism_dev:test_coverage",
      "prism_dev:security_audit",
      "prism_dev:schema_check",
      "prism_safety:safety_check",
    ],
  },
};

// ─── CODE INDEX LOADING ────────────────────────────────────────────

let codeIndex = null;

async function loadCodeIndex() {
  if (codeIndex) return codeIndex;
  try {
    const raw = await fs.readFile(CODE_INDEX_PATH, "utf8");
    codeIndex = JSON.parse(raw);
    return codeIndex;
  } catch {
    return null;
  }
}

async function resolveFileCode(code) {
  const index = await loadCodeIndex();
  if (!index?.codes) return null;
  const entry = index.codes[code.toUpperCase()];
  return entry ? entry.path : null;
}

// ─── USER MACROS ────────────────────────────────────────────

async function loadUserMacros() {
  try {
    const raw = await fs.readFile(MACRO_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveUserMacros(macros) {
  await fs.mkdir(path.dirname(MACRO_FILE), { recursive: true });
  await fs.writeFile(MACRO_FILE, JSON.stringify(macros, null, 2), "utf8");
}

// ─── EXPANSION ────────────────────────────────────────────

async function expand(input) {
  const trimmed = input.trim();

  // 1. Check action shortcuts (PC:sfs → prism_calc:speed_feed_solve)
  if (ACTION_SHORTCUTS[trimmed]) {
    return { type: "action", value: ACTION_SHORTCUTS[trimmed] };
  }

  // 2. Check sequence macros (@sf-full → [steps...])
  if (SEQUENCE_MACROS[trimmed]) {
    return {
      type: "sequence",
      value: SEQUENCE_MACROS[trimmed].steps,
      description: SEQUENCE_MACROS[trimmed].description,
    };
  }

  // 3. Check user-defined macros
  const userMacros = await loadUserMacros();
  if (userMacros[trimmed]) {
    return { type: "user", value: userMacros[trimmed] };
  }

  // 4. Check file codes (E0001 → path)
  if (/^[A-Z]{1,3}\d+$/i.test(trimmed)) {
    const filePath = await resolveFileCode(trimmed);
    if (filePath) {
      return { type: "file", value: filePath, code: trimmed.toUpperCase() };
    }
  }

  // 5. Not found
  return { type: "unknown", value: trimmed };
}

// ─── CLI ────────────────────────────────────────────

async function main() {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case "expand": {
      const result = await expand(args.join(" "));
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "list": {
      console.log("ACTION SHORTCUTS:");
      for (const [k, v] of Object.entries(ACTION_SHORTCUTS).slice(0, 20)) {
        console.log(`  ${k.padEnd(12)} → ${v}`);
      }
      console.log(`  ... and ${Object.keys(ACTION_SHORTCUTS).length - 20} more\n`);

      console.log("SEQUENCE MACROS:");
      for (const [k, v] of Object.entries(SEQUENCE_MACROS)) {
        console.log(`  ${k.padEnd(15)} → ${v.description}`);
      }

      const userMacros = await loadUserMacros();
      if (Object.keys(userMacros).length > 0) {
        console.log("\nUSER MACROS:");
        for (const [k, v] of Object.entries(userMacros)) {
          console.log(`  ${k.padEnd(15)} → ${v}`);
        }
      }

      const index = await loadCodeIndex();
      if (index?._meta) {
        console.log(`\nFILE CODES: ${index._meta.total_codes} codes (E=Engine, D=Dispatcher, A=Algorithm, ...)`);
      }
      break;
    }

    case "define": {
      const [name, ...valueParts] = args;
      const value = valueParts.join(" ");
      if (!name || !value) {
        console.log("Usage: macro-expander.mjs define @name value");
        process.exit(1);
      }
      const macros = await loadUserMacros();
      macros[name] = value;
      await saveUserMacros(macros);
      console.log(`Defined: ${name} → ${value}`);
      break;
    }

    case "delete": {
      const name = args[0];
      if (!name) {
        console.log("Usage: macro-expander.mjs delete @name");
        process.exit(1);
      }
      const macros = await loadUserMacros();
      if (macros[name]) {
        delete macros[name];
        await saveUserMacros(macros);
        console.log(`Deleted: ${name}`);
      } else {
        console.log(`Not found: ${name}`);
      }
      break;
    }

    default:
      console.log("PRISM Macro Expander");
      console.log("====================");
      console.log("Usage:");
      console.log("  expand <code>    Expand a shortcode/macro");
      console.log("  list             List all shortcuts and macros");
      console.log("  define @name val Define a user macro");
      console.log("  delete @name     Delete a user macro");
      console.log("");
      console.log("Examples:");
      console.log('  expand "PC:sfs"  → prism_calc:speed_feed_solve');
      console.log('  expand "E0567"   → src/engines/SpeedFeedOrchestratorEngine.ts');
      console.log('  expand "@sf-full" → [material_lookup, tool_lookup, speed_feed_solve, ...]');
  }
}

main().catch(console.error);
