# PRISM Onboarding & First-Run Experience Review

## Code Review Summary

---

## CRITICAL: The Complete Absence of Onboarding

PRISM is a complex B2B manufacturing intelligence platform with 50+ pages across 11 navigation groups (Core, Shop, Quoting, Finance, HR & Payroll, ERP, Analysis, Viewer, Data & Quality, Billing, Admin). There is **zero onboarding infrastructure** in the entire codebase. No setup wizard. No guided tour. No contextual help. No experience-level adaptation. No "first-run" detection.

The time-to-value for a new user is effectively **infinite** because they will not understand what to do, in what order, or how the features connect to each other.

---

## Finding 1: Post-Login Hard Drop Into Complex UI

**SEVERITY: CRITICAL**

**Current behavior:** After registration or login (`LoginPage.tsx` line 49, 59), the user is unconditionally navigated to `/sfc` -- the Speed & Feed Calculator. The catch-all route (`App.tsx` line 234) also redirects to `/sfc`. There is no check for whether this is a first-time user, whether they have configured their shop, or what their role is.

**What the user sees:** They land on `SfcCalculatorPage.tsx` -- a 3-column layout with 15+ selectors (machine mode tabs, sub-operation pills, material selector, stock dimensions, CAM software, cutting priority, toolpath strategy, parameter panel, preset manager, tool holder, insert config, fixture, machine selector, etc.). The only guidance is a small line: "Select a material and operation to enable calculation." There is no explanation of what any panel does, why it exists, or what the expected workflow is.

**The problem:** This is like dropping a new employee into a cockpit on day one with no training. A machinist might recognize some terms but not the workflow. A shop owner looking for quoting or ERP has no idea these features exist -- they are buried 4 groups deep in a sidebar they have not been taught to navigate.

**Recommendation:**
- After registration, route to `/onboarding` (a new multi-step setup wizard), not `/sfc`
- Store an `onboardingComplete` flag in user profile or localStorage
- The onboarding flow should ask: (1) What is your role? (2) What machines does your shop have? (3) What materials do you commonly cut? (4) What is your primary goal today?
- After onboarding, route to a role-appropriate landing: machinist -> SFC Calculator, shop owner -> Shop Dashboard, programmer -> Post Processor

---

## Finding 2: No Shop Setup Wizard

**SEVERITY: CRITICAL**

**Current behavior:** Settings page (`SettingsPage.tsx`) has only 3 tabs -- General (units/theme/decimals), Defaults (material/controller text inputs), and Advanced (API endpoint). There is no way to:
- Register your machines (brand, model, spindle specs, axes)
- Define your tool crib (what tools you actually own)
- Set up your material inventory
- Configure your controllers and post processors
- Define your shop rates, overhead, or labor costs

The SFC Calculator (`SfcCalculatorPage.tsx`) has `SmartMachineSelector` and `SmartToolSelector` components that pull from a 910-machine and 94,000-tool catalog. But these are the *full catalog* -- not the user's shop. There is no "My Machines" or "My Tools" concept.

**Recommendation:**
- Create a "Shop Setup" wizard (accessible from onboarding and from Settings)
- Steps: (1) Add your machines, (2) Add your tools/tool crib, (3) Set default materials, (4) Configure controllers, (5) Set shop rates
- In the SFC Calculator, add a "My Shop" filter toggle so users see their machines/tools first, then the full catalog
- In Settings, add tabs for "Machines", "Tools", "Materials", "Shop Rates"

---

## Finding 3: No Contextual Help or Tooltips on Complex Pages

**SEVERITY: HIGH**

**Current behavior:** The SFC Calculator page has approximately 20 interactive controls across 3 columns. Not a single one has a tooltip, help icon, or explanatory text. Specific examples:

