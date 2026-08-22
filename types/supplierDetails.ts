
export interface SupplierDetails {
  universalId: string;
  supplierName: string;
  supplierUrl: string;
  productTitle: string;
  productUrl: string;
  productImage: string;
  productPriceRange: {
    min: number;
    max: number;
  };
  yearsActive: string;
  supplierMoq: string;
  platform: string;
  sku?: string;
}
