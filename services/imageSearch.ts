import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { launchBrowser } from './headlessBrowser';
import { COOKIE_KEY, TARGET_URL, USER_AGENT } from '../const/1688';
import { BrowserContext } from 'puppeteer';
import { convertImageUrlToBase64 } from '../helpers/imageConversionHelper';
import { SupplierDetails } from '../types/supplierDetails';

interface ImageUploadData {
  url: string;
  data: string;
}

interface UploadSessionData {
  imageData: ImageUploadData;
  cookies: Array<{ name: string; value: string }>;
}

const translateClient = new TranslateClient({
  region: 'eu-west-2',
});

export const imageSearchService = async (imageUrl: string, useEnglish = false) => {
  const browser = await launchBrowser();
  const context = await browser.createBrowserContext();

  try {
    const uploadSession = await uploadImage(context, imageUrl);
    if (!uploadSession) {
      console.error('Image upload setup failed, no session data returned');
      return null;
    }

    const imageId = await uploadImageTo1688(uploadSession.imageData, uploadSession.cookies);
    if (!imageId) {
      console.error('Image upload failed, no image ID returned');
      return null;
    }
    const untranslatedResults = await getSupplierDataFromImageId(context, imageId);
    if (!useEnglish) {
      return untranslatedResults;
    }
    return await Promise.all(
      untranslatedResults.map(async (result) => {
        const translatedTitle = await translateText(result.productTitle);
        const translatedSupplierName = await translateText(result.supplierName);
        return {
          ...result,
          supplierName: translatedSupplierName || result.supplierName,
          productTitle: translatedTitle || result.productTitle,
        };
      }),
    );
  } catch (error) {
    console.error('Error performing image search:', error);
    throw new Error('Internal server error');
  } finally {
    await context.close();
    await browser.close();
  }
};

const getSupplierDataFromImageId = async (
  browser: BrowserContext,
  imageId: string,
): Promise<SupplierDetails[]> => {
  const page = await browser.newPage();

  if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
    await page.authenticate({
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    });
  }

  const url = `https://air.1688.com/kapp/1688-search/pc-image-search/?tab=imageSearch&imageId=${imageId}&imageIdList=${imageId}&spm=1688global.home/2025.pic&sortType=total_sales_volume&memberTags=215680;5179713&quantityBegin=10`;

  try {
    await page.goto(url);

    await page.waitForSelector('[data-renderkey]', { timeout: 10000 });
    return (await page.evaluate(() => {
      const extractProductPrice = (itemSelector: Element): number => {
        const pricingWrapper = itemSelector.querySelector('div[class^="priceItem--"]');
        const mainPrice =
          pricingWrapper?.querySelector('div[class^="textMain--"]')?.textContent ?? '';
        const decimalPrice = pricingWrapper?.querySelector('div:nth-child(3)')?.textContent ?? '';

        return Number(`${mainPrice}${decimalPrice || ''}`);
      };
      const extractYearsActive = (itemSelector: Element) => {
        const yearsActiveText = itemSelector.querySelector('div[class^="tpYear--"]')?.textContent;
        if (!yearsActiveText) return null;

        return yearsActiveText.replace(/\D/g, '');
      };
      const items = document.querySelectorAll('[data-renderkey]');
      return Array.from(items).map((item) => {
        const parts = item.getAttribute('data-renderkey')?.split('_');
        const offerId = parts?.[parts.length - 1];
        const productUrl = `https://detail.1688.com/offer/${offerId}.html`;
        const productImage = item?.querySelector('img')?.getAttribute('src') || '';
        const titleRow = item.querySelector('div[class^="offerTitleRow--"]');
        const productTitle =
          titleRow?.querySelector('div[class^="titleText--"] > div')?.textContent || '';
        const price = extractProductPrice(item);
        const supplierName = item.querySelector('div[class^="shopName--"]')?.textContent ?? '';
        const yearsActive = extractYearsActive(item);
        return {
          universalId: crypto.randomUUID(),
          productTitle,
          productUrl,
          productImage,
          productPriceRange: {
            min: price,
          },
          yearsActive,
          supplierName,
          supplierMoq: 'More than 10 pieces',
          supplierUrl: productUrl,
          platform: '1688',
        };
      });
    })) as SupplierDetails[];
  } catch (error) {
    console.error('Error:', error);
    return [];
  } finally {
    await page.close();
  }
};