- `CuttingPrioritySelector` -- What does "balanced" vs other priorities mean? No explanation.
- `ToolpathStrategySelector` -- What is a toolpath strategy? How does it affect parameters? No explanation.
- `ToolHolderSelector` -- What is "taper", "overhang"? These are expert terms with no help text.
- `InsertSelector` -- Grade, coating, geometry -- no guidance on what to choose or why.
- `CompatibilityValidator` -- Shows warnings but provides no learning context.
- `MachineConfigPanel` -- Controller, spindle, ATC selection with no guidance.
- `CamSoftwareSelector` -- Why does CAM software matter for speed/feed? No explanation.

Similarly, pages like `MachineWizard.tsx` have labels ("Part Envelope (mm)", "Accuracy Required (mm)") but no help text explaining what values are typical or what the implications of choices are.

**Recommendation:**
- Add an `InfoTooltip` component (small "?" icon next to labels) that shows contextual help on hover/click
- For each SFC panel, add a 1-sentence description: "Cutting Priority: Balance between tool life, surface finish, and metal removal rate."
- Add "Learn more" links that connect to the relevant Learning module
- For numeric inputs, show typical ranges as placeholder text or range indicators

---

## Finding 4: No Guided Tour or Feature Discovery

**SEVERITY: HIGH**

**Current behavior:** The sidebar (`AppShell.tsx`) displays 11 navigation groups with 50+ items. All groups are expanded by default (the `collapsed` state starts empty). A new user sees a massive wall of navigation links with no hierarchy, no visual distinction between "start here" and "advanced" features, and no indication of what they should do first.

There is no:
- Welcome modal on first login
- Interactive guided tour (e.g., "Step 1: Let's calculate your first speed and feed")
- Feature discovery badges ("New!") or suggested next actions
- Breadcrumb trail showing where you are in a workflow
- "Getting Started" checklist in the sidebar or dashboard

**Recommendation:**
- Implement a guided tour library (e.g., react-joyride or shepherd.js) with tours for:
  - First login: "Welcome to PRISM" (3-step overview of SFC, Learning, Settings)
  - SFC Calculator: "Your first calculation" (walk through material -> operation -> tool -> calculate)
  - Shop Dashboard: "Setting up your shop" (machines, tools, rates)
- Add a "Getting Started" checklist widget that persists in the sidebar:
  - [ ] Complete skill assessment
  - [ ] Add your first machine
  - [ ] Run your first calculation
  - [ ] Generate your first program
- Collapse non-essential sidebar groups by default for new users, expanding only "Core" and "Admin"

---

## Finding 5: No Role-Based Quick Start Paths

**SEVERITY: HIGH**

**Current behavior:** Every user, regardless of role, sees the same UI, the same sidebar, and lands on the same page. The landing page (`LandingPage.tsx`) mentions three user types in the pricing section -- "individual machinists and students" (Starter), "professional programmers and job shops" (Pro), "teams and production environments" (Shop) -- but this role distinction vanishes entirely after login.

A machinist cares about: SFC Calculator, Learning, Safety.
A CNC programmer cares about: SFC Calculator, Post Processor, CAM Strategy.
A shop owner cares about: Shop Dashboard, Quoting, ERP, Scheduling, Finance.
An engineer cares about: Data, Quality, 3D Viewer, What-If analysis.

**Recommendation:**
- During onboarding, ask the user to select their primary role
- Create 3-4 "Quick Start" dashboard layouts that show relevant features prominently
- In the sidebar, highlight the user's role-relevant sections and dim/collapse others
- On the Learning Dashboard, tailor recommendations to the user's role (a shop owner does not need "What does G43 do?")

---

## Finding 6: Learning Section is Disconnected from Tools

**SEVERITY: HIGH**

**Current behavior:** The Learning Dashboard (`LearningDashboard.tsx`) shows a radar chart, domain progress bars, achievements, and "Quick Actions" (Assessment, Knowledge, Material Wizard, Digital Twin). The Learning Path (`LearningPath.tsx`) shows a timeline of modules. The Assessment (`Assessment.tsx`) asks knowledge quiz questions.

