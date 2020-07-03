import { Cluster } from 'puppeteer-cluster';
import log from 'color-log';
import fs from 'fs-extra';
import config from '~/config';
import { EventEmitter } from 'events';
import { PollRegion, JobData, PollStats, ScraperResult } from './types';
import { createLogger } from '~/helpers/logger';
import { waitForCaptchaSolved } from './utils';
import { createCsv } from './createCsv';

const { root } = config;

class Scraper extends EventEmitter {
  private regions: PollRegion[];

  constructor(
    { regions }: {
      regions: PollRegion[],
    }
  ) {
    super();

    this.regions = regions;
  }

  async start() {
    try {
      const cluster: Cluster<JobData, any> = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 1,
        monitor: true,
        timeout: 1000 * 30000,
        puppeteerOptions: {
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
        }
      });

      let results: ScraperResult[] = [];

      cluster.task(async ({ page, data: { region } }) => {
        const prefix = `[${region.title}]`;
        const logger = createLogger(prefix);

        try {
          await page.goto(region.url, {
            waitUntil: 'networkidle0'
          });
          await waitForCaptchaSolved(page);

          const table = await page.$('body > table:nth-child(3) > tbody > tr:nth-child(4) > td > div > table > tbody > tr > td:nth-child(2) > div > table');

          // get data
          const firstRow = await table.$('tbody > tr:nth-of-type(1)');
          const rowTotalParticipants = await table.$('tbody > tr:nth-of-type(2)');
          const rowGiven = await table.$('tbody > tr:nth-of-type(3)');
          const rowReturned = await table.$('tbody > tr:nth-of-type(4)');
          const rowInvalid = await table.$('tbody > tr:nth-of-type(5)');
          const rowPro = await table.$('tbody > tr:nth-of-type(7)');
          const rowContra = await table.$('tbody > tr:nth-of-type(8)');

          const uiksCount = await firstRow.evaluate(tr => tr.childElementCount);
          const uikData: Record<string, PollStats> = {};
          for (let i = 1; i <= uiksCount; ++i) {
            const uikName = await firstRow.evaluate((row, i) => row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);
            // ensure cell exists
            if (!(await rowTotalParticipants.$(`td:nth-of-type(${i})`))) {
              continue;
            }
            const participants_number = await rowTotalParticipants.evaluate((row, i) => +row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);
            const given_bulletins_number = await rowGiven.evaluate((row, i) => +row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);
            const returned_bulletins_number = await rowReturned.evaluate((row, i) => +row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);
            const invalid_bulletins_number = await rowInvalid.evaluate((row, i) => +row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);

            const pro = await rowPro.evaluate((row, i) => row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);
            const [yesTotal, yesPercentage] = pro.split('\n');
            const yes_votes_total = yesTotal.replace(/\W/g, '');
            const yes_votes_percentage = yesPercentage.slice(0, -1);

            const contra = await rowContra.evaluate((row, i) => row.querySelector<HTMLTableDataCellElement>(`td:nth-of-type(${i})`).innerText.trim(), i);
            const [noTotal, noPercentage] = contra.split('\n');
            const no_votes_total = noTotal.replace(/\W/g, '');
            const no_votes_percentage = noPercentage.slice(0, -1);

            uikData[uikName] = {
              ec_number: uikName.match(/(\d+)/)[1],
              participants_number,
              given_bulletins_number,
              returned_bulletins_number,
              invalid_bulletins_number,
              yes_votes_total,
              yes_votes_percentage,
              no_votes_total,
              no_votes_percentage,
            };
          }

          results.push({
            title: region.title,
            result: uikData
          });
          return uikData;
        } catch (e) {
          logger.mark('Error', e);
          return null;
        }
      });

      this.regions.forEach(
        (region, i) => cluster.queue({
          i,
          region
        })
      );

      await cluster.idle();
      await cluster.close();

      // save to json
      await fs.writeJson(`${root}/hehe.json`, {
        results
      });
      // generate csv
      createCsv(results);
      this.emit('end');
    } catch (e) {
      log.error('Error on uploading', e);
    }
  }
}

export {
  Scraper
};