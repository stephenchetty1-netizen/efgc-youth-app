const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.EFGC_TEST_URL || 'http://127.0.0.1:8080/index.html';
const sizes = [
  { name: 'android-360x800', width: 360, height: 800 },
  { name: 'android-384x854', width: 384, height: 854 },
  { name: 'samsung-412x915', width: 412, height: 915 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x1000', width: 1440, height: 1000 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  fs.mkdirSync('artifacts/v61-visual', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const size of sizes) {
      const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#mockWelcome.v57-welcome', { state: 'visible', timeout: 10000 });
      await page.waitForTimeout(1200);

      const welcome = await page.evaluate(() => {
        const el = document.querySelector('#mockWelcome.v57-welcome');
        const logo = document.querySelector('.v57-logo');
        const login = document.querySelector('#v57Login');
        if (!el || !logo || !login) return null;
        const er = el.getBoundingClientRect();
        const lr = logo.getBoundingClientRect();
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          welcomeWidth: er.width,
          welcomeLeft: er.left,
          welcomeRight: er.right,
          logoNaturalWidth: logo.naturalWidth,
          logoNaturalHeight: logo.naturalHeight,
          logoLeft: lr.left,
          logoRight: lr.right,
          logoTop: lr.top,
          loginVisible: !!(login.offsetWidth || login.offsetHeight || login.getClientRects().length),
        };
      });

      assert(welcome, `${size.name}: welcome screen did not render`);
      assert(welcome.scrollWidth <= welcome.viewportWidth + 2, `${size.name}: horizontal overflow ${welcome.scrollWidth}px > ${welcome.viewportWidth}px`);
      assert(welcome.welcomeWidth >= welcome.viewportWidth * 0.97, `${size.name}: welcome is still a narrow poster (${welcome.welcomeWidth}px of ${welcome.viewportWidth}px)`);
      assert(welcome.welcomeLeft >= -2 && welcome.welcomeRight <= welcome.viewportWidth + 2, `${size.name}: welcome is clipped outside viewport`);
      assert(welcome.logoNaturalWidth > 0 && welcome.logoNaturalHeight > 0, `${size.name}: official logo did not load`);
      assert(welcome.logoLeft >= -2 && welcome.logoRight <= welcome.viewportWidth + 2, `${size.name}: official logo is horizontally clipped`);
      assert(welcome.logoTop >= -2, `${size.name}: official logo is vertically clipped at top`);
      assert(welcome.loginVisible, `${size.name}: Login button is not visible`);

      await page.screenshot({ path: `artifacts/v61-visual/${size.name}-welcome.png`, fullPage: true });

      await page.click('#v57Login');
      await page.waitForSelector('#login .login-card:not(.mock-login-hidden)', { state: 'visible', timeout: 5000 });
      const loginLayout = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        welcomeHidden: document.querySelector('#mockWelcome')?.classList.contains('hidden') || false,
      }));
      assert(loginLayout.scrollWidth <= loginLayout.viewportWidth + 2, `${size.name}: login form has horizontal overflow`);
      assert(loginLayout.welcomeHidden, `${size.name}: welcome screen remained visible over login form`);

      await page.click('.login-type[data-role="admin"]');
      await page.waitForTimeout(100);
      const adminUi = await page.evaluate(() => {
        const password = document.querySelector('#passwordField');
        const recovery = document.querySelector('#forgotPasswordButton');
        return {
          passwordVisible: password ? !password.classList.contains('hidden') : false,
          forgotVisible: recovery ? !!(recovery.offsetWidth || recovery.offsetHeight || recovery.getClientRects().length) : false,
        };
      });
      assert(adminUi.passwordVisible, `${size.name}: Admin password field did not appear`);
      assert(adminUi.forgotVisible, `${size.name}: Forgot password control is not available for Admin`);
      await page.screenshot({ path: `artifacts/v61-visual/${size.name}-admin-login.png`, fullPage: true });
      await page.close();
    }
    console.log(`V61 visual smoke passed at ${sizes.length} viewport sizes.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
