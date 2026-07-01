# Okuma Macro — Parametric CNC Program Generator

Generate Okuma OSP parametric macro programs for turning operations. Based on real production macros with V-variable parametric programming, auto-calculation chains, and Okuma-specific G-code patterns.

## Args: $ARGUMENTS
- `casing [params]`: Generate a casing turning program (face/OD/ID/drill/cutoff)
- `cbore [params]`: Generate a counter-bore turning program
- `validate [file]`: Validate an existing Okuma macro program
- `parse [file]`: Reverse-parse a macro into configuration
- `defaults [material]`: Show smart defaults for a material (e.g., 4140, 316SS, 6061)
- `rpm [sfm] [diameter]`: Quick RPM calculation
- Empty: Show usage and capabilities

## Key Parameters for Program Generation
- Stock diameter, Finish OD, Finish ID, Part length
- Drill diameter(s), Point angles
- SFM values for OD rough/finish, ID, cutoff
- Feed rates (IPR) for each operation
- Chamfer/radius features (OD, ID, cutoff)
- Depth of cut, stock allowances
- Max RPM limits

## Engines Used
**OkumaParametricProgramEngine** — Generates real Okuma OSP-P G-code with:
- V-variable parametric system (V1-V199)
- Auto-calculation chains (RPM from SFM, drill depths, chamfer angles)
- Cutter compensation (G41/G42)
- Okuma cycles: G85 (profile rough), G86 (profile finish), G74 (peck drill)
- CSS mode (G96/G97), max RPM limits (G50)
- Conditional logic (IF/GOTO)

## Workflow
1. Parse args for operation type and parameters
2. Call `prism_cam.okuma_defaults` for material-based smart defaults
3. Merge user params over defaults
4. Call `prism_cam.okuma_generate_casing` or `okuma_generate_cbore`
5. Display generated G-code with variable table and operation list
