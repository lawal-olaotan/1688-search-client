import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { Categories } from '../types';
import { insertCategoriesAndSubcategories } from '../db/queries/categoriesOperation';

dotenv.config();

export const extractCategories = async (targetUrl: string, country: string) => {
  const body = {
    source: 'universal',
    url: targetUrl,
    render: 'html',
  };

  let auth = process.env.OXYLABS_AUTH;

  const response = await axios.post('https://realtime.oxylabs.io/v1/queries', body, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${auth}`).toString('base64'),
    },
  });

  const html = response.data.results?.[0]?.content || '';
  const $ = cheerio.load(html);

  const categories: Categories[] = [];
  const subCategories: Categories[] = [];

  $('.flyout[role="menu"] a.itm[role="menuitem"]').each((_, el) => {
    const link = $(el).attr('href') || '';
    const name = $(el).find('span.text').text().trim();
    categories.push({ link, name, marketplace: country });

    const subDiv = $(el).next('div.sub[role="menu"]');
    subDiv.find('.sub-w .co .cat').each((_, catEl) => {
      const firstTit = $(catEl).find('a.tit').first();
      const subHref = firstTit.attr('href') || '';
      const subText = firstTit.text().trim();

      subCategories.push({ link: subHref, name: subText, category: name, marketplace: country });
    });
  });

  await insertCategoriesAndSubcategories(categories, subCategories);

  return { country, status: true };
};
