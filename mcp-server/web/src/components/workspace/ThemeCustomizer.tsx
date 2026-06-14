/**
 * ThemeCustomizer -- the consumer that wires useThemeTokens + useHaptics
 * (FLEET-IOS-REDESIGN U3b, slot:hotel).
 *
 * U3 shipped the useThemeTokens / useHaptics hooks with NO consumer (an R15
 * orphan gap). This panel closes it: it is the user-facing "Appearance" control
 * that drives the per-device theme overrides the iOS redesign exposes.
 *
 * It exposes exactly TWO dials -- accent color and corner radius -- and
 * deliberately does NOT expose a density control: --density has zero
 * `var(--density)` consumers in any primitive today, so a density slider would
 * be a dead dial that mutates a CSS variable nothing reads (scrutiny arm-C P2,
 * U3). When the primitives start sizing off --density, add the control here.
 *
 * Wires BOTH hook surfaces it consumes:
 *   - useThemeTokens -> setAccent / setRadius / reset (writes to document.body)
 *   - useHaptics     -> selection() on each pick; ActionButton (Reset) fires its
 *                       own impact('light') from U3b.
 *
 * Dogfoods the iOS primitives (PanelCard / ActionButton / TabButton) so the
 * customizer itself looks like the system it customizes.
 */
import { ACCENT_PRESETS, useThemeTokens, type ThemeRadius } from '../../hooks/useThemeTokens';
import { useHaptics } from '../../hooks/useHaptics';
import { PanelCard, ActionButton, TabButton } from './WorkspacePrimitives';

const RADIUS_OPTIONS: ReadonlyArray<{ value: ThemeRadius; label: string }> = [
  { value: 'sharp', label: 'Sharp' },
  { value: 'default', label: 'Default' },
  { value: 'round', label: 'Round' },
];

export function ThemeCustomizer({ className }: { className?: string }) {
  const { tokens, setAccent, setRadius, reset } = useThemeTokens();
  const { selection } = useHaptics();

  return (
    <div className={className}>
      <PanelCard
        title="Appearance"
        subtitle="Personalize the accent color and corner style. Saved to this device."
      >
        <div className="space-y-6">
          {/* Accent color -- a mutually-exclusive choice => radiogroup / radio / aria-checked. */}
          <div>
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Accent
            </div>
            <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2.5">
              {ACCENT_PRESETS.map((preset) => {
                const selected = tokens.accentRgb === preset.rgb;
                return (
                  <button
                    key={preset.rgb}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={preset.name}
                    title={preset.name}
                    onClick={() => {
                      setAccent(preset.rgb);
                      selection();
                    }}
                    className={`flex h-11 w-11 items-center justify-center rounded-ios-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                      selected ? 'border-white shadow-ios-1' : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ backgroundColor: `rgb(${preset.rgb})` }}
                  >
                    {selected ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 text-white drop-shadow"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Corner radius -- a segmented toggle group (role=group of aria-pressed TabButtons). */}
          <div>
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Corners
            </div>
            <div role="group" aria-label="Corner radius" className="flex gap-2">
              {RADIUS_OPTIONS.map((opt) => (
                <TabButton
                  key={opt.value}
                  active={tokens.radius === opt.value}
                  onClick={() => {
                    setRadius(opt.value);
                    selection();
                  }}
                >
                  {opt.label}
                </TabButton>
              ))}
            </div>
          </div>

          {/* Reset -- clears every body override + localStorage. ActionButton fires its own impact('light'). */}
          <div className="border-t border-white/8 pt-4">
            <ActionButton tone="ghost" onClick={reset}>
              Reset to defaults
            </ActionButton>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
