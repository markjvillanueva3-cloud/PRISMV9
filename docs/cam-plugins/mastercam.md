# Mastercam Plugin

PRISM's Mastercam plugin is a **C-Hook** (compiled C-extension) that
loads on Mastercam startup. It speaks Mastercam's native pipe-delimited
text format because every existing Mastercam post and report tool
already understands that wire format — PRISM payloads slot in without
modifying any existing macro.

## Supported versions

| Mastercam release | Status         |
|-------------------|----------------|
| 2025+             | Fully supported |
| 2024 (Update 1+)  | Supported (C-Hook ABI matches) |
| 2023 and older    | Not supported — C-Hook ABI changed |

## Installation

1. Close Mastercam.
2. Run `prism-cli plugin install mastercam` — copies `PRISM.dll`
   into `<Mastercam install>\chooks\` (auto-detected via registry).
3. Start Mastercam → **Settings → Customize → C-Hooks** → verify
   PRISM is checked.
4. Open the new **PRISM** dropdown in the menu bar → **Settings** →
   set MCP URL → **Test**.
5. Auto-registers with the PRISM Plugin Registry (U-CAM98).

## Payload format

Pipe-delimited rows with a leading type marker, matching Mastercam's
existing `INFO|`, `MSG|`, `ERROR|` conventions:

```
PREDICT|job-7821|3
0|tool_overload|critical|0.920|Cutting force 1843 N vs limit 800 N (230%)
1|deflection|high|0.780|Tool tip deflection 22.4 µm (budget 25 µm)
2|chatter|medium|0.450|Chatter margin: engagement 0.85 vs budget 0.50
```

```
OPTIMIZE|job-7821|tool_life|2
tool_life|rpm|0.100|Reduce spindle speed 8000→7200 rpm
tool_life|fz_mm|0.200|Reduce chip load 0.100→0.080 mm
```

```
TIPS|op-finish-1|3
tip-3142|Climb mill thin walls|0.870|Climb reduces deflection and chatter
tip-2801|Use TSC for deep pockets|0.820|Through-spindle coolant clears chips and cools
tip-1944|Reduce engagement with peel|0.800|Peel milling lowers radial engagement
```

The plugin replaces any embedded `|` in titles and messages with `/`,
and any `\n` with a space, so existing Mastercam parsers never see a
spurious row break.

## Feature walkthrough

### PRISM menu

PRISM appears as a top-level menu with five entries:
**Scan**, **Optimize**, **Tooltips**, **Speed/Feed**, **Settings**.

### Scan

Posts every operation in the active part to `cam_predict_scan`. The
result is dropped into Mastercam's **Result Pane** so it shows up next
to native warnings — operators don't need to learn a new UI surface.

### Optimize

Identical flow to the other hosts: pick a goal, see ranked suggestions,
**Apply** rewrites the operation parameters via Mastercam's parameter
API. Every patch verified against the U-CAM102 predictor stack
(no safety trade-offs).

### Speed/Feed

For any tool selection, **Speed/Feed** runs `cam_speedfeed_compute` and
writes the result into the operation's **Spindle Speed** and **Feed
Rate** fields. SFM↔m/min conversion is automatic — Mastercam
operators can type SFM and the plugin converts to PRISM's m/min
contract on the wire.

### Tooltips

Tooltips dock to the bottom of the Toolpath Manager and refresh as you
click through operations.

## Troubleshooting

| Symptom                                | Most likely cause                                   | Fix                                                    |
|----------------------------------------|-----------------------------------------------------|--------------------------------------------------------|
| C-Hook fails to load on startup        | Mastercam version older than 2024 Update 1         | Upgrade Mastercam or pin plugin to legacy ABI: `prism-cli plugin install mastercam --abi=2023` (limited features) |
| Pipe-delimited rows show garbled in Result Pane | Locale-specific Mastercam separator       | **Settings → Locale** in PRISM menu — match Mastercam |
| **Apply** disabled                     | Operation is locked by a tooling group              | Unlock the group or use **Apply (force)**             |
| Speed/Feed writes back zero            | Tool's material assignment is empty                 | See [troubleshooting.md](troubleshooting.md#missing-material) |

## Uninstall

```powershell
prism-cli plugin uninstall mastercam
```

Removes the C-Hook DLL from `chooks\` and clears the plugin registry
record. Mastercam itself is untouched.
