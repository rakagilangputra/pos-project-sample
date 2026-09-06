export type UserRole = 'cashier' | 'supervisor' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-digit quick PIN
  avatar?: string;
  email?: string;
}

export type CustomerCategory = 'Walk-in' | 'Retail' | 'Corporate' | 'Individual' | 'Other';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  category: CustomerCategory;
  address?: string;
  notes?: string;
  depositBalance: number;
  createdAt: string;
  lastTransactionAt?: string;
}

export type ProductCategory = string;

export interface ProductCategoryItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export type ProductOwnershipType = 'own' | 'consignment';
export type CommissionMethod = 'fixed' | 'percentage';
export type CommissionBasis = 'gross' | 'net';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  isPriceCustomizable: boolean;
  stock: number;
  lowStockThreshold: number;
  isMadeToOrder: boolean;
  baseProductId?: string; // Links made-to-order to base ready stock product
  image: string;
  description?: string;
  popular?: boolean;
  
  // Ownership & Consignment fields (POS-US-029)
  ownershipType: ProductOwnershipType; // 'own' | 'consignment'
  supplierId?: string;
  supplierName?: string;
  commissionMethod?: CommissionMethod; // 'fixed' | 'percentage'
  commissionValue?: number; // Fixed amount in IDR or % (0-100)
  commissionBasis?: CommissionBasis; // 'gross' | 'net' (required if percentage)
}

export interface CartItem {
  id: string; // unique item line id
  productId: string;
  productName: string;
  category: ProductCategory;
  unitPrice: number;
  originalPrice: number;
  isPriceOverridden: boolean;
  overrideReason?: string;
  quantity: number;
  image: string;
  isMadeToOrder: boolean;
  customizationNotes?: string;
  itemDiscountPercent?: number;
  itemDiscountAmount?: number;
  itemDiscountReason?: string;
  stockAvailable: number;
  
  // Consignment line snapshot (POS-US-031)
  ownershipType?: ProductOwnershipType;
  supplierId?: string;
  supplierName?: string;
  commissionMethod?: CommissionMethod;
  commissionValue?: number;
  commissionBasis?: CommissionBasis;
}

export type PaymentMethod = 'cash' | 'qris' | 'deposit';

export interface PaymentComponent {
  method: PaymentMethod;
  amount: number;
  tenderedCash?: number;
  change?: number;
  reference?: string;
  timestamp: string;
}

export type OrderStatus = 'completed' | 'awaiting_settlement' | 'voided' | 'refunded' | 'partially_refunded' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'refunded';

export interface Order {
  id: string;
  receiptNumber: string;
  sessionId: string;
  cashierId: string;
  cashierName: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  taxApplied: boolean;
  taxRate: number; // 0.11
  taxAmount: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  discountReason?: string;
  discountApprovedBy?: string;
  total: number;
  paidAmount: number;
  remainingBalance: number;
  change: number;
  payments: PaymentComponent[];
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  isMadeToOrder: boolean;
  customizationNotes?: string;
  createdAt: string;
  reprintCount: number;
  voidReason?: string;
  voidApprovedBy?: string;
  refundReason?: string;
  refundApprovedBy?: string;
  refundAmount?: number;
}

export interface CashierSession {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  openingCashCorrected?: boolean;
  openingCashOld?: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  varianceReason?: string;
  closingApprovedBy?: string;
  status: 'active' | 'closed';
  totalTransactions: number;
  totalSales: number;
  cashSales: number;
  qrisSales: number;
  depositSales: number;
  totalRefunds: number;
  totalDiscounts: number;
  handOffHistory: {
    fromCashierId: string;
    fromCashierName: string;
    toCashierId: string;
    toCashierName: string;
    timestamp: string;
  }[];
  supportCorrections?: {
    adminId: string;
    adminName: string;
    timestamp: string;
    action: string;
    reason: string;
    beforeValue: string;
    afterValue: string;
  }[];
}

export interface SetAsideOrder {
  id: string;
  sessionId: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  taxApplied: boolean;
  discountAmount: number;
  discountReason?: string;
  total: number;
  createdAt: string;
  label?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'order' | 'session' | 'stock' | 'user' | 'price' | 'discount' | 'supplier' | 'consignment' | 'category' | 'product';
  entityId: string;
  details: string;
  beforeValue?: string;
  afterValue?: string;
  supervisorName?: string;
}

export interface StockAdjustmentRecord {
  id: string;
  productId: string;
  productName: string;
  type: 'increase' | 'decrease';
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  adminId: string;
  adminName: string;
  timestamp: string;
}

// POS-US-030: Supplier Master
export type SupplierCategory = 'KYD' | 'RMS' | 'TCC';
export type SettlementScheduleType = 'weekly' | 'twice_monthly';
export type WeeklyFrequency = 'once' | 'twice' | 'three_times';

export interface Supplier {
  id: string;
  name: string;
  category?: SupplierCategory; // Predefined backoffice categories: KYD, RMS, TCC
  picName: string;
  phone: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  scheduleType?: SettlementScheduleType;
  weeklyFrequency?: WeeklyFrequency;
  weeklyDays?: string[]; // e.g. ['Senin', 'Kamis']
  scheduleDayOfWeek?: number; // 1-7
  scheduleDatesOfMonth?: number[]; // e.g. [15, 30]
  monthlyDates?: number[]; // e.g. [15, 30]
  nextDueDate?: string;
  balance?: number; // Supplier balance / overpayment credit account
  balanceUpdatedAt?: string; // Timestamp when balance was added/updated
  createdAt: string;
  updatedAt?: string;
}

// POS-US-031: Consignment Commission Ledger
export type CommissionLedgerStatus = 'accrued' | 'included' | 'settled' | 'reversed';

export interface CommissionLedgerEntry {
  id: string;
  orderId: string;
  orderLineId: string;
  receiptNumber: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number; // Transaction Unit Price * Completed Quantity (excluding tax)
  allocatedDiscount: number; // Item/order allocated discounts
  netAmount: number; // grossAmount - allocatedDiscount
  commissionMethod: CommissionMethod;
  commissionValue: number;
  commissionBasis?: CommissionBasis;
  commissionAmount: number;
  storeNetAmount: number; // netAmount - commissionAmount
  status: CommissionLedgerStatus;
  settlementId?: string;
  createdAt: string;
  reversedAt?: string;
  reversalReason?: string;
}

// POS-US-032 & POS-US-034 & POS-US-035: Supplier Settlement Cycles
export type SettlementCycleStatus = 'upcoming' | 'due' | 'overdue' | 'settled';

export interface SupplierSettlementCycle {
  id: string;
  supplierId: string;
  supplierName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string; // YYYY-MM-DD
  grossItemSales: number;
  discounts: number;
  netItemSales: number;
  commissionPayable: number;
  storeNetAfterCommission: number;
  status: SettlementCycleStatus;
  commissionEntryIds: string[];
  // POS-US-035: Payment evidence
  paymentMethod?: 'cash' | 'transfer' | 'qris' | 'other';
  paymentAmount?: number;
  paymentReference?: string;
  settlementNotes?: string;
  settledBy?: string;
  settledAt?: string;
  createdAt: string;
}
