/**
 * UI Feature Parameter Schemas — hyperMILL UI Feature Mappings
 *
 * U-HKC38: Zod schemas for 7 UI feature categories covering job list management,
 * tree navigation, selection modes, view controls, context menus,
 * drag and drop, and keyboard shortcuts (~90 params total).
 *
 * Maps non-parameter UI interactions to configurable parameter equivalents.
 *
 * AC Python call pattern:
 *   hm.ui.job_list(sort_order="sequence", group_by="tool", ...)
 *
 * @domain Settings / UI Features
 * @milestone HM-KC-MS7/U-HKC38
 */

import { z } from "zod";

// ============================================================================
// 1. JOB LIST MANAGEMENT (15 params)
// ============================================================================

export const jobListSettingsSchema = z.object({
  sort_order: z
    .enum(["sequence", "name", "tool", "type", "status"])
    .default("sequence")
    .describe("Primary sort order for operations in the job list"),
  group_by: z
    .enum(["none", "tool", "type", "setup"])
    .default("none")
    .describe("Grouping criterion for job list operations"),
  filter_type: z
    .enum(["all", "calculated", "uncalculated", "errors"])
    .default("all")
    .describe("Filter which operations are shown in the job list"),
  display_mode: z
    .enum(["compact", "detailed", "tree"])
    .default("compact")
    .describe("Visual density and layout mode for the job list"),
  show_cycle_time: z
    .boolean()
    .default(true)
    .describe("Show estimated cycle time for each operation in the job list"),
  show_tool_info: z
    .boolean()
    .default(true)
    .describe("Show tool identifier and description alongside each operation"),
  auto_scroll_to_active: z
    .boolean()
    .default(true)
    .describe("Automatically scroll the job list to the currently active operation"),
  multi_select_enabled: z
    .boolean()
    .default(true)
    .describe("Allow selecting multiple operations simultaneously in the job list"),
  drag_reorder_enabled: z
    .boolean()
    .default(true)
    .describe("Allow reordering operations by dragging within the job list"),
  copy_with_params: z
    .boolean()
    .default(true)
    .describe("Include all parameters when copying an operation"),
  paste_mode: z
    .enum(["append", "insert"])
    .default("append")
    .describe("Where pasted operations are placed relative to the current selection"),
  expand_groups_by_default: z
    .boolean()
    .default(true)
    .describe("Expand grouped operations automatically when loading the job"),
  highlight_modified: z
    .boolean()
    .default(true)
    .describe("Visually highlight operations that have unsaved parameter changes"),
  show_operation_icons: z
    .boolean()
    .default(true)
    .describe("Show operation-type icons in the job list for quick identification"),
  max_visible_operations: z
    .number()
    .int()
    .min(10)
    .max(500)
    .default(100)
    .describe("Maximum number of operations displayed in the job list before virtualization"),
});

export type JobListSettings = z.infer<typeof jobListSettingsSchema>;

// ============================================================================
// 2. TREE NAVIGATION (12 params)
// ============================================================================

export const treeNavigationSettingsSchema = z.object({
  default_tree_view: z
    .enum(["component", "feature", "operation", "tool"])
    .default("operation")
    .describe("Default hierarchy mode for the model/feature tree"),
  auto_expand_level: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(2)
    .describe("Number of tree levels to auto-expand on load (0 = collapsed)"),
  show_tree_icons: z
    .boolean()
    .default(true)
    .describe("Show type icons next to nodes in the feature tree"),
  tree_font_size: z
    .number()
    .int()
    .min(8)
    .max(16)
    .default(10)
    .describe("Font size in points for tree node labels"),
  sync_tree_with_3d: z
    .boolean()
    .default(true)
    .describe("Synchronize tree selection with highlighted geometry in the 3D view"),
  highlight_in_3d_on_select: z
    .boolean()
    .default(true)
    .describe("Highlight corresponding 3D geometry when a tree node is selected"),
  show_empty_nodes: z
    .boolean()
    .default(false)
    .describe("Show tree nodes that contain no child items"),
  filter_tree_text: z
    .string()
    .default("")
    .describe("Text filter applied to tree node labels (empty = show all)"),
  show_node_count: z
    .boolean()
    .default(false)
    .describe("Show child item count badge next to each tree node"),
  sort_tree_nodes: z
    .boolean()
    .default(false)
    .describe("Sort tree nodes alphabetically within each level"),
  tree_indent_px: z
    .number()
    .int()
    .min(10)
    .max(40)
    .default(20)
    .describe("Horizontal indentation in pixels per tree hierarchy level"),
  double_click_action: z
    .enum(["edit", "expand", "select_geometry"])
    .default("edit")
    .describe("Action triggered by double-clicking a tree node"),
});

