import axios from 'axios';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { COOKIE_KEY, TARGET_URL, USER_AGENT } from '../const/1688';
import { BrowserContext, Page } from 'puppeteer';
import { convertImageUrlToBase64 } from '../helpers/imageConversionHelper';
import { SupplierDetails } from '../types/supplierDetails';
import * as cheerio from 'cheerio';

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

const extractProductPrice = ($item: cheerio.Cheerio<any>): number => {
  const pricingWrapper = $item.find('div[class^="priceItem--"]').first();
  const mainPrice = pricingWrapper.find('div[class^="textMain--"]').first().text().trim();
  const decimalPrice = pricingWrapper.find('div:nth-child(3)').first().text().trim();

  const numeric = `${mainPrice}${decimalPrice || ''}`.replace(/[^\d.]/g, '');
  return numeric ? Number(numeric) : 0;
};

const extractYearsActive = ($item: cheerio.Cheerio<any>): string | null => {
  const yearsActiveText = $item.find('div[class^="tpYear--"]').first().text().trim();
  if (!yearsActiveText) return null;
  return yearsActiveText.replace(/\D/g, '');
};

export const getSupplierDataFromImageId = async (
  pageContext: Page,
  imageId: string,
): Promise<string> => {
  const url = `https://air.1688.com/kapp/1688-search/pc-image-search/?tab=imageSearch&imageId=${imageId}&spm=a260k.home2025%2F2026.imageUpload.0`;

  try {
    await pageContext.goto(url);

    await pageContext.waitForSelector('[data-renderkey]', { timeout: 10000 });

    return await pageContext.content();
  } catch (error) {
    throw new Error(`Failed to get supplier data from image ID: ${error}`);
  }
};

export const extractSupplierDataFromHtml = async (
  html: string,
  sku: string,
  exchangeRate: number,
): Promise<SupplierDetails[]> => {
  try {
    const $ = cheerio.load(html);

    const supplierDataMap = new Map<string, SupplierDetails>();

    $('[data-renderkey]')
      .toArray()
      .forEach((el) => {
        const item = $(el);
        const supplierName = item.find('div[class^="shopName--"]').first().text().trim();
        const yearsActive = extractYearsActive(item);

        if (
          !supplierName ||
          !yearsActive ||
          supplierDataMap.has(supplierName) ||
          Number(yearsActive) < 5
        ) {
          return;
        }

        const renderKey = item.attr('data-renderkey') || '';
        const parts = renderKey.split('_');
        const offerId = parts[parts.length - 1] || '';
        const productUrl = `https://detail.1688.com/offer/${offerId}.html`;

        const productImage = item.find('img').first().attr('src') || '';
        const titleRow = item.find('div[class^="offerTitleRow--"]').first();
        const productTitle = titleRow.find('div[class^="titleText--"] > div').first().text().trim();
        const price = extractProductPrice(item) * exchangeRate;

        const supplierData = {
          universalId: crypto.randomUUID(),
          productTitle,
          productUrl,
          productImage,
          productPriceRange: { min: Number(price.toFixed(2)) },
          yearsActive,
          supplierName,
          supplierMoq: 'More than 10 pieces',
          supplierUrl: productUrl,
          platform: '1688',
          sku,
        };
        supplierDataMap.set(supplierName, supplierData);
      });
    return await Promise.all(
      Array.from(supplierDataMap.values()).map(async (result) => {
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
    console.error('Error extracting supplier data from HTML:', error);
    return [];
  }
};

export const uploadImage = async (context: BrowserContext, contextPage: Page, imageUrl: string) => {
  try {
    await contextPage.goto(TARGET_URL, { timeout: 0 });
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

const buildCookieHeader = (cookies: Array<{ name: string; value: string }>) =>
  cookies.map((c) => `${c.name}=${c.value}`).join('; ');

const buildProxyAgent = () => {
  const server = process.env.PROXY_SERVER_HTTP;
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

export const uploadImageTo1688 = async (
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
