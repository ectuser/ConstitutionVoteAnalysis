import { createLogger } from '~/helpers/logger';
import config from '~/config';
import puppeteer from 'puppeteer';

import { Scraper } from './worker';
import { PollRegion } from './types';
import { waitForCaptchaSolved } from './utils';
import { createCsv } from './createCsv';

const log = createLogger('Poll Scraper');

export const Poll = async () => {
  if (false) {
    // produce CSV
    createCsv();
  }

  // gather polling data from website
  const url = 'https://vk.com/away.php?utf=1&to=http%3A%2F%2Fwww.tomsk.vybory.izbirkom.ru%2Fregion%2Fregion%2Ftomsk%3Faction%3Dshow%26root%3D1000068%26tvd%3D100100163598077%26vrn%3D100100163596966%26region%3D70%26global%3D1%26sub_region%3D70%26prver%3D0%26pronetvd%3Dnull%26vibid%3D100100163598077%26type%3D465';

  // start the uploader
  const tStart = Date.now();

  // get url
  const browser = await puppeteer.launch({
    headless: config.headless,
    ignoreHTTPSErrors: true,
    args: [
      `--proxy-server='direct://'`,
      '--proxy-bypass-list=*',
      '--log-level=3',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-site-isolation-trials',
      '--ignore-gpu-blacklist',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--enable-features=NetworkService',
      '--disable-setuid-sandbox',
      '--no-sandbox'
    ]
  });
  const page = (await browser.pages())[0];
  await page.goto(url, {
    waitUntil: 'networkidle2'
  });

  await waitForCaptchaSolved(page);

  // get uiks
  const anchors = await page.$$('body > table:nth-child(3) > tbody > tr:nth-child(4) > td > div > table > tbody > tr > td:nth-child(2) > div > table > tbody > tr:nth-child(1) > td a');
  let regions = await Promise.all(anchors.map<Promise<PollRegion>>(async anchor => {
    return await anchor.evaluate((a: HTMLAnchorElement) => {
      return {
        url: a.href,
        title: a.innerText.trim()
      };
    });
  }));
  log.mark('Regions', regions);

  await browser.close();

  const uploader = new Scraper({
    regions
  });
  uploader.start();

  uploader
    .on('end', () => {
    })
    .on('error', (error) => {
      log.error('Fatal error', error);
    });
}