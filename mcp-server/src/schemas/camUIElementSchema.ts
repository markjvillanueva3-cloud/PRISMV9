/**
 * CAM UI Element Schema
 * ======================
 * Comprehensive schema for mapping EVERY UI element in CAM software.
 * Covers: menus, toolbars, ribbons, panels, dialogs, settings, context menus.
 *
 * Used by CAM-EXHAUST-MS0 for complete UI coverage.
 * Target: 4 CAM systems, 4000+ UI elements total.
 *
 * @module schemas/camUIElementSchema
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// UI ELEMENT TYPES
// ============================================================================

/** Type of UI element */
export const UIElementTypeEnum = z.enum([
  // Menu items
  "menu_bar",              // Top-level menu bar (File, Edit, View, etc.)
  "menu_item",             // Individual menu item
  "menu_separator",        // Separator line in menu
  "submenu",               // Submenu container

  // Toolbar/Ribbon
  "toolbar",               // Floating or docked toolbar
  "toolbar_button",        // Button on toolbar
  "toolbar_dropdown",      // Dropdown on toolbar
  "toolbar_separator",     // Separator on toolbar
  "ribbon_tab",            // Ribbon tab (Inventor/Fusion style)
  "ribbon_group",          // Group within ribbon tab
  "ribbon_button",         // Button in ribbon group
  "ribbon_split_button",   // Split button with dropdown
  "ribbon_gallery",        // Gallery control

  // Panels/Trees
  "panel",                 // Docked panel (browser, properties, etc.)
  "tree_view",             // Tree control (job list, feature tree)
  "tree_node",             // Node in tree
  "property_grid",         // Property inspector grid
  "property_row",          // Row in property grid

  // Dialogs
  "dialog",                // Modal or modeless dialog
  "dialog_tab",            // Tab within dialog
  "dialog_group",          // Group box within dialog
  "dialog_button",         // Button in dialog (OK, Cancel, Apply)

  // Input controls
  "text_input",            // Text entry field
  "numeric_input",         // Numeric spinner
  "dropdown",              // Dropdown/combo box
  "checkbox",              // Checkbox
  "radio_button",          // Radio button
  "radio_group",           // Group of radio buttons
  "slider",                // Slider control
  "color_picker",          // Color selection
  "file_picker",           // File browser button

  // Display/View
  "viewport",              // 3D graphics viewport
  "viewcube",              // ViewCube navigation
  "view_toolbar",          // View controls toolbar
  "status_bar",            // Bottom status bar
  "status_field",          // Field in status bar

  // Context
  "context_menu",          // Right-click menu
  "tooltip",               // Tooltip popup
  "quickinfo",             // Quick info panel
]).describe("Type of UI element");

/** UI location/region */
export const UIRegionEnum = z.enum([
  "menu_bar",
  "ribbon",
  "toolbar_top",
  "toolbar_left",
  "toolbar_right",
  "toolbar_bottom",
  "toolbar_floating",
  "panel_left",
  "panel_right",
  "panel_bottom",
  "panel_floating",
  "viewport",
  "status_bar",
  "title_bar",
  "context",
  "dialog_modal",
  "dialog_modeless",
]).describe("Region where element is located");

// ============================================================================
// ACTION SCHEMA — What happens when element is activated
// ============================================================================

export const UIActionSchema = z.object({
  action_type: z.enum([
    "command",           // Executes a command
    "toggle",            // Toggles a state
    "open_dialog",       // Opens a dialog
    "open_panel",        // Opens/shows a panel
    "open_submenu",      // Expands submenu
    "navigate",          // Navigates to location
    "set_value",         // Sets a value
    "execute_macro",     // Runs a macro/script
    "invoke_api",        // Calls API method
    "external_link",     // Opens external URL
  ]).describe("Type of action when activated"),

  command_id: z.string().optional().describe("Internal command ID if applicable"),
  api_method: z.string().optional().describe("API method to call"),
  dialog_id: z.string().optional().describe("Dialog to open"),
  panel_id: z.string().optional().describe("Panel to open/toggle"),

  // PRISM integration
  prism_action: z.object({
    dispatcher: z.string().optional(),
    action: z.string().optional(),
    auto_invoke: z.boolean().default(false).describe("Can PRISM invoke this automatically"),
  }).optional().describe("Mapped PRISM action"),
}).describe("Action performed by UI element");

// ============================================================================
// KEYBOARD/SHORTCUT SCHEMA
// ============================================================================

