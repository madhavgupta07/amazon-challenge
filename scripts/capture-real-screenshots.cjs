const puppeteer = require('e:/amazon challenge/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://localhost:5173';
const outBase = path.resolve('docs/media/real_views');

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const routes = [
  { name: 'dashboard', path: '/', selector: '.card' },
  { name: 'tasks', path: '/tasks', selector: 'button' },
  { name: 'planner', path: '/planner', selector: 'button' },
  { name: 'notes', path: '/notes', selector: 'button' },
  { name: 'assistant', path: '/assistant', selector: 'textarea, input' },
  { name: 'insights', path: '/insights', selector: '.card, div' },
  { name: 'explore', path: '/explore', selector: '.explore-title' },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching Chrome from:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  fs.mkdirSync(outBase, { recursive: true });

  const page = await browser.newPage();

  // 1. Capture Login Page first (Desktop, Tablet, Mobile)
  console.log('\n--- Capturing Login Page ---');
  for (const vp of viewports) {
    const vpDir = path.join(outBase, vp.name);
    fs.mkdirSync(vpDir, { recursive: true });

    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
    await sleep(800);

    const dest = path.join(vpDir, '01_login.png');
    await page.screenshot({ path: dest, fullPage: false });
    console.log(`Saved [${vp.name}]: 01_login.png`);
  }

  // 2. Perform Login to acquire session token
  console.log('\n--- Authenticating demo user ---');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'demo@lifepilot.app');
  await page.type('input[type="password"]', 'demo1234');
  await page.click('button[type="submit"]');
  await sleep(1500);

  const token = await page.evaluate(() => localStorage.getItem('lifepilot.token'));
  console.log('Login complete. Token stored:', !!token);

  // 3. Capture all app pages across viewports
  for (const vp of viewports) {
    console.log(`\n--- Capturing ${vp.name.toUpperCase()} (${vp.width}x${vp.height}) ---`);
    const vpDir = path.join(outBase, vp.name);
    fs.mkdirSync(vpDir, { recursive: true });

    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

    let idx = 2;
    for (const r of routes) {
      const url = `${baseUrl}${r.path}`;
      console.log(`Visiting ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for route content
      if (r.selector) {
        await page.waitForSelector(r.selector, { timeout: 8000 }).catch(() => {});
      }
      await sleep(1200);

      const numStr = String(idx).padStart(2, '0');
      const filename = `${numStr}_${r.name}.png`;
      const dest = path.join(vpDir, filename);

      await page.screenshot({ path: dest, fullPage: false });
      console.log(`Saved [${vp.name}]: ${filename}`);
      idx++;
    }
  }

  // 4. Capture Dedicated Devpost / Submission Thumbnail (16:9, 1280x720)
  console.log('\n--- Capturing Master Project Thumbnail ---');
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/explore`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  const thumbDest = path.join(outBase, '00_master_thumbnail_devpost.png');
  await page.screenshot({ path: thumbDest });
  console.log('Saved: 00_master_thumbnail_devpost.png');

  // Also capture Dashboard Thumbnail
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle2' });
  await sleep(1500);
  const dashThumbDest = path.join(outBase, '00_dashboard_thumbnail_16x9.png');
  await page.screenshot({ path: dashThumbDest });
  console.log('Saved: 00_dashboard_thumbnail_16x9.png');

  await browser.close();
  console.log('\nAll real screenshots successfully captured!');
}

run().catch((err) => {
  console.error('Capture process failed:', err);
  process.exit(1);
});
