import config from '~/config';
import stringify from 'csv-stringify';
import * as fs from 'fs-extra';

export const createCsv = async (data?: any) => {
  if (!data) {
    const { results } = (await fs.readJson(`${config.root}/hehe.json`)) as any;
    data = results;
  }
  const table = [];
  table.push(
    [
      'territory',
      'ec_number',
      'participants_number',
      'given_bulletins_number',
      'returned_bulletins_number',
      'invalid_bulletins_number',
      'turnout',
      'yes_votes_total',
      'yes_votes_percentage',
      'no_votes_total',
      'no_votes_percentage'
    ]
  );
  for (const { title, result } of data) {
    for (const [uik, uikResult] of Object.entries<any>(result)) {
      table.push([
        title,
        uikResult.ec_number,
        uikResult.participants_number,
        uikResult.given_bulletins_number,
        uikResult.returned_bulletins_number,
        uikResult.invalid_bulletins_number,
        (uikResult.given_bulletins_number / uikResult.participants_number * 100).toFixed(12),
        uikResult.yes_votes_total,
        uikResult.yes_votes_percentage,
        uikResult.no_votes_total,
        uikResult.no_votes_percentage,
      ]);
    }
  }
  stringify(table, {
    delimiter: ','
  }, async (err, records) => {
    if (err) {
      throw err;
    }
    await fs.writeFile(`${config.root}/res.csv`, records);
  })
}