export const ShortcutSchema = z.object({
  key: z.string().describe("Main key (e.g., 'S', 'F5', 'Delete')"),
  modifiers: z.array(z.enum(["ctrl", "alt", "shift", "meta"])).default([]),
  display: z.string().optional().describe("Display string (e.g., 'Ctrl+S')"),
  customizable: z.boolean().default(true).describe("Can user reassign this shortcut"),
}).describe("Keyboard shortcut definition");

// ============================================================================
// UI ELEMENT SCHEMA — Individual element
// ============================================================================

export const UIElementSchema = z.object({
  id: z.string().describe("Unique element identifier"),
  name: z.string().describe("Display name/label"),
  type: UIElementTypeEnum,
  region: UIRegionEnum.optional(),

  // Hierarchy
  parent_id: z.string().optional().describe("Parent element ID"),
  children: z.array(z.string()).optional().describe("Child element IDs"),
  order: z.number().optional().describe("Display order among siblings"),

  // State
  visible: z.boolean().default(true),
  enabled: z.boolean().default(true),
  checked: z.boolean().optional().describe("For toggle elements"),
  default_value: z.union([z.string(), z.number(), z.boolean()]).optional(),

  // Access
  shortcut: ShortcutSchema.optional(),
  access_path: z.string().optional().describe("Menu path (e.g., 'File > Save As')"),
  ribbon_path: z.string().optional().describe("Ribbon path (e.g., 'Manufacture > Milling > 2D')"),

  // Action
  action: UIActionSchema.optional(),

  // Icon
  icon: z.object({
    name: z.string().optional(),
    path: z.string().optional(),
    size: z.enum(["16", "24", "32", "48"]).optional(),
  }).optional(),

  // Input parameters (for input controls)
  input_config: z.object({
    data_type: z.enum(["string", "number", "boolean", "enum", "path", "color"]).optional(),
    unit: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    precision: z.number().optional(),
    enum_values: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    validation: z.string().optional().describe("Validation regex or rule"),
  }).optional(),

  // Documentation
  description: z.string().optional(),
  tooltip: z.string().optional(),
  help_topic: z.string().optional(),

  // Conditions
  visible_when: z.string().optional().describe("Condition for visibility"),
  enabled_when: z.string().optional().describe("Condition for enabled state"),

  // PRISM metadata
  prism_importance: z.enum(["critical", "high", "medium", "low", "cosmetic"]).optional()
    .describe("Importance for PRISM CAM automation"),
  prism_category: z.string().optional().describe("PRISM feature category"),
}).describe("Individual UI element definition");

// ============================================================================
// SETTINGS CATEGORY — Application preferences
// ============================================================================

export const SettingsCategorySchema = z.object({
  id: z.string().describe("Category identifier"),
  name: z.string().describe("Category display name"),
  icon: z.string().optional(),
  parent_id: z.string().optional().describe("Parent category for nesting"),

  settings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["boolean", "number", "string", "enum", "path", "color", "font", "shortcut"]),
    default_value: z.union([z.string(), z.number(), z.boolean()]).optional(),
    current_value: z.union([z.string(), z.number(), z.boolean()]).optional(),
    description: z.string().optional(),

    // For numeric
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.string().optional(),

    // For enum
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
    })).optional(),

    // Importance
    prism_relevant: z.boolean().default(false).describe("Affects CAM operation"),
  })).describe("Settings in this category"),
}).describe("Settings category with all options");

// ============================================================================
// CONTEXT MENU SCHEMA
// ============================================================================

export const ContextMenuSchema = z.object({
  id: z.string(),
  name: z.string().describe("Descriptive name (e.g., 'Operation Context Menu')"),
  trigger_context: z.string().describe("What triggers this menu (e.g., 'tree_node_operation')"),

  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().optional(),
    shortcut: ShortcutSchema.optional(),
    action: UIActionSchema.optional(),
    separator_after: z.boolean().optional(),
    submenu_items: z.array(z.string()).optional().describe("IDs of submenu items"),
    visible_when: z.string().optional(),
    enabled_when: z.string().optional(),
  })).describe("Context menu items"),
}).describe("Right-click context menu definition");

// ============================================================================
// COMPLETE UI MAP — All elements for one CAM system
// ============================================================================