const uploadImage = async (context: BrowserContext, imageUrl: string) => {
  const page = await context.newPage();

  if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
    await page.authenticate({
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    });
  }

  try {
    await page.setUserAgent({
      userAgent: USER_AGENT,
    });
    await page.goto(TARGET_URL, { timeout: 0 });
    const contextCookies = await context.cookies();
    const targetCookie = contextCookies.find((c) => c.name === COOKIE_KEY);
    if (!targetCookie) {
      console.error(`Cookie with key "${COOKIE_KEY}" not found`);
      return null;
    }

    const signToken = targetCookie.value.split('_')[0];
    if (!signToken) {
      console.error(`Cookie with key "${COOKIE_KEY}" has invalid format`);
      return null;
    }

    const imageData = await build1688ImageUploadRequestData(imageUrl, signToken);

    if (!imageData) {
      console.error('Failed to build image upload request data');
      return null;
    }

    const cookies = contextCookies.map(({ name, value }) => ({ name, value }));
    return { imageData, cookies } as UploadSessionData;
  } catch (error) {
    console.error('Error in browser client:', error);
  } finally {
    await page.close();
  }
};

const build1688ImageUploadRequestData = async (imageUrl: string, cookieValue: string) => {
  try {
    const base64ImageData = await convertImageUrlToBase64(imageUrl);

    if (!base64ImageData) {
      console.error('Failed to convert image URL to Base64');
      return null;
    }

    const params = {
      beginPage: 1,
      pageSize: 60,
      searchScene: 'pcImageSearch',
      method: 'uploadBase64WithRequest',
      appName: 'pctusou',
      imageBase64: base64ImageData,
      tab: 'imageSearch',
      imageId: '1652908722844325424',
      imageIdList: '1652908722844325424',
      spm: 'a260k.home2025.imagesearch.upload',
      sortType: 'normal',
    };

    const dataObject = JSON.stringify({
      appId: '32517',
      params,
    });

    const timestamp = Date.now().toString();
    const appKey = '12574478';
    const signString = cookieValue + '&' + timestamp + '&' + appKey + '&' + dataObject;
    const sign = require('crypto').createHash('md5').update(signString).digest('hex');

    const url = `https://h5api.m.1688.com/h5/mtop.relationrecommend.wirelessrecommend.recommend/2.0/?jsv=2.7.2&appKey=12574478&t=${timestamp}&sign=${sign}&api=mtop.relationrecommend.wirelessrecommend.recommend&v=2.0&type=originaljson&timeout=20000&jsonpIncPrefix=reqTppId_32517_getOfferList&dataType=jsonp`;

    return {
      url,
      data: dataObject,
    };
  } catch (error) {
    console.error('Error in build1688ImageUploadRequestData:', error);
  }
};

const translateText = async (text: string) => {
  try {
    const translateParams = {
      Text: text,
      SourceLanguageCode: 'zh',
      TargetLanguageCode: 'en',
    };
    const data = await translateClient.send(new TranslateTextCommand(translateParams));
    return data.TranslatedText;
  } catch (error) {
    console.error('Error translating text:', error);
  }
};

const buildCookieHeader = (cookies: Array<{ name: string; value: string }>) =>
  cookies.map((c) => `${c.name}=${c.value}`).join('; ');

const buildProxyAgent = () => {
  const server = process.env.PROXY_SERVER;
  const username = process.env.PROXY_USERNAME;
  const password = process.env.PROXY_PASSWORD;

  if (!server || !username || !password) {
    return null;
  }

  const proxyUrl = new URL(server);
  proxyUrl.username = username;
  proxyUrl.password = password;

  return new HttpsProxyAgent(proxyUrl.toString());
};

const uploadImageTo1688 = async (
  imageData: ImageUploadData,
  cookies: Array<{ name: string; value: string }>,
) => {
  const { url, data } = imageData;
  const cookieHeader = buildCookieHeader(cookies);
  const proxyAgent = buildProxyAgent();

  const response = await axios.post(url, `data=${encodeURIComponent(data)}`, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: '*/*',
      origin: 'https://s.1688.com',
      referer: 'https://s.1688.com/',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': USER_AGENT,
      cookie: cookieHeader,
    },
    httpsAgent: proxyAgent ?? undefined,
    httpAgent: proxyAgent ?? undefined,
    proxy: proxyAgent ? false : undefined,
    timeout: 30000,
    validateStatus: () => true,
  });

  const imageUploadResult = response.data;

  const isUploadSuccessful = imageUploadResult?.ret?.[0]?.startsWith('SUCCESS::');

  if (!isUploadSuccessful) {
    console.error(`Image upload failed: ${JSON.stringify(imageUploadResult)}`);
    return null;
  }

  const imageId = imageUploadResult?.data?.data?.imageId;

  if (!imageId) {
    console.error(`Image ID not found in response: ${JSON.stringify(imageUploadResult)}`);
    return null;
  }

  return imageId;
};
