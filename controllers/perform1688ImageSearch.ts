import { browserClient } from '../services/clients/headlessBrowser';
import { Response, Request } from 'express';

interface ImageSearchRequest {
  imageUrl: string;
}

export const perform1688ImageSearch = async (req: Request<ImageSearchRequest>, res: Response) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const searchResults = await browserClient(imageUrl);

    res.json({ results: searchResults });
  } catch (error) {
    console.error('Error performing image search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
