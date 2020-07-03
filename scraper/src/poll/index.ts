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
  const url = 'http://www.dagestan.vybory.izbirkom.ru/region/region/dagestan?action=show&root=1000005&tvd=100100163598014&vrn=100100163596966&region=5&global=1&sub_region=5&prver=0&pronetvd=null&vibid=100100163598014&type=465';

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