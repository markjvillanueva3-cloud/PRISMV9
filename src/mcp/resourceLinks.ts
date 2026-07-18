/**
 * MCP Resource Links for PRISM Tool Results
 *
 * Adds resource_link references to dispatcher results so clients
 * can navigate from calculation results to the underlying data.
 *
 * Example: sf_orchestrate result includes links to:
 * - prism://material/6061-T6  (material used)
 * - prism://machine/haas-vf2  (machine used)
 * - prism://tool/KC-123       (tool used)
 *
 * @see MCP spec 2025-11-25 resource_link content type
 */

export interface ResourceLink {
  type: "resource_link";
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Create a resource link to a PRISM material.
 */
export function materialLink(
  materialId: string,
  name?: string
): ResourceLink {
  return {
    type: "resource_link",
    uri: `prism://material/${encodeURIComponent(materialId)}`,
    name: name ?? `Material: ${materialId}`,
    description: "Kienzle/Taylor parameters, properties",
    mimeType: "application/json",
  };
}

/**
 * Create a resource link to a PRISM machine.
 */
export function machineLink(
  machineId: string,
  name?: string
): ResourceLink {
  return {
    type: "resource_link",
    uri: `prism://machine/${encodeURIComponent(machineId)}`,
    name: name ?? `Machine: ${machineId}`,
    description: "Specs, kinematics, controller",
    mimeType: "application/json",
  };
}

/**
 * Create a resource link to a PRISM cutting tool.
 */
export function toolLink(
  toolId: string,
  name?: string
): ResourceLink {
  return {
    type: "resource_link",
    uri: `prism://tool/${encodeURIComponent(toolId)}`,
    name: name ?? `Tool: ${toolId}`,
    description: "Geometry, coating, grade",
    mimeType: "application/json",
  };
}

/**
 * Create a resource link to an alarm code.
 */
export function alarmLink(
  alarmCode: string,
  name?: string
): ResourceLink {
  return {
    type: "resource_link",
    uri: `prism://alarm/${encodeURIComponent(alarmCode)}`,
    name: name ?? `Alarm: ${alarmCode}`,
    description: "Meaning, cause, fix steps",
    mimeType: "application/json",
  };
}

/**
 * Extract resource links from a dispatcher result.
 * Scans result for material/machine/tool IDs and creates links.
 */
export function extractResourceLinks(
  result: Record<string, unknown>
): ResourceLink[] {
  const links: ResourceLink[] = [];
  const seen = new Set<string>();

  function addIfNew(link: ResourceLink): void {
    if (!seen.has(link.uri)) {
      seen.add(link.uri);
      links.push(link);
    }
  }

  // Scan common field names for linkable IDs
  const materialFields = [
    "material", "material_id", "materialId",
    "material_name", "workpiece_material",
  ];
  const machineFields = [
    "machine", "machine_id", "machineId",
    "machine_name", "machine_brand",
  ];
  const toolFields = [
    "tool", "tool_id", "toolId",
    "tool_name", "cutter",
  ];

  function scan(obj: unknown, depth = 0): void {
    if (depth > 3 || !obj || typeof obj !== "object") return;

    const record = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && value.length > 0) {
        const keyLower = key.toLowerCase();
        if (materialFields.some(f => keyLower.includes(f))) {
          addIfNew(materialLink(value));
        }
        if (machineFields.some(f => keyLower.includes(f))) {
          addIfNew(machineLink(value));
        }
        if (toolFields.some(f => keyLower.includes(f))) {
          addIfNew(toolLink(value));
        }
      }
      if (typeof value === "object" && value !== null) {
        scan(value, depth + 1);
      }
    }
  }

  scan(result);
  return links;
}
