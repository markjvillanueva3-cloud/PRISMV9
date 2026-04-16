# HANDOFF: Codex Home PC Portable Resume
Updated: 2026-04-10T20:36:30-05:00
Family: Codex | Machine: portable | Session: home-pc-resume

## STATE
Portable resume handoff prepared

## RESUME
true

## CONTEXT
- Canonical workspace: `H:\PRISM`
- Active queue truth: `FMERGE-MS1-U04` remains the active Codex pickup
- APPW chain remains the downstream execution path, with explicit sinker EDM gap-fill unit `APPW-MS8-U41B`
- Literal chat history may not follow to the home PC, so use this file plus `H:\PRISM\state\CURRENT_POSITION.md` as the recovery anchor

## MOST RECENT PRODUCT WORK
- Added a sinker EDM electrode lane to the calculator page `Print / CAD to Program` workspace
- The sinker lane now supports parseable DXF/IGES/text intake plus reference-print uploads
- Added System 3R ER-32 electrode package defaults and System 3R reference pallet defaults
- Added a generic backend bridge route for electrode draft-NC handoff through `/api/v1/cam/auto-print-to-program`
- The sinker payload now carries:
  - `process_variant: sinker_edm_electrode`
  - holder package
  - fixture system
  - electrode material
  - spark gap
  - wear allowance
  - finish pass count
  - legacy macro path
  - legacy reference path

## VERIFIED PATHS
- Trilobe macro file exists at:
  - `H:\Automated Program_Corrected 5-25.xlsm`
- Canonical Roku-Roku legacy archive path is now:
  - `H:\PRISM\JM DIE\ROKU-ROKU`
- A deeper duplicate also exists, but is not the canonical default:
  - `H:\PRISM\JM DIE\JM DIE COMPANY\JM\ROKU-ROKU`

## VERIFIED CODE SURFACES
- Calculator EDM workbench:
  - `H:\PRISM\mcp-server\web\src\components\calculator\CalculatorProgramWorkbench.tsx`
- Calculator page mount/defaults:
  - `H:\PRISM\mcp-server\web\src\pages\CalculatorPage.tsx`
- Electrode holder defaults:
  - `H:\PRISM\mcp-server\web\src\data\calculatorHolderLibrary.ts`
- Electrode workholding defaults:
  - `H:\PRISM\mcp-server\web\src\data\calculatorWorkholding.ts`
  - `H:\PRISM\mcp-server\src\data\calculatorWorkholdingCatalog.ts`
- Backend bridge route:
  - `H:\PRISM\mcp-server\src\routes\cam.ts`
- UI verification:
  - `H:\PRISM\mcp-server\web\src\__tests__\CalculatorPage.autoProgramming.test.tsx`

## VERIFIED COMMANDS
- `npx vitest run src/__tests__/CalculatorPage.autoProgramming.test.tsx --config vitest.config.ts` in `H:\PRISM\mcp-server\web`
  - PASS for lathe, wire EDM, and sinker EDM electrode workflow
- `npm run build` in `H:\PRISM\mcp-server\web`
  - PASS
- `npm run build:tsc` in `H:\PRISM\mcp-server`
  - PASS after updating the script to use a larger Node heap

## ROADMAP / TASK TRUTH
- Updated milestone:
  - `H:\PRISM\mcp-server\data\milestones\APPW-MS8.json`
- Updated queue:
  - `H:\PRISM\state\shared\TASK_QUEUE.json`
  - `H:\PRISM\state\shared\TASK_QUEUE.md`
- Updated current position:
  - `H:\PRISM\state\CURRENT_POSITION.md`
- New explicit gap-fill unit:
  - `APPW-MS8-U41B`
  - "sinker EDM electrode macro/reference bridge and legacy archive activation"

## WHAT IS STILL NOT DONE
- The JM Die Roku-Roku archive exists, but legacy mining/indexing is not yet wired through the dedicated bridge
- The trilobe macro path is carried as typed release metadata, but live Excel-macro execution is not yet bridged
- `APPW-MS8-U41B` is the roadmap unit that should make those two things real
- There is still a non-blocking warning in the calculator test run:
  - multiple instances of Three.js being imported
- The calculator bundle is still large in Vite build output

## NEXT RECOMMENDED MOVE
1. On the home PC, open:
   - `H:\PRISM\state\CURRENT_POSITION.md`
   - `H:\PRISM\state\shared\TASK_QUEUE.md`
   - this file
2. Resume under:
   - `FMERGE-MS1-U04` for active Codex lane awareness
   - then target `APPW-MS8-U41B` for the sinker EDM macro/reference bridge
3. Build the real bridge for:
   - `H:\Automated Program_Corrected 5-25.xlsm`
   - `H:\PRISM\JM DIE\ROKU-ROKU`
4. Keep the sinker EDM UI honest until index/bridge proof is live

## IMPORTANT PORTABILITY NOTE
- If the drive letter changes on the home PC and is no longer `H:`, update these first:
  - `H:\PRISM\mcp-server\web\src\components\calculator\CalculatorProgramWorkbench.tsx`
  - `H:\PRISM\state\CURRENT_POSITION.md`
  - `H:\PRISM\mcp-server\data\milestones\APPW-MS8.json`
  - `H:\PRISM\state\shared\TASK_QUEUE.json`
