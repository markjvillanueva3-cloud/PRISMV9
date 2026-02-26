/**
 * PRISM MCP Server - Data Access Tools
 * Tools for retrieving materials, machines, tools, and alarms
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  MaterialGetInputSchema,
  MaterialSearchInputSchema,
  MaterialCompareInputSchema,
  MachineGetInputSchema,
  MachineSearchInputSchema,
  ToolGetInputSchema,
  ToolSearchInputSchema,
  AlarmDecodeInputSchema,
  AlarmSearchInputSchema,
  type MaterialGetInput,
  type MaterialSearchInput,
  type MachineGetInput,
  type MachineSearchInput,
  type AlarmDecodeInput
} from "../schemas.js";
import {
  getMaterial,
  searchMaterials,
  getMachine,
  searchMachines,
  decodeAlarm,
  loadAlarms
} from "../services/dataLoader.js";
import {
  successResponse,
  paginatedResponse,
  formatMaterial,
  formatMaterialList,
  formatMachine,
  formatMachineList,
  formatAlarm,
  formatAlarmList
} from "../utils/formatters.js";
import { withErrorHandling, NotFoundError } from "../utils/errors.js";
import { log } from "../utils/Logger.js";
import { DEFAULT_PAGE_SIZE } from "../constants.js";

/**
 * Register all data access tools with the MCP server
 */