export type TreeNavigationSettings = z.infer<typeof treeNavigationSettingsSchema>;

// ============================================================================
// 3. SELECTION MODES (10 params)
// ============================================================================

export const selectionModeSettingsSchema = z.object({
  default_selection_mode: z
    .enum(["face", "edge", "vertex", "body", "sketch_element"])
    .default("face")
    .describe("Default geometry selection filter mode"),
  selection_highlight_color: z
    .string()
    .default("#FF8000")
    .describe("Color used to highlight selected geometry, hex string"),
  selection_opacity: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.5)
    .describe("Opacity of the selection highlight overlay (0.1 = nearly transparent, 1.0 = opaque)"),
  multi_select_modifier: z
    .enum(["ctrl", "shift"])
    .default("ctrl")
    .describe("Keyboard modifier key required for adding items to a multi-selection"),
  box_select_mode: z
    .enum(["window", "crossing"])
    .default("window")
    .describe("Box selection behavior: window requires full containment, crossing includes any intersection"),
  selection_filter_active: z
    .boolean()
    .default(false)
    .describe("Enable the active selection filter (restricts selectable entity types)"),
  snap_to_grid: z
    .boolean()
    .default(false)
    .describe("Snap pick points and sketched geometry to the active grid"),
  grid_spacing_mm: z
    .number()
    .min(0.1)
    .max(100)
    .default(1.0)
    .describe("Grid spacing for snap operations, mm"),
  show_selection_count: z
    .boolean()
    .default(true)
    .describe("Display the number of currently selected items in the status bar"),
  auto_deselect_on_tool_change: z
    .boolean()
    .default(true)
    .describe("Clear the current selection automatically when changing the active tool"),
});

export type SelectionModeSettings = z.infer<typeof selectionModeSettingsSchema>;

// ============================================================================
// 4. VIEW CONTROLS (10 params)
// ============================================================================

export const viewControlSettingsSchema = z.object({
  default_view_orientation: z
    .enum(["iso", "front", "back", "top", "bottom", "left", "right"])
    .default("iso")
    .describe("Default camera orientation applied when a new document is opened"),
  auto_fit_on_open: z
    .boolean()
    .default(true)
    .describe("Automatically fit all geometry into the viewport when opening a document"),
  section_plane_mode: z
    .enum(["none", "single", "double", "box"])
    .default("none")
    .describe("Section clipping plane configuration for the 3D view"),
  projection_type: z
    .enum(["perspective", "orthographic"])
    .default("perspective")
    .describe("Camera projection type for the 3D viewport"),
  rotation_sensitivity: z
    .number()
    .min(0.1)
    .max(5.0)
    .default(1.0)
    .describe("Mouse rotation speed multiplier for 3D orbit navigation"),
  zoom_sensitivity: z
    .number()
    .min(0.1)
    .max(5.0)
    .default(1.0)
    .describe("Mouse wheel zoom speed multiplier for 3D navigation"),
  pan_button: z
    .enum(["middle", "right"])
    .default("middle")
    .describe("Mouse button used for panning the 3D view"),
  show_origin: z
    .boolean()
    .default(true)
    .describe("Display the world origin marker in the 3D viewport"),
  show_coordinate_axes: z
    .boolean()
    .default(true)
    .describe("Display the coordinate axis triad in the corner of the 3D viewport"),
  dynamic_clipping: z
    .boolean()
    .default(false)
    .describe("Adjust near/far clipping planes dynamically based on scene extents"),
});

export type ViewControlSettings = z.infer<typeof viewControlSettingsSchema>;

// ============================================================================
// 5. CONTEXT MENUS (20 params)
// ============================================================================

