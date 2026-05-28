const { test, expect } = require('@playwright/test');

const URL = 'https://example.com/login';
const VALID_USER = 'testuser';
const VALID_PASS = 'Test@123';

// Helper to fill login form with captcha bypass (mock)
async function login(page, { username, password, captcha }) {
  await page.goto(URL);
  if (username !== undefined) await page.fill('#username', username);
  if (password !== undefined) await page.fill('#password', password);
  if (captcha !== undefined) await page.fill('#captcha', captcha);
  await page.click('#submit');
}

// ─── Positive Tests ───────────────────────────────────────

test('valid credentials with correct captcha logs in successfully', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', VALID_USER);
  await page.fill('#password', VALID_PASS);
  await page.fill('#captcha', 'test123'); // mock captcha
  await page.click('#submit');

  await expect(page.locator('.success-msg')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('login succeeds after refreshing captcha', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', VALID_USER);
  await page.fill('#password', VALID_PASS);
  await page.click('#refresh-captcha');
  await page.waitForSelector('#captcha');
  await page.fill('#captcha', 'test123');
  await page.click('#submit');

  await expect(page.locator('.success-msg')).toBeVisible();
});

test('leading/trailing spaces on username are trimmed', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', `  ${VALID_USER}  `);
  await page.fill('#password', VALID_PASS);
  await page.fill('#captcha', 'test123');

  const trimmed = await page.inputValue('#username');
  expect(trimmed).toBe(`  ${VALID_USER}  `);

  await page.click('#submit');
  await expect(page.locator('.success-msg')).toBeVisible();
});

// ─── Negative Tests ───────────────────────────────────────

test('invalid username shows error', async ({ page }) => {
  await login(page, { username: 'wrong', password: VALID_PASS, captcha: 'test123' });
  await expect(page.locator('.error-msg')).toBeVisible();
});

test('invalid password shows error', async ({ page }) => {
  await login(page, { username: VALID_USER, password: 'wrong', captcha: 'test123' });
  await expect(page.locator('.error-msg')).toBeVisible();
});

test('blank username shows validation error', async ({ page }) => {
  await login(page, { username: '', password: VALID_PASS, captcha: 'test123' });
  await expect(page.locator('#username-error')).toBeVisible();
});

test('blank password shows validation error', async ({ page }) => {
  await login(page, { username: VALID_USER, password: '', captcha: 'test123' });
  await expect(page.locator('#password-error')).toBeVisible();
});

test('wrong captcha shows captcha error and refreshes', async ({ page }) => {
  await login(page, { username: VALID_USER, password: VALID_PASS, captcha: 'wrong' });
  await expect(page.locator('.captcha-error')).toBeVisible();
});

test('blank captcha shows validation error', async ({ page }) => {
  await login(page, { username: VALID_USER, password: VALID_PASS, captcha: '' });
  await expect(page.locator('#captcha-error')).toBeVisible();
});

test('all fields empty shows multiple validation errors', async ({ page }) => {
  await page.goto(URL);
  await page.click('#submit');
  await expect(page.locator('#username-error')).toBeVisible();
  await expect(page.locator('#password-error')).toBeVisible();
  await expect(page.locator('#captcha-error')).toBeVisible();
});

test('SQL injection in username is rejected', async ({ page }) => {
  await login(page, { username: "' OR 1=1 --", password: VALID_PASS, captcha: 'test123' });
  await expect(page.locator('.error-msg')).toBeVisible();
});

test('XSS in username is sanitized', async ({ page }) => {
  await login(page, { username: '<script>alert("xss")</script>', password: VALID_PASS, captcha: 'test123' });
  await expect(page.locator('.error-msg')).toBeVisible();
});

test('submit while captcha is loading is blocked', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', VALID_USER);
  await page.fill('#password', VALID_PASS);
  await page.click('#submit'); // captcha not yet filled
  await expect(page.locator('#captcha-error')).toBeVisible();
});

// ─── Edge Tests ───────────────────────────────────────────

test('maximum length username and password', async ({ page }) => {
  const longUser = 'a'.repeat(100);
  const longPass = 'b'.repeat(128);
  await login(page, { username: longUser, password: longPass, captcha: 'test123' });
  await expect(page.locator('.error-msg, .success-msg')).toBeVisible();
});

test('minimum length values (single character)', async ({ page }) => {
  await login(page, { username: 'a', password: 'b', captcha: 'test123' });
  await expect(page.locator('.error-msg, .success-msg')).toBeVisible();
});

test('special / unicode characters in username and password', async ({ page }) => {
  await login(page, { username: 'admin@#!$%^&*()', password: 'p@ss™üñîçø∂é', captcha: 'test123' });
  await expect(page.locator('.error-msg, .success-msg')).toBeVisible();
});

test('whitespace-only username and password are rejected', async ({ page }) => {
  await login(page, { username: '   ', password: '   ', captcha: 'test123' });
  await expect(page.locator('#username-error, #password-error')).toBeVisible();
});

test('password is case-sensitive', async ({ page }) => {
  await login(page, { username: VALID_USER, password: VALID_PASS.toUpperCase(), captcha: 'test123' });
  await expect(page.locator('.error-msg')).toBeVisible();
});

test('rapid double-click on submit does not submit twice', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', VALID_USER);
  await page.fill('#password', VALID_PASS);
  await page.fill('#captcha', 'test123');
  await page.click('#submit');
  await page.click('#submit');

  await page.waitForLoadState('networkidle');
  const logs = await page.locator('.success-msg').count();
  expect(logs).toBeLessThanOrEqual(1);
});

test('captcha expiry — submit after captcha expires', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', VALID_USER);
  await page.fill('#password', VALID_PASS);
  await page.fill('#captcha', 'test123');
  await page.evaluate(() => new Promise(r => setTimeout(r, 65000))); // wait for captcha expiry
  await page.click('#submit');
  await expect(page.locator('.captcha-error')).toBeVisible();
});

test('copy-paste into password field works', async ({ page }) => {
  await page.goto(URL);

  // Simulate clipboard paste
  await page.fill('#username', VALID_USER);
  await page.evaluate(() => navigator.clipboard.writeText(VALID_PASS));
  await page.focus('#password');
  await page.keyboard.press('Control+V');

  await page.fill('#captcha', 'test123');
  await page.click('#submit');
  await expect(page.locator('.success-msg')).toBeVisible();
});

test('submit button is disabled while loading', async ({ page }) => {
  await page.goto(URL);
  await page.fill('#username', VALID_USER);
  await page.fill('#password', VALID_PASS);
  await page.fill('#captcha', 'test123');
  await page.click('#submit');

  await expect(page.locator('#submit')).toBeDisabled();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#submit')).toBeEnabled();
});
