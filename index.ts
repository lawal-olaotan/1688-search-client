import type { Handler } from 'aws-lambda';
import { imageSearchService } from './services/imageSearch';
import { saveSuppliersList } from './services/databaseService';
import { SupplierDetails } from './types/supplierDetails';

interface RequestPayload {
  imageUrl: string;
  useEnglish?: boolean;
  sku?: string;
  exchangeRate?: number;
}

// TODO event stream will be returned in the future
export const handler: Handler<RequestPayload> = async (
  event
): Promise<SupplierDetails[]> => {
  if (!event || !event.imageUrl) {
    console.error('Invalid event payload: imageUrl is required');
    return [];
  }
  const { imageUrl, useEnglish } = event;
  const data = await imageSearchService(imageUrl, useEnglish);
  if (!data) {
    console.error('No data returned from image search service');
    return [];
  }

  try {
    await saveSuppliersList(data);
  } catch (error) {
    console.error('Failed to save suppliers to database:', error);
  }

  return data;
};
