import type { StreamifyHandler } from 'aws-lambda';
import {
  extractSupplierDataFromHtml,
  getSupplierDataFromImageId,
  uploadImage,
  uploadImageTo1688,
} from './services/imageSearch';
import { launchBrowser } from './services/headlessBrowser';
import { USER_AGENT } from './const/1688';

interface RequestPayload {
  imageUrl: string;
  sku: string;
  exchangeRate?: number;
}

export const handler: StreamifyHandler<RequestPayload, void> = awslambda.streamifyResponse(
  async (event, responseStream) => {
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    const jobId = crypto.randomUUID();
    const send = (eventName: string, data: unknown) => {
      stream.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const errorMessage = () => {
      send('error', { jobId, message: 'An error occurred during processing.' });
      stream.end();
    };

    if (!event || !event.imageUrl || !event.sku) {
      return errorMessage();
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
        return errorMessage();
      } else {
        send('finding-product-match', { jobId });
      }

      const imageId = await uploadImageTo1688(uploadSession.imageData, uploadSession.cookies);

      if (!imageId) {
        console.error('Image upload failed, no image ID returned');
        return errorMessage();
      } else {
        send('found-matching-products', { jobId });
      }
      const supplierPageFragment = await getSupplierDataFromImageId(page, imageId);
      if (!supplierPageFragment) {
        console.error('Failed to retrieve supplier data from image ID');
        return errorMessage();
      } else {
        send('finding-suppliers-details', { jobId });
      }

      const data = await extractSupplierDataFromHtml(supplierPageFragment, event.sku);

      if (!data) {
        console.error('No data returned from image search service');
        return errorMessage();
      }

      return send('done', { jobId, data });
    } catch (error) {
      console.error('Error performing image search:', error);
      return errorMessage();
    } finally {
      stream.end();
      await page.close();
      await browserContext.close();
      await browser.close();
    }
  },
);
