import { launchBrowser } from '../clients/headlessBrowser';
import { COOKIE_KEY, TARGET_URL, USER_AGENT } from '../../const/SupplierFinder/1688';
import { ImageUploadResponse } from '../../types/1688';
import { BrowserContext } from 'puppeteer';
import { convertImageUrlToBase64 } from '../../helpers/imageConversionHelper';

export const imageSearchService = async (imageUrl: string) => {
  const browser = await launchBrowser();
  const context = await browser.createBrowserContext();

  try {
    const imageId = await uploadImage(context, imageUrl);
    return await getSupplierDataFromImageId(context, imageId);
  } catch (error) {
    console.error('Error performing image search:', error);
    throw new Error('Internal server error');
  } finally {
    await context.close();
    await browser.close();
  }
};

const getSupplierDataFromImageId = async (browser: BrowserContext, imageId: string) => {
  const page = await browser.newPage();

  const url = `https://s.1688.com/wow/cbu/srch_rec/image_search/youyuan/index.html?tab=imageSearch&imageId=${imageId}&imageIdList=${imageId}&spm=a26352.b28411319/2508.imagesearch.upload&sortType=total_sales_volume&memberTags=215680;5179713&quantityBegin=10`;

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForSelector('[data-renderkey]', { timeout: 10000 });
    return await page.evaluate(() => {
      const extractProductPrice = (itemSelector: Element): number => {
        const pricingWrapper = itemSelector.querySelector('div.priceItem--KqgIKB16');
        const mainPrice = pricingWrapper?.querySelector('div.textMain--s_l2eHVJ')?.textContent;
        const decimalPrice = pricingWrapper?.querySelector('div:nth-child(3)')?.textContent;

        return Number(`${mainPrice}${decimalPrice || ''}`);
      };
      const extractYearsActive = (itemSelector: Element) => {
        const yearsActiveText = itemSelector.querySelector('div.tpYear--BPYmBM3z')?.textContent;
        if (!yearsActiveText) return null;

        return yearsActiveText.replace(/\D/g, '');
      };
      const items = document.querySelectorAll('[data-renderkey]');
      return Array.from(items).map((item) => {
        const parts = item.getAttribute('data-renderkey').split('_');
        const offerId = parts[parts.length - 1];
        const productUrl = `https://detail.1688.com/offer/${offerId}.html`;
        const image = item.querySelector('img').getAttribute('src') || '';
        const productTitle =
          item.querySelector('div.offerTitleRow--B50QDpVK > div.titleText--TB6mnS3m > div')
            .textContent || '';
        const price = extractProductPrice(item);
        const unitsSupplied = item.querySelector('div.descText--ZgjQ0TWW')?.textContent;
        const yearsActive = extractYearsActive(item);
        return {
          uuid: crypto.randomUUID(),
          productTitle,
          productUrl,
          image,
          price,
          unitsSupplied,
          yearsActive,
        };
      });
    });
  } catch (error) {
    console.error('Error:', error);
    return [];
  } finally {
    await page.close();
  }
};

const uploadImage = async (context: BrowserContext, imageUrl: string) => {
  const page = await context.newPage();

  try {
    await page.setUserAgent({
      userAgent: USER_AGENT,
    });
    await page.goto(TARGET_URL, { timeout: 0 });
    const cookies = await context.cookies();
    const targetCookie = cookies.find((cookie) => cookie.name === COOKIE_KEY);
    if (!targetCookie) {
      throw new Error(`Cookie with key "${COOKIE_KEY}" not found`);
    }
    const { url, data } = await build1688ImageUploadRequestData(
      imageUrl,
      targetCookie.value.split('_')[0],
    );
    const imageUploadResult: ImageUploadResponse = await page.evaluate(
      ({ url, data }) => {
        return fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            accept: '*/*',
            origin: 'https://s.1688.com',
            referer: 'https://s.1688.com/',
            'x-requested-with': 'XMLHttpRequest',
          },
          body: `data=${encodeURIComponent(data)}`,
        }).then((response) => response.json());
      },
      { url, data },
    );

    const isUploadSuccessful = imageUploadResult?.ret?.[0]?.startsWith('SUCCESS::');

    if (!isUploadSuccessful) {
      throw new Error(`Image upload failed: ${JSON.stringify(imageUploadResult)}`);
    }

    const imageId = imageUploadResult?.data?.data?.imageId;

    if (!imageId) {
      throw new Error(`Image ID not found in response: ${JSON.stringify(imageUploadResult)}`);
    }

    return imageId;
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
      throw new Error('Failed to convert image URL to Base64');
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