export const contextMenuSettingsSchema = z.object({
  show_physics_info: z
    .boolean()
    .default(true)
    .describe("Include physics/cutting data summary in the right-click context menu"),
  show_tool_info_in_menu: z
    .boolean()
    .default(true)
    .describe("Show tool identifier and description in the context menu header"),
  show_material_info: z
    .boolean()
    .default(true)
    .describe("Show workpiece material details in the context menu"),
  show_quick_edit: z
    .boolean()
    .default(true)
    .describe("Include quick-edit shortcut for common operation parameters in the context menu"),
  show_duplicate: z
    .boolean()
    .default(true)
    .describe("Show duplicate operation action in the context menu"),
  show_delete_confirm: z
    .boolean()
    .default(true)
    .describe("Show a confirmation prompt before deleting via the context menu"),
  show_move_to_group: z
    .boolean()
    .default(true)
    .describe("Show move-to-group submenu in the context menu"),
  show_recalculate: z
    .boolean()
    .default(true)
    .describe("Show recalculate toolpath action in the context menu"),
  show_simulate: z
    .boolean()
    .default(true)
    .describe("Show simulate action in the context menu"),
  show_post_process: z
    .boolean()
    .default(false)
    .describe("Show post-process action in the context menu"),
  custom_menu_enabled: z
    .boolean()
    .default(false)
    .describe("Enable custom user-defined context menu entries"),
  max_recent_actions: z
    .number()
    .int()
    .min(3)
    .max(15)
    .default(5)
    .describe("Number of recently used actions shown at the top of the context menu"),
  show_keyboard_hints: z
    .boolean()
    .default(true)
    .describe("Show keyboard shortcut hints next to context menu items"),
  menu_animation: z
    .boolean()
    .default(true)
    .describe("Enable fade/slide animation when opening context menus"),
  menu_delay_ms: z
    .number()
    .int()
    .min(0)
    .max(500)
    .default(200)
    .describe("Delay in milliseconds before the context menu appears after right-click"),
  submenu_delay_ms: z
    .number()
    .int()
    .min(0)
    .max(500)
    .default(300)
    .describe("Delay in milliseconds before a submenu opens on hover"),
  show_operation_status_icon: z
    .boolean()
    .default(true)
    .describe("Show calculated/uncalculated/error status icon in the context menu header"),
  show_tool_life_warning: z
    .boolean()
    .default(true)
    .describe("Show tool life warning indicator in the context menu when tool life is low"),
  show_collision_warning: z
    .boolean()
    .default(true)
    .describe("Show collision warning indicator in the context menu when collisions are detected"),
  show_cycle_time_estimate: z
    .boolean()
    .default(true)
    .describe("Show estimated cycle time for the selected operation in the context menu"),
});

export type ContextMenuSettings = z.infer<typeof contextMenuSettingsSchema>;

// ============================================================================
// 6. DRAG AND DROP (8 params)
// ============================================================================

export const dragDropSettingsSchema = z.object({
  drag_sensitivity_px: z
    .number()
    .int()
    .min(2)
    .max(20)
    .default(5)
    .describe("Minimum mouse displacement in pixels required to initiate a drag operation"),
  drop_target_highlight_color: z
    .string()
    .default("#00FF00")
    .describe("Color used to highlight valid drop targets during a drag operation, hex string"),
  show_drag_preview: z
    .boolean()
    .default(true)
    .describe("Show a ghost preview of the dragged item following the cursor"),
  allow_cross_setup_drag: z
    .boolean()
    .default(false)
    .describe("Allow dragging operations between different machine setups"),
  snap_to_sequence: z
    .boolean()
    .default(true)
    .describe("Snap drag-reorder position to valid sequence slots"),
  drag_feedback_mode: z
    .enum(["ghost", "outline", "highlight"])
    .default("ghost")
    .describe("Visual feedback style for the item being dragged"),
  auto_recalculate_after_reorder: z
    .boolean()
    .default(false)
    .describe("Automatically recalculate affected operations after a drag-reorder"),
  confirm_drag_to_different_group: z
    .boolean()
    .default(true)
    .describe("Show confirmation dialog when dragging an operation to a different group"),
});

export type DragDropSettings = z.infer<typeof dragDropSettingsSchema>;

// ============================================================================
// 7. KEYBOARD SHORTCUTS (15 params)
// ============================================================================

