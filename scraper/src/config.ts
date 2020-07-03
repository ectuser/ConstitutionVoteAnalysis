import * as path from 'path';
import * as dotenv from 'dotenv';
const envConfig = dotenv.config().parsed;

interface IConfig {
  env: string;
  root: string;
  headless: boolean;
}

const config: Record<string, Partial<IConfig>> = {
  all: {
    env: process.env.NODE_ENV || 'development',
    root: path.join(__dirname, '..'),
    headless: process.env.headless === 'true',
  },

  production: {},
}

export default { ...envConfig, ...config.all, ...config[config.all.env] } as IConfig;