# PRISM Fusion 360 Add-In — Design Spec

## Overview
A Fusion 360 panel add-in that connects to PRISM's MCP server to auto-fill all CAM fields with physics-backed recommendations. Single adaptive mode: auto-fills everything, everything editable. Novices accept defaults; experts override what they want.

## User Flow

### Step 1: Install & Connect
- User installs add-in from `scripts/fusion360-prism-addin/`
- Add-in registers a panel in Fusion's CAM workspace
- Connects to PRISM MCP server at `localhost:18361`
- Shows connection status (green/red indicator)

### Step 2: Material Selection
- Dropdown with common materials (auto-grouped by ISO: P/M/K/N/S/H)
- User selects material (e.g., "6061-T6 Aluminum")
- PRISM resolves: ISO group, Kienzle kc1.1/mc, material-specific limits
- Panel updates with material badge and recommendations

### Step 3: PRISM Optimize (one button)
- Reads Fusion's current CAM setup: features, stock, machine
- Sends to PRISM `cam_unified_generate` with `production_mode: true`
- PRISM returns: tool recommendations, S/F, DOC, step-over, strategy
- Auto-fills Fusion's tool library, operation parameters, post-processor

### Step 4: Review & Adjust
- Panel shows recommended tools with physics scores (0-100)
- Each parameter editable — expert can override
- Physics dashboard updates in real-time on parameter changes
- Warnings shown for: deflection, chatter risk, power overload

### Step 5: Generate Program
- Clicks "Generate" → PRISM runs full pipeline
- Verified G-code output with setup sheet
- Tribal knowledge tips shown for material/operation combo
- Cost-per-feature breakdown

## Technical Architecture

### Fusion Side (Python)
- `prism_addin.py` — Main add-in entry point
- `prism_panel.py` — UI panel with controls
- `prism_api_client.py` — HTTP client for PRISM MCP server
- `tool_library_sync.py` — Sync PRISM tools to Fusion tool library

### PRISM Side (TypeScript via MCP)
- Uses existing `cam_unified_generate` action
- Uses existing `cam_smart_tool` action
- Uses existing `cam_verify` action
- New: `fusion_tool_export` action — exports tools in Fusion JSON format

### Tool Library Export Format
Fusion 360 tool libraries use JSON format:
```json
{
  "version": 2,
  "tools": [{
    "BMC": "carbide",
    "HAND": "R",
    "type": "flat end mill",
    "unit": "millimeters",
    "geometry": {
      "DC": 10.0,        // cutting diameter
      "SFDM": 10.0,      // shank diameter
      "LCF": 30.0,       // flute length
      "OAL": 60.0,       // overall length
      "NOF": 3,           // number of flutes
      "RE": 0.0           // corner radius
    },
    "start-values": {
      "presets": [{
        "f_n": 0.1,       // feed per tooth
        "n": 5000,         // spindle speed
        "n_ramp": 3000,    // ramp spindle speed
        "f_ramp": 800,     // ramp feed
        "stepdown": 5.0,   // axial DOC
        "stepover": 3.0    // radial DOC
      }]
    },
    "description": "PRISM: OSG AE-VMS Ø10 3FL TiAlN",
    "vendor": "OSG",
    "product-id": "osg-ae-vms-10"
  }]
}
```

### Machine Selection
- Reads machine from Fusion's CAM setup
- Matches against PRISM's 910-machine catalog
- Auto-selects post-processor from PRISM's 11 controllers
- Falls back to generic Fanuc if no match

### Auto Speed/Feed
- Material + tool → PRISM `cam_smart_tool` with physics scoring
- Returns: Vc, fz, DOC, WOC based on Kienzle/Taylor
- Chip thinning compensation auto-applied
- Power/torque limited to machine spindle curve

## API Endpoints Used

| Action | Purpose | When Called |
|--------|---------|-------------|
| `cam_smart_tool` | Physics-scored tool selection | On "Optimize" click |
| `cam_unified_generate` | Full G-code generation | On "Generate" click |
| `cam_verify` | Safety/physics check | After parameter change |
| `cam_chatter_rpm` | Chatter-safe RPM | After tool/DOC change |
| `cam_cost_feature` | Cost breakdown | After generation |

## Files to Create

1. `scripts/fusion360-prism-addin/prism_addin.py` — Add-in entry
2. `scripts/fusion360-prism-addin/prism_panel.py` — UI panel
3. `scripts/fusion360-prism-addin/prism_api_client.py` — HTTP client
4. `scripts/fusion360-prism-addin/tool_library_sync.py` — Tool sync
5. `src/engines/FusionToolExportEngine.ts` — Tool library export
