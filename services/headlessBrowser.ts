import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { MINIMAL_ARGS } from '../const/1688';

puppeteer.use(StealthPlugin());

export const launchBrowser = async () => {
  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();
    return await puppeteer.launch({
      headless: true,
      executablePath,
      args: [...MINIMAL_ARGS, `--proxy-server=${process.env.PROXY_SERVER}`],
    });
  } catch (error) {
    console.error('Error launching browser:', error);
    throw new Error('Failed to launch browser');
  }
};
