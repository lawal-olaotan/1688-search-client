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
}

export const handler: StreamifyHandler<any, void> = awslambda.streamifyResponse(
  async (event, responseStream) => {
    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
    const jobId = crypto.randomUUID();
    const send = (eventName: string, data: unknown) => {
      stream.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    const errorMessage = (error?: string) => {
      send('error', { jobId, message: error ?? 'An error occurred during processing.' });
      stream.end();
    };

    let payload: RequestPayload | null = null;

    try {
      payload = typeof event?.body === 'string' ? JSON.parse(event.body) : event;
    } catch (error) {
      return errorMessage('Invalid request body');
    }

    if (!payload || !payload.imageUrl || !payload.sku) {
      return errorMessage('imageUrl and sku are required');
    }

    const { imageUrl, sku } = payload;

    if (!payload || !payload.imageUrl || !payload.sku) {
      return errorMessage();
    }

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

      const data = await extractSupplierDataFromHtml(supplierPageFragment, sku);

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
