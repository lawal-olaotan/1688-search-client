import { MongoClient } from 'mongodb';
import { SupplierDetails } from '../types/supplierDetails';
import { getMongoUri } from './secretsManager';

export const saveSuppliersList = async (
  suppliers: SupplierDetails[],
): Promise<void> => {
  if (!suppliers || suppliers.length === 0) {
    return;
  }

  const mongoUri = await getMongoUri();
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const database = client.db('robotdorm');
    const collection = database.collection('SuppliersList');
    await collection.insertMany(suppliers, { ordered: false });
  } finally {
    await client.close();
  }
};
