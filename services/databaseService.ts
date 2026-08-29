import pg from 'pg';
import type { Pool as PoolClass } from 'pg';
import { SupplierDetails } from '../types/supplierDetails';
import { getDbConfig } from './secretsManager';

const { Pool } = pg;

let pool: PoolClass | null = null;

const getPool = async (): Promise<PoolClass> => {
  if (pool) {
    return pool;
  }

  const dbConfig = await getDbConfig();
  pool = new Pool(dbConfig);
  return pool;
};

const mapSupplierToValues = (supplier: SupplierDetails) => [
  supplier.universalId,
  supplier.supplierName,
  supplier.supplierUrl,
  supplier.productTitle,
  supplier.productUrl,
  supplier.productImage,
  supplier.productPriceRange?.min ?? null,
  supplier.productPriceRange?.max ?? null,
  supplier.yearsActive,
  supplier.supplierMoq,
  supplier.platform,
  supplier.sku ?? null,
];

export const saveSuppliersList = async (
  suppliers: SupplierDetails[],
): Promise<void> => {
  if (!suppliers || suppliers.length === 0) {
    return;
  }

  const client = await (await getPool()).connect();

  try {
    const query = `
      INSERT INTO supplier_table (
        universal_id,
        supplier_name,
        supplier_url,
        product_title,
        product_url,
        product_image,
        min_price,
        max_price,
        years_active,
        supplier_moq,
        platform,
        sku
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    for (const supplier of suppliers) {
      await client.query(query, mapSupplierToValues(supplier));
    }
  } finally {
    client.release();
  }
};
