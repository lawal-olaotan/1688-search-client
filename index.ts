import type { Handler } from 'aws-lambda';
import { getSupplierDataFromImageId, uploadImage, uploadImageTo1688 } from './services/imageSearch';
import { SupplierDetails } from './types/supplierDetails';
import { launchBrowser } from './services/headlessBrowser';
import { USER_AGENT } from './const/1688';

interface RequestPayload {
  imageUrl: string;
  useEnglish?: boolean;
  sku?: string;
  exchangeRate?: number;
}

export const handler: Handler<RequestPayload> = async (event): Promise<SupplierDetails[]> => {
  if (!event || !event.imageUrl) {
    console.error('Invalid event payload: imageUrl is required');
    return [];
  }

  const { imageUrl } = event;
  const browser = await launchBrowser();
  const browserContext = await browser.createBrowserContext();
  const page = await browserContext.newPage();

  try {
    if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
      await page.authenticate({
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD,
      });
    }

    await page.setUserAgent({
      userAgent: USER_AGENT,
    });

    const uploadSession = await uploadImage(browserContext, page, imageUrl);

    if (!uploadSession) {
      console.error('Image upload setup failed, no session data returned');
      return [];
    }

    const imageId = await uploadImageTo1688(uploadSession.imageData, uploadSession.cookies);

    if (!imageId) {
      console.error('Image upload failed, no image ID returned');
      return [];
    }
    const data = await getSupplierDataFromImageId(page, imageId);

    if (!data) {
      console.error('No data returned from image search service');
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error performing image search:', error);
    throw new Error('Internal server error');
  } finally {
    await page.close();
    await browserContext.close();
    await browser.close();
  }
};
