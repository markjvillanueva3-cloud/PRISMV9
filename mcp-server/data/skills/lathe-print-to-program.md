# /lathe-print-to-program

Print-to-Program pipeline skill for PRISM lathe AGI. Transforms blueprints into machine-ready G-code.

## Usage
```
/lathe-print-to-program <command> [options]
```

## Commands

### full
Complete pipeline: blueprint → G-code + setup sheet.
```
/lathe-print-to-program full --blueprint <path> --program 1001 --name "PART NAME" [--controller okuma_osp|fanuc|generic_iso]
```

### ingest
Ingest blueprint and extract dimensions/GDT.
```
/lathe-print-to-program ingest --source pdf|image|hybrid --path <file>
```

### recognize
Recognize turning features from blueprint.
```
/lathe-print-to-program recognize --blueprint <path>
```

### plan
Plan toolpaths from recognized features.
```
/lathe-print-to-program plan --blueprint <path> [--depth-of-cut 3.0] [--finishing-allowance 0.2]
```

### generate
Generate G-code program from toolpath plan.
```
/lathe-print-to-program generate --blueprint <path> --program 1001 --name "PART" [--controller okuma_osp]
```

### verify
Verify G-code program for safety and correctness.
```
/lathe-print-to-program verify --gcode <file> [--x-max 300] [--z-max 500] [--spindle-max 5000]
```

### setup
Generate setup sheet for program.
```
/lathe-print-to-program setup --blueprint <path> --program 1001 --name "PART" [--operator "John Smith"] [--html]
```

## Pipeline Stages

1. **Ingest** (LathePrintIngestPipelineEngine): OCR + dimension extraction + GDT parsing
2. **Recognize** (LatheFeatureRecognitionEngine): Extract machinable features (OD, ID, face, thread, groove, chamfer)
3. **Plan** (LatheToolpathPlannerEngine): Tool selection, sequence optimization, cycle assignment
4. **Generate** (LatheProgramGeneratorEngine): Controller-specific G-code with canned cycles
5. **Verify** (LatheProgramVerificationEngine): Syntax validation, limit checks, simulation
6. **Setup** (LatheSetupSheetGeneratorEngine): Operator documentation

## Integration

Uses these engines:
- LathePrintIngestPipelineEngine (U-LTH33)
- LatheFeatureRecognitionEngine (U-LTH34)
- LatheToolpathPlannerEngine (U-LTH35)
- LatheProgramGeneratorEngine (U-LTH36)
- LathePrintToProgramOrchestratorEngine (U-LTH37)
- LatheProgramVerificationEngine (U-LTH38)
- LatheSetupSheetGeneratorEngine (U-LTH39)

Dispatcher: lathePrintToProgramDispatcher (U-LTH40)

## Supported Controllers

- **okuma_osp**: Okuma OSP-P300 series (G71/G72 canned cycles)
- **fanuc**: Fanuc 0i/16i/18i/21i (G70/G71/G72 cycles)
- **generic_iso**: ISO 6983 standard G-code

## Supported Features

- External diameter (OD turning)
- Internal diameter (boring)
- Facing
- Threading (G76 canned cycle)
- Grooving (G75 cycle)
- Chamfers and radii
- Center drilling (G83 peck drill)

## Examples

Full pipeline with Okuma controller:
```
/lathe-print-to-program full --blueprint part.pdf --program 1001 --name "SHAFT" --controller okuma_osp --machine LTH-01
```

Generate and verify:
```
/lathe-print-to-program generate --blueprint part.pdf --program 2001 --name "BUSHING" --controller fanuc
/lathe-print-to-program verify --gcode output.nc --spindle-max 4000
```

Create setup sheet with HTML:
```
/lathe-print-to-program setup --blueprint part.pdf --program 1001 --name "SHAFT" --operator "John Smith" --html
```
