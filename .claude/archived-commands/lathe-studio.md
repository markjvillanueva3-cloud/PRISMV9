# Lathe Studio — Open Web Interface for Lathe Programming

Launch the PRISM Lathe Studio — a zero-experience web interface where anyone can generate a CNC lathe program from a photo, 3D model, or PDF drawing. No machining knowledge required.

## Args: $ARGUMENTS
- Empty: open the lathe studio at http://localhost:3000/lathe
- `status`: show current lathe pipeline status (engines loaded, routes active)
- `demo`: run a demo workflow with a sample shaft part

## Execution

1. **Check Server** — Verify the MCP server is running:
   - Run: `curl -s http://localhost:3000/health`
   - If not running: `cd H:/prism/mcp-server && npm start`

2. **Open Lathe Studio** — Direct user to the web interface:
   - Upload page: http://localhost:3000/lathe (drag & drop photo/STEP/PDF)
   - Results page: http://localhost:3000/lathe/results (after pipeline runs)
   
   Tell the user: "Open http://localhost:3000/lathe in your browser. Drop a photo of your drawing, a STEP file, or a PDF — the system handles the rest."

3. **Pipeline Overview** — The lathe pipeline runs these stages:
   ```
   File Upload → Feature Extraction → Material Identification
   → Machine Selection → Tool Selection → Physics Calculations
   → Speed/Feed Optimization → G-Code Generation → Safety Checks
   → Setup Sheet → Backplot Visualization → Download Package
   ```

4. **Available API Endpoints** (for advanced users):
   ```
   POST /api/v1/lathe/upload           — Upload file (photo/STEP/PDF)
   POST /api/v1/lathe/wizard-submit    — Submit wizard answers, start pipeline
   GET  /api/v1/lathe/progress/:jobId  — SSE stream for pipeline progress
   GET  /api/v1/lathe/result/:jobId    — Fetch completed result
   GET  /api/v1/lathe/download/:id/gcode  — Download .nc file
   GET  /api/v1/lathe/download/:id/setup  — Download setup sheet
   GET  /api/v1/lathe/download/:id/report — Download physics report
   ```

5. **Dispatcher Actions**:
   ```
   prism_turning_program:lathe_ui_submit — Full pipeline from UI wizard
   prism_turning_program:turning_blueprint_intake — OCR photo/PDF intake
   prism_turning_program:turning_cad_import — 3D CAD file import
   ```

## Safety
The ui-safety-certificate hook (LATHE-UI-SAFETY-001) runs before every G-code download. It validates:
- All safety checks pass (collision, clamping, swing)
- Prove-out mode is enabled for first-run programs
- No critical warnings in the physics report

If any safety check fails, the download is blocked and the user sees a clear explanation of what needs to be fixed.