export const keyboardShortcutSettingsSchema = z.object({
  shortcut_calculate: z
    .string()
    .default("F5")
    .describe("Keyboard shortcut to calculate/recalculate the selected operations"),
  shortcut_simulate: z
    .string()
    .default("F6")
    .describe("Keyboard shortcut to open the simulation dialog"),
  shortcut_post: z
    .string()
    .default("F7")
    .describe("Keyboard shortcut to trigger NC post-processing"),
  shortcut_undo: z
    .string()
    .default("Ctrl+Z")
    .describe("Keyboard shortcut for undo last action"),
  shortcut_redo: z
    .string()
    .default("Ctrl+Y")
    .describe("Keyboard shortcut for redo last undone action"),
  shortcut_copy: z
    .string()
    .default("Ctrl+C")
    .describe("Keyboard shortcut to copy selected operations"),
  shortcut_paste: z
    .string()
    .default("Ctrl+V")
    .describe("Keyboard shortcut to paste operations"),
  shortcut_delete: z
    .string()
    .default("Delete")
    .describe("Keyboard shortcut to delete selected operations"),
  shortcut_group: z
    .string()
    .default("Ctrl+G")
    .describe("Keyboard shortcut to group selected operations"),
  shortcut_select_all: z
    .string()
    .default("Ctrl+A")
    .describe("Keyboard shortcut to select all operations in the job list"),
  shortcut_fit_view: z
    .string()
    .default("F")
    .describe("Keyboard shortcut to fit all geometry into the viewport"),
  shortcut_section_view: z
    .string()
    .default("S")
    .describe("Keyboard shortcut to toggle section view"),
  shortcut_toggle_toolpath: z
    .string()
    .default("T")
    .describe("Keyboard shortcut to toggle toolpath visibility in the 3D view"),
  shortcut_toggle_stock: z
    .string()
    .default("K")
    .describe("Keyboard shortcut to toggle stock model visibility"),
  shortcut_toggle_fixture: z
    .string()
    .default("X")
    .describe("Keyboard shortcut to toggle fixture/workholding visibility"),
});

export type KeyboardShortcutSettings = z.infer<typeof keyboardShortcutSettingsSchema>;

// ============================================================================
// Schema Map (7 types)
// ============================================================================

/** All 7 UI feature schemas keyed by type */
export const UI_FEATURE_SCHEMA_MAP = {
  jobListSettings: jobListSettingsSchema,
  treeNavigationSettings: treeNavigationSettingsSchema,
  selectionModeSettings: selectionModeSettingsSchema,
  viewControlSettings: viewControlSettingsSchema,
  contextMenuSettings: contextMenuSettingsSchema,
  dragDropSettings: dragDropSettingsSchema,
  keyboardShortcutSettings: keyboardShortcutSettingsSchema,
} as const;

export type UIFeatureType = keyof typeof UI_FEATURE_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

/** Metadata record for every UI feature type */
export interface UIFeatureMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

/** Metadata for each UI feature type with AC Python setter references */
export const UI_FEATURE_METADATA: Record<UIFeatureType, UIFeatureMeta> = {
  jobListSettings: {
    paramCount: 15,
    acPythonSetter: "hm.ui.job_list",
    description: "Job list display, sorting, grouping, filtering, and interaction settings",
  },
  treeNavigationSettings: {
    paramCount: 12,
    acPythonSetter: "hm.ui.tree_navigation",
    description: "Feature tree hierarchy, expansion, font, synchronization, and node filtering settings",
  },
  selectionModeSettings: {
    paramCount: 10,
    acPythonSetter: "hm.ui.selection_mode",
    description: "Geometry selection mode, highlight color, opacity, snap grid, and filter settings",
  },
  viewControlSettings: {
    paramCount: 10,
    acPythonSetter: "hm.ui.view_controls",
    description: "3D viewport orientation, projection, section planes, sensitivity, and display settings",
  },
  contextMenuSettings: {
    paramCount: 20,
    acPythonSetter: "hm.ui.context_menu",
    description: "Right-click context menu entries, delays, animations, and status indicator settings",
  },
  dragDropSettings: {
    paramCount: 8,
    acPythonSetter: "hm.ui.drag_drop",
    description: "Drag-and-drop sensitivity, visual feedback, cross-setup rules, and reorder settings",
  },
  keyboardShortcutSettings: {
    paramCount: 15,
    acPythonSetter: "hm.ui.keyboard_shortcuts",
    description: "Configurable keyboard shortcuts for calculate, simulate, post, edit, and view operations",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all 7 UI feature schemas */
export const UI_FEATURE_TOTAL_PARAM_COUNT = Object.values(UI_FEATURE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
