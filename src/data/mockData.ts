import type { SupplierSettlementCycle } from '../types';
import {
  migrateMasterCategories,
  migrateStructuredReferences,
  migrateSuppliers,
} from '../utils/legacyIdMigration';

import {
  INITIAL_BRANCHES as RAW_INITIAL_BRANCHES,
  FIXED_ROLE_MATRIX as RAW_FIXED_ROLE_MATRIX,
  INITIAL_CATEGORIES as RAW_INITIAL_CATEGORIES,
  INITIAL_MASTER_CATEGORIES as RAW_INITIAL_MASTER_CATEGORIES,
  STORE_INFO as RAW_STORE_INFO,
  INITIAL_USERS as RAW_INITIAL_USERS,
} from './fixtures/masterData';
import { DEFAULT_WALKIN_CUSTOMER, INITIAL_CUSTOMERS } from './fixtures/customers';
import { INITIAL_ORDERS as RAW_INITIAL_ORDERS } from './fixtures/orders';
import {
  INITIAL_SUPPLIERS as RAW_INITIAL_SUPPLIERS,
  INITIAL_COMMISSION_LEDGER as RAW_INITIAL_COMMISSION_LEDGER,
  INITIAL_SUPPLIER_NOTIFICATION_BATCHES as RAW_INITIAL_SUPPLIER_NOTIFICATION_BATCHES,
  INITIAL_SUPPLIER_DELIVERY_LOGS as RAW_INITIAL_SUPPLIER_DELIVERY_LOGS,
} from './fixtures/suppliers';
import {
  INITIAL_PRODUCTS as RAW_INITIAL_PRODUCTS,
  INITIAL_GOODS_RECEIPTS as RAW_INITIAL_GOODS_RECEIPTS,
  INITIAL_STOCK_TRANSFERS as RAW_INITIAL_STOCK_TRANSFERS,
  INITIAL_BAD_STOCKS as RAW_INITIAL_BAD_STOCKS,
  INITIAL_CATEGORY_CLOSINGS as RAW_INITIAL_CATEGORY_CLOSINGS,
  INITIAL_PURCHASE_PLANS as RAW_INITIAL_PURCHASE_PLANS,
  INITIAL_RAW_MATERIALS as RAW_INITIAL_RAW_MATERIALS,
  INITIAL_EXPIRY_BATCHES as RAW_INITIAL_EXPIRY_BATCHES,
} from './fixtures/inventory';

// Seed data. Everything except INITIAL_SETTLEMENT_CYCLES below is re-exported from
// `./fixtures/*`, which holds the single canonical copy of each dataset - every
// re-exported value was verified value-for-value identical to the previous inline
// bodies (TOKEN_OPTIMIZATION_PLAN.md, Step 1). Existing imports from
// '../data/mockData' keep working unchanged.

export const INITIAL_BRANCHES = RAW_INITIAL_BRANCHES;
export const FIXED_ROLE_MATRIX = RAW_FIXED_ROLE_MATRIX;
export const INITIAL_CATEGORIES = RAW_INITIAL_CATEGORIES;
export const INITIAL_MASTER_CATEGORIES = migrateMasterCategories(RAW_INITIAL_MASTER_CATEGORIES);
export const STORE_INFO = RAW_STORE_INFO;
export const INITIAL_USERS = RAW_INITIAL_USERS;

export { DEFAULT_WALKIN_CUSTOMER, INITIAL_CUSTOMERS };

export const INITIAL_ORDERS = migrateStructuredReferences(RAW_INITIAL_ORDERS);

export const INITIAL_SUPPLIERS = migrateSuppliers(RAW_INITIAL_SUPPLIERS);
export const INITIAL_COMMISSION_LEDGER = migrateStructuredReferences(RAW_INITIAL_COMMISSION_LEDGER);
export const INITIAL_SUPPLIER_NOTIFICATION_BATCHES = migrateStructuredReferences(RAW_INITIAL_SUPPLIER_NOTIFICATION_BATCHES);
export const INITIAL_SUPPLIER_DELIVERY_LOGS = migrateStructuredReferences(RAW_INITIAL_SUPPLIER_DELIVERY_LOGS);

export const INITIAL_PRODUCTS = migrateStructuredReferences(RAW_INITIAL_PRODUCTS);
export const INITIAL_GOODS_RECEIPTS = migrateStructuredReferences(RAW_INITIAL_GOODS_RECEIPTS);
export const INITIAL_STOCK_TRANSFERS = migrateStructuredReferences(RAW_INITIAL_STOCK_TRANSFERS);
export const INITIAL_BAD_STOCKS = migrateStructuredReferences(RAW_INITIAL_BAD_STOCKS);
export const INITIAL_CATEGORY_CLOSINGS = migrateStructuredReferences(RAW_INITIAL_CATEGORY_CLOSINGS);
export const INITIAL_PURCHASE_PLANS = migrateStructuredReferences(RAW_INITIAL_PURCHASE_PLANS);
export const INITIAL_RAW_MATERIALS = RAW_INITIAL_RAW_MATERIALS;
export const INITIAL_EXPIRY_BATCHES = migrateStructuredReferences(RAW_INITIAL_EXPIRY_BATCHES);

// NOTE: intentionally NOT re-exported from `./fixtures/suppliers` - that copy still
// carries the removed `overdue`/`due` seeds, so it is not equivalent to this one.

// Pre-seeded Supplier Settlement Cycles (POS-US-032, POS-US-034, POS-US-035)
//
// NOTE: the `overdue` and `due` seeds were intentionally removed. Their `status` was a
// hard-coded string, so they rendered a permanent "N Overdue" / "N Due" badge on the
// Konsinyasi tab that no passage of time could ever clear. Cycles created at runtime by
// `generateSettlementCycles()` derive their status from the real due date instead.
export const INITIAL_SETTLEMENT_CYCLES: SupplierSettlementCycle[] = [
  migrateStructuredReferences({
    id: 'SET-202609-UPCOMING',
    supplierId: 'sup-2',
    supplierName: 'Artisan Cookies & Hampers Bandung',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-14',
    dueDate: '2026-09-15', // Masa depan = Upcoming!
    grossItemSales: 2450000,
    discounts: 100000,
    netItemSales: 2350000,
    commissionPayable: 470000,
    storeNetAfterCommission: 1880000,
    status: 'upcoming',
    commissionEntryIds: ['comm-artisan-01'],
    createdAt: '2026-09-02T23:59:00Z',
  }),
  migrateStructuredReferences({
    id: 'SET-202608-SETTLED',
    supplierId: 'sup-1',
    supplierName: 'Dapur Ibu Endang (Kue Tradisional)',
    periodStart: '2026-08-25',
    periodEnd: '2026-08-28',
    dueDate: '2026-08-28',
    grossItemSales: 950000,
    discounts: 0,
    netItemSales: 950000,
    commissionPayable: 165000,
    storeNetAfterCommission: 785000,
    status: 'settled',
    commissionEntryIds: ['comm-past-01'],
    paymentMethod: 'transfer',
    paymentAmount: 800000,
    newPiutangGenerated: 15000,
    paymentReference: 'BCA-TRF-99882211',
    settlementNotes: 'Transfer via BCA KlikBisnis telah diterima Ibu Endang',
    settledBy: 'Pak Hendra (Owner / Admin)',
    settledAt: '2026-08-28T16:30:00Z',
    createdAt: '2026-08-28T12:00:00Z',
  }),
];