export const CAMUIMapSchema = z.object({
  schema_version: z.literal("1.0.0"),
  system_id: z.string().describe("CAM system ID (hypermill, fusion360, etc.)"),
  system_name: z.string().describe("Display name"),
  software_version: z.string().optional(),
  indexed_at: z.string().describe("ISO timestamp"),

  // Main menu bar
  menu_bar: z.object({
    menus: z.array(z.object({
      id: z.string(),
      name: z.string().describe("Menu name (File, Edit, View, etc.)"),
      items: z.array(z.string()).describe("UIElement IDs"),
    })),
  }),

  // Toolbars (traditional)
  toolbars: z.array(z.object({
    id: z.string(),
    name: z.string(),
    region: UIRegionEnum,
    visible_default: z.boolean().default(true),
    items: z.array(z.string()).describe("UIElement IDs"),
  })).optional(),

  // Ribbon (modern)
  ribbon: z.object({
    tabs: z.array(z.object({
      id: z.string(),
      name: z.string(),
      groups: z.array(z.object({
        id: z.string(),
        name: z.string(),
        items: z.array(z.string()).describe("UIElement IDs"),
      })),
    })),
  }).optional(),

  // Panels
  panels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    region: UIRegionEnum,
    visible_default: z.boolean().default(true),
    items: z.array(z.string()).describe("UIElement IDs"),
  })),

  // All UI elements (flat list for lookup)
  elements: z.array(UIElementSchema),

  // Settings/Preferences
  settings_categories: z.array(SettingsCategorySchema),

  // Context menus
  context_menus: z.array(ContextMenuSchema),

  // Statistics
  statistics: z.object({
    total_elements: z.number(),
    total_menus: z.number(),
    total_toolbar_buttons: z.number(),
    total_ribbon_buttons: z.number().optional(),
    total_panels: z.number(),
    total_dialogs: z.number(),
    total_settings: z.number(),
    total_shortcuts: z.number(),
    prism_mapped_count: z.number().describe("Elements with PRISM action mapping"),
  }),
}).describe("Complete UI map for a CAM system");

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UIElementType = z.infer<typeof UIElementTypeEnum>;
export type UIRegion = z.infer<typeof UIRegionEnum>;
export type UIAction = z.infer<typeof UIActionSchema>;
export type Shortcut = z.infer<typeof ShortcutSchema>;
export type UIElement = z.infer<typeof UIElementSchema>;
export type SettingsCategory = z.infer<typeof SettingsCategorySchema>;
export type ContextMenu = z.infer<typeof ContextMenuSchema>;
export type CAMUIMap = z.infer<typeof CAMUIMapSchema>;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/** Create empty CAM UI map */
export function createEmptyCAMUIMap(systemId: string, systemName: string): CAMUIMap {
  return {
    schema_version: "1.0.0",
    system_id: systemId,
    system_name: systemName,
    indexed_at: new Date().toISOString(),
    menu_bar: { menus: [] },
    toolbars: [],
    panels: [],
    elements: [],
    settings_categories: [],
    context_menus: [],
    statistics: {
      total_elements: 0,
      total_menus: 0,
      total_toolbar_buttons: 0,
      total_panels: 0,
      total_dialogs: 0,
      total_settings: 0,
      total_shortcuts: 0,
      prism_mapped_count: 0,
    },
  };
}

/** Create a menu item element */
export function createMenuItem(
  id: string,
  name: string,
  options?: {
    shortcut?: Shortcut;
    action?: UIAction;
    parent_id?: string;
  }
): UIElement {
  return {
    id,
    name,
    type: "menu_item",
    region: "menu_bar",
    visible: true,
    enabled: true,
    ...options,
  };
}

/** Create a toolbar button element */
export function createToolbarButton(
  id: string,
  name: string,
  options?: {
    icon?: { name: string };
    shortcut?: Shortcut;
    action?: UIAction;
    tooltip?: string;
  }
): UIElement {
  return {
    id,
    name,
    type: "toolbar_button",
    visible: true,
    enabled: true,
    ...options,
  };
}

/** Create a ribbon button element */
export function createRibbonButton(
  id: string,
  name: string,
  ribbonPath: string,
  options?: {
    icon?: { name: string };
    action?: UIAction;
  }
): UIElement {
  return {
    id,
    name,
    type: "ribbon_button",
    ribbon_path: ribbonPath,
    visible: true,
    enabled: true,
    ...options,
  };
}

/** Create a settings entry */
export function createSetting(
  id: string,
  name: string,
  type: "boolean" | "number" | "string" | "enum" | "path" | "color" | "font" | "shortcut",
  defaultValue: string | number | boolean,
  options?: {
    description?: string;
    min?: number;
    max?: number;
    unit?: string;
    prism_relevant?: boolean;
  }
): SettingsCategory["settings"][0] {
  return {
    id,
    name,
    type,
    default_value: defaultValue,
    prism_relevant: false,
    ...options,
  };
}
