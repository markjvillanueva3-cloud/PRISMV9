/**
 * Tests for hyperMILL UI Feature Parameter Schemas
 *
 * U-HKC38: Validates all 7 UI feature schema categories covering
 * ~90 parameters for job list management, tree navigation, selection modes,
 * view controls, context menus, drag and drop, and keyboard shortcuts.
 *
 * @milestone HM-KC-MS7/U-HKC38
 */

import { describe, it, expect } from "vitest";
import {
  jobListSettingsSchema,
  treeNavigationSettingsSchema,
  selectionModeSettingsSchema,
  viewControlSettingsSchema,
  contextMenuSettingsSchema,
  dragDropSettingsSchema,
  keyboardShortcutSettingsSchema,
  UI_FEATURE_SCHEMA_MAP,
  UI_FEATURE_METADATA,
  UI_FEATURE_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/settings/uiFeatureSchemas.js";

// ============================================================================
// 1. Schema Map Structure
// ============================================================================

describe("UI_FEATURE_SCHEMA_MAP", () => {
  it("has exactly 7 entries", () => {
    expect(Object.keys(UI_FEATURE_SCHEMA_MAP)).toHaveLength(7);
  });

  it("contains all expected schema keys", () => {
    const keys = Object.keys(UI_FEATURE_SCHEMA_MAP);
    expect(keys).toContain("jobListSettings");
    expect(keys).toContain("treeNavigationSettings");
    expect(keys).toContain("selectionModeSettings");
    expect(keys).toContain("viewControlSettings");
    expect(keys).toContain("contextMenuSettings");
    expect(keys).toContain("dragDropSettings");
    expect(keys).toContain("keyboardShortcutSettings");
  });
});

// ============================================================================
// 2. Total Param Count
// ============================================================================

describe("UI_FEATURE_TOTAL_PARAM_COUNT", () => {
  it("is at least 85", () => {
    expect(UI_FEATURE_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(85);
  });

  it("matches sum of individual metadata param counts", () => {
    const sum = Object.values(UI_FEATURE_METADATA).reduce(
      (acc, meta) => acc + meta.paramCount,
      0,
    );
    expect(UI_FEATURE_TOTAL_PARAM_COUNT).toBe(sum);
  });
});

// ============================================================================
// 3. jobListSettingsSchema
// ============================================================================

describe("jobListSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = jobListSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.sort_order).toBe("sequence");
    expect(result.group_by).toBe("none");
    expect(result.filter_type).toBe("all");
    expect(result.display_mode).toBe("compact");
    expect(result.max_visible_operations).toBe(100);
  });

  it("sort_order enum has expected 5 values: sequence/name/tool/type/status", () => {
    const validValues = ["sequence", "name", "tool", "type", "status"] as const;
    for (const val of validValues) {
      expect(() => jobListSettingsSchema.parse({ sort_order: val })).not.toThrow();
    }
    expect(() => jobListSettingsSchema.parse({ sort_order: "invalid" })).toThrow();
  });

  it("max_visible_operations enforces min=10 and max=500", () => {
    expect(() => jobListSettingsSchema.parse({ max_visible_operations: 9 })).toThrow();
    expect(() => jobListSettingsSchema.parse({ max_visible_operations: 501 })).toThrow();
    expect(jobListSettingsSchema.parse({ max_visible_operations: 10 }).max_visible_operations).toBe(10);
    expect(jobListSettingsSchema.parse({ max_visible_operations: 500 }).max_visible_operations).toBe(500);
  });

  it("paste_mode enum accepts append and insert", () => {
    expect(jobListSettingsSchema.parse({ paste_mode: "append" }).paste_mode).toBe("append");
    expect(jobListSettingsSchema.parse({ paste_mode: "insert" }).paste_mode).toBe("insert");
  });
});

// ============================================================================
// 4. treeNavigationSettingsSchema
// ============================================================================