export function registerDataAccessTools(server: McpServer): void {
  
  // =========================================================================
  // MATERIAL TOOLS
  // =========================================================================
  
  server.registerTool(
    "prism_material_get",
    {
      title: "Get Material",
      description: `Retrieve a specific material from the PRISM materials database.

This tool provides access to 1,047+ materials with up to 127 parameters each, including:
- Physical properties (density, melting point, thermal conductivity)
- Mechanical properties (hardness, tensile strength, yield strength)
- Machining properties (machinability rating, chip formation, coolant recommendations)
- Kienzle cutting force coefficients (kc1.1, mc)
- Johnson-Cook constitutive model parameters
- Taylor tool life coefficients

Args:
  - identifier (string): Material ID (e.g., 'CS-1045-001') or common name (e.g., '4140 steel')
  - fields (string[], optional): Specific fields to return
  - layer (string, optional): Data layer: CORE, ENHANCED, USER, or LEARNED
  - response_format ('json' | 'markdown'): Output format

Returns:
  Complete material data with all available parameters.

Examples:
  - Get steel by ID: identifier="CS-1045-001"
  - Get by name: identifier="4140 steel"
  - Get aluminum: identifier="6061-T6"`,
      inputSchema: MaterialGetInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_material_get", async (params: MaterialGetInput) => {
      log.tool("prism_material_get", `Looking up: ${params.identifier}`);
      
      const material = await getMaterial(params.identifier);
      const format = params.response_format || "json";
      
      return successResponse(
        formatMaterial(material, format),
        { success: true, material, layer: material.metadata?.layer }
      );
    })
  );

  server.registerTool(
    "prism_material_search",
    {
      title: "Search Materials",
      description: `Search the PRISM materials database with multiple filter criteria.

Search across 1,047+ materials organized by ISO 513 classification:
- P: Steels (carbon, alloy, tool steels)
- M: Stainless Steels (austenitic, ferritic, martensitic, duplex)
- K: Cast Irons (gray, ductile, malleable)
- N: Non-Ferrous (aluminum, copper, brass, bronze, magnesium)
- S: Superalloys (nickel, cobalt, titanium alloys)
- H: Hardened Steels (>45 HRC)
- X: Specialty (composites, plastics, ceramics)

Args:
  - query (string, optional): Free text search
  - iso_group (string, optional): ISO 513 group (P, M, K, N, S, H, X)
  - category (string, optional): Material category
  - hardness_min/max (number, optional): Hardness range (HB)
  - machinability_min (number, optional): Minimum machinability %
  - limit (number): Results per page (default: 20)
  - offset (number): Pagination offset

Returns:
  Paginated list of matching materials with key properties.`,
      inputSchema: MaterialSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_material_search", async (params: MaterialSearchInput) => {
      log.tool("prism_material_search", `Searching materials`, params);
      
      const results = await searchMaterials({
        query: params.query,
        iso_group: params.iso_group,
        category: params.category,
        hardness_min: params.hardness_min,
        hardness_max: params.hardness_max,
        machinability_min: params.machinability_min
      });
      
      const limit = params.limit || DEFAULT_PAGE_SIZE;
      const offset = params.offset || 0;
      const paged = results.slice(offset, offset + limit);
      
      return paginatedResponse(
        paged,
        results.length,
        offset,
        formatMaterialList
      );
    })
  );

  // =========================================================================
  // MACHINE TOOLS
  // =========================================================================

  server.registerTool(
    "prism_machine_get",
    {
      title: "Get Machine",
      description: `Retrieve a specific CNC machine from the PRISM machines database.

Access 824+ machines from 43+ manufacturers with specifications including:
- Work envelope (X, Y, Z travel, rotary axes)
- Spindle specs (RPM, power, torque, taper)
- Axis dynamics (rapids, acceleration, accuracy)
- Tool changer (capacity, change time)
- Controller configuration

Data layers:
- BASIC: Essential specs
- CORE: Standard kinematic data
- ENHANCED: Full manufacturer specs
- LEVEL5: CAD-mapped high-fidelity (major manufacturers)

Args:
  - identifier (string): Machine ID or model name
  - layer (string, optional): Data layer to query
  - response_format ('json' | 'markdown'): Output format

Examples:
  - identifier="DMG-DMU50"
  - identifier="Haas VF-2"
  - identifier="Mazak QTN-200"`,
      inputSchema: MachineGetInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_machine_get", async (params: MachineGetInput) => {
      log.tool("prism_machine_get", `Looking up: ${params.identifier}`);
      
      const machine = await getMachine(params.identifier);
      const format = params.response_format || "json";
      
      return successResponse(
        formatMachine(machine, format),
        { success: true, machine, layer: machine.metadata?.layer }
      );
    })
  );

  server.registerTool(
    "prism_machine_search",
    {
      title: "Search Machines",
      description: `Search the PRISM machines database with filter criteria.

Search 824+ CNC machines by:
- Manufacturer (DMG MORI, Haas, Mazak, Okuma, etc.)
- Machine type (vertical_mill, horizontal_mill, 5_axis, lathe, turn_mill, swiss)
- Controller family (FANUC, SIEMENS, HAAS, MAZAK, etc.)
- Specifications (travel, spindle speed, power)

Args:
  - manufacturer (string, optional): Filter by manufacturer
  - type (string, optional): Machine type
  - controller (string, optional): Controller family
  - min_x_travel, min_y_travel, min_z_travel (number, optional): Minimum axis travel (mm)
  - min_spindle_rpm (number, optional): Minimum spindle speed
  - min_spindle_power (number, optional): Minimum spindle power (kW)
  - limit, offset: Pagination

Returns:
  Paginated list of matching machines.`,
      inputSchema: MachineSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_machine_search", async (params: MachineSearchInput) => {
      log.tool("prism_machine_search", `Searching machines`, params);
      
      const results = await searchMachines({
        manufacturer: params.manufacturer,
        type: params.type,
        controller: params.controller,
        min_x_travel: params.min_x_travel,
        min_spindle_rpm: params.min_spindle_rpm,
        min_spindle_power: params.min_spindle_power
      });
      
      const limit = params.limit || DEFAULT_PAGE_SIZE;
      const offset = params.offset || 0;
      const paged = results.slice(offset, offset + limit);
      
      return paginatedResponse(
        paged,
        results.length,
        offset,
        formatMachineList
      );
    })
  );

  // =========================================================================
  // ALARM TOOLS
  // =========================================================================

  server.registerTool(
    "prism_alarm_decode",
    {
      title: "Decode Alarm",
      description: `Decode a CNC controller alarm code and get fix procedures.

Access 2,500+ alarms across 12 controller families:
- FANUC (450+ alarms)
- HAAS (250+ alarms)
- SIEMENS (180+ alarms)
- MAZAK (120+ alarms)
- OKUMA (115+ alarms)
- HEIDENHAIN (125+ alarms)
- MITSUBISHI (150+ alarms)
- BROTHER (95+ alarms)
- And more...

Returns:
- Alarm description and severity
- Possible causes
- Quick fix procedure
- Detailed troubleshooting steps
- Related alarms
- Safety warnings

Args:
  - code (string): Alarm code (e.g., 'PS0001', '100', 'EX1001')
  - controller (string, optional): Controller family (auto-detected if omitted)

Examples:
  - code="PS0001" (FANUC program stop)
  - code="100", controller="HAAS" (servo error)
  - code="2000" (spindle alarm)`,
      inputSchema: AlarmDecodeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_alarm_decode", async (params: AlarmDecodeInput) => {
      log.tool("prism_alarm_decode", `Decoding: ${params.code}`);
      
      const alarm = await decodeAlarm(params.code, params.controller);
      const format = params.response_format || "markdown";
      
      return successResponse(
        formatAlarm(alarm, format),
        { success: true, alarm, quick_actions: alarm.causes?.slice(0, 3) }
      );
    })
  );

  server.registerTool(
    "prism_alarm_search",
    {
      title: "Search Alarms",
      description: `Search controller alarms by keyword or category.

Filter alarms by:
- Free text search in name/description
- Controller family
- Category (SERVO, SPINDLE, ATC, PROGRAM, SAFETY, etc.)
- Severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)

Args:
  - query (string, optional): Text search
  - controller (string, optional): Controller family
  - category (string, optional): Alarm category
  - severity (string, optional): Severity level
  - limit, offset: Pagination

Returns:
  Paginated list of matching alarms.`,
      inputSchema: AlarmSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_alarm_search", async (params) => {
      log.tool("prism_alarm_search", `Searching alarms`, params);
      
      const allAlarms = await loadAlarms();
      const results: typeof allAlarms extends Map<string, infer T> ? T[] : never[] = [];
      
      for (const alarm of allAlarms.values()) {
        // Skip duplicate entries
        if (!alarm.alarm_id?.includes("-")) continue;
        
        if (params.controller && alarm.controller_family !== params.controller) continue;
        if (params.category && alarm.category !== params.category) continue;
        if (params.severity && alarm.severity !== params.severity) continue;
        
        if (params.query) {
          const q = params.query.toLowerCase();
          const searchable = [alarm.name, alarm.description, ...(alarm.causes || [])].join(" ").toLowerCase();
          if (!searchable.includes(q)) continue;
        }
        
        results.push(alarm);
      }
      
      const limit = params.limit || DEFAULT_PAGE_SIZE;
      const offset = params.offset || 0;
      const paged = results.slice(offset, offset + limit);
      
      return paginatedResponse(
        paged,
        results.length,
        offset,
        formatAlarmList
      );
    })
  );

  log.debug("Data access tools registered");
}
