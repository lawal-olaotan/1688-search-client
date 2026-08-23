import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { MINIMAL_ARGS } from '../const/1688';
import type { Browser } from 'puppeteer';

puppeteer.use(StealthPlugin());

let browser: Browser | undefined;

export const launchBrowser = async () => {
  try {
    if (browser?.connected) return browser;
    browser = await puppeteer.launch({ headless: true, args: MINIMAL_ARGS });
    return browser;
  } catch (error) {
    console.error('Error launching browser:', error);
    throw new Error('Failed to launch browser');
  }
};