None of these connect to the actual tools:
- The SFC Calculator has no "Learn about this" links
- The Learning modules have no "Try it now" buttons that pre-load the SFC Calculator with example parameters
- The Material Wizard and Tool Wizard in Learning are completely separate from `SmartMaterialSelector` and `SmartToolSelector` in the SFC Calculator -- they share no state, no UI, and no navigation bridges
- The Machine Wizard in Learning (`MachineWizard.tsx`) recommends machines, but there is no way to then use that machine in a calculation
- After completing an assessment, there is no "Now try a calculation with your new knowledge" call to action

**Recommendation:**
- Add "Try this calculation" buttons in Learning modules that navigate to `/sfc` with pre-filled parameters
- In the SFC Calculator, add "Why this value?" links on results that open the relevant knowledge article
- When a user completes the Material Wizard and selects a material, offer "Use this material in SFC Calculator"
- In the Learning Dashboard, show a "Practice" section with pre-configured calculation scenarios matching completed modules
- Connect the Assessment results to SFC Calculator complexity: beginner gets simplified view, expert gets full view

---

## Finding 7: No Experience Level Adaptation (Beginner/Journeyman/Master)

**SEVERITY: MEDIUM**

**Current behavior:** The type system (`learning.ts` line 23) defines difficulty levels as `"beginner" | "intermediate" | "advanced" | "expert"` for learning modules, and `SkillScore` (line 22) has a `level` field with the same values. The Assessment component evaluates users into these levels. But this information is never used outside the Learning section.

The SFC Calculator shows all 15+ panels to every user regardless of skill level. A beginner who needs "select material, select operation, click calculate" sees the same interface as an expert who needs toolpath strategy multipliers, insert coating selection, and CAM software feed compensation.

**Recommendation:**
- Create three interface complexity modes: **Beginner** (simplified -- 5 essential fields), **Journeyman** (standard -- 10 fields), **Master** (full -- all fields)
- Beginner mode hides: CAM Software, Cutting Priority, Toolpath Strategy, Tool Holder, Insert Config, Fixture, Machine Config. Shows only: Material, Operation, basic params, Tool (auto-suggested), Calculate.
- Journeyman mode adds: Cutting Priority, Toolpath Strategy, Tool Holder, Machine selection
- Master mode: Full current interface
- Auto-set the mode based on Assessment results, with a toggle to override
- Show a progress indicator: "You're in Beginner mode. Complete 10 calculations to unlock Journeyman features."

---

## Finding 8: Landing Page Does Not Set Expectations

**SEVERITY: MEDIUM**

**Current behavior:** The landing page (`LandingPage.tsx`) is a standard marketing page with hero, features, pricing, FAQ, and CTA. It describes what PRISM does at a high level ("Physics-backed cutting parameters, instant quoting, and CNC program generation"). The hero CTA is "Try Free" which goes to `/login`.

Problems:
- No demo or interactive preview. A prospect cannot try a single calculation before creating an account.
- No screenshots showing the actual UI. Users have no idea what they are signing up for.
- No video walkthrough or animated demo.
- The social proof is weak: "Trusted by machinists, programmers, and job shops worldwide" with no numbers, logos, or testimonials.
- The FAQ does not address "How do I get started?" or "What do I need to know?"

