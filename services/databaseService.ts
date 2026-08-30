import pg from 'pg';
import type { Pool as PoolClass } from 'pg';
import { SupplierDetails } from '../types/supplierDetails';
import { getDbConfig } from './secretsManager';
import { from as copyFrom } from 'pg-copy-streams';
import { Readable } from 'stream';

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

export const saveSuppliersList = async (suppliers: SupplierDetails[]): Promise<void> => {
  if (!suppliers || suppliers.length === 0) {
    return;
  }

  const client = await (await getPool()).connect();

  try {
    const copySql = `  COPY supplier_table (
    universal_id, supplier_name, supplier_url, product_title, product_url,
    product_image, min_price, max_price, years_active, supplier_moq, platform, sku
  ) FROM STDIN WITH (FORMAT csv, DELIMITER ',', QUOTE '"', ESCAPE '"')`;

    const toCsv = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = suppliers
      .map((s) =>
        [
          s.universalId,
          s.supplierName,
          s.supplierUrl,
          s.productTitle,
          s.productUrl,
          s.productImage,
          s.productPriceRange?.min ?? null,
          s.productPriceRange?.max ?? null,
          s.yearsActive,
          s.supplierMoq,
          s.platform,
          s.sku ?? null,
        ]
          .map(toCsv)
          .join(','),
      )
      .join('\n');

    const stream = client.query(copyFrom(copySql));
    Readable.from([rows]).pipe(stream);
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
      stream.write(rows);
      stream.end();
    });
  } finally {
    client.release();
  }
};
