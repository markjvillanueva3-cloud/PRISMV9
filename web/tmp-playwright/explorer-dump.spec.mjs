import { test } from '@playwright/test';

test('dump calculator controls', async ({ page }) => {
  const logs = [];
  page.on('console', msg => {
    if (['error', 'warning'].includes(msg.type())) logs.push(`[${msg.type()}] ${msg.text()}`);
  });
  await page.goto('http://127.0.0.1:3100/calculator', { waitUntil: 'networkidle' });
  const buttons = await page.locator('button').evaluateAll(nodes => nodes.map(n => (n.innerText || '').trim()).filter(Boolean));
  const selects = await page.locator('select').evaluateAll(nodes => nodes.map(n => ({ aria: n.getAttribute('aria-label') || '', value: n.value, options: [...n.options].slice(0,8).map(o => o.text) })));
  console.log('BUTTONS ' + JSON.stringify(buttons.slice(0,80)));
  console.log('SELECTS ' + JSON.stringify(selects.slice(0,20)));
  console.log('LOGS ' + JSON.stringify(logs.slice(0,40)));
  await page.screenshot({ path: 'C:/PRISM/output/playwright-audit/explorer-home.png', fullPage: false });
});
