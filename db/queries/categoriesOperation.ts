import { Categories } from '../../types';
import { dbPromise } from '../config';

export async function insertCategoriesAndSubcategories(
  categories: Categories[],
  subCategories: Categories[],
) {
  const db = (await dbPromise).db();
  const categoriesCollection = db.collection('categories');
  const subCategoriesCollection = db.collection('subcategories');

  const categoryOps = categories.map((cat) => ({
    insertOne: { document: cat },
  }));
  const subCategoryOps = subCategories.map((sub) => ({
    insertOne: { document: sub },
  }));

  await categoriesCollection.bulkWrite(categoryOps);
  await subCategoriesCollection.bulkWrite(subCategoryOps);
}

export async function insertCategories(categories: Categories[]) {
  const db = (await dbPromise).db();
  const categoriesCollection = db.collection('categories');

  const categoryOps = categories.map((cat) => ({
    insertOne: { document: cat },
  }));

  await categoriesCollection.bulkWrite(categoryOps);
}

export async function insertSubcategories(subCategories: Categories[]) {
  const db = (await dbPromise).db();
  const subCategoriesCollection = db.collection('subcategories');

  const subCategoryOps = subCategories.map((sub) => ({
    insertOne: { document: sub },
  }));

  await subCategoriesCollection.bulkWrite(subCategoryOps);
}
