const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const events = [];

  page.on('console', (msg) => {
    events.push({ type: 'console', level: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (error) => {
    events.push({ type: 'pageerror', text: error.stack || error.message });
  });
  page.on('requestfailed', (request) => {
    events.push({
      type: 'requestfailed',
      text: `${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`,
    });
  });

  const response = await page.goto('http://127.0.0.1:3100/calculator', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(12000);

  const payload = {
    status: response?.status(),
    title: await page.title(),
    url: page.url(),
    bodyText: await page.locator('body').innerText(),
    events,
  };

  fs.writeFileSync('H:/PRISM/output/playwright/calculator-route-debug.json', JSON.stringify(payload, null, 2));
  await page.screenshot({
    path: 'H:/PRISM/output/playwright/calculator-route-debug-console.png',
    fullPage: true,
  });
  console.log(JSON.stringify(payload, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
