import type { SupplierSettlementCycle } from '../types';

// Seed data. Everything except INITIAL_SETTLEMENT_CYCLES below is re-exported from
// `./fixtures/*`, which holds the single canonical copy of each dataset - every
// re-exported value was verified value-for-value identical to the previous inline
// bodies (TOKEN_OPTIMIZATION_PLAN.md, Step 1). Existing imports from
// '../data/mockData' keep working unchanged.

export {
  INITIAL_BRANCHES,
  FIXED_ROLE_MATRIX,
  INITIAL_CATEGORIES,
  INITIAL_MASTER_CATEGORIES,
  STORE_INFO,
  INITIAL_USERS,
} from './fixtures/masterData';

export { DEFAULT_WALKIN_CUSTOMER, INITIAL_CUSTOMERS } from './fixtures/customers';

export { INITIAL_ORDERS } from './fixtures/orders';

export {
  INITIAL_SUPPLIERS,
  INITIAL_COMMISSION_LEDGER,
  INITIAL_SUPPLIER_NOTIFICATION_BATCHES,
  INITIAL_SUPPLIER_DELIVERY_LOGS,
} from './fixtures/suppliers';

export {
  INITIAL_PRODUCTS,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_BAD_STOCKS,
  INITIAL_CATEGORY_CLOSINGS,
  INITIAL_PURCHASE_PLANS,
  INITIAL_RAW_MATERIALS,
  INITIAL_EXPIRY_BATCHES,
} from './fixtures/inventory';

// NOTE: intentionally NOT re-exported from `./fixtures/suppliers` - that copy still
// carries the removed `overdue`/`due` seeds, so it is not equivalent to this one.

// Pre-seeded Supplier Settlement Cycles (POS-US-032, POS-US-034, POS-US-035)
//
// NOTE: the `overdue` and `due` seeds were intentionally removed. Their `status` was a
// hard-coded string, so they rendered a permanent "N Overdue" / "N Due" badge on the
// Konsinyasi tab that no passage of time could ever clear. Cycles created at runtime by
// `generateSettlementCycles()` derive their status from the real due date instead.
export const INITIAL_SETTLEMENT_CYCLES: SupplierSettlementCycle[] = [
  {
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
  },
  {
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
  },
];
