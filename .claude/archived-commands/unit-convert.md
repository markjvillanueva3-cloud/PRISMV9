# Unit Convert — Metric ↔ Imperial Machining Unit Conversion

Seamless unit system toggle for all speed, feed, and machining parameters. US shops work in SFM/IPM/IPR; international shops use m/min, mm/min, mm/rev.

## Args
- Empty: interactive — ask what to convert
- `[value] [conversion]`: quick convert (e.g., `400 mpm_sfm`, `25.4 mm_inch`)
- `toggle [system]`: convert a full machining param set (metric→imperial or vice versa)
- `rpm [speed] [diameter] [system]`: RPM calculator from cutting speed + tool diameter
- `list`: show all available conversion pairs

## Workflow

1. **Single convert**: call `prism_calc` → `unit_convert` with value, conversion key, direction
2. **Batch convert**: call `unit_convert_batch` with array of conversions
3. **System toggle**: call `unit_system_toggle` with full machining params + from_system
4. **RPM calc**: call `unit_rpm_calc` with cutting_speed, diameter, system
5. **List**: call `unit_list_conversions` for all conversion pairs

## Key Conversions
| Key | Metric | Imperial | Description |
|-----|--------|----------|-------------|
| mpm_sfm | m/min | SFM | Cutting speed |
| mmmin_ipm | mm/min | IPM | Feed rate |
| mmrev_ipr | mm/rev | IPR | Feed per rev |
| mm_inch | mm | in | Length |
| kw_hp | kW | HP | Power |
| nm_ftlb | N·m | ft·lb | Torque |
| c_f | °C | °F | Temperature |
| um_uin | µm | µin | Surface finish |

## Output Format
```
UNIT CONVERSION
═══════════════
[from_value] [from_unit] → [to_value] [to_unit]
Conversion: [description]
Direction: [to_metric | to_imperial]
```
