import type { Handler } from 'aws-lambda';
import { imageSearchService } from './services/imageSearch';
import { SupplierDetails } from './types/supplierDetails';

interface RequestPayload {
  imageUrl: string;
  useEnglish: boolean;
  sku: string;
  exchangeRate: number;
}

// TODO event stream will be returned in the future
export const handler: Handler<RequestPayload> = async (
  event
): Promise<SupplierDetails[]> => {
  const { imageUrl, useEnglish } = event;
  const data = await imageSearchService(imageUrl, useEnglish);
  if (!data) {
    throw new Error('No data returned from image search service');
  }
  return data;
  // TODO: Save to database
};
