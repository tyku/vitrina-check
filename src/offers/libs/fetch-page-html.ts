import { chromium, type Browser } from 'playwright';
import type { TFetchHtmlOptions, TFetchHtmlResult } from '../types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function fetchPageHtml(url: string, options: TFetchHtmlOptions = {}): Promise<TFetchHtmlResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const viewport = options.viewport ?? { width: 1440, height: 900 };
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    userAgent,
    viewport,
  });

  try {
    const page = await context.newPage();
    await page.goto(url, { timeout: timeoutMs, waitUntil: 'domcontentloaded' });
    try {
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    } catch {
      // Some pages keep a long polling connection alive forever.
    }
    await page.waitForTimeout(1_000);
    const html = await page.content();
    return { url, html };
  } finally {
    await context.close();
    await browser.close();
  }
}
