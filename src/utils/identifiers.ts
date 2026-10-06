import type { MasterCategory, Product, Supplier } from '../types';

const normalizeText = (value: string): string =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Returns the next globally unique three-digit child ID for a parent ID.
 * Existing IDs are inspected by suffix, never by array position.
 */
export function getNextHierarchicalId(parentId: string, existingIds: string[]): string {
  const trimmedParentId = parentId.trim();
  const pattern = new RegExp(`^${escapeRegExp(trimmedParentId)}-(\\d+)$`, 'i');
  let highest = 0;

  for (const existingId of existingIds) {
    const match = existingId.match(pattern);
    if (!match) continue;
    const sequence = Number.parseInt(match[1], 10);
    if (Number.isSafeInteger(sequence)) highest = Math.max(highest, sequence);
  }

  return `${trimmedParentId}-${String(highest + 1).padStart(3, '0')}`;
}

export function getNextSupplierId(masterCategoryId: string, suppliers: Supplier[]): string {
  return getNextHierarchicalId(
    masterCategoryId,
    suppliers.map((supplier) => supplier.id)
  );
}

export function getNextProductSku(supplierId: string, products: Product[]): string {
  return getNextHierarchicalId(
    supplierId,
    products
      .filter(
        (product) =>
          product.supplierId === supplierId ||
          product.sku.trim().toLocaleLowerCase().startsWith(`${supplierId.trim().toLocaleLowerCase()}-`)
      )
      .map((product) => product.sku)
  );
}

/**
 * Backward-compatible supplier enrichment. Only a unique normalized-exact
 * match is accepted; no fuzzy or punctuation substitution is performed.
 */
export function getNormalizedExactMasterCategoryId(
  supplier: Supplier,
  masterCategories: MasterCategory[]
): string | undefined {
  if (supplier.masterCategoryId) return supplier.masterCategoryId;

  const supplierLabels = [supplier.category, ...(supplier.categories || [])]
    .filter((label): label is string => Boolean(label))
    .map(normalizeText);
  if (supplierLabels.length === 0) return undefined;

  const matches = masterCategories.filter((masterCategory) =>
    supplierLabels.includes(normalizeText(masterCategory.name))
  );

  return matches.length === 1 ? matches[0].id : undefined;
}