**Recommendation:**
- Add an interactive "Try a calculation" widget on the landing page that works without login (using the free tier's 10/day limit)
- Add 2-3 screenshots or a short animated GIF showing the SFC Calculator workflow
- Add a "How it works" section: Step 1 (Select material) -> Step 2 (Choose operation) -> Step 3 (Get results)
- Strengthen social proof with specific numbers or anonymized case studies

---

## Finding 9: Sidebar Navigation Overwhelm

**SEVERITY: MEDIUM**

**Current behavior:** `AppShell.tsx` defines 11 navigation groups with a total of 50+ items. The sidebar is 56 pixels wide (`w-56`). The nav groups are: Core (3), Shop (6), Quoting (9), Finance (6), HR & Payroll (5), ERP (9), Analysis (6), Viewer (1), Data & Quality (6), Billing (1), Admin (3).

For a new user, this is overwhelming. There is no visual hierarchy, no "pinned" or "favorites" concept, no search within the sidebar, and no indication of which sections are relevant to the user's subscription tier.

**Recommendation:**
- Show only "Core" and "Admin" groups expanded by default; collapse all others
- Add a sidebar search/filter input at the top
- Add a "Favorites" / "Pinned" section at the top for frequently used pages
- Grey out or hide features not available on the user's subscription tier
- Add a "What's this?" popover on each section heading
- For free-tier users, show only Core + Learning + Settings; reveal others as upgrade teasers

---

## Finding 10: No Empty States with Guidance

**SEVERITY: MEDIUM**

**Current behavior:** When a user first opens the SFC Calculator, every selector is in its default/empty state. The material is `null`, the tool is `null`, the machine is `null`. The only feedback is a disabled Calculate button and the text "Select a material and operation to enable calculation."

Other pages likely have similar empty states. The Learning Dashboard shows "Complete modules to earn achievements" in the achievements panel when empty, and the radar chart shows zeros. These are passive acknowledgments of emptiness, not active guidance.

**Recommendation:**
- Replace empty states with actionable guidance cards:
  - SFC Calculator empty state: "Welcome to Speed & Feed Calculator! Let's set up your first calculation: 1. Pick a material 2. Choose an operation 3. Select a tool 4. Click Calculate. [Start Guided Tutorial]"
  - Learning Dashboard empty state: "Take the Skill Assessment to see your profile and get personalized recommendations. [Start Assessment]"
  - Shop Dashboard empty state: "Set up your shop to get started. [Add First Machine]"
- Use illustration/icons in empty states to make them visually distinct from "loading" or "error" states

---

## Finding 11: Registration Asks Nothing About the User

**SEVERITY: MEDIUM**

**Current behavior:** `LoginPage.tsx` registration requires only username, email, and password. After registration, the user is immediately dropped into the SFC Calculator. There is no:
- Company/shop name
- Role selection (machinist/programmer/shop owner/engineer/student)
- Experience level
- Primary use case
- Subscription tier selection (the landing page has tiers but there is no tier selection during registration)

**Recommendation:**
- After the core registration form (username/email/password), add 2-3 onboarding screens:
  - Screen 1: "Tell us about yourself" -- Role, experience years, company name
  - Screen 2: "What's your primary goal?" -- Calculate feeds & speeds / Generate CNC programs / Quote jobs / Manage shop
  - Screen 3: "Quick shop setup" (optional) -- Add a machine, select common materials
- This data feeds into personalization: sidebar layout, default page, Learning recommendations, interface complexity mode

---

## Finding 12: No Keyboard Shortcuts or Power-User Accelerators

**SEVERITY: LOW**

**Current behavior:** No keyboard shortcuts exist anywhere. The SFC Calculator has good basic keyboard support (tab order, arrow keys for right-panel tabs), but no accelerators like Ctrl+Enter to calculate, Ctrl+S to save preset, or Ctrl+/ to open a command palette.

**Recommendation:**
- Add Ctrl+Enter as "Calculate" shortcut on the SFC page
- Add a command palette (Ctrl+K) for quick navigation between pages
- Show keyboard shortcuts in tooltips

---

## Time-to-Value Analysis

| User Type | Current Time-to-Value | Target Time-to-Value |
|-----------|----------------------|---------------------|
| Expert machinist | ~5 minutes (if they guess the workflow) | <60 seconds (guided first calc) |
| Shop owner | Effectively never (cannot find quoting/ERP) | ~3 minutes (role-based onboarding) |
| CNC programmer | ~3 minutes (familiar with terms) | <60 seconds (guided tour) |
| Student/beginner | Effectively never (no explanation of terms) | ~10 minutes (beginner mode + assessment) |

---

## Priority Implementation Order

1. **CRITICAL** -- Post-registration onboarding wizard with role selection (Finding 1, 11)
2. **CRITICAL** -- Shop setup wizard (Finding 2)
3. **HIGH** -- Contextual tooltips on SFC Calculator (Finding 3)
4. **HIGH** -- First-login guided tour (Finding 4)
5. **HIGH** -- Learning-to-tools bridges (Finding 6)
6. **HIGH** -- Role-based quick start paths (Finding 5)
7. **MEDIUM** -- Experience-level interface adaptation (Finding 7)
8. **MEDIUM** -- Sidebar navigation improvements (Finding 9)
9. **MEDIUM** -- Empty state guidance (Finding 10)
10. **MEDIUM** -- Landing page interactive demo (Finding 8)
11. **LOW** -- Keyboard shortcuts (Finding 12)

---

## Specific UX Flow: Recommended First-Run Experience

```
[Landing Page] --> "Try Free" --> [Registration Form]
                                        |
                                        v
                              [Onboarding Step 1/4]
                              "What's your role?"
                              [ ] Machinist / Operator
                              [ ] CNC Programmer
                              [ ] Shop Owner / Manager
                              [ ] Engineer / Designer
                              [ ] Student / Learning
                                        |
                                        v
                              [Onboarding Step 2/4]
                              "How experienced are you?"
                              Beginner / Intermediate / Advanced / Expert
                              (Skip option available)
                                        |
                                        v
                              [Onboarding Step 3/4]
                              "Quick shop setup" (optional)
                              - Add a machine (searchable dropdown from 910)
                              - Select common materials (multi-select chips)
                              - Choose your controller brand
                              (Skip for now option available)
                                        |
                                        v
                              [Onboarding Step 4/4]
                              "Your personalized dashboard is ready!"
                              Shows role-appropriate page preview
                              [Get Started] button
                                        |
                                        v
                              [Role-Appropriate Page with Guided Tour]
                              Machinist -> SFC Calculator (Beginner mode, tour active)
                              Shop Owner -> Shop Dashboard
                              Programmer -> Post Processor
                              Student -> Learning Dashboard (Assessment prompt)
                                        |
                                        v
                              [Getting Started Checklist]
                              Persists in sidebar until completed:
                              [ ] Complete your first calculation
                              [ ] Take the skill assessment
                              [ ] Add a machine to your shop
                              [ ] Save a preset
                              [ ] Generate a report
```

---

## Files That Need Changes (by priority)

### New files needed:
- `web/src/pages/OnboardingPage.tsx` -- Multi-step first-run wizard
- `web/src/components/onboarding/RoleSelector.tsx`
- `web/src/components/onboarding/ShopSetupWizard.tsx`
- `web/src/components/onboarding/GettingStartedChecklist.tsx`
- `web/src/components/ui/InfoTooltip.tsx` -- Reusable contextual help component
- `web/src/components/ui/GuidedTour.tsx` -- Tour wrapper
- `web/src/hooks/useOnboarding.ts` -- Onboarding state management
- `web/src/contexts/OnboardingContext.tsx` -- First-run state, role, experience level

### Existing files requiring modification:
- `web/src/pages/LoginPage.tsx` -- Route new users to onboarding, not /sfc
- `web/src/App.tsx` -- Add /onboarding route, add route guards
- `web/src/components/layout/AppShell.tsx` -- Role-based sidebar, collapsed defaults, Getting Started checklist, favorites
- `web/src/pages/SfcCalculatorPage.tsx` -- Experience-level modes, empty state guidance, tooltips, Learning links
- `web/src/pages/LearningDashboard.tsx` -- "Try this calculation" bridges, role-based recommendations
- `web/src/pages/SettingsPage.tsx` -- Shop setup tabs (Machines, Tools, Materials, Rates)
- `web/src/components/learning/Assessment.tsx` -- Post-assessment routing to appropriate tools
- `web/src/components/learning/MachineWizard.tsx` -- "Use in Calculator" bridge