describe("treeNavigationSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = treeNavigationSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.auto_expand_level).toBe(2);
    expect(result.tree_font_size).toBe(10);
    expect(result.tree_indent_px).toBe(20);
    expect(result.double_click_action).toBe("edit");
  });

  it("default_tree_view enum has exactly 4 values", () => {
    const validValues = ["component", "feature", "operation", "tool"] as const;
    for (const val of validValues) {
      expect(() => treeNavigationSettingsSchema.parse({ default_tree_view: val })).not.toThrow();
    }
    expect(() => treeNavigationSettingsSchema.parse({ default_tree_view: "assembly" })).toThrow();
  });

  it("auto_expand_level enforces min=0 and max=5", () => {
    expect(() => treeNavigationSettingsSchema.parse({ auto_expand_level: -1 })).toThrow();
    expect(() => treeNavigationSettingsSchema.parse({ auto_expand_level: 6 })).toThrow();
    expect(treeNavigationSettingsSchema.parse({ auto_expand_level: 0 }).auto_expand_level).toBe(0);
    expect(treeNavigationSettingsSchema.parse({ auto_expand_level: 5 }).auto_expand_level).toBe(5);
  });

  it("tree_indent_px enforces min=10 and max=40", () => {
    expect(() => treeNavigationSettingsSchema.parse({ tree_indent_px: 9 })).toThrow();
    expect(() => treeNavigationSettingsSchema.parse({ tree_indent_px: 41 })).toThrow();
  });
});

// ============================================================================
// 5. selectionModeSettingsSchema
// ============================================================================

describe("selectionModeSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = selectionModeSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.selection_highlight_color).toBe("#FF8000");
    expect(result.selection_opacity).toBe(0.5);
    expect(result.grid_spacing_mm).toBe(1.0);
  });

  it("selection_highlight_color default is #FF8000", () => {
    const result = selectionModeSettingsSchema.parse({});
    expect(result.selection_highlight_color).toBe("#FF8000");
  });

  it("selection_opacity enforces min=0.1 and max=1.0", () => {
    expect(() => selectionModeSettingsSchema.parse({ selection_opacity: 0.05 })).toThrow();
    expect(() => selectionModeSettingsSchema.parse({ selection_opacity: 1.1 })).toThrow();
    expect(selectionModeSettingsSchema.parse({ selection_opacity: 0.1 }).selection_opacity).toBe(0.1);
    expect(selectionModeSettingsSchema.parse({ selection_opacity: 1.0 }).selection_opacity).toBe(1.0);
  });

  it("default_selection_mode enum includes face/edge/vertex/body/sketch_element", () => {
    const validValues = ["face", "edge", "vertex", "body", "sketch_element"] as const;
    for (const val of validValues) {
      expect(() => selectionModeSettingsSchema.parse({ default_selection_mode: val })).not.toThrow();
    }
  });
});

// ============================================================================
// 6. viewControlSettingsSchema
// ============================================================================

describe("viewControlSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = viewControlSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.default_view_orientation).toBe("iso");
    expect(result.rotation_sensitivity).toBe(1.0);
    expect(result.zoom_sensitivity).toBe(1.0);
    expect(result.pan_button).toBe("middle");
  });

  it("section_plane_mode enum accepts none/single/double/box", () => {
    const validValues = ["none", "single", "double", "box"] as const;
    for (const val of validValues) {
      expect(() => viewControlSettingsSchema.parse({ section_plane_mode: val })).not.toThrow();
    }
    expect(() => viewControlSettingsSchema.parse({ section_plane_mode: "triple" })).toThrow();
  });

  it("rotation_sensitivity enforces min=0.1 and max=5.0", () => {
    expect(() => viewControlSettingsSchema.parse({ rotation_sensitivity: 0.05 })).toThrow();
    expect(() => viewControlSettingsSchema.parse({ rotation_sensitivity: 5.5 })).toThrow();
  });
});

// ============================================================================
// 7. contextMenuSettingsSchema
// ============================================================================

describe("contextMenuSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = contextMenuSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.max_recent_actions).toBe(5);
    expect(result.menu_delay_ms).toBe(200);
    expect(result.submenu_delay_ms).toBe(300);
    expect(result.show_quick_edit).toBe(true);
  });

  it("max_recent_actions enforces min=3 and max=15", () => {
    expect(() => contextMenuSettingsSchema.parse({ max_recent_actions: 2 })).toThrow();
    expect(() => contextMenuSettingsSchema.parse({ max_recent_actions: 16 })).toThrow();
    expect(contextMenuSettingsSchema.parse({ max_recent_actions: 3 }).max_recent_actions).toBe(3);
    expect(contextMenuSettingsSchema.parse({ max_recent_actions: 15 }).max_recent_actions).toBe(15);
  });

  it("menu_delay_ms enforces min=0 and max=500", () => {
    expect(() => contextMenuSettingsSchema.parse({ menu_delay_ms: -1 })).toThrow();
    expect(() => contextMenuSettingsSchema.parse({ menu_delay_ms: 501 })).toThrow();
    expect(contextMenuSettingsSchema.parse({ menu_delay_ms: 0 }).menu_delay_ms).toBe(0);
  });
});

