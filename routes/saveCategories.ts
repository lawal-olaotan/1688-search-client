import { Response } from 'express';
import dotenv from 'dotenv';
import { extractCategories } from '../controllers/extractCategories';

dotenv.config();

const firstBatch = [
  {
    text: 'Nigeria',
    value: 'https://www.jumia.com.ng/',
  },
  {
    text: 'Kenya',
    value: 'https://www.jumia.co.ke/',
  },
  {
    text: 'Ghana',
    value: 'https://www.jumia.com.gh/',
  },
];

const batch = [
  {
    text: 'Egypt',
    value: 'https://www.jumia.com.eg/',
  },
  {
    text: 'Ivory Coast',
    value: 'https://www.jumia.ci/',
  },
  {
    text: 'Morocco',
    value: 'https://www.jumia.ma/',
  },
];

const lastBatch = [
  {
    text: 'Senegal',
    value: 'https://www.jumia.sn/',
  },
  {
    text: 'Uganda',
    value: 'https://www.jumia.ug/',
  },
  {
    text: 'Algeria',
    value: 'https://www.jumia.com.dz/',
  },
];

const retried = [
  {
    text: 'Morocco',
    value: 'https://www.jumia.ma/',
  },
];

export async function saveCategories(res: Response) {
  try {
    const results = [];
    for (const marketPlace of retried) {
      const result = await extractCategories(marketPlace.value, marketPlace.text);
      results.push(result);
    }
    res.status(200).json(results);
  } catch (error) {
    console.log('Error creating Checkout Session:', error);
    res.status(500).json({
      error: 'Error creating checkout session',
    });
  }
}
