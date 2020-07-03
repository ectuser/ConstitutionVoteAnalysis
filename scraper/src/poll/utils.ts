import { Page } from 'puppeteer';

export const waitForCaptchaSolved = async (page: Page) => {
  if (await page.$('#captchaImg')) {
    await page.waitForNavigation({
      waitUntil: 'networkidle0'
    });
  }
}