// ============================================================================
// 8. dragDropSettingsSchema
// ============================================================================

describe("dragDropSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = dragDropSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.drag_sensitivity_px).toBe(5);
    expect(result.drop_target_highlight_color).toBe("#00FF00");
    expect(result.drag_feedback_mode).toBe("ghost");
  });

  it("drag_sensitivity_px enforces min=2 and max=20", () => {
    expect(() => dragDropSettingsSchema.parse({ drag_sensitivity_px: 1 })).toThrow();
    expect(() => dragDropSettingsSchema.parse({ drag_sensitivity_px: 21 })).toThrow();
    expect(dragDropSettingsSchema.parse({ drag_sensitivity_px: 2 }).drag_sensitivity_px).toBe(2);
    expect(dragDropSettingsSchema.parse({ drag_sensitivity_px: 20 }).drag_sensitivity_px).toBe(20);
  });

  it("drag_feedback_mode enum accepts ghost/outline/highlight", () => {
    const validValues = ["ghost", "outline", "highlight"] as const;
    for (const val of validValues) {
      expect(() => dragDropSettingsSchema.parse({ drag_feedback_mode: val })).not.toThrow();
    }
    expect(() => dragDropSettingsSchema.parse({ drag_feedback_mode: "fade" })).toThrow();
  });
});

// ============================================================================
// 9. keyboardShortcutSettingsSchema
// ============================================================================

describe("keyboardShortcutSettingsSchema", () => {
  it("parses with all defaults applied", () => {
    const result = keyboardShortcutSettingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.shortcut_calculate).toBe("F5");
    expect(result.shortcut_simulate).toBe("F6");
    expect(result.shortcut_post).toBe("F7");
    expect(result.shortcut_undo).toBe("Ctrl+Z");
    expect(result.shortcut_redo).toBe("Ctrl+Y");
  });

  it("shortcut_calculate default is F5", () => {
    const result = keyboardShortcutSettingsSchema.parse({});
    expect(result.shortcut_calculate).toBe("F5");
  });

  it("all shortcut fields accept custom string values", () => {
    const custom = {
      shortcut_calculate: "Ctrl+F5",
      shortcut_simulate: "Ctrl+F6",
      shortcut_fit_view: "Numpad5",
      shortcut_toggle_toolpath: "Alt+T",
    };
    const result = keyboardShortcutSettingsSchema.parse(custom);
    expect(result.shortcut_calculate).toBe("Ctrl+F5");
    expect(result.shortcut_simulate).toBe("Ctrl+F6");
    expect(result.shortcut_fit_view).toBe("Numpad5");
    expect(result.shortcut_toggle_toolpath).toBe("Alt+T");
  });

  it("shortcut_delete default is Delete", () => {
    expect(keyboardShortcutSettingsSchema.parse({}).shortcut_delete).toBe("Delete");
  });

  it("shortcut_toggle_stock default is K and shortcut_toggle_fixture default is X", () => {
    const result = keyboardShortcutSettingsSchema.parse({});
    expect(result.shortcut_toggle_stock).toBe("K");
    expect(result.shortcut_toggle_fixture).toBe("X");
  });
});

// ============================================================================
// 10. UI_FEATURE_METADATA
// ============================================================================

describe("UI_FEATURE_METADATA", () => {
  it("has exactly 7 entries", () => {
    expect(Object.keys(UI_FEATURE_METADATA)).toHaveLength(7);
  });

  it("all entries have acPythonSetter using hm.ui.* namespace", () => {
    for (const [, meta] of Object.entries(UI_FEATURE_METADATA)) {
      expect(meta.acPythonSetter).toMatch(/^hm\.ui\./);
    }
  });

  it("all entries have non-empty description", () => {
    for (const [, meta] of Object.entries(UI_FEATURE_METADATA)) {
      expect(meta.description.length).toBeGreaterThan(10);
    }
  });

  it("jobListSettings has paramCount of 15", () => {
    expect(UI_FEATURE_METADATA.jobListSettings.paramCount).toBe(15);
  });

  it("contextMenuSettings has paramCount of 20", () => {
    expect(UI_FEATURE_METADATA.contextMenuSettings.paramCount).toBe(20);
  });

  it("keyboardShortcutSettings has paramCount of 15", () => {
    expect(UI_FEATURE_METADATA.keyboardShortcutSettings.paramCount).toBe(15);
  });
});
