import type { MasterCategory, Supplier } from '../types';

export const LEGACY_MASTER_CATEGORY_ID_MAP: Record<string, string> = {
  'KAT-PROD-01': 'KAT-001',
  'KAT-KSN-01': 'KAT-002',
  'KAT-RSL-01': 'KAT-003',
  'KAT-PROD-02': 'KAT-004',
  'KAT-KSN-02': 'KAT-005',
};

export const LEGACY_SUPPLIER_ID_MAP: Record<string, string> = {
  'sup-1': 'sup-001',
  'sup-2': 'sup-002',
  'sup-3': 'sup-003',
  'sup-kmg-1': 'sup-004',
};

const MIGRATION_VERSION = 'supplier-master-id-v1';
const MIGRATION_MARKER_KEY = 'pos_identifier_migration_version';

export const migrateMasterCategoryId = (id?: string): string | undefined => {
  if (!id) return id;
  return LEGACY_MASTER_CATEGORY_ID_MAP[id] || id;
};

export const migrateSupplierId = (id?: string): string | undefined => {
  if (!id) return id;
  const explicitMapping = LEGACY_SUPPLIER_ID_MAP[id];
  if (explicitMapping) return explicitMapping;

  for (const [legacyMasterCategoryId, currentMasterCategoryId] of Object.entries(LEGACY_MASTER_CATEGORY_ID_MAP)) {
    const legacySupplierPrefix = `${legacyMasterCategoryId}-`;
    if (id.startsWith(legacySupplierPrefix)) {
      return `${currentMasterCategoryId}-${id.slice(legacySupplierPrefix.length)}`;
    }
  }

  const numericMatch = id.match(/^sup-(\d+)$/i);
  if (!numericMatch) return id;
  return `sup-${String(Number.parseInt(numericMatch[1], 10)).padStart(3, '0')}`;
};

export const migrateStructuredReferences = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => migrateStructuredReferences(item)) as T;
  }

  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const migrated = Object.fromEntries(
    Object.entries(record).map(([key, childValue]) => {
      if (key === 'supplierId' && typeof childValue === 'string') {
        return [key, migrateSupplierId(childValue)];
      }
      if (key === 'masterCategoryId' && typeof childValue === 'string') {
        return [key, migrateMasterCategoryId(childValue)];
      }
      if (key === 'supplierIds' && Array.isArray(childValue)) {
        return [key, childValue.map((id) => (typeof id === 'string' ? migrateSupplierId(id) : id))];
      }
      return [key, migrateStructuredReferences(childValue)];
    })
  );

  return migrated as T;
};

export const migrateMasterCategories = (categories: MasterCategory[]): MasterCategory[] =>
  categories.map((category) => ({
    ...category,
    id: migrateMasterCategoryId(category.id) || category.id,
  }));

export const migrateSuppliers = (suppliers: Supplier[]): Supplier[] =>
  suppliers.map((supplier) => ({
    ...(migrateStructuredReferences(supplier) as Supplier),
    id: migrateSupplierId(supplier.id) || supplier.id,
  }));

const migrateStoredValue = (key: string, value: unknown): unknown => {
  if (key === 'pos_master_categories' && Array.isArray(value)) {
    return migrateMasterCategories(value as MasterCategory[]);
  }
  if (key === 'pos_suppliers' && Array.isArray(value)) {
    return migrateSuppliers(value as Supplier[]);
  }
  return migrateStructuredReferences(value);
};

/**
 * Migrates persisted demo data before POSContext initializes its state.
 * Only structured identifier fields are changed; display text and unrelated
 * IDs such as products, orders, receipts, and audit records remain intact.
 */
export const migratePersistedIdentifiers = (): void => {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(MIGRATION_MARKER_KEY) === MIGRATION_VERSION) return;

  const keys = [
    'pos_master_categories',
    'pos_suppliers',
    'pos_products',
    'pos_orders',
    'pos_commission_ledger',
    'pos_settlement_cycles',
    'pos_goods_receipts',
    'pos_receiving_draft',
    'pos_purchase_plans_v1',
    'pos_expiry_batches',
    'pos_stock_transfers',
    'pos_held_orders',
    'pos_supplier_batches',
    'pos_supplier_delivery_logs',
  ];

  try {
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        localStorage.setItem(key, JSON.stringify(migrateStoredValue(key, parsed)));
      } catch {
        // Keep an unreadable legacy record untouched; the existing loader owns
        // its normal fallback behavior.
      }
    }

    localStorage.setItem(MIGRATION_MARKER_KEY, MIGRATION_VERSION);
  } catch {
    // Storage can be unavailable or read-only in restricted browser contexts.
  }
};
