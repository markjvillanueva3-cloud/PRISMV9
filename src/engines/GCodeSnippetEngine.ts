/**
 * GCodeSnippetEngine — Common G-code snippet library
 *
 * Provides pre-built G-code snippets for common operations,
 * eliminating the need to generate boilerplate G-code from scratch.
 * Parameterized templates with fill-in-the-blank values.
 *
 * Token savings: Instant G-code generation without full program creation.
 *
 * @version 1.0.0
 */

export interface GCodeSnippet {
  id: string;
  name: string;
  description: string;
  code: string;
  params: string[];
  controller: string;
  category: string;
}

const SNIPPETS: GCodeSnippet[] = [
  // Tool change
  {
    id: "tool_change",
    name: "Tool Change",
    description: "Safe tool change with retract and spindle stop",
    code: `G28 G91 Z0. (Retract Z to home)
M5 (Spindle stop)
T{tool_number} M6 (Tool change)
G43 H{tool_number} (Tool length comp)
S{rpm} M3 (Spindle on CW)`,
    params: ["tool_number", "rpm"],
    controller: "fanuc",
    category: "setup",
  },
  // Work offset probe
  {
    id: "work_offset",
    name: "Work Offset Setup",
    description: "Set work coordinate system",
    code: `G90 G54 (Abs mode, work offset 1)
G0 X0. Y0. (Rapid to XY zero)
G43 H{tool_number} Z{clearance} (Safe Z height)`,
    params: ["tool_number", "clearance"],
    controller: "fanuc",
    category: "setup",
  },
  // Face milling
  {
    id: "face_mill",
    name: "Face Mill Pass",
    description: "Single face milling pass across part",
    code: `G0 X{start_x} Y{start_y} (Rapid to start)
G43 H{tool_number} Z{clearance}
G1 Z{depth} F{plunge_feed} (Plunge to depth)
G1 X{end_x} F{feed} (Feed across part)
G0 Z{clearance} (Retract)`,
    params: ["start_x", "start_y", "end_x", "depth", "clearance", "feed", "plunge_feed", "tool_number"],
    controller: "fanuc",
    category: "milling",
  },
  // Drill cycle
  {
    id: "drill_peck",
    name: "Peck Drill Cycle",
    description: "G83 peck drilling cycle",
    code: `G0 X{x} Y{y} (Rapid to hole position)
G43 H{tool_number} Z{clearance}
G83 Z{depth} Q{peck_depth} R{retract} F{feed} (Peck drill)
G80 (Cancel cycle)
G0 Z{clearance} (Retract)`,
    params: ["x", "y", "depth", "peck_depth", "retract", "clearance", "feed", "tool_number"],
    controller: "fanuc",
    category: "drilling",
  },
  // Tapping cycle
  {
    id: "rigid_tap",
    name: "Rigid Tapping",
    description: "G84 rigid tapping cycle",
    code: `G0 X{x} Y{y}
G43 H{tool_number} Z{clearance}
S{rpm} M3
G84 Z{depth} R{retract} F{feed} (Rigid tap - F = RPM × pitch)
G80
G0 Z{clearance}`,
    params: ["x", "y", "depth", "retract", "clearance", "rpm", "feed", "tool_number"],
    controller: "fanuc",
    category: "drilling",
  },
  // Circular pocket
  {
    id: "circular_pocket",
    name: "Circular Pocket",
    description: "Helical interpolation circular pocket",
    code: `G0 X{center_x} Y{center_y}
G43 H{tool_number} Z{clearance}
G1 Z{start_z} F{plunge_feed}
(Helical entry)
G2 X{center_x} Y{center_y} I{radius} J0. Z{depth} F{feed}
G0 Z{clearance}`,
    params: ["center_x", "center_y", "radius", "start_z", "depth", "clearance", "feed", "plunge_feed", "tool_number"],
    controller: "fanuc",
    category: "milling",
  },
  // Program header
  {
    id: "program_header",
    name: "Program Header",
    description: "Standard program header with safety block",
    code: `%
O{program_number} ({program_name})
(Date: {date})
(Material: {material})
(Machine: {machine})
G90 G80 G40 G49 (Safety block)
G17 G20 (XY plane, inch mode)`,
    params: ["program_number", "program_name", "date", "material", "machine"],
    controller: "fanuc",
    category: "setup",
  },
  // Program footer
  {
    id: "program_footer",
    name: "Program Footer",
    description: "Standard program end",
    code: `G28 G91 Z0. (Retract Z)
G28 Y0. (Retract Y)
M5 (Spindle stop)
M9 (Coolant off)
M30 (Program end)
%`,
    params: [],
    controller: "fanuc",
    category: "setup",
  },
  // Contour pass
  {
    id: "contour_2d",
    name: "2D Contour",
    description: "Simple 2D contour with cutter comp",
    code: `G0 X{approach_x} Y{approach_y}
G43 H{tool_number} Z{clearance}
G1 Z{depth} F{plunge_feed}
G41 D{tool_number} (Cutter comp left)
G1 X{start_x} Y{start_y} F{feed}
(... contour moves ...)
G1 X{end_x} Y{end_y}
G40 (Cancel cutter comp)
G0 Z{clearance}`,
    params: ["approach_x", "approach_y", "start_x", "start_y", "end_x", "end_y",
             "depth", "clearance", "feed", "plunge_feed", "tool_number"],
    controller: "fanuc",
    category: "milling",
  },
  // Coolant commands
  {
    id: "coolant_flood",
    name: "Flood Coolant On",
    description: "Turn on flood coolant",
    code: "M8 (Flood coolant on)",
    params: [],
    controller: "fanuc",
    category: "utility",
  },
];

export class GCodeSnippetEngine {

  /**
   * Get a snippet by ID.
   */
  get(id: string): GCodeSnippet | null {
    return SNIPPETS.find(s => s.id === id) || null;
  }

  /**
   * Fill a snippet with parameter values.
   */
  fill(id: string, params: Record<string, string | number>): string | null {
    const snippet = this.get(id);
    if (!snippet) return null;

    let code = snippet.code;
    for (const [key, value] of Object.entries(params)) {
      code = code.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
    return code;
  }

  /**
   * List all snippets.
   */
  list(): Array<{ id: string; name: string; category: string; params: string[] }> {
    return SNIPPETS.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      params: s.params,
    }));
  }

  /**
   * Search snippets by keyword.
   */
  search(query: string): GCodeSnippet[] {
    const q = query.toLowerCase();
    return SNIPPETS.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      s.category.includes(q)
    );
  }

  /**
   * Get snippets by category.
   */
  byCategory(category: string): GCodeSnippet[] {
    return SNIPPETS.filter(s => s.category === category);
  }

  /**
   * Get all categories.
   */
  categories(): string[] {
    return [...new Set(SNIPPETS.map(s => s.category))];
  }

  /**
   * Get stats.
   */
  getStats(): { total: number; categories: number } {
    return { total: SNIPPETS.length, categories: this.categories().length };
  }
}

export const gCodeSnippetEngine = new GCodeSnippetEngine();
