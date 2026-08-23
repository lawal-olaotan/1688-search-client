import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { MINIMAL_ARGS } from '../const/1688';

puppeteer.use(StealthPlugin());

export const launchBrowser = async () => {
  try {
    return await puppeteer.launch({ headless: true, args: MINIMAL_ARGS });
  } catch (error) {
    console.error('Error launching browser:', error);
    throw new Error('Failed to launch browser');
  }
};
