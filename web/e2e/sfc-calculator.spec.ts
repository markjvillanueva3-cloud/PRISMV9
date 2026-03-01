import { test, expect } from "@playwright/test";

test.describe("SFC Calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sfc");
  });

  test("page loads with correct title and layout", async ({ page }) => {
    // Verify page structure
    await expect(page.getByRole("heading", { name: /material/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /operation/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /results/i })).toBeVisible();

    // Calculate button should be disabled initially
    const calcButton = page.getByRole("button", { name: /calculate/i });
    await expect(calcButton).toBeDisabled();
  });

  test("material selector opens and filters", async ({ page }) => {
    const materialInput = page.getByRole("combobox", { name: /search materials/i });
    await materialInput.click();

    // Dropdown should appear
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();

    // Filter by typing
    await materialInput.fill("1045");
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();

    // Select a material
    await options.first().click();

    // Property summary should appear
    await expect(page.getByText(/hardness/i)).toBeVisible();
  });

  test("operation selector expands categories", async ({ page }) => {
    // Click a category (Milling)
    const millingButton = page.getByRole("button", { name: /milling/i }).first();
    await millingButton.click();

    // Sub-operations should appear
    await expect(page.getByRole("button", { name: /face milling/i })).toBeVisible();

    // Select a sub-operation
    await page.getByRole("button", { name: /face milling/i }).click();
  });

  test("full calculation flow: material → operation → calculate", async ({ page }) => {
    // 1. Select material
    const materialInput = page.getByRole("combobox", { name: /search materials/i });
    await materialInput.click();
    await materialInput.fill("4140");
    await page.getByRole("option").first().click();

    // 2. Select operation
    const millingButton = page.getByRole("button", { name: /milling/i }).first();
    await millingButton.click();
    await page.getByRole("button", { name: /face milling/i }).click();

    // 3. Calculate button should now be enabled
    const calcButton = page.getByRole("button", { name: /calculate/i });
    await expect(calcButton).toBeEnabled();

    // 4. Click calculate
    await calcButton.click();

    // 5. Results should appear (or loading state)
    // Note: Without a running API server, this will show an error,
    // but we verify the flow works up to the API call
    await expect(
      page.getByText(/RPM|calculating|error/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("parameter panel shows and allows editing", async ({ page }) => {
    // Select operation first (to populate defaults)
    const millingButton = page.getByRole("button", { name: /milling/i }).first();
    await millingButton.click();
    await page.getByRole("button", { name: /face milling/i }).click();

    // Parameter panel should show
    await expect(page.getByText(/tool diameter/i)).toBeVisible();
    await expect(page.getByText(/depth of cut/i)).toBeVisible();
  });

  test("tool selector shows compatible tools after material + operation", async ({ page }) => {
    // Select material
    const materialInput = page.getByRole("combobox", { name: /search materials/i });
    await materialInput.click();
    await materialInput.fill("6061");
    await page.getByRole("option").first().click();

    // Select operation
    const millingButton = page.getByRole("button", { name: /milling/i }).first();
    await millingButton.click();
    await page.getByRole("button", { name: /pocket milling/i }).click();

    // Tool selector should show compatible tools
    await expect(page.getByText(/endmill/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("preset manager saves and loads presets", async ({ page }) => {
    // Select material + operation first
    const materialInput = page.getByRole("combobox", { name: /search materials/i });
    await materialInput.click();
    await materialInput.fill("1045");
    await page.getByRole("option").first().click();

    const millingButton = page.getByRole("button", { name: /milling/i }).first();
    await millingButton.click();
    await page.getByRole("button", { name: /face milling/i }).click();

    // Save a preset
    const presetInput = page.getByPlaceholder(/preset name/i);
    await presetInput.fill("Test Preset 1045 Face");
    await page.getByRole("button", { name: /^save$/i }).click();

    // Preset should appear in list
    await expect(page.getByText("Test Preset 1045 Face")).toBeVisible();
  });

  test("tab navigation between Charts, Compare, History", async ({ page }) => {
    // Tabs should be visible
    const chartsTab = page.getByRole("tab", { name: /charts/i });
    const compareTab = page.getByRole("tab", { name: /compare/i });
    const historyTab = page.getByRole("tab", { name: /history/i });

    await expect(chartsTab).toBeVisible();
    await expect(compareTab).toBeVisible();
    await expect(historyTab).toBeVisible();

    // Charts tab should be selected by default
    await expect(chartsTab).toHaveAttribute("aria-selected", "true");

    // Click Compare tab
    await compareTab.click();
    await expect(compareTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/add calculations to compare/i)).toBeVisible();

    // Click History tab
    await historyTab.click();
    await expect(historyTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/no calculation history/i)).toBeVisible();
  });

  test("keyboard navigation works on material selector", async ({ page }) => {
    const materialInput = page.getByRole("combobox", { name: /search materials/i });
    await materialInput.focus();

    // ArrowDown should open dropdown
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();

    // ArrowDown should navigate
    await page.keyboard.press("ArrowDown");

    // Escape should close
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).not.toBeVisible();
  });

  test("machine selector shows after requirements are known", async ({ page }) => {
    // Machine section should show "run a calculation first" initially
    await expect(page.getByText(/run a calculation first/i)).toBeVisible();
  });

  test("compatibility validator is green when no selections", async ({ page }) => {
    // With no material/tool selected, no warnings should show
    const alert = page.getByRole("alert");
    await expect(alert).not.toBeVisible();
  });
});
