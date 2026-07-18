export const meta = {
  name: 'wire-gated-error-403',
  description: 'Wire reactive GatedError 403->UpgradePrompt into 11 gated frontend pages --force-fanout (ultracode opt-in; sonnet arms)',
  phases: [
    { title: 'Wire', detail: 'one sonnet builder per page applies the GatedError wrap' },
    { title: 'Verify', detail: 'one sonnet reviewer per page confirms correctness + behavior preservation' },
  ],
}

const PAGES = [
  { file: 'mcp-server/web/src/pages/LatheWizardPage.tsx', feature: 'wizard.lathe' },
  { file: 'mcp-server/web/src/pages/MillingWizardPage.tsx', feature: 'wizard.mill' },
  { file: 'mcp-server/web/src/pages/WireEdmWizardPage.tsx', feature: 'wizard.wedm' },
  { file: 'mcp-server/web/src/pages/LathePrintToProgramPage.tsx', feature: 'print_to_cnc' },
  { file: 'mcp-server/web/src/pages/PostProcessorGeneratorPage.tsx', feature: 'post.generate' },
  { file: 'mcp-server/web/src/pages/AdditiveQuotePage.tsx', feature: 'quoting' },
  { file: 'mcp-server/web/src/pages/BlueprintQuotePage.tsx', feature: 'quoting' },
  { file: 'mcp-server/web/src/pages/InjectionMoldPage.tsx', feature: 'quoting' },
  { file: 'mcp-server/web/src/pages/SheetMetalQuotePage.tsx', feature: 'quoting' },
  { file: 'mcp-server/web/src/pages/CADAIStatePage.tsx', feature: 'cadcam' },
  { file: 'mcp-server/web/src/pages/CADRegressionDashboardPage.tsx', feature: 'cadcam' },
]

const WIRE_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    feature: { type: 'string' },
    edited: { type: 'boolean' },
    importAdded: { type: 'boolean' },
    gateStateAdded: { type: 'boolean' },
    catchSitesUpdated: { type: 'number' },
    renderSiteWrapped: { type: 'boolean' },
    fallbackPreserved: { type: 'boolean' },
    notes: { type: 'string' },
  },
  required: ['file', 'feature', 'edited', 'renderSiteWrapped', 'fallbackPreserved', 'notes'],
  additionalProperties: false,
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    importOk: { type: 'boolean' },
    gateErrorCaptured: { type: 'boolean' },
    fallbackPreservesOriginal: { type: 'boolean' },
    behaviorUnchangedWhenNot403: { type: 'boolean' },
    tscRisk: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'verdict', 'behaviorUnchangedWhenNot403', 'issues'],
  additionalProperties: false,
}

const recipe = (file, feature) => `You are wiring the REACTIVE 403->UpgradePrompt entitlement gate into a PRISM frontend page. Be surgical (R8): preserve ALL existing behavior; the page must still compile (tsc) and behave identically whenever the error is NOT a 403.

TARGET FILE: H:/prism/${file}
FEATURE KEY (exact literal): '${feature}'

The foundation already exists: H:/prism/mcp-server/web/src/components/entitlement/GatedError.tsx exports
  <GatedError error={unknown} feature={FeatureKey} fallback={ReactNode} /> -- when the error is a 403 ApiError it renders an UpgradePrompt for the feature; for ANY other error (or null) it renders the fallback. It is dormant-safe (no behavior change until a real 403 arrives).

STEPS (read the WHOLE file first):
1. Find the gated dispatcher call(s): the try/catch (or .catch) that sets a user-facing error STRING (e.g. setError(issue.message)). Note the error-state variable name and EVERY catch site.
2. Add a sibling state to RETAIN the caught error OBJECT (not just its message):
   const [gateError, setGateError] = useState<unknown>(null);
   Place it immediately next to the existing error-string state. (If the file already has such a state, reuse it.)
3. In EVERY catch block that sets the error string, also call setGateError(<the caught error variable>). Wherever the error string is CLEARED/RESET (new submit, success, retry), also setGateError(null) so a stale gate never lingers.
4. Add the import (exact path from web/src/pages/ is '../components/entitlement'):
   import { GatedError } from '../components/entitlement';
   (Merge into an existing entitlement import if one exists.)
5. At the JSX site where the error string is shown to the user, WRAP the existing error UI as the fallback -- do NOT delete or alter it:
   from:   {error && <SomeErrorUI .../>}
   to:     {error && <GatedError error={gateError} feature='${feature}' fallback={<SomeErrorUI .../>} />}
   Keep the original error UI EXACTLY as the fallback content.
6. If there are MULTIPLE distinct error render sites, wire each. If the page renders no user-facing error at all, do the minimal safe wiring at the most likely error surface and say so in notes.

CONSTRAINTS: ASCII-only. No new deps. Do not change the dispatcher calls, the success path, or any unrelated code. Match the file's existing conventions (quote style, indentation). If anything is ambiguous, make the SAFEST choice that preserves current behavior and explain in notes.

Apply the edits with the Edit tool, then return the structured result.`

const reviewPrompt = (file, feature, wire) => `Independently review a just-applied wiring edit on H:/prism/${file}. Read the file as it is NOW.

The intended change: a reactive 403 gate. The page should now (1) import GatedError from '../components/entitlement'; (2) retain the caught error OBJECT in a state (e.g. gateError); (3) set it in every catch + clear it on reset/success; (4) wrap its error render site as <GatedError error={gateError} feature='${feature}' fallback={<original error UI>} />.

Builder self-report: ${JSON.stringify(wire)}

Grade PASS/FAIL. Verify RIGOROUSLY:
- The feature literal is exactly '${feature}' (a valid FeatureKey).
- The original error UI is preserved BYTE-FOR-BYTE as the fallback (no lost styling/props) -> behavior is identical when the error is not a 403 (the dormant-safe contract).
- The caught error OBJECT (not just .message) is what flows into GatedError.error, so isEntitlementError can see the ApiError.status.
- No stale-gate bug: gateError is cleared on a fresh submit/success so a prior 403 does not persist.
- The import path is correct and the edit will compile (no type error: feature is a literal, GatedError props match).
- No unrelated behavior changed.
List concrete issues (file:line). If FAIL, say exactly what to fix.`

phase('Wire')
const results = await pipeline(
  PAGES,
  (p) => agent(recipe(p.file, p.feature), {
    label: `wire:${p.file.split('/').pop()}`,
    phase: 'Wire',
    model: 'sonnet',
    schema: WIRE_SCHEMA,
  }),
  (wire, p) => agent(reviewPrompt(p.file, p.feature, wire), {
    label: `verify:${p.file.split('/').pop()}`,
    phase: 'Verify',
    model: 'sonnet',
    schema: VERIFY_SCHEMA,
  }).then((v) => ({ wire, verify: v, file: p.file, feature: p.feature })),
)

const clean = results.filter(Boolean)
const passed = clean.filter((r) => r.verify?.verdict === 'PASS')
const failed = clean.filter((r) => r.verify?.verdict !== 'PASS')
log(`wired+verified ${clean.length}/${PAGES.length} pages; PASS=${passed.length} FAIL=${failed.length}`)

return {
  total: PAGES.length,
  completed: clean.length,
  passed: passed.map((r) => ({ file: r.file, feature: r.feature })),
  failed: failed.map((r) => ({ file: r.file, feature: r.feature, issues: r.verify?.issues ?? ['no verdict returned'], wire: r.wire })),
}
